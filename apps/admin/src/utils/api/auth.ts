import { _axios } from "@/utils/axios";
import { getEncryption } from "@/utils/auth";
import { message } from "ant-design-vue";
import type { ApiResponse } from "@mine-monopoly/types";

export const apiLogin = async (useraccount: string, password: string) => {
	const encryptedPassword = await getEncryption(password);
	if (encryptedPassword) {
		const res = await _axios.post<ApiResponse<string>>("/user/login", {
			useraccount,
			password: encryptedPassword,
		});
		return res.data.data;
	} else {
		message.error("密码加密异常");
	}
};
