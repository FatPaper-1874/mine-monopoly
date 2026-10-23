const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");
const vue = require("vue");
const clientRoot = path.resolve(__dirname, "../..");

function evaluate(relative, dependencies = {}, globals = {}) {
	const module = { exports: {} };
	const compiled = ts.transpileModule(fs.readFileSync(path.join(clientRoot, relative), "utf8"), {
		fileName: relative,
		compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
	});
	vm.runInNewContext(compiled.outputText, {
		module, exports: module.exports, AbortController, setTimeout, clearTimeout,
		console: { error() {} }, window: { setTimeout },
		require: name => {
			assert.ok(name in dependencies, "Unexpected dependency: " + name);
			return dependencies[name];
		},
		...globals,
	}, { filename: relative });
	return module.exports;
}

function harness(fetch, provider = "openai-compatible", timeoutMs = 1000) {
	const stats = evaluate("src/core/ai/remote-usage-stats.ts", { vue });
	const readable = evaluate("src/core/ai/ReadableAIPrompt.ts");
	const remote = evaluate("src/core/ai/OpenAICompatibleDecisionProvider.ts", {
		"./remote-usage-stats": stats, "./ReadableAIPrompt": readable,
	}, { fetch });
	const config = { provider, baseUrl: "https://example.test?api_key=top-secret", apiKey: "top-secret", model: "test-model", timeoutMs };
	return { stats, decide: remote.createRemoteAIDecisionProvider(config).decide.bind(remote.createRemoteAIDecisionProvider(config)) };
}

function request(playerId = "player-a", traceId = "same-decision") {
	const player = { id: playerId, user: { userId: playerId, username: playerId === "player-a" ? "小明" : "小红" }, money: 100, stop: 0, properties: [], chanceCards: [] };
	return {
		playerId, title: "购买地产", scene: "confirm-dialog", operationType: "confirm-dialog",
		options: [{ id: "buy", label: "购买", actionType: "confirm" }], metadata: { decisionId: traceId },
		context: {
			player, players: [player], properties: [], mapItems: [], mapIndex: [], mapEvents: [], currentRound: 3,
			currentMultiplier: 1, currentPlayerIdInRound: playerId, map: { id: "map", name: "自定义地图" },
			playerRoles: [{ playerId, roleName: playerId === "player-a" ? "商人" : "冒险家" }],
		},
	};
}

const longText = "完整模型内容。".repeat(2000) + "保留结尾";
function successResponse(provider = "openai-compatible", extra = {}) {
	const output = JSON.stringify({ optionId: "buy", reason: longText, unrecognizedModelField: { nested: "额外字段" } });
	return new Response(JSON.stringify(provider === "anthropic"
		? { content: [{ type: "text", text: output }, { type: "thinking", thinking: "附加思考字段" }], usage: { input_tokens: 80, output_tokens: 20 }, ...extra }
		: { choices: [{ message: { content: output, reasoning_content: "附加思考字段" } }], usage: { prompt_tokens: 80, completion_tokens: 20, total_tokens: 100 }, ...extra }),
		{ status: 200, headers: { "content-type": "application/json", "x-request-id": "provider-trace" } });
}

for (const provider of ["openai-compatible", "anthropic"]) {
	test(`${provider}: records in-flight input then complete raw response and adopted selection`, async () => {
		let finish, sent;
		const h = harness((url, init) => {
			sent = { url, init };
			return new Promise(resolve => { finish = resolve; });
		}, provider);
		const promise = h.decide(request());
		let snapshot = h.stats.getAIRemoteUsageSnapshot();
		assert.equal(snapshot.summary.requestCount, 1);
		assert.equal(snapshot.summary.missingUsageCount, 0);
		const id = snapshot.records[0].id;
		const pending = h.stats.getAIRemoteCallDetail(id);
		assert.equal(pending.record.status, "pending");
		assert.equal(pending.record.playerName, "小明");
		assert.equal(pending.record.roleName, "商人");
		assert.equal(pending.request.body, sent.init.body);
		assert.ok(!JSON.stringify(pending).includes("top-secret"));
		assert.ok(JSON.stringify(sent.init.headers).includes("top-secret"));
		assert.ok(!("request" in snapshot.records[0]));
		finish(successResponse(provider, { additionalResponseField: { full: longText } }));
		const selection = await promise;
		const detail = h.stats.getAIRemoteCallDetail(id);
		assert.equal(detail.record.status, "success");
		assert.equal(detail.record.round, 3);
		assert.equal(detail.response.status, 200);
		assert.equal(detail.response.headers["x-request-id"], "provider-trace");
		assert.ok(detail.modelOutput.includes("unrecognizedModelField"));
		assert.equal(JSON.parse(detail.response.body).additionalResponseField.full, longText);
		assert.equal(detail.selection.reason, longText);
		assert.equal(detail.selection.optionId, selection.optionId);
		snapshot = h.stats.getAIRemoteUsageSnapshot();
		assert.equal(snapshot.summary.requestCount, 1);
		assert.equal(snapshot.summary.usageCount, 1);
		assert.equal(snapshot.summary.totalTokens, 100);
		assert.equal(snapshot.byPlayer["player-a"].summary.totalTokens, 100);
		assert.ok(!JSON.stringify(snapshot).includes("additionalResponseField"));
		detail.request.body = "mutated copy";
		assert.equal(h.stats.getAIRemoteCallDetail(id).request.body, sent.init.body);
	});
}

test("HTTP errors retain full body, status and headers even without valid JSON", async () => {
	const raw = "<html><script>untrusted()</script>" + longText + "</html>";
	const h = harness(async () => new Response(raw, { status: 502, statusText: "Bad Gateway", headers: { "x-error": "gateway" } }));
	assert.deepEqual(JSON.parse(JSON.stringify(await h.decide(request()))), {});
	const snapshot = h.stats.getAIRemoteUsageSnapshot();
	const detail = h.stats.getAIRemoteCallDetail(snapshot.records[0].id);
	assert.equal(detail.record.status, "error");
	assert.equal(detail.response.body, raw);
	assert.equal(detail.response.status, 502);
	assert.ok(detail.record.error.includes("HTTP 502"));
	assert.equal(snapshot.summary.requestCount, 1);
	assert.equal(snapshot.summary.missingUsageCount, 1);
});

test("invalid model JSON retains usage, model output and raw API response", async () => {
	const h = harness(async () => new Response(JSON.stringify({ choices: [{ message: { content: longText } }], usage: { prompt_tokens: 4, completion_tokens: 2, total_tokens: 6 } })));
	await h.decide(request());
	const snapshot = h.stats.getAIRemoteUsageSnapshot();
	const detail = h.stats.getAIRemoteCallDetail(snapshot.records[0].id);
	assert.equal(detail.record.status, "error");
	assert.equal(detail.modelOutput, longText);
	assert.equal(snapshot.summary.totalTokens, 6);
	assert.ok(detail.record.error);
});

test("network failures and timeouts have their own inspectable records", async () => {
	for (const kind of ["network", "timeout"]) {
		const h = harness(async (url, init) => {
			if (kind === "network") throw new Error("network unavailable");
			await new Promise((resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
		}, "openai-compatible", 5);
		await h.decide(request());
		const snapshot = h.stats.getAIRemoteUsageSnapshot();
		const detail = h.stats.getAIRemoteCallDetail(snapshot.records[0].id);
		assert.equal(detail.record.status, "error");
		assert.ok(detail.request.body.includes("自定义地图"));
		assert.equal(detail.response, undefined);
		assert.ok(detail.record.error.includes(kind === "network" ? "network unavailable" : "请求超时"));
	}
});

test("every call stays accessible beyond the former 30-record limit and duplicate decision IDs", async () => {
	const h = harness(async () => successResponse());
	for (let index = 0; index < 35; index++) await h.decide(request(index % 2 ? "player-b" : "player-a"));
	const snapshot = h.stats.getAIRemoteUsageSnapshot();
	assert.equal(snapshot.records.length, 35);
	assert.equal(new Set(snapshot.records.map(record => record.id)).size, 35);
	assert.equal(snapshot.summary.requestCount, 35);
	assert.equal(snapshot.summary.totalTokens, 3500);
	assert.equal(snapshot.byPlayer["player-a"].summary.requestCount, 18);
	assert.equal(snapshot.byPlayer["player-b"].summary.requestCount, 17);
	for (const record of snapshot.records) assert.equal(h.stats.getAIRemoteCallDetail(record.id).record.playerId, record.playerId);
});

test("clearing usage releases details and a late response cannot resurrect cleared records", async () => {
	let finish;
	const h = harness(() => new Promise(resolve => { finish = resolve; }));
	const pending = h.decide(request());
	const id = h.stats.getAIRemoteUsageSnapshot().records[0].id;
	h.stats.clearAIRemoteUsageStats();
	assert.equal(h.stats.getAIRemoteCallDetail(id), null);
	finish(successResponse());
	await pending;
	const snapshot = h.stats.getAIRemoteUsageSnapshot();
	assert.equal(snapshot.records.length, 0);
	assert.equal(snapshot.summary.requestCount, 0);
	assert.equal(snapshot.summary.totalTokens, 0);
	assert.equal(h.stats.getAIRemoteCallDetail(id), null);
});
