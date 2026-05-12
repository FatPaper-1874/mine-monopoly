import apiClient from "./index";
import type { ApiResponse } from "@mine-monopoly/types";
import { GameMapInDb } from "@mine-monopoly/types";

export async function getGameMapList(page: number, size: number) {
	const response = await apiClient.get<
		ApiResponse<{ total: number; gameMapList: GameMapInDb[]; current: number }>
	>("/game-map/list", { params: { page, size } });

	const { total, gameMapList, current } = (response as any).data;
	return { total, gameMapList, current };
}

export async function getGameMapById(mapId: string): Promise<GameMapInDb> {
	const response = await apiClient.get<ApiResponse<GameMapInDb>>("/game-map/info", {
		params: { id: mapId },
	});
	return (response as any).data;
}
