const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");
const clientRoot = path.resolve(__dirname, "../..");
const read = relative => fs.readFileSync(path.join(clientRoot, relative), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
const flush = async () => { for (let index = 0; index < 30; index++) await Promise.resolve(); };

function evaluate(source, dependencies = {}, globals = {}) {
	const module = { exports: {} };
	const result = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
	vm.runInNewContext(result.outputText, {
		module, exports: module.exports, AbortController,
		console: { warn() {}, error() {} },
		require: name => { assert.ok(name in dependencies, "Unexpected dependency: " + name); return dependencies[name]; },
		...globals,
	});
	return module.exports;
}

function methods(relative, className, names) {
	const ast = ts.createSourceFile(relative, read(relative), ts.ScriptTarget.Latest, true);
	const definition = ast.statements.find(node => ts.isClassDeclaration(node) && node.name.text === className);
	return definition.members.filter(node => names.includes(node.name?.getText(ast))).map(node => node.getText(ast)).join("\n");
}

function timers() {
	let now = 0, sequence = 0;
	const pending = new Map();
	const setTimeout = (callback, delay) => { const id = ++sequence; pending.set(id, { callback, at: now + delay }); return id; };
	const clearTimeout = id => pending.delete(id);
	return {
		globals: { setTimeout, clearTimeout, window: { setTimeout }, Date: class extends Date { static now() { return now; } } },
		pending,
		advance(ms) {
			const end = now + ms;
			while (true) {
				const next = [...pending.entries()].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
				if (!next) break;
				now = next[1].at;
				pending.delete(next[0]);
				next[1].callback();
			}
			now = end;
		},
	};
}

const normalization = evaluate(read("src/core/ai/ai-decision-config.ts"));
const workerFile = "src/core/worker/GameProcessWorker.ts";
const bridgeAST = ts.createSourceFile(workerFile, read(workerFile), ts.ScriptTarget.Latest, true);
const bridgeSource = bridgeAST.statements.filter(node =>
	(ts.isClassDeclaration(node) && node.name.text === "HostBridgeDecisionProvider") ||
	(ts.isFunctionDeclaration(node) && node.name.text === "resolveAIDecisionResponse")
).map(node => node.getText(bridgeAST)).join("\n");

function request() {
	const player = { id: "ai", user: { userId: "ai", username: "小明" } };
	return { playerId: "ai", title: "掷骰", operationType: "active-action", scene: "active-action", options: [{ id: "roll", label: "掷骰" }],
		context: { player, players: [player], playerRoles: [], currentRound: 1 } };
}

function remoteHarness(provider, useProfile) {
	const clock = timers();
	let finish, signal;
	const updates = [];
	const remote = evaluate(read("src/core/ai/OpenAICompatibleDecisionProvider.ts"), {
		"./ReadableAIPrompt": { buildRemotePrompt: () => "掷骰" },
		"./remote-usage-stats": { recordAIRemoteUsage: () => "call", updateAIRemoteUsage: (id, record) => updates.push(record) },
	}, { ...clock.globals, fetch: (url, init) => {
		signal = init.signal;
		return new Promise((resolve, reject) => {
			finish = () => {
				const content = JSON.stringify({ optionId: "roll", chatMessages: ["我先掷骰。"] });
				resolve({ ok: true, status: 200, statusText: "OK", headers: new Map(), text: async () => JSON.stringify(provider === "anthropic"
					? { content: [{ type: "text", text: content }] } : { choices: [{ message: { content } }] }) });
			};
			signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
		});
	} });
	const roomMethods = methods("src/core/monopoly-host/Room.ts", "Room", [
		"getResolvedAIRemoteConfig", "getResolvedAIPlayerRemoteProfile", "getAIPlayerDecisionBinding", "normalizeAIPlayerDecisionBinding", "handleWorkerAIDecisionRequest",
	]);
	const { RoomHarness } = evaluate("export class RoomHarness {\n" + roomMethods + "\n}", {}, {
		...normalization, ...remote, WorkerCommType: {},
	});
	const room = new RoomHarness();
	const config = { provider, baseUrl: "https://example.test", apiKey: "test", model: "test" };
	room.aiDecisionConfig = { mode: "remote", remote: { ...config, timeoutMs: 90000 }, remoteProfiles: [{ ...config, id: "slow", timeoutMs: 120000 }] };
	room.aiPlayerBindings = new Map(useProfile ? [["ai", { mode: "remote", remoteProfileId: "slow" }]] : []);
	room.broadcastAISelectionChat = () => {};
	const bridge = evaluate("let aiDecisionRequestSeq = 0; const pendingAIDecisionRequests = new Map();\n" + bridgeSource +
		"\nexport { HostBridgeDecisionProvider, resolveAIDecisionResponse, pendingAIDecisionRequests };", {}, {
		...clock.globals, WorkerCommType: {}, self: { postMessage: message => { void room.handleWorkerAIDecisionRequest(message.data); } },
	});
	room.gameProcessWorker = { postMessage: message => bridge.resolveAIDecisionResponse(message.data) };
	return { clock, bridge, updates, finish: () => finish(), aborted: () => signal.aborted };
}

for (const provider of ["openai-compatible", "anthropic"]) {
	for (const useProfile of [false, true]) {
		test(`${provider}: slow response survives old limits using ${useProfile ? "bound profile" : "default"} timeout`, async () => {
			const h = remoteHarness(provider, useProfile);
			let done = false;
			const result = new h.bridge.HostBridgeDecisionProvider().decide(request()).then(value => { done = true; return value; });
			h.clock.advance(45000);
			await flush();
			assert.equal(done, false);
			assert.equal(h.aborted(), false);
			h.finish();
			assert.equal((await result).optionId, "roll");
			assert.equal(h.bridge.pendingAIDecisionRequests.size, 0);
			assert.equal(h.clock.pending.size, 0);
			assert.equal(h.updates.at(-1).status, "success");
		});
	}
	test(`${provider}: bound profile timeout ends the remote request and releases the bridge`, async () => {
		const h = remoteHarness(provider, true);
		let done = false;
		const result = new h.bridge.HostBridgeDecisionProvider().decide(request()).then(value => { done = true; return value; });
		h.clock.advance(119999);
		await flush();
		assert.equal(done, false);
		h.clock.advance(1);
		assert.deepEqual(plain(await result), {});
		assert.equal(h.aborted(), true);
		assert.ok(h.updates.at(-1).error.includes("120000ms"));
		assert.equal(h.bridge.pendingAIDecisionRequests.size, 0);
	});
}

function gameHarness(isAI = true) {
	const clock = timers();
	const { OperateListener } = evaluate(read("src/core/worker/class/OperateListener.ts"), {}, clock.globals);
	const operationListener = new OperateListener();
	const decisions = [];
	const OperateType = { RollDice: "roll", UseChanceCard: "card" };
	const workerMethods = methods(workerFile, "GameProcess", [
		"oncePlayerOperationAsync", "ensureAIPreRollOperationBroker", "runAIPreRollOperationBroker", "ensureAIPreRollOperationSession",
		"isAIPreRollOperationSessionActive", "invalidateAIPreRollOperationSession", "syncAIPreRollOperationSession",
		"closeAIPreRollOperationSessionAndEmit", "emitPlayerOperation", "runAIDecision",
	]);
	const { GameHarness } = evaluate("export class GameHarness {\n" + workerMethods + "\n}", {}, {
		...clock.globals, operationListener, OperateType, TargetSelectType: { ToSelf: "self" }, AI_LOG_PREFIX: "AI",
		aiManager: { decide: () => new Promise((resolve, reject) => decisions.push({ resolve, reject })), feedback() {} },
	});
	const game = new GameHarness();
	const player = { id: "ai", isAI, beginAIThinking: () => false, endAIThinking: () => false, getCardById: () => ({ getType: () => "self" }) };
	Object.assign(game, {
		players: new Map([[player.id, player]]), currentRoundPlayer: player, defaultTimeoutMs: 15000,
		aiPreRollOperationSessionSeq: 0, aiPreRollOperationSessions: new Map(), aiPreRollOperationTasks: new Map(),
		aiPreRollOperationPlayers: new Set(), aiDynamicButtonTimers: new Map(),
		ensureAIDecisionMetadata() {}, markAITurnDynamicButtonAttempt() {}, handleDynamicButtonClick: async () => {},
		buildAIPreRollOperationRequest: () => ({ ...request(), options: [{ id: "roll" }, { id: "button", payload: { actionKind: "dynamic-button", id: "upgrade" } }] }),
	});
	return { game, clock, operationListener, decisions, OperateType };
}

test("AI pre-roll waits through multiple slow calls without a turn countdown", async () => {
	const h = gameHarness();
	let done = false;
	const result = h.game.oncePlayerOperationAsync("ai", h.OperateType.RollDice, { timeout: 1000 }).then(value => { done = true; return value; });
	await flush();
	h.clock.advance(45000);
	await flush();
	assert.equal(done, false);
	assert.equal(h.clock.pending.size, 0);
	h.decisions[0].resolve({ optionId: "button" });
	await flush();
	assert.equal(h.decisions.length, 2);
	h.clock.advance(45000);
	await flush();
	assert.equal(done, false);
	h.decisions[1].resolve({ optionId: "roll" });
	assert.equal(await result, undefined);
	assert.equal(h.operationListener.hasListener("ai", h.OperateType.RollDice), false);
});

test("card-only AI wait returns its default and removes its listener when the request fails", async () => {
	const h = gameHarness();
	const result = h.game.oncePlayerOperationAsync("ai", h.OperateType.UseChanceCard, { defaultValue: "no-card" });
	await flush();
	h.decisions[0].reject(new Error("request failed"));
	assert.equal(await result, "no-card");
	assert.equal(h.operationListener.hasListener("ai", h.OperateType.UseChanceCard), false);
	assert.equal(h.game.aiPreRollOperationTasks.size, 0);
});

test("human players retain the configured game countdown", async () => {
	const h = gameHarness(false);
	let done = false;
	const result = h.game.oncePlayerOperationAsync("ai", h.OperateType.RollDice, { timeout: 5000, defaultValue: "timed-out" }).then(value => { done = true; return value; });
	h.clock.advance(4999);
	await flush();
	assert.equal(done, false);
	h.clock.advance(1);
	assert.equal(await result, "timed-out");
	assert.equal(h.decisions.length, 0);
});

test("timeout normalization preserves long per-profile values and rejects invalid timer durations", () => {
	const config = normalization.normalizeAIDecisionConfig({ remote: { timeoutMs: 90000 }, remoteProfiles: [{ timeoutMs: 180000 }] });
	assert.equal(config.remote.timeoutMs, 90000);
	assert.equal(config.remoteProfiles[0].timeoutMs, 180000);
	for (const timeoutMs of [0, -1, NaN, Infinity]) assert.equal(normalization.normalizeRemoteLLMConfig({ timeoutMs }).timeoutMs, 30000);
	assert.equal(normalization.normalizeRemoteLLMConfig({ timeoutMs: 3000000000 }).timeoutMs, 2147483647);
});

test("concurrent roll/card waits deliver the chosen card before the unused roll fallback", async () => {
	const h = gameHarness();
	h.game.buildAIPreRollOperationRequest = () => ({ ...request(), options: [{ id: "card", payload: { actionKind: "use-chance-card", id: "card-a" } }] });
	h.game.buildAIChanceCardTargetIds = async () => ["ai"];
	const roll = h.game.oncePlayerOperationAsync("ai", h.OperateType.RollDice).then(value => ({ operation: "roll", value }));
	const card = h.game.oncePlayerOperationAsync("ai", h.OperateType.UseChanceCard).then(value => ({ operation: "card", value }));
	await flush();
	h.decisions[0].resolve({ optionId: "card" });
	const chosen = await Promise.race([roll, card]);
	assert.deepEqual(plain(chosen), { operation: "card", value: { chanceCardId: "card-a", targetIdList: ["ai"] } });
	await Promise.all([roll, card]);
	assert.equal(h.operationListener.hasListener("ai", h.OperateType.RollDice), false);
	assert.equal(h.operationListener.hasListener("ai", h.OperateType.UseChanceCard), false);
});
