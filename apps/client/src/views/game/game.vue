<script setup lang="ts">
import { onMounted, computed, onUnmounted, ref, onBeforeMount, onBeforeUnmount } from "vue";
import { GameRenderer } from "@src/core/game/GameRenderer";
import { useLoading, useRoomInfo, useUtil } from "@src/store";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import router from "@src/router/index";
import { MonopolyClient, useMonopolyClient } from "@src/core/monopoly-client/MonopolyClient";
import Dices from "./components/dices.vue";
import ChanceCardContainer from "./components/chance-card-container.vue";
import CountdownTimer from "./components/countdown-timer.vue";
import scoreboard from "./components/scoreboard.vue";
import RoundInfo from "@src/views/game/components/round-info.vue";
import ProgressBar from "@src/views/game/components/progress-bar.vue";
import PlayerContainer from "./components/player-container.vue";

//pinia仓库
const gameInfoStore = useGameData();
const utilStore = useUtil();

const windowWidth = computed(() => window.innerWidth);
const windowHeight = computed(() => window.innerHeight);

let socketClient: MonopolyClient;
let gameRenderer: GameRenderer | null;
const islockingCamera = ref(true);
const lockCameraIcon = computed(() => (islockingCamera.value ? "fa-video" : "fa-video-slash"));

//动态数据部分
const _isMyTurn = computed(() => gameInfoStore.isMyTurn);
const _propertiesList = computed(() => gameInfoStore.propertiesList);

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

		const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
		const container = document.getElementsByClassName("game-page")[0] as HTMLDivElement;
		gameRenderer = new GameRenderer(canvas, container);
		// await gameRenderer.init();
		useLoading().showLoading("数据加载完成，等待其他玩家加载...");
		socketClient.gameInitFinished();
	} catch (e: any) {
		router.replace({ name: "room-router" });
	}
});

onBeforeUnmount(() => {
	if (gameRenderer) gameRenderer.destroy();
	gameRenderer = null;
});

function useGameData() {
	throw new Error("Function not implemented.");
}
</script>

<template>
	<div class="game-page">
		<canvas id="game-canvas" :width="windowWidth" :height="windowHeight"></canvas>
		<div class="ui-container">
			<div class="progress-bar ui-item">
				<ProgressBar />
			</div>

			<div class="round-info ui-item">
				<RoundInfo />
			</div>

			<div class="player-contianer ui-item">
				<PlayerContainer />
			</div>

			<div class="tool-bar ui-item">
				<button class="border-button lock-camera" @click="handleToggleLockCamera">
					<FontAwesomeIcon :icon="lockCameraIcon" />
				</button>
			</div>

			<div class="chance-card-container ui-item">
				<ChanceCardContainer />
			</div>

			<div class="dice ui-item">
				<Dices @click="handleRollDice"></Dices>
			</div>

			<teleport to="body">
				<div
					style="position: fixed; top: 15%; left: 50%; transform: translate(-50%, -50%); z-index: 99999999"
					class="countdown-timer ui-item"
				>
					<CountdownTimer />
				</div>
			</teleport>
		</div>

		<scoreboard />
	</div>
</template>

<style lang="scss" scoped>
.game-page {
	position: relative;
	width: 100%;
	height: 100%;
	background-color: #ffffff;
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

	&.roll-dice {
		border-width: 0.2rem;
		font-size: 2rem;
		width: 8rem;
		height: 8rem;
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
	z-index: 500;
	display: block;
}

.ui-container {
	z-index: 1000;
	pointer-events: none;

	// &>div {
	// 	pointer-events: none;
	// }

	.ui-item {
		position: absolute;

		&.progress-bar {
			position: absolute;
			left: 0;
			top: 50%;
			transform: translateY(-50%);
		}

		&.round-info {
			top: 0;
			left: 50%;
			transform: translateX(-50%);
		}

		&.player-contianer {
			top: 4.2rem;
			right: 0;
		}

		&.tool-bar {
			position: absolute;
			right: 0;
			top: 0;
			display: none;
			justify-content: space-between;
			pointer-events: none;
		}

		&.chance-card-container {
			position: absolute;
			left: 50%;
			bottom: 0;
			transform: translateX(-50%);
		}

		&.dice {
			position: absolute;
			right: 0.4rem;
			bottom: 0.4rem;
		}
	}

	& * {
		pointer-events: initial;
	}
}
</style>
