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
}
