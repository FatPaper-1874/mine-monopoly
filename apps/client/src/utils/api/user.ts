import apiClient from "./index";
import type { ApiResponse } from "@mine-monopoly/types";

interface UserInfo {
	username: string;
	useraccount: string;
	id: string;
	avatar: string;
	color: string;
}

export async function getUserByToken(token: string): Promise<UserInfo> {
	const response = await apiClient.get<ApiResponse<UserInfo>>("/user/info", {
		data: { token },
	});
	return (response as any).data;
}
