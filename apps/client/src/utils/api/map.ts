import { GameMapInDb } from "@mine-monopoly/types";
import axios from "axios";

export const getGameMapList = async (page: number, size: number) => {
	const { total, gameMapList, current } = (await axios.get("/game-map/list", { params: { page, size } })).data as any;
	return { total, gameMapList, current };
};

export const getGameMapById = async (mapId: string) => {
	const data = (await axios.get("/game-map/info", { params: { id: mapId } })).data as any;
	return data as GameMapInDb;
};
