<script setup lang="ts">
import { ref, VNode, isVNode, computed } from "vue";
import FpDialog from "../fp-dialog/fp-dialog.vue";
import { UISchema, FormSchema } from "@mine-monopoly/types";
import UiRenderer from "../ui-renderer/ui-renderer.vue";
import CustomForm from "../custom-form/index.vue";
import { useGameData } from "@src/store/game";
import { parseRichText } from "@mine-monopoly/utils";

export interface Props {
	title?: string;
	content?: string | VNode | (() => VNode) | UISchema;
	form?: FormSchema[];
	confirmText?: string;
	cancelText?: string;
	showCancel?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	title: "提示",
	confirmText: "确认",
	cancelText: "",
});

const emits = defineEmits<{
	confirm: [data?: any]; // 修改为支持传递数据
	cancel: [];
	close: [];
}>();

// 解析富文本内容
const parsedContent = computed(() => {
	if (typeof props.content === "string") {
		return parseRichText(props.content);
	}
	return props.content;
});

const formData = ref<Record<string, any>>({}); // 存储表单数据

// 监听表单数据变化（由 UiRenderer 或 CustomForm 触发）
const handleFormChange = (data: Record<string, any>) => {
	formData.value = data;
};

const visible = ref(false);

const open = () => {
	visible.value = true;
};

defineExpose({ open });

const handleConfirm = () => {
	// 检查是否有表单数据
	// 优先检查 props.form，其次检查 props.content 是否为 UISchema
	const hasForm = props.form || (props.content && typeof props.content === "object" && "type" in props.content);
	const dataToSubmit = hasForm ? formData.value : undefined;

	emits("confirm", dataToSubmit);
	visible.value = false;
};

const handleCancel = () => {
	emits("cancel");
	visible.value = false;
};

const handleDialogClose = () => {
	emits("close");
};
</script>

<template>
	<FpDialog
		v-model:visible="visible"
		:title="title"
		:hidden-footer="true"
		:append-to-body="true"
		style="min-width: 26rem; max-width: 90vw"
		@cancel="handleDialogClose"
	>
		<div class="message-content">
			<!-- 渲染 content -->
			<component v-if="isVNode(parsedContent)" :is="parsedContent" />
			<div v-else-if="typeof parsedContent === 'string'" v-html="parsedContent"></div>
			<UiRenderer
				v-else-if="parsedContent && typeof parsedContent === 'object' && 'type' in parsedContent"
				:context="useGameData().$state"
				:schema="parsedContent as UISchema"
				@update:model-value="handleFormChange"
			/>

			<!-- 渲染 form（如果有） -->
			<CustomForm
				v-if="form"
				:schema="form"
				:submit-text="undefined"
				@update:model-value="handleFormChange"
			/>
		</div>

		<div class="message-footer">
			<button v-if="cancelText" class="btn-cancel" @click="handleCancel">
				{{ cancelText }}
			</button>

			<button class="btn-confirm" @click="handleConfirm">
				{{ confirmText }}
			</button>
		</div>
	</FpDialog>
</template>

<style lang="scss" scoped>
.message-content {
	padding: 10px 0 20px 0;
	font-size: 1rem;
	color: var(--color-text-regular, #333);
	line-height: 1.5;

	// 支持 \n 换行符
	// 使用 pre-line 保留换行符，但折叠其他空白
	white-space: pre-line;

	// 在表单前添加 margin
	:deep(.custom-form) {
		margin-top: 1rem;
	}
}

.message-footer {
	display: flex;
	justify-content: flex-end;
	gap: 12px;
	margin-top: 10px;

	button {
		padding: 0.5em 1.2em;
		border-radius: 6px;
		font-size: 1rem;
		cursor: pointer;
		border: none;
		transition: filter 0.2s;

		&.btn-confirm {
			background-color: var(--color-second);
			color: white;

			&:hover {
				filter: brightness(0.9);
			}
		}

		&.btn-cancel {
			border: 1px solid #b0b1b3;
			background-color: #ffffff;
			color: var(--color-third);
			border-color: var(--color-third);
			text-shadow: none;

			&:hover {
				filter: brightness(0.95);
			}
		}
	}
}
</style>
