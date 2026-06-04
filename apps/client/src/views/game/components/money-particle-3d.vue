<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import gsap from "gsap";

interface Props {
	amount: number;
	size: "sm" | "md" | "lg" | "xl";
	onComplete?: () => void;
}

const props = defineProps<Props>();

const particleRef = ref<HTMLElement | null>(null);

const isGain = computed(() => props.amount >= 0);
const colorClass = computed(() => (isGain.value ? "gold" : "red"));
const sizeClass = computed(() => `particle-${props.size}`);
const particleIcon = computed(() => (isGain.value ? "💰" : "💸"));
const formattedAmount = computed(() => {
	const sign = isGain.value ? "+" : "-";
	const absAmount = Math.abs(props.amount);
	return sign + absAmount.toString() + "￥";
});

onMounted(() => {
	if (!particleRef.value) return;

	// 动画参数（使用 rem 相对单位，相对于 CSS2DObject 位置）
	const offsetYRem = 0; // 从 CSS2DObject 位置开始
	const offsetXRem = 2; // 右侧偏移

	gsap.set(particleRef.value, {
		x: `${offsetXRem}rem`,
		y: `${offsetYRem}rem`,
		scale: 0,
		opacity: 1,
		willChange: "transform, opacity",
	});

	const tl = gsap.timeline({
		onComplete: () => {
			gsap.set(particleRef.value, { clearProps: "transform,willChange" });
			props.onComplete?.();
		},
	});

	// 放大弹入
	tl.to(particleRef.value, {
		scale: 1,
		duration: 0.3,
		ease: "back.out(1.7)",
	});

	// 停留
	tl.to(particleRef.value, {
		duration: 0.5,
	});

	// 获得向上浮动，扣钱向下坠落
	if (isGain.value) {
		// 获得金钱：向上浮动淡出
		tl.to(particleRef.value, {
			y: `${offsetYRem - 3}rem`,
			opacity: 0,
			duration: 0.5,
			ease: "power2.out",
		});
	} else {
		// 扣除金钱：向下坠落、放大并淡出
		tl.to(particleRef.value, {
			y: `${offsetYRem + 2}rem`,
			scale: 1.3,
			opacity: 0,
			duration: 0.5,
			ease: "power2.in",
		});
	}
});
</script>

<template>
	<div ref="particleRef" :class="['money-particle', colorClass, sizeClass]">
		<div class="particle-icon">{{ particleIcon }}</div>
		<div class="particle-amount">{{ formattedAmount }}</div>
	</div>
</template>

<style lang="scss" scoped>
@import "./styles/money-particle.scss";
</style>
