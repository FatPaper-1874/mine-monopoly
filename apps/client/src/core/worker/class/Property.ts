import { IPlayer, IProperty, PropertyInfo } from "@fatpaper-monopoly/types";

export class Property implements IProperty {
	private id: string;
	private name: string;
	private buildCost: number;
	private level: number;
	private maxLevel: number;
	private sellCost: number;
	private costList: number[];
	private streetId: string;
	private owner: IPlayer | undefined = undefined;

	constructor(property: PropertyInfo) {
		this.id = property.id;
		this.name = property.name;
		this.level = 0;
		this.buildCost = property.buildCost;
		this.sellCost = property.sellCost;
		this.costList = property.costList;
		this.maxLevel = property.maxLevel;
		this.streetId = property.streetId;
	}

	public getId = () => this.id;
	public getName = () => this.name;
	public getBuildingLevel = () => this.level;
	public getBuildCost = () => this.buildCost;
	public getSellCost = () => this.sellCost;
	public getCostList = () => this.costList;
	public getOwner = () => this.owner;

	public buildUp() {
		if (this.level < this.maxLevel) {
			this.level++;
		}
	}

	public setBuildingLevel(level: number) {
		this.level = level;
	}

	public setOwner(player: IPlayer | undefined) {
		//如果原本有主人
		if (this.owner) {
			this.owner.loseProperty(this);
		}
		this.owner = player;
		if (this.owner) {
			this.owner.gainProperty(this);
		}
	}

	public getPassCost(): number {
		return this.costList[this.level];
	}

	public getPropertyInfo(): PropertyInfo {
		const owner = this.owner;
		const propertyInfo: PropertyInfo = {
			id: this.id,
			name: this.name,
			level: this.level,
			maxLevel: this.maxLevel,
			buildCost: this.buildCost,
			sellCost: this.sellCost,
			costList: this.costList,
			streetId: this.streetId,
			owner: owner ? owner.getUser() : undefined,
		};
		return propertyInfo;
	}
}
