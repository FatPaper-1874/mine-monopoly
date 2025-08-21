<script setup lang="ts">
import { useGameInfo } from "@src/store/index";
import { computed } from "vue";
import playerCard from "./player-card.vue";
import { useRouter } from "vue-router";

const router = useRouter();
const isGameOver = computed(() => useGameInfo().isGameOver);
const playerListSorted = computed(() =>
	useGameInfo().playersList.sort((playerA, playerB) => playerB.money - playerA.money)
);

function toRoomList() {
	useGameInfo().$reset();
	router.replace("/room");
}
</script>

<template>
	<transition name="fade">
		<div v-if="isGameOver" class="scoreboard">
			<div class="contianer">
				<div class="title">游戏结束</div>
				<div class="player-list-container">
					<div class="player-container" v-for="(player, index) in playerListSorted">
						<div class="No">{{ index + 1 }}</div>
						<playerCard :player="player" :round-mark="false" />
					</div>
				</div>
				<div class="go-back">
					<button @click="toRoomList">返回大厅</button>
				</div>
			</div>
		</div>
	</transition>
</template>

<style lang="scss" scoped>
.scoreboard {
	position: fixed;
	top: 0;
	left: 0;
	bottom: 0;
	right: 0;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	background-color: rgba(0, 0, 0, 0.5);
	z-index: 10000;

	& > span {
		margin-top: 0.8em;
		color: #eeeeee;
	}
}

.contianer {
	width: 30rem;
	height: 60%;
	border-radius: 0.8rem;
	overflow: hidden;
	background-color: var(--color-bg-light);
	display: flex;
	flex-direction: column;
}

.title {
	width: 100%;
	height: 3rem;
	line-height: 3rem;
	font-size: 1.8rem;
	background-color: var(--color-primary);
	color: white;
	padding: 0 10px;
}

.No {
	min-width: 3rem;
	height: 3rem;
	border-radius: 50%;
	margin-right: 1rem;
	text-align: center;
	line-height: 3rem;
	font-size: 2rem;
	background-color: var(--color-primary);
}

.player-list-container {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	color: #fff;
}

.player-container {
	width: 25rem;
	display: flex;
	justify-content: space-around;
	align-items: center;
}

.go-back {
	width: 100%;

	button {
		width: 100%;
		height: 2rem;
	}
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.5s;
}

.fade-enter,
.fade-leave-to {
	opacity: 0;
}
</style>
