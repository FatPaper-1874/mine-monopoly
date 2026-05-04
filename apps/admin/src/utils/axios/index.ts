import axios from "axios";
import router from "@/router";
import { message } from "ant-design-vue";
import { env } from "@mine-monopoly/env";

export const _axios = axios.create({
	baseURL: `${env("PROTOCOL")}://${env("MONOPOLY_DOMAIN")}:${env<number>("SERVER_PORT")}`,
});

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
				router.replace({ name: "login" });
			} else {
				message.error(msg, 1);
			}
		}
		return response.data;
	},
	function (error) {
		const res = error.response;
		const duration = 1000;
		if (res) {
			message.error(res.data.msg || "解析返回结果错误");
		}
		if (res && (res.status === 401 || res.status === 403)) {
			localStorage.removeItem("token");
			setTimeout(() => {
				router.replace({ name: "login" });
			}, duration);
		}
		return Promise.reject(error);
	},
);
