import { GameMap } from "@mine-monopoly/types";
import { dataToProtoBuffer, loadFromProto, ProtoFileType } from "@mine-monopoly/utils/protos";
import { useEditorStore, useMapDataStore, useResourceStore } from "@src/stores";
import { eventBus } from "@src/utils/event-bus";
import { getInitPhase } from "@src/views/map-editor/components/manager/process-manager/utils/init-phase";
import { message } from "ant-design-vue";

export function getFileName(path: string): string {
	return path.split(/[/\\]/).pop() || "";
}

export function getFileNameWithoutExt(path: string): string {
	const fileName = getFileName(path);
	const lastDotIndex = fileName.lastIndexOf(".");
	if (lastDotIndex === -1 || lastDotIndex === 0) {
		return fileName;
	}
	return fileName.substring(0, lastDotIndex);
}

export async function parseGameMapFromProtoFile(filePath: string) {
	const buffer = await window.electronAPI.readFile(filePath);
	const res = await loadFromProto(new Uint8Array(buffer));
	return {
		id: res.id,
		mapData: JSON.parse(res.jsonData) as GameMap,
		models: res.modelFiles,
		images: res.imageFiles,
	};
}

export async function saveGameMapToBinFile(mapId: string, filePath: string, mapData: GameMap): Promise<void> {
	const fetchBuffer = async (url: string): Promise<Uint8Array> => {
		const response = await fetch(url);
		if (!response.ok) throw new Error(`资源加载失败: ${url}`);
		const arrayBuffer = await response.arrayBuffer();
		return new Uint8Array(arrayBuffer);
	};

	const resourceStore = useResourceStore();
	const modelsList: ProtoFileType[] = [];
	//加载模型:
	for (const model of resourceStore.models) {
		const tempModel: ProtoFileType = {
			id: model.id,
			name: model.name,
			filetype: model.fileType,
			buffer: await fetchBuffer(model.url),
		};
		modelsList.push(tempModel);
	}

	const imagesList: ProtoFileType[] = [];
	//加载图片:
	for (const image of resourceStore.images) {
		const tempImage: ProtoFileType = {
			id: image.id,
			name: image.name,
			filetype: image.fileType,
			buffer: await fetchBuffer(image.url),
		};
		imagesList.push(tempImage);
	}
	const dataStr = JSON.stringify(mapData);
	const buffer = dataToProtoBuffer(mapId, dataStr, modelsList, imagesList);
	await window.electronAPI.saveFile(filePath, buffer);
	useEditorStore().setCurrentFilePath(filePath);
}

export async function loadMapDataFromPath(path: string) {
	useEditorStore().setLoading(true);
	const editorStore = useEditorStore();
	const mapDataStore = useMapDataStore();
	const resourceStore = useResourceStore();
	const data = await parseGameMapFromProtoFile(path);
	if (data) {
		mapDataStore.$patch(data.mapData);
		editorStore.setCurrentFilePath(path);

		await window.electronAPI.clearTempDir();

		const modelsList: typeof resourceStore.models = [];
		for (const model of data.models) {
			const absolutePath = await readBufferToFile(model.buffer, `temp/${model.id}.${model.filetype}`);
			const filePath = convertToFpUrl(absolutePath);
			const tempModel = {
				id: model.id,
				name: model.name,
				fileType: model.filetype,
				url: filePath,
			};
			modelsList.push(tempModel);
		}
		resourceStore.$patch({ models: modelsList });

		const imagesList: typeof resourceStore.images = [];
		for (const image of data.images) {
			const absolutePath = await readBufferToFile(image.buffer, `temp/${image.id}.${image.filetype}`);
			const filePath = convertToFpUrl(absolutePath);
			const tempImage = {
				id: image.id,
				name: image.name,
				fileType: image.filetype,
				url: filePath,
			};
			imagesList.push(tempImage);
		}
		resourceStore.$patch({ images: imagesList });

		eventBus.emit("map-loaded", data.mapData);
		message.success("加载成功", 1);
	}
	useEditorStore().setLoading(false);
}

export function createDefaultMapData(): GameMap {
	return {
		id: crypto.randomUUID(),
		info: {
			name: "",
			author: "",
			version: "0.0.0",
			editorVersion: __APP_VERSION__,
			description: "",
			backgroundImageId: "",
			coverImageId: "",
		},
		mapItems: [],
		chanceCards: [],
		mapItemTypes: [],
		mapIndex: [],
		roles: [],
		inUse: false,
		mapEvents: [],
		phases: getInitPhase(),
		buildingModelIdList: ["", "", ""],
		uiTemplates: [],
		customUIs: [],
		gameSettingForm: [
			{ id: "initMoney", key: "initMoney", type: "number-input", label: "初始金钱", defaultValue: 10000 },
		],
		extraLibs: "",
	} as GameMap;
}

export async function handleNewProtoFile() {
	const editorStore = useEditorStore();
	const mapDataStore = useMapDataStore();
	const resourceStore = useResourceStore();

	try {
		useEditorStore().setLoading(true);

		await window.electronAPI.clearTempDir();
		editorStore.setCurrentFilePath("");
		resourceStore.$patch({
			models: [],
			images: [],
		});
		const defaultMap = createDefaultMapData();
		mapDataStore.$patch(defaultMap);
		eventBus.emit("map-loaded", defaultMap);

		message.success("新建地图成功", 1);
	} catch (error) {
		console.error("新建地图失败:", error);
		message.error("新建地图失败");
	} finally {
		useEditorStore().setLoading(false);
	}
}

export async function handleOpenProtoFile() {
	const res = await window.electronAPI.showOpenDialog({
		title: "打开地图文件",
		properties: [],
		filters: [{ name: "地图文件", extensions: ["fpmap"] }],
	});
	const path = res.filePaths[0];
	if (path) loadMapDataFromPath(path);
}

export async function handleSaveProtoFile() {
	const editorStore = useEditorStore();
	const mapDataStore = useMapDataStore();
	mapDataStore.info.editorVersion = __APP_VERSION__;

	const path = editorStore.currentFilePath;
	if (!path) {
		handleSaveAsOtherProtoFile();
		return;
	} else {
		useEditorStore().setLoading(true);
		await saveGameMapToBinFile(mapDataStore.id, path, mapDataStore.$state);
		useEditorStore().setLoading(false);
		message.success("保存地图文件成功", 1);
	}
}

export async function handleSaveAsOtherProtoFile() {
	const mapDataStore = useMapDataStore();

	const res = await window.electronAPI.showSaveDialog({
		title: "另存为",
		filters: [{ name: "地图文件", extensions: ["fpmap"] }],
	});
	useEditorStore().setLoading(true);
	const path = res.filePath;
	console.log("🚀 ~ handleSaveAsOtherProtoFile ~ path:", path);
	if (path) {
		saveGameMapToBinFile(mapDataStore.id, path, mapDataStore.$state);
		message.success("保存成功", 1);
	}
	useEditorStore().setLoading(false);
}

export async function readBufferToFile(buffer: Uint8Array, filePath: string) {
	return await window.electronAPI.saveLocalFile(filePath, buffer);
}

export async function readFileToTempDir(filePath: string, type: "model" | "image", fileName?: string) {
	const id = `${type}-${crypto.randomUUID()}`;
	filePath = convertFpUrlToPath(filePath);
	const { filePath: newFilePath, fileType } = await window.electronAPI.copyFile(filePath, "", fileName || id);
	return { newFilePath, id, fileType };
}

export async function updateExistingModel(id: string, name: string, filePath: string) {
	const resourcesStore = useResourceStore();
	const oldModel = resourcesStore.findModelById(id);
	if (!oldModel) throw new Error("找不到该模型");

	let finalFileType = oldModel.fileType;

	if (filePath && filePath !== oldModel.url) {
		try {
			const buffer = await window.electronAPI.readFile(convertFpUrlToPath(filePath));
			await window.electronAPI.saveLocalFile(convertFpUrlToPath(oldModel.url), new Uint8Array(buffer));
			const newExt = filePath.split(".").pop();
			if (newExt) {
				finalFileType = newExt;
			}
		} catch (e: any) {
			message.error(`覆盖文件失败: ${e.message}`);
			return;
		}
	}

	resourcesStore.updateModel({
		id: id,
		name: name,
		fileType: finalFileType,
		url: oldModel.url,
	});
	eventBus.emit("change-model", id);
	message.success(`更新模型 "${name}" 成功`, 1);
}

export async function addNewModel(filePath: string, name: string) {
	try {
		const { newFilePath, id, fileType } = await readFileToTempDir(filePath, "model");
		const resourcesStore = useResourceStore();
		resourcesStore.addModel({
			id,
			name: name,
			fileType,
			url: convertToFpUrl(newFilePath),
		});
	} catch (e: any) {
		message.error(e.message, 1);
	}
}

export async function addNewImage(filePath: string, name: string) {
	const { newFilePath, id, fileType } = await readFileToTempDir(filePath, "image");
	const resourcesStore = useResourceStore();
	resourcesStore.addImage({
		id,
		name: name,
		fileType,
		url: convertToFpUrl(newFilePath),
	});
	return id;
}

/**
 * 将本地绝对路径转换为自定义协议 URL
 * @param localPath Electron 返回的绝对路径 (e.g. "C:\Games\map.png")
 */
export function convertToFpUrl(localPath: string): string {
	const normalizedPath = localPath.replace(/\\/g, "/");
	return `fp-file://${normalizedPath}`;
}

/**
 * 将自定义协议 URL转换为本地绝对路径
 * @param localPath 自定义协议 URL (e.g. "fp-file://C:/Games/map.png")
 */
export function convertFpUrlToPath(urlOrPath: string): string {
	if (!urlOrPath) return "";
	if (!urlOrPath.startsWith("fp-file:")) {
		return urlOrPath;
	}
	let rawPath = urlOrPath.replace(/^fp-file:\/{2,3}/, "");
	if (navigator.userAgent.includes("Windows")) {
		if (rawPath.startsWith("/") && /^[a-zA-Z]:/.test(rawPath.slice(1))) {
			rawPath = rawPath.slice(1);
		}
	}
	return decodeURIComponent(rawPath);
}
