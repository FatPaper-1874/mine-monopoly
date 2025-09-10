<script setup lang="ts">
import FpDialog from "@src/components/utils/fp-dialog/fp-dialog.vue";
import { ChanceCardInfo } from "@fatpaper-monopoly/types";
import { useGameData, useMapData } from "@src/store/game";
import { computed, onBeforeMount, onBeforeUnmount, onMounted, ref, watch } from "vue";
import ChanceCard from "@src/views/game/components/chance-card.vue";
import PlayerCard from "@src/views/game/components/player-card.vue";
import { generateSvgArrows } from "@src/utils";

const props = defineProps<{ chanceCard: ChanceCardInfo }>();
const emit = defineEmits<{ (e: "useCard", targetId: string): void; (e: "cancel"): void }>();

let svg: SVGSVGElement | null = null;
let setPath: ((startX: number, startY: number, endX: number, endY: number) => void) | null = null;

const currentSelectedTargetId = ref("");
const containerEl = ref<HTMLElement | null>(null);

watch(currentSelectedTargetId, (newId) => {
	const chanceCardEl = document.getElementById("chance-card") as HTMLElement;
	const targetEl = document.getElementById("player-" + newId) as HTMLElement;

	if (chanceCardEl && targetEl) {
		const chanceCardElRect = chanceCardEl.getBoundingClientRect();
		const startX = chanceCardElRect.right; // 中心的X坐标
		const startY = chanceCardElRect.top + chanceCardElRect.height / 2; // 中心的Y坐标

		const targetElRect = targetEl.getBoundingClientRect();
		const endX = targetElRect.left; // 左边缘的X坐标
		const endY = targetElRect.top + targetElRect.height / 2; // 左边缘中心的Y坐标

		setPath && setPath(startX, startY, endX, endY);
	}
});

onMounted(() => {
	const { svg: _svg, setPath: _setPath } = generateSvgArrows(props.chanceCard.color);
	svg = _svg;
	setPath = _setPath;
	if (containerEl.value) containerEl.value.appendChild(svg);
});

onBeforeUnmount(() => {
	if (containerEl.value && svg) containerEl.value.removeChild(svg);
});

const mapDataStore = useMapData();
const gameInfoStore = useGameData();

const targetPlayerList = computed(() => {
	return gameInfoStore.playersList.filter((p) => p.isBankrupted === false && p.id !== gameInfoStore.getMyInfo?.id);
});

function handleTargetSelected() {
	if (currentSelectedTargetId.value !== "") emit("useCard", currentSelectedTargetId.value);
	else emit("cancel");
}

function handleCancel() {
	emit("cancel");
}
</script>

<template>
	<FpDialog visible @submit="handleTargetSelected" @cancel="handleCancel">
		<template #title> 使用机会卡: {{ chanceCard.name }} </template>
		<div ref="containerEl" class="target-selector-container">
			<div class="chance-card-container">
				<ChanceCard id="chance-card" :chance-card="chanceCard" :disable="false" />
			</div>
			<div class="target-container">
				<div class="tips">选择机会卡的目标（点击玩家卡片）</div>
				<div class="target-list">
					<PlayerCard
						:id="'player-' + player.id"
						@click="currentSelectedTargetId = player.id"
						v-for="player in targetPlayerList"
						:key="player.id"
						:player="player"
						:round-mark="player.id === currentSelectedTargetId"
					/>
				</div>
			</div>
		</div>
	</FpDialog>
</template>

<style lang="scss" scoped>
.target-selector-container {
	display: flex;
	justify-content: space-between;

	& > .chance-card-container {
		padding: 4rem 7rem 4rem 5rem;

		& > #chance-card {
			scale: 1.2;
		}
	}

	& > .target-container {
		flex: 1;

		& > .tips {
			color: var(--color-primary);
			text-align: center;
			margin-bottom: 1rem;
		}

		& > .target-list {
			display: grid;
			grid-template-rows: repeat(3, 1fr); /* 三行，等高 */
			grid-template-columns: repeat(2, 1fr); /* 两列，等宽 */
			gap: 1rem;

			& > div {
				box-shadow: var(--box-shadow);
			}
		}
	}
}
</style>
