declare enum ChanceCardType {
	ToSelf = "ToSelf",
	ToOtherPlayer = "ToOtherPlayer",
	ToPlayer = "ToPlayer",
	ToProperty = "ToProperty",
	ToMapItem = "ToMapItem"
}
interface IProperty {
	id: string;
	name: string;
	sellCost: number;
	buildCost: number;
	cost_lv0: number;
	cost_lv1: number;
	cost_lv2: number;
	streetId: string;
}
interface IChanceCard extends ChanceCard {
	sourceId: string;
}
interface ChanceCard {
	id: string;
	name: string;
	description: string;
	iconId: string;
	color: string;
	effectCode: string;
	type: ChanceCardType;
}
interface Buff {
	id: string;
	name: string;
	describe: string;
	source: string;
	triggerTiming: string;
	triggerTimes: number;
}
interface User {
	id: string;
	name: string;
	avatar: string;
	color: string;
	isReady: boolean;
}
type Middleware<Context> = (ctx: Context, next: () => Promise<void>) => Promise<void>;
type GameContext = {
	cancel?: boolean;
};
interface GameRoundStartContext extends GameContext {
}
interface PlayerRoundStartContext extends GameContext {
}
interface RollDiceContext extends GameContext {
}
interface PlayerMoveContext extends GameContext {
}
interface ArrivedEventContext extends GameContext {
	arrivedPlayer: IPlayer;
	arrivedProperty: IProperty;
}
interface PlayerRoundEndContext extends GameContext {
}
interface GameRoundEndContext extends GameContext {
}
interface IPlayer {
	id: string;
	user: User;
	money: number;
	properties: PropertyInfo[];
	chanceCards: ChanceCardInfo[];
	buff: Buff[];
	positionIndex: number;
	isBankrupted: boolean;
	isOffline: boolean;
}
interface PropertyInfo extends IProperty {
	owner?: PlayerInfo;
}
interface ChanceCardInfo extends IChanceCard {
}
interface PlayerInfo extends Omit<IPlayer, ""> {
}
