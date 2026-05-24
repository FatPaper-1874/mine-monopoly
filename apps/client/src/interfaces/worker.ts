import { WorkerCommType, WorkerState } from "@src/enums/worker";
import { GameMap, GameSetting, PlayerOperationResult, ServerSocketMessage, UserInRoomInfo } from "@mine-monopoly/types";
import { OperateType } from "@mine-monopoly/types";
import { SaveSnapshot } from "@src/core/save/types";

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
		saveData?: { snapshot: SaveSnapshot; aiPlayerIds: string[] };
	};
	[WorkerCommType.EmitOperation]: EmitOperationResult<OperateType>;
	[WorkerCommType.UserOffLine]: { userId: string };
	[WorkerCommType.UserReconnect]: { userId: string };

	// Debug (dev only)
	[WorkerCommType.DebugGetState]: undefined;

	//Host Receive
	[WorkerCommType.WorkerReady]: undefined;
	[WorkerCommType.SendToUsers]: { userIdList: string[]; data: ServerSocketMessage };
	[WorkerCommType.GameStart]: undefined;
	[WorkerCommType.GameOver]: undefined;
	[WorkerCommType.GameProcessReady]: undefined;

	// 存档相关
	[WorkerCommType.RequestSnapshot]: undefined;
	[WorkerCommType.SaveSnapshot]: { snapshot: SaveSnapshot };
	[WorkerCommType.LoadSaveData]: { snapshot: SaveSnapshot; aiPlayerIds: string[] };

	// Debug (dev only)
	[WorkerCommType.DebugStateResponse]: { state: GameProcessDebugState | null };

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
	customData: Record<string, any>;
	exportData: Record<string, any>;
	gameSetting: GameSetting;
	playerButtons: Array<[string, Array<[string, any]>]>;
	animationCompletionHandlers: string[];
	rankedPlayerIds: string[];
}
