import { UserInRoomInfo } from "@src/interfaces/bace";
import { Buff, PlayerInfo } from "@src/interfaces/game";
import { PlayerEvents } from "../enums/game";
import { ChanceCardInterface, PlayerEventsCallback, PlayerInterface, PropertyInterface } from "../interfaces/game";
import { randomString } from "@src/utils";

type CallbackMapValue<E extends PlayerEvents> = {
	id: string;
	fn: PlayerEventsCallback[E]; // 根据 PlayerEvents 类型映射到具体的回调函数类型
	triggerTimes: number;
	buff?: Buff;
};

export class Player implements PlayerInterface {
	private user: UserInRoomInfo;
	private money: number;
	private properties: PropertyInterface[] = [];
	private chanceCards: ChanceCardInterface[] = [];
	private buff: Buff[] = [];
	private positionIndex: number; //所在棋盘格子的下标
	private isStop: number; //是否停止回合
	private isBankrupted: boolean = false; //是否破产
	private isOffline: boolean; //是否断线
	public extras: Record<string, any> = {};

	private callBackMap: Map<PlayerEvents, CallbackMapValue<PlayerEvents>[]> = new Map();

	constructor(user: UserInRoomInfo, initMoney: number, initPositionIndex: number) {
		this.user = user;
		this.money = initMoney;
		this.positionIndex = initPositionIndex;
		this.isStop = 0;
		this.isOffline = false;
	}

	//玩家信息相关
	public getUser = () => this.user;

	public getId = () => this.user.userId;

	public getName = () => this.user.username;

	public getIsOffline = () => this.isOffline;

	public setIsOffline = (isOffline: boolean) => (this.isOffline = isOffline);

	//地产相关
	public getPropertiesList = () => {
		this.emit(PlayerEvents.GetPropertiesList);
		return this.properties;
	};
	public setPropertiesList = async (newPropertiesList: PropertyInterface[]) => {
		newPropertiesList = (await this.emit(PlayerEvents.BeforeSetPropertiesList, newPropertiesList)) || newPropertiesList;
		this.properties = newPropertiesList;
		this.emit(PlayerEvents.AfterSetPropertiesList, newPropertiesList);
	};

	public gainProperty = async (property: PropertyInterface) => {
		await this.emit(PlayerEvents.BeforeGainProperty, property);
		const owner = property.getOwner();
		if (owner && owner.getId() === this.getId()) this.properties.push(property);
		await this.emit(PlayerEvents.AfterGainProperty, property);
	};

	public loseProperty = async (lostProperty: PropertyInterface) => {
		await this.emit(PlayerEvents.BeforeLoseProperty, lostProperty);
		const index = this.properties.findIndex((property) => property.getId() === lostProperty.getId());
		if (index != -1) {
			this.properties.splice(index, 1);
		}
		await this.emit(PlayerEvents.AfterLoseProperty, lostProperty);
	};

	//机会卡相关
	public getCardsList = () => {
		this.emit(PlayerEvents.GetCardsList);
		return this.chanceCards;
	};

	public setCardsList = async (newChanceCardList: ChanceCardInterface[]) => {
		newChanceCardList = (await this.emit(PlayerEvents.BeforeSetCardsList, newChanceCardList)) || newChanceCardList;
		this.chanceCards = newChanceCardList;
		await this.emit(PlayerEvents.AfterSetCardsList, newChanceCardList);
	};

	public gainCard = async (gainCard: ChanceCardInterface) => {
		if (this.chanceCards.length >= 4) return;
		gainCard = (await this.emit(PlayerEvents.BeforeGainCard, gainCard)) || gainCard;
		this.chanceCards.push(gainCard);
		await this.emit(PlayerEvents.AfterGainCard, gainCard);
	};

	public loseCard = async (cardId: string) => {
		let card = this.chanceCards.find((card) => card.getId() === cardId);
		if (!card) return;
		card = (await this.emit(PlayerEvents.BeforeLoseCard, card)) || card;
		const index = this.chanceCards.findIndex((_card) => _card.getId() === card.getId());
		if (index != -1) {
			this.chanceCards.splice(index, 1);
		}
		await this.emit(PlayerEvents.AfterLoseCard, card);
	};

	//钱相关
	public getMoney = () => {
		this.emit(PlayerEvents.GetMoney);
		return this.money;
	};

	public setMoney = async (money: number) => {
		money = (await this.emit(PlayerEvents.BeforeSetMoney, money)) || money;
		this.money = money;
		await this.emit(PlayerEvents.AfterSetMoney, money);
		if (this.money <= 0) this.setBankrupted(true);
	};

	public async cost(money: number, target?: PlayerInterface) {
		money = (await this.emit(PlayerEvents.BeforeCost, money, target)) || money;
		this.money -= money > 0 ? money : 0;
		await this.emit(PlayerEvents.AfterCost, money, target);
		if (this.money <= 0) this.setBankrupted(true);
		return this.money > 0;
	}

	public async gain(money: number, source?: PlayerInterface) {
		money = (await this.emit(PlayerEvents.BeforeGain, money, source)) || money;
		this.money += money;
		await this.emit(PlayerEvents.AfterGain, money, source);
		return this.money;
	}

	//游戏相关
	public setStop = async (stop: number) => {
		// this.emit(PlayerEvents.SetStop, stop);
		stop = (await this.emit(PlayerEvents.BeforeStop, stop)) || stop;
		this.isStop = stop;
		await this.emit(PlayerEvents.AfterStop, stop);
	};

	public getStop = () => {
		this.emit(PlayerEvents.GetStop);
		return this.isStop;
	};

	public setPositionIndex = (newPositionIndex: number) => {
		this.positionIndex = newPositionIndex;
	};

	public getPositionIndex = () => {
		return this.positionIndex;
	};

	public walk = async (step: number): Promise<void> => {
		step = (await this.emit(PlayerEvents.BeforeWalk, step)) || step;
		this.emit(PlayerEvents.Walk, step);
		return new Promise((resolve) => {
			this.addEventListener(
				PlayerEvents.AnimationFinished,
				async () => {
					await this.emit(PlayerEvents.AfterWalk, step);
					resolve();
				},
				1
			);
		});
	};

	public tp = async (positionIndex: number): Promise<void> => {
		positionIndex = (await this.emit(PlayerEvents.BeforeTp, positionIndex)) || positionIndex;
		this.emit(PlayerEvents.Tp, positionIndex);
		return new Promise((resolve) => {
			this.addEventListener(PlayerEvents.AnimationFinished, async () => {
				await this.emit(PlayerEvents.AfterTp, positionIndex);
				resolve();
			});
		});
	};

	public setBankrupted = async (isBankrupted: boolean) => {
		// this.emit(PlayerEvents.SetBankrupted, isBankrupted);
		const callback = await this.emit(PlayerEvents.BeforeSetBankrupted, isBankrupted);
		isBankrupted = callback === undefined ? isBankrupted : callback;
		this.isBankrupted = isBankrupted;
		await this.emit(PlayerEvents.AfterSetBankrupted, isBankrupted);
	};

	public getIsBankrupted = () => {
		this.emit(PlayerEvents.GetIsBankrupted);
		return this.isBankrupted;
	};

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
		const buffList = Array.from(this.callBackMap.values())
			.map((arr) => arr.map((o) => o.buff))
			.flat()
			.filter((item): item is Buff => item !== undefined);
		return buffList;
	}

	public getCardById = (id: string) => {
		const index = this.chanceCards.findIndex((card) => card.getId() === id);
		return this.chanceCards[index] || undefined;
	};

	public addEventListener<K extends PlayerEvents>(
		eventName: K,
		fn: PlayerEventsCallback[K],
		triggerTimes: number = Infinity,
		buff?: {
			id?: string;
			name: string;
			describe: string;
			source: string;
		}
	) {
		if (!this.callBackMap.has(eventName)) {
			this.callBackMap.set(eventName, []);
		}
		const fnArr = this.callBackMap.get(eventName);
		fnArr &&
			fnArr.unshift({
				id: randomString(16),
				fn,
				triggerTimes,
				buff: buff ? { id: buff.id || randomString(16), ...buff, type: eventName, triggerTimes } : undefined,
			});
	}

	public removeListener(eventName: PlayerEvents, id: string) {
		const fnArr = this.callBackMap.get(eventName);
		if (fnArr) {
			const removeIndex = fnArr.findIndex((fobj) => fobj.id === id);
			fnArr.splice(removeIndex, 1);
		}
	}

	public removeAllListeners(eventName?: PlayerEvents) {
		if (eventName) {
			if (this.callBackMap.has(eventName)) this.callBackMap.delete(eventName);
		} else {
			this.callBackMap.clear();
		}
	}

	public updateBuff(buffId: string, newBuff: Buff) {
		this.callBackMap.values().map((item) => {
			item.map((obj) => {
				if (obj.buff && obj.buff.id === buffId) obj.buff = newBuff;
			});
		});
	}

	public async emit<K extends keyof PlayerEventsCallback>(
		eventName: K,
		...args: Parameters<PlayerEventsCallback[K]>
	): Promise<ReturnType<PlayerEventsCallback[K]>> {
		const fnArr = this.callBackMap.get(eventName);
		let res: ReturnType<PlayerEventsCallback[K]> = undefined as unknown as ReturnType<PlayerEventsCallback[K]>;
		if (fnArr) {
			for (let index = 0; index < fnArr.length; index++) {
				const item = fnArr[index];

				item.triggerTimes--;
				if (item.triggerTimes >= 0) {
					const params = res !== undefined ? [res, ...args] : args;
					console.log("🚀 ~ Player ~ params:", params);
					res = await (
						item.fn as (...args: Parameters<PlayerEventsCallback[K]>) => ReturnType<PlayerEventsCallback[K]>
					)(...(params as Parameters<PlayerEventsCallback[K]>)); // 强制类型转换
					if (item.triggerTimes === 0) {
						fnArr.splice(index, 1);
						index--; // 防止跳过下一个元素
					}
				} else {
					fnArr.splice(index, 1);
					index--; // 防止跳过下一个元素
				}
				if (item.buff) {
					item.buff.triggerTimes = item.triggerTimes;
				}
			}
		}
		return res;
	}
}
