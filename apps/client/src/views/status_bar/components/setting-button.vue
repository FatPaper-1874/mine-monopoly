<script setup lang="ts">
import FpDialog from "@src/components/utils/fp-dialog/fp-dialog.vue";
import { useSettig } from "@src/store";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { ref, watch, computed } from "vue";
import { useRoute } from "vue-router";
import useEventBus from "@src/utils/event-bus";
import FpMessage from "@mine-monopoly/ui/fp-message";

const settingVisible = ref(false);
const settingStore = useSettig();
const router = useRoute();
const eventBus = useEventBus();

// 画质标签映射
const qualityLabels = {
	low: "低",
	medium: "中",
	high: "高",
};

// 临时状态：用户选择但未应用
const tempAutoMusic = ref(settingStore.autoMusic);
const tempLockRole = ref(settingStore.lockRole);
const tempGraphicQuality = ref<"low" | "medium" | "high">(settingStore.graphicQuality);
const tempEnableShadow = ref(settingStore.enableShadow);

// 监听设置面板打开，重置临时状态
watch(settingVisible, (isOpen) => {
	if (isOpen) {
		tempAutoMusic.value = settingStore.autoMusic;
		tempLockRole.value = settingStore.lockRole;
		tempGraphicQuality.value = settingStore.graphicQuality;
		tempEnableShadow.value = settingStore.enableShadow;
	}
});

// 检查是否有未应用的更改
const hasChanges = computed(() => {
	return (
		tempAutoMusic.value !== settingStore.autoMusic ||
		tempLockRole.value !== settingStore.lockRole ||
		tempGraphicQuality.value !== settingStore.graphicQuality ||
		tempEnableShadow.value !== settingStore.enableShadow
	);
});

// 应用所有设置
const applySettings = () => {
	// 应用音乐设置
	if (tempAutoMusic.value !== settingStore.autoMusic) {
		settingStore.autoMusic = tempAutoMusic.value;
	}

	// 应用视角设置
	if (tempLockRole.value !== settingStore.lockRole) {
		settingStore.lockRole = tempLockRole.value;
		eventBus.emit("graphics:lockRole:change", { lockRole: tempLockRole.value });
	}

	// 应用画质设置
	if (tempGraphicQuality.value !== settingStore.graphicQuality) {
		const quality = tempGraphicQuality.value;

		// 保存到 localStorage
		try {
			localStorage.setItem("graphicQuality", quality);
			console.log("[画质设置] 已保存到 localStorage:", quality);
		} catch (e) {
			console.warn("[画质设置] localStorage 保存失败:", e);
		}

		// 更新 store
		settingStore.graphicQuality = quality;

		// 发送 EventBus 事件
		eventBus.emit("graphics:quality:change", { quality });

		// 显示提示
		console.log(`[画质设置] 画质已设置为：${qualityLabels[quality]}画质`);
	}

	// 应用阴影设置
	if (tempEnableShadow.value !== settingStore.enableShadow) {
		settingStore.enableShadow = tempEnableShadow.value;
		eventBus.emit("graphics:shadow:change", { enable: tempEnableShadow.value });
		console.log(`[阴影设置] 阴影已${tempEnableShadow.value ? "开启" : "关闭"}`);
	}

	FpMessage({ message: "所有设置已应用", type: "success" });
	settingVisible.value = false;
};
</script>

<template>
	<button @click="settingVisible = true" class="setting-button btn-small"><FontAwesomeIcon icon="gear" /></button>
	<FpDialog v-model:visible="settingVisible" hidden-footer>
		<template #title>设置</template>
		<div class="setting-container">
			<div class="setting-list">
				<div class="setting-item">
					<div class="label">音乐自动播放</div>
					<div class="content">
						<div>
							<input
								type="radio"
								name="auto-music-mode"
								:value="true"
								id="auto-music-mode-true"
								v-model="tempAutoMusic"
								hidden
							/>
							<label for="auto-music-mode-true">
								<FontAwesomeIcon icon="square-check" v-if="tempAutoMusic" />
								自动</label
							>
						</div>
						<div>
							<input
								type="radio"
								name="auto-music-mode"
								:value="false"
								id="auto-music-mode-false"
								v-model="tempAutoMusic"
								hidden
							/>
							<label for="auto-music-mode-false">
								<FontAwesomeIcon icon="square-check" v-if="!tempAutoMusic" />
								手动</label
							>
						</div>
					</div>
				</div>

				<div class="setting-item">
					<div class="label">移动时视角</div>
					<div class="content">
						<div>
							<input
								type="radio"
								name="lock-role-mode"
								:value="true"
								id="lock-role-mode-true"
								v-model="tempLockRole"
								hidden
							/>
							<label for="lock-role-mode-true">
								<FontAwesomeIcon icon="square-check" v-if="tempLockRole" />
								锁定</label
							>
						</div>
						<div>
							<input
								type="radio"
								name="lock-role-mode"
								:value="false"
								id="lock-role-mode-false"
								v-model="tempLockRole"
								hidden
							/>
							<label for="lock-role-mode-false">
								<FontAwesomeIcon icon="square-check" v-if="!tempLockRole" />
								自由</label
							>
						</div>
					</div>
				</div>

				<!-- 画面质量设置 -->
				<div class="setting-item">
					<div class="label">画面质量</div>
					<div class="content">
						<div>
							<input
								type="radio"
								name="graphic-quality"
								value="low"
								id="quality-low"
								v-model="tempGraphicQuality"
								hidden
							/>
							<label for="quality-low">
								<FontAwesomeIcon icon="square-check" v-if="tempGraphicQuality === 'low'" />
								低</label
							>
						</div>
						<div>
							<input
								type="radio"
								name="graphic-quality"
								value="medium"
								id="quality-medium"
								v-model="tempGraphicQuality"
								hidden
							/>
							<label for="quality-medium">
								<FontAwesomeIcon icon="square-check" v-if="tempGraphicQuality === 'medium'" />
								中</label
							>
						</div>
						<div>
							<input
								type="radio"
								name="graphic-quality"
								value="high"
								id="quality-high"
								v-model="tempGraphicQuality"
								hidden
							/>
							<label for="quality-high">
								<FontAwesomeIcon icon="square-check" v-if="tempGraphicQuality === 'high'" />
								高</label
							>
						</div>
					</div>
				</div>

				<!-- 阴影设置 -->
				<div class="setting-item">
					<div class="label">阴影</div>
					<div class="content">
						<div>
							<input
								type="radio"
								name="shadow-mode"
								:value="true"
								id="shadow-mode-true"
								v-model="tempEnableShadow"
								hidden
							/>
							<label for="shadow-mode-true">
								<FontAwesomeIcon icon="square-check" v-if="tempEnableShadow" />
								开启</label
							>
						</div>
						<div>
							<input
								type="radio"
								name="shadow-mode"
								:value="false"
								id="shadow-mode-false"
								v-model="tempEnableShadow"
								hidden
							/>
							<label for="shadow-mode-false">
								<FontAwesomeIcon icon="square-check" v-if="!tempEnableShadow" />
								关闭</label
							>
						</div>
					</div>
				</div>

				<!-- 应用按钮 -->
				<div class="setting-item apply-button-item">
					<button @click="applySettings" class="apply-button" :disabled="!hasChanges">应用设置</button>
				</div>
			</div>
		</div>
	</FpDialog>
</template>

<style lang="scss" scoped>
.setting-button {
	height: 2.5rem;
	width: 2.5rem;
	border-radius: 0.5rem;
	font-size: 1.1rem;
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 0.4rem;
}
.setting-container {
	display: flex;
	align-items: center;
	color: var(--color-primary);

	& > .setting-list {
		display: flex;
		flex-direction: column;
		width: 100%;
		gap: 0.8rem;

		& > .setting-item {
			display: flex;
			justify-content: center;
			font-size: 1.1rem;
			background-color: rgba(255, 255, 255, 0.75);
			border-radius: 0.5rem;
			padding: 0.8rem;
			box-sizing: border-box;
			box-shadow: var(--box-shadow);
			overflow: hidden;
			position: relative;

			& > div {
				display: inline-block;
			}

			& > .label {
				width: 30%;
				text-align: center;
			}
			& > .content {
				flex: 1;
				font-size: 1rem;
				display: flex;
				justify-content: space-around;
				align-items: center;

				& input[type="radio"]:checked + label {
					color: var(--color-primary);
				}

				& label {
					padding: 0.2rem;
					cursor: pointer;
					color: var(--color-third);
				}
			}

			.ban-mask {
				position: absolute;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				background-color: rgba(255, 255, 255, 0.75);
				z-index: 100;
				display: flex;
				justify-content: center;
				align-items: center;
				color: #777777;
			}

			// 应用按钮项
			&.apply-button-item {
				background-color: transparent;
				box-shadow: none;
				padding: 0;

				.apply-button {
					width: 100%;
					background: var(--color-primary);
					color: white;
					border: none;
					border-radius: 0.5rem;
					padding: 0.8rem;
					font-size: 1.1rem;
					font-weight: bold;
					cursor: pointer;
					transition: all 0.3s;

					&:hover:not(:disabled) {
						opacity: 0.9;
						transform: translateY(-2px);
						box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
					}

					&:active:not(:disabled) {
						transform: translateY(0);
					}

					&:disabled {
						opacity: 0.4;
						cursor: not-allowed;
						background: var(--color-third);
					}
				}
			}
		}
	}
}
</style>
