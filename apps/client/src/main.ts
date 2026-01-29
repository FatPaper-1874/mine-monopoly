import { createApp } from "vue";
import "@src/assets/variables.scss";
import "@src/assets/layer.scss";
import "@src/assets/style.scss";
import "@src/assets/ui.scss";
import "@src/assets/font/font.css";
import App from "./App.vue";
import router from "./router";
import { createPinia } from "pinia";
import "./axios";

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
} from "@fortawesome/free-solid-svg-icons";
import { useDeviceStatus, useSettig } from "@src/store";
import { isFullScreen as _isFullScreen, isLandscape as _isLandscape, isMobileDevice } from "@src/utils";

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
	faHourglassHalf,
);
const pinia = createPinia();

const app = createApp(App);

app.use(pinia).use(router).component("font-awesome-icon", FontAwesomeIcon).mount("#app");

initDeviceStatusListener();
initSettingStore();

import { gsap } from "gsap";
import MotionPathPlugin from "gsap/MotionPathPlugin";
import { isPC } from "./utils/platform";
import { FPMessage } from "@mine-monopoly/ui";

gsap.registerPlugin(MotionPathPlugin);

function initSettingStore() {
	const settingStore = useSettig();
	const savedState = localStorage.getItem("setting");
	if (savedState) {
		settingStore.$patch(JSON.parse(savedState));
	}

	settingStore.$subscribe((mutation, state) => {
		localStorage.setItem("setting", JSON.stringify(state));
	});
}

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
		deviceStatus.isFocus = document.visibilityState === "visible";
	});
}

// --- 捕获 Vue 组件内部错误 ---
app.config.errorHandler = (err, instance, info) => {
	console.error("[Vue Error]:", err); // 保留控制台打印方便调试

	const errMessage = err instanceof Error ? err.message : String(err);

	FPMessage({ type: "error", message: `系统错误: ${errMessage}` });
};

// --- 捕获未处理的 Promise 拒绝 (Async/Await, Axios 等) ---
window.addEventListener("unhandledrejection", (event) => {
	console.error("[Unhandled Promise]:", event.reason);

	// 提取错误信息
	const reason = event.reason;
	const errMessage = reason instanceof Error ? reason.message : String(reason);
	if (errMessage.includes("cancel") || errMessage.includes("abort")) return;

	FPMessage({ type: "error", message: `异步错误: ${errMessage}` });
	event.preventDefault();
});

// --- 捕获常规 JS 运行时错误 ---
window.addEventListener("error", (event) => {
	console.error("[Global JS Error]:", event.error);

	FPMessage({ type: "error", message: `程序异常: ${event.message}` });
	event.preventDefault();
});
