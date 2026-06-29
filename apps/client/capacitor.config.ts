import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
	appId: "com.fatpaper.minemonopoly",
	appName: "MineMonopoly",
	webDir: "dist/frontend",

	server: {
		cleartext: true,
		hostname: "app.fatpaper.site",
	},

	android: {
		allowMixedContent: true,
	},

	ios: {
		contentInset: "automatic",
	},

	plugins: {
		StatusBar: {
			// 透明覆盖层：摄像头区域由游戏内容填充，不再留黑边
			overlaysWebView: true,
			// 深色图标（覆盖在游戏浅色背景上需可见）
			style: "DARK",
		},
		SystemBars: {
			// 启动时隐藏导航栏
			hidden: true,
			// 不注入 safe-area CSS 变量：游戏需要铺满全屏
			insetsHandling: "disable",
		},
		CapacitorUpdater: {
			autoUpdate: false,
		},
	},
};

export default config;
