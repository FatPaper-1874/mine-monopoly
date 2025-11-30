import {
	Buff,
	GameContext,
	GamePhaseInfo,
	IChanceCard,
	ICommandBus,
	IGamePhase,
	IModifier,
	IModifierManager,
	IPlayer,
	IProperty,
	PlayerCommandMap,
	PlayerInfo,
	Role,
	UserInRoomInfo,
} from "@fatpaper-monopoly/types";
import { GamePhase } from "./GamePhase";
import { compileTsToJs, randomString } from "@src/utils";
import GameProcessTypes from "../editor-lib.d.ts?raw";
import { CommandBus } from "./action-system/CommandBus";
import { ModifierManager } from "./action-system/ModifiersManager";
import Dice from "./Dice";

export class Player implements IPlayer {
	public extras: Record<string, any> = {};
	public roundPhases: IGamePhase<GameContext>[] = [];
	public modifierManager: IModifierManager<PlayerCommandMap>;
	public commandBus: ICommandBus<PlayerCommandMap>;
	public dices: Dice[];

	private user: UserInRoomInfo;
	private money: number;
	private properties: IProperty[] = [];
	private chanceCards: IChanceCard[] = [];
	private positionIndex: number; //所在棋盘格子的下标
	private isStop: number; //是否停止回合
	private isBankrupted: boolean = false; //是否破产
	private isOffline: boolean; //是否断线
	private stop: number = 0;

	constructor(
		user: UserInRoomInfo,
		initMoney: number,
		initPositionIndex: number,
		roundPhasesInfo: GamePhaseInfo[],
		role: Role
	) {
		this.roundPhases = roundPhasesInfo.map((roundPhaseInfo) => {
			return new GamePhase(roundPhaseInfo);
		});
		this.user = user;
		this.money = initMoney;
		this.positionIndex = initPositionIndex;
		this.isStop = 0;
		this.isOffline = false;
		this.dices = [new Dice(), new Dice()];

		this.modifierManager = new ModifierManager();
		this.commandBus = new CommandBus<PlayerCommandMap>(this.modifierManager);
		this.initCommandBus();

		const codeCompiled = compileTsToJs(role.initCode, GameProcessTypes);
		const roleInitFunction = new Function(codeCompiled)();
		roleInitFunction(this);
	}

	private initCommandBus() {
		this.commandBus.setHandler("player.property.gain", (payload) => {
			const { property } = payload;
			const owner = property.getOwner();
			if (owner && owner.getId() === this.getId()) this.properties.push(property);
			return payload;
		});

		this.commandBus.setHandler("player.property.lose", (payload) => {
			const { property } = payload;
			const index = this.properties.findIndex((p) => p.getId() === property.getId());
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

		this.commandBus.setHandler("player.dice.roll", (payload) => {
			const { dices } = payload;
			return { diceResult: dices.map((d) => d.roll()) };
		});
	}

	//getter 和 setter
	public getUser() {
		return this.user;
	}

	public getId() {
		return this.user.userId;
	}

	public getName() {
		return this.user.username;
	}

	public getIsOffline() {
		return this.isOffline;
	}

	public setIsOffline(isOffline: boolean) {
		this.isOffline = isOffline;
	}

	public getCardsList() {
		return this.chanceCards;
	}

	public async setCardsList(newChanceCardList: IChanceCard[]) {
		this.chanceCards = newChanceCardList;
	}

	public getPropertiesList() {
		return this.properties;
	}
	public setPropertiesList(newPropertiesList: IProperty[]) {
		this.properties = newPropertiesList;
	}

	public getMoney() {
		return this.money;
	}

	public async setMoney(money: number) {
		this.money = money;
		if (this.money <= 0) this.setBankrupted(true);
	}

	public async setStop(stop: number) {
		this.isStop = stop;
	}

	public getStop() {
		return this.isStop;
	}

	public setPositionIndex(newPositionIndex: number) {
		this.positionIndex = newPositionIndex;
	}

	public getPositionIndex() {
		return this.positionIndex;
	}

	public setBankrupted(isBankrupted: boolean) {
		this.isBankrupted = isBankrupted;
	}

	public getIsBankrupted() {
		return this.isBankrupted;
	}

	public getBuff() {
		return this.modifierManager
			.getModifiersList()
			.filter((m) => m.descriptor.meta !== undefined)
			.map((m) => {
				const descriptor = m.descriptor;
				const meta = descriptor.meta!;
				const buff: Buff = {
					id: descriptor.id,
					name: meta.name,
					description: meta.description,
					source: meta.source,
					triggerTiming: meta.timingName,
					triggerTimes: descriptor.remainingTriggers,
				};
				return buff;
			});
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

	public async gain(money: number, source?: IPlayer) {
		await this.commandBus.execute({ type: "player.money.gain", payload: { money, source } });
	}

	public async cost(money: number, target?: IPlayer) {
		await this.commandBus.execute({ type: "player.money.lose", payload: { money, target } });
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

	public async rollDices(): Promise<number[]> {
		return (await this.commandBus.execute({ type: "player.dice.roll", payload: { dices: this.dices } })).diceResult;
	}

	public registerModifier(modifier: IModifier<PlayerCommandMap>) {
		this.modifierManager.add(modifier);
	}
}
