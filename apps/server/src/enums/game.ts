export enum GameOverRule {
	OnePlayerGoBroke, //一位玩家破产
	LeftOnePlayer, //只剩一位玩家
	Earn100000	//挣100000块钱
}

export enum OperateType {
	GameInitFinished ="GameInitFinished", //前端加载完毕
	RollDice = "RollDice", //前端掷骰子
	UseChanceCard = "UseChanceCard", //使用机会卡
	Animation = "AnimationComplete", //前端动画完成回馈
	BuyProperty = "BuyProperty", //买房子
	BuildHouse = "BuildHouse", //升级房子
}

export enum PlayerEvents {
	GetPropertiesList = "GetPropertiesList",
	SetPropertiesList = "SetPropertiesList",
	GainProperty = "GainProperty",
	LoseProperty = "LoseProperty",
	GetCardsList = "GetCardsList",
	SetCardsList = "SetCardsList",
	GainCard = "GainCard",
	LoseCard = "LoseCard",
	GetMoney = "GetMoney",
	SetMoney = "SetMoney",
	Gain = 'Gain',
	Cost = 'Cont',
	GetStop = 'GetStop',
	SetStop = 'SetStop',
	Walk = 'Walk',
	Tp = 'Tp',
	SetBankrupted = 'SetBankrupted',
	GetIsBankrupted = 'GetIsBankrupted'
}
