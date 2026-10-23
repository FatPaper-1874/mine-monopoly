const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const clientRoot = path.resolve(__dirname, "../..");
const read = relative => fs.readFileSync(path.join(clientRoot, relative), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));

function evaluate(source, filename, dependencies = {}, globals = {}) {
	const module = { exports: {} };
	const compiled = ts.transpileModule(source, {
		fileName: filename,
		compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
	});
	vm.runInNewContext(compiled.outputText, {
		module, exports: module.exports, console, setTimeout, clearTimeout, AbortController,
		require: name => {
			assert.ok(name in dependencies, "Unexpected dependency: " + name);
			return dependencies[name];
		},
		...globals,
	}, { filename });
	return module.exports;
}

const economy = evaluate(read("src/core/worker/ai/AIEconomy.ts"), "AIEconomy.ts");
const mapUtils = evaluate(read("../../packages/utils/game/map.ts"), "map.ts");
const reachability = evaluate(read("src/core/worker/ai/DiceReachability.ts"), "DiceReachability.ts", { "@mine-monopoly/utils": mapUtils });
const readablePrompt = evaluate(read("src/core/ai/ReadableAIPrompt.ts"), "ReadableAIPrompt.ts");
const { StrategyStateManager } = evaluate(
	read("src/core/worker/ai/StrategyStateManager.ts"), "StrategyStateManager.ts", { "./AIEconomy": economy },
);

function fixture(scale = 1) {
	const longText = "完整机制说明，保留后半段的触发条件与资源限制。".repeat(30) + "末尾关键规则";
	const players = Array.from({ length: 6 }, (_, index) => ({
		id: "player-" + index,
		user: { userId: "player-" + index, username: "玩家" + index, roleId: "role-" + index },
		money: 10000 * scale, properties: [], stop: 0, dices: [{ diceValues: [1, 2, 3, 4, 5, 6] }, { diceValues: [1, 2, 3, 4, 5, 6] }], isBankrupted: false, isAI: true,
		positionIndex: index, positionMapItemId: "tile-" + index,
		chanceCards: Array.from({ length: 6 }, (_, card) => ({
			id: `card-${index}-${card}`, name: `卡牌${card}`, description: longText,
		})),
	}));
	const properties = Array.from({ length: 8 }, (_, index) => ({
		id: "property-" + index, name: "地皮" + index, sellCost: 1000 * scale,
		buildCost: 500 * scale, level: 0, maxLevel: 2, costList: [100, 200, 300].map(value => value * scale),
		owner: players[index % players.length].user,
		custom: { description: longText, effectCode: "async (cmd, ctx) => {}" },
	}));
	for (const player of players) player.properties = properties.filter(item => item.owner.userId === player.id);
	const context = {
		player: players[0], players, properties,
		mapItems: properties.map((property, index) => ({ id: "tile-" + index, type: { id: "land", name: "地皮" }, property })),
		mapIndex: properties.map((_, index) => "tile-" + index),
		mapEvents: [{ id: "event", name: "事件", description: longText }],
		mapPaths: [{ id: "branch", fromMapItemId: "tile-0", toMapItemId: "tile-7", description: longText }],
		mapPathRuntimeState: { enabledPathIds: ["branch"] },
		diceReachability: { status: "ready", originMapItemId: "tile-0", diceCount: 2, notes: [],
			rolls: [{ total: 7, probability: 1, landings: [{ mapItemId: "tile-7", movedSteps: 7, conditional: false, stoppedEarly: false }] }] },
		currentRound: 1, currentMultiplier: 2, currentPlayerIdInRound: players[0].id,
		map: { id: "custom-map", name: "自定义地图", description: longText,
			roles: players.map(player => ({ id: player.user.roleId, name: "角色", description: longText })) },
		playerRoles: players.map(player => ({ playerId: player.id, roleName: "角色", roleDescription: longText })),
		gameSetting: {
			initMoney: { label: "初始资金", value: 10000 * scale, displayValue: 10000 * scale },
			victory: { label: "胜利目标", value: "score", displayValue: "积分优先，现金不计入排名" },
		},
		gameOverRule: { id: "win", name: "积分胜利", description: longText, initEventCode: "async (ctx, gameProcess) => gameProcess.customData.ranking || false" },
		systems: Object.fromEntries(Array.from({ length: 8 }, (_, index) => ["system-" + index, { description: longText, score: index }])),
	};
	const request = {
		playerId: players[0].id, operationType: "active-action", scene: "active-action", title: longText, summary: longText,
		context,
		options: Array.from({ length: 8 }, (_, index) => ({ id: "option-" + index, label: longText, description: longText, summary: longText, actionType: "confirm" })),
		strategyState: { notes: [longText], recentDecisionSummaries: Array(6).fill(longText), memory: {
			version: 3, mapUnderstanding: { specialTileNotes: [longText], routeNotes: [longText] },
			match: { notableLessons: Array(6).fill(longText) },
		} },
		metadata: { formFields: [{ key: "strategy", options: ["score", "money"], description: longText }],
			chainContext: { eventName: longText, guidance: longText, previousDecisions: Array(6).fill({ title: longText, chosen: longText, summary: longText }) } },
	};
	context.mapItems[7].mapEventId = "event";
	return { longText, request };
}

for (const provider of ["openai-compatible", "anthropic"]) {
	for (const scene of ["active-action", "confirm-dialog", "form-dialog", "target-select"]) {
		test(`${provider} ${scene}: sends complete rules, board, options and match memory`, async () => {
			const { request, longText } = fixture();
			request.scene = scene;
			request.options.push({ id: "hidden", label: "隐藏", hidden: true }, { id: "disabled", label: "禁用", disabled: true });
			let body;
			const { createRemoteAIDecisionProvider } = evaluate(
				read("src/core/ai/OpenAICompatibleDecisionProvider.ts"), "OpenAICompatibleDecisionProvider.ts",
				{ "./remote-usage-stats": { recordAIRemoteUsage() { return "test-record"; }, updateAIRemoteUsage() {} }, "./ReadableAIPrompt": readablePrompt },
				{ window: { setTimeout }, fetch: async (url, init) => {
					body = JSON.parse(init.body);
					const reply = JSON.stringify({ optionId: "option-7", memoryPatches: [
						{ scope: "match", kind: "riskRule", summary: longText, evidence: longText },
					] });
					return { ok: true, status: 200, statusText: "OK", headers: new Map(), text: async () => JSON.stringify(provider === "anthropic"
						? { content: [{ type: "text", text: reply }] }
						: { choices: [{ message: { content: reply } }] }) };
				} },
			);
			const result = await createRemoteAIDecisionProvider({ provider, baseUrl: "https://example.test", apiKey: "test", model: "test" }).decide(request);
			assert.equal(result.optionId, "option-7");
			assert.equal(result.memoryPatches[0].summary, longText);
			assert.equal(result.memoryPatches[0].evidence, longText);
			const manager = new StrategyStateManager();
			manager.derive(request);
			manager.feedback({ playerId: request.playerId, request, memoryPatches: result.memoryPatches });
			const remembered = manager.getState(request.playerId).memory.candidateLongTerm.entries[0];
			assert.equal(remembered.summary, longText);
			assert.equal(remembered.evidence, longText);
			const prompt = body.messages.at(-1).content;
			assert.ok(prompt.includes("## 地图与本局规则"));
			assert.ok(prompt.includes(longText));
			assert.ok(prompt.includes("胜利目标：积分优先，现金不计入排名"));
			assert.ok(prompt.includes(request.context.gameOverRule.initEventCode));
			for (const player of request.context.players) assert.ok(prompt.includes("### " + player.user.username));
			assert.ok(prompt.includes("地皮7，"));
			assert.ok(prompt.includes("地皮0，"));
			assert.ok(!prompt.includes("地皮3，"));
			assert.ok(prompt.includes("- 角色（角色6）：" + longText));
			assert.ok(prompt.includes("system-7"));
			assert.ok(prompt.includes("卡牌5：" + longText));
			assert.ok(prompt.includes("特殊机制：" + longText));
			assert.ok(prompt.includes("点数合计 7（该点数掷出概率 100%）：地点8「地皮7」"));
			assert.ok(!prompt.includes("路径已启用"));
			assert.ok(!prompt.includes("## 移动路径"));
			assert.ok(!prompt.includes("旧地图行走顺序"));
			assert.ok(prompt.includes("## 骰子可达地块的信息"));
			assert.ok(prompt.includes("### 选项8：" + longText));
			assert.equal((prompt.match(/optionId=/g) || []).length, 8);
			assert.ok(prompt.includes('optionId="option-7"'));
			assert.ok(prompt.includes('fieldValues 中使用键 "strategy"'));
			assert.ok(prompt.includes("可选值：1. score\n2. money"));
			assert.ok(prompt.includes("第6步："));
			assert.ok(prompt.includes("本局经验：1. " + longText));
			assert.ok(prompt.includes("特殊地点：1. " + longText));
			for (const internal of ["player-0", "role-0", "property-0", "tile-0", "card-0-0", "gameSetting", "mapPathRuntimeState", "candidateLongTerm", "sourceDecisionId"]) {
				assert.ok(!prompt.includes(internal), "Leaked internal identifier: " + internal);
			}
			assert.ok(!prompt.includes('optionId="hidden"'));
			assert.ok(!prompt.includes('optionId="disabled"'));
		});
	}
}

test("economic strategy is invariant when every monetary amount scales together", () => {
	for (const ratio of [0.05, 0.2, 0.6, 1, 2]) {
		const states = [0.0001, 0.01, 1, 100].map(scale => {
			const { request } = fixture(scale);
			request.context.player.money *= ratio;
			request.context.economy = economy.buildAIEconomySnapshot(request.context, [10000 * scale]);
			const state = new StrategyStateManager().derive(request);
			return {
				posture: state.posture, reserve: Number((state.reserveCashTarget / scale).toFixed(8)),
				warnings: plain(state.memory.economy.warningFlags || []),
				threats: plain(state.memory.threatModel.threatReasons || []),
			};
		});
		for (const state of states.slice(1)) assert.deepEqual(state, states[0]);
	}
});

test("actual initialized money overrides room defaults and stays stable as cash falls", () => {
	const { request } = fixture();
	const actual = economy.buildAIEconomySnapshot(request.context, [100, 200]);
	assert.equal(actual.baselineCash, 150);
	assert.equal(actual.baselineSource, "initial-money");
	request.context.player.money = 1;
	assert.equal(economy.buildAIEconomySnapshot(request.context, [100, 200]).baselineCash, 150);
});

test("reserve includes live opponent rent and excludes own, unowned and bankrupt properties", () => {
	const { request } = fixture();
	const context = request.context;
	context.properties[0].costList = [1e9]; // own
	context.properties[1].costList = [1e9];
	context.players[1].isBankrupted = true;
	context.properties[2].owner = undefined;
	context.properties[2].costList = [1e9];
	context.properties[3].level = 1;
	context.properties[3].costList = [300, 5000];
	const snapshot = economy.buildAIEconomySnapshot(context, [10000]);
	assert.equal(snapshot.maxOpponentRent, 10000);
	context.economy = snapshot;
	const state = new StrategyStateManager().derive(request);
	assert.equal(state.reserveCashTarget, 10000);
	context.player.money = 9000;
	assert.equal(new StrategyStateManager().derive(request).posture, "conservative");
});

test("missing or invalid economic inputs fall back without a fixed currency floor or NaN", () => {
	const { request } = fixture();
	const context = request.context;
	context.gameSetting.initMoney.value = NaN;
	let result = economy.buildAIEconomySnapshot(context, [NaN, Infinity, -1]);
	assert.equal(result.baselineSource, "property-price");
	assert.equal(result.baselineCash, 1000);
	context.properties = [];
	result = economy.buildAIEconomySnapshot(context);
	assert.equal(result.baselineSource, "player-cash");
	for (const player of context.players) player.money = 0;
	result = economy.buildAIEconomySnapshot(context);
	assert.equal(result.baselineSource, "unavailable");
	assert.equal(economy.getAIReserveCashTarget(NaN, result), 0);
});

// Exercise the actual Worker methods without booting its browser/game runtime.
const workerSource = read("src/core/worker/GameProcessWorker.ts");
const workerAST = ts.createSourceFile("GameProcessWorker.ts", workerSource, ts.ScriptTarget.Latest, true);
const workerClass = workerAST.statements.find(node => ts.isClassDeclaration(node) && node.name.text === "GameProcess");
const workerMethods = [
	"buildAIDecisionContext", "start", "buildMessageCardAIReactionPrompt", "extractAIMessageCardSummary",
	"buildAIDecisionChainContext", "rememberAIDecisionChain", "isChainableAIDecisionScene",
];
const methodSource = workerClass.members.filter(node => workerMethods.includes(node.name?.getText(workerAST)))
	.map(node => node.getText(workerAST)).join("\n");
const { WorkerHarness } = evaluate("export class WorkerHarness {\n" + methodSource + "\n}", "worker-methods.ts", {}, {
	buildAIEconomySnapshot: economy.buildAIEconomySnapshot,
	buildDiceReachability: reachability.buildDiceReachability,
	WorkerCommType: {}, SocketMsgType: {}, SocketMsgSource: {}, self: { postMessage() {} },
	randomString: () => "random", reportWorkerError: error => { throw error; },
});

test("Worker includes effective settings and first active ending rule in every decision", () => {
	const { request } = fixture();
	const context = request.context;
	const worker = new WorkerHarness();
	const staleProperty = { ...context.properties[0], level: 99, owner: undefined };
	context.mapItems[0].property = staleProperty;
	worker.getGameData = () => context;
	worker.gameSetting = context.gameSetting;
	worker.aiInitialMoney = [100, 200];
	worker.enabledPathIds = new Set(["branch"]);
	worker.mapPathCanPassConditions = new Map();
	worker.mapData = {
		...context, id: context.map.id, info: context.map, roles: context.map.roles,
		phases: { gameOverRule: [context.gameOverRule, { name: "未执行规则" }] },
	};
	const result = worker.buildAIDecisionContext({ id: context.player.id, getPlayerInfo: () => context.player, movementHistory: [], modifierManager: { getModifiersList: () => [] } });
	assert.equal(result.economy.baselineCash, 150);
	assert.equal(result.mapItems[0].property.level, 0);
	assert.equal(result.mapItems[0].property.owner.userId, context.player.id);
	assert.equal(result.gameOverRule, context.gameOverRule);
	assert.equal(result.gameSetting, context.gameSetting);
	assert.equal(result.mapPaths, undefined);
	assert.equal(result.mapPathRuntimeState, undefined);
	assert.equal(result.diceReachability.status, "ready");
});

test("Worker captures scripted opening money before restoring a mid-game save", async () => {
	const worker = new WorkerHarness();
	let cash = 100;
	worker.players = new Map([["player", { getPlayerInfo: () => ({ money: cash }) }]]);
	worker.pendingSaveData = { snapshot: { playerSnapshots: {} }, aiPlayerIds: [] };
	for (const name of ["initPlayers", "initProperties", "runInitedPhase", "runPostRestorePhase", "waitInitFinished", "gameLoop"]) worker[name] = async () => {};
	for (const name of ["prepareInitialInitBarrier", "gameBroadcast", "startHeartbeat"]) worker[name] = () => {};
	worker.getGameData = () => ({});
	worker.restoreFromSnapshot = async () => { cash = 7; };
	await worker.start();
	assert.deepEqual(plain(worker.aiInitialMoney), [100]);
	assert.equal(cash, 7);
});

test("message-card title and content reach AI without upstream truncation", () => {
	const { longText } = fixture();
	const worker = new WorkerHarness();
	worker.extractMessageCardContentText = value => value;
	const result = worker.buildMessageCardAIReactionPrompt({ title: longText, content: longText });
	assert.equal(result.options[0].payload.title, longText);
	assert.equal(result.options[0].payload.content, longText);
	assert.ok(result.summary.includes(longText));
});

test("continuous dialogs keep all previous choices within the same event", () => {
	const { request } = fixture();
	request.scene = "confirm-dialog";
	const worker = new WorkerHarness();
	worker.currentEventName = "同一事件";
	worker.currentRoundPlayer = { id: request.playerId };
	worker.aiDecisionChains = new Map();
	const player = { id: request.playerId };
	for (let index = 0; index < 7; index++) {
		request.metadata.chainContext = worker.buildAIDecisionChainContext(player, request);
		worker.rememberAIDecisionChain(player.id, request, { optionId: "option-0" });
	}
	assert.equal(worker.buildAIDecisionChainContext(player, request).previousDecisions.length, 7);
	worker.currentEventName = "另一个事件";
	assert.equal(worker.buildAIDecisionChainContext(player, request).previousDecisions.length, 0);
	request.metadata.chainContext = worker.buildAIDecisionChainContext(player, request);
	worker.rememberAIDecisionChain(player.id, request, { optionId: "option-0" });
	assert.equal(worker.buildAIDecisionChainContext(player, request).previousDecisions.length, 1);
});

test("human-readable references resolve in prose, nested system data and strategy memory", () => {
	const { request } = fixture();
	request.options[0].payload = { ownerId: "player-1", targetMapItemId: "tile-7", amount: 0 };
	request.context.systems.vault = { name: "金库", description: "将积分交给player-1，由player-1保管。", balances: { "player-1": 0 }, ready: false };
	request.strategyState.focusPlayerId = "player-1";
	request.strategyState.focusPropertyIds = ["property-7"];
	request.metadata.decisionId = "private-decision-trace";
	request.context.players[1].user.avatar = "private-avatar-image";
	request.context.players[1].infoDisplay = { id: "ui-schema-id", style: { color: "private-style" } };
	const prompt = readablePrompt.buildRemotePrompt(request);
	assert.ok(prompt.includes("将积分交给玩家1，由玩家1保管。"));
	assert.ok(prompt.includes("玩家1：0"));
	assert.ok(prompt.includes("ready：否"));
	assert.ok(prompt.includes("重点关注玩家：玩家1"));
	assert.ok(prompt.includes("重点关注地产：1. 地皮7"));
	assert.ok(prompt.includes("所有者：玩家1"));
	assert.ok(prompt.includes("目标地点：地点8「地皮7」"));
	assert.ok(prompt.includes("数量：0"));
	for (const internal of ["player-1", "tile-7", "property-7", "private-decision-trace", "private-avatar-image", "ui-schema-id", "private-style"]) {
		assert.ok(!prompt.includes(internal), "Leaked internal: " + internal);
	}
});

test("duplicate names remain distinguishable and numeric option IDs do not replace amounts", () => {
	const { request } = fixture();
	for (const player of request.context.players) player.user.username = "同名玩家";
	for (const property of request.context.properties) property.name = "同名地产";
	request.options = [{ id: "1", label: "购买", actionType: "confirm", payload: { amount: 1 } }];
	request.metadata.maxSelections = 1;
	request.metadata.formFields = [{ key: "quantity", label: "购买数量", valueType: "number", min: 1, max: 10, defaultValue: 1 }];
	request.context.players[0].money = 1;
	const prompt = readablePrompt.buildRemotePrompt(request);
	assert.ok(prompt.includes("同名玩家（玩家1）"));
	assert.ok(prompt.includes("同名玩家（玩家6）"));
	assert.ok(prompt.includes("同名地产（地产8）"));
	assert.ok(prompt.includes('optionId="1"'));
	assert.ok(prompt.includes("数量：1"));
	assert.ok(prompt.includes("最小值：1"));
	assert.ok(prompt.includes("最多选择数量：1"));
	assert.ok(prompt.includes("默认值：1"));
	request.options = request.context.players.slice(0, 2).map(player => ({
		id: player.id, label: player.user.username, actionType: "target", payload: { id: player.id, type: "player" },
	}));
	const targets = readablePrompt.buildRemotePrompt(request);
	assert.ok(targets.includes("### 选项1：同名玩家（玩家1）"));
	assert.ok(targets.includes("### 选项2：同名玩家（玩家2）"));
});

test("IDs containing regular expression characters are replaced literally", () => {
	const { request } = fixture();
	request.context.players[1].id = "player[1].*";
	request.context.players[1].user.userId = "player[1].*";
	request.context.systems.vault = { ownerId: "player[1].*", description: "攻击player[1].*后返回。player111应保持原样。" };
	const prompt = readablePrompt.buildRemotePrompt(request);
	assert.ok(prompt.includes("攻击玩家1后返回。player111应保持原样。"));
	assert.ok(!prompt.includes("player[1].*"));
});

for (const provider of ["openai-compatible", "anthropic"]) {
	test(`${provider}: encourages speech and preserves natural replies without rejecting silent decisions`, async () => {
		const cases = [
			{ chatMessages: ["我先拿下地皮7，后面收租就靠它了！"], expected: ["我先拿下地皮7，后面收租就靠它了！"] },
			{ chatMessages: "  我先  留点钱。 ", expected: ["我先 留点钱。"] },
			{ chatMessages: ["确认", "玩家0，这次我可不会让着你！"], expected: ["玩家0，这次我可不会让着你！"] },
			{ chatMessages: ["使用 optionId=option-7"], expected: undefined },
			{ chatMessages: ["确认！"], expected: undefined },
			{ chatMessages: [], expected: undefined },
			{ chatMessages: undefined, expected: undefined },
		];
		for (const sample of cases) {
			const { request } = fixture();
			delete request.metadata.chainContext;
			let body;
			const { createRemoteAIDecisionProvider } = evaluate(
				read("src/core/ai/OpenAICompatibleDecisionProvider.ts"), "OpenAICompatibleDecisionProvider.ts",
				{ "./remote-usage-stats": { recordAIRemoteUsage() { return "chat-test"; }, updateAIRemoteUsage() {} }, "./ReadableAIPrompt": readablePrompt },
				{ window: { setTimeout }, fetch: async (url, init) => {
					body = JSON.parse(init.body);
					const reply = JSON.stringify({ optionId: "option-7", chatMessages: sample.chatMessages });
					return { ok: true, status: 200, statusText: "OK", headers: new Map(), text: async () => JSON.stringify(provider === "anthropic"
						? { content: [{ type: "text", text: reply }] }
						: { choices: [{ message: { content: reply } }] }) };
				} },
			);
			const result = await createRemoteAIDecisionProvider({ provider, baseUrl: "https://example.test", apiKey: "test", model: "test" }).decide(request);
			assert.equal(result.optionId, "option-7");
			assert.deepEqual(result.chatMessages && plain(result.chatMessages), sample.expected);
			const system = body.system || body.messages[0].content;
			assert.ok(system.includes("默认在 chatMessages 中返回 1 句"));
			assert.ok(!system.includes("只有当你确实有自然"));
			const prompt = body.messages.at(-1).content;
			const instructions = prompt.slice(prompt.lastIndexOf("## 本次回复要求"));
			assert.ok(instructions.includes("在作出选择的同时"));
			assert.ok(instructions.includes('"chatMessages":['));
			assert.ok(prompt.lastIndexOf("## 本次回复要求") > prompt.lastIndexOf("## 本局策略与记忆"));
		}
	});
}

test("chat-only calls require reactions even in a chain; form replies keep action fields and speech together", () => {
	const { request } = fixture();
	request.metadata.chatOnly = true;
	let prompt = readablePrompt.buildRemotePrompt(request);
	let instructions = prompt.slice(prompt.lastIndexOf("## 本次回复要求"));
	assert.ok(instructions.includes("请务必在 chatMessages 中写 1 句"));
	assert.ok(!instructions.includes("空数组"));
	delete request.metadata.chatOnly;
	request.scene = "form-dialog";
	prompt = readablePrompt.buildRemotePrompt(request);
	instructions = prompt.slice(prompt.lastIndexOf("## 本次回复要求"));
	assert.ok(instructions.includes("只有与前一句重复且没有新内容时"));
	assert.ok(instructions.includes('"fieldValues":{},"chatMessages":['));
	assert.ok(instructions.includes("取消时 submitted 为 false"));
});

test("Room broadcasts natural model speech and still suppresses technical or empty messages", () => {
	const roomSource = read("src/core/monopoly-host/Room.ts");
	const roomAST = ts.createSourceFile("Room.ts", roomSource, ts.ScriptTarget.Latest, true);
	const roomClass = roomAST.statements.find(node => ts.isClassDeclaration(node) && node.name.text === "Room");
	const names = ["abbreviateAIChatText", "isGenericAIChatText", "isTechnicalAIChatText", "normalizeNaturalAIChatText", "broadcastAISelectionChat", "broadcastAIThought"];
	const methods = roomClass.members.filter(node => names.includes(node.name?.getText(roomAST)))
		.map(node => node.getText(roomAST)).join("\n");
	const { RoomHarness } = evaluate("export class RoomHarness {\n" + methods + "\n}", "room-chat-methods.ts");
	const room = new RoomHarness();
	const messages = [];
	room.chatBroadcast = (content, playerId) => messages.push({ content, playerId });
	const { request } = fixture();
	room.broadcastAISelectionChat(request, { optionId: "option-7", chatMessages: ["我先留点钱，下轮再出手。"] });
	room.broadcastAISelectionChat(request, { optionId: "option-7", chatMessages: ["确认"] });
	room.broadcastAISelectionChat(request, { optionId: "option-7", chatMessages: ["使用 property:internal-id"] });
	room.broadcastAISelectionChat(request, { optionId: "option-7", chatMessages: [] });
	room.broadcastAISelectionChat(request, { optionId: "option-7" });
	assert.deepEqual(messages, [{ content: "我先留点钱，下轮再出手。", playerId: request.playerId }]);
});
