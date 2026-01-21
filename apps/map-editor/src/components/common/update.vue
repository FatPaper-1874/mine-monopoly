<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
// 1. 引入 message 组件
import { message } from "ant-design-vue";

// 定义状态类型
type UpdateStatus = "checking" | "available" | "downloading" | "downloaded" | "error";

// 响应式数据
const visible = ref(false);
const status = ref<UpdateStatus>();
const version = ref("");
const releaseNote = ref("");
const downloadPercent = ref(0);
const errorMsg = ref("");

let removeListener: (() => void) | null = null;

const title = computed(() => {
	switch (status.value) {
		case "available":
			return "✨ 发现新版本";
		case "downloading":
			return "🚀 正在更新...";
		case "downloaded":
			return "✅ 准备就绪";
		case "error":
			return "❌ 更新失败";
		default:
			return "系统更新";
	}
});

const startDownload = () => {
	status.value = "downloading";
	window.updateAPI.startDownload();
};

const install = () => {
	window.updateAPI.quitAndInstall();
};

const close = () => {
	visible.value = false;
};

onMounted(() => {
	if (window.updateAPI) {
		status.value = "checking";
		window.updateAPI.checkForUpdate();

		removeListener = window.updateAPI.onUpdateStatus((data: any) => {
			console.log("[Updater]", data);

			switch (data.status) {
				case "available":
					status.value = "available";
					version.value = data.info.version;
					releaseNote.value = (data.info.releaseNotes as string) || "修复了一些已知问题，优化了游戏体验。";
					visible.value = true;
					break;

				case "progress":
					status.value = "downloading";
					downloadPercent.value = Math.floor(data.progress.percent);
					if (!visible.value) visible.value = true;
					break;

				case "downloaded":
					status.value = "downloaded";
					visible.value = true;
					break;

				case "error":
					const serverErrorMsg = data.error || "未知错误";

					if (status.value === "downloading") {
						status.value = "error";
						errorMsg.value = "网络连接中断，请稍后重试。";
					} else {
						status.value = "error";
						message.error(`检查更新失败: ${serverErrorMsg}`);
					}
					break;
				case "checking":
					status.value = "checking";
					break;
			}
		});
	}
});

onUnmounted(() => {
	if (removeListener) removeListener();
});
</script>

<template>
	<a-modal
		v-model:open="visible"
		:title="title"
		:closable="status !== 'downloading'"
		:footer="null"
		:maskClosable="false"
		:width="400"
		centered
		class="update-modal"
	>
		<div class="update-content">
			<div v-if="status === 'available'" class="scene-box">
				<div class="version-row">
					<a-tag color="#6200ea">版本: {{ version }}</a-tag>
				</div>
				<div class="note-box">
					<div class="note-label">更新内容：</div>
					<div class="note-text" v-html="releaseNote"></div>
				</div>
			</div>

			<div v-if="status === 'downloading'" class="scene-box centered">
				<a-progress :percent="downloadPercent" :stroke-color="{ '0%': '#8e24aa', '100%': '#6200ea' }" status="active" />
				<p class="sub-text" style="margin-top: 12px">正在下载资源，请勿关闭游戏...</p>
			</div>

			<div v-if="status === 'downloaded'" class="scene-box centered">
				<div class="icon-success">
					<FontAwesomeIcon icon="check-circle" />
				</div>
				<p class="main-text">更新包已就绪</p>
				<p class="sub-text">重启游戏即可生效</p>
			</div>

			<div v-if="status === 'error'" class="scene-box centered">
				<p class="error-text">{{ errorMsg }}</p>
			</div>

			<div class="custom-footer">
				<a-button v-if="status === 'available'" @click="close"> 稍后提醒 </a-button>

				<a-button
					v-if="status === 'available' || status === 'error'"
					type="primary"
					class="btn-purple"
					@click="startDownload"
				>
					{{ status === "error" ? "重试" : "立即更新" }}
				</a-button>

				<a-button v-if="status === 'downloaded'" type="primary" class="btn-success" @click="install">
					立即重启
				</a-button>
			</div>
		</div>
	</a-modal>
</template>

<style lang="scss" scoped>
$primary-color: #1878ff;
$success-color: #52c41a;
$error-color: #ff4d4f;
$bg-color-light: #f5f5f5;

.update-content {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
	padding-top: 1rem;

	// 通用布局
	.scene-box {
		&.centered {
			text-align: center;
			padding: 1rem 0;
		}
	}

	// 1. 版本信息样式
	.version-row {
		margin-bottom: 1rem;
	}

	.note-box {
		background-color: $bg-color-light;
		border-radius: 8px;
		padding: 1rem;
		border: 1px solid rgba(0, 0, 0, 0.06);

		.note-label {
			margin-bottom: 0.5rem;
			color: #333;
			font-weight: 500;
		}
		.note-text {
			font-size: 0.95rem;
			color: #555;
			line-height: 1.6;
			white-space: pre-wrap; // 保留换行符
			max-height: 150px;
			overflow-y: auto;
		}
	}

	// 3. 状态文本
	.icon-success {
		font-size: 3rem;
		color: $success-color;
		margin-bottom: 1rem;
	}
	.main-text {
		font-size: 1.1rem;
		font-weight: bold;
		margin-bottom: 0.2rem;
		color: #333;
	}
	.sub-text {
		color: #888;
		font-size: 0.9rem;
	}
	.error-text {
		color: $error-color;
	}

	// 4. 自定义底部按钮栏
	.custom-footer {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		padding-top: 1rem;
		// border-top: 1px solid rgba(0, 0, 0, 0.06); // 可选：是否需要分割线

		// 自定义紫色按钮样式以匹配 AntD 组件结构
		.btn-purple {
			background-color: $primary-color;
			border-color: $primary-color;

			&:hover {
				background-color: lighten($primary-color, 5%);
				border-color: lighten($primary-color, 5%);
			}
		}

		.btn-success {
			background-color: $success-color;
			border-color: $success-color;

			&:hover {
				background-color: lighten($success-color, 5%);
				border-color: lighten($success-color, 5%);
			}
		}
	}
}
</style>
