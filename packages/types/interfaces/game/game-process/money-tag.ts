/**
 * 金钱流动标签类型
 * 用于标识金钱流动的途径，供修饰器系统识别和处理
 */
export type MoneyTag = typeof MoneyTag[keyof typeof MoneyTag] | string;

/**
 * 金钱流动标签常量
 * 预定义的金钱流动途径标识
 */
export const MoneyTag = {
	/** 系统默认操作 */
	SYSTEM: 'system',
	PLAYER: 'player',
	CARD: "card",
} as const;
