import { reactive, readonly } from "vue";
import type { AIRemoteCallDetail, AIRemoteUsagePlayerSnapshot, AIRemoteUsageRecord, AIRemoteUsageSummary } from "@mine-monopoly/types";

type CallContent = Omit<AIRemoteCallDetail, "record">;

// 调用详情单独保存；轮询快照只包含轻量记录。本次对局内保留所有调用，清空时一并释放。
const detailsById = new Map<string, CallContent>();
let recordSequence = 0;
const state = reactive({
	records: [] as AIRemoteUsageRecord[],
	summary: createEmptySummary(),
});

export function recordAIRemoteUsage(record: AIRemoteUsageRecord, details: CallContent = {}): string {
	const id = record.id || `ai-call-${Date.now().toString(36)}-${++recordSequence}`;
	const next = { ...record, id };
	state.records.unshift(next);
	detailsById.set(id, details);
	appendUsageSummary(state.summary, next);
	return id;
}

/** 已清空的请求不会因迟到的响应重新出现。 */
export function updateAIRemoteUsage(id: string, update: Partial<AIRemoteUsageRecord>, details: CallContent = {}): void {
	const index = state.records.findIndex((record) => record.id === id);
	if (index < 0) return;
	const previous = state.records[index];
	appendUsageSummary(state.summary, previous, -1);
	const next = { ...previous, ...update, id };
	state.records[index] = next;
	detailsById.set(id, { ...detailsById.get(id), ...details });
	appendUsageSummary(state.summary, next);
}

export function getAIRemoteCallDetail(id: string): AIRemoteCallDetail | null {
	const record = state.records.find((item) => item.id === id);
	if (!record) return null;
	return JSON.parse(JSON.stringify({ record, ...detailsById.get(id) })) as AIRemoteCallDetail;
}

export function clearAIRemoteUsageStats(): void {
	state.records = [];
	Object.assign(state.summary, createEmptySummary());
	detailsById.clear();
}

function createEmptySummary(): AIRemoteUsageSummary {
	return { requestCount: 0, usageCount: 0, missingUsageCount: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 };
}

function appendUsageSummary(summary: AIRemoteUsageSummary, record: AIRemoteUsageRecord, direction = 1): AIRemoteUsageSummary {
	summary.requestCount += direction;
	if (record.status === "pending") return summary;
	if (!record.usageAvailable) {
		summary.missingUsageCount += direction;
		return summary;
	}
	summary.usageCount += direction;
	summary.inputTokens += (record.inputTokens ?? 0) * direction;
	summary.outputTokens += (record.outputTokens ?? 0) * direction;
	summary.totalTokens += (record.totalTokens ?? 0) * direction;
	return summary;
}

export function getAIRemoteUsageSnapshot() {
	const byPlayer: Record<string, AIRemoteUsagePlayerSnapshot> = {};
	for (const record of state.records) {
		const current = byPlayer[record.playerId] || { playerId: record.playerId, summary: createEmptySummary(), records: [] };
		current.records.push({ ...record });
		appendUsageSummary(current.summary, record);
		byPlayer[record.playerId] = current;
	}
	return { records: state.records.map((record) => ({ ...record })), summary: { ...state.summary }, byPlayer };
}

export function useAIRemoteUsageStats() {
	return readonly(state);
}
