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
	<div class="chance-card" :class="{ disable }" :style="{ border: `0.34em solid ${chanceCard.color}` }">
		<div class="icon" v-if="chanceCard.iconId && iconUrl"><img :src="iconUrl" alt="" /></div>
		<div class="name" :style="{ color: chanceCard.color }">{{ chanceCard.name }}</div>
		<div class="describe" :style="{ color: chanceCard.color }">{{ formattedDescription }}</div>
	</div>
</template>

<style lang="scss" scoped>
.chance-card {
	min-width: 11em;
	min-height: 14em;
	width: 11em;
	height: 14em;
	font-size: 0.8em;
	background-image:
		radial-gradient(circle at 50% 50%, transparent 0%, rgba(0, 0, 0, 0.05) 100%),
		repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.02) 2px, rgba(0, 0, 0, 0.02) 4px);
	background-color: #ffffff;
	box-sizing: border-box;
	border-radius: 1.8em;
	box-shadow: 0 0.1em 0em 0.2em rgba(160, 160, 160, 0.5);
	user-select: none;
	display: flex;
	justify-content: center;
	flex-direction: column;
	align-items: center;
	overflow: hidden;
	transition: 0.3s;
	cursor: pointer;

	&.disable {
		filter: grayscale(1);
		pointer-events: none;
		cursor: not-allowed;
	}

	& > .icon {
		margin-top: 0.6em;
		margin-bottom: 0.3em;

		& > img {
			$img-size: 5.4em;
			width: $img-size;
			height: $img-size;
			pointer-events: none;
			user-select: none;
		}
	}

	& > .name {
		font-size: 1.2em;
		margin-bottom: 0.6em;
	}

	& > .describe {
		width: 80%;
		font-size: 0.7em;
		margin-bottom: 0.6em;
		word-wrap: break-word;
		overflow-y: scroll;
		text-align: center;
		white-space: pre-wrap; /* 保留换行和空格 */

		&::-webkit-scrollbar {
			display: none;
		}
	}
}
</style>
