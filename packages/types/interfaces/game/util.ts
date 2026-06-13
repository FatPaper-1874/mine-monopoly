/**
 * 骰子接口
 */
export interface IDice extends DiceInfo {
	/**
	 * 设置预言值（作弊值）
	 * @param prophecy - 预言值（undefined 表示取消）
	 */
	setProphecy(prophecy: number | undefined): void;

	/**
	 * 设置骰子值（用于初始化或调试）
	 * @param values - 骰子值列表
	 */
	setValues(values: number[]): void;

	/**
	 * 掷骰子
	 * @returns 骰子结果
	 */
	roll(): DiceResult;

	/**
	 * 获取骰子信息
	 * @returns 骰子信息
	 */
	getInfo(): DiceInfo;
}

/**
 * 骰子信息接口
 * 用于序列化和传输骰子状态
 */
export interface DiceInfo {
	/** 骰子唯一标识 */
	id: string;

	/** 预言值（作弊值，undefined 表示无预言） */
	prophecy: number | undefined;

	/** 骰子面值列表 */
	diceValues: number[];
}

/**
 * 骰子结果接口
 * 表示一次掷骰子的结果
 */
export interface DiceResult {
	/** 骰子面值列表 */
	diceValues: number[];

	/** 掷骰子结果（总和） */
	result: number;

	/** 预言值（如果有） */
	prophecy: number | undefined;
}

/**
 * 表单组件类型
 */
export type ComponentType = "number-input" | "select";

/**
 * 下拉选项接口
 */
export interface SelectOption {
	/** 选项标签 */
	label: string;

	/** 选项值 */
	value: string | number;
}

/**
 * 表单 Schema 接口
 * 用于动态生成游戏设置表单
 */
export interface FormSchema {
	/** 内部使用的唯一 ID（UUID） */
	id: string;

	/** 提交给后端的字段名（例如 'age', 'role_id'） */
	key: string;

	/** 组件类型 */
	type: ComponentType;

	/** 标题 */
	label: string;

	/** 是否为内置参数（不可删除） */
	builtIn?: boolean;

	/** 占位符文本（可选） */
	placeholder?: string;

	/**
	 * 默认值
	 * 可能是数字（输入框）或字符串/数字（下拉框）
	 */
	defaultValue?: number | string;

	/** 下拉选项（仅 select 有效） */
	options?: SelectOption[];

	/** 最小值（仅 number-input 有效） */
	min?: number;

	/** 最大值（仅 number-input 有效） */
	max?: number;
}
