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

export interface IDice extends DiceInfo {
	setProphecy(prophecy: number | undefined): void;
	setValues(values: number[]): void;
	roll(): DiceResult;
	getInfo(): DiceInfo;
}

export interface DiceInfo {
	id: string;
	prophecy: number | undefined;
	diceValues: number[];
}

export interface DiceResult {
	diceValues: number[];
	result: number;
	prophecy: number | undefined;
}

export type ComponentType = "number-input" | "select";

export interface SelectOption {
	label: string;
	value: string | number;
}

export interface FormSchema {
	id: string; // 内部使用的唯一ID (UUID)
	key: string; // 提交给后端的字段名 (例如 'age', 'role_id')
	type: ComponentType; // 组件类型
	label: string; // 标题
	placeholder?: string;

	// 默认值：可能是数字(输入框)或字符串/数字(下拉框)
	defaultValue?: number | string;

	// 仅 select 有效
	options?: SelectOption[];
}
