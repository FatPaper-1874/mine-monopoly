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
declare enum GamePhaseMark {
	GameRoundStart = 0,
	PlayerRoundStart = 1,
	RollDice = 2,
	PlayerMove = 3,
	ArrivedEvent = 4,
	PlayerRoundEnd = 5,
	GameRoundEnd = 6
}
declare enum EventTiggerTime {
	Before = "BEFORE",
	After = "AFTER"
}
interface User {
	id: string;
	name: string;
	avatar: string;
	color: string;
	isReady: boolean;
}
interface IGamePhase<Context extends GameContext> {
	new (initEvent: Middleware<Context>): IGamePhase<Context>;
	id: string;
	name: string;
	description: string;
	mark?: GamePhaseMark;
	from: string;
	initEvent: Middleware<Context>;
	eventQueue: Middleware<Context>[];
	use(tiggerTime: EventTiggerTime, fn: Middleware<Context>): void;
	run(context: Context): Promise<void>;
}
type Middleware<Context> = (ctx: Context, next: () => Promise<void>) => Promise<void>;
type GameContext = {
	cancel?: boolean;
};
interface ArrivedEventContext extends GameContext {
	arrivedPlayer: IPlayer;
	arrivedProperty: IProperty;
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
declare let arrivedEventPhase: IGamePhase<ArrivedEventContext>;
