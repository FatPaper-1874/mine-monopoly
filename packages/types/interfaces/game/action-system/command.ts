/**
 * 单个命令的类型定义
 */
export type ICommandType<P = unknown, R = unknown> = {
	/** 命令负载数据类型 */
	payload: P;
	/** 命令执行结果类型 */
	result: R;
};

/**
 * 命令接口，用于封装命令类型和负载数据
 * @template C - 命令映射类型
 * @template K - 命令类型的键
 */
export type ICommand<C extends ICommandMap, K extends keyof C> = {
	/** 命令类型 */
	type: K;
	/** 命令负载数据 */
	payload: C[K] extends ICommandType<infer P, any> ? P : never;
};

/**
 * 命令执行上下文接口
 * 用于在命令执行过程中传递状态和控制执行流程
 * @template C - 命令映射类型
 * @template K - 命令类型的键
 */
export interface ICommandContext<C extends ICommandMap, K extends keyof C> {
	/** 当前正在执行的修饰器实例 ID（仅在修饰器 effectCode 执行期间可用） */
	modifierId?: string;

	/**
	 * 取消命令执行
	 * @param result - 命令取消后的返回值（必须提供）
	 */
	cancel(result: C[K] extends ICommandType<any, infer R> ? R : never): void;
	/** 设置命令执行结果 */
	setResult(result: C[K] extends ICommandType<any, infer R> ? R : never): void;
	/** 命令执行结果（可选） */
	result?: C[K] extends ICommandType<any, infer R> ? R : never;

	/**
	 * 跳过当前修饰器的触发次数消耗
	 * 调用后，本次修饰器执行不会减少 remainingTriggers
	 */
	skip(): void;

	/**
	 * 自定义当前修饰器的触发次数消耗
	 * @param count - 消耗的次数（必须为非负整数）
	 */
	consume(count: number): void;
}

/**
 * 命令总线接口
 * 负责注册命令处理器和执行命令，支持修饰器系统
 * @template C - 命令映射类型
 */
export interface ICommandBus<C extends ICommandMap> {
	/**
	 * 执行命令
	 * @param command - 要执行的命令
	 * @returns 命令执行结果
	 */
	execute<K extends keyof C>(command: ICommand<C, K>): Promise<C[K] extends ICommandType<any, infer R> ? R : never>;

	/**
	 * 设置命令处理器
	 * @param type - 命令类型
	 * @param handler - 命令处理函数
	 */
	setHandler<K extends keyof C>(
		type: K,
		handler: (payload: C[K] extends ICommandType<infer P, any> ? P : never) => (C[K] extends ICommandType<any, infer R> ? R : never) | Promise<C[K] extends ICommandType<any, infer R> ? R : never>
	): void;
}

/**
 * 命令映射接口
 * 定义所有命令的负载（payload）和结果（result）类型
 * 用作命令总线的类型约束
 *
 * 具体命令映射（如 PlayerCommandMap、PropertyCommandMap）应继承此接口并定义具体命令类型。
 */
export interface ICommandMap {}
