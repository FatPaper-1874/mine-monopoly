import { OperateType, PlayerOperationResult } from "@mine-monopoly/types";

type OperateListenerItem = {
	isOnce: boolean;
	fn: Function;
};

type EventMap = Map<OperateType, OperateListenerItem[]>;

export class OperateListener {
	private evetnMap: Map<string, EventMap> = new Map();

	constructor() {}

	private setOperateListener<T extends OperateType>(
		playerId: string,
		eventType: T,
		fn: (args: PlayerOperationResult[T]) => void,
		isOnce: boolean,
	) {
		if (!this.evetnMap.has(playerId)) {
			this.evetnMap.set(playerId, new Map());
		}
		const eventTypeMap = this.evetnMap.get(playerId) as EventMap;
		if (!eventTypeMap!.has(eventType)) {
			eventTypeMap.set(eventType, []);
		}
		const eventList = eventTypeMap.get(eventType) as OperateListenerItem[];
		eventList.push({ isOnce, fn });
	}

	public onAsync<T extends OperateType>(playerId: string, eventType: T): Promise<PlayerOperationResult[T]> {
		return new Promise((resolve) => {
			this.setOperateListener(playerId, eventType, resolve, false);
		});
	}

	public onceAsync<T extends OperateType>(playerId: string, eventType: T): Promise<PlayerOperationResult[T]> {
		return new Promise((resolve) => {
			this.setOperateListener(playerId, eventType, resolve, true);
		});
	}

	public on<T extends OperateType>(playerId: string, eventType: T, listener: (res: PlayerOperationResult[T]) => void) {
		this.setOperateListener(playerId, eventType, listener, false);
	}

	public once<T extends OperateType>(
		playerId: string,
		eventType: T,
		listener: (res: PlayerOperationResult[T]) => void,
	) {
		this.setOperateListener(playerId, eventType, listener, true);
	}

	public remove<T extends OperateType>(
		playerId: string,
		eventType: T,
		listener: (...args: any[]) => PlayerOperationResult[T],
	) {
		const playerEvents = this.evetnMap.get(playerId);
		if (!playerEvents) return;
		const eventTypeMap = playerEvents.get(eventType);
		if (!eventTypeMap) return;
		const removeIndex = eventTypeMap.findIndex((fobj) => fobj.fn === listener);
		eventTypeMap.splice(removeIndex, 1);
	}

	public removeAll(playerId: string, eventType?: OperateType) {
		const playerEvents = this.evetnMap.get(playerId);
		if (!playerEvents) return;
		if (eventType) {
			playerEvents.delete(eventType);
		} else {
			this.evetnMap.delete(playerId);
		}
	}

	public emit<T extends OperateType>(playerId: string, eventType: T, args?: PlayerOperationResult[T]): boolean {
		const playerEvents = this.evetnMap.get(playerId);
		if (!playerEvents) return false;
		const eventTypeMap = playerEvents.get(eventType);
		if (!eventTypeMap) return false;
		for (let index = 0; index < eventTypeMap.length; index++) {
			const fobj = eventTypeMap[index];
			fobj.fn.apply(null, [args]);
			if (fobj.isOnce) {
				eventTypeMap.splice(index, 1);
				index--;
			}
		}
		return true;
	}
}
