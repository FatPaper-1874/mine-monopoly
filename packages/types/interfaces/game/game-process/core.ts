import { GameLinkItem, TargetSelectType } from "../../../../types/enums/game/game";
import { OperateType } from "../../../../types/enums/game/game-process";
import { GameMap } from "../map";
import { PlayerOperationResult, ServerSocketMessage } from "../socket";
import { IRoundTimeTimer } from "../util";
import { IPlayer, IProperty, IChanceCard } from "./entities"; // 引用 entities
import { ChanceCardInfo } from "./infos"; // 引用 infos
import { IGameRuntimeStack, GameContext, GameEvent } from "./events"; // 引用 events
import {
	ConfirmDialogOption,
	ConfirmDialogResult,
	InputOptionItem,
	ItemSelectDialogOption,
	ItemSelectDialogResult,
	MessageCardOption,
	TargetSelectDialogOption,
	TargetSelectDialogResult,
} from "./ui"; // 引用 ui

export interface GameSetting {
	[key: string]: { label: string; value: any; displayValue: any };
}

export interface IGameProcess {
	extraData: Record<string, any>;
	mapData: GameMap;
	gameSetting: GameSetting;
	players: Map<string, IPlayer>;
	properties: Map<string, IProperty>;
	chanceCardInfos: Map<string, ChanceCardInfo>;
	currentRoundPlayer: IPlayer | null;
	currentRound: number;
	gameRuntimeStack: IGameRuntimeStack<GameContext>;
	roundTimeTimer: IRoundTimeTimer; //倒计时
	gameOverRuleFunction: () => Promise<boolean>;

	handlePlayerBuyProperty(player: IPlayer, property: IProperty): Promise<void>;
	handlePlayerBuildUp(player: IPlayer, property: IProperty): Promise<void>;
	handleArriveEvent(arrivedPlayer: IPlayer): Promise<void>;
	handleUseChanceCard(sourcePlayer: IPlayer, chanceCardId: string, targetIdList: string[]): Promise<boolean>;
	roundTurnNotify(playerId: string): void;

	emitPlayerOperation<T extends OperateType>(playerId: string, operationType: T, data: PlayerOperationResult[T]): void;
	oncePlayerOperationAsync<T extends OperateType>(
		playerId: string,
		operationType: T
	): Promise<PlayerOperationResult[T]>;
	onPlayerOperationAsync<T extends OperateType>(playerId: string, operationType: T): Promise<PlayerOperationResult[T]>;
	oncePlayerOperation<T extends OperateType>(
		playerId: string,
		operationType: T,
		callback: (res: PlayerOperationResult[T]) => void
	): void;
	onPlayerOperation<T extends OperateType>(
		playerId: string,
		operationType: T,
		callback: (res: PlayerOperationResult[T]) => void
	): void;
	removePlayerOperationListener<T extends OperateType>(
		playerId: string,
		operationType: T,
		listener: (...args: any[]) => PlayerOperationResult[T]
	): void;
	removePlayerAllOperationListener<T extends OperateType>(playerId: string, operationType?: T): void;

	pushEventToStack(gameEvent: GameEvent<GameContext>): void;
	generateNewChanceCard(sourceId: string): IChanceCard;

	createGameLinkItem(type: GameLinkItem, id: string): void;
	sendToPlayer(id: string, msg: ServerSocketMessage): void;
	gameDataBroadcast(): void;
	gameMsgNotifyBroadcast(type: "success" | "warning" | "error" | "info", msg: string): void;
	gameLogBroadcast(log: string): void;
	gameBroadcast(msg: ServerSocketMessage): void;

	showConfirmDialog<I extends InputOptionItem<string, any>[]>(
		playerId: string,
		option: ConfirmDialogOption<I>
	): Promise<ConfirmDialogResult<I>>;
	showTargetSelectDialog<I extends TargetSelectType>(
		playerId: string,
		option: TargetSelectDialogOption<I>
	): Promise<TargetSelectDialogResult<I>>;
	showItemSelectDialog(playerId: string, option: ItemSelectDialogOption): Promise<ItemSelectDialogResult>;
	showMessageCard(playerIds: string[], option: MessageCardOption): Promise<void>;

	checkGameOver(): Promise<void>;
}
