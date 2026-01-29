<script setup lang="ts">
import { useGameData } from "@src/store/game";
import { App, computed, createApp, onMounted, ref } from "vue";
import PlayerCard from "./player-card.vue";
import { GameEventType, PlayerInfo } from "@mine-monopoly/types";
import FpDialog from "@src/components/utils/fp-dialog/fp-dialog.vue";
import PlayerDetail from "./player-detail.vue";
import useEventBus from "@src/utils/event-bus";
import FlyItem from "@src/components/common/fly-item.vue";
import gsap from "gsap";
import { remToPx } from "@src/utils";

const gameInfoStore = useGameData();
const _playersList = computed(() => gameInfoStore.players);
const playerDetailVisiable = ref(false);
const currentPlayer = ref<PlayerInfo | null>(null);
const roundTurnPlayerId = computed(() => gameInfoStore.currentPlayerIdInRound);

const playerCardElMap = new Map<string, HTMLElement>();
onMounted(() => {
	for (const player of _playersList.value) {
		const playerCardEl = document.querySelector(`#player-card-${player.id}`);
		if (playerCardEl) {
			playerCardElMap.set(player.id, playerCardEl as HTMLElement);
		}

		useEventBus().on(
			GameEventType.CostMoney + player.id,
			(playerInfo: PlayerInfo, money: number, target: PlayerInfo) => {
				if (target) return;
				const gainMoneyEl = playerCardElMap.get(player.id);
				if (gainMoneyEl) {
					const gainMoneyElBox = gainMoneyEl.getBoundingClientRect();
					const startX = gainMoneyElBox.left;
					const startY = gainMoneyElBox.top + gainMoneyElBox.height / 2;
					const container = document.createDocumentFragment();

					const flyMoneyEl = createApp(FlyItem, {
						text: `-${money}`,
						startX: startX,
						startY: startY,
						color: "var(--color-text-error)",
					}) as App<any>;
					const vm = flyMoneyEl.mount(container);
					document.body.appendChild(container);
					gsap.to(vm.$el, {
						x: -remToPx(2.5),
						y: 0,
						duration: 0.8,
						ease: "linear",
						onComplete: flyMoneyEl.unmount,
					});
				}
			},
		);

		useEventBus().on(
			GameEventType.GainMoney + player.id,
			(playerInfo: PlayerInfo, money: number, source: PlayerInfo) => {
				const gainMoneyEl = playerCardElMap.get(player.id);

				if (gainMoneyEl) {
					const gainMoneyElBox = gainMoneyEl.getBoundingClientRect();
					const endY = gainMoneyElBox.top + gainMoneyElBox.height / 2;
					const container = document.createDocumentFragment();
					if (source) {
						const costMoneyEl = playerCardElMap.get(source.id);
						if (!costMoneyEl) return;
						const costMonenyElBox = costMoneyEl.getBoundingClientRect();
						const startX = costMonenyElBox.left;
						const startY = costMonenyElBox.top + costMonenyElBox.height / 2;
						//有来源就飞钱
						const flyMoneyEl = createApp(FlyItem, {
							text: money + "",
							startX,
							startY,
							color: source.user.color,
						}) as App<any>;
						const vm = flyMoneyEl.mount(container);
						document.body.appendChild(container);
						gsap.to(vm.$el, {
							motionPath: {
								path: [
									{ x: 0, y: 0 },
									{ x: -remToPx(2.5), y: (endY - startY) / 2 },
									{
										x: 0,
										y: endY - startY,
									},
								],
								curviness: 3,
							},
							color: player.user.color,
							duration: 1.2,
							ease: "linear",
							onComplete: flyMoneyEl.unmount,
						});
					} else {
						const startX = gainMoneyElBox.left;
						const startY = gainMoneyElBox.top + gainMoneyElBox.height / 2;
						const flyMoneyEl = createApp(FlyItem, {
							text: `+${money}`,
							startX: startX - remToPx(2.5),
							startY: startY,
							color: "var(--color-text-success)",
						}) as App<any>;
						const vm = flyMoneyEl.mount(container);
						document.body.appendChild(container);
						gsap.to(vm.$el, {
							x: remToPx(2.5),
							y: 0,
							duration: 0.8,
							ease: "linear",
							onComplete: flyMoneyEl.unmount,
						});
					}
				}
			},
		);
	}
});
function handleShowPlayerDetail(player: PlayerInfo) {
	currentPlayer.value = player;
	playerDetailVisiable.value = true;
}
</script>

<template>
	<FpDialog :style="'width: 70%; height: 70%;'" v-model:visible="playerDetailVisiable">
		<template #title>
			<div class="title">{{ currentPlayer?.user.username }}的底细</div>
		</template>

		<PlayerDetail #default v-if="currentPlayer" :player="currentPlayer" />
	</FpDialog>

	<div class="player-container">
		<div class="tips">点击玩家卡片查看底细</div>
		<PlayerCard
			:id="`player-card-${player.id}`"
			@click="handleShowPlayerDetail(player)"
			v-for="player in _playersList"
			:key="player.id"
			:player="player"
			:round-mark="player.id === roundTurnPlayerId"
		></PlayerCard>
	</div>
</template>

<style lang="scss" scoped>
.player-container {
	display: flex;
	flex-direction: column;
	justify-content: space-around;
	align-items: center;
	position: absolute;
	top: 4.2rem;
	right: 0;
	z-index: var(--z-ui);

	& > .tips {
		width: 100%;
		background-color: rgba(255, 255, 255, 0.75);
		padding: 0.3rem;
		border-radius: 0.5rem;
		color: var(--color-primary);
		padding: 0.3rem 0.6rem;
		box-sizing: border-box;
		text-shadow: var(--text-shadow-surround-white);
		margin-bottom: 0.3rem;
	}

	.fly-money-container {
		position: "fixed";
		left: 0;
		top: 0;
		z-index: var(--z-ui);
	}
}
</style>
