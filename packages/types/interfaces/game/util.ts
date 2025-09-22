export interface IRoundTimeTimer {
	start(callback: Function | null, timeS?: number): Promise<void>;
	nextTick(): void;
	pause(): void;
	resume(): void;
	stop(): void;
	setTimeOutFunction(newFunction: Function | null): Promise<void>;
	setIntervalFunction(countDownCallback: (remainingTime: number) => void): void;
	clearInterval(): void;
	destroy(): void;
}

export interface IDice {
	/** 获取骰子点数总和 */
	getResultNumber(): number;
	/** 获取所有骰子的结果数组 */
	getResultArray(): number[];
	/** 掷骰子 */
	roll(): void;
}
