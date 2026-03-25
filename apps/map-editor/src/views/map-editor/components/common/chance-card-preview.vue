<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { ChanceCardInfo } from "@mine-monopoly/types";
import { message } from "ant-design-vue";
import { useResourceStore } from "@src/stores";

const props = defineProps<{ chanceCard: ChanceCardInfo; disable: boolean; iconPreview: string | undefined }>();

// 转换 \n 为真实换行符
const formattedDescription = computed(() => {
	return props.chanceCard.description.replace(/\\n/g, '\n');
});

const _iconPreview = ref("");

watch(
	() => props.chanceCard.iconId,
	async (newIconId) => {
		if (newIconId) {
			const imageResource = useResourceStore().findImageById(newIconId);
			if (!imageResource) {
				message.error(`获取 ${props.chanceCard.name} 的icon资源失败`, 1);
				return;
			}
			_iconPreview.value = `${imageResource.url}`;
		} else {
			_iconPreview.value = "";
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div class="chance-card" :class="{ disable }" :style="{ border: `0.35em solid ${chanceCard.color}` }">
		<div class="icon" v-if="chanceCard.iconId || iconPreview"><img :src="iconPreview || _iconPreview" alt="" /></div>
		<div class="name" :style="{ color: chanceCard.color }">{{ chanceCard.name }}</div>
		<div class="describe" :style="{ color: chanceCard.color }">{{ formattedDescription }}</div>
	</div>
</template>

<style lang="scss" scoped>
.chance-card {
	min-width: 12em;
	min-height: 16em;
	width: 12em;
	height: 16em;
	font-size: 0.8em;
	background-color: #ffffff;
	box-sizing: border-box;
	border-radius: 1.6em;
	box-shadow: 0 0 0.2em rgba(0, 0, 0, 0.32);
	user-select: none;
	display: flex;
	justify-content: center;
	flex-direction: column;
	align-items: center;
	overflow: hidden;
	transition: 0.3s;

	&.disable {
		filter: grayscale(1);
		pointer-events: none;
		cursor: not-allowed;
	}

	& > .icon {
		margin-bottom: 0.6em;

		& > img {
			$img-size: 5.2em;
			width: $img-size;
			height: $img-size;
			pointer-events: none;
			user-select: none;
		}
	}

	& > .name {
		font-size: 1.5em;
		font-weight: 700;
		margin-bottom: 0.8em;
	}

	& > .describe {
		width: 80%;
		font-weight: 700;
		font-size: 0.9em;
		margin-bottom: 1em;
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
