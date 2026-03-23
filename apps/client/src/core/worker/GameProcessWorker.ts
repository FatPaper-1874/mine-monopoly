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
	FormDialogOption,
	FormDialogResult,
	FormField,
} from "@mine-monopoly/types";

import { Player } from "./class/Player";
import { Property } from "./class/Property";
import { ChanceCard } from "./class/ChanceCard";
import { compileTsToJs, randomString } from "@src/utils";
import { GamePhase } from "@src/core/worker/class/GamePhase";
import { GameRuntimeStack } from "@src/core/worker/class/GameRuntimeStack";
import GameProcessTypes from "./editor-lib.d.ts?raw";
import { generatePropertyHtml } from "@src/utils/html";
import mitt from "mitt";
import { aiManager } from "./ai/AIStrategy";
import type { Emitter } from "mitt";

const operationListener = new OperateListener();
let gameProcess: GameProcess | null = null;

// ========== Web Worker 错误捕获 ==========

// 格式化错误信息
function formatWorkerError(error: Error | string, context?: string): string {
	const errorMsg = error instanceof Error ? error.message : String(error);
	let result = `[Worker Error] ${errorMsg}`;

	if (context) {
		result += `\nContext: ${context}`;
	}

	if (error instanceof Error && error.stack) {
		result += `\nStack:\n${error.stack}`;
	}

	return result;
}

// 发送错误到主线程
function reportWorkerError(error: Error | string, context?: string, additionalData?: Record<string, any>) {
	const errorInfo = {
		type: "Worker" as const,
		message: error instanceof Error ? error.message : String(error),
		stack: error instanceof Error ? error.stack : undefined,
		info: context,
		timestamp: new Date().toISOString(),
		additionalData,
	};

	// 通过 postMessage 发送到主线程
	try {
		self.postMessage({
			type: "worker-error",
			data: errorInfo,
		});
	} catch (e) {
		// 如果无法发送错误，至少在控制台输出
		console.error("[Worker Error Reporting Failed]:", e);
		console.error("[Original Error]:", errorInfo);
	}
}

// 捕获 Worker 中的未处理错误
self.addEventListener("error", (event) => {
	console.error("[Worker Uncaught Error]:", event);

	reportWorkerError(event.error || event.message, "Uncaught Exception in Worker", {
		filename: event.filename,
		lineno: event.lineno,
		colno: event.colno,
	});

	event.preventDefault();
});

// 捕获 Worker 中的未处理 Promise 拒绝
self.addEventListener("unhandledrejection", (event) => {
	console.error("[Worker Unhandled Rejection]:", event.reason);

	const reason = event.reason;
	reportWorkerError(reason instanceof Error ? reason : String(reason), "Unhandled Promise Rejection in Worker", {
		promise: "Promise rejection",
	});

	event.preventDefault();
});

// ========== Web Worker 错误捕获结束 ==========

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

	// 走路动画常量
	private static readonly WALK_ANIMATION_BASE_DURATION = 350; // 单步动画基础时长
	private static readonly WALK_ANIMATION_EXTRA_STEPS = 3; // 额外的安全步数

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
	private gameLogList: GameLog[] = [];

	public currentMultiplier: number = 1;

	// 当前事件名称（用于倒计时显示）
	private currentEventName: string = "";

	// 完整的类型定义（包含 GameProcessTypes 和 extraLibs）
	private fullTypes: string = "";

	public gameOverRuleFunction = async () => {
		return false;
	};

	constructor(mapData: GameMap, gameSetting: GameSetting, userList: UserInRoomInfo[], roomOwnerId: string) {
		this.mapData = mapData;
		this.gameSetting = gameSetting;
		this.userList = userList;

		console.dir(gameSetting);
		console.dir(gameSetting.initMoney.value);

		// 组合完整的类型定义（包含 GameProcessTypes 和 extraLibs）
		this.fullTypes = `${GameProcessTypes}\n${mapData.extraLibs || ""}`;

		// 绑定倒计时广播到 OperateListener
		operationListener.setGlobalTickCallback((timeouts) => {
			if (timeouts.length === 0) {
				this.roundRemainingTimeBroadcast(0, 0);
				return;
			}

			// 找到最小的剩余时间（最紧急的操作），向上取整显示为整数秒
			const minRemaining = Math.min(...timeouts.map((t) => t.remainingMs));
			const minTotalTime = Math.min(...timeouts.map((t) => t.totalTime));
			const remainingSeconds = Math.ceil(minRemaining / 1000);
			const totalSeconds = Math.ceil(minTotalTime / 1000);

			// 发送倒计时消息
			this.roundRemainingTimeBroadcast(remainingSeconds, totalSeconds);

			// 如果有倒计时，通知客户端显示倒计时
			if (remainingSeconds > 0) {
				this.updateCurrentEventShowCountdown(true);
			}
		});

		// 绑定超时回调到 OperateListener
		operationListener.setTimeoutCallback((playerId, eventType) => {
			// 超时后通知客户端不显示倒计时
			this.updateCurrentEventShowCountdown(false);

			this.gameBroadcast(<ServerSocketMessage>{
				type: SocketMsgType.RoundTimeOut,
				source: SocketMsgSource.Server,
				data: { playerId, eventType },
			});
		});

		if (gameSetting.slackOffMode) {
			operationListener.on(roomOwnerId, OperateType.PauseGame, () => {
				console.log("PauseGame");
				operationListener.pause();
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
				operationListener.resume();
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
			roundStartPhase: mapData.phases.gameRoundStart.map(
				(phaseInfo) => new GamePhase(phaseInfo, undefined, mapData.extraLibs),
			),
			roundEndPhase: mapData.phases.gameRoundEnd.map(
				(phaseInfo) => new GamePhase(phaseInfo, undefined, mapData.extraLibs),
			),
		};
		this.initGameOverRuleFunction();
		this.initMap();
	}

	private preprocessingEffectCode() {
		const { mapEvents, chanceCards, roles, mapItems, phases, uiTemplates } = this.mapData;

		const uiReplacements = (uiTemplates || [])
			.filter((t) => t.slug && t.template)
			.map((t) => ({
				token: `$ui__${t.slug}`,
				json: JSON.stringify(t.template),
			}))
			.sort((a, b) => b.token.length - a.token.length);

		/**
		 * 核心处理函数：
		 * 1. 替换 $ui__xxx 为 JSON 对象
		 * 2. 包装 return 语句
		 */
		const processCode = (code: string | undefined | null): string => {
			if (!code || !code.trim()) return "";

			let processedCode = code;

			// 执行全局替换
			for (const { token, json } of uiReplacements) {
				processedCode = processedCode.split(token).join(json);
			}

			return `return ${processedCode}`;
		};

		// --- 2. 批量应用 ---

		for (const mapEvent of mapEvents) {
			mapEvent.effectCode = processCode(mapEvent.effectCode);
		}

		for (const chanceCard of chanceCards) {
			chanceCard.effectCode = processCode(chanceCard.effectCode);
		}

		for (const role of roles) {
			role.initCode = processCode(role.initCode);
		}

		for (const mapItem of mapItems) {
			if (mapItem.property && mapItem.property.custom) {
				mapItem.property.custom.effectCode = processCode(mapItem.property.custom.effectCode);
			}
		}

		Object.values(phases).forEach((phaseList) => {
			for (const phase of phaseList) {
				phase.initEventCode = processCode(phase.initEventCode);
			}
		});
	}

	private initGameOverRuleFunction() {
		const { phases } = this.mapData;
		const gameOverRule = phases.gameOverRule;
		const compiledCode = compileTsToJs(gameOverRule[0].initEventCode, this.fullTypes);
		this.gameOverRuleFunction = new Function(compiledCode)() as () => Promise<boolean>;
	}

	private initMap() {
		const { mapItems, mapEvents, chanceCards } = this.mapData;

		mapEvents.forEach((mapEvent) => {
			const effectCode = compileTsToJs(mapEvent.effectCode, this.fullTypes);
			this.mapEvents.set(mapEvent.id, {
				...mapEvent,
				effectCode,
				fn: new Function(effectCode)(),
			});
		});

		mapItems.forEach((mapItem) => {
			if (mapItem.property) {
				const property = mapItem.property;
				this.properties.set(property.id, new Property(property, this.mapData.extraLibs));
			}
			this.mapItems.set(mapItem.id, mapItem);
		});

		chanceCards.forEach((chanceCard) => {
			this.chanceCardInfos.set(chanceCard.id, {
				...chanceCard,
				effectCode: compileTsToJs(chanceCard.effectCode, this.fullTypes),
			});
		});
	}

	private async initPlayers() {
		// 步骤1: 创建所有玩家实例并设置 commandBus
		this.userList.forEach((u) => {
			const role = this.mapData.roles.find((r) => r.id === u.roleId);
			if (!role) throw Error("找不到对应角色");
			const player = new Player(
				u,
				this.gameSetting.initMoney.value || 10000,
				0,
				this.mapData.phases.playerRound,
				role,
				this.mapData.extraLibs,
			);
			player.setPositionIndex(0);
			this.players.set(player.id, player);

			player.commandBus.setHandler("player.walk", async (payload) => {
				this.setCurrentEventName(`${player.name} 走路中`);
				const { steps } = payload;
				const sourceIndex = player.positionIndex;
				const total = this.mapData.mapIndex.length;
				const direction = steps > 0 ? 1 : -1;
				const totalSteps = Math.abs(steps);

				let currentStep = 0;

				// 分段走路：每段检查是否有事件格，遇到事件格时触发事件后继续
				while (currentStep < totalSteps) {
					// 计算当前段的起点
					const segmentStartIndex = this.normalizeIndex(sourceIndex + currentStep * direction, total);

					// 向前看，累积连续的无事件步数
					let continuousSteps = 0;
					while (currentStep + continuousSteps < totalSteps) {
						const checkStep = currentStep + continuousSteps + 1;
						const checkIndex = this.normalizeIndex(sourceIndex + checkStep * direction, total);
						const mapItemId = this.mapData.mapIndex[checkIndex];

						if (this.checkMapItemHasPassedEvent(mapItemId)) {
							// 遇到事件格，包括这一步并停止累积
							continuousSteps++;
							break;
						}
						continuousSteps++;
					}

					// 至少走一步
					if (continuousSteps === 0) continuousSteps = 1;

					const segmentEndIndex = this.normalizeIndex(sourceIndex + (currentStep + continuousSteps) * direction, total);

					// 走这一段
					await this.walkSegment(player, segmentStartIndex, continuousSteps * direction, totalSteps, currentStep + 1);
					currentStep += continuousSteps;

					// 不立即更新 positionIndex，避免动画期间的位置冲突
					// 只在所有动画完成后才统一更新位置

					// 检查当前位置是否有事件
					const currentIndex = this.normalizeIndex(sourceIndex + currentStep * direction, total);
					const currentMapItemId = this.mapData.mapIndex[currentIndex];

					if (this.checkMapItemHasPassedEvent(currentMapItemId)) {
						// 触发经过事件
						try {
							await this.handlePlayerPassedEvents(player, [currentMapItemId]);
						} catch (error) {
							console.error("经过事件执行失败:", error);
							// 继续走路，不中断游戏
						}
					}
				}

				// 最终位置更新：在所有动画完成后一次性更新
				const finalIndex = this.normalizeIndex(sourceIndex + steps, total);
				player.setPositionIndex(finalIndex);
				this.gameDataBroadcast();

				return payload;
			});

			player.commandBus.setHandler("player.tp", async (payload) => {
				this.setCurrentEventName(`${player.name} 传送中`);
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
		});

		// 步骤2: 运行玩家预初始化阶段（在 initRoleFn 之前）
		for (const phaseInfo of this.mapData.phases.playerPreInit) {
			const playerPreInitPhase = new GamePhase(phaseInfo, undefined, this.mapData.extraLibs);
			await this.runGamePhase(playerPreInitPhase);
		}

		// 步骤3: 执行每个玩家的 initRoleFn
		for (const player of this.players.values()) {
			const roleInitFn = player.getInitRoleFunction();
			roleInitFn(player, this);
		}
	}

	private async initProperties() {
		// 步骤1: 为所有地皮设置 commandBus
		this.properties.values().forEach((property) => {
			property.commandBus.setHandler("property.arrived", async (payload) => {
				const { arrivedPlayer, owner, toll } = payload;
				if (owner) {
					//地皮有主人
					if (owner.id === arrivedPlayer.id) {
						//地产是自己的
						if (property.level < property.maxLevel) {
							this.setCurrentEventName(`等待${arrivedPlayer.name} 升级房屋`);
							//已有房产, 升级房屋
							const playerRes = await this.showConfirmDialog(arrivedPlayer.id, {
								title: `升级 ${property.name}`,
								content: `${generatePropertyHtml(property.getPropertyInfo())}`,
								cancelText: `不要`,
								confirmText: `升！`,
							});
							if (playerRes.confirm) {
								await this.handlePlayerBuildUp(arrivedPlayer, property);
							}
						}
					} else {
						//地产是别人的
							this.setCurrentEventName(`等待${arrivedPlayer.name} 给过路费`);
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
							},
						);
						this.gameDataBroadcast();
						this.gameLogBroadcast(
							`${this.createGameLinkItem(GameLinkItem.Player, arrivedPlayer.id)} 到达了 ${this.createGameLinkItem(
								GameLinkItem.Player,
								owner.id,
							)} 的地皮: ${this.createGameLinkItem(GameLinkItem.Property, property.id)}，支付了 ${toll}￥ 过路费`,
						);
					}
				} else {
					// this.eventMsg = `等待 ${arrivedPlayer.name} 购买地皮`;
					//地皮没有购买
					//空地, 买房
					//等待客户端回应买房
					this.setCurrentEventName(`等待${arrivedPlayer.name} 购买地皮`);
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
		});

		// 步骤2: 运行地皮预初始化阶段（在 customInitFn 之前）
		for (const phaseInfo of this.mapData.phases.propertyPreInit) {
			const propertyPreInitPhase = new GamePhase(phaseInfo, undefined, this.mapData.extraLibs);
			await this.runGamePhase(propertyPreInitPhase);
		}

		// 步骤3: 执行每个地皮的 customInitFn
		this.properties.values().forEach((property) => {
			const customInitFn = property.getCustomInitFunction();
			customInitFn && customInitFn(property, this);
		});
	}

	private async runInitedPhase() {
		for (const phaseInfo of this.mapData.phases.gameInited) {
			const gameInitedPhase = new GamePhase(phaseInfo, undefined, this.mapData.extraLibs);
			await this.runGamePhase(gameInitedPhase);
		}
	}

	private async gameLoop() {
		this.gameDataBroadcast();
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
				// 检查玩家是否应该跳过回合
				if (player.isStop > 0) {
					const originalStop = player.isStop;
					player.isStop--; // 减少停止计数
					this.eventBus.emit("player.round.skip", { player });

					// 根据剩余暂停次数显示不同的提示
					if (player.isStop === 0) {
						this.gameMsgNotifyBroadcast("info", `${player.name} 暂停中，下一回合将恢复`);
					} else {
						this.gameMsgNotifyBroadcast("info", `${player.name} 暂停中，还需跳过 ${player.isStop} 回合`);
					}
					continue; // 跳过此玩家的回合
				}

				// 检查玩家是否破产
				if (player.isBankrupted) {
					this.eventBus.emit("player.round.skip", { player });
					continue;
				}

				this.eventBus.emit("player.round.start", { player });
				this.currentRoundPlayer = player;
				this.roundTurnNotify(player.id);
				this.gameDataBroadcast();
				const context: PlayerRoundContext = {
					currentRoundPlayer: player,
				};
				const playerRoundPhases = player.getRoundPhases();
				for (const phase of playerRoundPhases) {
					await this.runGamePhase(phase, context);
				}
				this.currentRoundPlayer = null;
				this.eventBus.emit("player.round.end", { player });
			}

			//回合结束阶段
			const roundEndPhases = this.gameRoundPhase.roundEndPhase;
			for (const phase of roundEndPhases) {
				await this.runGamePhase(phase);
			}
			this.eventBus.emit("game.round.end");
		}
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
					property.id,
				)}`,
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
					property.id,
				)} 升到了 ${property.level} 级`,
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

	public async handleUseChanceCard(
		sourcePlayer: IPlayer,
		chanceCardId: string,
		targetIdList: string[],
	): Promise<boolean> {
		operationListener.clearAllTimers();
		const _this = this;

		const chanceCard = sourcePlayer.getCardById(chanceCardId);

		// 1. 卫语句：卡片不存在直接返回错误
		if (!chanceCard) {
			sendChanceCardCallback(sourcePlayer.id, true, "机会卡使用失败: 未知的机会卡ID");
			return false;
		}

		// 2. 验证目标列表是否为空
		const cardType = chanceCard.getType();
		const needsTarget = cardType !== TargetSelectType.ToSelf;
		const hasTarget = targetIdList && targetIdList.length > 0;

		if (needsTarget && !hasTarget) {
			sendChanceCardCallback(sourcePlayer.id, true, "机会卡使用失败: 请选择使用目标");
			return false;
		}

		// 3. 对于不需要目标的卡片类型，清空目标列表以避免混淆
		if (!needsTarget) {
			targetIdList = [];
		}

		try {
			const cardName = chanceCard.getName();
			const sourceLink = this.createGameLinkItem(GameLinkItem.Player, sourcePlayer.id);
			const cardLink = this.createGameLinkItem(GameLinkItem.ChanceCard, chanceCard.getSourceId());

			// 4. 根据类型执行逻辑 & 组装日志
			// 这里执行核心逻辑，如果有问题直接 throw new Error("原因")
			switch (chanceCard.getType()) {
				case TargetSelectType.ToSelf: {
					await chanceCard.use(sourcePlayer, sourcePlayer, this);

					this.gameMsgNotifyBroadcast("info", `${sourcePlayer.name} 对自己使用了机会卡: "${cardName}"`);
					this.gameLogBroadcast(`${sourceLink} 对自己使用了机会卡: ${cardLink}`);
					break;
				}

				case TargetSelectType.ToOtherPlayer:
				case TargetSelectType.ToPlayer: {
					const targetPlayer = this.players.get(targetIdList[0]);
					if (!targetPlayer) throw new Error("目标玩家不存在");

					await chanceCard.use(sourcePlayer, targetPlayer, this);

					const targetLink = this.createGameLinkItem(GameLinkItem.Player, targetPlayer.id);
					this.gameMsgNotifyBroadcast(
						"info",
						`${sourcePlayer.name} 对玩家 ${targetPlayer.name} 使用了机会卡: "${cardName}"`,
					);
					this.gameLogBroadcast(`${sourceLink} 对玩家 ${targetLink} 使用了机会卡: ${cardLink}`);
					break;
				}

				case TargetSelectType.ToProperty: {
					const targetProperty = this.properties.get(targetIdList[0]);
					if (!targetProperty) throw new Error("目标建筑/地皮不存在");

					await chanceCard.use(sourcePlayer, targetProperty, this);

					const targetLink = this.createGameLinkItem(GameLinkItem.Property, targetProperty.id);
					this.gameMsgNotifyBroadcast(
						"info",
						`${sourcePlayer.name} 对地皮 ${targetProperty.name} 使用了机会卡: "${cardName}"`,
					);
					this.gameLogBroadcast(`${sourceLink} 对地皮 ${targetLink} 使用了机会卡: ${cardLink}`);
					break;
				}

				case TargetSelectType.ToMapItem: {
					// 优化：使用 filter + map 简洁获取有效玩家列表
					const targetPlayers = targetIdList.map((id) => this.players.get(id)).filter((p): p is Player => !!p); // 利用类型谓词过滤 undefined

					if (targetPlayers.length === 0) throw new Error("选中的玩家不存在");

					await chanceCard.use(sourcePlayer, targetPlayers, this);
					// MapItem 类型通常可能涉及群体效果，日志可以在 use 内部处理，或者这里补充通用日志
					break;
				}

				default:
					throw new Error(`未知的机会卡目标类型: ${chanceCard.getType()}`);
			}

			// 5. 成功后的通用处理
			await sourcePlayer.loseCard(chanceCardId); // 扣除卡片

			// 发送成功通知给当前玩家
			this.sendToPlayer(sourcePlayer.id, {
				type: SocketMsgType.MsgNotify,
				source: SocketMsgSource.Server,
				data: undefined,
				msg: {
					type: "success",
					content: `机会卡 ${cardName} 使用成功！`,
				},
			});

			// 发送操作回调
			sendChanceCardCallback(sourcePlayer.id, false);

			// 广播最新游戏数据
			this.gameDataBroadcast();

			return true;
		} catch (e: any) {
			// 6. 统一错误处理
			const errorMessage = e.message || "未知错误";

			// 发送错误通知
			sendChanceCardCallback(sourcePlayer.id, true, errorMessage);

			return false;
		}

		function sendChanceCardCallback(playerId: string, isError: boolean, errorMsgContent?: string) {
			// 1. 如果有错误内容，先发 Notify
			if (isError && errorMsgContent) {
				_this.sendToPlayer(playerId, {
					type: SocketMsgType.MsgNotify,
					source: SocketMsgSource.Server,
					data: undefined,
					msg: { type: "error", content: errorMsgContent },
				});
			}

			// 2. 发送 UseChanceCard 回调指令
			const callBackMsg: ServerSocketMessage = {
				type: SocketMsgType.UseChanceCard,
				data: { error: isError },
				source: SocketMsgSource.Server,
			};
			sendToUsers([playerId], callBackMsg);
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
						mapEvent.id,
					)}`,
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

	/**
	 * 处理玩家经过某个格子的事件
	 * @param player - 玩家
	 * @param passedMapItemsId - 经过的格子ID列表
	 */
	private async handlePlayerPassedEvents(player: Player, passedMapItemsId: string[]): Promise<void> {
		for (const mapItemId of passedMapItemsId) {
			const mapItem = this.mapItems.get(mapItemId);
			if (!mapItem) throw Error("处理经过事件时, 找不到MapItem");
			if (!mapItem.mapEventId) continue;

			const mapEvent = this.mapEvents.get(mapItem.mapEventId);
			if (!mapEvent) throw Error("处理经过事件时, 找不到MapEvent");
			if (mapEvent.type !== MapEventType.PassedEvent) continue;

			// 直接 await 执行经过事件，不推入事件栈
			await mapEvent.fn(player, this);
			this.gameMsgNotifyBroadcast("info", `${player.name} 经过了: ${mapEvent.name} 触发事件`);
			this.gameLogBroadcast(
				`${this.createGameLinkItem(
					GameLinkItem.Player,
					player.id,
				)} 触发了地图事件: ${this.createGameLinkItem(GameLinkItem.ArrivedEvent, mapEvent.id)}`,
			);
		}
	}

	/**
	 * 规范化地图索引，处理循环地图的索引计算
	 * @param index - 原始索引（可能为负数或超出范围）
	 * @param total - 地图总格数
	 * @returns 规范化后的索引（0 到 total-1）
	 */
	private normalizeIndex(index: number, total: number): number {
		return ((index % total) + total) % total;
	}

	/**
	 * 检查某个格子是否有经过事件
	 * @param mapItemId - 格子ID
	 * @returns 是否有经过事件
	 */
	private checkMapItemHasPassedEvent(mapItemId: string): boolean {
		const mapItem = this.mapItems.get(mapItemId);
		if (!mapItem || !mapItem.mapEventId) return false;

		const mapEvent = this.mapEvents.get(mapItem.mapEventId);
		if (!mapEvent) return false;

		return mapEvent.type === MapEventType.PassedEvent;
	}

	/**
	 * 走一段连续的路并等待动画完成
	 * @param player - 玩家
	 * @param sourceIndex - 起始格子索引
	 * @param steps - 步数（可为负数表示后退）
	 * @param totalSteps - 总移动步数（用于显示）
	 * @param currentStep - 当前是第几步（用于显示）
	 */
	private async walkSegment(player: Player, sourceIndex: number, steps: number, totalSteps: number, currentStep: number): Promise<void> {
		const walkId = randomString(16);
		const targetIndex = this.normalizeIndex(sourceIndex + steps, this.mapData.mapIndex.length);

		// 发送走路指令
		const msg: ServerSocketMessage = {
			type: SocketMsgType.PlayerWalk,
			source: SocketMsgSource.Server,
			data: {
				playerId: player.id,
				step: steps,
				walkId,
				totalSteps, // 传递总步数用于显示
				startStep: currentStep, // 传递当前步数用于显示
			},
		};

		this.gameBroadcast(msg);

		// 等待动画完成
		const animationDuration = GameProcess.WALK_ANIMATION_BASE_DURATION * (Math.abs(steps) + GameProcess.WALK_ANIMATION_EXTRA_STEPS);

		// 使用超时机制防止永久等待
		const animationTimer = setTimeout(() => {
			operationListener.emit(player.id, OperateType.Animation, walkId);
		}, animationDuration);

		// 等待匹配的 AnimationComplete
		await new Promise<void>((resolve) => {
			const checkAnimationId = (receivedWalkId: string) => {
				if (receivedWalkId === walkId) {
					clearTimeout(animationTimer);
					resolve();
				} else {
					// walkId 不匹配，继续等待下一个事件
					operationListener.once(player.id, OperateType.Animation, checkAnimationId as any);
				}
			};

			operationListener.once(player.id, OperateType.Animation, checkAnimationId as any);
		});
	}

	private getPlayerById(id: string) {
		return this.players.get(id);
	}

	public onPlayerOperation<T extends OperateType>(
		playerId: string,
		operationType: T,
		callback: (res: PlayerOperationResult[T]) => void,
	): void {
		operationListener.on(playerId, operationType, callback);
	}

	public oncePlayerOperation<T extends OperateType>(
		playerId: string,
		operationType: T,
		callback: (res: PlayerOperationResult[T]) => void,
	): void {
		operationListener.once(playerId, operationType, callback);
	}

	public async onPlayerOperationAsync<T extends OperateType>(
		playerId: string,
		operationType: T,
	): Promise<PlayerOperationResult[T]> {
		return await operationListener.onAsync(playerId, operationType);
	}

	public async oncePlayerOperationAsync<T extends OperateType>(
		playerId: string,
		operationType: T,
		options?: { timeout?: number; defaultValue?: PlayerOperationResult[T] },
	): Promise<PlayerOperationResult[T]> {
		const player = this.players.get(playerId);

		// 如果玩家是AI托管，使用AI决策
		if (player?.isAI) {
			return await aiManager.makeDecision(player, operationType);
		}

		// 真实玩家，使用带超时的方法
		return await operationListener.onceAsyncWithTimeout(playerId, operationType, {
			timeout: options?.timeout ?? 15000,
			defaultValue: options?.defaultValue ?? (undefined as any),
		});
	}

	public emitPlayerOperation<T extends OperateType>(
		playerId: string,
		operationType: T,
		data: PlayerOperationResult[T],
	) {
		operationListener.emit(playerId, operationType, data);
	}

	public removePlayerOperationListener<T extends OperateType>(
		playerId: string,
		operationType: T,
		listener: (...args: any[]) => PlayerOperationResult[T],
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

	public roundRemainingTimeBroadcast = (remainingTime: number, totalTime: number) => {
		const msg: ServerSocketMessage = {
			type: SocketMsgType.RemainingTime,
			source: SocketMsgSource.Server,
			data: { remainingTime, totalTime },
		};
		this.gameBroadcast(msg);
	};

	/**
	 * 设置当前事件名称
	 * @param eventName - 事件名称
	 */
	public setCurrentEventName(eventName: string): void {
		this.currentEventName = eventName;
		const msg: ServerSocketMessage = {
			type: SocketMsgType.CurrentEventName,
			source: SocketMsgSource.Server,
			data: { eventName },
		};
		this.gameBroadcast(msg);
	}

	/**
	 * 更新当前事件的倒计时显示状态
	 * @param showCountdown - 是否显示倒计时
	 */
	public updateCurrentEventShowCountdown(showCountdown: boolean): void {
		const msg: ServerSocketMessage = {
			type: SocketMsgType.CurrentEventName,
			source: SocketMsgSource.Server,
			data: {
				eventName: this.currentEventName,
				showCountdown,
			},
		};
		this.gameBroadcast(msg);
	}

	public async showConfirmDialog(
		playerId: string,
		option: ConfirmDialogOption,
		config?: { timeout?: number; defaultValue?: ConfirmDialogResult },
	): Promise<ConfirmDialogResult> {
		const player = this.players.get(playerId);

		// 如果玩家是AI托管，直接返回决策，不显示对话框
		if (player?.isAI) {
			return (await aiManager.makeDecision(player, OperateType.ConfirmDialogResult, option)) as ConfirmDialogResult;
		}

		// 真实玩家，显示对话框
		sendToUsers([playerId], {
			type: SocketMsgType.ConfirmDialog,
			source: SocketMsgSource.Server,
			data: {
				playerId,
				option,
			},
		});

		// 使用带超时的方法
		return (await operationListener.onceAsyncWithTimeout(playerId, OperateType.ConfirmDialogResult, {
			timeout: config?.timeout,
			defaultValue: config?.defaultValue ?? { id: playerId, confirm: false },
		})) as ConfirmDialogResult;
	}

	public async showTargetSelectDialog<I extends TargetSelectType>(
		playerId: string,
		option: TargetSelectDialogOption<I>,
		config?: { timeout?: number; defaultValue?: TargetSelectDialogResult<I> },
	): Promise<TargetSelectDialogResult<I>> {
		const player = this.players.get(playerId);

		// 如果玩家是AI托管，直接返回决策，不显示对话框
		if (player?.isAI) {
			return (await aiManager.makeDecision(
				player,
				OperateType.TargetSelectDialogResult,
				option,
			)) as TargetSelectDialogResult<I>;
		}

		// 真实玩家，显示对话框
		sendToUsers([playerId], {
			type: SocketMsgType.TargetSelectDialog,
			source: SocketMsgSource.Server,
			data: {
				playerId,
				option,
			},
		});

		return (await operationListener.onceAsyncWithTimeout(playerId, OperateType.TargetSelectDialogResult, {
			timeout: config?.timeout,
			defaultValue: config?.defaultValue ?? { target: [] },
		})) as TargetSelectDialogResult<I>;
	}

	public async showItemSelectDialog(
		playerId: string,
		option: ItemSelectDialogOption,
		config?: { timeout?: number; defaultValue?: ItemSelectDialogResult },
	): Promise<ItemSelectDialogResult> {
		const player = this.players.get(playerId);

		// 如果玩家是AI托管，直接返回决策，不显示对话框
		if (player?.isAI) {
			return (await aiManager.makeDecision(
				player,
				OperateType.ItemSelectDialogResult,
				option,
			)) as ItemSelectDialogResult;
		}

		// 真实玩家，显示对话框
		sendToUsers([playerId], {
			type: SocketMsgType.ItemSelectDialog,
			source: SocketMsgSource.Server,
			data: {
				playerId,
				option,
			},
		});

		return (await operationListener.onceAsyncWithTimeout(playerId, OperateType.ItemSelectDialogResult, {
			timeout: config?.timeout,
			defaultValue: config?.defaultValue ?? { selected: [] },
		})) as ItemSelectDialogResult;
	}

	/**
	 * 显示表单对话框
	 * @param playerId - 玩家 ID
	 * @param option - 表单对话框选项
	 * @param config - 配置选项（超时时间和默认值）
	 * @returns 表单对话框结果
	 */
	public async showFormDialog<F extends FormField<string, any>[]>(
		playerId: string,
		option: FormDialogOption<F>,
		config?: { timeout?: number; defaultValue?: FormDialogResult<F> },
	): Promise<FormDialogResult<F>> {
		const player = this.players.get(playerId);

		// 如果玩家是 AI 托管，直接返回决策，不显示对话框
		if (player?.isAI) {
			return (await aiManager.makeDecision(player, OperateType.FormDialogResult, option)) as FormDialogResult<F>;
		}

		// 真实玩家，显示表单对话框
		sendToUsers([playerId], {
			type: SocketMsgType.FormDialog,
			source: SocketMsgSource.Server,
			data: {
				playerId,
				option,
			},
		});

		// 使用带超时的方法等待响应
		return (await operationListener.onceAsyncWithTimeout(playerId, OperateType.FormDialogResult, {
			timeout: config?.timeout,
			defaultValue: config?.defaultValue ?? this.buildDefaultFormResult(option.fields),
		})) as FormDialogResult<F>;
	}

	/**
	 * 构建表单默认结果
	 */
	private buildDefaultFormResult<F extends FormField<string, any>[]>(fields: F): FormDialogResult<F> {
		const result: any = { submitted: false };
		for (const field of fields) {
			result[field.key] = field.defaultValue;
		}
		return result;
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
		// 步骤1: 初始化玩家和地皮（包含预初始化阶段）
		await this.initPlayers();
		await this.initProperties();

		// 步骤2: 运行游戏初始化后阶段
		await this.runInitedPhase();

		// 步骤3: 发送游戏初始化消息给客户端
		this.gameBroadcast({
			type: SocketMsgType.GameInit,
			source: SocketMsgSource.Server,
			data: this.getGameData(),
		});

		// 步骤4: 等待客户端初始化完成
		await this.waitInitFinished();

		// 步骤5: 开始游戏循环
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
		},
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

	/**
	 * 通知所有客户端进入新回合
	 * 广播当前回合玩家 ID,让每个客户端自行判断是否是自己的回合
	 * @param playerId - 当前回合玩家的 ID
	 */
	public roundTurnNotify(playerId: string) {
		this.gameBroadcast({
			type: SocketMsgType.RoundTurn,
			source: SocketMsgSource.Server,
			data: playerId,
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
			msg,
		);
	}

	public handlePlayerOffline(userId: string) {
		const player = this.getPlayerById(userId);
		if (player) {
			player.setIsOffline(true);
			// 启用AI托管
			player.isAI = true;
			console.log(`[AI托管] 玩家 ${player.name} 离线，启用AI托管`);
			this.gameDataBroadcast();
		}
	}

	public handlePlayerReconnect(userId: string) {
		const player = this.players.get(userId);
		if (player) {
			player.setIsOffline(false);
			// 取消AI托管
			player.isAI = false;
			console.log(`[AI托管] 玩家 ${player.name} 重连，取消AI托管`);
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
		operationListener.clearAllTimers();
		this.intervalTimerList.forEach((id) => {
			clearInterval(id);
		});
		this.timeoutList.forEach((id) => {
			clearTimeout(id);
		});
	}
}
