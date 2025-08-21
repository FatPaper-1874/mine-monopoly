export class RoundTimeTimer {
	private roundTime: number;
	private intervalMs: number = 1000;
	private intervalTimer: any;
	private timeOutFunction: Function | null = null;
	private remainingTime: number = 0;
	private intervalFunction: ((remainingTime: number) => void) | null = null;
	private isPause = false;

	constructor(roundTime: number, intervalMs = 1000) {
		this.roundTime = roundTime;
		this.intervalMs = intervalMs;
		this.remainingTime = roundTime;
	}

	public async start(callback: Function | null, timeS: number = this.roundTime): Promise<void> {
		this.remainingTime = timeS * 1000;
		if (callback) this.timeOutFunction = callback;
		this.clearInterval();
		return new Promise((resolve) => {
			this.intervalTimer = setInterval(() => {
				if (!this.isPause) this.runIntervalFunction();
				if (this.remainingTime <= 0) {
					this.runTimeOutFunction();
					this.clearInterval();
					resolve();
				}
				if (!this.isPause) this.remainingTime -= this.intervalMs;
			}, this.intervalMs);
		});
	}

	public nextTick() {}

	public pause() {
		this.isPause = true;
	}

	public resume() {
		this.isPause = false;
	}

	public stop() {
		this.clearInterval();
	}

	public async setTimeOutFunction(newFunction: Function | null) {
		this.intervalFunction && this.setIntervalFunction(this.intervalFunction);
		await this.start(newFunction);
	}

	public setIntervalFunction(countDownCallback: (remainingTime: number) => void | null) {
		this.intervalFunction = countDownCallback;
		// this.clearInterval();
		// if (!this.isPause) {
		// 	this.intervalTimer = setInterval(() => {
		// 		this.runIntervalFunction();
		// 	}, this.intervalMs);
		// }
	}

	private runIntervalFunction() {
		this.intervalFunction && this.intervalFunction(Math.round(this.remainingTime / 1000));
	}

	private runTimeOutFunction() {
		if (!this.timeOutFunction) return;
		this.timeOutFunction();
	}

	public clearInterval() {
		if (this.intervalTimer) {
			clearInterval(this.intervalTimer);
			this.intervalTimer = null;
		}
	}

	public destroy() {
		this.clearInterval();
	}
}
