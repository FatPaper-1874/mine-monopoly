import { Component } from "vue";

interface menuItem {
	path: string;
	menuName: string;
	name: string;
	component: Component;
	icon: string;
}

export const menus: menuItem[] = [
	{
		path: "/dashboard",
		menuName: "控制台",
		name: "dashboard",
		component: () => import("@/views/manage/dashboard/dashboard.vue"),
		icon: "gauge",
	},
	{
		path: "/map",
		menuName: "地图管理",
		name: "map",
		component: () => import("@/views/manage/map-manage/map-manage.vue"),
		icon: "map-location-dot",
	},
	{
		path: "/user",
		menuName: "用户管理",
		name: "user",
		component: () => import("@/views/manage/user-manage/user-manage.vue"),
		icon: "person",
	},
	{
		path: "/turn-monitor",
		menuName: "TURN 监控",
		name: "turn-monitor",
		component: () => import("@/views/manage/turn-monitor/turn-monitor.vue"),
		icon: "tower-broadcast",
	},
];
