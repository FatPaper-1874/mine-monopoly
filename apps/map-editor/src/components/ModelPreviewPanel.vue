<script setup lang="ts">
import { ModelPreviewerRenderer } from "@src/utils/three/ModelPreviewerRenderer";
import type { TransformState } from "@src/utils/file/model-bake";
import { watch, onBeforeUnmount, ref } from "vue";

const props = defineProps<{
  url: string;
  transform: TransformState;
  showGuides?: boolean;
}>();

const containerRef = ref<HTMLDivElement>();
let renderer: ModelPreviewerRenderer | null = null;
let loadId = 0;
let isDestroyed = false;

watch(containerRef, (el) => {
  if (el) {
    renderer = new ModelPreviewerRenderer(el, props.showGuides);
    if (props.url) {
      loadModel(props.url);
    }
  }
});

watch(() => props.url, (newUrl) => {
  if (!renderer || isDestroyed) return;
  if (!newUrl) {
    renderer.clear();
    renderer.stopRenderLoop();
    return;
  }
  loadModel(newUrl);
});

function loadModel(url: string) {
  if (!renderer) return;
  const currentLoadId = ++loadId;
  renderer.startRenderLoop();
  renderer.loadModel(url, true)
    .then(() => {
      if (currentLoadId !== loadId || isDestroyed || !renderer) return;
      renderer.setTransform(
        props.transform.position,
        props.transform.rotation,
        props.transform.scale
      );
    })
    .catch((err) => {
      if (currentLoadId !== loadId || isDestroyed) return;
      console.error("模型加载失败:", err);
      renderer?.clear();
      renderer?.stopRenderLoop();
    });
}

watch(() => props.transform, (t) => {
  if (!renderer || isDestroyed) return;
  renderer.setTransform(t.position, t.rotation, t.scale);
}, { deep: true });

onBeforeUnmount(() => {
  isDestroyed = true;
  renderer?.stopRenderLoop();
  renderer?.destroy();
  renderer = null;
});
</script>

<template>
  <div ref="containerRef" class="model-preview-panel">
    <div v-if="!url" class="empty-hint">请选择模型文件</div>
  </div>
</template>

<style lang="scss" scoped>
.model-preview-panel {
  width: 100%;
  height: 400px;
  border-radius: 8px;
  background-color: #eeeeee;
  overflow: hidden;
  position: relative;
}

.empty-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 14px;
}
</style>
