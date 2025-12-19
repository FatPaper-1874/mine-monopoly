import { TargetSelectType } from "../../../../types/enums/game/game";

//Dialog
interface DialogOption {
	title: string;
	content: string | UISchema;
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
	selectedKey?: string[];
}

export interface SelectorItem {
	id: string;
	display: UISchema;
}

// 对应的返回结果定义
export interface ItemSelectDialogResult {
	selected: string[];
}

// MessageCard
export interface MessageCardOption {
	title: string;
	content: string | UISchema;
	duration: number;
}

export interface UISchema {
	id: string;
	// 1. 新增 SVG 相关标签
	type: "div" | "span" | "img" | "button" | "text" | "svg" | "path" | "circle" | "rect" | "line" | "g";

	vFor?: string;
	vShow?: string;

	// 样式
	style?: Record<string, string>; // 静态样式
	styleBinding?: Record<string, string>; // 动态样式 (CSS)

	// 属性
	props?: Record<string, any>; // 静态属性 (src, class, d)
	propsBinding?: Record<string, string>; // 动态属性绑定 (支持表达式)

	// 内容
	content?: string;
	textBinding?: string;

	children?: UISchema[];
}
