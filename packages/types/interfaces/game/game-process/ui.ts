import { TargetSelectType } from "../../../../types/enums/game/game";

/**
 * 对话框基础选项接口
 */
//Dialog
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
// 目标选择Dialog
export interface TargetSelectDialogOption<I extends TargetSelectType> extends DialogOption {
	/** 目标选择类型 */
	type: I;
}

/**
 * 目标选择对话框结果接口
 * @template I - 目标选择类型
 */
export interface TargetSelectDialogResult<I extends TargetSelectType> {
	/** 选中的目标 */
	target: TargetSelectResult[I];
}

/**
 * 目标选择结果映射
 * 根据目标类型返回相应的 ID 列表
 */
export interface TargetSelectResult {
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
// 确认Dialog
export interface ConfirmDialogOption<I extends readonly InputOptionItem<string, any>[]> extends DialogOption {
	/** 输入选项列表（可选） */
	inputOptions?: I;
}

/**
 * 输入选项项接口
 * @template K - 键类型
 * @template D - 数据类型
 */
export type InputOptionItem<K extends string, D> = {
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
export type ConfirmDialogResult<I extends readonly InputOptionItem<string, any>[]> = {
	/** 确认状态 */
	confirm: boolean;
} & {
	[K in I[number]["key"]]: Extract<I[number], { key: K }>["initData"];
};

/**
 * 物品选择对话框选项接口
 * @template T - 选择器项类型
 */
// 自定义选择Dialog
export interface ItemSelectDialogOption<T = SelectorItem> extends Omit<DialogOption, "content"> {
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
export interface SelectorItem {
	/** 物品 ID */
	id: string;

	/** 显示 UI */
	display: UISchema;
}

/**
 * 物品选择对话框结果接口
 */
// 对应的返回结果定义
export interface ItemSelectDialogResult {
	/** 选中的物品 ID 列表 */
	selected: string[];
}

/**
 * 消息卡片选项接口
 */
// MessageCard
export interface MessageCardOption {
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
export interface UITemplate {
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
export interface UISchema {
	/** 组件唯一标识 */
	id: string;

	/**
	 * 组件类型
	 * 支持基础 HTML 元素和 SVG 元素
	 */
	type: "div" | "span" | "img" | "button" | "text" | "svg" | "path" | "circle" | "rect" | "line" | "g";

	// ===== Vue 指令 =====

	/** v-for 指令（可选） */
	vFor?: string;

	/** v-show 指令（可选） */
	vShow?: string;

	// ===== 样式 =====

	/** 静态样式（可选） */
	style?: Record<string, string>;

	/** 动态样式绑定（可选，支持 CSS） */
	styleBinding?: Record<string, string>;

	// ===== 属性 =====

	/** 静态属性（可选，如 src, class, d） */
	props?: Record<string, any>;

	/** 动态属性绑定（可选，支持表达式） */
	propsBinding?: Record<string, string>;

	// ===== 内容 =====

	/** 静态文本内容（可选） */
	content?: string;

	/** 文本绑定（可选） */
	textBinding?: string;

	/** 子组件列表（可选） */
	children?: UISchema[];
}
