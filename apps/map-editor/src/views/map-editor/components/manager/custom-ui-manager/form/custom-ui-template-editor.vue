<script setup lang="ts">
import { ref } from "vue";
import { message } from "ant-design-vue"; // 引入 message 用于提示
import { UITemplate } from "@mine-monopoly/types";
import UiSchemaForm from "./ui-schema-form.vue";

const props = defineProps<{ data: UITemplate }>();
const emit = defineEmits(["save", "cancel"]);

// 本地深拷贝
const localData = ref<UITemplate>(JSON.parse(JSON.stringify(props.data)));

// 初始化 slug (防止旧数据没有这个字段)
if (!localData.value.slug) {
	localData.value.slug = "";
}

function handleSave() {
	// 1. 校验名称
	if (!localData.value.name.trim()) {
		localData.value.name = "未命名组件";
	}

	// 2. 校验标识符 (Slug) - 核心逻辑
	const slug = localData.value.slug?.trim();
	if (!slug) {
		message.warning("请填写组件标识 (Slug)，用于代码引用");
		return;
	}

	// 正则校验：只允许字母、数字、下划线、连字符
	if (!/^[a-zA-Z0-9_\-]+$/.test(slug)) {
		message.error("组件标识包含非法字符，仅支持字母、数字、下划线、连字符");
		return;
	}

	// 回填 trim 后的值
	localData.value.slug = slug;

	emit("save", localData.value);
}
</script>

<template>
	<div class="template-editor-wrapper">
		<div class="editor-header">
			<div class="left">
				<div class="input-group">
					<span class="label">名称:</span>
					<a-input v-model:value="localData.name" placeholder="组件名称 (如: 商店面板)" style="width: 200px" />
				</div>

				<div class="input-group">
					<span class="label">标识:</span>
					<a-tooltip title="唯一标识符，代码中通过 $ui__标识符 来引用">
						<a-input
							v-model:value="localData.slug"
							placeholder="unique_slug"
							addon-before="$ui__"
							style="width: 240px"
						/>
					</a-tooltip>
				</div>

				<span class="id-tag">UUID: {{ localData.id }}</span>
			</div>

			<div class="right">
				<a-button @click="$emit('cancel')" style="margin-right: 8px">取消</a-button>
				<a-button type="primary" @click="handleSave">保存组件</a-button>
			</div>
		</div>

		<div class="editor-body">
			<UiSchemaForm v-model="localData.template" />
		</div>
	</div>
</template>

<style scoped lang="scss">
.template-editor-wrapper {
	display: flex;
	flex-direction: column;
	height: 80vh;
	background: #fff;
}

.editor-header {
	height: 64px;
	border-bottom: 1px solid #e8e8e8;
	padding: 0 24px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: #fff;
	flex-shrink: 0;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
	z-index: 10;

	.left {
		display: flex;
		align-items: center;
		gap: 24px; // 增加间距

		.input-group {
			display: flex;
			align-items: center;
			gap: 8px;
		}

		.label {
			font-weight: 600;
			color: #333;
			font-size: 14px;
		}

		.id-tag {
			font-family: "Fira Code", monospace;
			color: #bfbfbf;
			background: #f5f5f5;
			padding: 2px 8px;
			border-radius: 4px;
			font-size: 12px;
			user-select: all; /* 允许全选复制 ID */
		}
	}
}

.editor-body {
	flex: 1;
	overflow: hidden;
	padding: 0; /* UiSchemaForm 通常自带 padding 或不需要 padding */
	background: #f0f2f5;
	position: relative;
}
</style>
