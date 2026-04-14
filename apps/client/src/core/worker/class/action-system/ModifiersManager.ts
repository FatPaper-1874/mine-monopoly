import { Buff, ICommand, ICommandMap, IModifier, IModifierManager, ModifierTiming, ConsumeResult } from "@mine-monopoly/types";
import { clone, cloneDeep } from "lodash";

export class ModifierManager<C extends ICommandMap, K extends keyof C = keyof C> implements IModifierManager<C> {
	private modifiers = new Map<string, IModifier<C, any>>();
	private completionCallbacks = new Map<string, () => void>();

	public add<KK extends keyof C>(mod: IModifier<C, KK>, onComplete?: () => void): string {
		const modClone = cloneDeep(mod);

		const id = modClone.descriptor.id;
		const existingMod = this.modifiers.get(id);

		if (existingMod) {
			const currentCount = existingMod.descriptor.remainingTriggers;
			const addCount = modClone.descriptor.remainingTriggers; // 使用副本的数值
			const isInfinite = (val: number) => val === -1 || val === Infinity;

			if (isInfinite(currentCount) || isInfinite(addCount)) {
				existingMod.descriptor.remainingTriggers = -1;
			} else {
				existingMod.descriptor.remainingTriggers = currentCount + addCount;
			}

			// 如果提供了新的回调函数，更新回调
			if (onComplete) {
				this.completionCallbacks.set(id, onComplete);
			}

			return id;
		}

		this.modifiers.set(id, modClone);

		// 存储完成回调
		if (onComplete) {
			this.completionCallbacks.set(id, onComplete);
		}

		return id;
	}

	public removeById(id: string): boolean {
		const removed = this.modifiers.delete(id);

		if (removed) {
			// 触发完成回调
			const callback = this.completionCallbacks.get(id);
			if (callback) {
				try {
					callback();
				} catch (error) {
					console.error(`Error executing completion callback for modifier ${id}:`, error);
				}
				this.completionCallbacks.delete(id);
			}
		}

		return removed;
	}

	public removeByTag(tag: string): void {
		// 遍历 Map 进行删除
		for (const [id, mod] of this.modifiers) {
			if (mod.descriptor.meta?.tags?.includes(tag)) {
				this.modifiers.delete(id);

				// 触发完成回调
				const callback = this.completionCallbacks.get(id);
				if (callback) {
					try {
						callback();
					} catch (error) {
						console.error(`Error executing completion callback for modifier ${id}:`, error);
					}
					this.completionCallbacks.delete(id);
				}
			}
		}
	}

	public hasBuffWithTag(tag: string): boolean {
		for (const mod of this.modifiers.values()) {
			if (mod.descriptor.meta?.tags?.includes(tag)) {
				return true;
			}
		}
		return false;
	}

	public getFor(cmd: ICommand<C, K>, timing: ModifierTiming): IModifier<C, K>[] {
		// 1. Map 转 Array
		// 2. 过滤 (Timing 和 CommandType)
		// 3. 排序 (优先级 Priority 大 -> 小)
		return Array.from(this.modifiers.values())
			.filter((m) => {
				if (m.descriptor.timing !== timing) return false;
				if (cmd.type !== (m.descriptor.commandType as any)) return false;
				return true;
			})
			.sort((a, b) => (b.descriptor.priority || 0) - (a.descriptor.priority || 0)) as unknown as IModifier<C, K>[];
	}

	public getBuffs(): Buff[] {
		const buffs: Buff[] = [];
		for (const mod of this.modifiers.values()) {
			if (mod.descriptor.meta) {
				const desc = mod.descriptor;
				const meta = mod.descriptor.meta;
				buffs.push({
					id: desc.id,
					name: meta.name,
					description: meta.description,
					source: meta.source,
					triggerTiming: meta.triggerTiming,
					triggerTimes: desc.remainingTriggers,
					tags: meta.tags,
				});
			}
		}
		return buffs;
	}

	public decayAfterExecution(ids: string[], customConsumptions?: Map<string, number>): void {
		const idsToRemove: string[] = [];

		for (const id of ids) {
			// 1. 通过 ID 直接获取真实引用 (O(1))
			const realMod = this.modifiers.get(id);

			// 2. 如果找不到（可能在执行过程中已被移除），跳过
			if (!realMod) continue;

			// 3. 检查是否自动消耗，如果设置为 false 则跳过
			if (realMod.descriptor.autoConsume === false) {
				continue;
			}

			const currentTriggers = realMod.descriptor.remainingTriggers;

			// 4. 如果是无限次（-1 或 Infinity），跳过
			if (currentTriggers === -1 || currentTriggers === Infinity) continue;

			// 4. 获取自定义消耗次数，默认为 1
			const consumption = customConsumptions?.get(id) ?? 1;

			// 5. 扣除次数逻辑
			if (currentTriggers > 0) {
				realMod.descriptor.remainingTriggers -= consumption;

				// 立即检查是否归零，归零则标记移除
				if (realMod.descriptor.remainingTriggers <= 0) {
					idsToRemove.push(id);
				}
			} else {
				// 已经是 <= 0 的异常情况，直接移除
				idsToRemove.push(id);
			}
		}

		// 6. 统一执行移除并触发回调
		idsToRemove.forEach((id) => {
			this.modifiers.delete(id);

			// 触发完成回调
			const callback = this.completionCallbacks.get(id);
			if (callback) {
				try {
					callback();
				} catch (error) {
					console.error(`Error executing completion callback for modifier ${id}:`, error);
				}
				this.completionCallbacks.delete(id);
			}
		});
	}

	public consume(id: string, amount: number): ConsumeResult {
		// 1. 参数验证
		if (amount <= 0) {
			return {
				success: false,
				remainingTriggers: null,
				removed: false,
				modifierId: id
			};
		}

		// 2. 查找修饰器
		const modifier = this.modifiers.get(id);
		if (!modifier) {
			return {
				success: false,
				remainingTriggers: null,
				removed: false,
				modifierId: id
			};
		}

		// 3. 检查是否是无限次修饰器
		const currentTriggers = modifier.descriptor.remainingTriggers;
		if (currentTriggers === -1 || currentTriggers === Infinity) {
			return {
				success: true,
				remainingTriggers: currentTriggers,
				removed: false,
				modifierId: id
			};
		}

		// 4. 执行消耗
		modifier.descriptor.remainingTriggers -= amount;
		const removed = modifier.descriptor.remainingTriggers <= 0;

		// 5. 如果归零则移除并触发回调
		if (removed) {
			this.modifiers.delete(id);

			// 触发完成回调
			const callback = this.completionCallbacks.get(id);
			if (callback) {
				try {
					callback();
				} catch (error) {
					console.error(`Error executing completion callback for modifier ${id}:`, error);
				}
				this.completionCallbacks.delete(id);
			}
		}

		return {
			success: true,
			remainingTriggers: modifier.descriptor.remainingTriggers,
			removed,
			modifierId: id
		};
	}

	public clear(): void {
		// 触发所有回调
		for (const [id, callback] of this.completionCallbacks) {
			try {
				callback();
			} catch (error) {
				console.error(`Error executing completion callback for modifier ${id}:`, error);
			}
		}

		this.modifiers.clear();
		this.completionCallbacks.clear();
	}

	public getModifiersList(): IModifier<C, K>[] {
		return Array.from(this.modifiers.values()) as unknown as IModifier<C, K>[];
	}
}
