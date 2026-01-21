<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import FpDialog from "@src/components/utils/fp-dialog/fp-dialog.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import FpMessage from "@src/components/utils/fp-message";

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

// 动态计算弹窗标题
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

// --- 核心逻辑 ---

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
					const errorDetail = data.error || "未知原因";

					if (status.value === "downloading") {
						status.value = "error";
						errorMsg.value = "网络连接中断，请稍后重试。";
					} else {
						status.value = "error";
						FpMessage.error(`检查更新失败: ${errorDetail}`);
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
	<FpDialog
		v-model:visible="visible"
		:title="title"
		:closable="status !== 'downloading'"
		:hidden-footer="true"
		append-to-body
		style="width: 400px; max-width: 90vw"
	>
		<div class="update-content">
			<div v-if="status === 'available'" class="scene-box">
				<div class="version-tag">版本: {{ version }}</div>
				<div class="note-box">
					<div class="note-label">更新内容：</div>
					<div class="note-text" v-html="releaseNote"></div>
				</div>
			</div>

			<div v-if="status === 'downloading'" class="scene-box centered">
				<div class="progress-wrapper">
					<div class="progress-track">
						<div class="progress-fill" :style="{ width: downloadPercent + '%' }"></div>
					</div>
					<span class="progress-text">{{ downloadPercent }}%</span>
				</div>
				<p class="sub-text">正在下载资源，请勿关闭游戏...</p>
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
				<button v-if="status === 'available'" class="btn-secondary" @click="close">稍后提醒</button>

				<button v-if="status === 'available' || status === 'error'" class="btn-primary" @click="startDownload">
					{{ status === "error" ? "重试" : "立即更新" }}
				</button>

				<button v-if="status === 'downloaded'" class="btn-primary" @click="install">立即重启</button>
			</div>
		</div>
	</FpDialog>
</template>

<style lang="scss" scoped>
.update-content {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
	padding-top: 0.5rem;

	// 通用布局
	.scene-box {
		&.centered {
			text-align: center;
			padding: 1rem 0;
		}
	}

	// 1. 版本信息样式
	.version-tag {
		display: inline-block;
		background-color: var(--color-third); // 复用你的主题色
		color: white;
		padding: 0.2rem 0.6rem;
		border-radius: 4px;
		font-size: 0.9rem;
		margin-bottom: 1rem;
		box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2);
	}

	.note-box {
		background-color: rgba(0, 0, 0, 0.03);
		border-radius: 8px;
		padding: 1rem;
		border: 1px solid rgba(0, 0, 0, 0.05);

		.note-label {
			margin-bottom: 0.5rem;
			color: #333;
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

	// 2. 进度条样式
	.progress-wrapper {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 0.5rem;

		.progress-track {
			flex: 1;
			height: 12px;
			background-color: #eee;
			border-radius: 6px;
			overflow: hidden;
			box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);

			.progress-fill {
				height: 100%;
				background-color: var(--color-third); // 保持一致
				transition: width 0.3s ease;
			}
		}
		.progress-text {
			color: var(--color-third);
			min-width: 3em;
		}
	}

	// 3. 状态文本
	.icon-success {
		font-size: 3rem;
		color: #4caf50;
		margin-bottom: 1rem;
	}
	.main-text {
		font-size: 1.1rem;
		margin-bottom: 0.2rem;
	}
	.sub-text {
		color: #888;
		font-size: 0.9rem;
	}
	.error-text {
		color: #ff5252;
	}

	// 4. 自定义底部按钮栏
	.custom-footer {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(0, 0, 0, 0.05);

		button {
			padding: 0.6em 1.5em;
			border-radius: 6px;
			font-size: 1rem;
			cursor: pointer;
			border: none;
			transition: all 0.2s;
			font-weight: 500;

			&:hover {
				filter: brightness(0.95);
				transform: translateY(-1px);
			}
			&:active {
				transform: translateY(0);
			}
		}

		.btn-primary {
			background-color: var(--color-third);
			color: white;
			box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
		}

		.btn-secondary {
			background-color: #f0f0f0;
			color: #555;

			&:hover {
				background-color: #e0e0e0;
			}
		}
	}
}
</style>
