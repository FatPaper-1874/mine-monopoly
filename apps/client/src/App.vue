<script setup lang="ts">
import FullScreenMask from "@src/views/screen_mask/screen_mask.vue";
import Loading from "@src/components/utils/fp-loading/fp-loading.vue";
import Background from "@src/views/background/background.vue";
import StatusBar from "@src/views/status_bar/status_bar.vue";
import { computed, nextTick, onBeforeMount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { pageEnter, pageLeave } from "@src/utils/gsap/page-transition";
import Chat from "@src/views/chat_log/chat_log.vue";
import DanmakuContainer from "@src/views/danmaku/danmaku_container.vue";
import { isFullScreen, isMobileDevice } from "@src/utils";
import { TitleBar } from "@mine-monopoly/ui";
import SafeModeActionPanel from "@src/components/SafeModeActionPanel.vue";
import { isPC } from "./utils/platform";
import { useDeviceStatus } from "./store";
import {
	faBolt,
	faBomb,
	faBook,
	faBookTanakh,
	faBug,
	faCircleUser,
	faCode,
	faCompress,
	faCopy,
	faCrown,
	faGamepad,
	faGear,
	faHeart,
	faHouse,
	faPalette,
	faPersonRunning,
	faQuestion,
	faSackDollar,
	faShuffle,
	faSquareCheck,
	faVolumeHigh,
	faVolumeLow,
	faWandMagicSparkles,
	faWandSparkles,
} from "@fortawesome/free-solid-svg-icons";
import { icon } from "@fortawesome/fontawesome-svg-core";
import Update from "./components/common/update.vue";

const isMobile = isMobileDevice();
const router = useRoute();
const isInGame = computed(() => router.name === "game");
const canChat = computed(() => router.name === "room" || router.name === "game");
const version = __APP_VERSION__;
const isTitleBarShow = computed(() => isPC() && !useDeviceStatus().isFullScreen);

const fullScreenWatcherStopHandler = watch(
	() => useDeviceStatus().isFullScreen,
	(isFullScreen) => {
		nextTick(resizeContainer);
	},
);

onMounted(() => {
	window.addEventListener("resize", resizeContainer);
	resizeContainer();
});

onBeforeMount(() => {
	window.removeEventListener("resize", resizeContainer);
	fullScreenWatcherStopHandler();
});

function resizeContainer() {
	const topBarHeight = 30;
	const availableHeight = window.innerHeight - (useDeviceStatus().isFullScreen || !isPC() ? 0 : topBarHeight);
	const availableWidth = window.innerWidth;
	const ratio = 16 / 10;
	const fontSizeBase = 0.0115;

	const container = document.querySelector(".main-container") as HTMLElement;

	if (availableWidth / availableHeight > ratio) {
		const containerStyle = {
			height: `${availableHeight}px`,
			width: `${availableHeight * ratio}px`,
		};
		Object.assign(container.style, containerStyle);
		container.setAttribute("out-of-width", "");
		container.removeAttribute("out-of-height");
		document.documentElement.style.fontSize = `${availableHeight * fontSizeBase * ratio}px`;
	} else if (availableWidth / availableHeight < ratio) {
		const containerStyle = {
			height: `${availableWidth / ratio}px`,
			width: `${availableWidth}px`,
		};
		Object.assign(container.style, containerStyle);
		container.setAttribute("out-of-height", "");
		container.removeAttribute("out-of-width");
		document.documentElement.style.fontSize = `${availableWidth * fontSizeBase}px`;
	} else {
		const containerStyle = {
			height: `${availableWidth / ratio}px`,
			width: `${availableWidth}px`,
		};
		Object.assign(container.style, containerStyle);
		container.removeAttribute("out-of-height");
		container.removeAttribute("out-of-width");
		document.documentElement.style.fontSize = `${availableWidth * fontSizeBase}px`;
	}
}

const backgroundSvgList: string[] = [
	faBolt,
	faBomb,
	faHeart,
	faHouse,
	faPalette,
	faSackDollar,
	faWandMagicSparkles,
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
].map((i) => {
	return icon(i).html[0];
});
</script>

<template>
	<TitleBar style="z-index: var(--z-topbar)" v-if="isTitleBarShow" :bg-color="'#f38b11'">
		<template #title>
			<span style="font-size: 12px">Mine Monopoly v{{ version }}</span>
		</template>
	</TitleBar>
	<div class="main-container-wrapper">
		<div class="main-container" id="fpmessage-container">
			<!-- <FullScreenMask v-if="isMobile" /> -->
			<Chat v-if="canChat" />
			<DanmakuContainer v-if="canChat" />
			<Background
				background-color="var(--fp-color-tertiary)"
				color="var(--fp-color-secondary)"
				:icons="backgroundSvgList"
				:icon-size="70"
				:angle="40"
				:speed="60"
				:gap="80"
				:opacity-range="[0.5, 0.5]"
				:scale-range="[1, 1]"
				v-if="!isInGame"
			/>
			<Loading />
			<StatusBar />
			<!-- <MusicPlayer v-if="isMusicPlayerVisiable" /> -->
			<RouterView v-slot="{ Component, route }">
					<Transition
						:css="false"
						mode="out-in"
						@enter="pageEnter"
						@leave="pageLeave"
						appear
					>
						<component :is="Component" :key="route.path" />
					</Transition>
				</RouterView>
		</div>
	</div>
	<Update />
<SafeModeActionPanel />
</template>

<style lang="scss" scoped>
.main-container-wrapper {
	flex: 1;
	display: flex;
	justify-content: center;
	align-items: center;
	background-color: #f7d088;
	background-image: url(../public/images/oak_planks_512x512.png);
	background-repeat: repeat;
	background-size: 12%;
}
.main-container {
	position: relative;
	display: flex;
	justify-content: center;
	align-items: center;
	width: 100%;
	height: 100%;
	// overflow: hidden;

	$border-width: 0.6rem;
	$border-offset: -0.4rem;

	@mixin transitional-border-base {
		content: "";
		position: absolute;
		border: solid #7e6237;
		pointer-events: none;
	}

	&[out-of-width]::after {
		@include transitional-border-base;
		border-width: 0 $border-width;
		left: $border-offset;
		top: 0;
		right: $border-offset;
		bottom: 0;
	}

	&[out-of-height]::after {
		@include transitional-border-base;
		border-width: $border-width 0;
		left: 0;
		top: $border-offset;
		right: 0;
		bottom: $border-offset;
	}
	// width: 100%;
	// height: auto;
	// aspect-ratio: $ratio;
	// margin: 0 auto;

	// /* 视口比较宽时，以高度为准 */
	// @media (min-aspect-ratio: $ratio) {
	// 	width: auto;
	// 	height: 100%;
	// }
}
</style>
