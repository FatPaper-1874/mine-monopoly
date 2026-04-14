import { Buff } from "../game-process";

/**
 * Buff 管理器接口
 * 管理独立于修饰器系统的 Buff（纯展示或自定义生命周期）
 */
export interface IBuffManager {
	/**
	 * 添加独立 Buff
	 */
	addBuff(buff: Buff): void;

	/**
	 * 更新指定 Buff 的字段
	 * @returns 是否更新成功（Buff 不存在时返回 false）
	 */
	updateBuff(id: string, fields: Partial<Buff>): boolean;

	/**
	 * 根据 ID 移除 Buff
	 * @returns 是否移除成功
	 */
	removeBuff(id: string): boolean;

	/**
	 * 按标签移除 Buff
	 */
	removeByTag(tag: string): void;

	/**
	 * 检查是否存在指定标签的 Buff
	 */
	hasBuffWithTag(tag: string): boolean;

	/**
	 * 获取所有独立 Buff 列表
	 */
	getBuffs(): Buff[];

	/**
	 * 清空所有独立 Buff
	 */
	clear(): void;
}
