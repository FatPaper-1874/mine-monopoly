import { OperateListener } from "./class/OperateListener";
import { WorkerCommMsg } from "@src/interfaces/worker";
import { WorkerCommType } from "@src/enums/worker";
import {
	ChanceCardInfo,
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
	PlayerOperationResult,
	PlayerRoundContext,
	ServerSocketMessage,
	SocketMsgSource,
	SocketMsgType,
	UserInRoomInfo,
	TargetSelectDialogOption,
	TargetSelectDialogResult,
	IChanceCard,
	ItemSelectDialogOption,
	ItemSelectDialogResult,
	MessageCardOption,
	GameRuntimeEvent,
	RuntimeMapEvent,
	MapEventType,
} from "@fatpaper-monopoly/types";

import { RoundTimeTimer } from "./class/RoundTimeTimer";
import { Player } from "./class/Player";
import { Property } from "./class/Property";
import { ChanceCard } from "./class/ChanceCard";
import { compileTsToJs, randomString } from "@src/utils";
import { GamePhase } from "@src/core/worker/class/GamePhase";
import { GameRuntimeStack } from "@src/core/worker/class/GameRuntimeStack";
import GameProcessTypes from "./editor-lib.d.ts?raw";
import { generatePropertyHtml } from "@src/utils/html";
import mitt from "mitt";
import type { Emitter } from "mitt";

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
				const { userId } = data.data;
				gameProcess && gameProcess.handlePlayerOffline(userId);
			}
			break;
		case WorkerCommType.UserReconnect:
			{
				const { userId } = data.data;
				gameProcess && gameProcess.handlePlayerReconnect(userId);
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
	public eventBus: Emitter<GameRuntimeEvent> = mitt<GameRuntimeEvent>();
	public customData: Record<string, any> = {};
	public exportData: Record<string, any> = {};

	public mapData: GameMap;
	public gameSetting: GameSetting;

	private userList: UserInRoomInfo[];
	private startTime: number = Date.now();

	private gameRoundPhase: {
		roundStartPhase: IGamePhase<GameContext>[];
		roundEndPhase: IGamePhase<GameContext>[];
	};
	public currentGamePhase: IGamePhase<GameContext> | null = null;
	public players: Map<string, Player> = new Map();
	public properties: Map<string, Property> = new Map();
	public chanceCardInfos: Map<string, ChanceCardInfo> = new Map();
	public mapItems: Map<string, MapItem> = new Map();
	public mapEvents: Map<string, RuntimeMapEvent> = new Map();

	public gameRuntimeStack: GameRuntimeStack = new GameRuntimeStack();

	public currentRoundPlayer: Player | null = null;
	public currentRound: number = 0; //当前回合
	private isGameOver: boolean = false;
	private timeoutList: any[] = []; //计时器列表
	private intervalTimerList: any[] = []; //计时器列表
	public roundTimeTimer: RoundTimeTimer; //倒计时
	private gameLogList: GameLog[] = [];

	public currentMultiplier: number = 1;

	public gameOverRuleFunction = async () => {
		return false;
	};

	constructor(mapData: GameMap, gameSetting: GameSetting, userList: UserInRoomInfo[], roomOwnerId: string) {
		this.mapData = mapData;
		this.gameSetting = gameSetting;
		this.userList = userList;

		console.dir(gameSetting);
		console.dir(gameSetting.initMoney.value);

		this.roundTimeTimer = new RoundTimeTimer(15, 1000);
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

		this.preprocessingEffectCode();
		this.gameRoundPhase = {
			roundStartPhase: mapData.phases.gameRoundStart.map((phaseInfo) => new GamePhase(phaseInfo)),
			roundEndPhase: mapData.phases.gameRoundEnd.map((phaseInfo) => new GamePhase(phaseInfo)),
		};
		this.initGameOverRuleFunction();
		this.initMap();
		this.initPlayers();
		this.initProperties();
		this.runInitedPhase();
	}

	private preprocessingEffectCode() {
		const { mapEvents, chanceCards, roles, mapItems, phases } = this.mapData;
		for (const mapEvent of mapEvents) {
			mapEvent.effectCode = `return ${mapEvent.effectCode}`;
		}

		for (const chanceCard of chanceCards) {
			chanceCard.effectCode = `return ${chanceCard.effectCode}`;
		}

		for (const role of roles) {
			role.initCode = `return ${role.initCode}`;
		}

		for (const mapItem of mapItems) {
			if (mapItem.property && mapItem.property.custom) {
				mapItem.property.custom.effectCode = `return ${mapItem.property.custom.effectCode}`;
			}
		}

		Object.values(phases).forEach((phaseList) => {
			for (const phase of phaseList) {
				phase.initEventCode = `return ${phase.initEventCode}`;
			}
		});
	}

	private initGameOverRuleFunction() {
		const { phases } = this.mapData;
		const gameOverRule = phases.gameOverRule;
		const compiledCode = compileTsToJs(gameOverRule[0].initEventCode, GameProcessTypes);
		this.gameOverRuleFunction = new Function(compiledCode)() as () => Promise<boolean>;
	}

	private initMap() {
		const { mapItems, mapEvents, chanceCards } = this.mapData;

		mapEvents.forEach((mapEvent) => {
			const effectCode = compileTsToJs(mapEvent.effectCode, GameProcessTypes);
			this.mapEvents.set(mapEvent.id, {
				...mapEvent,
				effectCode,
				fn: new Function(effectCode)(),
			});
		});

		//处理经过事件
		this.eventBus.on("player.passed", ({ passedMapItemsId, player }) => {
			const passedEventFunctions: GameEvent<GameContext>[] = [];
			for (const mapItemId of passedMapItemsId) {
				const mapItem = this.mapItems.get(mapItemId);
				if (!mapItem) throw Error("处理经过事件时, 找不到MapItem");
				if (!mapItem.mapEventId) continue;
				const mapEvent = this.mapEvents.get(mapItem.mapEventId);
				if (!mapEvent) throw Error("处理经过事件时, 找不到MapEvent");
				if (mapEvent.type !== MapEventType.PassedEvent) continue;
				passedEventFunctions.push({
					fn: async (context, gameProcess) => {
						await mapEvent.fn(player, gameProcess);
						gameProcess.gameMsgNotifyBroadcast("info", `${player.name} 经过了: ${mapEvent.name} 触发事件`);
						gameProcess.gameLogBroadcast(
							`${gameProcess.createGameLinkItem(
								GameLinkItem.Player,
								player.id
							)} 触发了地图事件: ${gameProcess.createGameLinkItem(GameLinkItem.ArrivedEvent, mapEvent.id)}`
						);
					},
				});
			}
			this.pushEventToStack(...passedEventFunctions);
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
	}

	private initPlayers() {
		this.userList.forEach((u) => {
			const role = this.mapData.roles.find((r) => r.id === u.roleId);
			if (!role) throw Error("找不到对应角色");
			const player = new Player(u, this.gameSetting.initMoney.value || 10000, 0, this.mapData.phases.playerRound, role);
			player.setPositionIndex(0);
			this.players.set(player.id, player);

			player.commandBus.setHandler("player.walk", async (payload) => {
				const { steps } = payload;
				const walkId = randomString(16);
				const msg: ServerSocketMessage = {
					type: SocketMsgType.PlayerWalk,
					source: SocketMsgSource.Server,
					data: { playerId: player.id, step: steps, walkId },
				};
				const sourceIndex = player.positionIndex;
				const total = this.mapData.mapIndex.length;
				const newIndex = (((sourceIndex + steps) % total) + total) % total;

				const passedMapItemsId: string[] = [];
				const direction = steps > 0 ? 1 : -1;
				for (let i = 1; i <= Math.abs(steps); i++) {
					const nextIndex = (((sourceIndex + i * direction) % total) + total) % total;
					const mapItemId = this.mapData.mapIndex[nextIndex];
					passedMapItemsId.push(mapItemId);
				}

				player.setPositionIndex(newIndex);
				this.gameDataBroadcast();
				this.gameBroadcast(msg);

				//在计划的动画完成事件后取消监听, 防止客户端因特殊情况没有发送动画完成的指令造成永久等待
				const animationDuration = 350 * (Math.abs(steps) + 3);
				let animationTimer = setTimeout(() => {
					operationListener.emit(player.id, OperateType.Animation);
				}, animationDuration);

				//等待客户端完成动画发回指令
				await new Promise((resolve) => {
					listenAnimationCallback("");
					function listenAnimationCallback(resAnimationId: string) {
						if (resAnimationId !== walkId) {
							operationListener.once(player.id, OperateType.Animation, listenAnimationCallback);
						} else {
							resolve("");
						}
					}
				});
				clearTimeout(animationTimer);
				this.eventBus.emit("player.passed", { passedMapItemsId, player });
				return payload;
			});

			player.commandBus.setHandler("player.tp", async (payload) => {
				const { positionIndex } = payload;
				const walkId = randomString(16);
				const msg: ServerSocketMessage = {
					type: SocketMsgType.PlayerTp,
					source: SocketMsgSource.Server,
					data: { playerId: player.id, positionIndex, walkId },
				};
				player.setPositionIndex(positionIndex);
				this.gameDataBroadcast();
				this.gameBroadcast(msg);

				//在计划的动画完成事件后取消监听, 防止客户端因特殊情况没有发送动画完成的指令造成永久等待
				const animationDuration = 2000;
				let animationTimer = setTimeout(() => {
					operationListener.emit(player.id, OperateType.Animation, walkId);
				}, animationDuration);

				//等待客户端完成动画发回指令
				await new Promise((resolve) => {
					listenAnimationCallback("");
					function listenAnimationCallback(resAnimationId: string) {
						if (resAnimationId !== walkId) {
							operationListener.once(player.id, OperateType.Animation, listenAnimationCallback);
						} else {
							resolve("");
						}
					}
				});
				clearTimeout(animationTimer);
				return payload;
			});

			player.commandBus.setHandler("player.dice.roll", async (payload) => {
				const { dices } = payload;
				const diceResult = dices.map((d) => d.roll());

				//向客户端发送骰子结果
				const msgToRollDice: ServerSocketMessage = {
					type: SocketMsgType.RollDiceResult,
					source: SocketMsgSource.Server,
					data: {
						rollDiceResult: diceResult,
						rollDicePlayerId: player.id,
					},
					msg: {
						type: "info",
						content: `${player.name} 摇到的点数是: ${diceResult.map((d) => d.result).join("-")}`,
					},
				};
				this.gameBroadcast(msgToRollDice);

				//等待动画
				await new Promise((resolve) => setTimeout(resolve, 3000));

				return { diceResult };
			});

			const initRoleFn = player.getInitRoleFunction();
			initRoleFn(player, this);
		});
	}

	private initProperties() {
		this.properties.values().forEach((property) => {
			property.commandBus.setHandler("property.arrived", async (payload) => {
				const { arrivedPlayer, owner, toll } = payload;
				if (owner) {
					//地皮有主人
					if (owner.id === arrivedPlayer.id) {
						//地产是自己的
						if (property.level < property.maxLevel) {
							this.roundTimeTimer.setTimeOutFunction(() => {
								operationListener.emit(arrivedPlayer.id, OperateType.ConfirmDialogResult, {
									id: arrivedPlayer.id,
									confirm: false,
									data: undefined,
								});
							}); //到时间就结束操作
							//已有房产, 升级房屋
							const playerRes = await this.showConfirmDialog(arrivedPlayer.id, {
								title: `升级 ${property.name}`,
								content: `${generatePropertyHtml(property.getPropertyInfo())}`,
								cancelText: `不要`,
								confirmText: `升！`,
							});
							this.roundRemainingTimeBroadcast(0);
							if (playerRes.confirm) {
								await this.handlePlayerBuildUp(arrivedPlayer, property);
							}
						}
					} else {
						//地产是别人的
						const ownerPlayer = this.getPlayerById(owner.id);
						if (!ownerPlayer) return payload;
						if (owner !== undefined && toll !== undefined) {
							await owner.gain(toll);
							await arrivedPlayer.cost(toll);
						}
						this.messageNotify([arrivedPlayer.id], {
							type: "error",
							content: `你到达了${owner.name}的地皮: ${property.name}，支付了${toll}￥过路费`,
						});
						this.messageNotify([ownerPlayer.id], {
							type: "success",
							content: `${arrivedPlayer.name}到达了你的地皮: ${property.name}，支付了${toll}￥过路费`,
						});
						this.messageNotify(
							Array.from(this.players.values())
								.filter((p) => p.id !== arrivedPlayer.id && p.id !== owner.id)
								.map((p) => p.id),
							{
								type: "info",
								content: `${arrivedPlayer.name}到达了${owner.name}的地皮: ${property.name}，支付了${toll}￥过路费`,
							}
						);
						this.gameDataBroadcast();
						this.gameLogBroadcast(
							`${this.createGameLinkItem(GameLinkItem.Player, arrivedPlayer.id)} 到达了 ${this.createGameLinkItem(
								GameLinkItem.Player,
								owner.id
							)} 的地皮: ${this.createGameLinkItem(GameLinkItem.Property, property.id)}，支付了 ${toll}￥ 过路费`
						);
					}
				} else {
					// this.eventMsg = `等待 ${arrivedPlayer.name} 购买地皮`;
					this.roundTimeTimer.setTimeOutFunction(() => {
						operationListener.emit(arrivedPlayer.id, OperateType.ConfirmDialogResult, {
							id: arrivedPlayer.id,
							confirm: false,
							data: undefined,
						});
					}); //到时间就结束操作
					//地皮没有购买
					//空地, 买房
					//等待客户端回应买房
					// this.roundRemainingTimeBroadcast(0);
					const playerRes = await this.showConfirmDialog(arrivedPlayer.id, {
						title: `购买 ${property.name}`,
						content: `${generatePropertyHtml(property.getPropertyInfo())}`,
						cancelText: `不要`,
						confirmText: `买！`,
					});
					if (playerRes.confirm) {
						await this.handlePlayerBuyProperty(arrivedPlayer, property);
					}
				}
				return payload;
			});

			const customInitFn = property.getCustomInitFunction();
			customInitFn && customInitFn(property, this);
		});
	}

	private async runInitedPhase() {
		for (const phaseInfo of this.mapData.phases.gameInited) {
			const gameInitedPhase = new GamePhase(phaseInfo);
			await this.runGamePhase(gameInitedPhase);
		}
	}

	private async gameLoop() {
		this.gameDataBroadcast();
		this.roundTimeTimer.setIntervalFunction(this.roundRemainingTimeBroadcast);
		//游戏循环
		while (!this.isGameOver) {
			//回合循环 加载回合开始阶段
			this.eventBus.emit("game.round.start");
			const roundStartPhases = this.gameRoundPhase.roundStartPhase;
			for (const phase of roundStartPhases) {
				await this.runGamePhase(phase);
			}

			//玩家回合
			for (const player of Array.from(this.players.values())) {
				this.eventBus.emit("player.round.start", { player });
				const context: PlayerRoundContext = {
					currentRoundPlayer: player,
				};
				const playerRoundPhases = player.getRoundPhases();
				for (const phase of playerRoundPhases) {
					await this.runGamePhase(phase, context);
				}
				this.eventBus.emit("player.round.end", { player });
			}

			//回合结束阶段
			const roundEndPhases = this.gameRoundPhase.roundEndPhase;
			for (const phase of roundEndPhases) {
				await this.runGamePhase(phase);
			}
			this.eventBus.emit("game.round.end");
		}
		this.roundTimeTimer.clearInterval();
	}

	public async handlePlayerBuyProperty(player: IPlayer, property: IProperty) {
		const msgToSend: ServerSocketMessage = {
			type: SocketMsgType.MsgNotify,
			source: SocketMsgSource.Server,
			data: undefined,
		};
		if (player.money > property.sellCost) {
			await property.setOwner(player);
			this.gameDataBroadcast();
			this.gameMsgNotifyBroadcast("info", `${player.name} 买下了地皮 ${property.name}`);
			this.gameLogBroadcast(
				`${this.createGameLinkItem(GameLinkItem.Player, player.id)} 买下了地皮 ${this.createGameLinkItem(
					GameLinkItem.Property,
					property.id
				)}`
			);
			await player.cost(property.sellCost);
		} else {
			msgToSend.msg = { type: "error", content: "不够钱啊穷鬼" };
			sendToUsers([player.id], msgToSend);
		}
	}

	public async handlePlayerBuildUp(player: IPlayer, property: IProperty) {
		const msgToSend: ServerSocketMessage = {
			type: SocketMsgType.MsgNotify,
			source: SocketMsgSource.Server,
			data: undefined,
		};
		if (player.money > property.sellCost) {
			property.levelUp();
			this.gameDataBroadcast();
			this.gameMsgNotifyBroadcast("info", `${player.name}把地皮${property.name}升到了${property.level}级`);
			this.gameLogBroadcast(
				`${this.createGameLinkItem(GameLinkItem.Player, player.id)} 把地皮 ${this.createGameLinkItem(
					GameLinkItem.Property,
					property.id
				)} 升到了 ${property.level} 级`
			);
			await player.cost(property.sellCost);
		} else {
			msgToSend.msg = { type: "error", content: "不够钱啊穷鬼" };
			sendToUsers([player.id], msgToSend);
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

	public createNewChanceCard(sourceId: string): IChanceCard {
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
						this.gameMsgNotifyBroadcast("info", `${sourcePlayer.name} 对自己使用了机会卡: "${chanceCard.getName()}"`);
						this.gameLogBroadcast(
							`${this.createGameLinkItem(
								GameLinkItem.Player,
								sourcePlayer.id
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
							`${sourcePlayer.name} 对玩家 ${_targetPlayer.name} 使用了机会卡: "${chanceCard.getName()}"`
						);
						this.gameLogBroadcast(
							`${this.createGameLinkItem(GameLinkItem.Player, sourcePlayer.id)} 对玩家 ${this.createGameLinkItem(
								GameLinkItem.Player,
								_targetPlayer.id
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
							`${sourcePlayer.name} 对地皮 ${_targetProperty.name} 使用了机会卡: "${chanceCard.getName()}"`
						);
						this.gameLogBroadcast(
							`${this.createGameLinkItem(GameLinkItem.Player, sourcePlayer.id)} 对地皮 ${this.createGameLinkItem(
								GameLinkItem.Property,
								_targetProperty.id
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
				sendToUsers([sourcePlayer.id], errorMsg);
				const callBackMsg: ServerSocketMessage = {
					type: SocketMsgType.UseChanceCard,
					data: { error: true },
					source: SocketMsgSource.Server,
				};
				sendToUsers([sourcePlayer.id], callBackMsg);
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
				this.gameDataBroadcast();

				// this.eventMsg = `等待 ${sourcePlayer.name} 掷骰子`;
				// this.roundTimeTimer.setTimeOutFunction(handleUseChanceCardTimeOut);
				sendToUsers([sourcePlayer.id], successMsg);
				const callBackMsg: ServerSocketMessage = {
					type: SocketMsgType.UseChanceCard,
					data: { error: false },
					source: SocketMsgSource.Server,
				};
				sendToUsers([sourcePlayer.id], callBackMsg);
			}

			this.gameDataBroadcast();
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
			sendToUsers([sourcePlayer.id], errorMsg);
			return false;
		}
	}

	public async handleArriveEvent(arrivedPlayer: IPlayer) {
		if (arrivedPlayer.isBankrupted) return;
		const playerPositionIndex = arrivedPlayer.positionIndex;
		const arriveItemId = this.mapData.mapIndex[playerPositionIndex];
		const arriveItem = this.mapItems.get(arriveItemId);
		if (!arriveItem) return;
		if (arriveItem.mapEventId) {
			// 特殊地块
			const mapEvent = this.mapEvents.get(arriveItem.mapEventId);
			if (!mapEvent) throw Error("找不到对应的MapEvent");
			// 是到达触发的事件
			if (mapEvent.type === MapEventType.ArrivedEvent) {
				await mapEvent.fn(arrivedPlayer, this);
				this.gameMsgNotifyBroadcast("info", `${arrivedPlayer.name} 触发了地图事件: ${mapEvent.name}`);
				this.gameLogBroadcast(
					`${this.createGameLinkItem(GameLinkItem.Player, arrivedPlayer.id)} 触发了地图事件: ${this.createGameLinkItem(
						GameLinkItem.ArrivedEvent,
						mapEvent.id
					)}`
				);
				this.gameDataBroadcast();
			}
		}
		if (arriveItem.linkto) {
			const linkMapItem = this.mapItems.get(arriveItem.linkto);
			if (!linkMapItem || !linkMapItem.property) return;
			const property = this.properties.get(linkMapItem.property.id);
			if (!property) return;
			await property.arrived(arrivedPlayer);
			this.gameDataBroadcast();
		}
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
		listener: (...args: any[]) => PlayerOperationResult[T]
	): void {
		operationListener.remove(playerId, operationType, listener);
	}

	public removePlayerAllOperationListener<T extends OperateType>(playerId: string, operationType?: T): void {
		operationListener.removeAll(playerId, operationType);
	}

	private async waitInitFinished() {
		const promiseArr: Promise<any>[] = [];
		Array.from(this.players.values()).forEach((player) => {
			promiseArr.push(operationListener.onceAsync(player.id, OperateType.GameInitFinished));
		});
		await Promise.all(promiseArr);

		this.gameBroadcast({ type: SocketMsgType.GameInitFinished, data: undefined, source: SocketMsgSource.Server });
	}

	public async runGamePhase(phase: IGamePhase<GameContext>, context?: GameContext) {
		this.currentGamePhase = phase;
		const checkGameOverEvent = {
			fn: this.checkGameOver.bind(this),
			key: "GameOverCheck",
		};
		this.gameRuntimeStack.push(...[checkGameOverEvent, ...phase.getEventQueue().reverse()]);
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
		option: TargetSelectDialogOption<I>
	): Promise<TargetSelectDialogResult<I>> {
		sendToUsers([playerId], {
			type: SocketMsgType.TargetSelectDialog,
			source: SocketMsgSource.Server,
			data: {
				playerId,
				option,
			},
		});
		return (await operationListener.onceAsync(
			playerId,
			OperateType.TargetSelectDialogResult
		)) as TargetSelectDialogResult<I>;
	}

	public async showItemSelectDialog(playerId: string, option: ItemSelectDialogOption): Promise<ItemSelectDialogResult> {
		sendToUsers([playerId], {
			type: SocketMsgType.ItemSelectDialog,
			source: SocketMsgSource.Server,
			data: {
				playerId,
				option,
			},
		});
		return (await operationListener.onceAsync(playerId, OperateType.ItemSelectDialogResult)) as ItemSelectDialogResult;
	}

	public async showMessageCard(playerIds: string[], option: MessageCardOption): Promise<void> {
		sendToUsers(playerIds, {
			type: SocketMsgType.MessageCard,
			source: SocketMsgSource.Server,
			data: { option },
		});
		await this.sleep(option.duration);
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

	public async checkGameOver(): Promise<void> {
		const isGameOver = await this.gameOverRuleFunction();
		if (isGameOver) this.gameOver();
	}

	private gameOver() {
		this.gameDataBroadcast();
		this.gameBroadcast({
			type: SocketMsgType.GameOver,
			source: SocketMsgSource.Server,
			data: undefined,
			msg: { content: "游戏结束", type: "info" },
		});
		self.postMessage(<WorkerCommMsg>{
			type: WorkerCommType.GameOver,
		});
		this.isGameOver = true;
		this.destroy();
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
			exportData: this.exportData,
			currentPlayerIdInRound: this.currentRoundPlayer ? this.currentRoundPlayer.id : "",
			currentRound: this.currentRound,
			currentMultiplier: this.currentMultiplier,
			players: Array.from(this.players.values()).map((player) => player.getPlayerInfo()),
			properties: Array.from(this.properties.values()).map((property) => property.getPropertyInfo()),
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

	public gameDataBroadcast() {
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
			Array.from(this.players.values()).map((p) => p.id),
			msg
		);
	}

	public handlePlayerOffline(userId: string) {
		const player = this.getPlayerById(userId);
		if (player) {
			player.setIsOffline(true);
			this.gameDataBroadcast();
		}
	}

	public handlePlayerReconnect(userId: string) {
		const player = this.players.get(userId);
		if (player) {
			player.setIsOffline(false);
			sendToUsers([userId], {
				type: SocketMsgType.GameStart,
				source: SocketMsgSource.Server,
				data: undefined,
			});

			sendToUsers([userId], {
				type: SocketMsgType.GameInit,
				source: SocketMsgSource.Server,
				data: this.getGameData(),
			});
			operationListener.once(userId, OperateType.GameInitFinished, () => {
				sendToUsers([userId], {
					type: SocketMsgType.GameInitFinished,
					source: SocketMsgSource.Server,
					data: undefined,
				});
			});
			this.gameDataBroadcast();
		} else {
			console.log("奇怪的玩家 in game");
		}
	}

	public destroy() {
		this.players.keys().forEach((playerId) => {
			operationListener.removeAll(playerId);
		});
		this.intervalTimerList.forEach((id) => {
			clearInterval(id);
		});
		this.timeoutList.forEach((id) => {
			clearTimeout(id);
		});
	}
}
