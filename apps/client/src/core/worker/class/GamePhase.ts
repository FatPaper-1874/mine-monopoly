import {
	GameContext,
	GameEvent,
	GameEventFunction,
	GamePhaseInfo,
	GamePhaseMark,
	IGamePhase,
	ModifierTiming,
} from "@mine-monopoly/types";
import { compileTsToJs } from "@src/utils";
import GameProcessTypes from "../editor-lib.d.ts?raw";

export class GamePhase implements IGamePhase<GameContext> {
	public id: string;
	public name: string;
	public description: string;
	public mark?: GamePhaseMark | undefined;
	public from: string;
	public initEventCode: string;
	public eventKey: string | undefined;

	public eventQueue: GameEvent<GameContext>[] = [];

	constructor(gamePhaseInfo: GamePhaseInfo, eventKey?: string, extraLibs?: string) {
		this.id = gamePhaseInfo.id;
		this.name = gamePhaseInfo.name;
		this.description = gamePhaseInfo.description;
		this.mark = gamePhaseInfo.mark;
		this.from = gamePhaseInfo.from;
		this.initEventCode = gamePhaseInfo.initEventCode;
		this.eventKey = eventKey;
		const fullTypes = extraLibs ? `${GameProcessTypes}\n${extraLibs}` : GameProcessTypes;
		const codeCompiled = compileTsToJs(this.initEventCode, fullTypes);
		const gameEventGenerator = new Function(codeCompiled);
		const gameEvent: GameEvent<GameContext> = {
			fn: gameEventGenerator(),
			key: eventKey,
		};
		this.eventQueue.push(gameEvent);
	}

	use(tiggerTime: ModifierTiming, gameEventFn: GameEventFunction<GameContext>, key?: string): void {
		if (tiggerTime === "after") {
			this.eventQueue.push({ fn: gameEventFn, key });
		} else {
			this.eventQueue.unshift({ fn: gameEventFn, key });
		}
	}

	getEventQueue(): GameEvent<GameContext>[] {
		return this.eventQueue.concat().map((gameEvent) => {
			gameEvent.key = this.mark + "";
			return gameEvent;
		});
	}
}
