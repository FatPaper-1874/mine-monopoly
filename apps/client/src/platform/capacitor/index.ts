/**
 * Capacitor 平台实现（Android / iOS）
 *
 * 基于 @capgo/capacitor-updater 原生插件提供 OTA 自动更新。
 * 注意：不使用 @capgo/capacitor-updater JS SDK（其 history.js 会导致白屏），
 * 直接通过 @capacitor/core 的 registerPlugin 注册原生插件。
 */
import type { PlatformAPI } from "../types";
import { createWebPlatform } from "../web";
import { createCapUpdateAPI } from "./update";

export function createCapacitorPlatform(): PlatformAPI {
	return createWebPlatform();
}

export { createCapUpdateAPI as createCapacitorUpdateAPI };
