import { createVNode, render, type AppContext, type VNode, getCurrentInstance } from "vue";
import FPMessageCardVue from "./fp-message-card.vue";
import { UISchema } from "@fatpaper-monopoly/types";

export interface MessageCardOptions {
	title?: string;
	content?: string | VNode | (() => VNode) | UISchema;
	appContext?: AppContext;
	duration?: number;
}

export function FPMessageCard(options: MessageCardOptions) {
	const container = document.createElement("div");

	let contentNode = options.content;
	if (typeof contentNode === "function") {
		contentNode = contentNode();
	}

	const vnode = createVNode(FPMessageCardVue, {
		...options,
		content: contentNode,
		onClosed: () => {
			render(null, container);
			container.remove();
		},
	});

	if (options.appContext) {
		vnode.appContext = options.appContext;
	} else {
		const current = getCurrentInstance();
		if (current) vnode.appContext = current.appContext;
	}

	render(vnode, container);

	if (vnode.component && vnode.component.exposed) {
		(vnode.component.exposed as any).open();
	}
}
