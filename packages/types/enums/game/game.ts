export enum GameOverRule {
	OnePlayerGoBroke, //一位玩家破产
	LeftOnePlayer, //只剩一位玩家
	Earn100000, //挣100000块钱
}
export enum PlayerMoveType{
	Walk,
	Tp
}

export enum TargetSelectType {
	ToSelf = "ToSelf",
	ToOtherPlayer = "ToOtherPlayer",
	ToPlayer = "ToPlayer",
	ToProperty = "ToProperty",
	ToMapItem = "ToMapItem",
}

//与spine导出的角色文件中的动画名对应
export enum RoleAnimations {
	Idle = "idle",
	RoleWalking = "walking",
	Hi = "hi",
}

export enum MapEventType {
	ArrivedEvent = "ArrivedEvent",
	PassedEvent = "PassedEvent",
	NormalEvents = "NormalEvents",
}

export enum GameEventType {
	TimeOut = "TimeOut",
	GainMoney = "GainMoney",
	CostMoney = "CostMoney",
}

export enum GameLinkItem {
	Player = "Player",
	ChanceCard = "ChanceCard",
	Property = "Property",
	ArrivedEvent = "ArrivedEvent",
}
