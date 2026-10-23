const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");
const clientRoot = path.resolve(__dirname, "../..");
const read = file => fs.readFileSync(path.join(clientRoot, file), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
function evaluate(source, filename, dependencies = {}, globals = {}) {
	const module = { exports: {} };
	const compiled = ts.transpileModule(source, { fileName: filename,
		compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
	vm.runInNewContext(compiled.outputText, { module, exports: module.exports,
		console: { warn() {}, error() {} }, require: name => {
			assert.ok(name in dependencies, "Unexpected dependency: " + name);
			return dependencies[name];
		}, ...globals,
	}, { filename });
	return module.exports;
}
const utils = evaluate(read("../../packages/utils/game/map.ts"), "map.ts");
const { buildDiceReachability } = evaluate(read("src/core/worker/ai/DiceReachability.ts"), "DiceReachability.ts", { "@mine-monopoly/utils": utils });
const { buildRemotePrompt } = evaluate(read("src/core/ai/ReadableAIPrompt.ts"), "ReadableAIPrompt.ts");

function fixture(size = 16, diceValues = [[1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6]]) {
	const player = { id: "player", user: { userId: "player", username: "小明" }, money: 100, properties: [], chanceCards: [], buff: [],
		positionMapItemId: "tile-0", positionIndex: 0, isAI: true, isBankrupted: false, stop: 0,
		dices: diceValues.map((values, index) => ({ id: "dice-" + index, diceValues: values })) };
	const properties = Array.from({ length: size }, (_, index) => ({ id: "land-" + index, name: "地块" + index,
		sellCost: 10, buildCost: 5, level: 0, maxLevel: 1, costList: [2, 4],
		custom: { description: "机制" + index + "：" + "完整说明。".repeat(60) + "关键结尾" + index } }));
	const context = { player, players: [player], properties, mapIndex: properties.map((_, index) => "tile-" + index),
		mapItems: properties.map((property, index) => ({ id: "tile-" + index, type: { id: "land", name: "地产" }, property })),
		mapEvents: [], map: { id: "map", name: "本地预测地图", roles: [] }, currentRound: 1, currentMultiplier: 1, currentPlayerIdInRound: "player" };
	const mapPaths = context.mapItems.map((item, index) => ({ id: "path-" + index, fromMapItemId: item.id, toMapItemId: "tile-" + ((index + 1) % size) }));
	return { context, mapPaths, enabledPathIds: new Set(mapPaths.map(path => path.id)), conditionalPathIds: new Set(), movementHistory: [] };
}
function only(input) { return buildDiceReachability(input).rolls[0].landings; }
function setPaths(input, pairs) {
	input.mapPaths = pairs.map(([from, to], index) => ({ id: "edge-" + index, fromMapItemId: "tile-" + from, toMapItemId: "tile-" + to }));
	input.enabledPathIds = new Set(input.mapPaths.map(path => path.id));
}

test("two ordinary dice calculate exact sums and the corresponding local landing tiles", () => {
	const input = fixture();
	const preview = buildDiceReachability(input);
	assert.equal(preview.status, "ready");
	assert.deepEqual(plain(preview.rolls.map(roll => roll.total)), Array.from({ length: 11 }, (_, index) => index + 2));
	for (const roll of preview.rolls) {
		assert.ok(Math.abs(roll.probability - (6 - Math.abs(7 - roll.total)) / 36) < 1e-12);
		assert.equal(roll.landings[0].mapItemId, "tile-" + roll.total);
		assert.equal(roll.landings[0].conditional, false);
	}
	assert.ok(Math.abs(preview.rolls.reduce((sum, roll) => sum + roll.probability, 0) - 1) < 1e-12);
});

test("custom dice preserve repeated-face weights, fixed prophecy and current zero-prophecy behavior", () => {
	const input = fixture(16, [[1, 1, 2], [0, 4]]);
	let preview = buildDiceReachability(input);
	assert.deepEqual(plain(preview.rolls.map(roll => [roll.total, Number(roll.probability.toFixed(6))])), [[1, .333333], [2, .166667], [5, .333333], [6, .166667]]);
	input.context.player.dices[0].prophecy = 2;
	preview = buildDiceReachability(input);
	assert.deepEqual(plain(preview.rolls.map(roll => roll.total)), [2, 6]);
	input.context.player.dices[0].prophecy = 0;
	assert.deepEqual(plain(buildDiceReachability(input).rolls.map(roll => roll.total)), [1, 2, 5, 6]);
});

test("AI follows the first enabled branch, not every fork or legacy index order", () => {
	const input = fixture(4, [[1]]);
	setPaths(input, [[0, 2], [0, 1], [0, 3]]);
	input.context.mapIndex = ["tile-0", "tile-1", "tile-2", "tile-3"];
	assert.equal(only(input)[0].mapItemId, "tile-2");
	input.enabledPathIds.delete("edge-0");
	assert.equal(only(input)[0].mapItemId, "tile-1");
});

test("dead ends return along movement history and then avoid the dead branch", () => {
	const input = fixture(4, [[3]]);
	setPaths(input, [[0, 1], [0, 2], [2, 3]]);
	assert.equal(only(input)[0].mapItemId, "tile-2");
	input.context.player.dices[0].diceValues = [4];
	assert.equal(only(input)[0].mapItemId, "tile-3");
});

test("incoming edges are excluded during forward movement and history can reverse a now-closed edge", () => {
	const input = fixture(3, [[1]]);
	setPaths(input, [[0, 1], [1, 0], [1, 2]]);
	input.context.player.positionMapItemId = "tile-1";
	input.movementHistory = [{ pathId: "edge-0", fromMapItemId: "tile-0", toMapItemId: "tile-1", direction: "forward" }];
	assert.equal(only(input)[0].mapItemId, "tile-2");
	input.context.player.dices[0].diceValues = [-1];
	input.enabledPathIds.delete("edge-0");
	assert.equal(only(input)[0].mapItemId, "tile-0");
	input.movementHistory = [];
	assert.equal(only(input)[0].mapItemId, "tile-1");
	assert.equal(only(input)[0].stoppedEarly, true);
});

test("dynamic gates produce conditional alternatives without assigning fake branch probabilities", () => {
	const input = fixture(3, [[1]]);
	setPaths(input, [[0, 1], [0, 2]]);
	input.conditionalPathIds.add("edge-0");
	let result = buildDiceReachability(input);
	assert.deepEqual(plain(result.rolls[0].landings.map(landing => landing.mapItemId)), ["tile-1", "tile-2"]);
	assert.ok(result.rolls[0].landings.every(landing => landing.conditional && !("probability" in landing)));
	input.conditionalPathIds.add("edge-1");
	result = buildDiceReachability(input);
	assert.deepEqual(plain(result.rolls[0].landings.map(landing => landing.mapItemId)), ["tile-1", "tile-2", "tile-0"]);
	assert.ok(result.notes.some(note => note.includes("未执行")));
});

test("passed events and movement modifiers mark uncertainty and preview does not mutate state", () => {
	const input = fixture(6, [[2]]);
	input.context.mapItems[1].mapEventId = "passed";
	input.context.mapEvents = [{ id: "passed", name: "传送事件", type: "PassedEvent", description: "经过后可能传送" }];
	input.movementModifiers = ["骰子结果加倍"];
	const before = JSON.stringify({ player: input.context.player, history: input.movementHistory });
	const result = buildDiceReachability(input);
	assert.equal(result.rolls[0].landings[0].mapItemId, "tile-2");
	assert.equal(result.rolls[0].landings[0].conditional, true);
	assert.ok(result.notes.some(note => note.includes("骰子结果加倍")));
	assert.ok(result.notes.some(note => note.includes("经过触发事件")));
	assert.equal(JSON.stringify({ player: input.context.player, history: input.movementHistory }), before);
});

test("stopped, bankrupt, invalid and unusually large movement states do not fabricate predictions", () => {
	const input = fixture(6, [[1]]);
	input.context.player.stop = 1;
	assert.equal(buildDiceReachability(input).status, "stopped");
	input.context.player.stop = 0;
	input.context.player.isBankrupted = true;
	assert.equal(buildDiceReachability(input).status, "bankrupted");
	input.context.player.isBankrupted = false;
	input.context.player.positionMapItemId = "missing";
	assert.equal(buildDiceReachability(input).status, "unavailable");
	input.context.player.positionMapItemId = "tile-0";
	for (const values of [[], [NaN], [1e9]]) {
		input.context.player.dices[0].diceValues = values;
		const result = buildDiceReachability(input);
		assert.equal(result.status, "unavailable");
		assert.equal(result.rolls.length, 0);
	}
	input.context.player.dices = [];
	assert.equal(only(input)[0].mapItemId, "tile-0");
});

test("prompt includes only current and dice-reachable tile mechanisms, without any full route data", () => {
	const input = fixture(16, [[2]]);
	const context = input.context;
	context.diceReachability = buildDiceReachability(input);
	context.systems = { mapPaths: input.mapPaths.map(path => ({ ...path, name: "秘密路径名称" })), mapIndex: ["秘密行走顺序"], score: 7 };
	const prompt = buildRemotePrompt({ playerId: "player", title: "准备掷骰", options: [], operationType: "active-action", context });
	assert.ok(prompt.includes("点数合计 2（该点数掷出概率 100%）"));
	assert.ok(prompt.includes("关键结尾2"));
	assert.ok(prompt.includes("关键结尾0"));
	assert.ok(!prompt.includes("关键结尾8"));
	assert.ok(prompt.includes("积分：7"));
	for (const route of ["秘密路径名称", "秘密行走顺序", "## 移动路径", "路径已启用", "fromMapItemId", "toMapItemId", "path-", "mapPaths", "mapIndex"]) assert.ok(!prompt.includes(route), route);
});

// Compare the pure predictor to the actual checked-in player.walk handler, with only animation and broadcasts replaced.
const workerSource = read("src/core/worker/GameProcessWorker.ts");
const workerAST = ts.createSourceFile("GameProcessWorker.ts", workerSource, ts.ScriptTarget.Latest, true);
let actualWalk;
function visit(node) {
	if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "setHandler"
		&& ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === "player.walk") actualWalk = node.arguments[1];
	ts.forEachChild(node, visit);
}
visit(workerAST);
assert.ok(actualWalk);
const { makeWalkHandler } = evaluate("export function makeWalkHandler(player) { return " + actualWalk.getText(workerAST) + "; }", "actual-walk.ts", {}, {
	...utils, reverseMapMoveDirection: direction => direction === "forward" ? "reverse" : "forward",
});
async function actualMove(input, steps, guardResults = {}) {
	const data = input.context.player;
	const player = { ...data, name: data.user.username, movementHistory: plain(input.movementHistory), returnFromMapItemId: input.returnFromMapItemId,
		setPositionMapItemId(id) { this.positionMapItemId = id; }, setPositionIndex(index) { this.positionIndex = index; },
		getLastMovementHistoryEntry() { return this.movementHistory.at(-1); }, popLastMovementHistoryEntry() { return this.movementHistory.pop(); },
		recordMapMovement(entry) { this.movementHistory.push(entry); }, resetMapNavigation() { this.movementHistory = []; this.returnFromMapItemId = undefined; } };
	const adjacency = utils.buildMapPathAdjacency(input.mapPaths);
	const game = {
		mapData: { mapPaths: input.mapPaths, mapIndex: input.context.mapIndex, startMapItemId: "tile-0" },
		mapItems: new Map(input.context.mapItems.map(item => [item.id, item])),
		getMapPathById: id => input.mapPaths.find(path => path.id === id),
		getMapMoveOptions: (id, direction) => {
			const seen = new Set();
			return utils.getAvailableMapPaths(adjacency, id, direction, input.enabledPathIds)
				.map(path => ({ path, targetMapItemId: direction === "forward" ? path.toMapItemId : path.fromMapItemId, direction }))
				.filter(option => { if (seen.has(option.targetMapItemId)) return false; seen.add(option.targetMapItemId); return true; });
		},
		canPassMapPath: async (player, path) => guardResults[path.id] !== false,
		walkSegment: async () => {}, checkMapItemHasPassedEvent: () => false, gameDataBroadcast() {}, setCurrentEventName() {},
	};
	const result = await makeWalkHandler.call(game, player)({ steps });
	return { player, result };
}

test("local predictions match the real movement handler across branches, cycles, closures and reverse history", async () => {
	let seed = 42;
	const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed; };
	let compared = 0;
	for (let graph = 0; graph < 20; graph++) {
		const input = fixture(6, [[1]]);
		const pairs = [];
		for (let from = 0; from < 6; from++) for (let to = 0; to < 6; to++) if (random() % 4 === 0) pairs.push([from, to]);
		setPaths(input, pairs);
		for (const path of input.mapPaths) if (random() % 6 === 0) input.enabledPathIds.delete(path.id);
		const warmed = await actualMove(input, 4);
		input.context.player.positionMapItemId = warmed.player.positionMapItemId;
		input.context.player.positionIndex = warmed.player.positionIndex;
		input.movementHistory = warmed.player.movementHistory;
		input.returnFromMapItemId = warmed.player.returnFromMapItemId;
		for (const steps of [-5, -1, 0, 1, 2, 3, 7, 2.1]) {
			input.context.player.dices[0].diceValues = [steps];
			const predicted = only(input);
			const actual = await actualMove(input, steps);
			assert.equal(predicted.length, 1);
			assert.equal(predicted[0].mapItemId, actual.player.positionMapItemId, `graph ${graph}, steps ${steps}`);
			assert.equal(predicted[0].movedSteps, actual.result.segments.length);
			assert.equal(predicted[0].stoppedEarly, actual.result.segments.length < Math.ceil(Math.abs(steps)));
			compared++;
		}
	}
	assert.equal(compared, 160);
});

test("conditional predictions include the actual result for both accepted and rejected gates", async () => {
	const input = fixture(3, [[1]]);
	setPaths(input, [[0, 1], [0, 2]]);
	input.conditionalPathIds.add("edge-0");
	const predicted = only(input);
	for (const accepted of [true, false]) {
		const actual = await actualMove(input, 1, { "edge-0": accepted });
		assert.ok(predicted.some(landing => landing.mapItemId === actual.player.positionMapItemId));
	}
});
