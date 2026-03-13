import { _axios } from "@/utils/axios";
import type { ApiResponse } from "@mine-monopoly/types";

export const updateUser = async (id: string, username: string, password: string, avatar: string, color: string) => {
	const res = await _axios.post<ApiResponse<string>>("/user/update", { id, username, password, avatar, color });
	return res.data;
};

export const createUser = async (username: string, password: string, avatar: string, color: string) => {
	const res = await _axios.post<ApiResponse<string>>("/user/create", { username, password, avatar, color });
	return res.data;
};

export const deleteUser = async (id: string) => {
	const res = await _axios.delete<ApiResponse<string>>("/user/delete", { params: { id } });
	return res.data;
};

export const getUserList = async (page: number, size: number) => {
	const res = await _axios.get<ApiResponse<{ total: number; userList: any[]; current: number }>>(
		"/user/list",
		{ params: { page, size } }
	);
	return res.data;
};

export const getLoginCode = async () => {
	const res = await _axios.get<ApiResponse<{ img: { type: string; data: number[] }; uuid: string }>>("/user/get-login-code");
	return res.data;
};

export const getLoginCodeState = async (uuid: string) => {
	const res = await _axios.get<ApiResponse<{ codeState: number; token?: string }>>(`/user/get-code-state?uuid=${uuid}`);
	return res.data;
};

export const isAdmin = async () => {
	const res = await _axios.get<ApiResponse<{ isAdmin: boolean }>>("/user/is-admin");
	return res.data;
};

export const checkAdminIdentity = () =>
	new Promise<boolean>(async (resolve, reject) => {
		try {
			const _isAdmin = (await isAdmin()).isAdmin;
			if (_isAdmin) {
				resolve(true);
			} else {
				reject(false);
			}
		} catch (e) {
			reject(false);
		}
	});
