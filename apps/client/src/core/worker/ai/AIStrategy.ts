import { IPlayer, IProperty, OperateType, PlayerOperationResult, ConfirmDialogResult, TargetSelectDialogResult, ItemSelectDialogResult, FormDialogResult } from "@mine-monopoly/types";

/**
 * AI决策结果
 */
export interface AIDecisionResult {
	operationType: OperateType;
	result: any;
	delay: number;
}

/**
 * AI策略接口
 * 用于拓展不同的AI策略（保守型、激进型、平衡型等）
 */
export interface IAIStrategy {
	/**
	 * 决策是否购买地产
	 */
	shouldBuyProperty(player: IPlayer, property: IProperty): boolean;

	/**
	 * 决策是否升级地产
	 */
	shouldUpgradeProperty(player: IPlayer, property: IProperty): boolean;

	/**
	 * 决策是否使用机会卡
	 */
	shouldUseChanceCard(player: IPlayer): boolean;

	/**
	 * 决策选择哪个目标
	 * @returns 选中的目标数组（string[]）
	 */
	selectTarget(player: IPlayer, targets: any[]): any[];

	/**
	 * 决策选择多个物品
	 * @param player AI玩家
	 * @param items 可选物品列表
	 * @param maxCount 最大选择数量（默认为1）
	 * @returns 选中的物品数组
	 */
	selectItems(player: IPlayer, items: any[], maxCount?: number): any[];
}

/**
 * 简单AI策略 - 所有操作都拒绝
 * 只保证游戏能正常运行，不进行任何购买/升级/使用道具等操作
 * AI立即做出决策，不等待
 */
export class SimpleAIStrategy implements IAIStrategy {
	// AI立即做出决策，不等待
	constructor() {
		// 无需配置
	}

	/**
	 * 决策是否购买地产
	 * 简单策略：总是不购买
	 */
	shouldBuyProperty(player: IPlayer, property: IProperty): boolean {
		return false;
	}

	/**
	 * 决策是否升级地产
	 * 简单策略：总是不升级
	 */
	shouldUpgradeProperty(player: IPlayer, property: IProperty): boolean {
		return false;
	}

	/**
	 * 决策是否使用机会卡
	 * 简单策略：总是不使用
	 */
	shouldUseChanceCard(player: IPlayer): boolean {
		return false;
	}

	/**
	 * 决策选择哪个目标
	 * 简单策略：选择第一个（如果有的话），否则返回空数组
	 * @returns 选中的目标数组
	 */
	selectTarget(player: IPlayer, targets: any[]): any[] {
		if (targets.length === 0) return [];
		return [targets[0]];
	}

	/**
	 * 决策选择多个物品
	 * 简单策略：选择前 N 个物品
	 * @param player AI玩家
	 * @param items 可选物品列表
	 * @param maxCount 最大选择数量（默认为1）
	 * @returns 选中的物品数组
	 */
	selectItems(player: IPlayer, items: any[], maxCount: number = 1): any[] {
		if (items.length === 0) return [];
		const count = Math.min(maxCount, items.length);
		return items.slice(0, count);
	}
}

/**
 * AI管理器 - 负责处理AI玩家的所有决策
 */
export class AIManager {
	private strategy: IAIStrategy;

	constructor(strategy: IAIStrategy = new SimpleAIStrategy()) {
		this.strategy = strategy;
	}

	/**
	 * 设置AI策略
	 */
	setStrategy(strategy: IAIStrategy): void {
		this.strategy = strategy;
	}

	/**
	 * 获取当前AI策略
	 */
	getStrategy(): IAIStrategy {
		return this.strategy;
	}

	/**
	 * 处理AI决策
	 * @param player AI玩家
	 * @param operationType 操作类型
	 * @param dialogOption 对话框选项（可选）
	 */
	async makeDecision<T extends OperateType>(
		player: IPlayer,
		operationType: T,
		dialogOption?: any
	): Promise<PlayerOperationResult[T]> {
		// AI立即做出决策，不等待

		switch (operationType) {
			case OperateType.RollDice:
				// AI总是掷骰子（保证游戏进行）
				console.log(`[AI] ${player.name} 决定掷骰子`);
				return { rollDice: true } as unknown as PlayerOperationResult[T];

			case OperateType.ConfirmDialogResult:
				// 处理确认对话框（购买/升级等）
				return this.handleConfirmDialog(player, dialogOption) as PlayerOperationResult[T];

			case OperateType.TargetSelectDialogResult:
				// 处理目标选择对话框
				return this.handleTargetSelect(player, dialogOption) as PlayerOperationResult[T];

			case OperateType.ItemSelectDialogResult:
				// 处理物品选择对话框
				return this.handleItemSelect(player, dialogOption) as PlayerOperationResult[T];

			case OperateType.FormDialogResult:
				// 处理表单对话框
				return this.handleFormDialog(player, dialogOption) as PlayerOperationResult[T];

			case OperateType.UseChanceCard:
				// 处理使用机会卡
				const shouldUse = this.strategy.shouldUseChanceCard(player);
				console.log(`[AI] ${player.name} ${shouldUse ? "使用" : "不使用"} 机会卡`);
				return { useCard: shouldUse } as unknown as PlayerOperationResult[T];

			default:
				console.warn(`[AI] 未处理的操作类型: ${operationType}`);
				return {} as PlayerOperationResult[T];
		}
	}

	/**
	 * 处理确认对话框（购买/升级）
	 */
	private handleConfirmDialog(player: IPlayer, dialogOption?: any): ConfirmDialogResult {
		const title = dialogOption?.title || "";

		// 构建返回结果
		let confirm = false;

		if (title.includes("购买")) {
			const shouldBuy = this.strategy.shouldBuyProperty(player, dialogOption.property);
			console.log(`[AI] ${player.name} ${shouldBuy ? "购买" : "不购买"} ${dialogOption.property?.name || ""}`);
			confirm = shouldBuy;
		} else if (title.includes("升级")) {
			const shouldUpgrade = this.strategy.shouldUpgradeProperty(player, dialogOption.property);
			console.log(`[AI] ${player.name} ${shouldUpgrade ? "升级" : "不升级"} ${dialogOption.property?.name || ""}`);
			confirm = shouldUpgrade;
		} else {
			// 默认拒绝
			console.log(`[AI] ${player.name} 拒绝确认: ${title}`);
			confirm = false;
		}

		return { id: player.id, confirm };
	}

	/**
	 * 处理目标选择对话框
	 */
	private handleTargetSelect(player: IPlayer, dialogOption?: any): TargetSelectDialogResult<any> {
		const targets = dialogOption?.targets || [];
		const selected = this.strategy.selectTarget(player, targets);

		let selectedIds: string[] = [];
		if (Array.isArray(selected)) {
			selectedIds = selected.map((item: any) => item?.id || item);
		} else if ((selected as any)?.id) {
			selectedIds = [(selected as any).id];
		}

		console.log(`[AI] ${player.name} 选择目标: ${selectedIds.join(", ") || "空"}`);
		return { target: selectedIds };
	}

	/**
	 * 处理物品选择对话框
	 */
	private handleItemSelect(player: IPlayer, dialogOption?: any): ItemSelectDialogResult {
		// SimpleAIStrategy 哲学：拒绝一切可选操作
		// 如果对话框可取消（有 cancelText），AI 选择取消
		if (dialogOption?.cancelText) {
			console.log(`[AI] ${player.name} 取消物品选择: ${dialogOption.title || ""}`);
			return { selected: [] };
		}

		const items = dialogOption?.itemList || [];

		// 规范化 multiple 参数
		let maxCount = 1;
		if (dialogOption?.multiple === true) {
			maxCount = items.length;
		} else if (typeof dialogOption?.multiple === 'number') {
			maxCount = Math.max(1, dialogOption.multiple);
		}

		const selected = this.strategy.selectItems(player, items, maxCount);
		const selectedIds = Array.isArray(selected) ? selected.map(item => item?.id || item) : [];

		console.log(`[AI] ${player.name} 选择物品: ${selectedIds.join(", ") || "空"} (最多 ${maxCount} 个)`);
		return { selected: selectedIds };
	}

	/**
	 * 处理表单对话框
	 */
	private handleFormDialog(player: IPlayer, dialogOption?: any): FormDialogResult<any> {
		const title = dialogOption?.title || "";
		const fields = dialogOption?.fields || [];

		// 构建返回结果：包含 submitted 和所有 fields 的字段
		const result: any = { submitted: false };

		// 处理 fields 中的每个字段
		for (const field of fields) {
			if (field.key && field.defaultValue !== undefined) {
				// AI 可以根据策略调整默认值
				result[field.key] = field.defaultValue; // 简化实现，直接使用默认值
			}
		}

		// 根据标题和策略决定是否提交（简化实现）
		result.submitted = this.shouldSubmitForm(title, dialogOption);

		const fieldsInfo = fields.map((f: any) => `${f.key}=${result[f.key]}`).join(", ");
		console.log(`[AI] ${player.name} 表单对话框 "${title}": ${result.submitted ? "提交" : "取消"} (字段: ${fieldsInfo})`);

		return result;
	}

	/**
	 * AI 决定是否提交表单
	 */
	private shouldSubmitForm(title: string, dialogOption?: any): boolean {
		// 简化实现：根据标题关键词决策
		if (title.includes("购买")) {
			return this.strategy.shouldBuyProperty(dialogOption?.player, dialogOption?.property);
		}
		// 默认不提交
		return false;
	}
}

// 导出默认AI管理器实例
export const aiManager = new AIManager();
