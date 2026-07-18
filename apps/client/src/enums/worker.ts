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
	UpdateAIDecisionConfig,
	AIDecisionResponse,

	// Debug (dev only)
	DebugGetState,
	GMAction,

	//Host Receive
	WorkerReady,
	SendToUsers,
	GameStart,
	GameOver,
	GameProcessReady,
	RequestAIDecision,

	// ????
	RequestSnapshot,
	SaveSnapshot,
	LoadSaveData,

	// Debug (dev only)
	DebugStateResponse,
	GMActionResponse,

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
