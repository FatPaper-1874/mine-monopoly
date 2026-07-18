/// <reference types="vite/client" />

// ========== 平台 API 类型（源定义见 src/platform/types.ts） ==========

interface Window {
	platformAPI?: import("./platform/types").PlatformAPI;
	/** 标记 Vue 应用是否已成功挂载，引导全局错误处理显示策略 */
	__APP_STARTED__?: boolean;
	__aiControlBridge?: import("@mine-monopoly/types").AIControlBridge;
	__roomInstance?: unknown;
}

declare module "*.md?raw" {
	const content: string;
	export default content;
}

declare module '*.vue' {
	import type { DefineComponent } from 'vue';
	const component: DefineComponent<{}, {}, any>;
	export default component;
}
