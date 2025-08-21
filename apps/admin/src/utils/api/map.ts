import { _axios } from "@/utils/axios";
import { ChanceCard, ItemType, MapData, MapItem, Property } from "@/interfaces/interfaces";

export const createMap = async (name: string) => {
	const res = await _axios.post("/map/create", {
		name,
	});
	return res;
};

export const getMapInfoById = async (id: string) => {
	const res = (await _axios.get("/map/info", { params: { id, console: true } })) as MapData;
	return res;
};

export const updateMapName = async (mapId: string, name: string) => {
	return await _axios.post("/map/update-name", { id: mapId, name });
};

export const updateMapInUse = async (id: string, inUse: boolean) => {
	return await _axios.post("/map/update-inuse", { id, inUse });
};

export const updateIndexList = async (id: string, indexList: string[]) => {
	return await _axios.post("/map/update-index-list", { id, indexList });
};

export const updateHouseModelList = async (mapId: string, houseModels: { lv0: string; lv1: string; lv2: string }) => {
	return await _axios.post("/map/update-house-model-list", { id: mapId, houseModels });
};

export const getItemTypesListByMapId = async (id: string) => {
	const res = (await _axios.get("/map/item-type", { params: { id } })) as ItemType[];
	return res;
};

export const getMapItemsListByMapId = async (id: string) => {
	const res = (await _axios.get("/map/map-item", { params: { id } })) as MapItem[];
	return res;
};

export const getMapIndexsByMapId = async (id: string) => {
	const res = (await _axios.get("/map/map-indexs", { params: { id } })) as string[];
	return res;
};

export const getStreetListByMapId = async (id: string) => {
	const res = (await _axios.get("/map/street", { params: { id } })) as Street[];
	return res;
};

export const getPropertyListByMapId = async (id: string) => {
	const res = (await _axios.get("/map/property", { params: { id } })) as Property[];
	return res;
};

export const getChanceCardsListByMapId = async (id: string) => {
	const res = (await _axios.get("/map/chance-card", { params: { id } })) as ChanceCard[];
	return res;
};

export const getMapsList = async (page: number, size: number) => {
	const { total, mapsList, current } = (await _axios.get("/map/list", { params: { page, size } })) as any;
	return { total, mapsList, current };
};

export const deleteMap = async (id: string) => {
	return await _axios.delete("/map/delete", { params: { id } });
};
