import { OperateListener } from "./class/OperateListener";
import { WorkerCommMsg } from "@src/interfaces/worker";
import { WorkerCommType } from "@src/enums/worker";

import Utils from "./class/Utils?raw";
import {
	GameContext,
	GameEvent,
	GameMap,
	IGameProcess,
	OperateType,
	SocketMsgType,
	UserInRoomInfo,
} from "@fatpaper-monopoly/types";
import Dice from "./class/Dice";
import { RoundTimeTimer } from "./class/RoundTimeTimer";
import { Player } from "./class/Player";
import { Property } from "./class/Property";
import { GameSetting, ServerSocketMessage } from "@src/interfaces/bace";
import { ChanceCard } from "./class/ChanceCard";

const operateListener = new OperateListener();
let gameProcess: GameProcess | null = null;

self.postMessage(<WorkerCommMsg>{
	type: WorkerCommType.WorkerReady,
});

self.addEventListener("message", (ev) => {
	const data: WorkerCommMsg = ev.data;
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
				// const { userId, operateType, data: _data } = data.data;
				// operateListener.emit(userId, operateType, _data);
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
	public mapData: GameMap;
	private gameSetting: GameSetting;
	private userList: UserInRoomInfo[];

	public players: Map<string, Player> = new Map();
	public properties: Map<string, Property> = new Map();
	public chanceCards: Map<string, ChanceCard> = new Map();

	public gameEventStack: GameEvent<GameContext>[] = [];

	public currentRoundPlayer: Player | null = null;
	public currentRound: number = 0; //当前回合
	private isGameOver: boolean = false;
	private timeoutList: any[] = []; //计时器列表
	private intervalTimerList: any[] = []; //计时器列表
	private roundTimeTimer: RoundTimeTimer; //倒计时

	private dice: Dice;
	constructor(mapData: GameMap, gameSetting: GameSetting, userList: UserInRoomInfo[], roomOwnerId: string) {
		this.mapData = mapData;
		this.gameSetting = gameSetting;
		this.userList = userList;

		this.dice = new Dice(gameSetting.diceNum);
		this.roundTimeTimer = new RoundTimeTimer(gameSetting.roundTime, 1000);
		if (gameSetting.slackOffMode) {
			operateListener.on(roomOwnerId, OperateType.PauseGame, () => {
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
			operateListener.on(roomOwnerId, OperateType.ResumeGame, () => {
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
		this.initPlayer();
	}
	private initPlayer() {
		this.userList.forEach((u) => {
			const player = new Player(u, this.gameSetting.initMoney, 0, this.mapData.phases.playerRound);
			this.players.set(player.getId(), player);
		});
	}

	public pushEventToStack(gameEvent: GameEvent<GameContext>) {}

	public async start() {}

	public gameBroadcast(msg: ServerSocketMessage) {
		sendToUsers(
			Array.from(this.players.values()).map((p) => p.getId()),
			msg
		);
	}
}
