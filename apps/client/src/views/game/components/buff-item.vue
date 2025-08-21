<script setup lang="ts">
import { playerBuffTriggerTimingMap } from "@src/classes/worker/enums/game";
import { Buff } from "@src/interfaces/game";

const props = defineProps<{ buff: Buff }>();
</script>

<template>
	<div class="buff-item">
		<div class="top-bar">
			<div class="name">{{ buff.name }}</div>
			<div class="trigger-timming">{{ playerBuffTriggerTimingMap[buff.type] }} 触发</div>
		</div>
		<div class="describe">{{ buff.describe }}</div>
		<div class="foot-bar">
			<div class="trigger-times">剩余生效次数: {{ buff.triggerTimes === Infinity ? "无限" : buff.triggerTimes }}</div>
			<div class="source">来源: {{ buff.source }}</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.buff-item {
	width: 100%;
	border-radius: 0 1rem 1rem 0;
	height: max-content;
	box-sizing: border-box;
	box-shadow: var(--box-shadow);
	border-left: 0.4rem solid var(--color-primary);

	& > .top-bar {
		border-radius: 0 1rem 0 0;
		width: 100%;
		background-color: var(--color-primary);
		box-sizing: border-box;
		padding: 0.5rem 0.8rem;
		color: #fff;
		display: flex;
		justify-content: space-between;
		align-items: center;

		& > .name {
			font-size: 1.2rem;
		}

		& > .trigger-timming {
			font-size: 1rem;
		}
	}

	& > .describe {
		width: 100%;
		padding: 0.5rem;
		box-sizing: border-box;
	}

	& > .foot-bar {
		border-radius: 0 0 1rem 0;
		width: 100%;
		background-color: var(--color-bg);
		box-sizing: border-box;
		padding: 0.3rem 0.8rem;
		color: #fff;
		display: flex;
		justify-content: space-between;
		align-items: center;

		& > .trigger-times,
		& > .source {
			font-size: 0.8rem;
		}
	}
}
</style>
