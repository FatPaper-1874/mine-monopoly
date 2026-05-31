<script setup lang="ts">
	import {
		onMounted,
		computed,
		onUnmounted,
		ref,
		onBeforeMount,
		onBeforeUnmount,
		h,
		VNode,
		isVNode,
		render,
		Fragment,
	} from "vue";
	import { GameRenderer } from "@src/core/renderer/GameRenderer";
	import { useLoading, useUtil } from "@src/store";
	import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
	import router from "@src/router/index";
	import { MonopolyClient, useMonopolyClient, destoryMonopolyClient } from "@src/core/monopoly-client/MonopolyClient";
	import Dices from "./components/dices.vue";
	import ChanceCardContainer from "./components/chance-card-container.vue";
	import CountdownTimer from "./components/countdown-timer.vue";
	import scoreboard from "./components/scoreboard.vue";
	import PlayerContainer from "./components/player-container.vue";
	import GameButtonsPanel from "./components/game-buttons-panel.vue";
	import { useGameData, useMapData } from "@src/store/game";
	import { useUserInfo } from "@src/store";
	import { CustomUI, GameMap, UISchema } from "@mine-monopoly/types";
	import { compileTsToJs } from "@src/utils";
	import { useAudioManager } from "@src/utils/audio/AudioManager";
	import { SoundName } from "@src/utils/audio/types";
	import useEventBus from "@src/utils/event-bus";
	import { storeToRefs } from "pinia";
	import UiRenderer from "@src/components/utils/ui-renderer/ui-renderer.vue";
	import FpErrorBoundary from "@src/components/utils/fp-error-boundary/index.vue";
	//pinia仓库
	const mapDataStore = useMapData();
	const userInfoStore = useUserInfo();
	const gameDataStore = useGameData();

	const windowWidth = computed(() => window.innerWidth);
	const windowHeight = computed(() => window.innerHeight);

	const currentPlayerId = computed(() => userInfoStore.userId);
	const gameDataState = computed(() => gameDataStore.$state);

	let socketClient: MonopolyClient;
	let gameRenderer: GameRenderer | null;
	const islockingCamera = ref(true);
	const lockCameraIcon = computed(() => (islockingCamera.value ? "fa-video" : "fa-video-slash"));

	function handleToggleLockCamera() {
		if (gameRenderer) islockingCamera.value = gameRenderer.toggleLockCamera();
	}

	function handleRollDice() {
		if (socketClient) {
			socketClient.rollDice();
		}
	}

	onMounted(async () => {
		try {
			socketClient = useMonopolyClient();
			useLoading().showLoading("加载数据中...");

			// 暂停心跳检测，避免加载期间误判断连
			socketClient.sendLoadingStarted();
			socketClient.pauseHeartBeat();

			const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
			const container = document.getElementsByClassName("game-page")[0] as HTMLDivElement;
			if (!canvas || !container) {
				throw new Error("游戏画布元素未找到");
			}
			const mapData = JSON.parse(JSON.stringify(mapDataStore.$state)) as GameMap;
			console.log("🚀 ~ mapData:", mapData);
			gameRenderer = new GameRenderer(canvas, container, mapData);
			await gameRenderer.init();

				// 注册金钱粒子系统
			// 恢复心跳检测
			socketClient.resumeHeartBeat();

			useLoading().showLoading("数据加载完成，等待其他玩家加载...");
			socketClient.gameInitFinished();

			// 监听玩家金钱变化事件
			const audioManager = useAudioManager();
			const eventBus = useEventBus();
			eventBus.on("player-money", (playerId: string, oldMoney: number, newMoney: number) => {
				if (newMoney > oldMoney) {
					audioManager.playSound(SoundName.GAIN_MONEY);
				} else if (newMoney < oldMoney) {
					audioManager.playSound(SoundName.LOSE_MONEY);
				}
			});
		} catch (e: any) {
			// 异常时也要恢复心跳，防止永久暂停
			socketClient?.resumeHeartBeat();
			console.error(e);
			useLoading().hideLoading();
			router.replace({ name: "room-router" });
		}
	});

	onBeforeUnmount(() => {
		if (gameRenderer) gameRenderer.destroy();
		gameRenderer = null;
		// 只有在真正离开房间时才销毁 MonopolyClient（安全模式回房间时不销毁）
		const nextRoute = router.currentRoute.value.name;
		if (nextRoute !== "room") {
			destoryMonopolyClient();
		}
	});

	function getUiTemplateById(id: string) {
		return (
			useMapData().getUITempolateById(id)?.template || { id: "404", type: "text", content: `找不到ID为: ${id} 的UI组件` }
		);
	}
</script>

<template>
	<FpErrorBoundary>
		<div class="game-page">
			<canvas id="game-canvas" :width="windowWidth" :height="windowHeight"></canvas>
			<div class="ui-container">
				<UiRenderer
					v-for="ui in mapDataStore.customUIs"
					:schema="getUiTemplateById(ui.uiSchema)"
					:context="gameDataState"
					:style="{
						gridArea: `${ui.layout.y + 1} / ${ui.layout.x + 1} / span ${ui.layout.height} / span ${ui.layout.width}`,
						zIndex: `var(--z-ui)`,
					}"
				/>

				<PlayerContainer />

				<div class="tool-bar ui-item">
					<button class="border-button lock-camera" @click="handleToggleLockCamera">
						<FontAwesomeIcon :icon="lockCameraIcon" />
					</button>
				</div>

				<ChanceCardContainer />

				<!-- 游戏按钮面板：包含骰子按钮和动态按钮 -->
				<GameButtonsPanel :player-id="currentPlayerId" title="操作面板" @rollDice="handleRollDice" />

				<teleport to="body">
					<CountdownTimer />
				</teleport>
			</div>

			<!-- 金钱粒子系统：放在 ui-container 外部，避免 pointer-events 冲突 -->

			<scoreboard />
		</div>
	</FpErrorBoundary>
</template>

<style lang="scss" scoped>
.game-page {
	position: relative;
	width: 100%;
	height: 100%;
	background-color: #ffffff;
	user-select: none;
}

.border-button {
	border-style: solid;
	border-color: rgba($color: #ffffff, $alpha: 0.5);
	border-radius: 0.8rem;

	&.lock-camera {
		border-width: 0.25rem;
		font-size: 1.2em;
		width: 4rem;
		height: 4rem;
	}
}

.ui-container,
#game-canvas {
	position: absolute;
	width: 100%;
	height: 100%;
	left: 0;
	top: 0;
}

#game-canvas {
	z-index: var(--z-game);
	display: block;
}

.ui-container {
	pointer-events: none;
	display: grid;
	grid-template-columns: repeat(32, 1fr);
	grid-template-rows: repeat(20, 1fr);

	.ui-item {
		position: absolute;

		&.tool-bar {
			position: absolute;
			right: 0;
			top: 0;
			display: none;
			justify-content: space-between;
			pointer-events: none;
		}
	}

	& * {
		pointer-events: initial;
	}
}
</style>
