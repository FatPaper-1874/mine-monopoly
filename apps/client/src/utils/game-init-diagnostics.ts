import { getPlatformType } from "./platform";

export type GameInitStage =
	| "game-page-mounted"
	| "webgl-renderer"
	| "scene-overlay"
	| "dice-model"
	| "map-data"
	| "background"
	| "player-models"
	| "chance-card-assets"
	| "scene-effects"
	| "render-loop";

type StageMeta = {
	code: string;
	label: string;
	reasonHint: string;
};

const STAGE_META: Record<GameInitStage, StageMeta> = {
	"game-page-mounted": {
		code: "GI-GAME-PAGE-MOUNTED",
		label: "进入游戏页",
		reasonHint: "游戏页 DOM 未准备好，或路由切换后关键节点没有挂载完成。",
	},
	"webgl-renderer": {
		code: "GI-WEBGL-RENDERER",
		label: "创建 WebGL 渲染器",
		reasonHint: "当前浏览器引擎无法创建 WebGL 上下文，常见于硬件加速关闭、显卡黑名单、浏览器兼容差异或内存不足。",
	},
	"scene-overlay": {
		code: "GI-SCENE-OVERLAY",
		label: "初始化场景覆盖层",
		reasonHint: "2D 覆盖层、控件或容器尺寸异常，导致渲染辅助层初始化失败。",
	},
	"dice-model": {
		code: "GI-DICE-MODEL",
		label: "加载骰子模型",
		reasonHint: "骰子模型资源、GLTF/Draco 解码或贴图加载失败。",
	},
	"map-data": {
		code: "GI-MAP-DATA",
		label: "加载地图资源",
		reasonHint: "地图模型、事件图标或贴图资源加载失败，或浏览器在该阶段解码资源异常。",
	},
	background: {
		code: "GI-BACKGROUND",
		label: "加载背景资源",
		reasonHint: "背景图片资源不可访问，或浏览器纹理创建失败。",
	},
	"player-models": {
		code: "GI-PLAYER-MODELS",
		label: "加载玩家模型",
		reasonHint: "角色模型、角色贴图或动画资源在当前浏览器引擎下加载失败。",
	},
	"chance-card-assets": {
		code: "GI-CHANCE-CARD-ASSETS",
		label: "预加载机会卡资源",
		reasonHint: "机会卡图片、字体或 html-to-image 纹理生成过程失败。",
	},
	"scene-effects": {
		code: "GI-SCENE-EFFECTS",
		label: "初始化场景效果",
		reasonHint: "灯光、后处理、事件监听或交互链路初始化失败。",
	},
	"render-loop": {
		code: "GI-RENDER-LOOP",
		label: "启动渲染循环",
		reasonHint: "浏览器在 requestAnimationFrame 或首帧渲染阶段触发了运行时异常。",
	},
};

export class GameInitError extends Error {
	public readonly stage: GameInitStage;
	public readonly stageCode: string;
	public readonly stageLabel: string;
	public readonly reasonHint: string;
	public readonly originalMessage: string;
	public readonly originalStack?: string;

	constructor(stage: GameInitStage, cause: unknown) {
		const meta = STAGE_META[stage];
		const originalMessage = getErrorMessage(cause);
		super(`[${meta.code}] ${meta.label}: ${originalMessage}`);
		this.name = "GameInitError";
		this.stage = stage;
		this.stageCode = meta.code;
		this.stageLabel = meta.label;
		this.reasonHint = meta.reasonHint;
		this.originalMessage = originalMessage;
		this.originalStack = cause instanceof Error ? cause.stack : undefined;
	}
}

export function wrapGameInitError(stage: GameInitStage, cause: unknown): GameInitError {
	if (cause instanceof GameInitError) {
		return cause;
	}
	return new GameInitError(stage, cause);
}

type BrowserEngine = "Chromium" | "WebKit" | "Gecko" | "Unknown";

export type GameInitDiagnostics = {
	errorCode: string;
	stage: GameInitStage;
	stageLabel: string;
	reasonHint: string;
	rawMessage: string;
	probableCause: string;
	platformType: string;
	browserEngine: BrowserEngine;
	userAgent: string;
	mapName: string;
	route: string;
	viewport: string;
	screenInfo: string;
	webgl: string;
	fontsApi: string;
	deviceMemory: string;
	hardwareConcurrency: string;
	lines: string[];
	logMessage: string;
	logStack?: string;
	extraInfo: Record<string, unknown>;
	context: Record<string, unknown>;
};

export function buildGameInitDiagnostics(
	error: unknown,
	options?: {
		mapName?: string;
		route?: string;
	},
): GameInitDiagnostics {
	const initError = error instanceof GameInitError ? error : wrapGameInitError("game-page-mounted", error);
	const platformType = getPlatformType();
	const browserEngine = detectBrowserEngine();
	const graphics = detectGraphicsSupport();
	const route = options?.route || (typeof window !== "undefined" ? window.location.pathname : "unknown");
	const mapName = options?.mapName || "unknown";
	const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "unknown";
	const viewport =
		typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "unknown";
	const screenInfo =
		typeof screen !== "undefined" ? `${screen.width}x${screen.height}` : "unknown";
	const fontsApi = typeof document !== "undefined" && "fonts" in document ? "supported" : "unsupported";
	const deviceMemory = getOptionalNavigatorNumber("deviceMemory");
	const hardwareConcurrency = getOptionalNavigatorNumber("hardwareConcurrency");
	const probableCause = inferProbableCause(initError.stage, initError.originalMessage, graphics);

	const lines = [
		"请截图本弹窗完整内容发给开发者。",
		`错误码: ${initError.stageCode}`,
		`失败步骤: ${initError.stageLabel}`,
		`详细原因: ${probableCause}`,
		`步骤说明: ${initError.reasonHint}`,
		`原始报错: ${initError.originalMessage}`,
		`平台类型: ${platformType}`,
		`浏览器引擎: ${browserEngine}`,
		`当前页面: ${route}`,
		`地图名称: ${mapName}`,
		`Viewport: ${viewport}`,
		`Screen: ${screenInfo}`,
		`WebGL: ${graphics.summary}`,
		`Fonts API: ${fontsApi}`,
		`Device Memory: ${deviceMemory}`,
		`Hardware Concurrency: ${hardwareConcurrency}`,
		`UserAgent: ${userAgent}`,
	];

	return {
		errorCode: initError.stageCode,
		stage: initError.stage,
		stageLabel: initError.stageLabel,
		reasonHint: initError.reasonHint,
		rawMessage: initError.originalMessage,
		probableCause,
		platformType,
		browserEngine,
		userAgent,
		mapName,
		route,
		viewport,
		screenInfo,
		webgl: graphics.summary,
		fontsApi,
		deviceMemory,
		hardwareConcurrency,
		lines,
		logMessage: `${initError.stageCode} ${initError.stageLabel}: ${initError.originalMessage}`,
		logStack: initError.originalStack,
		extraInfo: {
			stage: initError.stage,
			stageCode: initError.stageCode,
			stageLabel: initError.stageLabel,
			reasonHint: initError.reasonHint,
			probableCause,
			platformType,
			browserEngine,
			mapName,
			route,
			viewport,
			screenInfo,
			webgl: graphics,
			fontsApi,
			deviceMemory,
			hardwareConcurrency,
			userAgent,
		},
		context: {
			url: route,
			userAgent: userAgent.substring(0, 200),
			screenInfo,
		},
	};
}

function getErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}
	if (typeof error === "string" && error.trim()) {
		return error.trim();
	}
	try {
		return JSON.stringify(error);
	} catch {
		return "Unknown error";
	}
}

function detectBrowserEngine(): BrowserEngine {
	if (typeof navigator === "undefined") {
		return "Unknown";
	}

	const ua = navigator.userAgent;
	if (/firefox|fxios/i.test(ua)) {
		return "Gecko";
	}
	if (/edg|edge|opr|opera|chrome|chromium|crios/i.test(ua)) {
		return "Chromium";
	}
	if (/safari/i.test(ua) && !/chrome|chromium|crios|android/i.test(ua)) {
		return "WebKit";
	}
	return "Unknown";
}

function detectGraphicsSupport() {
	if (typeof document === "undefined") {
		return {
			webgl: false,
			webgl2: false,
			summary: "unknown",
		};
	}

	const canvas = document.createElement("canvas");
	const webgl2 = !!canvas.getContext("webgl2");
	const webgl = !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));

	return {
		webgl,
		webgl2,
		summary: `webgl=${webgl ? "yes" : "no"}, webgl2=${webgl2 ? "yes" : "no"}`,
	};
}

function inferProbableCause(
	stage: GameInitStage,
	rawMessage: string,
	graphics: { webgl: boolean; webgl2: boolean },
): string {
	const message = rawMessage.toLowerCase();

	if (message.includes("error creating webgl context") || message.includes("failed to create webgl")) {
		return "浏览器当前无法创建 WebGL 上下文。常见于硬件加速关闭、显卡被浏览器拉黑、浏览器内核兼容差异或内存不足。";
	}
	if (message.includes("out of memory")) {
		return "浏览器在初始化图形资源时内存不足，通常与地图资源较大、纹理较多或设备可用内存较低有关。";
	}
	if (message.includes("draco")) {
		return "模型 Draco 解码链路失败，常见于解码器资源不可达、浏览器兼容性差异或模型资源损坏。";
	}
	if (message.includes("404") || message.includes("failed to fetch") || message.includes("networkerror")) {
		return "初始化阶段依赖的模型、贴图、字体或图片资源没有成功加载。优先检查资源路径、部署产物和跨域设置。";
	}
	if (message.includes("securityerror") || message.includes("cross-origin") || message.includes("tainted")) {
		return "浏览器安全策略拦截了资源读取或 canvas 处理，通常与跨域资源、图片来源或沙盒限制有关。";
	}
	if (message.includes("fonts")) {
		return "字体资源或 Fonts API 在当前浏览器环境下没有正常工作，导致机会卡纹理生成链路中断。";
	}
	if (stage === "webgl-renderer" && !graphics.webgl) {
		return "当前浏览器环境连基础 WebGL 都不可用，因此渲染器无法启动。";
	}
	return STAGE_META[stage].reasonHint;
}

function getOptionalNavigatorNumber(key: "deviceMemory" | "hardwareConcurrency"): string {
	if (typeof navigator === "undefined") {
		return "unknown";
	}
	const value = (navigator as Navigator & Record<string, unknown>)[key];
	if (typeof value === "number" && Number.isFinite(value)) {
		return String(value);
	}
	return "unknown";
}
