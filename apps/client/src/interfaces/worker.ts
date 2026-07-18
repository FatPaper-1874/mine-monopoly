import { WorkerCommType, WorkerState } from "@src/enums/worker";
import {
	AIDecisionConfig,
	AIDecisionRequest,
	AIDecisionSelection,
	AIStrategyState,
	GameMap,
	GameSetting,
	PlayerOperationResult,
	ServerSocketMessage,
	UserInRoomInfo,
} from "@mine-monopoly/types";
import { OperateType } from "@mine-monopoly/types";
import { SaveSnapshot } from "@src/core/save/types";

// GM Action 基础接口
export interface BaseGMAction {
	id: string;
	timestamp: number;
}

// GM Action 类型
export interface SetMoneyAction extends BaseGMAction {
	type: 'setMoney';
	payload: {
		playerId: string;
		operation: 'set' | 'add' | 'subtract';
		amount: number;
	};
}

export interface AddChanceCardAction extends BaseGMAction {
	type: 'addChanceCard';
	payload: {
		cardId: string;
		targetPlayerId: string;
	};
}

export interface SetPropertyOwnerAction extends BaseGMAction {
	type: 'setPropertyOwner';
	payload: {
		propertyId: string;
		newOwnerId: string | null;
	};
}

export type GMAction = SetMoneyAction | AddChanceCardAction | SetPropertyOwnerAction;

// GM Action 响应
export interface GMActionResponseData {
	success: boolean;
	error?: string;
	data?: {
		newMoney?: number;
		cardName?: string;
		targetPlayerName?: string;
		propertyName?: string;
		oldOwner?: string | null;
		newOwner?: string | null;
	};
}

// 组件验证错误
export interface ComponentValidationError {
	componentType: 'role' | 'property' | 'phase' | 'chanceCard';
	componentId: string;
	componentName: string;
	errorType: 'compile' | 'runtime' | 'notFound';
	errorMessage: string;
	errorStack?: string;
	userId?: string;
}

// 状态变化消息
export interface WorkerStateChangedData {
	previousState: WorkerState;
	currentState: WorkerState;
	reason?: string;
}

// 心跳数据
export interface HeartbeatData {
	timestamp: number;
	gameState: {
		currentRound: number;
		currentPlayerId?: string;
		isGameOver: boolean;
		isBusy: boolean;
	};
}

// 详细错误数据
export interface DetailedErrorData {
	category: string;
	type: string;
	component?: string;
	message: string;
	technical?: {
		message: string;
		stack?: string;
		mapInfo?: any;
	};
}

export type WorkerCommMsg = {
	[K in keyof WorkerCommDataTypeMap]: {
		type: K;
		data: WorkerCommDataTypeMap[K];
	};
}[keyof WorkerCommDataTypeMap];

type EmitOperationResult<T extends OperateType> = { userId: string; operateType: T; data: PlayerOperationResult[T] };

interface WorkerCommDataTypeMap {
	//Worker Receive
	[WorkerCommType.LoadGameInfo]: {
		setting: GameSetting;
		mapInfo: GameMap;
		userList: UserInRoomInfo[];
		roomOwnerId: string;
		aiConfig: AIDecisionConfig;
		saveData?: { snapshot: SaveSnapshot; aiPlayerIds: string[] };
	};
	[WorkerCommType.EmitOperation]: EmitOperationResult<OperateType>;
	[WorkerCommType.UserOffLine]: { userId: string };
	[WorkerCommType.UserReconnect]: { userId: string };
	[WorkerCommType.UpdateAIDecisionConfig]: AIDecisionConfig;
	[WorkerCommType.ClearAIStrategyMemory]: { playerId?: string };
	[WorkerCommType.AIDecisionResponse]: {
		requestId: string;
		selection?: AIDecisionSelection;
		error?: string;
	};

	// Debug (dev only)
	[WorkerCommType.DebugGetState]: undefined;
	[WorkerCommType.GMAction]: GMAction;

	//Host Receive
	[WorkerCommType.WorkerReady]: undefined;
	[WorkerCommType.SendToUsers]: { userIdList: string[]; data: ServerSocketMessage };
	[WorkerCommType.GameStart]: undefined;
	[WorkerCommType.GameOver]: undefined;
	[WorkerCommType.GameProcessReady]: undefined;
	[WorkerCommType.RequestAIDecision]: {
		requestId: string;
		request: AIDecisionRequest;
	};

	// 存档相关
	[WorkerCommType.RequestSnapshot]: undefined;
	[WorkerCommType.SaveSnapshot]: { snapshot: SaveSnapshot };
	[WorkerCommType.LoadSaveData]: { snapshot: SaveSnapshot; aiPlayerIds: string[] };

	// Debug (dev only)
	[WorkerCommType.DebugStateResponse]: { state: GameProcessDebugState | null };
	[WorkerCommType.GMActionResponse]: { action: GMAction; response: GMActionResponseData };

	// 状态同步
	[WorkerCommType.WorkerStateChanged]: WorkerStateChangedData;
	[WorkerCommType.WorkerHeartbeat]: HeartbeatData;

	// 错误报告
	[WorkerCommType.ValidationError]: ComponentValidationError[];
	[WorkerCommType.DetailedError]: DetailedErrorData;

	// 安全模式控制
	[WorkerCommType.EnterSafeMode]: { reason?: string };
	[WorkerCommType.ExitSafeMode]: undefined;
	[WorkerCommType.RetryFromSafeMode]: undefined;
}


/** Debug state snapshot exported from Worker for Inspector */
export interface GameProcessDebugState {
	currentRound: number;
	currentMultiplier: number;
	currentRoundPlayer: string | null;
	currentGamePhase: string | null;
	currentEventName: string;
	isGameOver: boolean;
	gameRuntimeStack: { stackSize: number; isRunning: boolean };
	players: Array<Record<string, any>>;
	properties: Array<Record<string, any>>;
	chanceCardInfos: Array<[string, any]>;
	mapItems: Array<[string, any]>;
	mapEvents: Array<[string, any]>;
	gameLogList: Array<Record<string, any>>;
	exportData: Record<string, any>;
	customData: Record<string, any>;
	gameSetting: GameSetting;
	playerButtons: Array<[string, Array<[string, any]>]>;
	animationCompletionHandlers: string[];
	rankedPlayerIds: string[];
	aiStrategyStates: Record<string, AIStrategyState>;
}
