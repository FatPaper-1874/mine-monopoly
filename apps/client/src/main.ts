import { createApp } from "vue";
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
} from "@fortawesome/free-solid-svg-icons";
import { chanceCardSource } from "./directives/chanceCardDrag";
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
	faHourglassHalf
);
const pinia = createPinia();

createApp(App)
	.use(pinia)
	.use(router)
	.component("font-awesome-icon", FontAwesomeIcon)
	.directive("chanceCardSource", chanceCardSource)
	.mount("#app");

initDeviceStatusListener();
initSettingStore();

import { gsap } from "gsap";
import MotionPathPlugin from "gsap/MotionPathPlugin";

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

	window.addEventListener("resize", (e) => {
		deviceStatus.isLandscape = _isLandscape();
	});

	document.addEventListener("visibilitychange", () => {
		deviceStatus.isFocus = document.visibilityState === "visible";
	});
}
