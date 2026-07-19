<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import type { AIDecisionConfig, AIRemoteLLMProviderKind } from "@mine-monopoly/types";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import FpMessage from "@mine-monopoly/ui/fp-message";
import FpDialog from "@src/components/utils/fp-dialog/fp-dialog.vue";
import {
	applyAIControlConfig,
	clearAIControlRemoteUsageStats,
	getAIControlSnapshot,
} from "@src/core/ai/ai-control-bridge";
import { useAIRemoteUsageStats } from "@src/core/ai/remote-usage-stats";
import { useRoomInfo, useSettig } from "@src/store";

const visible = defineModel<boolean>("visible", { default: false });

const settingStore = useSettig();
const roomInfo = useRoomInfo();
const route = useRoute();
const remoteUsageStats = useAIRemoteUsageStats();

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

const tempAIProvider = ref<AIRemoteLLMProviderKind>("openai-compatible");
const tempAIBaseUrl = ref("");
const tempAIApiKey = ref("");
const tempAIModel = ref("");
const tempAIContextMemoryLimit = ref<number | string>(6);

const getCurrentProvider = (config: AIDecisionConfig) => config.remote.provider ?? "openai-compatible";
const getCurrentContextMemoryLimit = (config: AIDecisionConfig) => clampContextMemoryLimit(config.contextMemoryLimit ?? 6);

const resetTempState = (config: AIDecisionConfig) => {
	tempAIProvider.value = getCurrentProvider(config);
	tempAIBaseUrl.value = config.remote.baseUrl;
	tempAIApiKey.value = config.remote.apiKey;
	tempAIModel.value = config.remote.model;
	tempAIContextMemoryLimit.value = getCurrentContextMemoryLimit(config);
};

const refreshTempState = async () => {
	const snapshot = await getAIControlSnapshot();
	resetTempState(snapshot.config);
};

watch(visible, (isOpen) => {
	if (isOpen) {
		void refreshTempState();
	}
});

const hasChanges = computed(() => {
	return (
		tempAIProvider.value !== getCurrentProvider(settingStore.aiDecisionConfig) ||
		tempAIBaseUrl.value !== settingStore.aiDecisionConfig.remote.baseUrl ||
		tempAIApiKey.value !== settingStore.aiDecisionConfig.remote.apiKey ||
		tempAIModel.value !== settingStore.aiDecisionConfig.remote.model ||
		clampContextMemoryLimit(tempAIContextMemoryLimit.value) !== getCurrentContextMemoryLimit(settingStore.aiDecisionConfig)
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

const remoteUsageSummary = computed(() => remoteUsageStats.summary);
const recentRemoteUsageRecords = computed(() => remoteUsageStats.records.slice(0, 6));

const formatTokenCount = (value: number | undefined) => {
	if (typeof value !== "number" || !Number.isFinite(value)) return "--";
	return value.toLocaleString("zh-CN");
};

const formatUsageTime = (timestamp: number) => {
	return new Date(timestamp).toLocaleTimeString("zh-CN", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
};

const handleClearRemoteUsageStats = () => {
	clearAIControlRemoteUsageStats();
	FpMessage({
		type: "success",
		message: "远程 Token 统计已清空",
	});
};

const applySettings = () => {
	const contextMemoryLimit = clampContextMemoryLimit(tempAIContextMemoryLimit.value);
	if (!tempAIBaseUrl.value.trim() || !tempAIModel.value.trim() || !tempAIApiKey.value.trim()) {
		FpMessage({
			type: "error",
			message: "远程模式需要填写 Base URL、API Key 和模型名",
		});
		return;
	}

	const nextConfig: AIDecisionConfig = {
		...settingStore.aiDecisionConfig,
		mode: "remote",
		contextMemoryLimit,
		remote: {
			...settingStore.aiDecisionConfig.remote,
			provider: tempAIProvider.value,
			baseUrl: tempAIBaseUrl.value.trim(),
			apiKey: tempAIApiKey.value.trim(),
			model: tempAIModel.value.trim(),
		},
	};

	const result = applyAIControlConfig(nextConfig);
	if (!result.success) {
		FpMessage({
			type: "error",
			message: result.error || "AI 设置应用失败",
		});
		return;
	}

	FpMessage({
		type: "success",
		message: result.syncedRoomAI ? "AI 设置已应用，房间 AI 已同步" : "AI 设置已应用",
	});
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
						<span class="status-tag">{{ remoteProviderLabel }}</span>
						<span class="status-tag secondary">{{ syncScopeText }}</span>
					</div>
				</div>
				<div class="status-card__desc">{{ remoteDescription }}</div>
				<div class="status-card__meta">
					上下文记忆:
					{{ clampContextMemoryLimit(tempAIContextMemoryLimit) > 0 ? `最近 ${clampContextMemoryLimit(tempAIContextMemoryLimit)} 条决策摘要` : "已关闭" }}
				</div>
			</div>

			<div v-if="remoteUsageSummary.requestCount > 0" class="setting-card usage-card">
				<div class="usage-card__header">
					<div class="status-card__title">远程 Token 统计</div>
					<button
						v-if="remoteUsageSummary.requestCount > 0"
						type="button"
						class="usage-card__clear"
						@click="handleClearRemoteUsageStats"
					>
						清空
					</button>
				</div>
				<div class="usage-card__grid">
					<div class="usage-metric">
						<div class="usage-metric__label">请求数</div>
						<div class="usage-metric__value">{{ formatTokenCount(remoteUsageSummary.requestCount) }}</div>
					</div>
					<div class="usage-metric">
						<div class="usage-metric__label">输入 Token</div>
						<div class="usage-metric__value">{{ formatTokenCount(remoteUsageSummary.inputTokens) }}</div>
					</div>
					<div class="usage-metric">
						<div class="usage-metric__label">输出 Token</div>
						<div class="usage-metric__value">{{ formatTokenCount(remoteUsageSummary.outputTokens) }}</div>
					</div>
					<div class="usage-metric">
						<div class="usage-metric__label">总 Token</div>
						<div class="usage-metric__value">{{ formatTokenCount(remoteUsageSummary.totalTokens) }}</div>
					</div>
				</div>
				<div class="status-card__meta">
					精确 usage:
					{{ remoteUsageSummary.usageCount }} 次
					<span v-if="remoteUsageSummary.missingUsageCount > 0">
						，缺失 usage:
						{{ remoteUsageSummary.missingUsageCount }} 次
					</span>
				</div>
				<div v-if="recentRemoteUsageRecords.length > 0" class="usage-list">
					<div v-for="record in recentRemoteUsageRecords" :key="`${record.traceId}-${record.timestamp}`" class="usage-item">
						<div class="usage-item__header">
							<div class="usage-item__title">{{ record.title }}</div>
							<div class="usage-item__time">{{ formatUsageTime(record.timestamp) }}</div>
						</div>
						<div class="usage-item__meta">
							{{ record.model }} · {{ providerLabels[record.provider] }}
							<span v-if="record.scene"> · {{ record.scene }}</span>
						</div>
						<div class="usage-item__tokens" v-if="record.usageAvailable">
							输入 {{ formatTokenCount(record.inputTokens) }} / 输出 {{ formatTokenCount(record.outputTokens) }} / 总计
							{{ formatTokenCount(record.totalTokens) }}
						</div>
						<div class="usage-item__tokens usage-item__tokens--muted" v-else>
							网关未返回 usage。请求 {{ formatTokenCount(record.promptChars) }} 字符，响应 {{ formatTokenCount(record.responseChars) }} 字符。
						</div>
					</div>
				</div>
				<div v-else class="setting-note">
					当前还没有远程 AI usage 记录。仅统计这个客户端运行期间的远程请求；兼容网关若不返回 usage，将只能显示字符数。
				</div>
			</div>

			<div class="setting-card">
				<div class="setting-row">
					<div class="setting-label">决策模式</div>
					<div class="setting-content setting-content--stack">
						<div>远程 LLM</div>
						<span class="setting-note">当前开发阶段仅保留远程模型决策，不再维护本地 AI 分支。</span>
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

			<div class="setting-card remote-fields">
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
				支持 OpenAI 兼容和 Anthropic。上下文记忆会作用于远程 AI。仅房主在房间或游戏中修改时，会把当前客户端配置同步到房间里的 AI；其他情况下只会保存在本机设置中。
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

.usage-card {
	gap: 0.7rem;
}

.usage-card__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.8rem;
}

.usage-card__clear {
	border: none;
	border-radius: 999px;
	padding: 0.25rem 0.7rem;
	background: rgba(0, 0, 0, 0.08);
	color: var(--fp-color-primary);
	cursor: pointer;
	font-size: 0.82rem;
}

.usage-card__grid {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 0.55rem;
}

.usage-metric {
	background: rgba(255, 255, 255, 0.72);
	border-radius: 0.45rem;
	padding: 0.55rem 0.65rem;
	box-shadow: inset 0 0 0 0.0625rem rgba(0, 0, 0, 0.04);
}

.usage-metric__label {
	font-size: 0.78rem;
	color: var(--fp-color-tertiary);
}

.usage-metric__value {
	margin-top: 0.18rem;
	font-size: 1rem;
	font-weight: 700;
	color: var(--fp-color-primary);
}

.usage-list {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.usage-item {
	background: rgba(255, 255, 255, 0.68);
	border-radius: 0.45rem;
	padding: 0.6rem 0.7rem;
	display: flex;
	flex-direction: column;
	gap: 0.22rem;
}

.usage-item__header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 0.8rem;
}

.usage-item__title {
	font-size: 0.92rem;
	font-weight: 700;
	color: var(--fp-color-primary);
}

.usage-item__time,
.usage-item__meta,
.usage-item__tokens {
	font-size: 0.8rem;
	line-height: 1.45;
	color: var(--fp-color-tertiary);
}

.usage-item__tokens {
	color: var(--fp-color-primary);
}

.usage-item__tokens--muted {
	color: var(--fp-color-tertiary);
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
	.usage-card__grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

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
