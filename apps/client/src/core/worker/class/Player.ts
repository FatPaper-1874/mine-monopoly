import {
	Buff,
	DiceResult,
	GameContext,
	GamePhaseInfo,
	IChanceCard,
	ICommandBus,
	IDice,
	IGamePhase,
	IGameProcess,
	IBuffManager,
	IModifier,
	IModifierManager,
	IPlayer,
	IProperty,
	MoneyTagType,
	PlayerCommandMap,
	PlayerInfo,
	Role,
	UISchema,
	UserInRoomInfo,
} from "@mine-monopoly/types";
import { GamePhase } from "./GamePhase";
import { compileTsToJs, randomString } from "@src/utils";
import GameProcessTypes from "../editor-lib.d.ts?raw";
import { CommandBus } from "./action-system/CommandBus";
import { BuffManager } from "./action-system/BuffManager";
import { ModifierManager } from "./action-system/ModifiersManager";
import Dice from "./Dice";
import { clone } from "lodash";

export class Player implements IPlayer {
	public id: string;
	public name: string;
	public roleId: string;
	public money: number;
	public properties: IProperty[] = [];
	public chanceCards: IChanceCard[] = [];
	public positionIndex: number; //所在棋盘格子的下标
	public isStop: number; //是否停止回合
	public isBankrupted: boolean = false; //是否破产
	public isOffline: boolean; //是否断线
	public isAI: boolean = false; //是否为AI托管
	public stop: number = 0;
	public infoDisplay: UISchema;

	public roundPhases: IGamePhase<GameContext>[] = [];
	public modifierManager: IModifierManager<PlayerCommandMap>;
	public buffManager: IBuffManager;
	public commandBus: ICommandBus<PlayerCommandMap>;
	public dices: IDice[];

	public exportData: Record<string, any> = {};

	private user: UserInRoomInfo;
	private roleInitFunction: (player: IPlayer, gameProcess: IGameProcess) => void;

	constructor(
		user: UserInRoomInfo,
		initMoney: number,
		initPositionIndex: number,
		roundPhasesInfo: GamePhaseInfo[],
		role: Role,
		extraLibs?: string,
	) {
		this.roundPhases = roundPhasesInfo.map((roundPhaseInfo) => {
			return new GamePhase(roundPhaseInfo, undefined, extraLibs);
		});
		this.user = user;
		this.id = user.userId;
		this.name = user.username;
		this.roleId = user.roleId;
		this.money = initMoney;
		this.positionIndex = initPositionIndex;
		this.isStop = 0;
		this.isOffline = false;
		this.dices = [new Dice(), new Dice()];
		this.infoDisplay = {
			id: `info-${this.id}`,
			type: "div",
			style: {
				flex: "1",
				display: "flex",
				flexDirection: "column",
				textAlign: "center",
				borderRadius: "1.4em",
				padding: "0.3em 0.5em",
			},
			children: [
				{
					id: "username-text",
					type: "text",
					textBinding: "player.user.username",
				},
				{
					id: "money-container",
					type: "div",
					children: [
						{
							id: "money-tag",
							type: "text",
							content: "￥",
						},
						{
							id: "money-text",
							type: "text",
							textBinding: "player.money",
						},
					],
				},
			],
		};

		this.modifierManager = new ModifierManager();
		this.buffManager = new BuffManager();
		this.commandBus = new CommandBus<PlayerCommandMap>(this.modifierManager);
		this.initCommandBus();

		const fullTypes = extraLibs ? `${GameProcessTypes}\n${extraLibs}` : GameProcessTypes;
		const codeCompiled = compileTsToJs(role.initCode, fullTypes);
		this.roleInitFunction = new Function(codeCompiled)();
	}

	public getInitRoleFunction() {
		return this.roleInitFunction;
	}

	private initCommandBus() {
		this.commandBus.setHandler("player.property.gain", (payload) => {
			const { property } = payload;
			const owner = property.owner;
			if (owner && owner.id === this.id) this.properties.push(property);
			return payload;
		});

		this.commandBus.setHandler("player.property.lose", (payload) => {
			const { property } = payload;
			const index = this.properties.findIndex((p) => p.id === property.id);
			if (index != -1) {
				this.properties.splice(index, 1);
			}
			return payload;
		});

		this.commandBus.setHandler("player.card.gain", (payload) => {
			const { card } = payload;
			if (this.chanceCards.length >= 4) return payload;
			this.chanceCards.push(card);
			return payload;
		});

		this.commandBus.setHandler("player.card.lose", (payload) => {
			const { cardId } = payload;
			let card = this.chanceCards.find((card) => card.getId() === cardId);
			if (!card) throw Error("玩家没有这张机会卡");
			const index = this.chanceCards.findIndex((_card) => _card.getId() === card.getId());
			if (index != -1) {
				this.chanceCards.splice(index, 1);
			}
			return payload;
		});

		this.commandBus.setHandler("player.money.gain", (payload) => {
			const { money } = payload;
			this.money += money;
			return payload;
		});

		this.commandBus.setHandler("player.money.lose", (payload) => {
			const { money } = payload;
			this.money -= money > 0 ? money : 0;
			if (this.money <= 0) this.setBankrupted(true);
			return payload;
		});

		this.commandBus.setHandler("player.stop", (payload) => {
			const { stop } = payload;
			this.stop = stop;
			return payload;
		});

		this.commandBus.setHandler("player.bankrupted.set", (payload) => {
			const { bankrupted } = payload;
			this.isBankrupted = bankrupted;
			return payload;
		});

		this.commandBus.setHandler("player.dice.add", (payload) => {
			const { newDice } = payload;
			this.dices.push(newDice);
			return { newDice };
		});

		this.commandBus.setHandler("player.dice.remove", (payload) => {
			const { diceId } = payload;
			const removeDice = this.dices.find((d) => d.id === diceId);
			if (removeDice) return { removeDice };
			else return { removeDice: undefined };
		});
	}

	//getter 和 setter
	public getUser() {
		return this.user;
	}

	public setIsOffline(isOffline: boolean) {
		this.isOffline = isOffline;
	}

	public async setCardsList(newChanceCardList: IChanceCard[]) {
		this.chanceCards = newChanceCardList;
	}

	public setPropertiesList(newPropertiesList: IProperty[]) {
		this.properties = newPropertiesList;
	}

	public async setMoney(money: number) {
		this.money = money;
		if (this.money <= 0) this.setBankrupted(true);
	}

	public async setStop(stop: number) {
		this.isStop = stop;
	}

	public setPositionIndex(newPositionIndex: number) {
		this.positionIndex = newPositionIndex;
	}

	public setBankrupted(isBankrupted: boolean) {
		this.isBankrupted = isBankrupted;
	}

	public getBuff(): Buff[] {
		return [
			...this.modifierManager.getBuffs(),
			...this.buffManager.getBuffs(),
		];
	}

	public getCardById(id: string) {
		const index = this.chanceCards.findIndex((card) => card.getId() === id);
		return this.chanceCards[index] || undefined;
	}

	public getRoundPhases() {
		return this.roundPhases;
	}

	public getPlayerInfo(): PlayerInfo {
		const userInfo = this.user;
		const playerInfo: PlayerInfo = {
			id: this.user.userId,
			user: userInfo,
			dices: this.dices.map((d) => d.getInfo()),
			money: this.money,
			properties: this.properties.map((property) => property.getPropertyInfo()),
			chanceCards: this.chanceCards.map((card) => card.getChanceCardInfo()),
			buff: this.getBuff(),
			positionIndex: this.positionIndex,
			stop: this.isStop,
			isBankrupted: this.isBankrupted,
			isOffline: this.isOffline,
			infoDisplay: this.infoDisplay,
			exportData: this.exportData,
		};
		return playerInfo;
	}

	//游戏Action
	public async gainProperty(property: IProperty) {
		await this.commandBus.execute({ type: "player.property.gain", payload: { property } });
	}

	public async loseProperty(property: IProperty) {
		await this.commandBus.execute({ type: "player.property.lose", payload: { property } });
	}

	public async gainCard(card: IChanceCard) {
		await this.commandBus.execute({ type: "player.card.gain", payload: { card } });
	}

	public async loseCard(cardId: string) {
		await this.commandBus.execute({ type: "player.card.lose", payload: { cardId } });
	}

	public async gain(money: number, tag?: MoneyTagType, source?: IPlayer) {
		return await this.commandBus.execute({ type: "player.money.gain", payload: { money, source, tag } });
	}

	public async cost(money: number, tag?: MoneyTagType, target?: IPlayer) {
		return await this.commandBus.execute({ type: "player.money.lose", payload: { money, target, tag } });
	}

	public async bankrupted(isBankrupted: boolean) {
		await this.commandBus.execute({ type: "player.bankrupted.set", payload: { bankrupted: isBankrupted } });
	}

	public async walk(steps: number): Promise<void> {
		await this.commandBus.execute({ type: "player.walk", payload: { steps } });
	}

	public async tp(positionIndex: number): Promise<void> {
		await this.commandBus.execute({ type: "player.tp", payload: { positionIndex } });
	}

	public async rollDices(): Promise<DiceResult[]> {
		return (await this.commandBus.execute({ type: "player.dice.roll", payload: { dices: clone(this.dices) } }))
			.diceResult;
	}

	public async addDice(diceValue?: number[]) {
		return (await this.commandBus.execute({ type: "player.dice.add", payload: { newDice: new Dice(diceValue) } }))
			.newDice;
	}

	public async removeDice(id: string) {
		return (await this.commandBus.execute({ type: "player.dice.remove", payload: { diceId: id } })).removeDice;
	}
}
