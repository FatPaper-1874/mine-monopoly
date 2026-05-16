import { _axios } from "@/utils/axios";
import type { ApiResponse } from "@mine-monopoly/types";

export interface UserStatistics {
	totalUsers: number;
	onlineUsers: number;
	adminUsers: number;
	newUsersToday: number;
	trend: { date: string; count: number }[];
}

export interface GameStatistics {
	totalGames: number;
	todayGames: number;
	avgDuration: number;
	trend: { date: string; count: number }[];
	topMaps: { mapId: string; mapName: string; count: number }[];
	topRoomIds: { roomId: string; count: number }[];
}

export const getUserStatistics = async () => {
	const res = await _axios.get<ApiResponse<UserStatistics>>("/statistics/users");
	return res.data.data;
};

export const getGameStatistics = async () => {
	const res = await _axios.get<ApiResponse<GameStatistics>>("/statistics/games");
	return res.data.data;
};
