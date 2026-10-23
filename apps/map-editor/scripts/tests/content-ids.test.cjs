const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");
const vue = require("vue");
const sfc = require("vue/compiler-sfc");

const editorRoot = path.resolve(__dirname, "../..");
const read = relative => fs.readFileSync(path.join(editorRoot, relative), "utf8");
const zod = require(require.resolve("zod", { paths: [editorRoot] }));

// Run the checked-in TypeScript and Vue scripts with only platform dependencies replaced.
function evaluate(source, filename, resolve, globals = {}) {
	const module = { exports: {} };
	const compiled = ts.transpileModule(source, {
		fileName: filename,
		compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
	});
	vm.runInNewContext(compiled.outputText, {
		module, exports: module.exports, require: resolve, console, TextDecoder, Uint8Array, Error, ...globals,
	}, { filename });
	return module.exports;
}

function createHarness() {
	const notifications = [], removedImages = [], messages = [];
	let temporaryImages = 0;
	const images = new Map(["icon-a", "icon-b"].map(id => [id, { id, url: id + ".png" }]));
	const resourceStore = {
		findImageById: id => images.get(id),
		addTempImage: async () => ({ id: "temp-" + ++temporaryImages }),
		removeImage: id => removedImages.push(id),
	};
	const eventBus = { emit: (...args) => notifications.push(args) };

	const storeFile = ts.createSourceFile("stores.ts", read("src/stores/index.ts"), ts.ScriptTarget.Latest, true);
	let actions;
	function visit(node) {
		if (ts.isVariableDeclaration(node) && node.name.getText(storeFile) === "useMapDataStore") {
			actions = node.initializer.arguments[1].properties.find(prop => prop.name?.getText(storeFile) === "actions").initializer;
		}
		ts.forEachChild(node, visit);
	}
	visit(storeFile);
	const methodNames = new Set([
		"addChanceCard", "editChanceCard", "updateChanceCard", "addMapEvent", "editMapEvent",
		"updateMapEvent", "findMapEventById", "saveModifierTemplate",
	]);
	const methods = actions.properties.filter(method => methodNames.has(method.name?.getText(storeFile)));
	assert.equal(methods.length, methodNames.size);
	const storeSource = "export class ContentStore { chanceCards = []; mapEvents = []; mapItems = []; modifierTemplates = [];\n" +
		methods.map(method => method.getText(storeFile)).join("\n") + "\n}";
	const { ContentStore } = evaluate(storeSource, "content-store.ts", require, {
		useResourceStore: () => resourceStore, eventBus,
	});
	const store = vue.reactive(new ContentStore());
	const shortIds = evaluate(read("src/utils/short-id.ts"), "short-id.ts", require);
	const dependencies = {
		"@src/stores": { useMapDataStore: () => store, useResourceStore: () => resourceStore },
		"@src/utils/short-id": shortIds,
		"@src/utils/event-bus": { eventBus },
		zod,
	};
	for (const type of ["chance-card", "map-event", "role"]) {
		dependencies["./validators/" + type + "-validators"] = evaluate(
			read("src/services/validators/" + type + "-validators.ts"), type + "-validators.ts", () => zod,
		);
	}
	const services = evaluate(read("src/services/map-content-service.ts"), "map-content-service.ts", name => dependencies[name] || {});
	services.mapContentService.validateEffectCode = async () => ({ valid: true, errors: [] });

	async function component(relative, props, onEmit = () => {}) {
		const { descriptor, errors } = sfc.parse(read(relative), { filename: relative });
		assert.equal(errors.length, 0);
		const script = sfc.compileScript(descriptor, { id: "content-id-test" });
		const template = sfc.compileTemplate({
			id: "content-id-test", filename: relative, source: descriptor.template.content,
			compilerOptions: { bindingMetadata: script.bindings },
		});
		assert.equal(template.errors.length, 0);
		const mounted = [], emitted = [];
		const vueDependency = {
			...vue, onMounted: callback => mounted.push(callback),
			useModel: () => vue.ref(false),
		};
		const module = evaluate(script.content, relative, name => {
			if (name === "vue") return vueDependency;
			if (name === "@src/services") return services;
			if (dependencies[name]) return dependencies[name];
			if (name === "lodash") return { cloneDeep: value => JSON.parse(JSON.stringify(value)) };
			if (name === "ant-design-vue") return {
				message: Object.fromEntries(["success", "error", "warning"].map(type => [type, value => messages.push([type, value])])),
				Modal: {},
			};
			if (name.includes("code-templates")) return {
				replaceEffectCodeParams: value => value,
				generateChanceCardTemplate: () => "", generateChanceCardParams: () => "",
				generateModifierTemplate: () => "", generateModifierParams: () => "",
			};
			if (name === "@mine-monopoly/types") return { TargetSelectType: { ToSelf: "ToSelf" }, MapEventType: { ArrivedEvent: "ArrivedEvent" } };
			return { default: "component-stub" };
		});
		const state = module.default.setup(props, {
			expose() {}, emit: (...args) => { emitted.push(args); onEmit(...args); },
		});
		for (const callback of mounted) await callback();
		return { state, emitted };
	}

	return {
		store, service: services.mapContentService, component, notifications, removedImages, messages,
		get temporaryImages() { return temporaryImages; },
	};
}

const fixtures = [
	{
		label: "chance card", prefix: "card", collection: "chanceCards", add: "addChanceCard", update: "updateChanceCard",
		data: { name: "Card", description: "Description", type: "ToSelf", color: "#123456", iconId: "icon-a", effectCode: "async (cmd, ctx) => {}" },
	},
	{
		label: "map event", prefix: "event", collection: "mapEvents", add: "addMapEvent", update: "updateMapEvent",
		data: { name: "Event", description: "Description", type: "ArrivedEvent", iconId: "icon-a", effectCode: "async (cmd, ctx) => {}" },
	},
];

for (const fixture of fixtures) {
	test(fixture.label + ": custom and automatic IDs survive creation", async () => {
		const h = createHarness(), customId = fixture.prefix + "-custom";
		const custom = await h.service[fixture.add]({ ...fixture.data, id: customId });
		assert.equal(custom.id, customId);
		assert.equal(h.store[fixture.collection][0].id, customId);
		assert.equal(h.notifications.at(-1)[1].details.id, customId);
		for (const id of [undefined, ""]) {
			const automatic = await h.service[fixture.add]({ ...fixture.data, id });
			assert.match(automatic.id, new RegExp("^" + fixture.prefix + "-[a-z0-9]{6}$"));
		}
	});

	test(fixture.label + ": rename updates the original record without losing code or images", async () => {
		const h = createHarness(), oldId = fixture.prefix + "-old", newId = fixture.prefix + "-new";
		await h.service[fixture.add]({ ...fixture.data, id: oldId });
		const original = h.store[fixture.collection][0];
		const updated = await h.service[fixture.update]({ ...fixture.data, originalId: oldId, id: newId });
		assert.equal(h.store[fixture.collection].length, 1);
		assert.equal(h.store[fixture.collection][0], original);
		assert.equal(original.id, newId);
		assert.equal(original.effectCode, fixture.data.effectCode);
		assert.equal(original.iconId, "icon-a");
		assert.equal(updated.id, newId);
		assert.equal(h.removedImages.length, 0);
		assert.equal(h.notifications.at(-1)[1].details.id, newId);
		await h.service[fixture.update]({ ...fixture.data, id: newId, name: "Edited again" });
		assert.equal(original.name, "Edited again");
	});

	test(fixture.label + ": duplicate IDs never overwrite records or delete images", async () => {
		const h = createHarness(), firstId = fixture.prefix + "-one", secondId = fixture.prefix + "-two";
		await h.service[fixture.add]({ ...fixture.data, id: firstId });
		await h.service[fixture.add]({ ...fixture.data, id: secondId });
		const before = JSON.stringify(h.store[fixture.collection]), notificationCount = h.notifications.length;
		await assert.rejects(h.service[fixture.add]({ ...fixture.data, id: firstId, iconId: undefined }), /ID/);
		await assert.rejects(h.service[fixture.update]({ ...fixture.data, originalId: firstId, id: secondId, iconId: "icon-b" }), /ID/);
		assert.equal(JSON.stringify(h.store[fixture.collection]), before);
		assert.equal(h.removedImages.length, 0);
		assert.equal(h.temporaryImages, 0);
		assert.equal(h.notifications.length, notificationCount);
	});

	test(fixture.label + ": missing source and invalid IDs leave existing records intact", async () => {
		const h = createHarness(), id = fixture.prefix + "-target";
		await h.service[fixture.add]({ ...fixture.data, id });
		const before = JSON.stringify(h.store[fixture.collection]);
		await assert.rejects(h.service[fixture.update]({ ...fixture.data, originalId: "missing", id }));
		await assert.rejects(h.service[fixture.update]({ ...fixture.data, originalId: id, id: "" }));
		assert.equal(JSON.stringify(h.store[fixture.collection]), before);
	});
}

test("event renaming updates every bound map item and refreshes its renderer", async () => {
	const h = createHarness(), data = fixtures[1].data;
	await h.service.addMapEvent({ ...data, id: "event-old" });
	h.store.mapItems.push(
		{ id: "item-one", mapEventId: "event-old" },
		{ id: "item-two", mapEventId: "event-old" },
		{ id: "item-other", mapEventId: "event-other" },
	);
	await h.service.updateMapEvent({ ...data, originalId: "event-old", id: "event-new" });
	assert.equal(h.store.mapItems[0].mapEventId, "event-new");
	assert.equal(h.store.mapItems[1].mapEventId, "event-new");
	assert.equal(h.store.mapItems[2].mapEventId, "event-other");
	const refreshed = h.notifications.filter(([name]) => name === "map-event-link").map(([, id]) => id);
	assert.deepEqual(refreshed, ["item-one", "item-two"]);
});

test("chance card form submits the original ID when editing and preserves generated IDs when creating", async () => {
	const h = createHarness(), fixture = fixtures[0];
	const original = await h.service.addChanceCard({ ...fixture.data, id: "card-old" });
	const relative = "src/views/map-editor/components/manager/forms/chance-card-form/index.vue";
	const edit = await h.component(relative, { chanceCard: original });
	edit.state.chanceCardForm.id = "card-form";
	await edit.state.handleAddChanceCard();
	assert.equal(h.store.chanceCards[0].id, "card-form");
	assert.equal(edit.emitted[0][0], "close");
	const create = await h.component(relative, { chanceCard: undefined });
	const id = create.state.chanceCardForm.id;
	Object.assign(create.state.chanceCardForm, fixture.data);
	await create.state.handleAddChanceCard();
	assert.equal(h.store.chanceCards[1].id, id);
});

test("event form supports suffix changes and clearing while retaining map bindings", async () => {
	const h = createHarness(), fixture = fixtures[1];
	const original = await h.service.addMapEvent({ ...fixture.data, id: "event-old" });
	h.store.mapItems.push({ id: "item", mapEventId: "event-old" });
	const relative = "src/views/map-editor/components/manager/forms/map-event-form/index.vue";
	const edit = await h.component(relative, { mapEvent: original });
	edit.state.mapEventIdSuffix.value = "form";
	await edit.state.handleAddMapEvent();
	assert.equal(h.store.mapEvents[0].id, "event-form");
	assert.equal(h.store.mapItems[0].mapEventId, "event-form");
	const reopen = await h.component(relative, { mapEvent: h.store.mapEvents[0] });
	reopen.state.mapEventIdSuffix.value = "";
	const id = reopen.state.mapEventForm.id;
	assert.match(id, /^event-[a-z0-9]{6}$/);
	await reopen.state.handleAddMapEvent();
	assert.equal(h.store.mapEvents[0].id, id);
	assert.equal(h.store.mapItems[0].mapEventId, id);
});

test("modifier form and manager rename the existing template instead of creating a copy", async () => {
	const h = createHarness();
	const template = {
		id: "mod-old", name: "Modifier", slug: "fixture",
		descriptor: { timing: "before", commandType: "player.walk", remainingTriggers: -1, priority: 0, autoConsume: true },
		effectCode: "",
	};
	h.store.saveModifierTemplate(template);
	const manager = await h.component("src/views/map-editor/components/manager/modifier-template-manager/modifier-template-manager.vue", { modelValue: true });
	manager.state.handleEdit(template);
	const editor = await h.component(
		"src/views/map-editor/components/manager/modifier-template-manager/form/modifier-template-editor.vue",
		{ data: manager.state.currentTemplate.value },
		(event, value) => { if (event === "save") manager.state.handleSave(value); },
	);
	editor.state.handleIdInput({ target: { value: "new" } });
	await editor.state.handleSave();
	assert.equal(h.store.modifierTemplates.length, 1);
	assert.equal(h.store.modifierTemplates[0].id, "mod-new");
	assert.equal(manager.state.editorVisible.value, false);

	h.store.saveModifierTemplate({ ...template, id: "mod-other", slug: "other" });
	manager.state.handleEdit(h.store.modifierTemplates[0]);
	const before = JSON.stringify(h.store.modifierTemplates);
	manager.state.handleSave({ ...template, id: "mod-other" });
	assert.equal(JSON.stringify(h.store.modifierTemplates), before);
	assert.equal(manager.state.editorVisible.value, true);
	assert.equal(h.messages.at(-1)[0], "error");

	manager.state.handleCreate();
	manager.state.handleSave({ ...template, id: "mod-other" });
	assert.equal(JSON.stringify(h.store.modifierTemplates), before);
	assert.equal(manager.state.editorVisible.value, true);
});

test("renamed content saves under new filenames, removes old files and reloads without duplicates", async () => {
	const h = createHarness(), files = new Map(), dirs = new Set();
	const api = {
		exists: async name => files.has(name) || dirs.has(name),
		mkdir: async name => { dirs.add(name); },
		saveFile: async (name, text) => { files.set(name, Buffer.from(text, "utf8")); },
		readFile: async name => { assert.ok(files.has(name), name); return files.get(name); },
		rename: async (from, to) => { files.set(to, files.get(from)); files.delete(from); },
		unlink: async name => { files.delete(name); },
		readDir: async dir => [...new Set([...files.keys(), ...dirs])]
			.filter(name => name.startsWith(dir + "/") && !name.slice(dir.length + 1).includes("/"))
			.map(name => ({ name: name.slice(dir.length + 1), isFile: files.has(name) })),
	};
	const serializer = evaluate(read("src/services/map-serializer.ts"), "map-serializer.ts", name => {
		if (name === "./fs-api") return { getFsApi: () => api };
		if (name === "@mine-monopoly/utils") return { normalizeGameMap: data => data };
		if (name === "../utils/file/index") return { ensureMapInfoDefaults: info => info };
		if (name.includes("init-phase")) return { getInitPhase: () => ({ postRestore: [{ id: "restore" }] }) };
		return {};
	});
	const snapshot = () => ({
		id: "map", info: {}, mapItems: h.store.mapItems, mapPaths: [], mapIndex: [], buildingModelIdList: [],
		mapItemTypes: [], mapEvents: h.store.mapEvents, chanceCards: h.store.chanceCards,
		roles: [], phases: {}, gameSettingForm: [], modifierTemplates: h.store.modifierTemplates,
		uiTemplates: [], customUIs: [], extraLibs: "",
	});
	for (const fixture of fixtures) await h.service[fixture.add]({ ...fixture.data, id: fixture.prefix + "-old" });
	h.store.mapItems.push({ id: "item", mapEventId: "event-old" });
	h.store.saveModifierTemplate({ id: "mod-old", name: "Modifier", slug: "fixture", descriptor: {}, effectCode: "modifier code" });
	await serializer.serializeToDir(snapshot(), "/fixture");
	for (const fixture of fixtures) {
		await h.service[fixture.update]({ ...fixture.data, originalId: fixture.prefix + "-old", id: fixture.prefix + "-new" });
	}
	h.store.saveModifierTemplate({ ...h.store.modifierTemplates[0], id: "mod-new" }, "mod-old");
	await serializer.serializeToDir(snapshot(), "/fixture");
	for (const [folder, prefix, codeSuffix] of [["cards", "card", ".effect.ts"], ["events", "event", ".code.ts"], ["modifiers", "mod", ".code.ts"]]) {
		assert.ok(files.has("/fixture/" + folder + "/" + prefix + "-new.json"));
		assert.ok(files.has("/fixture/" + folder + "/" + prefix + "-new" + codeSuffix));
		assert.ok(!files.has("/fixture/" + folder + "/" + prefix + "-old.json"));
		assert.ok(!files.has("/fixture/" + folder + "/" + prefix + "-old" + codeSuffix));
	}
	const { mapData } = await serializer.deserializeFromDir("/fixture");
	for (const fixture of fixtures) {
		assert.equal(mapData[fixture.collection].length, 1);
		assert.equal(mapData[fixture.collection][0].id, fixture.prefix + "-new");
		assert.equal(mapData[fixture.collection][0].effectCode, fixture.data.effectCode);
		assert.equal(mapData[fixture.collection][0].iconId, "icon-a");
	}
	assert.equal(mapData.modifierTemplates.length, 1);
	assert.equal(mapData.modifierTemplates[0].id, "mod-new");
	assert.equal(mapData.mapItems[0].mapEventId, "event-new");
});

test("MCP schemas retain optional custom and original IDs", () => {
	for (const [file, exportName, addName, updateName, fixture] of [
		["chance-cards", "chanceCardTools", "add_chance_card", "update_chance_card", fixtures[0]],
		["map-events", "mapEventTools", "add_map_event", "update_map_event", fixtures[1]],
	]) {
		const tools = evaluate(read("src/mcp/tools/" + file + ".ts"), file + ".ts", name => name === "zod" ? zod : {})[exportName];
		assert.equal(tools.find(tool => tool.name === addName).inputSchema.parse({ ...fixture.data, id: "custom" }).id, "custom");
		const update = tools.find(tool => tool.name === updateName).inputSchema.parse({ ...fixture.data, id: "new", originalId: "old" });
		assert.equal(update.originalId, "old");
	}
});
