import { RoomMapItem } from "@/interfaces/interfaces";
import { _axios } from "@/utils/axios";
import type { ApiResponse } from "@mine-monopoly/types";

export const getRoomList = async () => {
	const res = await _axios.get<ApiResponse<RoomMapItem[]>>("/room-router/room-list");
	return res.data;
};
