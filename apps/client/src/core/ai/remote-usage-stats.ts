import { reactive, readonly } from "vue";
import type { AIRemoteUsagePlayerSnapshot, AIRemoteUsageRecord, AIRemoteUsageSummary } from "@mine-monopoly/types";

const MAX_RECORDS = 30;

const state = reactive({
	records: [] as AIRemoteUsageRecord[],
	summary: {
		requestCount: 0,
		usageCount: 0,
		missingUsageCount: 0,
		inputTokens: 0,
		outputTokens: 0,
		totalTokens: 0,
	} as AIRemoteUsageSummary,
});

export function recordAIRemoteUsage(record: AIRemoteUsageRecord): void {
	state.records.unshift(record);
	if (state.records.length > MAX_RECORDS) {
		state.records.length = MAX_RECORDS;
	}

	state.summary.requestCount += 1;
	if (!record.usageAvailable) {
		state.summary.missingUsageCount += 1;
		return;
	}

	state.summary.usageCount += 1;
	state.summary.inputTokens += record.inputTokens ?? 0;
	state.summary.outputTokens += record.outputTokens ?? 0;
	state.summary.totalTokens += record.totalTokens ?? 0;
}

export function clearAIRemoteUsageStats(): void {
	state.records = [];
	state.summary.requestCount = 0;
	state.summary.usageCount = 0;
	state.summary.missingUsageCount = 0;
	state.summary.inputTokens = 0;
	state.summary.outputTokens = 0;
	state.summary.totalTokens = 0;
}

function createEmptySummary(): AIRemoteUsageSummary {
	return {
		requestCount: 0,
		usageCount: 0,
		missingUsageCount: 0,
		inputTokens: 0,
		outputTokens: 0,
		totalTokens: 0,
	};
}

function appendUsageSummary(summary: AIRemoteUsageSummary, record: AIRemoteUsageRecord): AIRemoteUsageSummary {
	summary.requestCount += 1;
	if (!record.usageAvailable) {
		summary.missingUsageCount += 1;
		return summary;
	}
	summary.usageCount += 1;
	summary.inputTokens += record.inputTokens ?? 0;
	summary.outputTokens += record.outputTokens ?? 0;
	summary.totalTokens += record.totalTokens ?? 0;
	return summary;
}

export function getAIRemoteUsageSnapshot() {
	const byPlayer: Record<string, AIRemoteUsagePlayerSnapshot> = {};
	for (const record of state.records) {
		const current = byPlayer[record.playerId] || {
			playerId: record.playerId,
			summary: createEmptySummary(),
			records: [],
		};
		current.records.push({ ...record });
		appendUsageSummary(current.summary, record);
		byPlayer[record.playerId] = current;
	}
	return {
		records: state.records.map((record) => ({ ...record })),
		summary: {
			...state.summary,
		},
		byPlayer,
	};
}

export function useAIRemoteUsageStats() {
	return readonly(state);
}
