<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		text?: string;
	}>(),
	{ text: "Mine Monopoly" },
);
</script>

<template>
	<div class="hero-title">
		<span :data-text="props.text">{{ props.text }}</span>
	</div>
</template>

<style lang="scss" scoped>
.hero-title {
	z-index: 1;
	margin-top: 30px;

	& > span {
		font-size: 6em;
		font-weight: 600;
		color: #ffffff;
		letter-spacing: 0.4rem;
		display: block;
		position: relative;
		user-select: none;

		&::before,
		&::after {
			content: attr(data-text);
		}

		&:before,
		&:after {
			position: absolute;
			left: 0;
			top: 0;
		}

		&:before {
			color: #ff9114;
			z-index: -1;
			animation: rotate1 5s ease-in-out infinite;
		}

		&:after {
			color: #7e7e7e;
			z-index: -2;
			animation: rotate2 5s ease-in-out infinite;
		}
	}

	@keyframes rotate1 {
		0%,
		100% {
			-webkit-transform: translate3d(0.2rem, 0.2rem, 0.2rem);
			transform: translate3d(0.2rem, 0.2rem, 0.2rem);
		}

		50% {
			-webkit-transform: translate3d((-0.2rem, 0.2rem, -0.2rem));
			transform: translate3d((-0.2rem, 0.2rem, -0.2rem));
		}
	}

	@keyframes rotate2 {
		0%,
		100% {
			-webkit-transform: translate3d(5px, 5px, 5px);
			transform: translate3d(5px, 5px, 5px);
		}

		50% {
			-webkit-transform: translate3d((-5px, 5px, -5px));
			transform: translate3d((-5px, 5px, -5px));
		}
	}
}
</style>
