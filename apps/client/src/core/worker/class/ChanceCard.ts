import {
	ChanceCardInfo,
	ChanceCardClientInfo,
	TargetSelectType,
	IChanceCard,
	IGameProcess,
	IPlayer,
	IProperty,
} from "@mine-monopoly/types";
import { GameProcess } from "../GameProcessWorker";
import { randomString } from "@src/utils";
import { pickSerializableFields } from "../utils/serialize";

export class ChanceCard implements IChanceCard {
	private id: string;
	private sourceId: string;
	private name: string;
	private describe: string;
	private type: TargetSelectType;
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
		const chanceCardFnGenerator = new Function(this.effectCode);
		this.effectFunction = chanceCardFnGenerator();
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
		target: IPlayer | IProperty | string | IPlayer[] | IProperty[],
		gameProcess: IGameProcess,
	) {
		try {
			await this.effectFunction(sourcePlayer, target, gameProcess);
		} catch (e: any) {
			throw Error(e.message);
		}
	}

	public getChanceCardInfo(): ChanceCardClientInfo & Record<string, any> {
		const excludeKeys = new Set([
			'effectCode', 'effectFunction',
			'id', 'sourceId', 'name', 'type', 'color', 'icon',
		]);

		const chanceCardInfo: ChanceCardClientInfo & Record<string, any> = {
			id: this.id,
			sourceId: this.sourceId,
			name: this.name,
			description: this.describe,
			color: this.color,
			type: this.type,
			iconId: this.icon,
			...pickSerializableFields(this, excludeKeys),
		};

		return chanceCardInfo;
	}
}
