<script setup lang="ts">
import { computed } from "vue";

// 宽松类型定义，兼容 ChanceCardInfo 和 ChanceCardClientInfo
interface ChanceCardDisplayInfo {
	id: string;
	name: string;
	description: string;
	iconId: string;
	color: string;
	type: string;
}

const props = defineProps<{
	/** 机会卡信息 */
	chanceCard: ChanceCardDisplayInfo;
	/** 图标 URL（由父组件传入） */
	iconUrl: string;
	/** 是否禁用 */
	disable?: boolean;
}>();

// 转换 \n 为真实换行符
const formattedDescription = computed(() => {
	return props.chanceCard.description.replace(/\\n/g, "\n");
});
</script>

<template>
	<div class="chance-card" :class="{ disable }" :style="{ '--card-color': chanceCard.color }">
		<div class="name" :style="{ backgroundColor: chanceCard.color }">{{ chanceCard.name }}</div>
		<div class="icon" v-if="iconUrl"><img :src="iconUrl" alt="" /></div>
		<div class="describe" :style="{ color: chanceCard.color }">
			<div>{{ formattedDescription }}</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.chance-card {
	min-width: 11em;
	min-height: 15em;
	width: 11em;
	height: 15em;
	font-size: 0.8em;
	background-image:
		radial-gradient(circle at 50% 50%, transparent 0%, rgba(0, 0, 0, 0.01) 100%),
		repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.02) 2px, rgba(0, 0, 0, 0.02) 4px);
	background-color: #ffffff;
	box-sizing: border-box;
	border-radius: 1.8em;
	box-shadow: 0 0.1em 0em 0.2em rgba(160, 160, 160, 0.5);
	user-select: none;
	display: flex;
	justify-content: space-between;
	flex-direction: column;
	align-items: center;
	overflow: hidden;
	transition: 0.3s;
	cursor: pointer;
	position: relative;

	&::before {
		content: "";
		position: absolute;
		inset: 0;
		border-radius: 1.8em;
		border: 0.34em solid var(--card-color, #ccc);
		pointer-events: none;
		z-index: 1;
	}

	&.disable {
		filter: grayscale(1);
		pointer-events: none;
		cursor: not-allowed;
	}

	& > .name {
		margin-bottom: 0.8em;
		width: 100%;
		text-align: center;
		color: #ffffff;
		font-size: 1.1em;
		padding: 0.4em 0 0.3em 0;
		background-image: repeating-linear-gradient(
			45deg,
			transparent,
			transparent 0.15em,
			#f3f4f618 0.15em,
			#f3f4f618 0.3em
		);
		box-shadow: 0 0.1em 0em 0.2em rgba(228, 228, 228, 0.5);
		position: relative;
		overflow: hidden;
	}

	& > .icon {
		margin-bottom: 0.3em;

		& > img {
			$img-size: 5.6em;
			width: $img-size;
			height: $img-size;
			pointer-events: none;
			user-select: none;
			filter: drop-shadow(0.1em 0.2em 0em color-mix(in srgb, var(--card-color) 25%, transparent));
		}
	}

	& > .describe {
		width: 80%;
		flex: 1;
		margin-bottom: 0.6em;
		overflow-y: scroll;
		display: flex;

		div {
			max-height: 100%;
			margin: auto;
			font-size: 0.75em;
			text-align: center;
			word-wrap: break-word;
			white-space: pre-wrap; /* 保留换行和空格 */
		}

		&::-webkit-scrollbar {
			display: none;
		}
	}
}
</style>
