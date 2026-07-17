import { OperateType } from "../../enums/game/game-process";
import { MapItem } from "./item";
import { PlayerInfo, PropertyInfo } from "./game-process/infos";

/**
 * AI 决策场景
 */
export type AIDecisionScene =
	| "confirm-dialog"
	| "target-select"
	| "item-select"
	| "form-dialog"
	| "active-action"
	| "scripted-action";

/**
 * AI 决策操作标识
 * 除了已有 OperateType，也允许宿主层定义更高层的逻辑动作。
 */
export type AIDecisionOperation = OperateType | "active-action" | "scripted-action";

/**
 * AI 弱语义提示
 * 用于帮助本地 AI / 远程模型理解自定义地图动作，但不参与执行权限判定。
 */
export interface AIDecisionSemanticHint {
	/** 粗粒度类别，例如 economy / combat / movement / control */
	category?: string;

	/** 自由标签，用于补充含义 */
	tags?: string[];

	/** 可选意图字符串；未知值必须允许降级 */
	intent?: string;

	/** 简要摘要 */
	summary?: string;

	/** 目标摘要或目标类型 */
	target?: string;

	/** 来源系统，例如 property / stock / lottery / chance-card */
	sourceSystem?: string;

	/** 预估成本 */
	cost?: number;

	/** 预估收益 */
	reward?: number;

	/** 预估风险 */
	risk?: number;

	/** 预期效果描述 */
	effects?: string[];

	/** 生效时机 immediate / short-term / long-term */
	timing?: string;

	/** 是否需要前置准备 */
	requiresSetup?: boolean;

	/** 紧迫度，越高越应优先 */
	urgency?: number;

	/** 连招或组合键 */
	comboKey?: string;

	/** 自定义元数据 */
	metadata?: Record<string, unknown>;
}

/**
 * AI 可选动作
 */
export interface AIDecisionOption {
	/** 选项 ID */
	id: string;

	/** 展示标签 */
	label: string;

	/** 选项类型 */
	actionType: string;

	/** 可选说明 */
	description?: string;

	/** 是否禁用 */
	disabled?: boolean;

	/** 是否隐藏 */
	hidden?: boolean;

	/** 语义提示 */
	semantics?: AIDecisionSemanticHint;

	/** 附加负载 */
	payload?: Record<string, unknown>;
}

/**
 * AI 策略状态
 * 当前实现较轻量，后续可用于远程模型 / 中长期策略。
 */
export interface AIStrategyState {
	/** 当前策略姿态 */
	posture?: "expand" | "balanced" | "conservative" | "desperate" | "speculative";

	/** 重点关注的玩家 */
	focusPlayerId?: string;

	/** 重点关注的地皮 */
	focusPropertyIds?: string[];

	/** 偏好的系统 */
	preferredSystems?: string[];

	/** 现金安全线 */
	reserveCashTarget?: number;

	/** 最近决策摘要 */
	recentDecisionSummaries?: string[];

	/** 最近一次更新的回合 */
	lastDecisionAtRound?: number;

	/** 备注 */
	notes?: string[];

	/** 附加记忆 */
	memory?: Record<string, unknown>;
}

/**
 * 提供给 AI 的游戏快照
 */
export interface AIDecisionContextSnapshot {
	/** 当前正在决策的玩家 */
	player: PlayerInfo;

	/** 当前局内所有玩家 */
	players: PlayerInfo[];

	/** 当前局内所有地产 */
	properties: PropertyInfo[];

	/** 地图格子精简快照 */
	mapItems: Pick<MapItem, "id" | "type" | "x" | "y" | "rotation" | "mapEventId" | "property">[];

	/** 自定义系统快照 */
	systems?: Record<string, unknown>;

	/** 当前回合数 */
	currentRound: number;

	/** 当前倍率 */
	currentMultiplier: number;

	/** 当前轮到的玩家 ID */
	currentPlayerIdInRound: string;

	/** 地图基础信息 */
	map: {
		/** 地图 ID */
		id: string;

		/** 地图名称 */
		name: string;

		/** 地图描述 */
		description?: string;
	};
}

/**
 * 标准化 AI 决策请求
 */
export interface AIDecisionRequest<T extends string = AIDecisionOperation> {
	/** 操作类型 */
	operationType: T;

	/** 决策场景 */
	scene?: AIDecisionScene;

	/** 发起决策的玩家 ID */
	playerId: string;

	/** 决策标题 */
	title: string;

	/** 游戏快照上下文 */
	context: AIDecisionContextSnapshot;

	/** 可选动作列表 */
	options: AIDecisionOption[];

	/** 当前策略状态 */
	strategyState?: AIStrategyState;

	/** 面向 AI 的额外摘要 */
	summary?: string;

	/** 语义提示 */
	semantics?: AIDecisionSemanticHint;

	/** 扩展元数据 */
	metadata?: Record<string, unknown>;
}

/**
 * 供宿主主动推送给 AI 的决策请求输入
 */
export interface AIDecisionPrompt<T extends string = AIDecisionOperation> {
	/** 操作类型 */
	operationType: T;

	/** 决策场景 */
	scene?: AIDecisionScene;

	/** 决策标题 */
	title: string;

	/** 可选动作列表 */
	options: AIDecisionOption[];

	/** 面向 AI 的额外摘要 */
	summary?: string;

	/** 语义提示 */
	semantics?: AIDecisionSemanticHint;

	/** 扩展元数据 */
	metadata?: Record<string, unknown>;
}

/**
 * AI 决策返回
 */
export interface AIDecisionSelection {
	/** 单选结果 */
	optionId?: string;

	/** 多选结果 */
	optionIds?: string[];

	/** 表单是否提交 */
	submitted?: boolean;

	/** 表单字段值 */
	fieldValues?: Record<string, unknown>;

	/** 信心分 */
	confidence?: number;

	/** 决策理由 */
	reason?: string;
}

/**
 * AI 决策提供器
 */
export interface AIDecisionProvider {
	/**
	 * 生成一条 AI 决策结果
	 * @param request - 标准化后的 AI 决策请求
	 * @returns AI 选择结果
	 */
	decide(request: AIDecisionRequest): Promise<AIDecisionSelection> | AIDecisionSelection;
}
