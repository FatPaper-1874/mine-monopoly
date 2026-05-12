<script setup lang="ts">
import FpDialog from "@src/components/utils/fp-dialog/fp-dialog.vue";
import { useSettig } from "@src/store";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { ref, watch, computed } from "vue";
import { useRoute } from "vue-router";
import useEventBus from "@src/utils/event-bus";
import FpMessage from "@mine-monopoly/ui/fp-message";
import { useAudioManager } from "@src/utils/audio";

const settingVisible = ref(false);
const settingStore = useSettig();
const router = useRoute();
const eventBus = useEventBus();
const audio = useAudioManager();

// 画质标签映射
const qualityLabels = {
	low: "低",
	medium: "中",
	high: "高",
};

// 临时状态：用户选择但未应用
const tempLockRole = ref(settingStore.lockRole);
const tempGraphicQuality = ref<"low" | "medium" | "high">(settingStore.graphicQuality);
const tempEnableShadow = ref(settingStore.enableShadow);
const tempMasterVolume = ref(settingStore.masterVolume);
const tempSFXVolume = ref(settingStore.sfxVolume);
const tempMusicVolume = ref(settingStore.musicVolume);
const tempMasterMuted = ref(settingStore.masterMuted);
const tempSFXMuted = ref(settingStore.sfxMuted);
const tempMusicMuted = ref(settingStore.musicMuted);

// 监听设置面板打开，重置临时状态
watch(settingVisible, (isOpen) => {
	if (isOpen) {
		tempLockRole.value = settingStore.lockRole;
		tempGraphicQuality.value = settingStore.graphicQuality;
		tempEnableShadow.value = settingStore.enableShadow;
		tempMasterVolume.value = settingStore.masterVolume;
		tempSFXVolume.value = settingStore.sfxVolume;
		tempMusicVolume.value = settingStore.musicVolume;
		tempMasterMuted.value = settingStore.masterMuted;
		tempSFXMuted.value = settingStore.sfxMuted;
		tempMusicMuted.value = settingStore.musicMuted;
	}
});

// 检查是否有未应用的更改
const hasChanges = computed(() => {
	return (
		tempLockRole.value !== settingStore.lockRole ||
		tempGraphicQuality.value !== settingStore.graphicQuality ||
		tempEnableShadow.value !== settingStore.enableShadow ||
		tempMasterVolume.value !== settingStore.masterVolume ||
		tempSFXVolume.value !== settingStore.sfxVolume ||
		tempMusicVolume.value !== settingStore.musicVolume ||
		tempMasterMuted.value !== settingStore.masterMuted ||
		tempSFXMuted.value !== settingStore.sfxMuted ||
		tempMusicMuted.value !== settingStore.musicMuted
	);
});

// 调整音量
const adjustVolume = (type: "master" | "sfx" | "music", delta: number) => {
	const step = 0.1; // 10% 步幅
	switch (type) {
		case "master":
			tempMasterVolume.value = Math.max(0, Math.min(1, tempMasterVolume.value + delta * step));
			break;
		case "sfx":
			tempSFXVolume.value = Math.max(0, Math.min(1, tempSFXVolume.value + delta * step));
			break;
		case "music":
			tempMusicVolume.value = Math.max(0, Math.min(1, tempMusicVolume.value + delta * step));
			break;
	}
};

// 切换静音
const toggleMute = (type: "master" | "sfx" | "music") => {
	switch (type) {
		case "master":
			tempMasterMuted.value = !tempMasterMuted.value;
			break;
		case "sfx":
			tempSFXMuted.value = !tempSFXMuted.value;
			break;
		case "music":
			tempMusicMuted.value = !tempMusicMuted.value;
			break;
	}
};

// 应用所有设置
const applySettings = () => {
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

	console.log("🚀 ~ applySettings ~ tempMasterMuted.value:", tempMasterMuted.value);
	// 应用音量设置
	if (
		tempMasterVolume.value !== settingStore.masterVolume ||
		tempSFXVolume.value !== settingStore.sfxVolume ||
		tempMusicVolume.value !== settingStore.musicVolume ||
		tempMasterMuted.value !== settingStore.masterMuted ||
		tempSFXMuted.value !== settingStore.sfxMuted ||
		tempMusicMuted.value !== settingStore.musicMuted
	) {
		// 直接应用设置的音量和静音状态
		settingStore.masterVolume = tempMasterVolume.value;
		settingStore.sfxVolume = tempSFXVolume.value;
		settingStore.musicVolume = tempMusicVolume.value;
		settingStore.masterMuted = tempMasterMuted.value;
		settingStore.sfxMuted = tempSFXMuted.value;
		settingStore.musicMuted = tempMusicMuted.value;
		// Store 的订阅会自动同步到 AudioManager
	}

	FpMessage({ message: "所有设置已应用", type: "success" });
	settingVisible.value = false;
};
</script>

<template>
	<button @click="settingVisible = true" class="setting-button btn-small" title="设置"><FontAwesomeIcon icon="gear" /></button>
	<FpDialog v-model:visible="settingVisible" hidden-footer>
		<template #title>设置</template>
		<div class="setting-container" style="user-select: none">
			<div class="setting-list">
				<!-- 主音量 -->
				<div class="setting-item volume-setting">
					<div class="label">主音量</div>
					<div class="content volume-control">
						<FontAwesomeIcon
							icon="minus"
							class="control-icon decrease"
							@click="adjustVolume('master', -1)"
							:class="{ disabled: tempMasterVolume <= 0 }"
						/>
						<span class="volume-value">{{ Math.round(tempMasterVolume * 100) }}%</span>
						<FontAwesomeIcon
							icon="plus"
							class="control-icon increase"
							@click="adjustVolume('master', 1)"
							:class="{ disabled: tempMasterVolume >= 1 }"
						/>
						<FontAwesomeIcon
							:icon="tempMasterMuted ? 'volume-xmark' : 'volume-high'"
							class="control-icon mute"
							:class="{ muted: tempMasterMuted }"
							@click="toggleMute('master')"
						/>
					</div>
				</div>

				<!-- 音效音量 -->
				<div class="setting-item volume-setting">
					<div class="label">音效音量</div>
					<div class="content volume-control">
						<FontAwesomeIcon
							icon="minus"
							class="control-icon decrease"
							@click="adjustVolume('sfx', -1)"
							:class="{ disabled: tempSFXVolume <= 0 }"
						/>
						<span class="volume-value">{{ Math.round(tempSFXVolume * 100) }}%</span>
						<FontAwesomeIcon
							icon="plus"
							class="control-icon increase"
							@click="adjustVolume('sfx', 1)"
							:class="{ disabled: tempSFXVolume >= 1 }"
						/>
						<FontAwesomeIcon
							:icon="tempSFXMuted ? 'volume-xmark' : 'volume-high'"
							class="control-icon mute"
							:class="{ muted: tempSFXMuted }"
							@click="toggleMute('sfx')"
						/>
					</div>
				</div>

				<!-- 背景音乐音量 -->
				<div class="setting-item volume-setting">
					<div class="label">背景音乐</div>
					<div class="content volume-control">
						<FontAwesomeIcon
							icon="minus"
							class="control-icon decrease"
							@click="adjustVolume('music', -1)"
							:class="{ disabled: tempMusicVolume <= 0 }"
						/>
						<span class="volume-value">{{ Math.round(tempMusicVolume * 100) }}%</span>
						<FontAwesomeIcon
							icon="plus"
							class="control-icon increase"
							@click="adjustVolume('music', 1)"
							:class="{ disabled: tempMusicVolume >= 1 }"
						/>
						<FontAwesomeIcon
							:icon="tempMusicMuted ? 'volume-xmark' : 'volume-high'"
							class="control-icon mute"
							:class="{ muted: tempMusicMuted }"
							@click="toggleMute('music')"
						/>
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
	user-select: none; /* 防止文本被选中 */

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
				display: flex;
				align-items: center;
				justify-content: center;
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

				// 音量控制样式
				&.volume-control {
					gap: 0.2rem;
					align-items: center;

					& .control-icon {
						font-size: 1.2rem;
						cursor: pointer;
						transition: all 0.2s;
						padding: 0.4rem;
						border-radius: 0.4rem;
						background: rgba(255, 255, 255, 0.5);
						flex-shrink: 0;
						width: 2rem; /* 固定宽度 */
						height: 2rem; /* 固定高度 */
						display: inline-flex; /* 确保内容居中 */
						align-items: center; /* 垂直居中 */
						justify-content: center; /* 水平居中 */
						outline: none; /* 移除 focus 边框 */
						box-sizing: border-box; /* 确保内边距不影响总尺寸 */

						/* 确保内部 SVG 图标不溢出 */
						& :deep(svg) {
							width: 1em;
							height: 1em;
							max-width: 1em;
							max-height: 1em;
							display: block;
						}

						&:hover:not(.disabled) {
							transform: scale(1.15);
							background: rgba(255, 255, 255, 0.8);
							box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
						}

						&:active:not(.disabled) {
							transform: scale(1);
						}

						&.disabled {
							opacity: 0.3;
							cursor: not-allowed;
							pointer-events: none; /* 禁用点击事件 */
						}

						&.decrease,
						&.increase {
							color: var(--color-primary);
						}

						&.mute {
							color: var(--color-third);
							margin-left: 0.5rem; /* 静音图标稍微离远一点 */

							&.muted {
								color: #ff4d4f;
							}

							&:hover {
								background: rgba(255, 77, 79, 0.1);
							}
						}
					}

					& .volume-value {
						min-width: 3.5rem;
						text-align: center;
						font-weight: 500;
						color: var(--color-primary);
						font-size: 1.1rem;
						margin: 0 0.1rem;
					}
				}
			}

			// 音量设置项特殊样式
			&.volume-setting {
				.label {
					gap: 0.2rem;
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
