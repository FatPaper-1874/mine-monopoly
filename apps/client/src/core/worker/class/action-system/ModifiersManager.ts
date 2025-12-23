import { Buff, ICommand, ICommandMap, IModifier, IModifierManager, ModifierTiming } from "@fatpaper-monopoly/types";
import { clone, cloneDeep } from "lodash";

export class ModifierManager<C extends ICommandMap, K extends keyof C = keyof C> implements IModifierManager<C> {
	private modifiers = new Map<string, IModifier<C, any>>();

	public add(mod: IModifier<C, K>): string {
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
			return id;
		}

		this.modifiers.set(id, modClone);
		return id;
	}

	public removeById(id: string): boolean {
		return this.modifiers.delete(id);
	}

	public removeByTag(tag: string): void {
		// 遍历 Map 进行删除
		for (const [id, mod] of this.modifiers) {
			if (mod.descriptor.meta?.tags?.includes(tag)) {
				this.modifiers.delete(id);
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
					triggerTiming: meta.timingName,
					triggerTimes: desc.remainingTriggers,
					tags: meta.tags,
				});
			}
		}
		return buffs;
	}

	public decayAfterExecution(ids: string[]): void {
		const idsToRemove: string[] = [];

		for (const id of ids) {
			// 1. 通过 ID 直接获取真实引用 (O(1))
			const realMod = this.modifiers.get(id);

			// 2. 如果找不到（可能在执行过程中已被移除），跳过
			if (!realMod) continue;

			const currentTriggers = realMod.descriptor.remainingTriggers;

			// 3. 如果是无限次，跳过
			if (currentTriggers === Infinity) continue;

			// 4. 扣除次数逻辑
			if (currentTriggers > 0) {
				realMod.descriptor.remainingTriggers--;

				// 立即检查是否归零，归零则标记移除
				if (realMod.descriptor.remainingTriggers <= 0) {
					idsToRemove.push(id);
				}
			} else {
				// 已经是 <= 0 的异常情况，直接移除
				idsToRemove.push(id);
			}
		}

		// 5. 统一执行移除
		idsToRemove.forEach((id) => this.modifiers.delete(id));
	}

	public clear(): void {
		this.modifiers.clear();
	}

	public getModifiersList(): IModifier<C, K>[] {
		return Array.from(this.modifiers.values()) as unknown as IModifier<C, K>[];
	}
}
