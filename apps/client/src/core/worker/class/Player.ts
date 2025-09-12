import {
	Buff,
	GameContext,
	GamePhaseInfo,
	IChanceCard,
	IGamePhase,
	IPlayer,
	IProperty,
	PlayerInfo,
	UserInRoomInfo,
} from "@fatpaper-monopoly/types";
import { GamePhase } from "./GamePhase";

export class Player implements IPlayer {
	public extras: Record<string, any> = {};
	public roundPhases: IGamePhase<GameContext>[] = [];

	private user: UserInRoomInfo;
	private money: number;
	private properties: IProperty[] = [];
	private chanceCards: IChanceCard[] = [];
	private buff: Buff[] = [];
	private positionIndex: number; //所在棋盘格子的下标
	private isStop: number; //是否停止回合
	private isBankrupted: boolean = false; //是否破产
	private isOffline: boolean; //是否断线
	private stop: number = 0;

	constructor(user: UserInRoomInfo, initMoney: number, initPositionIndex: number, roundPhasesInfo: GamePhaseInfo[]) {
		this.roundPhases = roundPhasesInfo.map((roundPhaseInfo) => {
			return new GamePhase(roundPhaseInfo);
		});
		this.user = user;
		this.money = initMoney;
		this.positionIndex = initPositionIndex;
		this.isStop = 0;
		this.isOffline = false;
	}

	//玩家信息相关
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

	//地产相关
	public getPropertiesList() {
		return this.properties;
	}
	public setPropertiesList(newPropertiesList: IProperty[]) {
		this.properties = newPropertiesList;
	}

	public gainProperty(property: IProperty) {
		const owner = property.getOwner();
		if (owner && owner.getId() === this.getId()) this.properties.push(property);
	}

	public loseProperty(lostProperty: IProperty) {
		const index = this.properties.findIndex((property) => property.getId() === lostProperty.getId());
		if (index != -1) {
			this.properties.splice(index, 1);
		}
	}

	//机会卡相关
	public getCardsList() {
		return this.chanceCards;
	}

	public async setCardsList(newChanceCardList: IChanceCard[]) {
		this.chanceCards = newChanceCardList;
	}

	public async gainCard(gainCard: IChanceCard) {
		if (this.chanceCards.length >= 4) return;
		this.chanceCards.push(gainCard);
	}

	public async loseCard(cardId: string) {
		let card = this.chanceCards.find((card) => card.getId() === cardId);
		if (!card) return;
		const index = this.chanceCards.findIndex((_card) => _card.getId() === card.getId());
		if (index != -1) {
			this.chanceCards.splice(index, 1);
		}
	}

	//钱相关
	public getMoney() {
		return this.money;
	}

	public async setMoney(money: number) {
		this.money = money;
		if (this.money <= 0) this.setBankrupted(true);
	}

	public cost(money: number, target?: IPlayer) {
		this.money -= money > 0 ? money : 0;
		if (this.money <= 0) this.setBankrupted(true);
		return this.money > 0;
	}

	public gain(money: number, source?: IPlayer) {
		this.money += money;
		return this.money;
	}

	//游戏相关
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

	public async walk(step: number): Promise<void> {}

	public async tp(step: number): Promise<void> {}

	public async setBankrupted(isBankrupted: boolean) {
		this.isBankrupted = isBankrupted;
	}

	public getIsBankrupted() {
		return this.isBankrupted;
	}

	public getPlayerInfo(): PlayerInfo {
		const userInfo = this.user;
		const playerInfo: PlayerInfo = {
			id: this.user.userId,
			user: userInfo,
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

	public getBuff() {
		return [];
	}

	public getCardById(id: string) {
		const index = this.chanceCards.findIndex((card) => card.getId() === id);
		return this.chanceCards[index] || undefined;
	}

	public updateBuff(buffId: string, newBuff: Buff) {}
}
