import type {
	AIDecisionConfig,
	AIControlApplyConfigResult,
	AIControlBridge,
	AIControlMutationResult,
	AIControlSnapshot,
	AIPlayerDecisionBinding,
} from "@mine-monopoly/types";
import { useRoomInfo, useSettig } from "@src/store";
import { useMapData } from "@src/store/game";
import { normalizeAIDecisionConfig } from "./ai-decision-config";
import { clearAIRemoteUsageStats, getAIRemoteUsageSnapshot } from "./remote-usage-stats";

type AIRoomControlTarget = {
	updateAIDecisionConfig?: (config: AIDecisionConfig) => void;
	getAIConsoleSnapshot?: () => Promise<AIControlSnapshot>;
	updateAIPlayerName?: (
		userId: string,
		username: string,
	) => AIControlMutationResult | Promise<AIControlMutationResult>;
	setAIPlayerDecisionBinding?: (
		userId: string,
		binding: Partial<AIPlayerDecisionBinding>,
	) => AIControlMutationResult | Promise<AIControlMutationResult>;
	clearAIStrategyMemory?: (playerId?: string) => AIControlMutationResult | Promise<AIControlMutationResult>;
};

function getRoomControlTarget(): AIRoomControlTarget | null {
	const room = (window as Window & { __roomInstance?: AIRoomControlTarget }).__roomInstance;
	return room ?? null;
}

function buildLocalSnapshot(): AIControlSnapshot {
	const roomInfo = useRoomInfo();
	return {
		room: {
			roomId: roomInfo.roomId,
			ownerId: roomInfo.ownerId,
			isStarted: roomInfo.isStarted,
			mapName: roomInfo.mapInfo?.name ?? useMapData().info?.name ?? "",
			canSyncRoomAI: false,
		},
		config: normalizeAIDecisionConfig(useSettig().aiDecisionConfig),
		remoteUsage: getAIRemoteUsageSnapshot(),
		aiPlayers: [],
		debugState: null,
	};
}

export async function getAIControlSnapshot(): Promise<AIControlSnapshot> {
	const room = getRoomControlTarget();
	if (room?.getAIConsoleSnapshot) {
		const snapshot = await room.getAIConsoleSnapshot();
		return {
			...snapshot,
			config: normalizeAIDecisionConfig(snapshot.config),
			remoteUsage: snapshot.remoteUsage ?? getAIRemoteUsageSnapshot(),
			aiPlayers: Array.isArray(snapshot.aiPlayers) ? snapshot.aiPlayers : [],
		};
	}
	return buildLocalSnapshot();
}

export function applyAIControlConfig(config: AIDecisionConfig): AIControlApplyConfigResult {
	try {
		const nextConfig = normalizeAIDecisionConfig(config);
		useSettig().aiDecisionConfig = nextConfig;

		const room = getRoomControlTarget();
		const syncedRoomAI = Boolean(room?.updateAIDecisionConfig);
		room?.updateAIDecisionConfig?.(nextConfig);

		return {
			success: true,
			syncedRoomAI,
			config: nextConfig,
		};
	} catch (error: any) {
		return {
			success: false,
			error: error?.message || "应用 AI 配置失败",
		};
	}
}

export function clearAIControlRemoteUsageStats(): AIControlMutationResult {
	clearAIRemoteUsageStats();
	return { success: true };
}

export async function setAIControlPlayerName(
	userId: string,
	username: string,
): Promise<AIControlMutationResult> {
	const room = getRoomControlTarget();
	if (!room?.updateAIPlayerName) {
		return { success: false, error: "只有房主才能修改 AI 玩家名称" };
	}
	return await room.updateAIPlayerName(userId, username);
}

export async function setAIControlPlayerBinding(
	userId: string,
	binding: Partial<AIPlayerDecisionBinding>,
): Promise<AIControlMutationResult> {
	const room = getRoomControlTarget();
	if (!room?.setAIPlayerDecisionBinding) {
		return { success: false, error: "只有房主才能修改 AI 玩家绑定" };
	}
	return await room.setAIPlayerDecisionBinding(userId, binding);
}

export async function clearAIControlStrategyMemory(playerId?: string): Promise<AIControlMutationResult> {
	const room = getRoomControlTarget();
	if (!room?.clearAIStrategyMemory) {
		return { success: false, error: "游戏进程尚未启动" };
	}
	return await room.clearAIStrategyMemory(playerId);
}

export const aiControlBridge: AIControlBridge = {
	getSnapshot: getAIControlSnapshot,
	applyConfig: applyAIControlConfig,
	clearUsage: clearAIControlRemoteUsageStats,
	clearMemory: clearAIControlStrategyMemory,
	setPlayerName: setAIControlPlayerName,
	setPlayerBinding: setAIControlPlayerBinding,
};

export function registerAIControlBridge(): void {
	window.__aiControlBridge = aiControlBridge;
}
