export enum WorkerCommType {
	//Worker Receive
	LoadGameInfo,
	EmitOperation,
	UserOffLine,
	UserReconnect,

	//Host Receive
	WorkerReady,
	SendToUsers,
	GameStart,
	GameOver,
	GameProcessReady,

	// 存档相关
	RequestSnapshot,
	SaveSnapshot,
	LoadSaveData,
}
