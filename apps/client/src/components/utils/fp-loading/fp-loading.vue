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
  /* 建议将 position: absolute 改为 position: fixed，
     以确保遮罩覆盖整个视口，不只是父元素。 */
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease-in-out; /* 增加 ease-in-out 让过渡更平滑 */
}

/* 🚀 关键修改：使用 Vue 3 标准的 *-enter-from 类名来定义进场的起始状态 */
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 如果你的项目仍然使用 Vue 2，保留下面的旧类名也是可行的 */
/* .fade-enter { opacity: 0; } */

</style>
