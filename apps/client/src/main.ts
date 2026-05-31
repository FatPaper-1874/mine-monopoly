import { createApp } from "vue";
import "@src/assets/variables.scss";
import "@src/assets/layer.scss";
import "@src/assets/style.scss";
import "@src/assets/ui.scss";
import "@src/assets/font/font.css";
import contentFontUrl from "./assets/font/ContentFont.woff2?url";
import contentFontAllUrl from "./assets/font/ContentFont-all.woff2?url";
import { isPC } from "./utils/platform";
import App from "./App.vue";

// 根据平台动态加载 ContentFont：Electron 使用 ContentFont-all，网页使用 ContentFont
const fontStyle = document.createElement("style");
fontStyle.textContent = `
	@font-face {
		font-family: "ContentFont";
		src: url("${isPC() ? contentFontAllUrl : contentFontUrl}") format("woff2");
		font-style: normal;
		font-weight: normal;
		ascent-override: 100%;
	}
`;
document.head.appendChild(fontStyle);
import router from "./router";
import { createPinia } from "pinia";
import { AXIOS_HANDLED_ERROR } from "@src/utils/api";

/* import the fontawesome core */
import { library } from "@fortawesome/fontawesome-svg-core";

/* import font awesome icon component */
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

/* import specific icons */
import {
	faBolt,
	faBomb,
	faHeart,
	faHouse,
	faPalette,
	faSackDollar,
	faWandMagicSparkles,
	faCircleCheck,
	faCircleExclamation,
	faCircleXmark,
	faCircleInfo,
	faQuestionCircle,
	faLinkSlash,
	faClose,
	faWifi,
	faCompactDisc,
	faSpinner,
	faAngleUp,
	faAngleLeft,
	faAngleRight,
	faAngleDown,
	faBars,
	faExpand,
	faRotate,
	faComments,
	faClock,
	faClockRotateLeft,
	faVideo,
	faBullhorn,
	faBug,
	faCode,
	faCircleUser,
	faGamepad,
	faCopy,
	faBookTanakh,
	faCompress,
	faCrown,
	faPersonRunning,
	faWandSparkles,
	faGear,
	faSquareCheck,
	faVolumeLow,
	faVolumeHigh,
	faVolumeXmark,
	faMinus,
	faPlus,
	faQuestion,
	faBook,
	faShuffle,
	faHourglassHalf,
	faRectangleXmark,
	faWindowRestore,
	faWindowMinimize,
	faWindowMaximize,
	faXmark,
	faGhost,
	faUpload,
	faCheck,
	faGaugeHigh,
	faCrosshairs,
	faRobot,
	faRightFromBracket,
	faFloppyDisk,
	faUsers,
	faPlay,
	faRotateLeft,
	faBoxOpen,
	faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import { useDeviceStatus, useSettig } from "@src/store";
import { isFullScreen as _isFullScreen, isLandscape as _isLandscape, isMobileDevice } from "@src/utils";
import useEventBus from "@src/utils/event-bus";

library.add(
	faBolt,
	faBomb,
	faHeart,
	faHouse,
	faPalette,
	faSackDollar,
	faWandMagicSparkles,
	faCircleCheck,
	faCircleExclamation,
	faCircleXmark,
	faCircleInfo,
	faQuestionCircle,
	faLinkSlash,
	faClose,
	faWifi,
	faCompactDisc,
	faSpinner,
	faAngleUp,
	faAngleLeft,
	faAngleRight,
	faAngleDown,
	faBars,
	faExpand,
	faRotate,
	faComments,
	faClock,
	faClockRotateLeft,
	faVideo,
	faBullhorn,
	faBug,
	faCode,
	faCircleUser,
	faGamepad,
	faCopy,
	faBookTanakh,
	faCompress,
	faCrown,
	faPersonRunning,
	faWandSparkles,
	faGear,
	faSquareCheck,
	faVolumeLow,
	faVolumeHigh,
	faVolumeXmark,
	faMinus,
	faPlus,
	faQuestion,
	faBook,
	faShuffle,
	faHourglassHalf,
	faRectangleXmark,
	faWindowRestore,
	faWindowMinimize,
	faWindowMaximize,
	faXmark,
	faGhost,
	faUpload,
	faCheck,
	faGaugeHigh,
	faCrosshairs,
	faRobot,
	faRightFromBracket,
	faFloppyDisk,
	faUsers,
	faPlay,
	faRotateLeft,
	faBoxOpen,
	faTrashCan
);
const pinia = createPinia();

const app = createApp(App);

app.use(pinia).use(router).component("font-awesome-icon", FontAwesomeIcon).directive("sound", soundDirective).mount("#app");

// 初始化 console 拦截器（在开发环境中也启用）
interceptConsole();

initDeviceStatusListener();
initSettingStore();

async function initSettingStore() {
	const settingStore = useSettig();
	const savedState = localStorage.getItem("setting");
	if (savedState) {
		settingStore.$patch(JSON.parse(savedState));
	}

	// 同步设置到音频管理器
	const { useAudioManager } = await import("@src/utils/audio");
	const audioManager = useAudioManager();
	audioManager.setAutoMusic(settingStore.autoMusic);
	audioManager.setMasterVolume(settingStore.masterVolume);
	audioManager.setSFXVolume(settingStore.sfxVolume);
	audioManager.setBGMVolume(settingStore.musicVolume);

	// 同步静音状态
	audioManager.setMasterMuted(settingStore.masterMuted);
	audioManager.setSFXMuted(settingStore.sfxMuted);
	audioManager.setBGMMuted(settingStore.musicMuted);

	settingStore.$subscribe((mutation, state) => {
		localStorage.setItem("setting", JSON.stringify(state));

		// 同步设置到音频管理器
		audioManager.setAutoMusic(state.autoMusic);
		audioManager.setMasterVolume(state.masterVolume);
		audioManager.setSFXVolume(state.sfxVolume);
		audioManager.setBGMVolume(state.musicVolume);

		// 同步独立静音状态
		audioManager.setMasterMuted(state.masterMuted);
		audioManager.setSFXMuted(state.sfxMuted);
		audioManager.setBGMMuted(state.musicMuted);
	});

	// 初始化全局按钮音效
	const { initAutoSound } = await import("@src/utils/audio/auto-sound");
	initAutoSound();
}

import { gsap } from "gsap";
import MotionPathPlugin from "gsap/MotionPathPlugin";
import { FPMessage } from "@mine-monopoly/ui";
import soundDirective from "./directives/sound";

gsap.registerPlugin(MotionPathPlugin);

function initDeviceStatusListener() {
	const deviceStatus = useDeviceStatus();
	deviceStatus.isFullScreen = _isFullScreen();
	deviceStatus.isLandscape = _isLandscape();
	deviceStatus.isMobile = isMobileDevice();
	deviceStatus.isFocus = document.visibilityState === "visible";
	// if (isMobileDevice()) {
	// 	document.addEventListener("touchstart", function (e) {
	// 		e.preventDefault();
	// 	});
	// }

	window.addEventListener("fullscreenchange", (e) => {
		deviceStatus.isFullScreen = _isFullScreen();
	});

	if (isPC()) {
		window.electronAPI.onFullScreenChange((isFull) => {
			deviceStatus.isFullScreen = isFull;
		});
	}

	window.addEventListener("resize", (e) => {
		deviceStatus.isLandscape = _isLandscape();
	});

	document.addEventListener("visibilitychange", () => {
		const isNowFocus = document.visibilityState === "visible";
		deviceStatus.isFocus = isNowFocus;

		// 恢复焦点时发送事件，通知渲染器同步状态
		if (isNowFocus) {
			useEventBus().emit("window:focus-restored");
		}
	});
}

// --- 错误处理工具函数 ---

// 日志查看位置提示
function getLogLocationHint(): string {
	if (window.electronAPI) {
		return "日志已保存，请在 logs 文件夹中查看";
	}
	return "请按 F12 打开浏览器控制台查看详细日志";
}

// 格式化错误提示（只显示错误类型）
function formatErrorType(errorType: string): string {
	return errorType;
}

// 记录错误到 Electron 日志（增强版）
function logErrorToElectron(errorData: {
	type: "Vue" | "Promise" | "Runtime" | "Worker" | "Network" | "Console";
	message: string;
	stack?: string;
	info?: string;
	filename?: string;
	lineno?: number;
	colno?: number;
	url?: string;
	method?: string;
	status?: number;
	timestamp?: string;
	additionalData?: Record<string, any>;
}) {
	if (window.electronAPI?.logError) {
		window.electronAPI.logError(errorData);
	}
}

// 记录控制台输出
function logConsoleToElectron(level: "error" | "warn" | "info", ...args: any[]) {
	if (window.electronAPI?.logConsole) {
		const message = args
			.map(arg => {
				if (typeof arg === "object") {
					try {
						return JSON.stringify(arg, null, 2);
					} catch (e) {
						return String(arg);
					}
				}
				return String(arg);
			})
			.join(" ");

		const error = args.find(arg => arg instanceof Error);
		window.electronAPI.logConsole({
			level,
			message,
			stack: error?.stack
		});
	}
}

// 拦截原生 console 方法
function interceptConsole() {
	const originalError = console.error;
	const originalWarn = console.warn;
	const originalInfo = console.info;

	console.error = (...args) => {
		originalError.apply(console, args);
		logConsoleToElectron("error", ...args);
	};

	console.warn = (...args) => {
		originalWarn.apply(console, args);
		logConsoleToElectron("warn", ...args);
	};

	console.info = (...args) => {
		originalInfo.apply(console, args);
		logConsoleToElectron("info", ...args);
	};
}

// --- 捕获 Vue 组件内部错误 ---
app.config.errorHandler = (err, instance, info) => {
	console.error("[Vue Error]:", err);

	// 收集组件信息
	const componentName = instance?.$options?.name || instance?.$options?.__name || "Unknown";
	const props = instance?.$props;
	const route = window.location.pathname;
	const userAgent = navigator.userAgent;
	const screenInfo = `${screen.width}x${screen.height}`;

	FPMessage({ type: "error", message: `${formatErrorType("Vue 错误")}\n${getLogLocationHint()}` });

	logErrorToElectron({
		type: "Vue",
		message: err instanceof Error ? err.message : String(err),
		stack: err instanceof Error ? err.stack : undefined,
		info,
		timestamp: new Date().toISOString(),
		additionalData: {
			componentName,
			props: props ? JSON.stringify(props, null, 2) : undefined,
			route,
			userAgent: userAgent.substring(0, 200),
			screenInfo,
			memoryUsage: performance?.memory ? {
				usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + " MB",
				totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + " MB"
			} : undefined
		}
	});
};

// --- 捕获未处理的 Promise 拒绝 (Async/Await, Axios 等) ---
window.addEventListener("unhandledrejection", (event) => {
	console.error("[Unhandled Promise]:", event.reason);

	const reason = event.reason;

	// 检查是否已被 axios 拦截器处理
	if (reason && reason[AXIOS_HANDLED_ERROR]) {
		console.log("[Axios Handled]: 错误已在 axios 拦截器中处理");
		event.preventDefault();
		return;
	}

	// 跳过取消操作
	const errMessage = reason instanceof Error ? reason.message : String(reason);
	if (errMessage.includes("cancel") || errMessage.includes("abort")) {
		return;
	}

	// 收集错误上下文
	const additionalData: Record<string, any> = {
		route: window.location.pathname,
		timestamp: new Date().toISOString()
	};

	// 检查是否是网络相关错误
	if (reason?.isAxiosError) {
		additionalData.config = {
			url: reason.config?.url,
			method: reason.config?.method,
			data: reason.config?.data
		};
		additionalData.response = {
			status: reason.response?.status,
			statusText: reason.response?.statusText,
			data: reason.response?.data
		};
	}

	FPMessage({ type: "error", message: `${formatErrorType("异步错误")}\n${getLogLocationHint()}` });

	logErrorToElectron({
		type: "Promise",
		message: errMessage,
		stack: reason instanceof Error ? reason.stack : undefined,
		timestamp: additionalData.timestamp,
		additionalData
	});

	event.preventDefault();
});

// --- 捕获常规 JS 运行时错误 ---
window.addEventListener("error", (event) => {
	console.error("[Global JS Error]:", event.error);

	FPMessage({ type: "error", message: `${formatErrorType("运行时错误")}\n${getLogLocationHint()}` });

	logErrorToElectron({
		type: "Runtime",
		message: event.message,
		stack: event.error?.stack,
		filename: event.filename,
		lineno: event.lineno,
		colno: event.colno,
		timestamp: new Date().toISOString(),
		additionalData: {
			route: window.location.pathname,
			userAgent: navigator.userAgent.substring(0, 200)
		}
	});

	event.preventDefault();
});
