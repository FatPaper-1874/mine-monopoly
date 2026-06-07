<script setup lang="ts">
import { ref, computed, onErrorCaptured, type Component, VNode } from "vue";
import FpDialog from "@src/components/utils/fp-dialog/fp-dialog.vue";
import type { ErrorBoundaryProps } from "./types";
import { FPMessage } from "@mine-monopoly/ui";

/**
 * Slots
 */
defineSlots<{
	default?: () => VNode[];
	title?: () => VNode[];
}>();

/**
 * Props
 */
const props = withDefaults(defineProps<ErrorBoundaryProps>(), {
	retryable: true,
	showDetails: false,
	devShowDetails: true,
});

/**
 * Emits
 */
const emits = defineEmits<{
	"update:visible": [value: boolean];
	back: [];
}>();

/**
 * 错误状态
 */
const hasError = ref(false);
const error = ref<Error | null>(null);
const errorInfo = ref("");
const showDialog = ref(false);

/**
 * 捕获子组件错误
 */
onErrorCaptured((err: Error, instance, info) => {
	console.error("[FpErrorBoundary] 捕获到错误:", err, info);

	hasError.value = true;
	error.value = err;
	errorInfo.value = info;
	showDialog.value = true;

	// 调用错误回调
	props.onError?.(err, instance, info);

	// 阻止错误继续传播
	return false;
});

/**
 * 是否显示详细错误信息
 */
const shouldShowDetails = computed(() => {
	return props.showDetails || (props.devShowDetails && import.meta.env.DEV);
});

/**
 * 重试：重新渲染子组件
 */
function handleRetry() {
	hasError.value = false;
	error.value = null;
	errorInfo.value = "";
	showDialog.value = false;
}

/**
 * 返回：触发事件由父组件处理
 */
function handleBack() {
	showDialog.value = false;
	emits("back"); // 触发事件，由父组件决定导航行为
}

/**
 * 复制错误信息
 */
function handleCopyError() {
	const errorText = `错误信息: ${error.value?.message}\n\n堆栈:\n${error.value?.stack || "无"}\n\n组件信息: ${errorInfo.value}`;

	navigator.clipboard
		.writeText(errorText)
		.then(() => {
			// 使用 FPMessage 显示复制成功（如果可用）
			FPMessage({ type: "success", message: "错误信息已复制到剪贴板" });
		})
		.catch((err) => {
			console.error("复制失败:", err);
		});
}

/**
 * 格式化错误消息
 */
const formattedErrorMessage = computed(() => {
	if (!error.value) return "";
	return error.value.message || "未知错误";
});

/**
 * 格式化堆栈信息
 */
const formattedStack = computed(() => {
	if (!error.value) return "";
	return error.value.stack || "无堆栈信息";
});
</script>

<template>
	<div class="fp-error-boundary-root">
		<slot v-if="!hasError" />

		<component v-else-if="fallback" :is="fallback" :error="error" :errorInfo="errorInfo" @retry="handleRetry" />

		<FpDialog
			v-else
			v-model:visible="showDialog"
			title="出错了"
			:closable="false"
			:hidden-footer="false"
			confirm-text="重试"
			cancel-text="返回"
			@submit="handleRetry"
			@cancel="handleBack"
		>
			<div class="error-boundary-content">
				<div class="error-icon">⚠️</div>
				<div class="error-message">该组件遇到问题，已停止运行</div>
				<div class="error-text">{{ formattedErrorMessage }}</div>

				<template v-if="shouldShowDetails">
					<div class="error-details">
						<div class="error-details-header">
							<span>详细信息</span>
							<button class="copy-button btn-small" @click="handleCopyError">复制错误信息</button>
						</div>
						<div class="error-details-content">
							<div class="error-details-section">
								<div class="section-title">错误信息:</div>
								<div class="section-content">{{ formattedErrorMessage }}</div>
							</div>
							<div class="error-details-section" v-if="errorInfo">
								<div class="section-title">组件信息:</div>
								<div class="section-content">{{ errorInfo }}</div>
							</div>
							<div class="error-details-section">
								<div class="section-title">堆栈:</div>
								<pre class="section-content stack-trace">{{ formattedStack }}</pre>
							</div>
						</div>
					</div>
				</template>
			</div>
		</FpDialog>
	</div>
</template>

<style lang="scss" scoped>
@use "@src/assets/variables" as *;
@use "@mine-monopoly/style/variables" as fp;

.fp-error-boundary-root {
	width: inherit;
	height: inherit;
	display: flex;
	align-items: center;
	justify-content: center;
}

.error-boundary-content {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 1rem;
	min-width: 300px;
}

.error-icon {
	font-size: 3rem;
	margin-bottom: 1rem;
}

.error-message {
	font-size: 1.2rem;
	font-weight: bold;
	margin-bottom: 0.5rem;
	text-align: center;
}

.error-text {
	color: #666;
	margin-bottom: 1rem;
	text-align: center;
}

.error-details {
	width: 100%;
	margin-top: 1rem;
	border: 1px solid var(--fp-color-border, #ddd);
	border-radius: 6px;
	overflow: hidden;
}

.error-details-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 0.5rem 1rem;
	background-color: var(--fp-color-bg-light, #f5f5f5);
	border-bottom: 1px solid var(--fp-color-border, #ddd);
	font-weight: bold;

	.copy-button {
		padding: 0.25rem 0.75rem;
		font-size: 0.875rem;
		border-radius: 4px;
		border: 1px solid var(--fp-color-tertiary);
		background-color: white;
		cursor: pointer;
		transition: filter 0.2s;

		&:hover {
			filter: brightness(0.95);
		}
	}
}

.error-details-content {
	padding: 1rem;
	max-height: 300px;
	overflow-y: auto;
}

.error-details-section {
	margin-bottom: 1rem;

	&:last-child {
		margin-bottom: 0;
	}
}

.section-title {
	font-weight: bold;
	margin-bottom: 0.25rem;
	color: var(--fp-color-text-regular, #333);
}

.section-content {
	padding: 0.5rem;
	background-color: var(--fp-color-bg-light, #f9f9f9);
	border-radius: 4px;
	font-family: monospace;
	font-size: 0.875rem;
	white-space: pre-wrap;
	word-break: break-word;
}

.stack-trace {
	margin: 0;
	max-height: 200px;
	overflow-y: auto;
}
</style>
