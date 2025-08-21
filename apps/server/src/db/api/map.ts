import { getItemTypesFromMapItems, getPropertiesFromMapItems } from "../../utils";
import AppDataSource from "../dbConnecter";
import { Map as GameMap } from "../entities/map";
import { unlinkSync } from "fs";
import path from "path";
import { deleteFiles } from "../../utils/file-uploader";
import { Model } from "../entities/model";
import { In } from "typeorm";

const mapRepository = AppDataSource.getRepository(GameMap);
const modelRepository = AppDataSource.getRepository(Model);

export const createMap = async (name: string) => {
	const map = new GameMap();
	map.name = name;
	map.indexList = [];
	return await mapRepository.save(map);
};

export const deleteMap = async (id: string) => {
	const map = await mapRepository.findOne({
		where: { id },
	});
	if (map) {
		await mapRepository.remove(map);
		return;
	} else {
		throw new Error("无效的id");
	}
};

export const updateMapName = async (mapId: string, name: string) => {
	await mapRepository.createQueryBuilder().update(GameMap).set({ name }).where("id = :id", { id: mapId }).execute();
};

export const updateMapUseState = async (mapId: string, inUse: boolean) => {
	await mapRepository.createQueryBuilder().update(GameMap).set({ inUse }).where("id = :id", { id: mapId }).execute();
	if (inUse) {
		const map = await loadGameMapInfo(mapId);
		if (map) mapInfoCache.set(mapId, map);
	}
};

export const setBackground = async (mapId: string, backgroundUrl: string) => {
	const { background: oldBg } = (await mapRepository.findOne({ where: { id: mapId }, select: ["background"] })) || {
		background: "",
	};
	if (oldBg) {
		const filePathArr = oldBg.split("/");
		const fileName = filePathArr[filePathArr.length - 1 >= 0 ? filePathArr.length - 1 : 0];
		try {
			await deleteFiles([`monopoly/backgrounds/${fileName}`]);
		} catch (e: any) {
			throw new Error(`在删除原有Background时发生错误：${e.message}`);
		}
	}

	await mapRepository
		.createQueryBuilder()
		.update(GameMap)
		.set({ background: backgroundUrl })
		.where("id = :id", { id: mapId })
		.execute();
};

export const updateHouseModelList = async (mapId: string, houseModels: { lv0: string; lv1: string; lv2: string }) => {
	const houseModel_lv0 = await modelRepository.findOne({ where: { id: houseModels.lv0 } });
	const houseModel_lv1 = await modelRepository.findOne({ where: { id: houseModels.lv1 } });
	const houseModel_lv2 = await modelRepository.findOne({ where: { id: houseModels.lv2 } });
	const map = await mapRepository.findOne({ where: { id: mapId } });
	if (map && houseModel_lv0 && houseModel_lv1 && houseModel_lv2) {
		map.houseModel_lv0 = houseModel_lv0;
		map.houseModel_lv1 = houseModel_lv1;
		map.houseModel_lv2 = houseModel_lv2;
		mapRepository.save(map);
	} else {
		throw new Error("获取Map或者Model时发生错误");
	}
};

export const updateIndexList = async (id: string, indexList: string[]) => {
	mapRepository.createQueryBuilder().update(GameMap).set({ indexList }).where("id = :id", { id }).execute();
};

const mapInfoCache: Map<string, GameMap> = new Map();

export const getMapById = async (id: string, isAdmin: boolean) => {
	if (!mapInfoCache.get(id) || isAdmin) {
		const map = await loadGameMapInfo(id);
		if (!map) return null;
		if (!isAdmin) mapInfoCache.set(id, map); //如果是管理员访问则不更新缓存, 只会在管理员在管理端开启地图时才会更新缓存
		return map;
	} else {
		return mapInfoCache.get(id) || null;
	}
};

async function loadGameMapInfo(id: string) {
	const map = await mapRepository.findOne({
		where: { id },
		relations: [
			"mapItems",
			"mapItems.linkto",
			"mapItems.linkto.type",
			"mapItems.linkto.property",
			"mapItems.linkto.property.street",
			"mapItems.type",
			"mapItems.type.model",
			"mapItems.arrivedEvent",
			"mapItems.property",
			"mapItems.property.street",
			// "properties",
			// "properties.street",
			"chanceCards",
			"streets",
			"houseModel_lv0",
			"houseModel_lv1",
			"houseModel_lv2",
		],
	});
	if (map) {
		map.itemTypes = getItemTypesFromMapItems(map.mapItems) as any;
		map.properties = getPropertiesFromMapItems(map.mapItems) as any;
		return map;
	} 
}

export const getMapsList = async (page: number, size: number, isAdmin: boolean) => {
	const total = await mapRepository.count();
	let mapsList = await mapRepository.find({
		relations: ["mapItems", "mapItems.type", "mapItems.type.model", "chanceCards"],
		skip: page > 0 ? (page - 1) * size : undefined,
		take: page > 0 ? size : undefined,
	});
	mapsList.map((map) => {
		map.itemTypes = getItemTypesFromMapItems(map.mapItems) as any;
		return map;
	});
	if (!isAdmin) {
		mapsList = mapsList.filter((m) => m.inUse);
	}
	return { mapsList, total };
};

export const getMapIndexsByMapId = async (id: string) => {
	const map = await mapRepository.findOne({ where: { id }, select: ["indexList"] });
	if (map) {
		return map.indexList;
	} else {
		throw new Error("地图不存在");
	}
};
