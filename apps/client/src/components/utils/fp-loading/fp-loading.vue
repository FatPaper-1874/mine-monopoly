<script setup lang="ts">
import { useLoading } from "@src/store/index";
import { computed, watch } from "vue";

const loadingStore = useLoading();
const loading = computed(() => loadingStore.loading);
const loadingText = computed(() => loadingStore.text);

watch(loading, (newValue) => {
	if (!newValue) loadingStore.text = "";
});
</script>

<template>
	<transition name="fade">
		<div v-if="loading" class="page-loading">
			<div class="spinner"></div>
			<span>{{ loadingText }}</span>
		</div>
	</transition>
</template>

<style lang="scss" scoped>
.page-loading {
	position: fixed;
	top: 0;
	left: 0;
	bottom: 0;
	right: 0;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	background-color: rgba(0, 0, 0, 0.5);
	z-index: 999999999999;

	& > span {
		margin-top: 0.8em;
		color: #eeeeee;
	}
}

.spinner {
	width: 50px;
	height: 50px;
	border-radius: 50%;
	border: 0.2rem solid white;
	border-top-color: transparent;
	animation: spin 1s linear infinite;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.5s;
}

.fade-enter,
.fade-leave-to {
	opacity: 0;
}
</style>
