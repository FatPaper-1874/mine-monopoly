declare enum PlayerMoveType {
	Walk = 0,
	Tp = 1
}
declare enum TargetSelectType {
	ToSelf = "ToSelf",
	ToOtherPlayer = "ToOtherPlayer",
	ToPlayer = "ToPlayer",
	ToProperty = "ToProperty",
	ToMapItem = "ToMapItem"
}
declare enum MapEventType {
	ArrivedEvent = "ArrivedEvent",
	PassedEvent = "PassedEvent",
	NormalEvents = "NormalEvents"
}
declare enum GameLinkItem {
	Player = "Player",
	ChanceCard = "ChanceCard",
	Property = "Property",
	ArrivedEvent = "ArrivedEvent"
}
/**
 * 回合倒计时定时器接口
 */
interface IRoundTimeTimer {
	/**
	 * 启动定时器
	 * @param callback - 倒计时结束回调函数
	 * @param timeS - 倒计时时长（秒，可选）
	 */
	start(callback: Function | null, timeS?: number): Promise<void>;
	/**
	 * 推进到下一个时间刻度
	 */
	nextTick(): void;
	/**
	 * 暂停定时器
	 */
	pause(): void;
	/**
	 * 恢复定时器
	 */
	resume(): void;
	/**
	 * 停止定时器
	 */
	stop(): void;
	/**
	 * 设置超时回调函数
	 * @param newFunction - 新的超时回调函数
	 */
	setTimeOutFunction(newFunction: Function | null): Promise<void>;
	/**
	 * 设置倒计时间歇回调函数
	 * @param countDownCallback - 倒计时间歇回调（传入剩余时间）
	 */
	setIntervalFunction(countDownCallback: (remainingTime: number) => void): void;
	/**
	 * 清除间歇回调
	 */
	clearInterval(): void;
	/**
	 * 销毁定时器
	 */
	destroy(): void;
}
/**
 * 骰子接口
 */
interface IDice extends DiceInfo {
	/**
	 * 设置预言值（作弊值）
	 * @param prophecy - 预言值（undefined 表示取消）
	 */
	setProphecy(prophecy: number | undefined): void;
	/**
	 * 设置骰子值（用于初始化或调试）
	 * @param values - 骰子值列表
	 */
	setValues(values: number[]): void;
	/**
	 * 掷骰子
	 * @returns 骰子结果
	 */
	roll(): DiceResult;
	/**
	 * 获取骰子信息
	 * @returns 骰子信息
	 */
	getInfo(): DiceInfo;
}
/**
 * 骰子信息接口
 * 用于序列化和传输骰子状态
 */
interface DiceInfo {
	/** 骰子唯一标识 */
	id: string;
	/** 预言值（作弊值，undefined 表示无预言） */
	prophecy: number | undefined;
	/** 骰子面值列表 */
	diceValues: number[];
}
/**
 * 骰子结果接口
 * 表示一次掷骰子的结果
 */
interface DiceResult {
	/** 骰子面值列表 */
	diceValues: number[];
	/** 掷骰子结果（总和） */
	result: number;
	/** 预言值（如果有） */
	prophecy: number | undefined;
}
/**
 * 表单组件类型
 */
type ComponentType = "number-input" | "select";
/**
 * 下拉选项接口
 */
interface SelectOption {
	/** 选项标签 */
	label: string;
	/** 选项值 */
	value: string | number;
}
/**
 * 表单 Schema 接口
 * 用于动态生成游戏设置表单
 */
interface FormSchema {
	/** 内部使用的唯一 ID（UUID） */
	id: string;
	/** 提交给后端的字段名（例如 'age', 'role_id'） */
	key: string;
	/** 组件类型 */
	type: ComponentType;
	/** 标题 */
	label: string;
	/** 占位符文本（可选） */
	placeholder?: string;
	/**
	 * 默认值
	 * 可能是数字（输入框）或字符串/数字（下拉框）
	 */
	defaultValue?: number | string;
	/** 下拉选项（仅 select 有效） */
	options?: SelectOption[];
}
/**
 * 对话框基础选项接口
 */
interface DialogOption {
	/** 对话框标题 */
	title: string;
	/** 对话框内容（字符串或 UI Schema） */
	content: string | UISchema;
	/** 确认按钮文本（可选） */
	confirmText?: string;
	/** 取消按钮文本（可选） */
	cancelText?: string;
	/** 是否可关闭（可选） */
	closable?: boolean;
}
/**
 * 目标选择对话框选项接口
 * @template I - 目标选择类型
 */
interface TargetSelectDialogOption<I extends TargetSelectType> extends DialogOption {
	/** 目标选择类型 */
	type: I;
}
/**
 * 目标选择对话框结果接口
 * @template I - 目标选择类型
 */
interface TargetSelectDialogResult<I extends TargetSelectType> {
	/** 选中的目标 */
	target: TargetSelectResult[I];
}
/**
 * 目标选择结果映射
 * 根据目标类型返回相应的 ID 列表
 */
interface TargetSelectResult {
	/** 选择地图项 */
	[TargetSelectType.ToMapItem]: string[];
	/** 选择玩家 */
	[TargetSelectType.ToPlayer]: string[];
	/** 选择其他玩家 */
	[TargetSelectType.ToOtherPlayer]: string[];
	/** 选择自己 */
	[TargetSelectType.ToSelf]: string[];
	/** 选择地产 */
	[TargetSelectType.ToProperty]: string[];
}
/**
 * 确认对话框选项接口
 * @template I - 输入选项数组类型
 */
interface ConfirmDialogOption<I extends readonly InputOptionItem<string, any>[]> extends DialogOption {
	/** 输入选项列表（可选） */
	inputOptions?: I;
}
/**
 * 输入选项项接口
 * @template K - 键类型
 * @template D - 数据类型
 */
type InputOptionItem<K extends string, D> = {
	/** 选项键 */
	key: K;
	/** 选项标签 */
	label: string;
	/** 初始数据 */
	initData: D;
};
/**
 * 确认对话框结果接口
 * @template I - 输入选项数组类型
 */
type ConfirmDialogResult<I extends readonly InputOptionItem<string, any>[]> = {
	/** 确认状态 */
	confirm: boolean;
} & {
	[K in I[number]["key"]]: Extract<I[number], {
		key: K;
	}>["initData"];
};
/**
 * 物品选择对话框选项接口
 * @template T - 选择器项类型
 */
interface ItemSelectDialogOption<T = SelectorItem> extends Omit<DialogOption, "content"> {
	/** 物品列表 */
	itemList: Array<T>;
	/** 作为显示名称的键名（可选） */
	keyName?: keyof T;
	/** 多选数量限制 */
	/**
	 * - undefined 或不传: 单选
	 * - 0 或 1: 单选
	 * - >=2: 最多选择指定数量的物品
	 * - true: 多选（向后兼容，等同于物品总数）
	 * - false: 单选（向后兼容）
	 */
	multiple?: number | boolean;
	/** 列表列数（可选） */
	column?: number;
	/** 已选中的键列表（可选） */
	selectedKey?: string[];
	/** 对话框内容（字符串或 UI Schema），显示在物品列表之前（可选） */
	content?: string | UISchema;
}
/**
 * 选择器项接口
 */
interface SelectorItem {
	/** 物品 ID */
	id: string;
	/** 显示 UI */
	display: UISchema;
}
/**
 * 物品选择对话框结果接口
 */
interface ItemSelectDialogResult {
	/** 选中的物品 ID 列表 */
	selected: string[];
}
/**
 * 消息卡片选项接口
 */
interface MessageCardOption {
	/** 标题 */
	title: string;
	/** 内容（字符串或 UI Schema） */
	content: string | UISchema;
	/** 显示时长（毫秒） */
	duration: number;
}
/**
 * UI 模板接口
 */
interface UITemplate {
	/** 模板唯一标识 */
	id: string;
	/** 模板别名（用于 URL） */
	slug: string;
	/** 模板名称 */
	name: string;
	/** UI Schema */
	template: UISchema;
}
/**
 * UI Schema 接口
 * 定义游戏内 UI 组件的结构
 * 支持类似 Vue 的声明式 UI
 */
interface UISchema {
	/** 组件唯一标识 */
	id: string;
	/**
	 * 组件类型
	 * 支持基础 HTML 元素和 SVG 元素
	 */
	type: "div" | "span" | "img" | "button" | "text" | "svg" | "path" | "circle" | "rect" | "line" | "g";
	/** v-for 指令（可选） */
	vFor?: string;
	/** v-show 指令（可选） */
	vShow?: string;
	/** 静态样式（可选） */
	style?: Record<string, string>;
	/** 动态样式绑定（可选，支持 CSS） */
	styleBinding?: Record<string, string>;
	/** 静态属性（可选，如 src, class, d） */
	props?: Record<string, any>;
	/** 动态属性绑定（可选，支持表达式） */
	propsBinding?: Record<string, string>;
	/** 静态文本内容（可选） */
	content?: string;
	/** 文本绑定（可选） */
	textBinding?: string;
	/** 子组件列表（可选） */
	children?: UISchema[];
}
/**
 * 游戏数据接口
 * 用于同步游戏状态到客户端
 */
interface GameData {
	/** 导出数据（自定义扩展） */
	exportData: {
		[key: string]: any;
	};
	/** 当前回合玩家 ID */
	currentPlayerIdInRound: string;
	/** 当前回合数 */
	currentRound: number;
	/** 当前倍率 */
	currentMultiplier: number;
	/** 玩家列表 */
	players: PlayerInfo[];
	/** 地产列表 */
	properties: PropertyInfo[];
	/** 是否游戏结束 */
	isGameOver: boolean;
}
/**
 * 玩家信息接口
 * 用于同步玩家状态到客户端
 */
interface PlayerInfo {
	/** 玩家唯一标识 */
	id: string;
	/** 用户信息 */
	user: UserInRoomInfo;
	/** 骰子列表 */
	dices: DiceInfo[];
	/** 金钱数量 */
	money: number;
	/** 拥有的地产列表 */
	properties: PropertyInfo[];
	/** 拥有的机会卡列表 */
	chanceCards: ChanceCardClientInfo[];
	/** 玩家身上的 Buff 列表 */
	buff: Buff[];
	/** 当前位置索引 */
	positionIndex: number;
	/** 停止回合数 */
	stop: number;
	/** 是否破产 */
	isBankrupted: boolean;
	/** 是否离线 */
	isOffline: boolean;
	/** 玩家信息展示 UI Schema */
	infoDisplay: UISchema;
	/** 导出数据（自定义扩展） */
	exportData: Record<string, any>;
}
/**
 * 地产信息接口
 * 用于同步地产状态到客户端
 */
interface PropertyInfo {
	/** 地产唯一标识 */
	id: string;
	/** 地产名称 */
	name: string;
	/** 出售价格 */
	sellCost: number;
	/** 建造/升级费用 */
	buildCost: number;
	/** 当前等级 */
	level: number;
	/** 最大等级 */
	maxLevel: number;
	/** 各等级过路费列表 */
	costList: number[];
	/** 建筑模型 ID 列表 */
	buildingModelIdList?: string[];
	/** 地产所有者信息 */
	owner?: UserInRoomInfo;
	/** 自定义效果配置 */
	custom?: PropertyCustom;
	/** 导出数据（自定义扩展） */
	exportData: Record<string, any>;
	/** 自定义 UI */
	customUI: string | undefined;
}
/**
 * 地产自定义配置接口
 * 用于定义地产的特殊效果
 */
interface PropertyCustom {
	/** 效果代码（TypeScript 代码字符串） */
	effectCode: string;
	/** 效果描述 */
	description: string;
}
/**
 * 机会卡客户端信息接口
 * 用于显示机会卡信息（不包含 effectCode）
 */
interface ChanceCardClientInfo extends Omit<ChanceCardInstanceInfo, "effectCode"> {
}
/**
 * 机会卡实例信息接口
 * 表示一张具体的机会卡实例
 */
interface ChanceCardInstanceInfo extends ChanceCardInfo {
	/** 源 ID（指向 ChanceCardInfo） */
	sourceId: string;
}
/**
 * 机会卡信息接口
 * 定义机会卡的基本信息
 */
interface ChanceCardInfo {
	/** 机会卡唯一标识 */
	id: string;
	/** 机会卡名称 */
	name: string;
	/** 机会卡描述 */
	description: string;
	/** 图标 ID */
	iconId: string;
	/** 卡片颜色 */
	color: string;
	/** 效果代码（TypeScript 代码字符串） */
	effectCode: string;
	/** 目标选择类型 */
	type: TargetSelectType;
}
/**
 * Buff 接口
 * 表示玩家身上的临时效果
 */
interface Buff {
	/** Buff 唯一标识 */
	id: string;
	/** Buff 名称 */
	name: string;
	/** Buff 描述 */
	description: string;
	/** Buff 来源 */
	source: string;
	/** 触发时机名称 */
	triggerTiming: string;
	/** 剩余触发次数 */
	triggerTimes: number;
	/** 标签（用于分组、查找等） */
	tags?: string[];
}
declare enum GamePhaseMark {
	GameRoundStart = 0,
	PlayerRoundStart = 1,
	RollDice = 2,
	PlayerMove = 3,
	ArrivedEvent = 4,
	PlayerRoundEnd = 5,
	GameRoundEnd = 6
}
declare enum OperateType {
	GameInitFinished = "GameInitFinished",//前端加载完毕
	RollDice = "RollDice",//前端掷骰子
	UseChanceCard = "UseChanceCard",//使用机会卡
	Animation = "AnimationComplete",//前端动画完成回馈
	MapResourceLoaded = "MapResourceLoaded",//地图资源加载完毕
	PauseGame = "PauseGame",//房主暂停游戏
	ResumeGame = "ResumeGame",//房主恢复游戏
	ConfirmDialogResult = "ConfirmDialogResult",//由服务端主机调起的dialog的结果返回
	TargetSelectDialogResult = "TargetSelectDialogResult",//由服务端主机调起的dialog的结果返回
	ItemSelectDialogResult = "ItemSelectDialogResult"
}
/**
 * 命令接口，用于封装命令类型和负载数据
 * @template C - 命令映射类型
 * @template K - 命令类型的键
 */
type ICommand<C extends ICommandMap, K extends keyof C> = {
	/** 命令类型 */
	type: K;
	/** 命令负载数据 */
	payload: C[K]["payload"];
};
/**
 * 命令执行上下文接口
 * 用于在命令执行过程中传递状态和控制执行流程
 * @template C - 命令映射类型
 * @template K - 命令类型的键
 */
interface ICommandContext<C extends ICommandMap, K extends keyof C> {
	/** 取消命令执行 */
	cancel(): void;
	/** 设置命令执行结果 */
	setResult(result: C[K]["result"]): void;
	/** 命令执行结果（可选） */
	result?: C[K]["result"];
}
/**
 * 命令总线接口
 * 负责注册命令处理器和执行命令，支持修饰器系统
 * @template C - 命令映射类型
 */
interface ICommandBus<C extends ICommandMap> {
	/**
	 * 执行命令
	 * @param command - 要执行的命令
	 * @returns 命令执行结果
	 */
	execute<K extends keyof C>(command: ICommand<C, K>): Promise<C[K]["result"]>;
	/**
	 * 设置命令处理器
	 * @param type - 命令类型
	 * @param handler - 命令处理函数
	 */
	setHandler<K extends keyof C>(type: K, handler: (payload: C[K]["payload"]) => C[K]["result"] | Promise<C[K]["result"]>): void;
}
/**
 * 命令映射接口
 * 定义所有命令的负载（payload）和结果（result）类型
 * 用作命令总线的类型约束
 */
interface ICommandMap {
	/** 命令类型字符串 */
	[commandType: string]: {
		/** 命令负载数据类型 */
		payload: any;
		/** 命令执行结果类型 */
		result: any;
	};
}
/**
 * 地产命令映射
 * 定义所有与地产相关的命令类型、负载和结果
 */
interface PropertyCommandMap extends ICommandMap {
	/**
	 * 地产主人变更
	 */
	"property.owner.change": {
		payload: {
			oldOwner: IPlayer | undefined;
			newOwner: IPlayer | undefined;
		};
		result: {
			oldOwner: IPlayer | undefined;
			newOwner: IPlayer | undefined;
		};
	};
	/**
	 * 地产升级
	 */
	"property.level.up": {
		payload: {};
		result: {};
	};
	/**
	 * 地产降级
	 */
	"property.level.down": {
		payload: {};
		result: {};
	};
	/**
	 * 地产等级设置
	 */
	"property.level.set": {
		payload: {
			oldLevel: number;
			newLevel: number;
		};
		result: {
			oldLevel: number;
			newLevel: number;
		};
	};
	/**
	 * 玩家到达地产
	 */
	"property.arrived": {
		payload: {
			owner: IPlayer | undefined;
			arrivedPlayer: IPlayer;
			toll?: number;
		};
		result: {
			owner: IPlayer | undefined;
			arrivedPlayer: IPlayer;
			toll?: number;
		};
	};
}
/**
 * 玩家命令映射
 * 定义所有与玩家相关的命令类型、负载和结果
 */
interface PlayerCommandMap extends ICommandMap {
	/**
	 * 玩家获得地产
	 */
	"player.property.gain": {
		payload: {
			property: IProperty;
		};
		result: {
			property: IProperty;
		};
	};
	/**
	 * 玩家失去地产
	 */
	"player.property.lose": {
		payload: {
			property: IProperty;
		};
		result: {
			property: IProperty;
		};
	};
	/**
	 * 玩家获得机会卡
	 */
	"player.card.gain": {
		payload: {
			card: IChanceCard;
		};
		result: {
			card: IChanceCard;
		};
	};
	/**
	 * 玩家失去机会卡
	 */
	"player.card.lose": {
		payload: {
			cardId: string;
		};
		result: {
			cardId: string;
		};
	};
	/**
	 * 玩家获得金钱
	 */
	"player.money.gain": {
		payload: {
			money: number;
			source?: IPlayer;
		};
		result: {
			money: number;
			source?: IPlayer;
		};
	};
	/**
	 * 玩家失去金钱
	 */
	"player.money.lose": {
		payload: {
			money: number;
			target?: IPlayer;
		};
		result: {
			money: number;
			target?: IPlayer;
		};
	};
	/**
	 * 设置玩家停止回合数
	 */
	"player.stop": {
		payload: {
			stop: number;
		};
		result: {
			stop: number;
		};
	};
	/**
	 * 玩家行走指定步数
	 */
	"player.walk": {
		payload: {
			steps: number;
		};
		result: {
			steps: number;
		};
	};
	/**
	 * 玩家传送到指定位置
	 */
	"player.tp": {
		payload: {
			positionIndex: number;
		};
		result: {
			positionIndex: number;
		};
	};
	/**
	 * 设置玩家破产状态
	 */
	"player.bankrupted.set": {
		payload: {
			bankrupted: boolean;
		};
		result: {
			bankrupted: boolean;
		};
	};
	/**
	 * 玩家掷骰子
	 */
	"player.dice.roll": {
		payload: {
			dices: IDice[];
		};
		result: {
			diceResult: DiceResult[];
		};
	};
	/**
	 * 玩家添加骰子
	 */
	"player.dice.add": {
		payload: {
			newDice: IDice;
		};
		result: {
			newDice: IDice;
		};
	};
	/**
	 * 玩家移除骰子
	 */
	"player.dice.remove": {
		payload: {
			diceId: string;
		};
		result: {
			removeDice: IDice | undefined;
		};
	};
}
/**
 * 修饰器触发时机
 * - "before": 在命令执行前触发
 * - "after": 在命令执行后触发
 */
type ModifierTiming = "before" | "after";
/**
 * 修饰器元数据
 * 用于向 UI 展示修饰器信息
 */
type ModifierMeta = {
	/** 修饰器名称 */
	name: string;
	/** 触发时机名称 */
	timingName: string;
	/** 修饰器描述 */
	description: string;
	/** 修饰器来源 */
	source: string;
	/** 标签（用于分组、查找等） */
	tags?: string[];
};
/**
 * 修饰器描述符
 * 描述修饰器的基本信息和触发条件
 * @template C - 命令映射类型
 * @template K - 命令类型的键
 */
interface ModifierDescriptor<C extends ICommandMap, K extends keyof C = keyof C> {
	/** 修饰器唯一标识 */
	id: string;
	/** 触发时机（before/after） */
	timing: ModifierTiming;
	/** 要监听的命令类型 */
	commandType: K;
	/** 剩余触发次数（-1 表示无限） */
	remainingTriggers: number;
	/** 优先级（可选，数值越大优先级越高） */
	priority?: number;
	/** 可序列化的元数据（用于 UI 展示） */
	meta?: ModifierMeta;
}
/**
 * 修饰器接口
 * 用于在命令执行前后插入自定义逻辑（如 Buff、Debuff 系统）
 * @template C - 命令映射类型
 * @template K - 命令类型的键
 */
interface IModifier<C extends ICommandMap, K extends keyof C = keyof C> {
	/** 修饰器描述符 */
	descriptor: ModifierDescriptor<C, K>;
	/** 修饰器执行函数 */
	fn(command: ICommand<C, K>, context: ICommandContext<C, K>): Promise<void> | void;
}
/**
 * 修饰器管理器接口
 * 管理修饰器的注册、移除、查询和执行
 * @template C - 命令映射类型
 * @template K - 命令类型的键
 */
interface IModifierManager<C extends ICommandMap, K extends keyof C = keyof C> {
	/**
	 * 添加修饰器
	 * @param mod - 要添加的修饰器
	 * @returns 生成的修饰器 ID
	 */
	add<KK extends keyof C>(mod: IModifier<C, KK>): string;
	/**
	 * 根据 ID 移除修饰器
	 * @param id - 修饰器 ID
	 * @returns 是否成功移除
	 */
	removeById(id: string): boolean;
	/**
	 * 清空所有修饰器
	 */
	clear(): void;
	/**
	 * 按标签移除修饰器（如：净化逻辑）
	 * @param tag - 要移除的标签
	 */
	removeByTag(tag: string): void;
	/**
	 * 检查是否存在指定标签的 Buff
	 * @param tag - 标签
	 * @returns 是否存在
	 */
	hasBuffWithTag(tag: string): boolean;
	/**
	 * 获取可序列化的 Buff 列表
	 * @returns Buff 数组
	 */
	getBuffs(): Buff[];
	/**
	 * 获取所有修饰器列表
	 * @returns 修饰器数组
	 */
	getModifiersList(): IModifier<C, K>[];
	/**
	 * 获取指定命令和时机的修饰器
	 * @param cmd - 命令对象
	 * @param timing - 触发时机
	 * @returns 匹配的修饰器数组
	 */
	getFor(cmd: ICommand<C, K>, timing: ModifierTiming): IModifier<C, K>[];
	/**
	 * 在修饰器执行后衰减触发次数
	 * @param ids - 已执行的修饰器 ID 列表
	 */
	decayAfterExecution(ids: string[]): void;
}
/**
 * 游戏地图接口
 * 表示完整的游戏地图配置
 */
interface GameMap {
	/** 地图唯一标识 */
	id: string;
	/** 地图基本信息 */
	info: GameMapInfo;
	/** 地图项列表 */
	mapItems: MapItem[];
	/** 机会卡列表 */
	chanceCards: ChanceCardInfo[];
	/** 地图项类型列表 */
	mapItemTypes: MapItemType[];
	/** 地图索引（地图项 ID 顺序列表） */
	mapIndex: string[];
	/** 角色列表 */
	roles: Role[];
	/** 是否正在使用 */
	inUse: boolean;
	/** 地图事件列表 */
	mapEvents: MapEvent[];
	/** 游戏设置表单 Schema */
	gameSettingForm: FormSchema[];
	/** 游戏阶段配置 */
	phases: {
		/** 游戏结束规则阶段 */
		gameOverRule: GamePhaseInfo[];
		/** 游戏初始化阶段 */
		gameInited: GamePhaseInfo[];
		/** 玩家预初始化阶段（在玩家初始化之前运行） */
		playerPreInit: GamePhaseInfo[];
		/** 地皮预初始化阶段（在地皮初始化之前运行） */
		propertyPreInit: GamePhaseInfo[];
		/** 游戏回合开始阶段 */
		gameRoundStart: GamePhaseInfo[];
		/** 玩家回合阶段 */
		playerRound: GamePhaseInfo[];
		/** 游戏回合结束阶段 */
		gameRoundEnd: GamePhaseInfo[];
	};
	/** 建筑模型 ID 列表 */
	buildingModelIdList: string[];
	/** UI 模板列表 */
	uiTemplates: UITemplate[];
	/** 自定义 UI 列表 */
	customUIs: CustomUI[];
	/** 额外库代码（TypeScript 代码字符串） */
	extraLibs: string;
}
declare const enum SocketMsgType {
	Heart = "Heart",//心跳信息
	MsgNotify = "MsgNotify",//纯信息广播
	GameLog = "GameLog",//游戏过程信息广播
	UserList = "UserList",//大厅玩家信息广播
	RoomList = "RoomList",//房间列表广播
	JoinRoom = "JoinRoom",//加入房间
	LeaveRoom = "LeaveRoom",//离开房间
	RoomInfo = "RoomInfo",//房间信息广播
	RoomChat = "RoomChat",//房间聊天
	ReadyToggle = "ReadyToggle",//准备状态切换
	ChangeColor = "ChangeColor",//切换颜色
	KickOut = "KickOut",//踢出房间
	ChangeMap = "ChangeMap",//切换地图
	ChangeRole = "ChangeRole",//切换角色
	ChangeGameSetting = "ChangeGameSetting",//修改游戏设置信息
	GameStart = "GameStart",//游戏开始
	GameInit = "GameInit",//游戏初始化
	GameInitFinished = "GameInitFinished",//游戏初始化完成
	GameData = "GameData",//游戏信息广播
	GainMoney = "GainMoney",//玩家获得金钱
	CostMoney = "CostMoney",//玩家花费金钱
	RoundTurn = "RoundTurn",//更新当前回合轮到的玩家
	RollDiceStart = "RollDiceStart",//开始摇骰子
	RollDiceResult = "RollDiceResult",//掷骰子
	UseChanceCard = "UseChanceCard",//使用机会卡
	RemainingTime = "RemainingTime",//回合剩余时间
	RoundTimeOut = "RoundTimeOut",//回合超时
	PlayerWalk = "PlayerWalk",//位置移动方式1：玩家角色走路
	PlayerTp = "PlayerTp",//位置移动方式2：传送
	Operation = "Operation",//玩家操作
	Bankrupt = "Bankrupt",//破产
	GameOver = "GameOver",//游戏结束
	PauseGame = "PauseGame",//房主暂停游戏
	ResumeGame = "ResumeGame",//房主恢复游戏
	ConfirmDialog = "ConfirmDialog",//在客户端唤起确认dialog
	TargetSelectDialog = "TargetSelectDialog",//在客户端唤起目标选择dialog
	ItemSelectDialog = "ItemSelectDialog",//在客户端唤起自定义选择dialog
	MessageCard = "MessageCard",//在客户端唤起信息无交互的dialog
	UI = "UI"
}
declare enum SocketMsgSource {
	Client = "client",
	Server = "server"
}
declare enum ChatMessageType {
	Emoticon = 0,//表情
	Text = 1
}
/** Base64 编码字符串类型 */
type Base64String = string;
/**
 * 房间地图信息类型
 * 可以从服务器获取或使用自定义数据
 */
type RoomMapInfo = {
	from: "server";
	data: string;
} | {
	from: "custom";
	data: Base64String;
};
/**
 * Socket 消息接口
 * 定义客户端和服务器之间通信的消息格式
 * @template T - 消息类型
 * @template S - 消息来源（Client/Server）
 */
interface SocketMessage<T extends SocketMsgType = SocketMsgType, S extends SocketMsgSource = SocketMsgSource> {
	/** 消息类型 */
	type: T;
	/** 消息来源 */
	source: S;
	/** 消息数据（根据类型和来源有不同的数据格式） */
	data: SocketMessageDataType[T][S];
	/** 消息提示（可选） */
	msg?: {
		/** 提示类型 */
		type: "info" | "success" | "warning" | "error";
		/** 提示内容 */
		content: string;
	};
	/** 额外数据（可选） */
	extra?: any;
	/** 房间 ID（可选） */
	roomId?: string;
}
/**
 * 服务器 Socket 消息类型
 */
type ServerSocketMessage = {
	[K in SocketMsgType]: SocketMessage<K, SocketMsgSource.Server>;
}[SocketMsgType];
/**
 * 操作消息类型
 * 用于客户端发送操作请求
 */
type OperationMessage = {
	[T in OperateType]: {
		/** 操作类型 */
		operateType: T;
		/** 操作数据 */
		data: PlayerOperationResult[T];
	};
}[OperateType];
/**
 * Socket 消息数据类型映射
 * 定义每种消息类型在不同来源下的数据格式
 */
interface SocketMessageDataType {
	/**
	 * 心跳消息
	 * 用于保持连接活跃
	 */
	[SocketMsgType.Heart]: {
		/** 客户端发送的数据（无） */
		client: undefined;
		/** 服务器发送的数据（无） */
		server: undefined;
	};
	/**
	 * 消息通知
	 * 服务器向客户端发送消息提示
	 */
	[SocketMsgType.MsgNotify]: {
		/** 客户端发送的数据（不支持） */
		client: never;
		/** 服务器发送的数据（无） */
		server: undefined;
	};
	/**
	 * 游戏日志
	 * 服务器向客户端发送游戏日志
	 */
	[SocketMsgType.GameLog]: {
		/** 客户端发送的数据（不支持） */
		client: never;
		/** 服务器发送的游戏日志 */
		server: GameLog;
	};
	/**
	 * 用户列表
	 * 服务器向客户端发送用户列表
	 */
	[SocketMsgType.UserList]: {
		/** 客户端发送的数据（不支持） */
		client: never;
		/** 服务器发送的用户列表 */
		server: User[];
	};
	/**
	 * 房间列表
	 * 服务器向客户端发送房间列表
	 */
	[SocketMsgType.RoomList]: {
		/** 客户端发送的数据（不支持） */
		client: never;
		/** 服务器发送的房间列表 */
		server: Room[];
	};
	/**
	 * 加入房间
	 * 客户端请求加入房间
	 */
	[SocketMsgType.JoinRoom]: {
		/** 客户端发送的用户信息 */
		client: User;
		/** 服务器返回的房间 ID */
		server: {
			roomId: string;
		};
	};
	/**
	 * 离开房间
	 * 客户端请求离开房间
	 */
	[SocketMsgType.LeaveRoom]: {
		/** 客户端发送的数据（无） */
		client: undefined;
		/** 服务器返回的数据（无） */
		server: undefined;
	};
	/**
	 * 房间信息
	 * 服务器向客户端发送房间信息
	 */
	[SocketMsgType.RoomInfo]: {
		/** 客户端发送的数据（不支持） */
		client: never;
		/** 服务器发送的房间信息 */
		server: RoomInfo;
	};
	/**
	 * 房间聊天
	 * 客户端和服务器之间的聊天消息
	 */
	[SocketMsgType.RoomChat]: {
		/** 客户端发送的聊天内容 */
		client: string;
		/** 服务器返回的完整聊天消息 */
		server: ChatMessage;
	};
	/**
	 * 准备状态切换
	 * 客户端切换准备状态
	 */
	[SocketMsgType.ReadyToggle]: {
		/** 客户端发送的数据（无） */
		client: undefined;
		/** 服务器返回的数据（无） */
		server: undefined;
	};
	/**
	 * 更改颜色
	 * 客户端请求更改颜色
	 */
	[SocketMsgType.ChangeColor]: {
		/** 客户端发送的颜色 */
		client: string;
		/** 服务器返回的数据（不支持） */
		server: never;
	};
	/**
	 * 踢出玩家
	 * 房主踢出玩家
	 */
	[SocketMsgType.KickOut]: {
		/** 客户端发送的被踢玩家 ID */
		client: string;
		/** 服务器返回的数据（不支持） */
		server: never;
	};
	/**
	 * 更改地图
	 * 房主更改游戏地图
	 */
	[SocketMsgType.ChangeMap]: {
		/** 客户端发送的地图信息 */
		client: RoomMapInfo;
		/** 服务器返回的地图信息 */
		server: RoomMapInfo;
	};
	/**
	 * 更改角色
	 * 客户端请求更改角色
	 */
	[SocketMsgType.ChangeRole]: {
		/** 客户端发送的角色 ID */
		client: string;
		/** 服务器返回的角色 ID */
		server: string;
	};
	/**
	 * 更改游戏设置
	 * 房主更改游戏设置
	 */
	[SocketMsgType.ChangeGameSetting]: {
		/** 客户端发送的游戏设置 */
		client: GameSetting;
		/** 服务器返回的数据（不支持） */
		server: never;
	};
	/**
	 * 游戏开始
	 * 房主开始游戏
	 */
	[SocketMsgType.GameStart]: {
		/** 客户端发送的数据（无） */
		client: undefined;
		/** 服务器返回的数据（无） */
		server: undefined;
	};
	/**
	 * 游戏初始化
	 * 服务器向客户端发送游戏初始化数据
	 */
	[SocketMsgType.GameInit]: {
		/** 客户端发送的数据（不支持） */
		client: never;
		/** 服务器发送的游戏数据 */
		server: GameData;
	};
	/**
	 * 游戏初始化完成
	 * 客户端通知服务器游戏初始化完成
	 */
	[SocketMsgType.GameInitFinished]: {
		/** 客户端发送的数据（无） */
		client: undefined;
		/** 服务器返回的数据（无） */
		server: undefined;
	};
	/**
	 * 游戏数据
	 * 服务器向客户端同步游戏数据
	 */
	[SocketMsgType.GameData]: {
		/** 客户端发送的数据（不支持） */
		client: never;
		/** 服务器发送的游戏数据 */
		server: GameData;
	};
	/**
	 * 获得金钱
	 * 服务器通知玩家获得金钱
	 */
	[SocketMsgType.GainMoney]: {
		/** 客户端发送的数据（不支持） */
		client: never;
		/** 服务器发送的金钱信息 */
		server: {
			/** 获得金钱的玩家 */
			player: PlayerInfo;
			/** 获得的金钱数量 */
			money: number;
			/** 金钱来源玩家（可选） */
			source: PlayerInfo | undefined;
		};
	};
	/**
	 * 花费金钱
	 * 服务器通知玩家花费金钱
	 */
	[SocketMsgType.CostMoney]: {
		/** 客户端发送的数据（不支持） */
		client: never;
		/** 服务器发送的金钱信息 */
		server: {
			/** 花费金钱的玩家 */
			player: PlayerInfo;
			/** 花费的金钱数量 */
			money: number;
			/** 收取金钱的目标玩家（可选） */
			target: PlayerInfo | undefined;
		};
	};
	/**
	 * 回合轮换
	 * 服务器通知客户端进入新回合
	 */
	[SocketMsgType.RoundTurn]: {
		/** 客户端发送的数据（不支持） */
		client: never;
		/** 服务器返回的数据（无） */
		server: undefined;
	};
	/**
	 * 开始掷骰子
	 * 服务器通知客户端开始掷骰子动画
	 * @deprecated 未实现
	 */
	[SocketMsgType.RollDiceStart]: {
		/** 客户端发送的数据（不支持） */
		client: never;
		/** 服务器返回的掷骰子玩家 ID */
		server: string;
	};
	/**
	 * 掷骰子结果
	 * 服务器向客户端发送掷骰子结果
	 */
	[SocketMsgType.RollDiceResult]: {
		/** 客户端发送的数据（不支持） */
		client: never;
		/** 服务器发送的掷骰子结果 */
		server: {
			/** 掷骰子结果 */
			rollDiceResult: DiceResult[];
			/** 掷骰子玩家 ID */
			rollDicePlayerId: string;
		};
	};
	/**
	 * 使用机会卡
	 * 客户端使用机会卡
	 */
	[SocketMsgType.UseChanceCard]: {
		/** 客户端发送的数据（不支持） */
		client: never;
		/** 服务器返回的结果 */
		server: {
			error: boolean;
		};
	};
	/**
	 * 剩余时间
	 * 服务器向客户端发送倒计时剩余时间
	 */
	[SocketMsgType.RemainingTime]: {
		/** 客户端发送的数据（不支持） */
		client: never;
		/** 服务器发送的剩余时间信息 */
		server: {
			/** 事件消息 */
			eventMsg: string;
			/** 剩余时间（毫秒） */
			remainingTime: number;
		};
	};
	/**
	 * 回合超时
	 * 服务器通知客户端回合超时
	 * @deprecated 未实现
	 */
	[SocketMsgType.RoundTimeOut]: {
		/** 客户端发送的数据（不支持） */
		client: never;
		/** 服务器返回的数据（不支持） */
		server: never;
	};
	/**
	 * 玩家行走
	 * 服务器通知客户端玩家行走
	 */
	[SocketMsgType.PlayerWalk]: {
		/** 客户端发送的数据（不支持） */
		client: never;
		/** 服务器发送的行走信息 */
		server: {
			/** 行走的玩家 ID */
			playerId: string;
			/** 行走的步数 */
			step: number;
			/** 行走 ID */
			walkId: string;
		};
	};
	/**
	 * 玩家传送
	 * 服务器通知客户端玩家传送
	 */
	[SocketMsgType.PlayerTp]: {
		/** 客户端发送的数据（不支持） */
		client: never;
		/** 服务器发送的传送信息 */
		server: {
			/** 传送的玩家 ID */
			playerId: string;
			/** 目标位置索引 */
			positionIndex: number;
			/** 行走 ID */
			walkId: string;
		};
	};
	/**
	 * 操作
	 * 客户端向服务器发送操作请求
	 */
	[SocketMsgType.Operation]: {
		/** 客户端发送的操作消息 */
		client: OperationMessage;
		/** 服务器返回的数据（不支持） */
		server: never;
	};
	/**
	 * 破产
	 * 服务器通知客户端玩家破产
	 */
	[SocketMsgType.Bankrupt]: {
		/** 客户端发送的数据（不支持） */
		client: never;
		/** 服务器返回的数据（无） */
		server: never;
	};
	/**
	 * 游戏结束
	 * 服务器通知客户端游戏结束
	 */
	[SocketMsgType.GameOver]: {
		/** 客户端发送的数据（不支持） */
		client: never;
		/** 服务器返回的数据（无） */
		server: undefined;
	};
	/**
	 * 暂停游戏
	 * 客户端请求暂停游戏
	 */
	[SocketMsgType.PauseGame]: {
		/** 客户端发送的数据（无） */
		client: undefined;
		/** 服务器返回的数据（无） */
		server: undefined;
	};
	/**
	 * 恢复游戏
	 * 客户端请求恢复游戏
	 */
	[SocketMsgType.ResumeGame]: {
		/** 客户端发送的数据（无） */
		client: undefined;
		/** 服务器返回的数据（无） */
		server: undefined;
	};
	/**
	 * 确认对话框
	 * 服务器向客户端显示确认对话框
	 */
	[SocketMsgType.ConfirmDialog]: {
		/** 客户端发送的数据（不支持） */
		client: undefined;
		/** 服务器发送的对话框选项 */
		server: {
			/** 玩家 ID */
			playerId: string;
			/** 对话框选项 */
			option: ConfirmDialogOption<InputOptionItem<string, any>[]>;
		};
	};
	/**
	 * 目标选择对话框
	 * 服务器向客户端显示目标选择对话框
	 */
	[SocketMsgType.TargetSelectDialog]: {
		/** 客户端发送的数据（不支持） */
		client: undefined;
		/** 服务器发送的对话框选项 */
		server: {
			/** 玩家 ID */
			playerId: string;
			/** 对话框选项 */
			option: TargetSelectDialogOption<TargetSelectType>;
		};
	};
	/**
	 * 物品选择对话框
	 * 服务器向客户端显示物品选择对话框
	 */
	[SocketMsgType.ItemSelectDialog]: {
		/** 客户端发送的数据（不支持） */
		client: undefined;
		/** 服务器发送的对话框选项 */
		server: {
			/** 玩家 ID */
			playerId: string;
			/** 对话框选项 */
			option: ItemSelectDialogOption;
		};
	};
	/**
	 * 消息卡片
	 * 服务器向客户端显示消息卡片
	 */
	[SocketMsgType.MessageCard]: {
		/** 客户端发送的数据（不支持） */
		client: undefined;
		/** 服务器发送的消息卡片选项 */
		server: {
			/** 消息卡片选项 */
			option: MessageCardOption;
		};
	};
	/**
	 * UI 更新
	 * 服务器通知客户端更新 UI
	 */
	[SocketMsgType.UI]: {
		/** 客户端发送的数据（不支持） */
		client: undefined;
		/** 服务器返回的数据（无） */
		server: undefined;
	};
}
/**
 * 房间接口
 * 表示游戏房间的基本信息
 */
interface Room {
	/** 房间 ID */
	roomId: string;
	/** 房主 ID */
	ownerId: string;
	/** 房主名称 */
	ownerName: string;
	/** 房间内用户数量 */
	userNum: number;
}
/**
 * 房间信息接口
 * 表示房间的详细信息
 */
interface RoomInfo {
	/** 房间 ID */
	roomId: string;
	/** 房间内用户列表 */
	userList: Array<User>;
	/** 游戏是否已开始 */
	isStarted: boolean;
	/** 房主 ID */
	ownerId: string;
	/** 房主名称 */
	ownerName: string;
	/** 游戏设置 */
	gameSetting: GameSetting;
}
/**
 * 聊天消息接口
 */
interface ChatMessage {
	/** 消息唯一标识 */
	id: string;
	/** 消息类型 */
	type: ChatMessageType;
	/** 发送消息的用户 */
	user: User;
	/** 消息内容 */
	content: string;
	/** 消息时间戳 */
	time: number;
}
/**
 * 游戏日志接口
 */
interface GameLog {
	/** 日志唯一标识 */
	id: string;
	/** 日志时间戳 */
	time: number;
	/** 日志内容 */
	content: string;
}
/**
 * 玩家操作结果接口
 * 定义每种操作类型对应的结果数据
 */
interface PlayerOperationResult {
	/** 游戏初始化完成 */
	[OperateType.GameInitFinished]: undefined;
	/** 掷骰子 */
	[OperateType.RollDice]: undefined;
	/** 使用机会卡 */
	[OperateType.UseChanceCard]: {
		/** 机会卡 ID */
		chanceCardId: string;
		/** 目标 ID 列表 */
		targetIdList: string[];
	};
	/** 播放动画 */
	[OperateType.Animation]: string;
	/** 地图资源加载完成 */
	[OperateType.MapResourceLoaded]: undefined;
	/** 暂停游戏 */
	[OperateType.PauseGame]: undefined;
	/** 恢复游戏 */
	[OperateType.ResumeGame]: undefined;
	/** 确认对话框结果 */
	[OperateType.ConfirmDialogResult]: {
		/** 对话框 ID */
		id: string;
		/** 是否确认 */
		confirm: boolean;
		/** 对话框数据 */
		data: any;
	};
	/** 目标选择对话框结果 */
	[OperateType.TargetSelectDialogResult]: TargetSelectDialogResult<TargetSelectType>;
	/** 物品选择对话框结果 */
	[OperateType.ItemSelectDialogResult]: ItemSelectDialogResult;
}
declare type EventType = string | symbol;
declare type Handler<T = unknown> = (event: T) => void;
declare type WildcardHandler<T = Record<string, unknown>> = (type: keyof T, event: T[keyof T]) => void;
declare type EventHandlerList<T = unknown> = Array<Handler<T>>;
declare type WildCardEventHandlerList<T = Record<string, unknown>> = Array<WildcardHandler<T>>;
declare type EventHandlerMap<Events extends Record<EventType, unknown>> = Map<keyof Events | "*", EventHandlerList<Events[keyof Events]> | WildCardEventHandlerList<Events>>;
interface Emitter<Events extends Record<EventType, unknown>> {
	all: EventHandlerMap<Events>;
	on<Key extends keyof Events>(type: Key, handler: Handler<Events[Key]>): void;
	on(type: "*", handler: WildcardHandler<Events>): void;
	off<Key extends keyof Events>(type: Key, handler?: Handler<Events[Key]>): void;
	off(type: "*", handler: WildcardHandler<Events>): void;
	emit<Key extends keyof Events>(type: Key, event: Events[Key]): void;
	emit<Key extends keyof Events>(type: undefined extends Events[Key] ? Key : never): void;
}
/**
 * 游戏设置类型
 * 键值对形式的游戏配置项
 */
interface GameSetting {
	[key: string]: {
		label: string;
		value: any;
		displayValue: any;
	};
}
/**
 * 游戏进程自定义字段接口
 * 允许通过 declare module 扩展游戏进程的额外字段
 */
interface IGameProcessCustomFields {
}
/**
 * 游戏进程导出数据接口
 * 允许通过 declare module 扩展游戏进程的导出数据
 */
interface IGameProcessExportData {
}
/**
 * 游戏进程接口
 * 核心游戏逻辑接口，管理游戏状态、玩家、地产、事件等
 */
interface IGameProcess extends IGameProcessCustomFields {
	/** 事件总线（使用 mitt） */
	eventBus: Emitter<GameRuntimeEvent>;
	/** 导出数据（用于序列化和自定义扩展） */
	exportData: IGameProcessExportData;
	/** 游戏地图数据 */
	mapData: GameMap;
	/** 游戏设置 */
	gameSetting: GameSetting;
	/** 玩家映射表（ID -> 玩家对象） */
	players: Map<string, IPlayer>;
	/** 地产映射表（ID -> 地产对象） */
	properties: Map<string, IProperty>;
	/** 机会卡信息映射表（ID -> 机会卡信息） */
	chanceCardInfos: Map<string, ChanceCardInfo>;
	/** 当前回合玩家 */
	currentRoundPlayer: IPlayer | null;
	/** 当前回合数 */
	currentRound: number;
	/** 游戏运行时栈（事件队列管理） */
	gameRuntimeStack: IGameRuntimeStack<GameContext>;
	/** 回合倒计时定时器 */
	roundTimeTimer: IRoundTimeTimer;
	/** 游戏结束规则检查函数 */
	gameOverRuleFunction: () => Promise<boolean>;
	/**
	 * 处理玩家购买地产
	 * @param player - 购买地产的玩家
	 * @param property - 要购买的地产
	 */
	handlePlayerBuyProperty(player: IPlayer, property: IProperty): Promise<void>;
	/**
	 * 处理玩家升级地产
	 * @param player - 升级地产的玩家
	 * @param property - 要升级的地产
	 */
	handlePlayerBuildUp(player: IPlayer, property: IProperty): Promise<void>;
	/**
	 * 处理玩家到达事件
	 * @param arrivedPlayer - 到达的玩家
	 */
	handleArriveEvent(arrivedPlayer: IPlayer): Promise<void>;
	/**
	 * 处理使用机会卡
	 * @param sourcePlayer - 使用机会卡的玩家
	 * @param chanceCardId - 机会卡 ID
	 * @param targetIdList - 目标 ID 列表
	 * @returns 是否成功使用
	 */
	handleUseChanceCard(sourcePlayer: IPlayer, chanceCardId: string, targetIdList: string[]): Promise<boolean>;
	/**
	 * 回合轮换通知
	 * @param playerId - 轮到的玩家 ID
	 */
	roundTurnNotify(playerId: string): void;
	/**
	 * 发送玩家操作事件
	 * @param playerId - 玩家 ID
	 * @param operationType - 操作类型
	 * @param data - 操作数据
	 */
	emitPlayerOperation<T extends OperateType>(playerId: string, operationType: T, data: PlayerOperationResult[T]): void;
	/**
	 * 监听单次玩家操作（异步）
	 * @param playerId - 玩家 ID
	 * @param operationType - 操作类型
	 * @returns 操作结果
	 */
	oncePlayerOperationAsync<T extends OperateType>(playerId: string, operationType: T): Promise<PlayerOperationResult[T]>;
	/**
	 * 监听玩家操作（异步，持续监听）
	 * @param playerId - 玩家 ID
	 * @param operationType - 操作类型
	 * @returns 操作结果
	 */
	onPlayerOperationAsync<T extends OperateType>(playerId: string, operationType: T): Promise<PlayerOperationResult[T]>;
	/**
	 * 监听单次玩家操作（回调方式）
	 * @param playerId - 玩家 ID
	 * @param operationType - 操作类型
	 * @param callback - 回调函数
	 */
	oncePlayerOperation<T extends OperateType>(playerId: string, operationType: T, callback: (res: PlayerOperationResult[T]) => void): void;
	/**
	 * 监听玩家操作（持续监听，回调方式）
	 * @param playerId - 玩家 ID
	 * @param operationType - 操作类型
	 * @param callback - 回调函数
	 */
	onPlayerOperation<T extends OperateType>(playerId: string, operationType: T, callback: (res: PlayerOperationResult[T]) => void): void;
	/**
	 * 移除玩家操作监听器
	 * @param playerId - 玩家 ID
	 * @param operationType - 操作类型
	 * @param listener - 监听器函数
	 */
	removePlayerOperationListener<T extends OperateType>(playerId: string, operationType: T, listener: (...args: any[]) => PlayerOperationResult[T]): void;
	/**
	 * 移除玩家所有操作监听器
	 * @param playerId - 玩家 ID
	 * @param operationType - 操作类型（可选，不指定则移除所有类型）
	 */
	removePlayerAllOperationListener<T extends OperateType>(playerId: string, operationType?: T): void;
	/**
	 * 将游戏事件推入栈
	 * @param gameEvent - 游戏事件
	 */
	pushEventToStack(gameEvent: GameEvent<GameContext>): void;
	/**
	 * 创建新的机会卡实例
	 * @param sourceId - 机会卡源 ID
	 * @returns 机会卡对象
	 */
	createNewChanceCard(sourceId: string): IChanceCard;
	/**
	 * 创建游戏链接项
	 * @param type - 链接项类型
	 * @param id - ID
	 */
	createGameLinkItem(type: GameLinkItem, id: string): void;
	/**
	 * 发送消息给指定玩家
	 * @param id - 玩家 ID
	 * @param msg - 服务器消息
	 */
	sendToPlayer(id: string, msg: ServerSocketMessage): void;
	/**
	 * 广播游戏数据给所有玩家
	 */
	gameDataBroadcast(): void;
	/**
	 * 广播游戏消息通知
	 * @param type - 消息类型（success/warning/error/info）
	 * @param msg - 消息内容
	 */
	gameMsgNotifyBroadcast(type: "success" | "warning" | "error" | "info", msg: string): void;
	/**
	 * 广播游戏日志
	 * @param log - 日志内容
	 */
	gameLogBroadcast(log: string): void;
	/**
	 * 广播消息给所有玩家
	 * @param msg - 服务器消息
	 */
	gameBroadcast(msg: ServerSocketMessage): void;
	/**
	 * 显示确认对话框
	 * @param playerId - 玩家 ID
	 * @param option - 对话框选项
	 * @returns 对话框结果
	 */
	showConfirmDialog<I extends InputOptionItem<string, any>[]>(playerId: string, option: ConfirmDialogOption<I>): Promise<ConfirmDialogResult<I>>;
	/**
	 * 显示目标选择对话框
	 * @param playerId - 玩家 ID
	 * @param option - 对话框选项
	 * @returns 对话框结果
	 */
	showTargetSelectDialog<I extends TargetSelectType>(playerId: string, option: TargetSelectDialogOption<I>): Promise<TargetSelectDialogResult<I>>;
	/**
	 * 显示物品选择对话框
	 * @param playerId - 玩家 ID
	 * @param option - 对话框选项
	 * @returns 对话框结果
	 */
	showItemSelectDialog(playerId: string, option: ItemSelectDialogOption): Promise<ItemSelectDialogResult>;
	/**
	 * 显示消息卡片
	 * @param playerIds - 玩家 ID 列表
	 * @param option - 消息卡片选项
	 */
	showMessageCard(playerIds: string[], option: MessageCardOption): Promise<void>;
	/**
	 * 检查游戏是否结束
	 */
	checkGameOver(): Promise<void>;
}
/**
 * 玩家接口
 * 表示游戏中的玩家实体
 */
interface IPlayer {
	/** 玩家唯一标识 */
	id: string;
	/** 玩家名称 */
	name: string;
	/** 角色 ID */
	roleId: string;
	/** 玩家金钱 */
	money: number;
	/** 玩家拥有的地产列表 */
	properties: IProperty[];
	/** 玩家拥有的机会卡列表 */
	chanceCards: IChanceCard[];
	/** 当前位置索引 */
	positionIndex: number;
	/** 是否停止回合（废弃，使用 stop） */
	isStop: number;
	/** 是否破产 */
	isBankrupted: boolean;
	/** 是否离线 */
	isOffline: boolean;
	/** 停止回合数 */
	stop: number;
	/** 玩家回合阶段列表 */
	roundPhases: IGamePhase<GameContext>[];
	/** 玩家的骰子列表 */
	dices: IDice[];
	/** 玩家信息展示 UI Schema */
	infoDisplay: UISchema;
	/** 导出数据（用于序列化和自定义扩展） */
	exportData: Record<string, any>;
	/**
	 * 获取用户信息
	 * @returns 用户信息
	 */
	getUser: () => UserInRoomInfo;
	/**
	 * 设置地产列表
	 * @param newPropertiesList - 新的地产列表
	 */
	setPropertiesList: (newPropertiesList: IProperty[]) => void;
	/**
	 * 获得地产
	 * @param property - 要获得的地产
	 */
	gainProperty: (property: IProperty) => Promise<void>;
	/**
	 * 失去地产
	 * @param property - 要失去的地产
	 */
	loseProperty: (property: IProperty) => Promise<void>;
	/**
	 * 设置机会卡列表
	 * @param newChanceCardList - 新的机会卡列表
	 */
	setCardsList: (newChanceCardList: IChanceCard[]) => void;
	/**
	 * 根据 ID 获取机会卡
	 * @param cardId - 机会卡 ID
	 * @returns 机会卡对象或 undefined
	 */
	getCardById: (cardId: string) => IChanceCard | undefined;
	/**
	 * 获得机会卡
	 * @param gainCard - 要获得的机会卡
	 */
	gainCard: (gainCard: IChanceCard) => Promise<void>;
	/**
	 * 失去机会卡
	 * @param cardId - 要失去的机会卡 ID
	 */
	loseCard: (cardId: string) => Promise<void>;
	/**
	 * 设置金钱
	 * @param money - 新的金钱数量
	 */
	setMoney: (money: number) => void;
	/**
	 * 花费金钱
	 * @param money - 要花费的金钱数量
	 * @param target - 收取金钱的目标玩家（可选）
	 */
	cost: (money: number, target?: IPlayer) => Promise<void>;
	/**
	 * 获得金钱
	 * @param money - 要获得的金钱数量
	 * @param source - 金钱来源玩家（可选）
	 */
	gain: (money: number, source?: IPlayer) => Promise<void>;
	/**
	 * 设置停止回合数
	 * @param stop - 停止回合数
	 */
	setStop: (stop: number) => void;
	/**
	 * 设置位置索引
	 * @param newIndex - 新的位置索引
	 */
	setPositionIndex: (newIndex: number) => void;
	/**
	 * 设置破产状态
	 * @param isBankrupted - 是否破产
	 */
	setBankrupted: (isBankrupted: boolean) => void;
	/**
	 * 行走指定步数
	 * @param step - 步数
	 */
	walk: (step: number) => Promise<void>;
	/**
	 * 传送到指定位置
	 * @param positionIndex - 目标位置索引
	 */
	tp: (positionIndex: number) => Promise<void>;
	/**
	 * 掷骰子
	 * @returns 骰子结果数组
	 */
	rollDices: () => Promise<DiceResult[]>;
	/**
	 * 添加骰子
	 * @param diceValue - 骰子初始值（可选）
	 * @returns 新添加的骰子
	 */
	addDice: (diceValue?: number[]) => Promise<IDice>;
	/**
	 * 移除骰子
	 * @param id - 骰子 ID
	 * @returns 被移除的骰子或 undefined
	 */
	removeDice: (id: string) => Promise<IDice | undefined>;
	/** 玩家命令总线 */
	commandBus: ICommandBus<PlayerCommandMap>;
	/** 玩家修饰器管理器 */
	modifierManager: IModifierManager<PlayerCommandMap>;
	/**
	 * 获取玩家信息
	 * @returns 玩家信息
	 */
	getPlayerInfo: () => PlayerInfo;
	/**
	 * 获取回合阶段列表
	 * @returns 回合阶段列表
	 */
	getRoundPhases: () => IGamePhase<GameContext>[];
}
/**
 * 地产接口
 * 表示游戏中的地产实体
 */
interface IProperty {
	/** 地产唯一标识 */
	id: string;
	/** 地产名称 */
	name: string;
	/** 当前等级 */
	level: number;
	/** 最大等级 */
	maxLevel: number;
	/** 出售价格 */
	sellCost: number;
	/** 建造/升级费用 */
	buildCost: number;
	/** 各等级过路费列表 */
	costList: number[];
	/** 建筑模型 ID 列表 */
	buildingModelIdList: string[] | undefined;
	/** 自定义效果配置 */
	custom: PropertyCustom | undefined;
	/** 地产所有者 */
	owner: IPlayer | undefined;
	/** 导出数据（用于序列化和自定义扩展） */
	exportData: Record<string, any>;
	/**
	 * 获取原始数据
	 * @returns 地产信息
	 */
	getOriginalData: () => PropertyInfo;
	/**
	 * 升级地产
	 */
	levelUp: () => Promise<void>;
	/**
	 * 降级地产
	 */
	levelDown: () => Promise<void>;
	/**
	 * 设置地产所有者
	 * @param player - 新的所有者（undefined 表示无主）
	 */
	setOwner: (player: IPlayer | undefined) => Promise<void>;
	/**
	 * 设置地产等级
	 * @param level - 新的等级
	 */
	setLevel: (level: number) => Promise<void>;
	/**
	 * 玩家到达地产
	 * @param player - 到达的玩家
	 */
	arrived: (player: IPlayer) => Promise<void>;
	/**
	 * 获取地产信息
	 * @returns 地产信息
	 */
	getPropertyInfo: () => PropertyInfo;
	/** 地产命令总线 */
	commandBus: ICommandBus<PropertyCommandMap>;
	/**
	 * 注册修饰器
	 * @param modifier - 要注册的修饰器
	 */
	registerModifier: <K extends keyof PropertyCommandMap>(modifier: IModifier<PropertyCommandMap, K>) => void;
}
/**
 * 机会卡接口
 * 表示游戏中的机会卡实体
 */
interface IChanceCard {
	/**
	 * 获取机会卡 ID
	 * @returns 机会卡 ID
	 */
	getId: () => string;
	/**
	 * 获取源 ID
	 * @returns 源 ID
	 */
	getSourceId: () => string;
	/**
	 * 获取机会卡名称
	 * @returns 机会卡名称
	 */
	getName: () => string;
	/**
	 * 获取机会卡描述
	 * @returns 机会卡描述
	 */
	getDescribe: () => string;
	/**
	 * 获取机会卡图标
	 * @returns 图标 ID
	 */
	getIcon: () => string;
	/**
	 * 获取机会卡类型
	 * @returns 目标选择类型
	 */
	getType: () => TargetSelectType;
	/**
	 * 获取机会卡颜色
	 * @returns 颜色
	 */
	getColor: () => string;
	/**
	 * 获取效果代码
	 * @returns 效果代码
	 */
	getEffectCode: () => string;
	/**
	 * 使用机会卡
	 * @param sourcePlayer - 使用机会卡的玩家
	 * @param target - 目标（玩家、地产或它们的数组）
	 * @param gameProcess - 游戏进程
	 */
	use: (sourcePlayer: IPlayer, target: IPlayer | IProperty | IPlayer[] | IProperty[], gameProcess: IGameProcess) => Promise<void>;
	/**
	 * 获取机会卡信息
	 * @returns 机会卡信息
	 */
	getChanceCardInfo: () => ChanceCardClientInfo;
}
/**
 * 游戏上下文接口
 * 用于在事件执行过程中传递状态
 */
type GameContext = {
	/** 是否取消事件执行 */
	cancel?: boolean;
} & Record<string, any>;
/**
 * 游戏运行时栈接口
 * 管理游戏事件的执行栈（事件队列）
 * @template Context - 上下文类型
 */
interface IGameRuntimeStack<Context extends GameContext> {
	/** 事件栈 */
	stack: GameEvent<Context>[];
	/**
	 * 运行事件栈
	 * @param context - 执行上下文
	 * @param gameProcess - 游戏进程
	 */
	run(context: Context, gameProcess: IGameProcess): Promise<void>;
	/**
	 * 检查栈是否为空
	 * @returns 是否为空
	 */
	isEmpty(): boolean;
	/**
	 * 将事件推入栈
	 * @param gameEvents - 要推入的事件
	 */
	push(...gameEvents: GameEvent<Context>[]): void;
	/**
	 * 从栈中弹出事件
	 * @returns 弹出的事件或 undefined
	 */
	pop(): GameEvent<Context> | undefined;
}
/**
 * 游戏事件函数类型
 * 定义游戏事件的执行函数签名
 * @template Context - 上下文类型
 */
type GameEventFunction<Context extends GameContext> = (ctx: Context, gameProcess: IGameProcess) => Promise<void> | void;
/**
 * 游戏事件类型
 * 游戏循环中的最基础的执行单位
 * @template Context - 上下文类型
 */
type GameEvent<Context extends GameContext> = {
	/** 事件执行函数 */
	fn: GameEventFunction<Context>;
	/** 事件键（可选，用于标识和移除事件） */
	key?: string;
};
/**
 * 游戏阶段信息接口
 * 定义游戏阶段的基本信息
 */
interface GamePhaseInfo {
	/** 阶段唯一标识 */
	id: string;
	/** 阶段名称 */
	name: string;
	/** 阶段描述 */
	description: string;
	/** 阶段标记（可选） */
	mark?: GamePhaseMark;
	/** 阶段来源（地图编辑器中定义） */
	from: string;
	/** 初始化事件代码（TypeScript 代码字符串） */
	initEventCode: string;
}
type ModifierTiming$1 = "before" | "after";
/**
 * 游戏阶段接口
 * 表示游戏中的一个阶段（如：回合开始、掷骰子、移动等）
 * @template Context - 上下文类型
 */
interface IGamePhase<Context extends GameContext> extends GamePhaseInfo {
	/** 事件队列 */
	eventQueue: GameEvent<Context>[];
	/**
	 * 在指定时机使用事件
	 * @param tiggerTime - 触发时机（before/after）
	 * @param fn - 事件函数
	 * @param key - 事件键（可选）
	 */
	use(tiggerTime: ModifierTiming$1, fn: GameEventFunction<Context>, key?: string): void;
	/**
	 * 获取事件队列
	 * @returns 事件队列
	 */
	getEventQueue(): GameEvent<Context>[];
}
/**
 * 游戏回合开始上下文
 */
interface GameRoundStartContext extends GameContext {
}
/**
 * 玩家回合上下文
 */
interface PlayerRoundContext extends GameContext {
	/** 当前回合玩家 */
	currentRoundPlayer: IPlayer;
}
/**
 * 玩家回合开始上下文
 */
interface PlayerRoundStartContext extends PlayerRoundContext {
}
/**
 * 掷骰子上下文
 */
interface RollDiceContext extends PlayerRoundStartContext {
	/** 骰子结果 */
	diceResult: DiceResult[];
}
/**
 * 玩家移动上下文
 */
interface PlayerMoveContext extends RollDiceContext {
	/** 移动类型 */
	type: PlayerMoveType;
	/** 目标位置索引 */
	targetIndex: number;
}
/**
 * 到达事件上下文
 */
interface ArrivedEventContext extends PlayerMoveContext {
	/** 到达的地产信息 */
	arrivedProperty: PropertyInfo;
}
/**
 * 玩家回合结束上下文
 */
interface PlayerRoundEndContext extends ArrivedEventContext {
}
/**
 * 游戏回合结束上下文
 */
interface GameRoundEndContext extends GameContext {
}
/**
 * 游戏运行时事件类型
 * 定义事件总线支持的所有事件类型
 */
type GameRuntimeEvent = {
	/** 游戏回合开始 */
	"game.round.start": void;
	/** 游戏回合结束 */
	"game.round.end": void;
	/** 玩家回合开始 */
	"player.round.start": {
		player: IPlayer;
	};
	/** 玩家回合结束 */
	"player.round.end": {
		player: IPlayer;
	};
	/** 玩家到达某位置 */
	"player.arrived": {
		positionIndex: number;
		player: IPlayer;
	};
	/** 玩家经过某位置 */
	"player.passed": {
		passedMapItemsId: string[];
		player: IPlayer;
	};
} & Record<string, any>;
/**
 * 语义化版本类型
 * 格式：主版本号.次版本号.修订号
 */
type SemVer = `${number}.${number}.${number}`;
/**
 * 游戏地图信息接口
 */
interface GameMapInfo {
	/** 地图名称 */
	name: string;
	/** 地图作者 */
	author: string;
	/** 地图版本 */
	version: SemVer;
	/** 地图描述 */
	description: string;
	/** 地图编辑器版本 */
	editorVersion: string;
	/** 背景图片 ID */
	backgroundImageId: string;
	/** 封面图片 ID */
	coverImageId: string;
}
/**
 * 用户接口
 * 表示游戏用户的基本信息
 */
interface User {
	/** 用户唯一标识 */
	userId: string;
	/** 用户名 */
	username: string;
	/** 是否准备就绪 */
	isReady: boolean;
	/** 头像 */
	avatar: string;
	/** 颜色 */
	color: string;
}
/**
 * 房间内用户信息接口
 * 包含用户和所选角色 ID
 */
interface UserInRoomInfo extends User {
	/** 所选角色 ID */
	roleId: string;
}
/**
 * 地图项接口
 * 表示地图上的一个元素（如地产、特殊格等）
 */
interface MapItem {
	/** 地图项唯一标识 */
	id: string;
	/** 地图项类型 */
	type: MapItemType;
	/** X 坐标 */
	x: number;
	/** Y 坐标 */
	y: number;
	/** 旋转角度（0, 1, 2, 3 对应 0°, 90°, 180°, 270°） */
	rotation: 0 | 1 | 2 | 3;
	/** 关联的地图事件 ID（可选） */
	mapEventId?: string;
	/** 链接到其他地图项（可选） */
	linkto?: string;
	/** 被链接的地图项 ID（可选） */
	beLinked?: string;
	/** 地产信息（可选） */
	property?: PropertyInfo;
}
/**
 * 角色接口
 * 表示游戏中的可选角色
 */
interface Role {
	/** 角色唯一标识 */
	id: string;
	/** 角色名称 */
	name: string;
	/** 角色描述 */
	description: string;
	/** 角色颜色 */
	color: string;
	/** 角色图片 ID */
	imageId: string;
	/** 角色初始化代码（TypeScript 代码字符串） */
	initCode: string;
}
/**
 * 地图项类型接口
 * 定义地图项的基本属性
 */
interface MapItemType {
	/** 类型唯一标识 */
	id: string;
	/** 类型颜色 */
	color: string;
	/** 类型名称 */
	name: string;
	/** 模型 ID */
	modelId: string;
	/** 类型大小 */
	size: number;
}
/**
 * 地图事件接口
 * 定义地图上的特殊事件
 */
interface MapEvent {
	/** 事件唯一标识 */
	id: string;
	/** 事件类型 */
	type: MapEventType;
	/** 事件名称 */
	name: string;
	/** 事件描述 */
	description: string;
	/** 事件图标 ID */
	iconId: string;
	/** 事件效果代码（TypeScript 代码字符串） */
	effectCode: string;
}
/**
 * 自定义 UI 接口
 * 表示游戏内自定义 UI 组件
 */
interface CustomUI {
	/** 自定义 UI 唯一标识 */
	id: string;
	/** 自定义 UI 名称 */
	name: string;
	/** UI 布局 */
	layout: {
		/** X 坐标 */
		x: number;
		/** Y 坐标 */
		y: number;
		/** 宽度 */
		width: number;
		/** 高度 */
		height: number;
	};
	/** UI Schema（字符串形式） */
	uiSchema: string;
}
