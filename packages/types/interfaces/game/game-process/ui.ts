import { TargetSelectType } from "../../../../types/enums/game/game";

//Dialog
interface DialogOption {
	title: string;
	content: string;
	confirmText?: string;
	cancelText?: string;
	closable?: boolean;
}

// 目标选择Dialog
export interface TargetSelectDialogOption<I extends TargetSelectType> extends DialogOption {
	type: I;
}

export interface TargetSelectDialogResult<I extends TargetSelectType> {
	target: TargetSelectResult[I];
}

export interface TargetSelectResult {
	[TargetSelectType.ToMapItem]: string[];
	[TargetSelectType.ToPlayer]: string[];
	[TargetSelectType.ToOtherPlayer]: string[];
	[TargetSelectType.ToSelf]: string[];
	[TargetSelectType.ToProperty]: string[];
}

// 确认Dialog
export interface ConfirmDialogOption<I extends readonly InputOptionItem<string, any>[]> extends DialogOption {
	inputOptions?: I;
}

export type InputOptionItem<K extends string, D> = {
	key: K;
	label: string;
	initData: D;
};

export type ConfirmDialogResult<I extends readonly InputOptionItem<string, any>[]> = {
	[P in I[number] as P["key"]]: P["initData"];
} & { confirm: boolean };

// 自定义选择Dialog
export interface ItemSelectDialogOption<T = SelectorItem> extends Omit<DialogOption, "content"> {
	itemList: Array<T>;
	keyName?: keyof T;
	multiple?: boolean;
	column?: number;
	selectedKey?: string | string[];
}

export interface SelectorItem {
	id: string;
	display: UISchema;
}

// 对应的返回结果定义
export interface ItemSelectDialogResult {
	selected: string | string[];
}

// MessageCard
export interface MessageCardOption {
	title: string;
	content: string;
	duration: number;
}

export interface UISchema {
	id: string;
	type: "div" | "span" | "img" | "button" | "text"; // 允许的标签白名单
	// v-for 指令: "item in list"
	vFor?: string;
	// v-show 指令: 属性路径，例如 "player.isActive"
	vShow?: string;
	// :style 绑定: key 是 CSS 属性，value 是数据路径
	styleBinding?: Record<string, string>;
	// 静态样式
	style?: Record<string, string>;
	// 静态属性 (src, class 等)
	props?: Record<string, any>;
	// 文本内容 (如果是 text 类型)
	content?: string;
	// 动态文本绑定 (覆盖 content)
	textBinding?: string;
	// 子节点
	children?: UISchema[];
}
