import { Buff } from "../game-process";
import { ICommandMap, ICommand, ICommandContext } from "./command";

export type ModifierTiming = "before" | "after";

export type ModifierMeta = {
	name: string;
	timingName: string;
	description: string;
	source: string;
	tags?: string[];
};

export interface ModifierDescriptor<C extends ICommandMap, K extends keyof C = keyof C> {
	id: string;
	timing: ModifierTiming;
	commandType: K;
	remainingTriggers: number;
	priority?: number;
	// 可序列化的信息用于给玩家 UI 展示
	meta?: ModifierMeta;
}

export interface IModifier<C extends ICommandMap, K extends keyof C = keyof C> {
	descriptor: ModifierDescriptor<C, K>;
	fn(command: ICommand<C, K>, context: ICommandContext<C, K>): Promise<void> | void;
}

export interface IModifierManager<C extends ICommandMap, K extends keyof C = keyof C> {
	// 基础增删改
	add(mod: IModifier<C, K>): string; // 修改返回值：返回生成的 ID
	removeById(id: string): boolean;
	clear(): void;

	// === 新增：逻辑操作 ===
	// 按标签移除 (如：cleanse 净化逻辑)
	removeByTag(tag: string): void;
	// 状态查询 (如：是否无敌)
	hasBuffWithTag(tag: string): boolean;

	// === 新增：数据快照 ===
	// 获取可序列化的 Buff 列表
	getBuffs(): Buff[];

	// 核心运行逻辑
	getModifiersList(): IModifier<C, K>[];
	getFor(cmd: ICommand<C, K>, timing: ModifierTiming): IModifier<C, K>[];
	decayAfterExecution(ids: string[]): void;
}
