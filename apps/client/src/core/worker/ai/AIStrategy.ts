import { IPlayer, IProperty, OperateType, PlayerOperationResult } from "@mine-monopoly/types";

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
				return { rollDice: true } as PlayerOperationResult[T];

			case OperateType.ConfirmDialogResult:
				// 处理确认对话框（购买/升级等）
				return this.handleConfirmDialog(player, dialogOption) as PlayerOperationResult[T];

			case OperateType.TargetSelectDialogResult:
				// 处理目标选择对话框
				return this.handleTargetSelect(player, dialogOption) as PlayerOperationResult[T];

			case OperateType.ItemSelectDialogResult:
				// 处理物品选择对话框
				return this.handleItemSelect(player, dialogOption) as PlayerOperationResult[T];

			case OperateType.UseChanceCard:
				// 处理使用机会卡
				const shouldUse = this.strategy.shouldUseChanceCard(player);
				console.log(`[AI] ${player.name} ${shouldUse ? "使用" : "不使用"} 机会卡`);
				return { useCard: shouldUse } as PlayerOperationResult[T];

			default:
				console.warn(`[AI] 未处理的操作类型: ${operationType}`);
				return {} as PlayerOperationResult[T];
		}
	}

	/**
	 * 处理确认对话框（购买/升级）
	 */
	private handleConfirmDialog(player: IPlayer, dialogOption?: any): ConfirmDialogResult<any> {
		const title = dialogOption?.title || "";
		const inputOptions = dialogOption?.inputOptions || [];

		// 构建返回结果：包含 confirm 和所有 inputOptions 的字段
		const result: any = { confirm: false };

		// 处理 inputOptions 中的每个字段
		for (const option of inputOptions) {
			if (option.key && option.initData !== undefined) {
				result[option.key] = option.initData;
			}
		}

		if (title.includes("购买")) {
			const shouldBuy = this.strategy.shouldBuyProperty(player, dialogOption.property);
			console.log(`[AI] ${player.name} ${shouldBuy ? "购买" : "不购买"} ${dialogOption.property?.name || ""}`);
			result.confirm = shouldBuy;
		} else if (title.includes("升级")) {
			const shouldUpgrade = this.strategy.shouldUpgradeProperty(player, dialogOption.property);
			console.log(`[AI] ${player.name} ${shouldUpgrade ? "升级" : "不升级"} ${dialogOption.property?.name || ""}`);
			result.confirm = shouldUpgrade;
		} else {
			// 默认拒绝
			console.log(`[AI] ${player.name} 拒绝确认: ${title}`);
			result.confirm = false;
		}

		return result;
	}

	/**
	 * 处理目标选择对话框
	 */
	private handleTargetSelect(player: IPlayer, dialogOption?: any): TargetSelectDialogResult<any> {
		const targets = dialogOption?.targets || [];
		const selected = this.strategy.selectTarget(player, targets);

		// TargetSelectDialogResult 的 target 字段应该是 string[] 类型
		// 根据不同的 TargetSelectType 返回对应的 ID 数组
		let selectedIds: string[] = [];
		if (Array.isArray(selected)) {
			selectedIds = selected;
		} else if (selected?.id) {
			selectedIds = [selected.id];
		}

		console.log(`[AI] ${player.name} 选择目标: ${selectedIds.join(", ") || "空"}`);
		return { target: selectedIds };
	}

	/**
	 * 处理物品选择对话框
	 */
	private handleItemSelect(player: IPlayer, dialogOption?: any): ItemSelectDialogResult {
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
}

// 导出默认AI管理器实例
export const aiManager = new AIManager();
