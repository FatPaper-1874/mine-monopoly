import axios from "axios";
import { ElMessage } from "element-plus";
import { __MONOPOLYSERVER__ } from "@G/global.config";
import router from "@/router";

export const _axios = axios.create({
	baseURL: __MONOPOLYSERVER__,
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
	}
);

// 响应拦截器
_axios.interceptors.response.use(
	function (response) {
		const msg = response.data.msg;
		if (msg) {
			const status = response.data.status;
			if (status == 200) {
				//成功请求
				ElMessage({
					type: "success",
					message: msg,
				});
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
		return response.data.data;
	},
	function (error) {
		const res = error.response;
		const duration = 1000;
		if (res) {
			ElMessage({
				type: "error",
				message: res.data.msg || "解析返回结果错误",
				duration,
			});
		}
		if (res && res.status === 401) {
			localStorage.removeItem("token");
			setTimeout(() => {
				router.replace({ name: "login" });
			}, duration);
		}
		return Promise.reject(error);
	}
);
