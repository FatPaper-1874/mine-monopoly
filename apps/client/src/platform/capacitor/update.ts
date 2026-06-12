/**
 * Capacitor 更新 API — 原生 Capgo 插件桥接
 *
 * ⚠️ 直接静态 import @capacitor/core 的 registerPlugin。
 *    registerPlugin("CapacitorUpdater") 在模块顶层调用。
 *    原生插件在 APK 中，仅当 @capacitor/core 加载后注册才有效。
 */

import { registerPlugin } from "@capacitor/core";
import type { UpdateAPI } from "../types";

// ── 注册原生 Capgo 插件 ──
const CapacitorUpdater = registerPlugin<any>("CapacitorUpdater", {
	web: () => ({
		current: async () => ({ bundle: { version: null } }),
		download: async () => ({ id: "stub", version: "0", status: "success" }),
		next: async () => {},
		set: async () => {},
		notifyAppReady: async () => {},
		addListener: async () => ({ remove: async () => {} }),
	}) as any,
});

// ── 内部状态 ──
let pendingVersion: string | null = null;
let pendingUrl: string | null = null;
let downloadedBundle: { id: string; version: string } | null = null;
let statusCallback: ((data: any) => void) | null = null;
let appReadyCalled = false;

const DEFAULT_UPDATE_URL = "https://assets.fatpaper.site/releases/client/download/apk/update.json";

function getUpdateCheckUrl(): string {
	if ((window as any).__CAPACITOR_UPDATE_URL__) return (window as any).__CAPACITOR_UPDATE_URL__;
	return DEFAULT_UPDATE_URL;
}

function compareVersions(a: string, b: string): number {
	const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
	}
	return 0;
}

export function createCapUpdateAPI(): UpdateAPI {
	notifyAppReadySafe();

	return {
		async checkForUpdate() {
			try {
				const cur = await CapacitorUpdater.current();
				const currentVersion = cur?.bundle?.version || __APP_VERSION__;
				const resp = await fetch(getUpdateCheckUrl());
				if (!resp.ok) throw new Error(`HTTP ${resp.status}: 无法获取更新信息`);
				// 先取 text，兼容服务端 releaseNotes 含字面换行符（0x0A）而非 \n 的问题
				const raw = await resp.text();
				// 将所有控制字符（0x00-0x1F，除 \t 0x09 外）替换为空格
				const sanitized = raw.replace(/[\x00-\x08\x0A-\x1F]/g, " ");
				const data = JSON.parse(sanitized);
				if (!data.version || !data.url) throw new Error("服务器更新信息不完整，缺少 version 字段");

				if (compareVersions(data.version, currentVersion) <= 0) return null;

				pendingVersion = data.version;
				pendingUrl = data.url;
				statusCallback?.({
					status: "available",
					info: { version: data.version, releaseNotes: data.releaseNotes || "修复了一些已知问题，优化了游戏体验。" },
				});
				return { version: data.version, releaseNotes: data.releaseNotes };
			} catch (err: any) {
				const msg = err.message || "检查更新失败";
				console.error("[Updater] 检查更新失败:", msg);
				statusCallback?.({ status: "error", error: msg });
				return null;
			}
		},

		async startDownload() {
			if (!pendingVersion || !pendingUrl) {
				statusCallback?.({ status: "error", error: "没有待下载的更新" });
				return;
			}
			try {
				const bundle = await CapacitorUpdater.download({ version: pendingVersion, url: pendingUrl });
				downloadedBundle = bundle;
				await CapacitorUpdater.next({ id: bundle.id });
			} catch (err: any) {
				statusCallback?.({ status: "error", error: err.message || "下载失败" });
			}
		},

		async quitAndInstall() {
			if (!downloadedBundle) return;
			try {
				await CapacitorUpdater.set({ id: downloadedBundle.id });
			} catch { window.location.reload(); }
		},

		onUpdateStatus(callback) {
			statusCallback = callback;
			const fns: (() => void)[] = [];
			CapacitorUpdater.addListener("download", (e: any) => {
				if (typeof e?.percent === "number") statusCallback?.({ status: "progress", progress: { percent: e.percent, bytesPerSecond: 0, transferred: 0, total: 0 } });
			}).then((h: any) => fns.push(() => h.remove()));
			CapacitorUpdater.addListener("downloadComplete", () => statusCallback?.({ status: "downloaded" })).then((h: any) => fns.push(() => h.remove()));
			CapacitorUpdater.addListener("downloadFailed", () => statusCallback?.({ status: "error", error: "下载失败" })).then((h: any) => fns.push(() => h.remove()));
			CapacitorUpdater.addListener("updateFailed", () => statusCallback?.({ status: "error", error: "安装失败" })).then((h: any) => fns.push(() => h.remove()));
			return () => { statusCallback = null; for (const fn of fns) fn(); };
		},
	};
}

async function notifyAppReadySafe() {
	if (appReadyCalled) return;
	try { await CapacitorUpdater.notifyAppReady(); } catch {}
	appReadyCalled = true;
}
