<script setup lang="ts">
import { ref, onBeforeMount, onBeforeUnmount, reactive, onMounted } from "vue";
import router from "@/router";
import Background from "@/views/background/background.vue";
import { __LOGINPAGEURL__ } from "@G/global.config";
import { createLoginIframeOnBody } from "@/utils";

onMounted(async () => {
	const tokenFromLocal = localStorage.getItem("token") || "";
	if (!tokenFromLocal) {
		const token = await createLoginIframeOnBody(__LOGINPAGEURL__);
		localStorage.setItem("token", token);
	}
	toMain();
});

function toMain() {
	router.push({ name: "main" });
}
</script>

<template>
	<Background />
	<div class="login-page">
		<div class="title">
			<span>ADMIN</span>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.login-page {
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.login-code-container {
	width: 100%;
	height: 100%;
	flex: 1;
	display: flex;
	justify-content: center;
	align-items: center;
	margin-bottom: 5rem;

	.login-code {
		$img_size: 16rem;

		width: $img_size;
		height: $img_size;
	}
}

.title {
	margin-top: 30px;

	& > span {
		font-size: 6em;
		color: #ffffff;
		letter-spacing: 0.3em;
		display: block;
		position: relative;
		user-select: none;

		&::before,
		&::after {
			content: "ADMIN";
		}

		&:before,
		&:after {
			position: absolute;
			left: 0;
			top: 0;
		}

		&:before {
			color: var(--color-text-primary);
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
			-webkit-transform: translate3d(3px, 3px, 3px);
			transform: translate3d(3px, 3px, 3px);
		}

		50% {
			-webkit-transform: translate3d((-3px, 3px, -3px));
			transform: translate3d((-3px, 3px, -3px));
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
@/global.config
