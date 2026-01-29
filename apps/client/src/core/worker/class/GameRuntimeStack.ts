import { GameContext, GameEvent, IGameProcess, IGameRuntimeStack } from "@mine-monopoly/types";

export class GameRuntimeStack implements IGameRuntimeStack<GameContext> {
	public stack: GameEvent<GameContext>[] = [];
	public isRunning: boolean = false;

	constructor() {}

	async run(context: GameContext = {}, gameProcess: IGameProcess) {
		if (this.isRunning) return;
		this.isRunning = true;
		while (!this.isEmpty()) {
			const gameEvent = this.stack.pop();
			if (!gameEvent) break;
			await gameEvent.fn(context, gameProcess);
		}
		this.isRunning = false;
	}

	isEmpty() {
		return this.stack.length === 0;
	}

	pop(): GameEvent<GameContext> | undefined {
		return this.stack.pop();
	}

	push(...gameEvents: GameEvent<GameContext>[]): void {
		this.stack.push(...gameEvents);
	}
}
