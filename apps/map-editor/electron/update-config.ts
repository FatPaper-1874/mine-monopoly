import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// ============================================================
// 更新源配置模块
//
// 加载优先级（后覆盖前）：
//   1. 内置默认值（下方 DEFAULT_SOURCES 常量）
//   2. {userData}/update-sources.json
//   3. 环境变量 UPDATE_URL_PRIMARY + UPDATE_URL_FALLBACK
//   4. 环境变量 UPDATE_SOURCES（完整 JSON 覆盖）
// ============================================================

export interface UpdateSource {
    name: string;
    url: string;
    enabled: boolean;
}

/** 内置默认更新源 — 可通过用户配置或环境变量覆盖 */
export const DEFAULT_SOURCES: UpdateSource[] = [
    {
        name: "Cloudflare R2",
        url: "https://assets.fatpaper.site/releases/map-editor/download/windows/",
        enabled: true,
    },
];

// ---- 各层加载函数 ----

function loadFromUserData(userDataPath: string): UpdateSource[] | null {
    try {
        const filePath = join(userDataPath, "update-sources.json");
        if (!existsSync(filePath)) return null;
        const raw = readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.sources)) {
            return parsed.sources
                .filter((s: any) => typeof s.name === "string" && typeof s.url === "string")
                .map((s: any) => ({
                    name: s.name,
                    url: s.url,
                    enabled: s.enabled !== false,
                }));
        }
        return null;
    } catch {
        return null;
    }
}

function loadFromEnv(): UpdateSource[] | null {
    // 方式 A: UPDATE_SOURCES — 完整 JSON 覆盖
    const raw = process.env["UPDATE_SOURCES"];
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.sources)) {
                return parsed.sources
                    .filter((s: any) => typeof s.name === "string" && typeof s.url === "string")
                    .map((s: any) => ({
                        name: s.name,
                        url: s.url,
                        enabled: s.enabled !== false,
                    }));
            }
        } catch {
            /* 格式错误时忽略，继续尝试其他方式 */
        }
    }

    // 方式 B: UPDATE_URL_PRIMARY / UPDATE_URL_FALLBACK — 快捷方式
    const primary = process.env["UPDATE_URL_PRIMARY"];
    const fallback = process.env["UPDATE_URL_FALLBACK"];
    if (primary || fallback) {
        const sources: UpdateSource[] = [];
        if (primary) {
            sources.push({ name: "主源 (环境变量)", url: primary, enabled: true });
        }
        if (fallback) {
            sources.push({ name: "备用源 (环境变量)", url: fallback, enabled: true });
        }
        return sources;
    }

    return null;
}

/**
 * 加载最终更新源列表（仅返回 enabled 为 true 的源）。
 *
 * @param userDataPath - app.getPath("userData") 的路径，用于读取用户级覆盖配置
 * @returns 按优先级排序的、可用的更新源列表
 */
export function loadUpdateSources(userDataPath?: string): UpdateSource[] {
    // Layer 1: 内置默认值
    let sources: UpdateSource[] = [...DEFAULT_SOURCES];

    // Layer 2: 用户级覆盖 ({userData}/update-sources.json)
    if (userDataPath) {
        const userSources = loadFromUserData(userDataPath);
        if (userSources) {
            sources = userSources;
        }
    }

    // Layer 3: 环境变量（最高优先级）
    const envSources = loadFromEnv();
    if (envSources) {
        sources = envSources;
    }

    // 仅返回启用的源
    return sources.filter((s) => s.enabled !== false);
}
