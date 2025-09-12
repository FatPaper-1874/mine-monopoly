import {
	ChanceCardInfo,
	ChanceCardInstanceInfo,
	ChanceCardType,
	IChanceCard,
	IGameProcess,
	IPlayer,
	IProperty,
} from "@fatpaper-monopoly/types";
import { GameProcess } from "../GameProcessWorker";
import { randomString } from "@src/utils";

export class ChanceCard implements IChanceCard {
	private id: string;
	private sourceId: string;
	private name: string;
	private describe: string;
	private type: ChanceCardType;
	private color: string;
	private icon: string;
	private effectCode: string;
	private effectFunction: Function;

	constructor(chanceCard: ChanceCardInfo) {
		this.id = randomString(16);
		this.sourceId = chanceCard.id;
		this.name = chanceCard.name;
		this.describe = chanceCard.description;
		this.type = chanceCard.type;
		this.color = chanceCard.color;
		this.icon = chanceCard.iconId;
		this.effectCode = chanceCard.effectCode;
		const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
		this.effectFunction = new AsyncFunction("sourcePlayer", "target", "gameProcess", this.effectCode);
	}

	public getId = () => this.id;
	public getSourceId = () => this.sourceId;
	public getName = () => this.name;
	public getDescribe = () => this.describe;
	public getColor = () => this.color;
	public getType = () => this.type;
	public getIcon = () => this.icon;
	public getEffectCode = () => this.effectCode;

	public async use(
		sourcePlayer: IPlayer,
		target: IPlayer | IProperty | IPlayer[] | IProperty[],
		gameProcess: IGameProcess
	) {
		try {
			await this.effectFunction(sourcePlayer, target, gameProcess);
		} catch (e: any) {
			throw Error(e.message);
		}
	}

	public getChanceCardInfo(): ChanceCardInstanceInfo {
		const chanceCardInfo: ChanceCardInstanceInfo = {
			id: this.id,
			sourceId: this.sourceId,
			name: this.name,
			description: this.describe,
			color: this.color,
			type: this.type,
			iconId: this.icon,
		};
		return chanceCardInfo;
	}
}
