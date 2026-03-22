import { GameMap, GameMapInDb, Role } from "@mine-monopoly/types";
import { loadFromProto, ProtoFileType } from "@mine-monopoly/utils";
import { useLoading } from "@src/store";
import { getGameMapById } from "../api/map";
import { useMapData, useResourceStore } from "@src/store/game";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { getDracoLoader } from "../draco/draco";
import { isMobile, isPC } from "../platform";

export async function getGameMap(gameMapInfo: GameMapInDb) {
	if (isPC() || isMobile()) {
		let mapCache = await window.mapCacheLoader.load(gameMapInfo.id, gameMapInfo.hash);
		if (!mapCache) {
			const response = await fetch(`${import.meta.env.VITE_PROTOCOL}://${gameMapInfo.mapUrl}`);
			const arrayBuffer = await response.arrayBuffer();
			await window.mapCacheLoader.save(gameMapInfo.id, gameMapInfo.hash, arrayBuffer);
			mapCache = arrayBuffer;
		}
		const mapData = await loadFromProto(new Uint8Array(mapCache));
		return mapData;
	} else {
		const response = await fetch(`${import.meta.env.VITE_PROTOCOL}://${gameMapInfo.mapUrl}`);
		const arrayBuffer = await response.arrayBuffer();
		const mapData = await loadFromProto(new Uint8Array(arrayBuffer));
		return mapData;
	}
}

export async function loadGameMapFromServer(mapId: string) {
	useLoading().showLoading("正在向服务器获取地图信息...");
	const mapInfo = await getGameMapById(mapId);
	if (mapInfo) {
		useLoading().showLoading("正在读取地图...");
		const mapData = await getGameMap(mapInfo);
		const gameMap = JSON.parse(mapData.jsonData) as GameMap;
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
	const mapData = await loadFromProto(new Uint8Array(file));
	console.log("🚀 ~ loadGameMapFromFile ~ mapData:", mapData);
	const gameMap = JSON.parse(mapData.jsonData) as GameMap;
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
	return (await loader.loadAsync(modelInfo.url)).scene;
}
