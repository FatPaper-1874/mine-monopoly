import { IPlayer, IProperty, PropertyInfo } from "@fatpaper-monopoly/types";

export class Property implements IProperty {
	private id: string;
	private name: string;
	private buildCost: number;
	private level: number;
	private sellCost: number;
	private cost_lv0: number;
	private cost_lv1: number;
	private cost_lv2: number;
	private streetId: string;
	private owner: IPlayer | undefined = undefined;

	constructor(property: PropertyInfo) {
		this.id = property.id;
		this.name = property.name;
		this.level = 0;
		this.buildCost = property.buildCost;
		this.sellCost = property.sellCost;
		this.cost_lv0 = property.cost_lv0;
		this.cost_lv1 = property.cost_lv1;
		this.cost_lv2 = property.cost_lv2;
		this.streetId = property.streetId;
	}

	public getId = () => this.id;
	public getName = () => this.name;
	public getBuildingLevel = () => this.level;
	public getBuildCost = () => this.buildCost;
	public getSellCost = () => this.sellCost;
	public getCost_lv0 = () => this.cost_lv0;
	public getCost_lv1 = () => this.cost_lv1;
	public getCost_lv2 = () => this.cost_lv2;
	public getOwner = () => this.owner;

	public buildUp() {
		if (this.level < 2) {
			this.level++;
		}
	}

	public setBuildingLevel(level: number) {
		this.level = level;
	}

	public async setOwner(player: IPlayer | undefined) {
		//如果原本有主人
		if (this.owner) {
			await this.owner.loseProperty(this);
		}
		this.owner = player;
		if (this.owner) {
			this.owner.gainProperty(this);
		}
	}

	public getPassCost(): number {
		switch (this.level) {
			case 1:
				return this.cost_lv1;
				break;
			case 2:
				return this.cost_lv2;
				break;
			default:
				return this.cost_lv0;
		}
	}

	public getPropertyInfo(): PropertyInfo {
		const owner = this.owner;
		const propertyInfo: PropertyInfo = {
			id: this.id,
			name: this.name,
			level: this.level,
			buildCost: this.buildCost,
			sellCost: this.sellCost,
			cost_lv0: this.cost_lv0,
			cost_lv1: this.cost_lv1,
			cost_lv2: this.cost_lv2,
			streetId: this.streetId,
			owner: owner ? owner.getUser() : undefined,
		};
		return propertyInfo;
	}
}
