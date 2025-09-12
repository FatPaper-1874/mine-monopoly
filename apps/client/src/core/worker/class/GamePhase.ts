import {
	EventTiggerTime,
	GameContext,
	GameEvent,
	GamePhaseInfo,
	GamePhaseMark,
	IGamePhase,
} from "@fatpaper-monopoly/types";
import { createAsyncFunction } from "@src/utils/function";

export class GamePhase implements IGamePhase<GameContext> {
	public id: string;
	public name: string;
	public description: string;
	public mark?: GamePhaseMark | undefined;
	public from: string;
	public initEventCode: string;

	public eventQueue: GameEvent<GameContext>[] = [];

	constructor(gamePhaseInfo: GamePhaseInfo) {
		this.id = gamePhaseInfo.id;
		this.name = gamePhaseInfo.name;
		this.description = gamePhaseInfo.description;
		this.mark = gamePhaseInfo.mark;
		this.from = gamePhaseInfo.from;
		this.initEventCode = gamePhaseInfo.initEventCode;
	}

	use(tiggerTime: EventTiggerTime, fnCode: string): void {
		const fn = createAsyncFunction(fnCode);
		console.log("🚀 ~ GamePhase ~ use ~ fn:", fn)
	}

	getEventQueue(): GameEvent<GameContext>[] {
		return this.eventQueue;
	}
}
