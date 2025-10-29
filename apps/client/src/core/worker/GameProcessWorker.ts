import { OperateListener } from "./class/OperateListener";
import { WorkerCommMsg } from "@src/interfaces/worker";
import { WorkerCommType } from "@src/enums/worker";
import {
	ChanceCardClientInfo,
	ChanceCardInfo,
	ChanceCardInstanceInfo,
	TargetSelectType,
	ConfirmDialogOption,
	ConfirmDialogResult,
	GameContext,
	GameData,
	GameEvent,
	GameLinkItem,
	GameLog,
	GameMap,
	GameSetting,
	IGamePhase,
	IGameProcess,
	InputOptionItem,
	IPlayer,
	IProperty,
	MapEvent,
	MapItem,
	OperateType,
	PlayerEvents,
	PlayerOperationResult,
	PlayerRoundContext,
	ServerSocketMessage,
	SocketMsgSource,
	SocketMsgType,
	UserInRoomInfo,
	SelectDialogOption,
	SelectDialogResult,
	IChanceCard,
} from "@fatpaper-monopoly/types";

import Dice from "./class/Dice";
import { RoundTimeTimer } from "./class/RoundTimeTimer";
import { Player } from "./class/Player";
import { Property } from "./class/Property";
import { ChanceCard } from "./class/ChanceCard";
import { compileTsToJs, randomString } from "@src/utils";
import { GamePhase } from "@src/core/worker/class/GamePhase";
import { GameRuntimeStack } from "@src/core/worker/class/GameRuntimeStack";
import GameProcessTypes from "./editor-lib.d.ts?raw";

const operationListener = new OperateListener();
let gameProcess: GameProcess | null = null;

self.postMessage(<WorkerCommMsg>{
	type: WorkerCommType.WorkerReady,
});

self.addEventListener("message", (ev) => {
	const data = ev.data as WorkerCommMsg;
	switch (data.type) {
		case WorkerCommType.LoadGameInfo:
			{
				const { mapInfo, setting, userList, roomOwnerId } = data.data;
				gameProcess = new GameProcess(mapInfo, setting, userList, roomOwnerId);
				gameProcess.start();
			}
			break;
		case WorkerCommType.EmitOperation:
			{
				const { userId, operateType, data: _data } = data.data;
				operationListener.emit(userId, operateType, _data);
			}
			break;
		case WorkerCommType.UserOffLine:
			{
				// const { userId } = data.data;
				// gameProcess && gameProcess.handlePlayerOffline(userId);
			}
			break;
		case WorkerCommType.UserReconnect:
			{
				// const { userId } = data.data;
				// gameProcess && gameProcess.handlePlayerReconnect(userId);
			}
			break;
	}
});

function sendToUsers(userIdList: string[], msg: ServerSocketMessage) {
	self.postMessage(<WorkerCommMsg>{
		type: WorkerCommType.SendToUsers,
		data: {
			userIdList,
			data: msg,
		},
	});
}

(async () => {})();

export class GameProcess implements IGameProcess {
	public extraData: Record<string, any> = {};
	private startTime: number = Date.now();

	public mapData: GameMap;
	private gameSetting: GameSetting;
	private userList: UserInRoomInfo[];

	private gameRoundPhase: {
		roundStartPhase: IGamePhase<GameContext>[];
		roundEndPhase: IGamePhase<GameContext>[];
	};
	public currentGamePhase: IGamePhase<GameContext> | null = null;
	public players: Map<string, Player> = new Map();
	public properties: Map<string, Property> = new Map();
	public chanceCardInfos: Map<string, ChanceCardInfo> = new Map();
	public mapItems: Map<string, MapItem> = new Map();
	public mapEvents: Map<string, MapEvent> = new Map();

	public gameRuntimeStack: GameRuntimeStack = new GameRuntimeStack();

	public currentRoundPlayer: Player | null = null;
	public currentRound: number = 0; //当前回合
	private isGameOver: boolean = false;
	private timeoutList: any[] = []; //计时器列表
	private intervalTimerList: any[] = []; //计时器列表
	public roundTimeTimer: RoundTimeTimer; //倒计时
	private gameLogList: GameLog[] = [];

	public currentMultiplier: number = 1;

	public diceUtil: Dice;

	constructor(mapData: GameMap, gameSetting: GameSetting, userList: UserInRoomInfo[], roomOwnerId: string) {
		this.mapData = mapData;
		this.gameSetting = gameSetting;
		this.userList = userList;

		this.diceUtil = new Dice(gameSetting.diceNum);
		this.roundTimeTimer = new RoundTimeTimer(gameSetting.roundTime, 1000);
		if (gameSetting.slackOffMode) {
			operationListener.on(roomOwnerId, OperateType.PauseGame, () => {
				console.log("PauseGame");
				this.roundTimeTimer.pause();
				this.gameBroadcast(<ServerSocketMessage>{
					type: SocketMsgType.PauseGame,
					msg: {
						type: "info",
						content: "房主摸鱼被发现了，游戏暂停",
					},
				});
			});
			operationListener.on(roomOwnerId, OperateType.ResumeGame, () => {
				console.log("ResumeGame");
				this.roundTimeTimer.resume();
				this.gameBroadcast(<ServerSocketMessage>{
					type: SocketMsgType.ResumeGame,
					msg: {
						type: "info",
						content: "房主回来了，游戏继续",
					},
				});
			});
		}

		this.gameRoundPhase = {
			roundStartPhase: mapData.phases.gameRoundStart.map((phaseInfo) => new GamePhase(phaseInfo)),
			roundEndPhase: mapData.phases.gameRoundEnd.map((phaseInfo) => new GamePhase(phaseInfo)),
		};
		this.initMap();
		this.initPlayer();
	}

	private initMap() {
		const { mapItems, mapEvents, chanceCards } = this.mapData;

		mapEvents.forEach((mapEvent) => {
			this.mapEvents.set(mapEvent.id, {
				...mapEvent,
				effectCode: compileTsToJs(mapEvent.effectCode, GameProcessTypes),
			});
		});

		mapItems.forEach((mapItem) => {
			if (mapItem.property) {
				const property = mapItem.property;
				this.properties.set(property.id, new Property(property));
			}
			this.mapItems.set(mapItem.id, mapItem);
		});

		chanceCards.forEach((chanceCard) => {
			this.chanceCardInfos.set(chanceCard.id, {
				...chanceCard,
				effectCode: compileTsToJs(chanceCard.effectCode, GameProcessTypes),
			});
		});
		console.log("🚀 ~ GameProcess ~ initMap ~ this.chanceCardInfos:", this.chanceCardInfos);
	}

	private initPlayer() {
		this.userList.forEach((u) => {
			const role = this.mapData.roles.find((r) => r.id === u.roleId);
			if (!role) throw Error("找不到对应角色");
			const player = new Player(u, this.gameSetting.initMoney, 0, this.mapData.phases.playerRound, role);
			player.setPositionIndex(0);
			this.players.set(player.getId(), player);

			player.addEventListener(PlayerEvents.Walk, async (step: number) => {
				const walkId = randomString(16);
				const msg: ServerSocketMessage = {
					type: SocketMsgType.PlayerWalk,
					source: SocketMsgSource.Server,
					data: { playerId: player.getId(), step, walkId },
				};
				const sourceIndex = player.getPositionIndex();
				const total = this.mapData.mapIndex.length;
				const newIndex = (((sourceIndex + step) % total) + total) % total;
				let passedStart = false;
				if (step > 0) {
					passedStart = sourceIndex + step >= total;
				} else if (step < 0) {
					passedStart = sourceIndex + step < 0;
				}
				player.setPositionIndex(newIndex);
				this.gameInfoBroadcast();
				this.gameBroadcast(msg);

				//在计划的动画完成事件后取消监听, 防止客户端因特殊情况没有发送动画完成的指令造成永久等待
				const animationDuration = 600 * (Math.abs(step) + 3);
				let animationTimer = setTimeout(() => {
					operationListener.emit(player.getId(), OperateType.Animation);
				}, animationDuration);
				await new Promise((resolve) => {
					listenAnimationCallback("");
					function listenAnimationCallback(resAnimationId: string) {
						if (resAnimationId !== walkId) {
							operationListener.once(player.getId(), OperateType.Animation, listenAnimationCallback);
						} else {
							resolve("");
						}
					}
				});
				clearTimeout(animationTimer);
				player.emit(PlayerEvents.AnimationFinished);
				return step;
			});

			player.addEventListener(PlayerEvents.Tp, async (positionIndex: number) => {
				const walkId = randomString(16);
				const msg: ServerSocketMessage = {
					type: SocketMsgType.PlayerTp,
					source: SocketMsgSource.Server,
					data: { playerId: player.getId(), positionIndex, walkId },
				};
				player.setPositionIndex(positionIndex);
				this.gameInfoBroadcast();
				this.gameBroadcast(msg);

				//在计划的动画完成事件后取消监听, 防止客户端因特殊情况没有发送动画完成的指令造成永久等待
				const animationDuration = 2000;
				let animationTimer = setTimeout(() => {
					operationListener.emit(player.getId(), OperateType.Animation, walkId);
				}, animationDuration);
				//TODO
				await new Promise((resolve) => {
					listenAnimationCallback("");
					function listenAnimationCallback(resAnimationId: string) {
						if (resAnimationId !== walkId) {
							operationListener.once(player.getId(), OperateType.Animation, listenAnimationCallback);
						} else {
							resolve("");
						}
					}
				});
				clearTimeout(animationTimer);
				player.emit(PlayerEvents.AnimationFinished);
				return positionIndex;
			});
		});
	}

	private async gameLoop() {
		this.roundTimeTimer.setIntervalFunction(this.roundRemainingTimeBroadcast);
		//游戏循环
		while (!this.isGameOver) {
			//回合循环 加载回合开始阶段
			const roundStartPhases = this.gameRoundPhase.roundStartPhase;
			for (const phase of roundStartPhases) {
				await this.runGamePhase(phase);
			}

			//玩家回合
			for (const player of Array.from(this.players.values())) {
				const context: PlayerRoundContext = {
					currentRoundPlayer: player,
				};
				const playerRoundPhases = player.getRoundPhases();
				for (const phase of playerRoundPhases) {
					await this.runGamePhase(phase, context);
				}
			}

			//回合结束阶段
			const roundEndPhases = this.gameRoundPhase.roundEndPhase;
			for (const phase of roundEndPhases) {
				await this.runGamePhase(phase);
			}
		}
		this.roundTimeTimer.clearInterval();
	}

	public async handlePlayerRollDice(playerId: string) {
		const player = this.getPlayerById(playerId);
		if (!player) throw Error("玩家掷骰子时找不到玩家");
		this.gameBroadcast({
			type: SocketMsgType.RollDiceStart,
			source: SocketMsgSource.Server,
			data: "",
		});
		//摇骰子
		this.diceUtil.roll();
		//让骰子摇一会 :P
		await this.sleep(1500);
		//发送信息
		const msgToRollDice: ServerSocketMessage = {
			type: SocketMsgType.RollDiceResult,
			source: SocketMsgSource.Server,
			data: {
				rollDiceResult: this.diceUtil.getResultArray(),
				rollDiceCount: this.diceUtil.getResultNumber(),
				rollDicePlayerId: player.getId(),
			},
			msg: {
				type: "info",
				content: `${player.getName()} 摇到的点数是: ${this.diceUtil.getResultArray().join("-")}`,
			},
		};
		this.gameLogBroadcast(
			`${this.createGameLinkItem(GameLinkItem.Player, player.getId())} 摇到的点数是: ${this.diceUtil
				.getResultArray()
				.join("-")}`
		);
		this.gameBroadcast(msgToRollDice);
	}

	private async handlePlayerBuyProperty(player: IPlayer, property: IProperty) {
		const msgToSend: ServerSocketMessage = {
			type: SocketMsgType.MsgNotify,
			source: SocketMsgSource.Server,
			data: undefined,
		};
		if (player.getMoney() > property.getSellCost()) {
			property.setOwner(player);
			this.gameInfoBroadcast();
			this.gameMsgNotifyBroadcast("info", `${player.getName()} 买下了地皮 ${property.getName()}`);
			this.gameLogBroadcast(
				`${this.createGameLinkItem(GameLinkItem.Player, player.getId())} 买下了地皮 ${this.createGameLinkItem(
					GameLinkItem.Property,
					property.getId()
				)}`
			);
			player.cost(property.getSellCost());
		} else {
			msgToSend.msg = { type: "error", content: "不够钱啊穷鬼" };
			sendToUsers([player.getId()], msgToSend);
		}
	}

	private async handlePlayerBuildUp(player: IPlayer, property: IProperty) {
		const msgToSend: ServerSocketMessage = {
			type: SocketMsgType.MsgNotify,
			source: SocketMsgSource.Server,
			data: undefined,
		};
		if (player.getMoney() > property.getSellCost()) {
			property.buildUp();
			this.gameInfoBroadcast();
			this.gameMsgNotifyBroadcast(
				"info",
				`${player.getName()}把地皮${property.getName()}升到了${property.getBuildingLevel()}级`
			);
			this.gameLogBroadcast(
				`${this.createGameLinkItem(GameLinkItem.Player, player.getId())} 把地皮 ${this.createGameLinkItem(
					GameLinkItem.Property,
					property.getId()
				)} 升到了 ${property.getBuildingLevel()} 级`
			);
			await player.cost(property.getSellCost());
		} else {
			msgToSend.msg = { type: "error", content: "不够钱啊穷鬼" };
			sendToUsers([player.getId()], msgToSend);
		}
		return;
	}

	// private getRandomChanceCard(num: number): ChanceCard[] {
	// 	let tempChanceCardList: ChanceCard[] = [];
	// 	for (let i = 0; i < num; i++) {
	// 		const getIndex = Math.floor(Math.random() * this.chanceCardInfoList.length);
	// 		const card = this.chanceCardInfos.get();
	// 		if (card) tempChanceCardList.push(new ChanceCard(card));
	// 	}
	// 	return tempChanceCardList;
	// }

	public generateNewChanceCard(sourceId: string): IChanceCard {
		const tempChanceCard = this.chanceCardInfos.get(sourceId);
		if (!tempChanceCard) throw new Error(`错误的机会卡ID: ${sourceId}`);
		return new ChanceCard(tempChanceCard);
	}

	public async handleUseChanceCard(sourcePlayer: IPlayer, chanceCardId: string, targetIdList: string[]) {
		this.roundTimeTimer.stop();
		const chanceCard = sourcePlayer.getCardById(chanceCardId);
		if (chanceCard) {
			let error = ""; //收集错误信息
			try {
				switch (
					chanceCard.getType() //根据机会卡的类型执行不同操作
				) {
					case TargetSelectType.ToSelf:
						await chanceCard.use(sourcePlayer, sourcePlayer, this); //直接使用
						this.gameMsgNotifyBroadcast(
							"info",
							`${sourcePlayer.getName()} 对自己使用了机会卡: "${chanceCard.getName()}"`
						);
						this.gameLogBroadcast(
							`${this.createGameLinkItem(
								GameLinkItem.Player,
								sourcePlayer.getId()
							)} 对自己使用了机会卡: ${this.createGameLinkItem(GameLinkItem.ChanceCard, chanceCard.getSourceId())}`
						);
						break;
					case TargetSelectType.ToOtherPlayer:
					case TargetSelectType.ToPlayer:
						const _targetPlayer = this.players.get(targetIdList[0]); //获取目标玩家对象
						if (!_targetPlayer) {
							error = "目标玩家不存在";
							break;
						}
						await chanceCard.use(sourcePlayer, _targetPlayer, this);
						this.gameMsgNotifyBroadcast(
							"info",
							`${sourcePlayer.getName()} 对玩家 ${_targetPlayer.getName()} 使用了机会卡: "${chanceCard.getName()}"`
						);
						this.gameLogBroadcast(
							`${this.createGameLinkItem(GameLinkItem.Player, sourcePlayer.getId())} 对玩家 ${this.createGameLinkItem(
								GameLinkItem.Player,
								_targetPlayer.getId()
							)} 使用了机会卡: ${this.createGameLinkItem(GameLinkItem.ChanceCard, chanceCard.getSourceId())}`
						);
						break;
					case TargetSelectType.ToProperty:
						const _targetProperty = this.properties.get(targetIdList[0]);
						if (!_targetProperty) {
							error = "目标建筑/地皮不存在";
							break;
						}
						await chanceCard.use(sourcePlayer, _targetProperty, this);
						this.gameMsgNotifyBroadcast(
							"info",
							`${sourcePlayer.getName()} 对地皮 ${_targetProperty.getName()} 使用了机会卡: "${chanceCard.getName()}"`
						);
						this.gameLogBroadcast(
							`${this.createGameLinkItem(GameLinkItem.Player, sourcePlayer.getId())} 对地皮 ${this.createGameLinkItem(
								GameLinkItem.Property,
								_targetProperty.getId()
							)} 使用了机会卡: ${this.createGameLinkItem(GameLinkItem.ChanceCard, chanceCard.getSourceId())}`
						);
						break;
					case TargetSelectType.ToMapItem:
						const _targetIdList = targetIdList as string[];
						const _targetPlayerList: Player[] = [];
						_targetIdList.forEach((id) => {
							//获取目标玩家列表
							const _tempPlayer = this.players.get(id);
							if (_tempPlayer) {
								_targetPlayerList.push(_tempPlayer);
							}
						});
						if (_targetPlayerList.length === 0) {
							error = "选中的玩家不存在";
							break;
						}
						await chanceCard.use(sourcePlayer, _targetPlayerList, this);
						break;
				}
			} catch (e: any) {
				error = e.message;
			}
			if (error) {
				const errorMsg: ServerSocketMessage = {
					type: SocketMsgType.MsgNotify,
					data: undefined,
					source: SocketMsgSource.Server,
					msg: {
						type: "error",
						content: error,
					},
				};
				sendToUsers([sourcePlayer.getId()], errorMsg);
				const callBackMsg: ServerSocketMessage = {
					type: SocketMsgType.UseChanceCard,
					data: { error: true },
					source: SocketMsgSource.Server,
				};
				sendToUsers([sourcePlayer.getId()], callBackMsg);
				return false;
			} else {
				sourcePlayer.loseCard(chanceCardId);
				const successMsg: ServerSocketMessage = {
					type: SocketMsgType.MsgNotify,
					data: undefined,
					source: SocketMsgSource.Server,
					msg: {
						type: "success",
						content: `机会卡 ${chanceCard.getName()} 使用成功！`,
					},
				};
				this.gameInfoBroadcast();

				// this.eventMsg = `等待 ${sourcePlayer.getName()} 掷骰子`;
				// this.roundTimeTimer.setTimeOutFunction(handleUseChanceCardTimeOut);
				sendToUsers([sourcePlayer.getId()], successMsg);
				const callBackMsg: ServerSocketMessage = {
					type: SocketMsgType.UseChanceCard,
					data: { error: false },
					source: SocketMsgSource.Server,
				};
				sendToUsers([sourcePlayer.getId()], callBackMsg);
			}

			this.gameInfoBroadcast();
			return true;
		} else {
			const errorMsg: ServerSocketMessage = {
				type: SocketMsgType.MsgNotify,
				data: undefined,
				source: SocketMsgSource.Server,
				msg: {
					type: "error",
					content: "机会卡使用失败: 未知的机会卡ID",
				},
			};
			sendToUsers([sourcePlayer.getId()], errorMsg);
			return false;
		}
	}

	public async handleArriveEvent(arrivedPlayer: IPlayer) {
		if (arrivedPlayer.getIsBankrupted()) return;
		const playerPositionIndex = arrivedPlayer.getPositionIndex();
		const arriveItemId = this.mapData.mapIndex[playerPositionIndex];
		const arriveItem = this.mapItems.get(arriveItemId);
		if (!arriveItem) return;
		if (arriveItem.linkto) {
			const linkMapItem = this.mapItems.get(arriveItem.linkto);
			if (!linkMapItem || !linkMapItem.property) return;
			const property = this.properties.get(linkMapItem.property.id);
			if (!property) return;
			// let roundRemainingTime = this.gameSetting.roundTime;
			const owner = property.getOwner();
			if (owner) {
				//地皮有主人
				if (owner.getId() === arrivedPlayer.getId()) {
					//地产是自己的
					if (property.getBuildingLevel() < 2) {
						this.roundTimeTimer.setTimeOutFunction(() => {
							operationListener.emit(arrivedPlayer.getId(), OperateType.ConfirmDialogResult, {
								id: arrivedPlayer.getId(),
								confirm: false,
								data: undefined,
							});
						}); //到时间就结束操作
						//已有房产, 升级房屋
						const playerRes = await this.showConfirmDialog(arrivedPlayer.getId(), {
							title: `升级 ${property.getName()}`,
							content: `${property.getName()}`,
						});
						this.roundRemainingTimeBroadcast(0);
						if (playerRes) {
							await this.handlePlayerBuildUp(arrivedPlayer, property);
						}
					}
				} else {
					//地产是别人的
					const ownerPlayer = this.getPlayerById(owner.getId());
					if (!ownerPlayer) return;
					const passCost = property.getPassCost() * this.currentMultiplier;
					this.handlePayToSomeOne(arrivedPlayer, ownerPlayer, passCost);
					this.messageNotify([arrivedPlayer.getId()], {
						type: "error",
						content: `你到达了${owner.getName()}的地皮: ${property.getName()}，支付了${passCost}￥过路费`,
					});
					this.messageNotify([ownerPlayer.getId()], {
						type: "success",
						content: `${arrivedPlayer.getName()}到达了你的地皮: ${property.getName()}，支付了${passCost}￥过路费`,
					});
					this.messageNotify(
						Array.from(this.players.values())
							.filter((p) => p.getId() !== arrivedPlayer.getId() && p.getId() !== owner.getId())
							.map((p) => p.getId()),
						{
							type: "info",
							content: `${arrivedPlayer.getName()}到达了${owner.getName()}的地皮: ${property.getName()}，支付了${passCost}￥过路费`,
						}
					);
					this.gameInfoBroadcast();
					this.gameLogBroadcast(
						`${this.createGameLinkItem(GameLinkItem.Player, arrivedPlayer.getId())} 到达了 ${this.createGameLinkItem(
							GameLinkItem.Player,
							owner.getId()
						)} 的地皮: ${this.createGameLinkItem(GameLinkItem.Property, property.getId())}，支付了 ${passCost}￥ 过路费`
					);
				}
			} else {
				// this.eventMsg = `等待 ${arrivedPlayer.getName()} 购买地皮`;
				this.roundTimeTimer.setTimeOutFunction(() => {
					operationListener.emit(arrivedPlayer.getId(), OperateType.ConfirmDialogResult, {
						id: arrivedPlayer.getId(),
						confirm: false,
						data: undefined,
					});
				}); //到时间就结束操作
				//地皮没有购买
				//空地, 买房
				//等待客户端回应买房
				this.roundRemainingTimeBroadcast(0);
				const playerRes = await this.showConfirmDialog(arrivedPlayer.getId(), {
					title: `购买${property.getName()}`,
					content: `${property.getName()}`,
				});
				if (playerRes.confirm) {
					await this.handlePlayerBuyProperty(arrivedPlayer, property);
				}
			}
		} else if (arriveItem.mapEventId) {
			const mapEvent = this.mapData.mapEvents.find((e) => e.id === arriveItem.mapEventId);
			if (!mapEvent) throw Error("找不到对应的MapEvent");
			const effectCode = mapEvent.effectCode;
			if (effectCode) {
				const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
				const arrivedFunction = new AsyncFunction("arrivedPlayer", "gameProcess", effectCode);
				await arrivedFunction(arrivedPlayer, this);
				this.gameMsgNotifyBroadcast("info", `${arrivedPlayer.getName()} 踩到了特殊地块: ${mapEvent.name}`);
				this.gameLogBroadcast(
					`${this.createGameLinkItem(
						GameLinkItem.Player,
						arrivedPlayer.getId()
					)} 踩到了特殊地块: ${this.createGameLinkItem(GameLinkItem.ArrivedEvent, mapEvent.id)}`
				);
			}
		}
		this.gameInfoBroadcast();
	}

	private async handlePayToSomeOne(source: IPlayer, target: IPlayer, money: number) {
		target.gain(money, source);
		source.cost(money, target);
	}

	private getPlayerById(id: string) {
		return this.players.get(id);
	}

	public onPlayerOperation<T extends OperateType>(
		playerId: string,
		operationType: T,
		callback: (res: PlayerOperationResult[T]) => void
	): void {
		operationListener.on(playerId, operationType, callback);
	}

	public oncePlayerOperation<T extends OperateType>(
		playerId: string,
		operationType: T,
		callback: (res: PlayerOperationResult[T]) => void
	): void {
		operationListener.once(playerId, operationType, callback);
	}

	public async onPlayerOperationAsync<T extends OperateType>(
		playerId: string,
		operationType: T
	): Promise<PlayerOperationResult[T]> {
		return await operationListener.onAsync(playerId, operationType);
	}

	public async oncePlayerOperationAsync<T extends OperateType>(
		playerId: string,
		operationType: T
	): Promise<PlayerOperationResult[T]> {
		return await operationListener.onceAsync(playerId, operationType);
	}

	public emitPlayerOperation<T extends OperateType>(
		playerId: string,
		operationType: T,
		data: PlayerOperationResult[T]
	) {
		operationListener.emit(playerId, operationType, data);
	}

	public removePlayerOperationListener<T extends OperateType>(
		playerId: string,
		operationType: T,
		listener?: (...args: any[]) => PlayerOperationResult[T]
	): void {
		operationListener.remove(playerId, operationType, listener);
	}

	public removePlayerAllOperationListener(playerId: string): void {
		operationListener.removeAll(playerId);
	}

	private async waitInitFinished() {
		const promiseArr: Promise<any>[] = [];
		Array.from(this.players.values()).forEach((player) => {
			promiseArr.push(operationListener.onceAsync(player.getId(), OperateType.GameInitFinished));
		});
		await Promise.all(promiseArr);

		this.gameBroadcast({ type: SocketMsgType.GameInitFinished, data: undefined, source: SocketMsgSource.Server });
	}

	public async runGamePhase(phase: IGamePhase<GameContext>, context?: GameContext) {
		this.currentGamePhase = phase;
		this.gameRuntimeStack.push(...phase.getEventQueue().reverse());
		await this.gameRuntimeStack.run(context, this);
	}

	public pushEventToStack(...gameEvents: GameEvent<GameContext>[]) {
		this.gameRuntimeStack.push(...gameEvents);
	}

	public roundRemainingTimeBroadcast = (remainingTime: number) => {
		const eventMsg = this.currentGamePhase?.name || "";
		const msg: ServerSocketMessage = {
			type: SocketMsgType.RemainingTime,
			source: SocketMsgSource.Server,
			data: { eventMsg, remainingTime },
		};
		this.gameBroadcast(msg);
	};

	public async showConfirmDialog<I extends InputOptionItem<string, any>[]>(
		playerId: string,
		option: ConfirmDialogOption<I>
	): Promise<ConfirmDialogResult<I>> {
		sendToUsers([playerId], {
			type: SocketMsgType.ConfirmDialog,
			source: SocketMsgSource.Server,
			data: {
				playerId,
				option,
			},
		});
		return (await operationListener.onceAsync(playerId, OperateType.ConfirmDialogResult)) as ConfirmDialogResult<I>;
	}

	public async showTargetSelectDialog<I extends TargetSelectType>(
		playerId: string,
		option: SelectDialogOption<I>
	): Promise<SelectDialogResult<I>> {
		sendToUsers([playerId], {
			type: SocketMsgType.TargetSelectDialog,
			source: SocketMsgSource.Server,
			data: {
				playerId,
				option,
			},
		});
		return (await operationListener.onceAsync(playerId, OperateType.SelectDialogResult)) as SelectDialogResult<I>;
	}

	private sleep(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	public async start() {
		// this.gameInitBroadcast();
		this.gameBroadcast({
			type: SocketMsgType.GameInit,
			source: SocketMsgSource.Server,
			data: this.getGameData(),
		});

		await this.waitInitFinished();
		await this.gameLoop();
	}

	public messageNotify(
		playerIdList: string[],
		msg: {
			type: "info" | "success" | "warning" | "error";
			content: string;
		}
	) {
		sendToUsers(playerIdList, { type: SocketMsgType.MsgNotify, source: SocketMsgSource.Server, data: undefined, msg });
	}

	public getGameData() {
		const gameInfo: GameData = {
			currentPlayerIdInRound: this.currentRoundPlayer ? this.currentRoundPlayer.getId() : "",
			currentRound: this.currentRound,
			currentMultiplier: this.currentMultiplier,
			playersList: Array.from(this.players.values()).map((player) => player.getPlayerInfo()),
			propertiesList: Array.from(this.properties.values()).map((property) => property.getPropertyInfo()),
			isGameOver: this.isGameOver,
		};
		return gameInfo;
	}

	public createGameLinkItem(type: GameLinkItem, id: string) {
		return `@-#${type}#-#${id}#`;
	}

	public roundTurnNotify(playerId: string) {
		this.sendToPlayer(playerId, {
			type: SocketMsgType.RoundTurn,
			source: SocketMsgSource.Server,
			data: undefined,
			msg: {
				type: "info",
				content: "现在是你的回合啦！",
			},
		});
		this.gameLogBroadcast(`---接下来是 ${this.createGameLinkItem(GameLinkItem.Player, playerId)} 的回合---`);
	}

	public sendToPlayer(id: string, msg: ServerSocketMessage) {
		sendToUsers([id], msg);
	}

	public gameInfoBroadcast() {
		this.gameBroadcast({
			type: SocketMsgType.GameData,
			source: SocketMsgSource.Server,
			data: this.getGameData(),
		});
	}

	public gameMsgNotifyBroadcast(type: "success" | "warning" | "error" | "info", msg: string) {
		this.gameBroadcast({
			type: SocketMsgType.MsgNotify,
			data: undefined,
			msg: { type, content: msg },
			source: SocketMsgSource.Server,
		});
	}

	public gameLogBroadcast(log: string) {
		const gameLog: GameLog = { id: randomString(8), time: Date.now() - this.startTime, content: log };
		this.gameLogList.push(gameLog);
		this.gameBroadcast({
			type: SocketMsgType.GameLog,
			data: gameLog,
			source: SocketMsgSource.Server,
		});
	}

	public gameBroadcast(msg: ServerSocketMessage) {
		sendToUsers(
			Array.from(this.players.values()).map((p) => p.getId()),
			msg
		);
	}
}
