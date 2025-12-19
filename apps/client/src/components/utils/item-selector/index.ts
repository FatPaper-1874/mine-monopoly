// utils/item-selector/index.ts
import { createVNode, render, getCurrentInstance, type AppContext } from "vue";
import SelectorModal from "./selector-modal.vue";

interface SelectorOptions<T = any> {
	title?: string;
	itemList: Array<T>;
	keyName?: keyof T;
	multiple?: boolean;
	column?: number;
	selectedKey?: string[];
	appContext?: AppContext;
}

export function showItemSelector(options: SelectorOptions): Promise<string[]> {
	return new Promise((resolve, reject) => {
		// 1. 创建容器
		const container = document.createElement("div");

		// 2. 准备 Props
		const props = {
			...options,
			// 监听组件抛出的 confirm 事件
			onConfirm: (result: string[]) => {
				resolve(result);
				destroy();
			},
			// 监听组件抛出的 cancel 事件
			onCancel: () => {
				reject("cancel");
				destroy();
			},
		};

		// 3. 创建虚拟节点
		const vnode = createVNode(SelectorModal, props);

		// 4. 关键步骤：继承应用上下文
		if (options.appContext) {
			vnode.appContext = options.appContext;
		} else {
			// 尝试自动获取（仅在 setup 期间调用有效）
			const currentInstance = getCurrentInstance();
			if (currentInstance) {
				vnode.appContext = currentInstance.appContext;
			}
		}

		// 5. 渲染
		render(vnode, container);
		document.body.appendChild(container);

		// 6. 打开弹窗
		if (vnode.component && vnode.component.exposed) {
			(vnode.component.exposed as any).init();
		}

		// 7. 销毁逻辑
		function destroy() {
			setTimeout(() => {
				render(null, container);
				document.body.removeChild(container);
			}, 350);
		}
	});
}
