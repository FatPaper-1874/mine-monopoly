import axios, { AxiosError, AxiosResponse } from "axios";
import { env } from "@mine-monopoly/env";
import { FPMessage } from "@mine-monopoly/ui";
import { clearAuthAndRedirect } from "@src/utils/auth";
import type { ApiResponse } from "@mine-monopoly/types";

const apiClient = axios.create({
  baseURL: `${env("PROTOCOL")}://${env("FATPAPER_DOMAIN")}:${env<number>("SERVER_PORT")}`,
  timeout: 15000,
});

// Symbol 标记：用于标记已在拦截器中处理过的错误
// 避免 main.ts 的 unhandledrejection 重复显示错误消息
const AXIOS_HANDLED_ERROR = Symbol("__axios_handled_error__");

// 导出标记，供 main.ts 使用
export { AXIOS_HANDLED_ERROR };

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers["Authorization"] = token;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// 响应拦截器 - 成功
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { msg, status } = response.data;
    if (msg && status === 200) {
      FPMessage({ type: "success", message: msg });
    }
    return response.data as any;
  },
  // 响应拦截器 - 错误
  (error: AxiosError) => {
    let message = "";
    let showErrorMessage = true;

    // 1. 处理网络错误和超时
    if (!error.response) {
      if (error.code === "ECONNABORTED") {
        message = "请求超时，请检查网络连接";
      } else {
        message = "网络错误，请检查网络连接";
      }
    }
    // 2. 处理 HTTP 错误
    else {
      const { status, data } = error.response;

      switch (status) {
        case 400:
          message = (data as any)?.msg || "请求参数错误";
          break;
        case 401:
          message = (data as any)?.msg || "登录已过期，请重新登录";
          clearAuthAndRedirect(); // 自动清除认证并跳转
          showErrorMessage = false; // 401 不显示错误消息
          break;
        case 403:
          message = (data as any)?.msg || "没有权限访问";
          break;
        case 404:
          message = (data as any)?.msg || "请求的资源不存在";
          break;
        case 500:
          message = (data as any)?.msg || "服务器内部错误";
          break;
        default:
          message = (data as any)?.msg || `请求失败(${status})`;
      }
    }

    // 显示错误消息
    if (showErrorMessage && message) {
      FPMessage({ type: "error", message });
    }

    // 标记错误已在拦截器中处理
    // 避免 main.ts 的 unhandledrejection 重复显示
    (error as any)[AXIOS_HANDLED_ERROR] = true;

    return Promise.reject(error);
  }
);

export default apiClient;
