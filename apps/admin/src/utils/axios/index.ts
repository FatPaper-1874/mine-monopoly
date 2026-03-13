import axios from "axios";
import router from "@/router";
import { message } from "ant-design-vue";
import { env } from "@mine-monopoly/env";

export const _axios = axios.create({
	baseURL: `${env("PROTOCOL")}://${env("FATPAPER_DOMAIN")}:${env<number>("SERVER_PORT")}`,
});

_axios.defaults.headers.common["Authorization"] = localStorage.getItem("token");

//请求拦截器
_axios.interceptors.request.use(
	function (config) {
		const token = localStorage.getItem("token");
		if (token) {
			config.headers.Authorization = token;
		} else {
			router.replace({ path: "/login" });
			return Promise.reject("请登录");
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
		const msg = response.data.msg;
		if (msg) {
			const status = response.data.status;
			if (status == 200) {
				//成功请求
				message.success(msg, 1);
			}
			// } else if (status == 400) {
			// 	//普通警告
			// 	ElMessage({
			// 		type: "warning",
			// 		message: msg,
			// 	});
			// } else if (status == 401) {
			// 	//token过期
			// 	ElMessage({
			// 		type: "warning",
			// 		message: msg,
			// 	});
			// 	localStorage.setItem("token", "");
			// 	router.replace({ path: "/login" });
			// } else if (status == 500) {
			// 	//用户输入数据错误
			// 	ElMessage({
			// 		type: "error",
			// 		message: msg,
			// 	});
			// }
		}
		return response.data;
	},
	function (error) {
		const res = error.response;
		const duration = 1000;
		if (res) {
			message.error(res.data.msg || "解析返回结果错误");
		}
		if (res && res.status === 401) {
			localStorage.removeItem("token");
			setTimeout(() => {
				router.replace({ name: "login" });
			}, duration);
		}
		return Promise.reject(error);
	},
);
