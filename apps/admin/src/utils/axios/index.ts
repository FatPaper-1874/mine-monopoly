import axios, { InternalAxiosRequestConfig } from "axios";
import router from "@/router";
import { message } from "ant-design-vue";
import { env } from "@mine-monopoly/env";

const getApiBaseUrl = () =>
	`${env("PROTOCOL")}://${env("MONOPOLY_DOMAIN")}:${env<number>("SERVER_PORT")}`;

export const _axios = axios.create({
	baseURL: getApiBaseUrl(),
});

// --- Token 刷新机制 ---

let refreshPromise: Promise<boolean> | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
const REFRESH_BEFORE_EXPIRY_MS = 5 * 60 * 1000;

function doRefresh(): Promise<boolean> {
	if (refreshPromise) return refreshPromise;

	const refreshToken = localStorage.getItem("refreshToken");
	if (!refreshToken) {
		return Promise.resolve(false);
	}

	refreshPromise = axios
		.post(`${getApiBaseUrl()}/user/refresh-token`, { refreshToken })
		.then((res) => {
			const data = res.data?.data;
			if (data?.token && data?.refreshToken) {
				localStorage.setItem("token", data.token);
				localStorage.setItem("refreshToken", data.refreshToken);
				return true;
			}
			return false;
		})
		.catch(() => false)
		.finally(() => {
			refreshPromise = null;
		});

	return refreshPromise;
}

export function startTokenRefreshTimer() {
	stopTokenRefreshTimer();
	refreshTimer = setTimeout(async () => {
		const success = await doRefresh();
		if (success) {
			startTokenRefreshTimer();
		} else {
			localStorage.removeItem("token");
			localStorage.removeItem("refreshToken");
			router.replace({ name: "login" });
		}
	}, 30 * 60 * 1000 - REFRESH_BEFORE_EXPIRY_MS);
}

export function stopTokenRefreshTimer() {
	if (refreshTimer) {
		clearTimeout(refreshTimer);
		refreshTimer = null;
	}
}

document.addEventListener("visibilitychange", () => {
	if (document.visibilityState === "visible") {
		const token = localStorage.getItem("token");
		if (!token) return;
		try {
			const payload = JSON.parse(atob(token.split(".")[1]));
			const expiresAt = payload.exp;
			if (expiresAt && Date.now() > expiresAt - REFRESH_BEFORE_EXPIRY_MS) {
				doRefresh().then((ok) => {
					if (ok) startTokenRefreshTimer();
				});
			}
		} catch {
			// token 解析失败，忽略
		}
	}
});

// --- 拦截器 ---

//请求拦截器
_axios.interceptors.request.use(
	function (config) {
		const token = localStorage.getItem("token");
		if (token) {
			config.headers.Authorization = token;
		}
		return config;
	},
	function (error) {
		return Promise.reject(error);
	},
);

// 响应拦截器
_axios.interceptors.response.use(
	function (response) {
		const { msg, status } = response.data;
		if (msg) {
			if (status == 200) {
				message.success(msg, 1);
			} else if (status == 401) {
				message.warning(msg, 1);
				localStorage.removeItem("token");
				localStorage.removeItem("refreshToken");
				router.replace({ name: "login" });
			} else {
				message.error(msg, 1);
			}
		}
		return response;
	},
	async function (error) {
		const res = error.response;
		const originalConfig = error.config as InternalAxiosRequestConfig | undefined;

		if (res) {
			if (res.status === 401) {
				// 刷新请求本身失败，直接跳登录
				if (originalConfig?.url?.includes("/user/refresh-token")) {
					localStorage.removeItem("token");
					localStorage.removeItem("refreshToken");
					router.replace({ name: "login" });
					return Promise.reject(error);
				}
				// 尝试刷新 token
				const refreshed = await doRefresh();
				if (refreshed && originalConfig) {
					originalConfig.headers["Authorization"] = localStorage.getItem("token");
					return _axios.request(originalConfig);
				}
				localStorage.removeItem("token");
				localStorage.removeItem("refreshToken");
				router.replace({ name: "login" });
				return Promise.reject(error);
			}
			if (res.status === 403) {
				localStorage.removeItem("token");
				localStorage.removeItem("refreshToken");
				setTimeout(() => {
					router.replace({ name: "login" });
				}, 1000);
				return Promise.reject(error);
			}
			message.error(res.data.msg || "解析返回结果错误");
		}
		return Promise.reject(error);
	},
);
