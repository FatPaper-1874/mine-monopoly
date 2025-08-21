export enum GameOverRule {
	OnePlayerGoBroke, //一位玩家破产
	LeftOnePlayer, //只剩一位玩家
	Earn100000, //挣100000块钱
}

export enum OperateType {
	GameInitFinished = "GameInitFinished", //前端加载完毕
	RollDice = "RollDice", //前端掷骰子
	UseChanceCard = "UseChanceCard", //使用机会卡
	Animation = "AnimationComplete", //前端动画完成回馈
	BuyProperty = "BuyProperty", //买房子
	BuildHouse = "BuildHouse", //升级房子

	PauseGame = "PauseGame", //房主暂停游戏
	ResumeGame = "ResumeGame", //房主恢复游戏
}

export enum ChanceCardType {
	ToSelf = "ToSelf",
	ToOtherPlayer = "ToOtherPlayer",
	ToPlayer = "ToPlayer",
	ToProperty = "ToProperty",
	ToMapItem = "ToMapItem",
}

export enum ChanceCardOperateType {
	HOVER = "ChanceCardOperate-HOVER",
	DROG = "ChanceCardOperate-DROG",
	USE = "ChanceCardOperate-USE",
}

//与spine导出的角色文件中的动画名对应
export enum RoleAnimations {
	Idle = "idle",
	RoleWalking = "walking",
	Hi = "hi",
}

export enum GameEvents {
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
