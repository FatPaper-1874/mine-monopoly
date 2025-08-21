import { GameMap } from "@src/interfaces/game";
import axios from "axios";

export const getMapsList = async (page: number, size: number) => {
	const { total, mapsList, current } = (await axios.get("/map/list", { params: { page, size } })).data as any;
	return { total, mapsList, current };
};

export const getMapById = async (mapId: string) => {
	const data = (await axios.get("/map/info", { params: { id: mapId } })).data as any;
	return data as GameMap;
};
