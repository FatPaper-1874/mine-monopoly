<script setup lang="ts">
import { readBufferToFile, convertToFpUrl, convertFpUrlToPath } from "@src/utils/file";
import { ResourcePicker } from "@src/components/resource-picker";
import ModelPreviewPanel from "@src/components/ModelPreviewPanel.vue";
import type { TransformState } from "@src/utils/file/model-bake";
import { DEFAULT_TRANSFORM } from "@src/utils/file/model-bake";
import TransformPanel from "./TransformPanel.vue";
import { bakeModelTransform } from "@src/utils/file/model-bake";
import { reactive, ref, watch } from "vue";
import { useResourceStore } from "@src/stores";
import { message } from "ant-design-vue";
import { generateShortId } from "@src/utils/short-id";

interface FormState {
  name: string;
  modelId: string;
  tempFilePath?: string;
}

const props = defineProps<{
  editModelId?: string;
}>();

const visible = defineModel({ default: false });
const resourceStore = useResourceStore();

const formState = reactive<FormState>({
  name: "",
  modelId: "",
});

const transformState = ref<TransformState>({ ...DEFAULT_TRANSFORM });
const previewUrl = ref("");

function resetAll() {
  formState.name = "";
  formState.modelId = "";
  formState.tempFilePath = undefined;
  transformState.value = { ...DEFAULT_TRANSFORM };
  previewUrl.value = "";
}

watch(visible, (isOpen) => {
  if (isOpen) {
    if (props.editModelId) {
      const target = resourceStore.findModelById(props.editModelId);
      if (target) {
        formState.name = target.name;
        formState.modelId = target.id;
        previewUrl.value = target.url;
      }
    } else {
      resetAll();
    }
  }
});

function handleResourceChange(resource: any) {
  if (resource && resource.url) {
    const fpUrl = convertToFpUrl(resource.url);
    formState.tempFilePath = fpUrl;
    previewUrl.value = fpUrl;
  }
}

async function handleConfirm() {
  if (!formState.name.trim()) {
    message.error("请输入模型名称");
    return;
  }

  try {
    if (props.editModelId) {
      const oldModel = resourceStore.findModelById(props.editModelId);
      if (!oldModel) {
        message.error("找不到该模型");
        return;
      }
      const sourceUrl = formState.tempFilePath || oldModel.url;
      const { buffer } = await bakeModelTransform(sourceUrl, { ...transformState.value });
      await window.electronAPI.saveLocalFile(
        convertFpUrlToPath(oldModel.url),
        new Uint8Array(buffer)
      );
      resourceStore.updateModel({
        id: props.editModelId,
        name: formState.name,
        fileType: oldModel.fileType,
        url: oldModel.url,
      });
      message.success(`编辑模型 "${formState.name}" 成功`, 1);
    } else {
      const sourcePath = formState.tempFilePath;
      if (!sourcePath) {
        message.error("请选择模型文件");
        return;
      }
      const { buffer, fileType } = await bakeModelTransform(sourcePath, { ...transformState.value });
      const id = generateShortId("model");
      const absPath = await readBufferToFile(new Uint8Array(buffer), `temp/${id}.${fileType}`);
      const fpUrl = convertToFpUrl(absPath);
      resourceStore.addModel({ id, name: formState.name, fileType, url: fpUrl });
      message.success(`添加模型 "${formState.name}" 成功`, 1);
    }
  } catch (e: any) {
    message.error(`保存模型失败: ${e.message || "未知错误"}`, 2);
    return;
  }
  visible.value = false;
}
</script>

<template>
  <a-modal
    destroyOnClose
    :footer="null"
    width="70%"
    v-model:open="visible"
    :title="props.editModelId ? '编辑模型' : '添加模型'"
    :body-style="{ overflow: 'hidden' }"
  >
    <div class="edit-form-layout">
      <div class="form-top">
        <a-form @finish="handleConfirm" :model="formState" layout="inline" class="top-form">
          <a-form-item label="模型名称" required>
            <a-input v-model:value="formState.name" placeholder="请输入模型名称" style="width: 200px" />
          </a-form-item>
          <a-form-item label="模型文件" required>
            <ResourcePicker
              type="model"
              v-model="formState.modelId"
              :auto-save="false"
              :hide-preview="true"
              @change="handleResourceChange"
            />
          </a-form-item>
        </a-form>
      </div>

      <div class="edit-body">
        <div class="preview-side">
          <ModelPreviewPanel :url="previewUrl" :transform="transformState" show-guides />
        </div>
        <div class="control-side">
          <TransformPanel v-model="transformState" />
          <a-button type="primary" @click="handleConfirm" style="width: 100%; margin-top: 12px">
            {{ props.editModelId ? '保存修改' : '添加' }}
          </a-button>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<style lang="scss" scoped>
.edit-form-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-top {
  flex-shrink: 0;
}

.top-form {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.edit-body {
  display: flex;
  gap: 20px;
  flex: 1;
  min-height: 0;
}

.preview-side {
  flex: 1;
  min-width: 0;
}

.control-side {
  width: 340px;
  flex-shrink: 0;
  overflow-y: auto;
  max-height: 62vh;
}
</style>
