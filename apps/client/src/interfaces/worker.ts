import { WorkerCommType } from "@src/enums/worker";
import {GameMap, GameSetting, PlayerOperationResult, ServerSocketMessage, UserInRoomInfo} from "@fatpaper-monopoly/types";
import { OperateType } from "@fatpaper-monopoly/types";

export type WorkerCommMsg = {
	[K in keyof WorkerCommDataTypeMap]: {
		type: K;
		data: WorkerCommDataTypeMap[K];
	};
}[keyof WorkerCommDataTypeMap];

type EmitOperationResult<T extends OperateType> = { userId: string; operateType: T; data: PlayerOperationResult[T] }

interface WorkerCommDataTypeMap {
	//Worker Receive
	[WorkerCommType.LoadGameInfo]: {
		setting: GameSetting;
		mapInfo: GameMap;
		userList: UserInRoomInfo[];
		roomOwnerId: string;
	};
	[WorkerCommType.EmitOperation]: EmitOperationResult<OperateType>;
	[WorkerCommType.UserOffLine]: { userId: string };
	[WorkerCommType.UserReconnect]: { userId: string };

	//Host Receive
	[WorkerCommType.WorkerReady]: undefined;
	[WorkerCommType.SendToUsers]: { userIdList: string[]; data: ServerSocketMessage };
	[WorkerCommType.GameStart]: undefined;
	[WorkerCommType.GameOver]: undefined;
}
