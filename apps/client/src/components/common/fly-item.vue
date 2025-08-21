<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

const props = defineProps<{ text: string; startX: number; startY: number; color: string }>();
const flyItem = ref<HTMLElement | null>(null);

const flyItemBox = computed(() => {
	if (flyItem.value) {
		const { width, height } = flyItem.value.getBoundingClientRect();
		return { width, height };
	} else {
		return { width: 0, height: 0 };
	}
});

const maxRotation = 35;
const getRandomRotation = () => {
  return Math.floor(Math.random() * (maxRotation * 2 + 1)) - maxRotation;
};
</script>

<template>
	<div
		ref="flyItem"
		class="fly-item"
		:style="{ left: startX - flyItemBox.width + 'px', top: startY - flyItemBox.height / 2 + 'px', color }"
	>
		<span :style="{transform: `rotate(${getRandomRotation()}deg)`}">{{ text }}￥</span>
	</div>
</template>

<style lang="scss" scoped>
.fly-item {
	position: absolute;
	top: 0;
	left: 0;
	z-index: 9999;

	& > span {
		display: block;
		font-size: 1rem;
		text-shadow: var(--text-shadow-surround-white);
		scale: 1.5;
	}
}
</style>
