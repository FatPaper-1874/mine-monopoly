import {_axios} from "@/utils/axios";

export const createProperty = async (
	name: string,
	sellCost: number,
	buildCost: number,
	cost_lv0: number,
	cost_lv1: number,
	cost_lv2: number,
	mapItemId: string,
	streetId: string,
	mapId: string
) => {
	return await _axios.post("/property/create", {
		name,
		sellCost,
		buildCost,
		cost_lv0,
		cost_lv1,
		cost_lv2,
		mapItemId,
		streetId,
		mapId,
	});
};

export const updateProperty = async (
	id: string,
	name: string,
	sellCost: number,
	buildCost: number,
	cost_lv0: number,
	cost_lv1: number,
	cost_lv2: number,
	streetId: string
) => {
	return await _axios.post("/property/update", {
		id,
		name,
		sellCost,
		buildCost,
		cost_lv0,
		cost_lv1,
		cost_lv2,
		streetId,
	});
};

export const getPropertyById = async (id: string) => {
	return await _axios.get("/property/info", {
		data: { id },
	});
};
