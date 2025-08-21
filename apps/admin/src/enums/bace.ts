export enum ChanceCardType {
	ToSelf = "ToSelf",
	ToOtherPlayer = "ToOtherPlayer",
	ToPlayer = "ToPlayer",
	ToProperty = "ToProperty",
	ToMapItem = "ToMapItem",
}

export enum GameOverRule {
	OnePlayerGoBroke, //一位玩家破产
	LeftOnePlayer, //只剩一位玩家
	Earn100000	//挣100000块钱
}
