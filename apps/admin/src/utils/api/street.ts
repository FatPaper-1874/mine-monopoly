import {_axios} from "@/utils/axios";

export const createStreet = async (name: string, increase: number, mapId: string) => {
	return await _axios.post("/street/create", { name, increase, mapId });
};
