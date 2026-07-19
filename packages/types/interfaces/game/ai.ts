import { OperateType } from "../../enums/game/game-process";
import { MapEvent, MapItem } from "./item";
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

	/** 面向模型的简要摘要 */
	summary?: string;

	/** 是否禁用 */
	disabled?: boolean;

	/** 是否隐藏 */
	hidden?: boolean;

	/** 附加负载 */
	payload?: Record<string, unknown>;
}

/**
 * AI 策略状态
 * 当前实现较轻量，后续可用于远程模型 / 中长期策略。
 */
export interface AIStrategyEconomyMemory {
	/** 现金安全线 */
	reserveCashTarget?: number;

	/** 当前花钱倾向 */
	spendMode?: "hold_cash" | "balanced" | "invest";

	/** 风险偏好 */
	riskTolerance?: "low" | "medium" | "high";

	/** 经济层面的警示 */
	warningFlags?: string[];
}

export interface AIStrategyThreatModelMemory {
	/** 当前重点关注的玩家 */
	focusPlayerId?: string;

	/** 威胁原因 */
	threatReasons?: string[];

	/** 需要重点规避或关注的危险地产 */
	dangerousPropertyIds?: string[];
}

export interface AIStrategyPropertyPlanMemory {
	/** 当前重点关注的地产 */
	focusPropertyIds?: string[];

	/** 应避免投入的地产 */
	avoidPropertyIds?: string[];

	/** 地产相关扩张理由 */
	expansionReason?: string;
}

export interface AIStrategySystemPlanMemory {
	/** 偏好的系统 */
	preferredSystems?: string[];

	/** 暂时避免的系统 */
	avoidedSystems?: string[];

	/** 最近一次被视为有效的系统 */
	lastEffectiveSystem?: string;
}

export interface AIStrategyMapUnderstandingMemory {
	/** AI 认为值得注意的地图区域 */
	keyZones?: string[];

	/** 关键格子 / 事件说明 */
	specialTileNotes?: string[];

	/** 近期路径理解 */
	routeNotes?: string[];
}

export interface AIStrategyShortTermIntentMemory {
	/** 当前短期目标 */
	currentGoal?: string;

	/** 下一步倾向 */
	nextTurnPlan?: string[];

	/** 需要满足的保守条件 */
	holdConditions?: string[];
}

export interface AIStrategyShortTermMemory {
	/** 最近几次决策摘要 */
	recentDecisions?: string[];

	/** 最近几次失败或不适合继续尝试的记录 */
	recentFailures?: string[];

	/** 当前回合或最近几步的阻塞提示 */
	blockedActionHints?: string[];

	/** 需要立刻记住的焦点 */
	immediateFocus?: string[];

	/** 最近一次选择的系统 */
	lastChosenSystem?: string;

	/** 最近一次结果 */
	lastOutcome?: string;
}

export interface AIStrategyMemoryStat {
	/** 统计键 */
	key: string;

	/** 展示标签 */
	label?: string;

	/** 来源系统 */
	sourceSystem?: string;

	/** 成功次数 */
	successCount?: number;

	/** 失败次数 */
	failureCount?: number;

	/** 中性次数 */
	neutralCount?: number;

	/** 最近结果 */
	lastOutcome?: string;

	/** 最近更新回合 */
	lastRound?: number;
}

export interface AIStrategyMatchMemory {
	/** 当前对局里更有效的系统 */
	effectiveSystems?: string[];

	/** 当前对局里应谨慎对待的系统 */
	riskySystems?: string[];

	/** 按系统聚合的对局统计 */
	systemStats?: AIStrategyMemoryStat[];

	/** 按动作聚合的对局统计 */
	actionStats?: AIStrategyMemoryStat[];

	/** 当前对局归纳出的经验结论 */
	notableLessons?: string[];
}

export interface AIStrategyExperienceMemory {
	/** 最近成功经验 */
	recentSuccesses?: string[];

	/** 最近失败经验 */
	recentFailures?: string[];

	/** 压缩后的经验结论 */
	compressedLessons?: string[];
}

export interface AIStrategyStructuredMemory {
	/** 结构版本 */
	version: number;

	/** 经济与风险记忆 */
	economy?: AIStrategyEconomyMemory;

	/** 威胁模型 */
	threatModel?: AIStrategyThreatModelMemory;

	/** 地产计划 */
	propertyPlan?: AIStrategyPropertyPlanMemory;

	/** 系统偏好 */
	systemPlan?: AIStrategySystemPlanMemory;

	/** 地图理解 */
	mapUnderstanding?: AIStrategyMapUnderstandingMemory;

	/** 短期意图 */
	shortTermIntent?: AIStrategyShortTermIntentMemory;

	/** 短期记忆 */
	shortTerm?: AIStrategyShortTermMemory;

	/** 对局记忆 */
	match?: AIStrategyMatchMemory;

	/** 经验记忆 */
	experience?: AIStrategyExperienceMemory;
}

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
	memory?: AIStrategyStructuredMemory;
}

export interface AIDecisionPlayerRoleSnapshot {
	/** 玩家 ID */
	playerId: string;

	/** 玩家名称 */
	playerName: string;

	/** 是否为当前决策玩家 */
	isSelf?: boolean;

	/** 是否为 AI */
	isAI?: boolean;

	/** 角色 ID */
	roleId?: string;

	/** 角色名称 */
	roleName?: string;

	/** 角色描述 */
	roleDescription?: string;
}

export interface AIDecisionRoleDefinition {
	/** 角色 ID */
	id: string;

	/** 角色名称 */
	name: string;

	/** 角色描述 */
	description?: string;
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
	mapItems: Pick<MapItem, "id" | "type" | "x" | "y" | "rotation" | "mapEventId" | "linkto" | "beLinked" | "property">[];

	/** 棋盘路径顺序（仅供 AI 摘要层解析使用） */
	mapIndex: string[];

	/** 地图事件精简快照 */
	mapEvents: Pick<MapEvent, "id" | "type" | "name" | "description">[];

	/** 自定义系统快照 */
	systems?: Record<string, unknown>;

	/** 玩家所选角色快照 */
	playerRoles?: AIDecisionPlayerRoleSnapshot[];

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

		/** 地图可选角色 */
		roles?: AIDecisionRoleDefinition[];
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

	/** 可选聊天发言，展示为房间聊天消息 */
	chatMessages?: string[];
}

export type AIDecisionProviderMode = "remote";
export type AIRemoteLLMProviderKind = "openai-compatible" | "anthropic";

export interface AIRemoteLLMConfig {
	id?: string;
	name?: string;
	provider?: AIRemoteLLMProviderKind;
	baseUrl: string;
	apiKey: string;
	model: string;
	timeoutMs?: number;
}

export interface AIRemoteLLMProfile extends AIRemoteLLMConfig {
	id: string;
	name: string;
}

export interface AIRemoteUsageRecord {
	traceId: string;
	playerId: string;
	title: string;
	scene?: string;
	profileId?: string;
	profileName?: string;
	provider: AIRemoteLLMProviderKind;
	model: string;
	inputTokens?: number;
	outputTokens?: number;
	totalTokens?: number;
	promptChars: number;
	responseChars: number;
	timestamp: number;
	usageAvailable: boolean;
}

export interface AIRemoteUsageSummary {
	requestCount: number;
	usageCount: number;
	missingUsageCount: number;
	inputTokens: number;
	outputTokens: number;
	totalTokens: number;
}

export interface AIRemoteUsagePlayerSnapshot {
	playerId: string;
	summary: AIRemoteUsageSummary;
	records: AIRemoteUsageRecord[];
}

export interface AIRemoteUsageSnapshot {
	records: AIRemoteUsageRecord[];
	summary: AIRemoteUsageSummary;
	byPlayer: Record<string, AIRemoteUsagePlayerSnapshot>;
}

export interface AIDecisionConfig {
	mode: AIDecisionProviderMode;
	remote: AIRemoteLLMConfig;
	remoteProfiles?: AIRemoteLLMProfile[];
	defaultRemoteProfileId?: string;
	contextMemoryLimit?: number;
}

export interface AIPlayerDecisionBinding {
	mode: AIDecisionProviderMode;
	remoteProfileId?: string;
}

export interface AIControlRoomSnapshot {
	roomId: string;
	ownerId: string;
	isStarted: boolean;
	mapName: string;
	canSyncRoomAI: boolean;
	workerState?: string;
	lastKnownGameState?: unknown;
}

export interface AIControlPlayerSnapshot {
	userId: string;
	username: string;
	color?: string;
	roleId?: string;
	isReady?: boolean;
	binding: AIPlayerDecisionBinding;
	resolvedRemoteProfile: AIRemoteLLMProfile | null;
	usage?: AIRemoteUsagePlayerSnapshot;
	strategyState?: AIStrategyState;
}

export interface AIControlSnapshot {
	room: AIControlRoomSnapshot;
	config: AIDecisionConfig;
	remoteUsage: AIRemoteUsageSnapshot;
	aiPlayers: AIControlPlayerSnapshot[];
	debugState?: unknown;
}

export interface AIControlApplyConfigResult {
	success: boolean;
	error?: string;
	syncedRoomAI?: boolean;
	config?: AIDecisionConfig;
}

export interface AIControlMutationResult {
	success: boolean;
	error?: string;
}

export interface AIControlBridge {
	getSnapshot: () => Promise<AIControlSnapshot>;
	applyConfig: (config: AIDecisionConfig) => Promise<AIControlApplyConfigResult> | AIControlApplyConfigResult;
	clearUsage: () => Promise<AIControlMutationResult> | AIControlMutationResult;
	clearMemory: (playerId?: string) => Promise<AIControlMutationResult> | AIControlMutationResult;
	setPlayerName: (
		userId: string,
		username: string,
	) => Promise<AIControlMutationResult> | AIControlMutationResult;
	setPlayerBinding: (
		userId: string,
		binding: Partial<AIPlayerDecisionBinding>,
	) => Promise<AIControlMutationResult> | AIControlMutationResult;
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
