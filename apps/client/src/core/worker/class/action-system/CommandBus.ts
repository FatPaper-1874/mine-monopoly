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

		// 记录真正执行过的修饰器
		const executedModifierIds: string[] = [];

		const ctx: ICommandContext<C, K> = {
			cancel: () => (cancelled = true),
			setResult: (res) => (resultOverride = res),
		};

		const beforeModifiers = this.modifierManager.getFor(command, "before");
		const afterModifiers = this.modifierManager.getFor(command, "after");

		// ---------- BEFORE ----------
		for (const m of beforeModifiers) {
			await m.fn(currentCmd, ctx);
			executedModifierIds.push(m.descriptor.id); // 执行成功才推入

			if (cancelled) {
				// 中断：只扣除已经执行过的
				this.modifierManager.decayAfterExecution(executedModifierIds);
				return { ok: false, cancelled: true };
			}
		}

		// ---------- HANDLER ----------
		const handler = this.handlers.get(command.type);
		if (!handler) throw new Error(`命令: ${String(command.type)}, 没有设置handler`);

		// 如果 resultOverride 在 Before 阶段被设置了，是否跳过 Handler？
		// 通常逻辑是：没 Cancel 就执行 Handler，Result 只是覆盖返回值
		let result = await handler(command.payload);

		if (resultOverride !== undefined) {
			// 如果 Before 阶段已经产生结果（例如：护盾直接结算了伤害），覆盖它
			result = resultOverride;
		}

		// 更新 Context result 供 After 阶段使用
		ctx.result = result;

		// ---------- AFTER ----------
		for (const m of afterModifiers) {
			await m.fn(currentCmd, ctx);
			executedModifierIds.push(m.descriptor.id); // 执行成功才推入
		}

		// ---------- DECAY ----------
		// 统一结算所有真正执行过的修饰器
		this.modifierManager.decayAfterExecution(executedModifierIds);

		// After 阶段也可能通过 setResult 修改最终返回值
		if (resultOverride !== undefined) result = resultOverride;

		return result;
	}
}
