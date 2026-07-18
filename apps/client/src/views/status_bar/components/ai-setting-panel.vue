<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import type { AIDecisionConfig, AIDecisionProviderMode, AIRemoteLLMProviderKind } from "@mine-monopoly/types";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import FpMessage from "@mine-monopoly/ui/fp-message";
import FpDialog from "@src/components/utils/fp-dialog/fp-dialog.vue";
import { useMonopolyClient } from "@src/core/monopoly-client/MonopolyClient";
import { useRoomInfo, useSettig } from "@src/store";

const visible = defineModel<boolean>("visible", { default: false });

const settingStore = useSettig();
const roomInfo = useRoomInfo();
const route = useRoute();

const providerLabels: Record<AIRemoteLLMProviderKind, string> = {
	"openai-compatible": "OpenAI 兼容",
	anthropic: "Anthropic",
};

const providerBaseUrlPlaceholders: Record<AIRemoteLLMProviderKind, string> = {
	"openai-compatible": "https://api.openai.com/v1",
	anthropic: "https://api.anthropic.com",
};

const providerModelPlaceholders: Record<AIRemoteLLMProviderKind, string> = {
	"openai-compatible": "gpt-4.1-mini",
	anthropic: "claude-sonnet-4-0",
};

const providerDescriptions: Record<AIRemoteLLMProviderKind, string> = {
	"openai-compatible": "自动拼接到 chat/completions，适合 OpenAI、本地兼容网关和 OneAPI 一类服务。",
	anthropic: "走 Anthropic 原生 messages 接口，自动拼接到 /v1/messages。",
};

const providerOptions = Object.entries(providerLabels) as Array<[AIRemoteLLMProviderKind, string]>;

const clampContextMemoryLimit = (value: number | string | undefined) => {
	const parsed = typeof value === "string" ? Number(value) : value;
	const normalized = typeof parsed === "number" && Number.isFinite(parsed) ? parsed : 0;
	return Math.min(20, Math.max(0, Math.floor(normalized)));
};

const tempAIMode = ref<AIDecisionProviderMode>("local");
const tempAIProvider = ref<AIRemoteLLMProviderKind>("openai-compatible");
const tempAIBaseUrl = ref("");
const tempAIApiKey = ref("");
const tempAIModel = ref("");
const tempAIContextMemoryLimit = ref<number | string>(6);

const getCurrentProvider = () => settingStore.aiDecisionConfig.remote.provider ?? "openai-compatible";
const getCurrentContextMemoryLimit = () => clampContextMemoryLimit(settingStore.aiDecisionConfig.contextMemoryLimit ?? 6);

const resetTempState = () => {
	tempAIMode.value = settingStore.aiDecisionConfig.mode;
	tempAIProvider.value = getCurrentProvider();
	tempAIBaseUrl.value = settingStore.aiDecisionConfig.remote.baseUrl;
	tempAIApiKey.value = settingStore.aiDecisionConfig.remote.apiKey;
	tempAIModel.value = settingStore.aiDecisionConfig.remote.model;
	tempAIContextMemoryLimit.value = getCurrentContextMemoryLimit();
};

watch(visible, (isOpen) => {
	if (isOpen) {
		resetTempState();
	}
});

const hasChanges = computed(() => {
	return (
		tempAIMode.value !== settingStore.aiDecisionConfig.mode ||
		tempAIProvider.value !== getCurrentProvider() ||
		tempAIBaseUrl.value !== settingStore.aiDecisionConfig.remote.baseUrl ||
		tempAIApiKey.value !== settingStore.aiDecisionConfig.remote.apiKey ||
		tempAIModel.value !== settingStore.aiDecisionConfig.remote.model ||
		clampContextMemoryLimit(tempAIContextMemoryLimit.value) !== getCurrentContextMemoryLimit()
	);
});

const canSyncRoomAI = computed(() => {
	return roomInfo.amIRoomOwner && (route.name === "room" || route.name === "game");
});

const syncScopeText = computed(() => {
	return canSyncRoomAI.value ? "会同步到房间 AI" : "仅当前客户端生效";
});

const remoteProviderLabel = computed(() => {
	return providerLabels[tempAIProvider.value];
});

const remoteDescription = computed(() => {
	return providerDescriptions[tempAIProvider.value];
});

const baseUrlPlaceholder = computed(() => {
	return providerBaseUrlPlaceholders[tempAIProvider.value];
});

const modelPlaceholder = computed(() => {
	return providerModelPlaceholders[tempAIProvider.value];
});

const applySettings = () => {
	const contextMemoryLimit = clampContextMemoryLimit(tempAIContextMemoryLimit.value);
	if (
		tempAIMode.value === "remote" &&
		(!tempAIBaseUrl.value.trim() || !tempAIModel.value.trim() || !tempAIApiKey.value.trim())
	) {
		FpMessage({
			type: "error",
			message: "远程模式需要填写 Base URL、API Key 和模型名",
		});
		return;
	}

	const nextConfig: AIDecisionConfig = {
		mode: tempAIMode.value,
		contextMemoryLimit,
		remote: {
			...settingStore.aiDecisionConfig.remote,
			provider: tempAIProvider.value,
			baseUrl: tempAIBaseUrl.value.trim(),
			apiKey: tempAIApiKey.value.trim(),
			model: tempAIModel.value.trim(),
		},
	};

	settingStore.aiDecisionConfig = nextConfig;

	let aiSyncMessage = "";
	if (canSyncRoomAI.value) {
		const result = useMonopolyClient().updateAIDecisionConfig(nextConfig);
		aiSyncMessage = result.success ? "，房间 AI 已同步" : `，但房间 AI 同步失败: ${result.error}`;
	}

	FpMessage({ type: "success", message: `AI 设置已应用${aiSyncMessage}` });
	visible.value = false;
};
</script>

<template>
	<FpDialog
		v-model:visible="visible"
		title="AI 设置"
		confirm-text="应用"
		cancel-text="取消"
		:submit-disable="!hasChanges"
		:style="{ width: '34rem', maxWidth: '92vw' }"
		@submit="applySettings"
	>
		<div class="ai-setting-panel">
			<div class="status-card">
				<div class="status-card__header">
					<div class="status-card__title">房间 AI 决策配置</div>
					<div class="status-card__tags">
						<span class="status-tag">{{ tempAIMode === "remote" ? remoteProviderLabel : "本地" }}</span>
						<span class="status-tag secondary">{{ syncScopeText }}</span>
					</div>
				</div>
				<div class="status-card__desc">
					{{
						tempAIMode === "remote"
							? remoteDescription
							: "本地模式继续使用客户端内置 AI，不依赖外部模型接口。"
					}}
				</div>
				<div class="status-card__meta">
					上下文记忆:
					{{ clampContextMemoryLimit(tempAIContextMemoryLimit) > 0 ? `最近 ${clampContextMemoryLimit(tempAIContextMemoryLimit)} 条决策摘要` : "已关闭" }}
				</div>
			</div>

			<div class="setting-card">
				<div class="setting-row">
					<div class="setting-label">决策模式</div>
					<div class="setting-content mode-switch">
						<div>
							<input
								type="radio"
								name="ai-decision-mode"
								value="local"
								id="ai-mode-local"
								v-model="tempAIMode"
								hidden
							/>
							<label for="ai-mode-local">
								<FontAwesomeIcon icon="square-check" v-if="tempAIMode === 'local'" />
								本地
							</label>
						</div>
						<div>
							<input
								type="radio"
								name="ai-decision-mode"
								value="remote"
								id="ai-mode-remote"
								v-model="tempAIMode"
								hidden
							/>
							<label for="ai-mode-remote">
								<FontAwesomeIcon icon="square-check" v-if="tempAIMode === 'remote'" />
								远程 LLM
							</label>
						</div>
					</div>
				</div>
				<label class="setting-row setting-row--top">
					<span class="setting-label">上下文记忆</span>
					<span class="setting-content setting-content--stack">
						<input
							v-model.number="tempAIContextMemoryLimit"
							type="number"
							min="0"
							max="20"
							step="1"
							placeholder="6"
						/>
						<span class="setting-note">0 为关闭，其他值表示保留最近 N 条 AI 决策摘要。</span>
					</span>
				</label>
			</div>

			<div v-if="tempAIMode === 'remote'" class="setting-card remote-fields">
				<div class="setting-row">
					<div class="setting-label">接口类型</div>
					<div class="setting-content mode-switch provider-switch">
						<div v-for="[provider, label] in providerOptions" :key="provider">
							<input
								type="radio"
								name="ai-provider"
								:value="provider"
								:id="`ai-provider-${provider}`"
								v-model="tempAIProvider"
								hidden
							/>
							<label :for="`ai-provider-${provider}`">
								<FontAwesomeIcon icon="square-check" v-if="tempAIProvider === provider" />
								{{ label }}
							</label>
						</div>
					</div>
				</div>
				<label class="setting-row">
					<span class="setting-label">Base URL</span>
					<span class="setting-content">
						<input v-model="tempAIBaseUrl" type="text" :placeholder="baseUrlPlaceholder" />
					</span>
				</label>
				<label class="setting-row">
					<span class="setting-label">API Key</span>
					<span class="setting-content">
						<input v-model="tempAIApiKey" type="password" placeholder="输入接口密钥" />
					</span>
				</label>
				<label class="setting-row">
					<span class="setting-label">模型</span>
					<span class="setting-content">
						<input v-model="tempAIModel" type="text" :placeholder="modelPlaceholder" />
					</span>
				</label>
			</div>

			<div class="hint-card">
				支持 OpenAI 兼容和 Anthropic。上下文记忆会同时作用于本地和远程 AI。仅房主在房间或游戏中修改时，会把当前客户端配置同步到房间里的 AI；其他情况下只会保存在本机设置中。
			</div>
		</div>
	</FpDialog>
</template>

<style lang="scss" scoped>
.ai-setting-panel {
	display: flex;
	flex-direction: column;
	gap: 0.9rem;
	user-select: none;
}

.status-card,
.setting-card,
.hint-card {
	background: rgba(255, 255, 255, 0.75);
	border-radius: 0.5rem;
	padding: 0.8rem 0.9rem;
	box-shadow: var(--fp-shadow-md);
}

.status-card {
	display: flex;
	flex-direction: column;
	gap: 0.6rem;
}

.status-card__header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: 0.75rem;
	flex-wrap: wrap;
}

.status-card__title {
	font-size: 1rem;
	font-weight: 700;
	color: var(--fp-color-primary);
}

.status-card__tags {
	display: flex;
	gap: 0.45rem;
	flex-wrap: wrap;
}

.status-tag {
	display: inline-flex;
	align-items: center;
	padding: 0.2rem 0.55rem;
	border-radius: 999px;
	background: var(--fp-color-primary);
	color: #fff;
	font-size: 0.8rem;
	line-height: 1.2;
}

.status-tag.secondary {
	background: var(--fp-color-tertiary);
}

.status-card__desc {
	line-height: 1.55;
	font-size: 0.9rem;
	color: var(--fp-color-tertiary);
}

.status-card__meta {
	font-size: 0.84rem;
	color: var(--fp-color-primary);
}

.setting-card {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
}

.setting-row {
	display: flex;
	align-items: center;
	gap: 0.8rem;
}

.setting-row--top {
	align-items: flex-start;
}

.setting-label {
	width: 30%;
	flex: 0 0 30%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 0.98rem;
	color: var(--fp-color-primary);
}

.setting-content {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: space-around;
}

.setting-content--stack {
	flex-direction: column;
	align-items: stretch;
	justify-content: flex-start;
	gap: 0.4rem;
}

.mode-switch {
	display: flex;
	gap: 0.75rem;
	flex-wrap: wrap;
}

.mode-switch input[type="radio"]:checked + label {
	color: var(--fp-color-primary);
}

.mode-switch label {
	padding: 0.2rem;
	cursor: pointer;
	color: var(--fp-color-tertiary);
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
}

.remote-fields {
	gap: 0.55rem;
}

.provider-switch {
	justify-content: flex-start;
	gap: 0.9rem;
}

.setting-content input {
	width: 100%;
	border: 0.0625rem solid rgba(0, 0, 0, 0.12);
	border-radius: 0.4rem;
	padding: 0.55rem 0.7rem;
	font-size: 0.95rem;
	background: rgba(255, 255, 255, 0.88);
	color: var(--fp-color-primary);
	transition:
		border-color 0.2s ease,
		box-shadow 0.2s ease;
}

.setting-content input:focus {
	outline: none;
	border-color: var(--fp-color-tertiary);
	box-shadow: 0 0 0 0.125rem rgba(0, 0, 0, 0.06);
}

.setting-note {
	font-size: 0.82rem;
	line-height: 1.45;
	color: var(--fp-color-tertiary);
}

.hint-card {
	line-height: 1.6;
	font-size: 0.9rem;
	color: var(--fp-color-tertiary);
	border-left: 0.25rem solid var(--fp-color-tertiary);
}

.status-card__desc code {
	font-size: 0.85rem;
	background: rgba(0, 0, 0, 0.04);
	padding: 0.1rem 0.3rem;
	border-radius: 0.25rem;
}

@media (max-width: 640px) {
	.setting-row {
		flex-direction: column;
		align-items: stretch;
	}

	.setting-label {
		width: 100%;
		flex-basis: auto;
		justify-content: flex-start;
	}
}
</style>
