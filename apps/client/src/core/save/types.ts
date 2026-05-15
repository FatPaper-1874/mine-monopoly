import { Buff, DiceInfo, GameLog, ModifierSnapshot } from "@mine-monopoly/types";

/** Player 全量快照 */
export interface PlayerSnapshot {
	/** 已知字段的显式声明（方便类型提示） */
	roleId: string;
	money: number;
	positionIndex: number;
	stop: number;
	isBankrupted: boolean;
	isOffline: boolean;
	isAI: boolean;
	exportData: Record<string, any>;
	dices: DiceInfo[];
	chanceCards: { instanceId: string; sourceId: string }[];
	buffs: Buff[];
	modifiers: ModifierSnapshot[];
	/** 自定义地图脚本可能挂载到 Player 上的额外数据属性 */
	[key: string]: unknown;
}

/** Property 全量快照 */
export interface PropertySnapshot {
	level: number;
	ownerId: string | undefined;
	exportData: Record<string, any>;
	modifiers: ModifierSnapshot[];
}

/** 单次游戏快照 */
export interface SaveSnapshot {
	currentRound: number;
	currentMultiplier: number;
	exportData: Record<string, any>;
	customData: Record<string, any>;
	gameLogList: GameLog[];
	playerSnapshots: Record<string, PlayerSnapshot>;
	propertySnapshots: Record<string, PropertySnapshot>;
}

/** IndexedDB 存档记录 */
export interface SaveRecord {
	id: string;
	mapId: string;
	mapVersion: string;
	mapName: string;
	saveTime: number;
	round: number;
	playerCount: number;
	playerUserIds: string[];
	playerNames: string[];
	snapshot: SaveSnapshot;
	previousSnapshot?: SaveSnapshot;
}
