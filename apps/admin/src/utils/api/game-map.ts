import { _axios } from "@/utils/axios";
import type { ApiResponse } from "@mine-monopoly/types";

export const createGameMap = async (formData: FormData) => {
	const res = await _axios.post<ApiResponse<string>>("/game-map/create", formData);
	return res.data;
};

export const updateGameMap = async (formData: FormData) => {
	const res = await _axios.post<ApiResponse<string>>("/game-map/update", formData);
	return res.data;
};

export const setGameMapUse = async (id: string, use: boolean) => {
	const res = await _axios.post<ApiResponse<string>>("/game-map/set-use", { id, use });
	return res.data;
};

export const getGameMapList = async (page: number, size: number) => {
	const res = await _axios.get<ApiResponse<{ total: number; gameMapList: any[]; current: number }>>(
		"/game-map/list",
		{ params: { page, size } }
	);
	return res.data;
};

export const deleteGameMap = async (id: string) => {
	const res = await _axios.delete<ApiResponse<string>>("/game-map/delete", { params: { id } });
	return res.data;
};

export const getGameMapInfo = async (id: string) => {
	const res = await _axios.get<ApiResponse<any>>("/game-map/info", { params: { id } });
	return res.data;
};
