import { Buff, ICommand, ICommandMap, IModifier, IModifierManager, ModifierTiming, ConsumeResult, ModifierSnapshot, ModifierTemplate, ModifierDescriptor } from "@mine-monopoly/types";

let _instanceCounter = 0;
function generateInstanceId(templateId: string): string {
	return `${templateId}__inst_${++_instanceCounter}_${Date.now().toString(36)}`;
}

export class ModifierManager<C extends ICommandMap, K extends keyof C = keyof C> implements IModifierManager<C> {
	private owner: any;
	private modifiers = new Map<string, IModifier<C, any>>();
	private completionCallbacks = new Map<string, () => void>();

	public setOwner(owner: any) {
		this.owner = owner;
	}

	public add(
		template: ModifierTemplate,
		onComplete?: () => void,
	): string {
		const instanceId = generateInstanceId(template.id);

		// Compile effectCode into executable function
		// factory signature: (player, gameProcess, cmd, ctx) => { ... }
		let factory: Function;
		try {
			factory = new Function("return " + template.effectCode)();
		} catch (e) {
			console.error(`Modifier 编译失败 (templateId: ${template.id}, instanceId: ${instanceId}):`, e);
			// 降级为空函数修饰器，不影响其他 modifier 运行
			factory = () => {};
		}

		const owner = this.owner;
		const gameProcess = (globalThis as any).gameProcess;

		// Bind owner/gameProcess, final fn signature: (cmd, ctx) => { ... }
		const fn = (cmd: any, ctx: any) => factory(owner, gameProcess, cmd, ctx);

		const descriptor: ModifierDescriptor<C, K> = {
			...template.descriptor,
			id: instanceId,
		} as any;

		const modifier: any = {
			descriptor,
			fn,
			effectCode: template.effectCode,
			templateSlug: template.slug || "",
			templateId: template.id,
		};

		this.modifiers.set(instanceId, modifier as any);

		if (onComplete) {
			this.completionCallbacks.set(instanceId, onComplete);
		}

		return instanceId;
	}

	public removeById(id: string): boolean {
		const removed = this.modifiers.delete(id);

		if (removed) {
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
		for (const [id, mod] of this.modifiers) {
			if (mod.descriptor.meta?.tags?.includes(tag)) {
				this.modifiers.delete(id);

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
			const realMod = this.modifiers.get(id);
			if (!realMod) continue;
			if (realMod.descriptor.autoConsume === false) {
				continue;
			}

			const currentTriggers = realMod.descriptor.remainingTriggers;
			if (currentTriggers === -1 || currentTriggers === Infinity) continue;

			const consumption = customConsumptions?.get(id) ?? 1;

			if (currentTriggers > 0) {
				realMod.descriptor.remainingTriggers -= consumption;
				if (realMod.descriptor.remainingTriggers <= 0) {
					idsToRemove.push(id);
				}
			} else {
				idsToRemove.push(id);
			}
		}

		idsToRemove.forEach((id) => {
			this.modifiers.delete(id);

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
		if (amount <= 0) {
			return {
				success: false,
				remainingTriggers: null,
				removed: false,
				modifierId: id
			};
		}

		const modifier = this.modifiers.get(id);
		if (!modifier) {
			return {
				success: false,
				remainingTriggers: null,
				removed: false,
				modifierId: id
			};
		}

		const currentTriggers = modifier.descriptor.remainingTriggers;
		if (currentTriggers === -1 || currentTriggers === Infinity) {
			return {
				success: true,
				remainingTriggers: currentTriggers,
				removed: false,
				modifierId: id
			};
		}

		modifier.descriptor.remainingTriggers -= amount;
		const removed = modifier.descriptor.remainingTriggers <= 0;

		if (removed) {
			this.modifiers.delete(id);

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

	public getSerializableModifiers(): ModifierSnapshot[] {
		const result: ModifierSnapshot[] = [];
		for (const [id, stored] of this.modifiers) {
			const mod = stored as any;
			result.push({
				templateSlug: mod.templateSlug || "",
				remainingTriggers: mod.descriptor.remainingTriggers,
			});
		}
		return result;
	}

	public restoreModifiers(snaps: ModifierSnapshot[], mapData: any): void {
		this.clear();

		for (const snap of snaps) {
			const template = mapData?.modifierTemplates?.find((t: any) => t.slug === snap.templateSlug);
			if (!template) {
				console.warn(`Modifier template not found: ${snap.templateSlug}, skipping`);
				continue;
			}
			const instanceId = this.add(template);

			// Override runtime state
			const mod = this.modifiers.get(instanceId);
			if (mod) {
				(mod as any).descriptor.remainingTriggers = snap.remainingTriggers;
			}
		}
	}
}
