<script setup lang="ts">
import { ref, PropType, computed } from "vue";
import FpDialog from "../fp-dialog/fp-dialog.vue";
import ItemSelector from "./item-selector.vue";
import HtmlRenderer from "../ui-renderer/ui-renderer.vue";
import type { UISchema } from "@mine-monopoly/types";
import { parseRichText } from "@mine-monopoly/utils";

// 定义接收的参数
const props = defineProps({
	// ItemSelector 需要的参数
	itemList: { type: Array as PropType<any[]>, default: () => [] },
	column: { type: Number, default: 3 },
	keyName: { type: String, default: "id" },
	multiple: { type: [Number, Boolean] as PropType<number | boolean>, default: 1 },
	selectedKey: { type: [String, Array] as PropType<string | string[]>, default: "" },
	// 弹窗参数
	title: { type: String, default: "请选择" },
	// 用于自定义 item 显示的渲染函数 (可选)
	renderItem: { type: Function, default: undefined },
	// 对话框内容（字符串或 UI Schema），显示在物品列表之前（可选）
	content: { type: [String, Object] as PropType<string | UISchema>, default: undefined },
	// 按钮文本
	confirmText: { type: String, default: "确认" },
	cancelText: { type: String, default: undefined },
});

const emit = defineEmits(["confirm", "cancel"]);

const visible = ref(false);
const currentSelected = ref<string | string[]>(props.multiple ? [] : "");

// 解析富文本内容
const parsedContent = computed(() => {
	if (typeof props.content === "string") {
		return parseRichText(props.content);
	}
	return props.content;
});

// 规范化为数组，用于传递给 ItemSelector
const normalizedSelectedKey = computed(() => {
	if (Array.isArray(currentSelected.value)) {
		return currentSelected.value;
	}
	return currentSelected.value ? [currentSelected.value] : [];
});

// 规范化 multiple 参数
const normalizedMaxSelect = computed(() => {
	if (props.multiple === true) return 999;
	if (props.multiple === false || props.multiple === undefined) return 1;
	return typeof props.multiple === 'number' ? Math.max(1, props.multiple) : 1;
});

const isMultiple = computed(() => normalizedMaxSelect.value > 1);

// 初始化数据
const init = () => {
	if (isMultiple.value) {
		currentSelected.value = Array.isArray(props.selectedKey) ? [...props.selectedKey] : [];
	} else {
		currentSelected.value = props.selectedKey;
	}
	visible.value = true;
};

// 暴露给函数式调用
defineExpose({ init });

const handleSubmit = () => {
	// 始终返回数组格式，单选时返回包含单个元素的数组
	const result = isMultiple.value
		? (currentSelected.value as string[])
		: [currentSelected.value as string].filter(Boolean);
	emit("confirm", result);
	visible.value = false;
};

const handleSelectedKeyUpdate = (value: string[]) => {
	currentSelected.value = isMultiple.value ? value : (value[0] || "");
};

const handleCancel = () => {
	emit("cancel");
	visible.value = false;
};
</script>

<template>
	<FpDialog
		v-model:visible="visible"
		:append-to-body="false"
		:confirm-text="confirmText"
		:cancel-text="cancelText"
		@submit="handleSubmit"
		@cancel="handleCancel"
	>
		<template #title>{{ title }}</template>

		<div class="selector-container">
			<!-- 内容区域 -->
			<div v-if="parsedContent" class="dialog-content">
				<html-renderer v-if="typeof parsedContent === 'object'" :schema="parsedContent" :context="{}" />
				<div v-else class="text-content">{{ parsedContent }}</div>
			</div>

			<!-- 物品选择器 -->
			<ItemSelector
				:column="column"
				:item-list="itemList"
				:key-name="keyName"
				:multiple="multiple"
				:selected-key="normalizedSelectedKey"
				@update:selected-key="handleSelectedKeyUpdate"
			>
				<template #item="itemProps">
					<component v-if="renderItem" :is="renderItem(itemProps)" />
					<div v-else class="default-item-content">
						{{ itemProps.name || itemProps[keyName] }}
					</div>
				</template>
			</ItemSelector>
		</div>
	</FpDialog>
</template>

<style scoped>
.selector-container {
	/* 限制高度，防止弹窗过长 */
	max-height: 60vh;
	overflow-y: auto;
	padding: 10px;
}

.dialog-content {
	margin-bottom: 1rem;
	color: var(--color-primary);
	text-align: center;
}

.dialog-content .text-content {
	white-space: pre-wrap;
	word-wrap: break-word;
	line-height: 1.6;
}

.default-item-content {
	padding: 20px;
	text-align: center;
	font-weight: bold;
}
</style>
