import { GamePhaseInfo } from "@fatpaper-monopoly/types";
import { GamePhaseMark } from "@fatpaper-monopoly/types/enums/game/game-process";

export function getInitPhase() {
	const gameRoundStartPhases: GamePhaseInfo[] = new Array<GamePhaseInfo>();
	const playerRoundPhases: GamePhaseInfo[] = new Array<GamePhaseInfo>();
	const gameRoundEndPhases: GamePhaseInfo[] = new Array<GamePhaseInfo>();
	const gameInitedPhases: GamePhaseInfo[] = [gameInitedPhase];
	const gameOverRule: GamePhaseInfo[] = [gameOverRulePhase];

	gameRoundStartPhases.push(gameRoundStartPhase);
	playerRoundPhases.push(playerRoundStartPhase);
	playerRoundPhases.push(rollDicePhase);
	playerRoundPhases.push(playerMovePhase);
	playerRoundPhases.push(arrivedEventPhase);
	playerRoundPhases.push(playerRoundEndPhase);
	gameRoundEndPhases.push(gameRoundEndPhase);
	return {
		gameOverRule: gameOverRule,
		gameInited: gameInitedPhases,
		gameRoundStart: gameRoundStartPhases,
		playerRound: playerRoundPhases,
		gameRoundEnd: gameRoundEndPhases,
	};
}

const gameOverRulePhase: GamePhaseInfo = {
	id: crypto.randomUUID(),
	name: "游戏结束判定规则",
	description: "游戏结束判定规则, 返回一个布尔值, 当返回值为true时游戏结束",
	from: "系统",
	mark: GamePhaseMark.GameRoundStart,
	initEventCode: `(async (context: GameContext, gameProcess: IGameProcess) => {
	return false;
});`,
};

const gameInitedPhase: GamePhaseInfo = {
	id: crypto.randomUUID(),
	name: "游戏初始化结束",
	description: "游戏初始化结束阶段",
	from: "系统",
	mark: GamePhaseMark.GameRoundStart,
	initEventCode: `(async (context, gameProcess) => {

}) as GameEventFunction<GameContext>;`,
};

const gameRoundStartPhase: GamePhaseInfo = {
	id: crypto.randomUUID(),
	name: "轮次开始",
	description: "轮次开始阶段",
	from: "系统",
	mark: GamePhaseMark.GameRoundStart,
	initEventCode: `(async (context, gameProcess) => {

}) as GameEventFunction<GameRoundStartContext>;`,
};

const playerRoundStartPhase: GamePhaseInfo = {
	id: crypto.randomUUID(),
	name: "玩家回合开始",
	description: "玩家回合开始阶段",
	from: "系统",
	mark: GamePhaseMark.PlayerRoundStart,
	initEventCode: `(async (context, gameProcess) => {
    console.log("玩家回合开始")
	//通知玩家回合
	gameProcess.roundTurnNotify(context.currentRoundPlayer.getId());
	//开始倒计时
	// gameProcess.roundTimeTimer.start();
}) as GameEventFunction<PlayerRoundStartContext>;`,
};

const rollDicePhase: GamePhaseInfo = {
	id: crypto.randomUUID(),
	name: "玩家操作",
	description: "玩家操作阶段",
	from: "系统",
	mark: GamePhaseMark.RollDice,
	initEventCode: `(async (context, gameProcess) => {
	const currentPlayer = context.currentRoundPlayer;
	const currentPlayerId = currentPlayer.getId();

	//回合倒计时结束后自动掷骰子
	// gameProcess.roundTimeTimer.setTimeOutFunction(() => {
	//     gameProcess.emitPlayerOperation(currentPlayerId, OperateType.RollDice);
	// })

	//监听玩家使用机会卡
	function listenPlayerUseCard() {
		gameProcess.oncePlayerOperation(currentPlayerId, OperateType.UseChanceCard, async (res) => {
			const { chanceCardId, targetIdList } = res;
			const success = await gameProcess.handleUseChanceCard(context.currentRoundPlayer, chanceCardId, targetIdList);
			if (success) {
				//使用成功自动掷骰子
				gameProcess.emitPlayerOperation(currentPlayerId, OperateType.RollDice);
			} else {
				//使用失败继续监听
				listenPlayerUseCard();
			}
		});
	}
	listenPlayerUseCard();

	//等待玩家点击旋转骰子按钮
	await gameProcess.oncePlayerOperationAsync(currentPlayerId, OperateType.RollDice);
	gameProcess.removePlayerAllOperationListener(currentPlayerId, OperateType.UseChanceCard);
	
	//倒计时停止走动
	gameProcess.roundTimeTimer.pause();

	//播放骰子旋转动画
	gameProcess.gameBroadcast({ type: SocketMsgType.RollDiceStart, data: "" });

	//让骰子转1.5秒
	await new Promise((resolve) => setTimeout(resolve, 1500));

	//将骰子结果写入上下文
	if (!context.dice) {
		gameProcess.diceUtil.roll();
		context.dice = gameProcess.diceUtil.getResultArray();
	}

	//向客户端发送骰子结果
	const msgToRollDice: ServerSocketMessage = {
		type: SocketMsgType.RollDiceResult,
		source: SocketMsgSource.Server,
		data: {
			rollDiceResult: gameProcess.diceUtil.getResultArray(),
			rollDiceCount: gameProcess.diceUtil.getResultNumber(),
			rollDicePlayerId: currentPlayer.getId(),
		},
		msg: {
			type: "info",
			content: currentPlayer.getName()} + "摇到的点数是: " + gameProcess.diceUtil.getResultArray().join("-"),
		},
	};
	gameProcess.gameBroadcast(msgToRollDice);
}) as GameEventFunction<RollDiceContext>;`,
};

const playerMovePhase: GamePhaseInfo = {
	id: crypto.randomUUID(),
	name: "玩家移动",
	description: "玩家移动阶段",
	from: "系统",
	mark: GamePhaseMark.PlayerMove,
	initEventCode: `(async (context, gameProcess) => {
	//玩家移动
	const player = context.currentRoundPlayer;
	await player.walk(context.dice.reduce((p, c) => p + c, 0));
	context.targetIndex = player.getPositionIndex();
}) as GameEventFunction<PlayerMoveContext>;`,
};

const arrivedEventPhase: GamePhaseInfo = {
	id: crypto.randomUUID(),
	name: "到达事件",
	description: "到达事件阶段",
	from: "系统",
	mark: GamePhaseMark.ArrivedEvent,
	initEventCode: `(async (context, gameProcess) => {
	const player = context.currentRoundPlayer;
	await gameProcess.handleArriveEvent(player);
}) as GameEventFunction<ArrivedEventContext>;`,
};

const playerRoundEndPhase: GamePhaseInfo = {
	id: crypto.randomUUID(),
	name: "玩家回合结束",
	description: "玩家回合结束阶段",
	from: "系统",
	mark: GamePhaseMark.PlayerRoundEnd,
	initEventCode: `(async (context, gameProcess) => {
	
}) as GameEventFunction<PlayerRoundEndContext>;`,
};

const gameRoundEndPhase: GamePhaseInfo = {
	id: crypto.randomUUID(),
	name: "轮次结束",
	description: "轮次结束阶段",
	from: "系统",
	mark: GamePhaseMark.GameRoundEnd,
	initEventCode: `(async (context, gameProcess) => {
	
}) as GameEventFunction<GameRoundEndContext>;`,
};
