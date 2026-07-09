import { _axios } from "@/utils/axios";
import type { ApiResponse } from "@mine-monopoly/types";
import type { AdminUserListItem } from "@/interfaces/interfaces";

export const getUserList = async (
	page: number,
	size: number,
	options?: {
		search?: string;
		online?: boolean;
		isAdmin?: boolean;
		sortBy?: "createTime" | "lastActiveTime" | "username" | "useraccount";
		sortOrder?: "ASC" | "DESC";
	}
) => {
	const res = await _axios.get<ApiResponse<{ total: number; userList: AdminUserListItem[]; current: number }>>(
		"/user/list",
		{
			params: {
				page,
				size,
				search: options?.search,
				online: options?.online,
				isAdmin: options?.isAdmin,
				sortBy: options?.sortBy,
				sortOrder: options?.sortOrder,
			},
		}
	);
	return res.data.data;
};

export const createUser = async (params: {
	useraccount: string;
	username: string;
	password: string;
	color: string;
	isAdmin: boolean;
}) => {
	const res = await _axios.post<ApiResponse<string>>("/user/create", params);
	return res.data.data;
};

export const updateUser = async (params: {
	id: string;
	username: string;
	password: string;
	color: string;
	isAdmin: boolean;
}) => {
	const res = await _axios.post<ApiResponse<string>>("/user/update", params);
	return res.data.data;
};

export const deleteUser = async (id: string) => {
	const res = await _axios.delete<ApiResponse<string>>("/user/delete", { params: { id } });
	return res.data.data;
};

export const getLoginCode = async () => {
	const res = await _axios.get<ApiResponse<{ img: { type: string; data: number[] }; uuid: string }>>("/user/get-login-code");
	return res.data.data;
};

export const getLoginCodeState = async (uuid: string) => {
	const res = await _axios.get<ApiResponse<{ codeState: number; token?: string }>>(`/user/get-code-state?uuid=${uuid}`);
	return res.data.data;
};

export const isAdmin = async () => {
	const res = await _axios.get<ApiResponse<{ isAdmin: boolean }>>("/user/is-admin");
	return res.data.data;
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
