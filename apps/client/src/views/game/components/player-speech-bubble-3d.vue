<script setup lang="ts">
defineProps<{
	username: string;
	color: string;
	content: string;
}>();
</script>

<template>
	<div class="speech-bubble-3d">
		<div class="speech-bubble-3d__name" :style="{ color }">{{ username }}</div>
		<div class="speech-bubble-3d__content">{{ content }}</div>
	</div>
</template>

<style scoped lang="scss">
.speech-bubble-3d {
	position: relative;
	max-width: min(18rem, 38vw);
	padding: 0.45rem 0.65rem;
	border-radius: 0.8rem;
	border: 1px solid rgba(255, 255, 255, 0.88);
	background: #ffffff;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
	color: #1d1d1f;
	text-align: left;
	line-height: 1.35;
	word-break: break-word;
	backdrop-filter: blur(2px);
}

.speech-bubble-3d::after {
	content: "";
	position: absolute;
	z-index: -1;
	pointer-events: none;
	width: 0.8rem;
	height: 0.8rem;
	background: #ffffff;
	border: 1px solid rgba(255, 255, 255, 0.88);
	left: 50%;
	bottom: -0.48rem;
	transform: translateX(-50%) rotate(45deg);
}

.speech-bubble-3d[data-tail="top"]::after {
	top: -0.48rem;
	bottom: auto;
	transform: translateX(-50%) rotate(45deg);
}

.speech-bubble-3d[data-tail="left"]::after {
	top: 50%;
	left: -0.48rem;
	bottom: auto;
	transform: translateY(-50%) rotate(45deg);
}

.speech-bubble-3d[data-tail="right"]::after {
	top: 50%;
	right: -0.48rem;
	left: auto;
	top: auto;
	bottom: auto;
	transform: translateY(-50%) rotate(45deg);
}

.speech-bubble-3d[data-tail="bottom"]::after {
	left: 50%;
	bottom: -0.48rem;
	top: auto;
	transform: translateX(-50%) rotate(45deg);
}

.speech-bubble-3d[data-offscreen="true"] {
	max-width: min(18rem, 32vw);
}

.speech-bubble-3d__name {
	font-size: 0.72rem;
	font-weight: 700;
	margin-bottom: 0.2rem;
	text-shadow: none;
}

.speech-bubble-3d__content {
	font-size: 0.86rem;
	font-weight: 600;
	white-space: normal;
	text-shadow: none;
}
</style>
