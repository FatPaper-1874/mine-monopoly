// vue-h.d.ts
interface VNode {
	__v_isVNode: true;
	type: string | symbol | Component;
	props: Record<string, any> | null;
	key?: string | number | symbol | null;
	ref?: any;
	children: VNodeNormalizedChildren;
}

type VNodeNormalizedChildren = string | number | boolean | null | undefined | VNode | VNodeArrayChildren;

type VNodeArrayChildren = Array<VNodeNormalizedChildren>;
type Slot = () => VNodeNormalizedChildren;
type ChildrenSlot = { [name: string]: Slot };

type Component = ConcreteComponent | FunctionalComponent;

interface ConcreteComponent {
	name?: string;
	setup?: (props: Record<string, any>, ctx: SetupContext) => any;
	render?: (ctx: any) => VNode | VNodeArrayChildren | null;
}

type FunctionalComponent = (props: Record<string, any>, ctx: SetupContext) => VNode | VNodeArrayChildren | null;

interface SetupContext {
	attrs: Record<string, any>;
	slots: ChildrenSlot;
	emit: (event: string, ...args: any[]) => void;
}

// ---- h 函数类型 ----
type h = {
	// 元素 + props + children
	(
		type: string,
		props: Record<string, any> | null,
		children?: Children | Slot | ChildrenSlot | string | number | boolean
	): VNode;
	// 元素 + children
	(type: string, children?: Children | Slot | ChildrenSlot | string | number | boolean): VNode;
	// 组件 + props + children
	(
		type: Component,
		props: Record<string, any> | null,
		children?: Children | Slot | ChildrenSlot | string | number | boolean
	): VNode;
	// 组件 + children
	(type: Component, children?: Children | Slot | ChildrenSlot | string | number | boolean): VNode;
};
