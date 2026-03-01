import axios from "axios";
import { env } from "@mine-monopoly/env";
import { FPMessage } from "@mine-monopoly/ui";
import { getEncryption } from "@src/utils/encryption";

const authAxios = axios.create({
	baseURL: `${env("PROTOCOL")}://${env("FATPAPER_DOMAIN")}:${env<number>("SERVER_PORT")}`,
});

// Request interceptor
authAxios.interceptors.request.use(
	function (config) {
		const token = localStorage.getItem("token");
		if (token) {
			config.headers!["Authorization"] = token;
		}
		return config;
	},
	function (error) {
		return Promise.reject(error);
	},
);

// Response interceptor
authAxios.interceptors.response.use(
	async function (response) {
		const msg = response.data.msg;
		if (msg) {
			const status = response.data.status;
			if (status == 200) {
				FPMessage({
					type: "success",
					message: msg,
				});
			} else if (status == 401) {
				FPMessage({
					type: "warning",
					message: msg,
				});
			} else {
				FPMessage({
					type: "error",
					message: msg,
				});
			}
		}
		return response.data;
	},
	async function (error) {
		let message = "";
		switch (error.response?.status) {
			case 400:
				message = "请求错误(400)";
				break;
			case 401:
				message = "未授权，请重新登录(401)";
				break;
			case 403:
				message = "拒绝访问(403)";
				break;
			case 404:
				message = "请求出错(404)";
				break;
			case 408:
				message = "请求超时(408)";
				break;
			case 500:
				message = "服务器错误(500)";
				break;
			case 501:
				message = "服务未实现(501)";
				break;
			case 502:
				message = "网络错误(502)";
				break;
			case 503:
				message = "服务不可用(503)";
				break;
			case 504:
				message = "网络超时(504)";
				break;
			case 505:
				message = "HTTP版本不受支持(505)";
				break;
			default:
				message = `连接出错(${error.response?.status})!`;
		}
		FPMessage({
			type: "error",
			message: `${error.response?.data?.msg || message}`,
		});
		return Promise.reject(error);
	},
);

export const getUserInfo = async () => {
	const res = await authAxios.get("/user/info");
	return res.data as { id: string; username: string; avatar: string; color: string };
};

export const getPublicKey = async () => {
	const res = await authAxios.get("/user/public-key");
	const publicKey = (res.data as string) || "";
	localStorage.setItem("public-key", publicKey);
	return publicKey;
};

export const apiLogin = async (useraccount: string, password: string) => {
	const encryptionPassword = await getEncryption(password);
	if (encryptionPassword) {
		const res = (await authAxios.post("/user/login", {
			useraccount,
			password: encryptionPassword,
		})) as any;
		return res.data;
	} else {
		FPMessage({ type: "error", message: "密码加密异常" });
	}
};

export const apiRegister = async (formData: FormData) => {
	const res = await authAxios.post("/user/register", formData, {
		headers: {
			"Content-Type": "multipart/form-data",
		},
	});
	return res.status === 200 ? true : false;
};
