export enum PlayerEvents {
	GetPropertiesList = "GetPropertiesList",
	GetCardsList = "GetCardsList",
	GetMoney = "GetMoney",
	GetStop = "GetStop",
	GetIsBankrupted = "GetIsBankrupted",
	AnimationFinished = "AnimationFinished",
	Walk = "Walk",
	Tp = "Tp",

	BeforeSetPropertiesList = "BeforeSetPropertiesList",
	AfterSetPropertiesList = "AfterSetPropertiesList",

	BeforeGainProperty = "BeforeGainProperty",
	AfterGainProperty = "AfterGainProperty",

	BeforeRound = "BeforeRound",
	AfterRound = "AfterRound",

	BeforeLoseProperty = "BeforeLoseProperty",
	AfterLoseProperty = "AfterLoseProperty",

	BeforeSetCardsList = "BeforeSetCardsList",
	AfterSetCardsList = "AfterSetCardsList",

	BeforeGainCard = "BeforeGainCard",
	AfterGainCard = "AfterGainCard",

	BeforeLoseCard = "BeforeLoseCard",
	AfterLoseCard = "AfterLoseCard",

	BeforeSetMoney = "BeforeSetMoney",
	AfterSetMoney = "AfterSetMoney",

	BeforeGain = "BeforeGain",
	AfterGain = "AfterGain",

	BeforeCost = "BeforeCost",
	AfterCost = "AfterCost",

	BeforeStop = "BeforeStop",
	AfterStop = "AfterStop",

	BeforeTp = "BeforeTp",
	AfterTp = "AfterTp",

	BeforeWalk = "BeforeWalk",
	AfterWalk = "AfterWalk",

	BeforeSetBankrupted = "BeforeSetBankrupted",
	AfterSetBankrupted = "AfterSetBankrupted",
}

export const playerBuffTriggerTimingMap: Record<PlayerEvents, string> = {
	[PlayerEvents.GetPropertiesList]: "获取地产数据时(不应该出现)",
	[PlayerEvents.GetCardsList]: "获取机会卡数据时(不应该出现)",
	[PlayerEvents.GetMoney]: "获取金钱数据时(不应该出现)",
	[PlayerEvents.GetStop]: "获取跳过回合次数时(不应该出现)",
	[PlayerEvents.GetIsBankrupted]: "获取破产信息时(不应该出现)",
	[PlayerEvents.AnimationFinished]: "获取动画完毕时(不应该出现)",
	[PlayerEvents.Walk]: "走路时(不应该出现)",
	[PlayerEvents.Tp]: "传送时(不应该出现)",

	[PlayerEvents.BeforeSetPropertiesList]: "设置地产列表前",
	[PlayerEvents.AfterSetPropertiesList]: "设置地产列表后",

	[PlayerEvents.BeforeRound]: "回合开始前",
	[PlayerEvents.AfterRound]: "回合结束后",

	[PlayerEvents.BeforeGainProperty]: "获得地产前",
	[PlayerEvents.AfterGainProperty]: "获得地产后",

	[PlayerEvents.BeforeLoseProperty]: "失去地产前",
	[PlayerEvents.AfterLoseProperty]: "失去地产后",

	[PlayerEvents.BeforeSetCardsList]: "设置机会卡列表前",
	[PlayerEvents.AfterSetCardsList]: "设置机会卡列表后",

	[PlayerEvents.BeforeGainCard]: "获得机会卡前",
	[PlayerEvents.AfterGainCard]: "获得机会卡后",

	[PlayerEvents.BeforeLoseCard]: "失去机会卡前",
	[PlayerEvents.AfterLoseCard]: "失去机会卡后",

	[PlayerEvents.BeforeSetMoney]: "设置金钱数前",
	[PlayerEvents.AfterSetMoney]: "设置金钱数后",

	[PlayerEvents.BeforeGain]: "获得金钱前",
	[PlayerEvents.AfterGain]: "获得金钱后",

	[PlayerEvents.BeforeCost]: "失去金钱前",
	[PlayerEvents.AfterCost]: "失去金钱后",

	[PlayerEvents.BeforeStop]: "停止回合前",
	[PlayerEvents.AfterStop]: "停止回合后",

	[PlayerEvents.BeforeTp]: "TP前",
	[PlayerEvents.AfterTp]: "TP后",

	[PlayerEvents.BeforeWalk]: "走路前",
	[PlayerEvents.AfterWalk]: "走路后",

	[PlayerEvents.BeforeSetBankrupted]: "设置破产前",
	[PlayerEvents.AfterSetBankrupted]: "设置破产后",
};
