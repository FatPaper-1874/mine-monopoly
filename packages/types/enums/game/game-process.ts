export enum GamePhaseMark {
	GameRoundStart,

	//多个玩家阶段
	PlayerRoundStart,
	RollDice,
	PlayerMove,
	ArrivedEvent,
	PlayerRoundEnd,

	GameRoundEnd,
}

export enum EventTiggerTime {
	Before = "BEFORE",
	After = "AFTER",
}
