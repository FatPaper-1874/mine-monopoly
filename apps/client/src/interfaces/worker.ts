import { WorkerCommType } from "@src/enums/worker";
import { GameMap, GameSetting, PlayerOperationResult, ServerSocketMessage, UserInRoomInfo } from "@mine-monopoly/types";
import { OperateType } from "@mine-monopoly/types";
import { SaveSnapshot } from "@src/core/save/types";

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
}
