import {
	ICommandBus,
	IGameProcess,
	IModifier,
	IModifierManager,
	IPlayer,
	IProperty,
	PropertyCommandMap,
	PropertyCustom,
	PropertyInfo,
} from "@fatpaper-monopoly/types";
import { ModifierManager } from "./action-system/ModifiersManager";
import { CommandBus } from "./action-system/CommandBus";
import GameProcessTypes from "../editor-lib.d.ts?raw";
import { compileTsToJs } from "@src/utils";

export class Property implements IProperty {
	public id: string;
	public name: string;
	public level: number;
	public maxLevel: number;
	public buildCost: number;
	public sellCost: number;
	public costList: number[];
	public streetId: string;
	public buildingModelIdList: string[] | undefined;
	public custom: PropertyCustom | undefined;
	public owner: IPlayer | undefined = undefined;

	public modifierManager: IModifierManager<PropertyCommandMap>;
	public commandBus: ICommandBus<PropertyCommandMap>;
	private originalData: PropertyInfo;

	private customPropertyInitFunction: ((property: IProperty, gameProcess: IGameProcess) => void) | undefined;

	constructor(property: PropertyInfo) {
		this.id = property.id;
		this.name = property.name;
		this.level = 0;
		this.buildCost = property.buildCost;
		this.sellCost = property.sellCost;
		this.costList = property.costList;
		this.maxLevel = property.maxLevel;
		this.streetId = property.streetId;
		this.buildingModelIdList = property.buildingModelIdList;
		this.custom = property.custom;
		this.originalData = property;

		this.modifierManager = new ModifierManager();
		this.commandBus = new CommandBus<PropertyCommandMap>(this.modifierManager);

		this.initCommandBus();

		if (property.custom) {
			const codeCompiled = compileTsToJs(property.custom.effectCode, GameProcessTypes);
			this.customPropertyInitFunction = new Function(codeCompiled)();
		}
	}

	public getCustomInitFunction() {
		return this.customPropertyInitFunction;
	}

	private initCommandBus() {
		this.commandBus.setHandler("property.owner.change", (payload) => {
			const { oldOwner, newOwner } = payload;
			//如果原本有主人
			if (oldOwner) {
				oldOwner.loseProperty(this);
			}
			this.owner = newOwner;
			if (newOwner) {
				newOwner.gainProperty(this);
			}
			return payload;
		});

		this.commandBus.setHandler("property.level.up", (payload) => {
			if (this.level < this.maxLevel) {
				this.level++;
			}
			return payload;
		});

		this.commandBus.setHandler("property.level.down", (payload) => {
			if (this.level > 0) {
				this.level--;
			}
			return payload;
		});

		this.commandBus.setHandler("property.level.set", (payload) => {
			const { oldLevel, newLevel } = payload;
			this.level = newLevel;
			return payload;
		});

		this.commandBus.setHandler("property.arrived", async (payload) => {
			const { owner, arrivedPlayer, toll } = payload;
			if (owner !== undefined && toll !== undefined) {
				await owner.gain(toll);
				await arrivedPlayer.cost(toll);
			}
			return payload;
		});
	}

	public getOriginalData = () => this.originalData;

	public async levelUp() {
		this.commandBus.execute({ type: "property.level.up", payload: {} });
	}

	public async levelDown() {
		this.commandBus.execute({ type: "property.level.down", payload: {} });
	}

	public async setLevel(level: number) {
		this.commandBus.execute({ type: "property.level.set", payload: { oldLevel: this.level, newLevel: level } });
	}

	public async setOwner(player: IPlayer | undefined) {
		this.commandBus.execute({ type: "property.owner.change", payload: { oldOwner: this.owner, newOwner: player } });
	}

	public async arrived(player: IPlayer) {
		this.commandBus.execute({
			type: "property.arrived",
			payload: { owner: this.owner, arrivedPlayer: player, toll: this.costList[this.level] || 0 },
		});
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
			buildingModelIdList: this.buildingModelIdList,
			custom: this.custom ? { effectCode: "", description: this.custom.description } : undefined,
		};
		return propertyInfo;
	}

	public registerModifier(modifier: IModifier<PropertyCommandMap>) {
		this.modifierManager.add(modifier);
	}
}
