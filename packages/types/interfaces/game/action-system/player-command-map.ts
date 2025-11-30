import { IChanceCard, IPlayer, IProperty } from "../game-process";
import { IDice } from "../util";
import { ICommandMap } from "./command";

export interface PlayerCommandMap extends ICommandMap {
	// 地产
	"player.property.gain": {
		payload: { property: IProperty };
		result: { property: IProperty };
	};

	"player.property.lose": {
		payload: { property: IProperty };
		result: { property: IProperty };
	};

	// 机会卡
	"player.card.gain": {
		payload: { card: IChanceCard };
		result: { card: IChanceCard };
	};

	"player.card.lose": {
		payload: { cardId: string };
		result: { cardId: string };
	};

	// 金钱
	"player.money.gain": {
		payload: { money: number; source?: IPlayer };
		result: { money: number; source?: IPlayer };
	};

	"player.money.lose": {
		payload: { money: number; target?: IPlayer };
		result: { money: number; target?: IPlayer };
	};

	// 移动
	"player.stop": {
		payload: { stop: number };
		result: { stop: number };
	};

	"player.walk": {
		payload: { steps: number };
		result: { steps: number };
	};

	"player.tp": {
		payload: { positionIndex: number };
		result: { positionIndex: number };
	};

	// 游戏事件
	"player.bankrupted.set": {
		payload: { bankrupted: boolean };
		result: { bankrupted: boolean };
	};

	// 骰子
	"player.dice.roll": {
		payload: { dices: IDice[] };
		result: { diceResult: number[] };
	};
}
