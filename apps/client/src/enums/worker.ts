export enum WorkerState {
	Uninitialized = "uninitialized",
	Initializing = "initializing",
	Ready = "ready",
	Running = "running",
	Paused = "paused",
	Failed = "failed",
	Crashed = "crashed",
	SafeMode = "safe_mode",
	Terminated = "terminated",
}

export enum WorkerCommType {
	//Worker Receive
	LoadGameInfo,
	EmitOperation,
	UserOffLine,
	UserReconnect,

	// Debug (dev only)
	DebugGetState,

	//Host Receive
	WorkerReady,
	SendToUsers,
	GameStart,
	GameOver,
	GameProcessReady,

	// ????
	RequestSnapshot,
	SaveSnapshot,
	LoadSaveData,

	// Debug (dev only)
	DebugStateResponse,

	// 状态同步
	WorkerStateChanged,
	WorkerHeartbeat,

	// 错误报告
	ValidationError,
	DetailedError,

	// 安全模式控制
	EnterSafeMode,
	ExitSafeMode,
	RetryFromSafeMode,
}
