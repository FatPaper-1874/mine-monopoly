import { Buff, BuffDisplay } from "../game-process";
import { ICommandMap, ICommand, ICommandContext } from "./command";

export type { BuffDisplay } from "../game-process";

/**
 * 修饰器触发时机
 * - "before": 在命令执行前触发
 * - "after": 在命令执行后触发
 */
export type ModifierTiming = "before" | "after";

/**
 * 修饰器描述符
 * 描述修饰器的基本信息和触发条件
 * @template C - 命令映射类型
 * @template K - 命令类型的键
 */
export interface ModifierDescriptor<C extends ICommandMap, K extends keyof C = keyof C> {
	/** 修饰器唯一标识 */
	id: string;
	/** 触发时机（before/after） */
	timing: ModifierTiming;
	/** 要监听的命令类型 */
	commandType: K;
	/** 剩余触发次数（-1 表示无限） */
	remainingTriggers: number;
	/** 优先级（可选，数值越大优先级越高） */
	priority?: number;
	/** 是否自动消耗次数（默认 true，设为 false 则需要手动调用 consume） */
	autoConsume?: boolean;
	/** 可序列化的元数据（用于 UI 展示） */
	meta?: BuffDisplay;
}

/**
 * 修饰器接口
 * 用于在命令执行前后插入自定义逻辑（如 Buff、Debuff 系统）
 * @template C - 命令映射类型
 * @template K - 命令类型的键
 */
export interface IModifier<C extends ICommandMap, K extends keyof C = keyof C> {
	/** 修饰器描述符 */
	descriptor: ModifierDescriptor<C, K>;

	/**
	 * 修饰器执行函数
	 * @param command - 当前正在执行的命令
	 * @param context - 命令执行上下文
	 */
	fn(command: ICommand<C, K>, context: ICommandContext<C, K>): Promise<void> | void;
	/** 修饰器实例的上下文数据（创建时传入，运行时通过 ctx.modifierData 读取） */
	contextData?: Record<string, any>;
}

/**
 * 手动消耗修饰器次数的结果
 */
export interface ConsumeResult {
	/** 是否成功执行消耗操作 */
	success: boolean;
	/** 消耗后的剩余次数（如果修饰器不存在则为 null） */
	remainingTriggers: number | null;
	/** 是否因此次消耗而移除了修饰器 */
	removed: boolean;
	/** 修饰器 ID */
	modifierId: string;
}

/**
 * 修饰器添加选项
 */
export interface ModifierAddOptions {
	/** 修饰器结束时的回调函数 */
	onComplete?: () => void;

	/** 修饰器实例的上下文数据（运行时通过 ctx.modifierData 读取） */
	contextData?: Record<string, any>;
}

/**
 * 修饰器管理器接口
 * 管理修饰器的注册、移除、查询和执行
 * @template C - 命令映射类型
 * @template K - 命令类型的键
 */
export interface IModifierManager<C extends ICommandMap, K extends keyof C = keyof C> {
	/**
	 * 添加修饰器（基于模板对象）
	 * @param template - 模板对象，包含 descriptor、effectCode 和可选 slug
	 * @param onComplete - 修饰器结束时的回调函数（可选）
	 * @returns 生成的修饰器 ID
	 */
	add(template: ModifierTemplate, onComplete?: () => void): string;
	/**
	 * 添加修饰器（基于模板对象，带选项）
	 * @param template - 模板对象
	 * @param options - 添加选项（包含 onComplete 回调和 contextData 上下文数据）
	 * @returns 生成的修饰器 ID
	 */
	add(template: ModifierTemplate, options?: ModifierAddOptions): string;

	/**
	 * 根据 ID 移除修饰器
	 * @param id - 修饰器 ID
	 * @returns 是否成功移除
	 */
	removeById(id: string): boolean;

	/**
	 * 清空所有修饰器
	 */
	clear(): void;

	/**
	 * 按标签移除修饰器（如：净化逻辑）
	 * @param tag - 要移除的标签
	 */
	removeByTag(tag: string): void;

	/**
	 * 检查是否存在指定标签的 Buff
	 * @param tag - 标签
	 * @returns 是否存在
	 */
	hasBuffWithTag(tag: string): boolean;

	/**
	 * 获取可序列化的 Buff 列表
	 * @returns Buff 数组
	 */
	getBuffs(): Buff[];

	/**
	 * 获取所有修饰器列表
	 * @returns 修饰器数组
	 */
	getModifiersList(): IModifier<C, K>[];

	/**
	 * 获取指定命令和时机的修饰器
	 * @param cmd - 命令对象
	 * @param timing - 触发时机
	 * @returns 匹配的修饰器数组
	 */
	getFor(cmd: ICommand<C, K>, timing: ModifierTiming): IModifier<C, K>[];

	/**
	 * 在修饰器执行后衰减触发次数
	 * @param ids - 已执行的修饰器 ID 列表
	 * @param customConsumptions - 自定义消耗次数映射（可选）
	 */
	decayAfterExecution(
		ids: string[],
		customConsumptions?: Map<string, number>
	): void;

	/**
	 * 手动消耗修饰器次数
	 * @param id - 修饰器 ID
	 * @param amount - 要消耗的次数（必须大于 0）
	 * @returns 消耗结果
	 */
	consume(id: string, amount: number): ConsumeResult;

	/**
	 * 导出修饰器快照用于存档序列化
	 */
	getSerializableModifiers(): ModifierSnapshot[];

	/**
	 * 从快照恢复修饰器
	 * @param snaps - 修饰器快照列表
	 * @param mapData - 当前地图数据，用于按 slug 恢复模板
	 */
	restoreModifiers(snaps: ModifierSnapshot[], mapData: any): void;
}

/** Modifier 模板 — 在地图编辑器中管理，运行时通过变量注入适配存档恢复 */
export interface ModifierTemplate {
	/** 唯一 ID */
	id: string;
	/** 标识，用于生成 $mod__slug 调用令牌 */
	slug: string;
	/** 显示名称 */
	name: string;
	/** 描述符配置 */
	descriptor: {
		timing: "before" | "after";
		commandType: string;
		remainingTriggers: number;
		priority: number;
		autoConsume: boolean;
		meta?: {
			name: string;
			description: string;
			source?: string;
			triggerTiming?: string;
			tags?: string[];
		};
	};
	/** 代码字符串，签名 (player, gameProcess, cmd, ctx) => { ... } */
	effectCode: string;
}

/** 存档中 modifier 的快照 — 引用模板 slug + 运行时状态 */
export interface ModifierSnapshot {
	/** 模板 slug */
	templateSlug: string;

	/** 恢复后的剩余触发次数 */
	remainingTriggers: number;

	/** 修饰器实例的上下文数据快照 */
	contextData?: Record<string, any>;
}
