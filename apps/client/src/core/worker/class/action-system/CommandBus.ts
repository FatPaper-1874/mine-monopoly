import { ICommandMap, ICommandBus, IModifier, ICommand, ICommandContext, IModifierManager } from "@mine-monopoly/types";

export class CommandBus<C extends ICommandMap> implements ICommandBus<C> {
	private handlers = new Map<keyof C, (payload: any) => any>();
	private modifierManager: IModifierManager<C>;

	constructor(modManager: IModifierManager<C>) {
		this.modifierManager = modManager;
	}

	setHandler<K extends keyof C>(type: K, handler: (payload: C[K]["payload"]) => C[K]["result"]): void {
		this.handlers.set(type, handler);
	}

	async execute<K extends keyof C>(command: ICommand<C, K>): Promise<C[K]["result"]> {
		let currentCmd: ICommand<C, K> = command;
		let resultOverride: any = undefined;
		let cancelled = false;
		let cancelResult: any = undefined;

		// 记录修饰器执行状态
		const executedModifierIds: string[] = [];
		const skippedModifierIds = new Set<string>();
		const customConsumptions = new Map<string, number>();

		const ctx: ICommandContext<C, K> = {
			cancel: (result) => {
				cancelled = true;
				cancelResult = result;
			},
			setResult: (res) => (resultOverride = res),
			skip: () => {
				if (ctx.modifierId) {
					skippedModifierIds.add(ctx.modifierId);
				}
			},
			consume: (count: number) => {
				if (ctx.modifierId) {
					customConsumptions.set(ctx.modifierId, count);
				}
			}
		};

		const beforeModifiers = this.modifierManager.getFor(command, "before");
		const afterModifiers = this.modifierManager.getFor(command, "after");

		// ---------- BEFORE ----------
		for (const m of beforeModifiers) {
			ctx.modifierId = m.descriptor.id;

			await m.fn(currentCmd, ctx);
			executedModifierIds.push(m.descriptor.id);

			delete ctx.modifierId;

			if (cancelled) {
				const idsToDecay = executedModifierIds.filter(id => !skippedModifierIds.has(id));
				this.modifierManager.decayAfterExecution(idsToDecay, customConsumptions);
				return cancelResult;
			}
		}

		// ---------- HANDLER ----------
		const handler = this.handlers.get(command.type);
		if (!handler) throw new Error(`命令: ${String(command.type)}, 没有设置handler`);

		let result = await handler(command.payload);

		if (resultOverride !== undefined) {
			result = resultOverride;
		}

		ctx.result = result;

		// ---------- AFTER ----------
		for (const m of afterModifiers) {
			ctx.modifierId = m.descriptor.id;

			await m.fn(currentCmd, ctx);
			executedModifierIds.push(m.descriptor.id);

			delete ctx.modifierId;
		}

		// ---------- DECAY ----------
		const idsToDecay = executedModifierIds.filter(id => !skippedModifierIds.has(id));
		this.modifierManager.decayAfterExecution(idsToDecay, customConsumptions);

		if (resultOverride !== undefined) result = resultOverride;

		return result;
	}
}
