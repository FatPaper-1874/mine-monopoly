import router from "@src/router";
import { useUserInfo, useRoomInfo } from "@src/store";
import { destoryMonopolyClient } from "@src/core/monopoly-client/MonopolyClient";

/**
 * 清除所有认证信息并重定向到登录页
 */
export function clearAuthAndRedirect() {
  // 清除 localStorage
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");

  // 清除 Pinia store 状态
  const userInfoStore = useUserInfo();
  const roomInfoStore = useRoomInfo();
  userInfoStore.$reset();
  roomInfoStore.$reset();

  // 销毁游戏客户端（如果存在）
  destoryMonopolyClient();

  // 跳转到登录页
  router.replace({ name: "login" });
}

export function setToken(token: string): void {
  localStorage.setItem("token", token);
}

export function setRefreshToken(token: string): void {
  localStorage.setItem("refreshToken", token);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem("refreshToken");
}
