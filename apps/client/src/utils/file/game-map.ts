import { GameMap, GameMapInDb, Role } from "@mine-monopoly/types";
import { loadFromProto, ProtoFileType, decodeProductMap, gzipDecompress, normalizeGameMap } from "@mine-monopoly/utils";
import { isProductFile, decrypt } from "@mine-monopoly/utils/crypto";
import { env } from "@mine-monopoly/env";
import { useLoading } from "@src/store";
import { getGameMapById } from "../api/map";
import { useMapData, useResourceStore } from "@src/store/game";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { getDracoLoader } from "../draco/draco";


async function loadFromProductFile(data: Uint8Array, key: string): Promise<{
	id: string;
	jsonData: string;
	modelFiles: ProtoFileType[];
	imageFiles: ProtoFileType[];
}> {
	// Decrypt the data
	const decrypted = await decrypt(data, key);

	// 尝试解压，如果失败则直接解析（向后兼容）
	let productData: Uint8Array;
	try {
		productData = await gzipDecompress(decrypted);
	} catch {
		// 解压失败，说明是旧格式，直接使用解密后的数据
		console.warn("解压失败，使用未压缩格式");
		productData = decrypted;
	}

	// Parse the product protobuf
	const productMap = decodeProductMap(productData);

	// Convert ProductResourceItem[] to ProtoFileType[]
	const modelFiles: ProtoFileType[] = [];
	const imageFiles: ProtoFileType[] = [];

	for (const resource of productMap.resources) {
		const protoFile: ProtoFileType = {
			id: resource.rid,
			name: resource.label,
			filetype: resource.ext,
			buffer: new Uint8Array(resource.blob),
		};

		// Model files are .glb or .gltf
		if (resource.ext === "glb" || resource.ext === "gltf") {
			modelFiles.push(protoFile);
		} else {
			imageFiles.push(protoFile);
		}
	}

	return {
		id: productMap.mapId,
		jsonData: productMap.payload,
		modelFiles,
		imageFiles,
	};
}

export async function getGameMap(gameMapInfo: GameMapInDb) {
	const encryptKey = env("MAP_ENCRYPT_KEY", "");

	const response = await fetch(gameMapInfo.mapUrl);
	const arrayBuffer = await response.arrayBuffer();
	const bytes = new Uint8Array(arrayBuffer);
	// Detect format: .mmmap (encrypted product file) or .fpmap (legacy)
	if (isProductFile(bytes)) {
		return await loadFromProductFile(bytes, encryptKey);
	} else {
		return await loadFromProto(bytes);
	}
}

export async function loadGameMapFromServer(mapId: string) {
	useLoading().showLoading("正在向服务器获取地图信息...");
	const mapInfo = await getGameMapById(mapId);
	if (mapInfo) {
		useLoading().showLoading("正在读取地图...");
		const mapData = await getGameMap(mapInfo);
		const gameMap = normalizeGameMap(JSON.parse(mapData.jsonData) as GameMap);
		useMapData().$patch(gameMap);
		await loadMapDataToResourceStore(mapData);
		useLoading().hideLoading();
		return { gameMap, mapInfo };
	} else {
		useLoading().hideLoading();
		throw Error("向服务器获取地图信息失败");
	}
}

export async function loadGameMapFromFile(file: ArrayBuffer) {
	useLoading().showLoading("正在读取地图...");
	const bytes = new Uint8Array(file);
	const encryptKey = env("MAP_ENCRYPT_KEY", "");

	// Detect format: .mmmap (encrypted product file) or .fpmap (legacy)
	let mapData;
	if (isProductFile(bytes)) {
		mapData = await loadFromProductFile(bytes, encryptKey);
	} else {
		mapData = await loadFromProto(bytes);
	}

	console.log("🚀 ~ loadGameMapFromFile ~ mapData:", mapData);
	const gameMap = normalizeGameMap(JSON.parse(mapData.jsonData) as GameMap);
	useMapData().$patch(gameMap);
	await loadMapDataToResourceStore(mapData);
	const coverResource = useResourceStore().getRecourceById(gameMap.info.coverImageId);
	if (!coverResource) throw Error("读取封面失败");
	const mapInfo: GameMapInDb = {
		id: gameMap.id,
		name: gameMap.info.name,
		author: gameMap.info.author,
		version: gameMap.info.version,
		description: gameMap.info.description,
		hash: "",
		coverUrl: coverResource.url,
		mapUrl: "",
		inuse: true,
	};
	useLoading().hideLoading();
	return { gameMap, mapInfo };
}

async function loadMapDataToResourceStore(mapData: {
	id: string;
	jsonData: string;
	modelFiles: ProtoFileType[];
	imageFiles: ProtoFileType[];
}) {
	const resourceStore = useResourceStore();
	resourceStore.clear();
	for (const imageResource of mapData.imageFiles) {
		const blob = new Blob([imageResource.buffer as BlobPart], { type: `image/${imageResource.filetype}` });
		const imageUrl = URL.createObjectURL(blob);
		//添加图片到资源仓库
		resourceStore.add({
			id: imageResource.id,
			name: imageResource.name,
			fileType: imageResource.filetype,
			url: imageUrl,
			type: "image",
		});
	}
	for (const modelResource of mapData.modelFiles) {
		const blob = new Blob([modelResource.buffer as BlobPart], { type: `application/octet-stream` });
		const modelUrl = URL.createObjectURL(blob);
		//添加模型到资源仓库
		resourceStore.add({
			id: modelResource.id,
			name: modelResource.name,
			fileType: modelResource.filetype,
			url: modelUrl,
			type: "model",
		});
	}
}

export async function getModelById(modelId: string) {
	const loader = new GLTFLoader();
	const modelInfo = useResourceStore().getRecourceById(modelId);
	if (!modelInfo) throw Error(`找不到id为 ${modelId} 的模型资源`);
	loader.setDRACOLoader(getDracoLoader());
	return await loader.loadAsync(modelInfo.url);
}
