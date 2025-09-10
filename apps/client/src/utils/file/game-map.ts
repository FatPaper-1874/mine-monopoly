import { PROTOCOL } from "@fatpaper-monopoly/config";
import { GameMap, GameMapInDb, Role } from "@fatpaper-monopoly/types";
import { loadFromProto } from "@fatpaper-monopoly/utils";
import { RoleInRoom } from "@src/interfaces/bace";
import { useLoading } from "@src/store";
import { getGameMapById } from "../api/map";
import { useMapData, useResourceStore } from "@src/store/game";

export async function getGameMap(gameMapInfo: GameMapInDb) {
	let mapCache = await window.mapCacheLoader.load(gameMapInfo.id, gameMapInfo.hash);
	console.log("🚀 ~ getGameMap ~ mapCache:", mapCache);
	if (!mapCache) {
		const response = await fetch(`${PROTOCOL}://${gameMapInfo.mapUrl}`);
		const arrayBuffer = await response.arrayBuffer();
		await window.mapCacheLoader.save(gameMapInfo.id, gameMapInfo.hash, arrayBuffer);
		mapCache = arrayBuffer;
	}
	const mapData = await loadFromProto(new Uint8Array(mapCache));
	return mapData;
}

export async function loadGameMap(mapId: string) {
	useLoading().showLoading("正在向服务器获取地图信息...");
	const mapInfo = await getGameMapById(mapId);
	if (mapInfo) {
		useLoading().showLoading("正在读取地图...");
		const mapData = await getGameMap(mapInfo);
		const gameMap = JSON.parse(mapData.jsonData) as GameMap;
		useMapData().$patch(gameMap);
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
			});
		}
		for (const modelResource of mapData.modelFiles) {
			const blob = new Blob([modelResource.buffer as BlobPart], { type: `image/${modelResource.filetype}` });
			const modelUrl = URL.createObjectURL(blob);
			//添加模型到资源仓库
			resourceStore.add({
				id: modelResource.id,
				name: modelResource.name,
				fileType: modelResource.filetype,
				url: modelUrl,
			});
		}
		useLoading().hideLoading();
		return { gameMap, mapInfo };
	} else {
		useLoading().hideLoading();
		throw Error("向服务器获取地图信息失败");
	}
}
