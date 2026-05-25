<script setup lang="ts">
import type { TransformState } from "@src/utils/file/model-bake";
import { DEFAULT_TRANSFORM } from "@src/utils/file/model-bake";
import { reactive, ref, watch } from "vue";

const props = defineProps<{
  modelValue: TransformState;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: TransformState];
}>();

const RANGES = {
  position: { min: -10, max: 10, step: 0.1 },
  rotation: { min: 0, max: 360, step: 15 },
  scale: { min: 0.1, max: 5, step: 0.1 },
} as const;

const local = reactive<TransformState>({
  position: { ...props.modelValue.position },
  rotation: { ...props.modelValue.rotation },
  scale: { ...props.modelValue.scale },
});

const uniformScale = ref(true);
let ignoreSync = false;

function setScale(axis: "x" | "y" | "z", val: number) {
  if (uniformScale.value) {
    local.scale.x = val;
    local.scale.y = val;
    local.scale.z = val;
  } else {
    local.scale[axis] = val;
  }
  emitUpdate();
}

watch(() => props.modelValue, (v) => {
  if (ignoreSync) return;
  local.position = { ...v.position };
  local.rotation = { ...v.rotation };
  local.scale = { ...v.scale };
}, { deep: true });

function emitUpdate() {
  ignoreSync = true;
  emit("update:modelValue", {
    position: { ...local.position },
    rotation: { ...local.rotation },
    scale: { ...local.scale },
  });
  // Reset flag after microtask to let Vue finish the prop update cycle
  setTimeout(() => { ignoreSync = false; }, 0);
}

function reset() {
  local.position = { ...DEFAULT_TRANSFORM.position };
  local.rotation = { ...DEFAULT_TRANSFORM.rotation };
  local.scale = { ...DEFAULT_TRANSFORM.scale };
  emitUpdate();
}
</script>

<template>
  <div class="transform-panel">
    <div class="transform-group">
      <span class="group-label">位置</span>
      <div class="axis-row" v-for="axis in (['x', 'y', 'z'] as const)" :key="'pos'+axis">
        <span class="axis-label">{{ axis.toUpperCase() }}</span>
        <a-slider
          :min="RANGES.position.min" :max="RANGES.position.max" :step="RANGES.position.step"
          v-model:value="local.position[axis]"
          @change="emitUpdate"
          class="axis-slider"
        />
        <a-input-number
          :min="RANGES.position.min" :max="RANGES.position.max" :step="RANGES.position.step"
          v-model:value="local.position[axis]"
          @change="emitUpdate"
          size="small"
          class="axis-input"
        />
      </div>
    </div>

    <div class="transform-group">
      <span class="group-label">旋转</span>
      <div class="axis-row" v-for="axis in (['x', 'y', 'z'] as const)" :key="'rot'+axis">
        <span class="axis-label">{{ axis.toUpperCase() }}</span>
        <a-slider
          :min="RANGES.rotation.min" :max="RANGES.rotation.max" :step="RANGES.rotation.step"
          v-model:value="local.rotation[axis]"
          @change="emitUpdate"
          class="axis-slider"
        />
        <a-input-number
          :min="RANGES.rotation.min" :max="RANGES.rotation.max" :step="RANGES.rotation.step"
          v-model:value="local.rotation[axis]"
          @change="emitUpdate"
          size="small"
          class="axis-input"
        />
      </div>
    </div>

    <div class="transform-group">
      <span class="group-label">
        缩放
        <a-switch v-model:checked="uniformScale" size="small" style="margin-left: 8px" />
        <span style="font-weight: 400; font-size: 11px; margin-left: 4px">统一</span>
      </span>
      <div class="axis-row" v-for="axis in (['x', 'y', 'z'] as const)" :key="'scale'+axis">
        <span class="axis-label">{{ axis.toUpperCase() }}</span>
        <a-slider
          :min="RANGES.scale.min" :max="RANGES.scale.max" :step="RANGES.scale.step"
          :value="local.scale[axis]"
          @change="(v: number) => setScale(axis, v)"
          class="axis-slider"
        />
        <a-input-number
          :min="RANGES.scale.min" :max="RANGES.scale.max" :step="RANGES.scale.step"
          :value="local.scale[axis]"
          @change="(v: number | null) => setScale(axis, v ?? 1)"
          size="small"
          class="axis-input"
        />
      </div>
    </div>

    <a-button @click="reset" size="small">重置变换</a-button>
  </div>
</template>

<style lang="scss" scoped>
.transform-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.transform-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.group-label {
  font-weight: 600;
  font-size: 12px;
  color: #333;
}

.axis-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.axis-label {
  width: 16px;
  font-size: 12px;
  color: #666;
  text-align: center;
  flex-shrink: 0;
}

.axis-slider {
  flex: 1;
}

.axis-input {
  width: 70px;
  flex-shrink: 0;
}
</style>
