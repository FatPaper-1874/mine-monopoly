<script setup lang="ts">
import { useLoading } from "@src/store/index";
import { computed, watch } from "vue";

const loadingStore = useLoading();
const loading = computed(() => loadingStore.loading);
const loadingText = computed(() => loadingStore.text);
const progress = computed(() => loadingStore.progress);

watch(loading, (newValue) => {
	if (!newValue) {
		loadingStore.text = "";
		loadingStore.progress = 0;
	}
});
</script>

<template>
	<transition name="fade">
		<div v-if="loading" class="page-loading">
			<div class="spinner"></div>
			<span>{{ loadingText }}</span>
			<!-- 进度条 -->
			<div v-if="progress > 0" class="progress-container">
				<div class="progress-bar">
					<div class="progress-fill" :style="{ width: progress + '%' }"></div>
				</div>
				<span class="progress-text">{{ Math.round(progress) }}%</span>
			</div>
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
  z-index: var(--z-loading);

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

// 进度条样式
.progress-container {
  margin-top: 1em;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5em;
  width: 200px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #ff8f00;
  transition: width 0.3s ease;
}

.progress-text {
  color: #eeeeee;
  font-size: 0.9em;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
