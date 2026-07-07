import { createRouter, createWebHashHistory, createWebHistory } from "vue-router";
import { useLoading, useRoomInfo, useUserInfo } from "@src/store";
import { destoryMonopolyClient } from "@src/core/monopoly-client/MonopolyClient";

function componentLoadedInterceptor(promise: Promise<any>) {
	return () => {
		const loadingStore = useLoading();
		loadingStore.text = "加载中";
		loadingStore.loading = true;
		return new Promise((resolve) => {
			promise.then((e: any) => {
				loadingStore.loading = false;
				resolve(e);
			});
		});
	};
}

import { getPlatformType } from "@src/utils/platform";

const routes = [
	{ path: "/", name: "login", component: componentLoadedInterceptor(import("@src/views/login/login.vue")) },
	{
		path: "/room-router",
		name: "room-router",
		component: componentLoadedInterceptor(import("@src/views/room_router/room_router.vue")),
	},
	{ path: "/room", name: "room", component: componentLoadedInterceptor(import("@src/views/room/room.vue")) },
	{ path: "/game", name: "game", component: componentLoadedInterceptor(import("@src/views/game/game.vue")) },
];

const router = createRouter({
	// Electron 必须用 Hash (file:// 协议)，其他平台用 History
	history: getPlatformType() === "electron"
		? createWebHashHistory()
		: createWebHistory(import.meta.env.BASE_URL),
	routes,
});

router.beforeEach((to, form) => {
	switch (to.name) {
		case "room-router":
			destoryMonopolyClient();
			break;
		case "game":
		case "room":
			if (!useRoomInfo().roomId) {
				return { name: "room-router" };
			}
			break;
		default:
			if (
				// 检查用户是否已登录
				!localStorage.getItem("token") &&
				!localStorage.getItem("user") &&
				//  避免无限重定向
				to.name !== "login"
			) {
				// 将用户重定向到登录页面
				return { name: "login" };
			}
			break;
	}
});

export default router;
