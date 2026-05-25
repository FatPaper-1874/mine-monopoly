<template>
  <div class="resource-picker">
    <div v-if="!props.hidePreview" class="preview-section">
      <ImagePreview v-if="type === 'image'" :url="displayUrl" />
      <ModelPreview v-else-if="type === 'model'" :url="displayUrl" />
    </div>

    <div class="action-section">
      <a-button
        :loading="isLoading"
        :disabled="disabled"
        @click="handleSelect"
        type="primary"
        size="small"
      >
        {{ buttonText }}
      </a-button>

      <a-button
        v-if="resourceId || displayUrl"
        :disabled="disabled"
        @click="handleClear"
        size="small"
      >
        清除
      </a-button>
    </div>

    <div v-if="displayUrl" class="url-display">
      {{ displayUrl }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ImagePreview from './previews/ImagePreview.vue'
import ModelPreview from './previews/ModelPreview.vue'
import { useResourcePicker } from './use-resource-picker'
import type { ResourcePickerProps, ResourcePickerEmits } from './types'

const props = withDefaults(defineProps<ResourcePickerProps>(), {
  disabled: false,
  acceptTypes: () => [],
  autoSave: true,
  hidePreview: false
})

const emit = defineEmits<ResourcePickerEmits>()

const {
  resourceId,
  resourceUrl,
  isLoading,
  selectResource,
  clearResource
} = useResourcePicker({
  type: props.type,
  initialId: props.modelValue,
  autoSave: props.autoSave
})

const displayUrl = computed(() => {
  return resourceUrl.value
})

const buttonText = computed(() => {
  return resourceId.value || displayUrl.value ? '更换资源' : '选择资源'
})

async function handleSelect() {
  const selectedFilePath = await selectResource()

  // If a file path was returned (autoSave: false mode), emit it
  if (selectedFilePath) {
    emit('change', { id: resourceId.value || '', name: '', fileType: '', url: selectedFilePath } as any)
    // In autoSave: false mode, don't update modelValue to keep the original ID
    return
  }

  emit('update:modelValue', resourceId.value || '')
}

function handleClear() {
  clearResource()
  emit('update:modelValue', '')
}
</script>

<style lang="scss" scoped>
.resource-picker {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .preview-section {
    width: 100%;
  }

  .action-section {
    display: flex;
    gap: 8px;
  }

  .url-display {
    padding: 5px;
    border: 1px solid #ccc;
    border-radius: 5px;
    background-color: #f3f3f3;
    word-break: break-all;
    font-size: 12px;
    color: #666;
  }
}
</style>
