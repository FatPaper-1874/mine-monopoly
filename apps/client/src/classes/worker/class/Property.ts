import { Property as PropertyFromDB, PropertyInfo } from "@src/interfaces/game";
import { Player } from "./Player";
import { PlayerInterface, PropertyInterface } from "../interfaces/game";

export class Property implements PropertyInterface {
	private id: string;
	private name: string;
	private buildCost: number;
	private buildingLevel: number;
	private sellCost: number;
	private cost_lv0: number;
	private cost_lv1: number;
	private cost_lv2: number;
	private owner: PlayerInterface | undefined = undefined;

	constructor(property: PropertyFromDB) {
		this.id = property.id;
		this.name = property.name;
		this.buildingLevel = 0;
		this.buildCost = property.buildCost;
		this.sellCost = property.sellCost;
		this.cost_lv0 = property.cost_lv0;
		this.cost_lv1 = property.cost_lv1;
		this.cost_lv2 = property.cost_lv2;
	}

	public getId = () => this.id;
	public getName = () => this.name;
	public getBuildingLevel = () => this.buildingLevel;
	public getBuildCost = () => this.buildCost;
	public getSellCost = () => this.sellCost;
	public getCost_lv0 = () => this.cost_lv0;
	public getCost_lv1 = () => this.cost_lv1;
	public getCost_lv2 = () => this.cost_lv2;
	public getOwner = () => this.owner;

	public buildUp() {
		if (this.buildingLevel < 2) {
			this.buildingLevel++;
		}
	}

	public setBuildingLevel(level: 0 | 1 | 2) {
		this.buildingLevel = level;
	}

	public setOwner = async (player: PlayerInterface | undefined) => {
		//如果原本有主人
		if (this.owner) {
			await this.owner.loseProperty(this);
		}
		this.owner = player;
		if (this.owner) {
			this.owner.gainProperty(this);
		}
	};

	public getPassCost(): number {
		switch (this.buildingLevel) {
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
			buildingLevel: this.buildingLevel,
			buildCost: this.buildCost,
			sellCost: this.sellCost,
			cost_lv0: this.cost_lv0,
			cost_lv1: this.cost_lv1,
			cost_lv2: this.cost_lv2,
			owner: owner
				? { id: owner.getId(), name: owner.getName(), color: owner.getUser().color, avatar: owner.getUser().avatar }
				: undefined,
		};
		return propertyInfo;
	}
}
