/**
 * Capacitor 更新 API — Web OTA + Android 底座更新
 *
 * - Web OTA 继续使用 Capgo bundle 更新网页资源
 * - 原生底座更新通过本地插件下载 APK 并拉起系统安装器
 */

import { registerPlugin } from "@capacitor/core";
import type { UpdateAPI } from "../types";
import { NativeUpdater, type NativeAppInfo, hasNativeUpdaterPlugin } from "./native-updater";

type UpdateKind = "web" | "native";
type RetryAction = "download" | "install" | "open-external";

type WebUpdateManifest = {
	version: string;
	url: string;
	releaseNotes?: string;
	minNativeVersion?: string;
};

type NativeUpdateManifest = {
	version: string;
	versionCode?: number;
	url: string;
	releaseNotes?: string;
};

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
let pendingKind: UpdateKind | null = null;
let pendingWebUpdate: WebUpdateManifest | null = null;
let pendingNativeUpdate: NativeUpdateManifest | null = null;
let downloadedBundle: { id: string; version: string } | null = null;
let statusCallback: ((data: any) => void) | null = null;
let appReadyCalled = false;
let downloadTotalSize = 0;
let lastTransferred = 0;
let lastSpeedTime = 0;

const DEFAULT_UPDATE_URL = "https://assets.fatpaper.site/releases/client/download/apk/update.json";
const DEFAULT_NATIVE_UPDATE_URL = "https://assets.fatpaper.site/releases/client/download/apk/native-update.json";
const DEFAULT_RELEASE_NOTE = "修复了一些已知问题，优化了游戏体验。";

function getUpdateCheckUrl(): string {
	if ((window as any).__CAPACITOR_UPDATE_URL__) return (window as any).__CAPACITOR_UPDATE_URL__;
	return DEFAULT_UPDATE_URL + "?t=" + Date.now();
}

function getNativeUpdateCheckUrl(): string {
	return DEFAULT_NATIVE_UPDATE_URL + "?t=" + Date.now();
}

function compareVersions(a: string, b: string): number {
	const pa = a.split(".").map(Number);
	const pb = b.split(".").map(Number);
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
	}
	return 0;
}

async function fetchManifest<T>(url: string): Promise<T> {
	const resp = await fetch(url);
	if (!resp.ok) throw new Error(`HTTP ${resp.status}: 无法获取更新信息`);
	const raw = await resp.text();
	const sanitized = raw.replace(/[\x00-\x08\x0A-\x1F]/g, " ");
	return JSON.parse(sanitized) as T;
}

function resetDownloadStats() {
	downloadTotalSize = 0;
	lastTransferred = 0;
	lastSpeedTime = 0;
}

function emitAvailable(kind: UpdateKind, version: string, releaseNotes: string, extra: Record<string, any> = {}) {
	statusCallback?.({
		status: "available",
		info: {
			kind,
			version,
			releaseNotes,
			...extra,
		},
	});
}

function ensureNativeManifest(
	nativeUpdate: NativeUpdateManifest | null,
	currentNativeVersion: string,
	requiredNativeVersion: string,
) : NativeUpdateManifest {
	if (!nativeUpdate || !nativeUpdate.version || !nativeUpdate.url) {
		throw new Error(`当前资源版本要求底座至少为 ${requiredNativeVersion}，但未找到可用的底座安装包`);
	}
	if (compareVersions(nativeUpdate.version, currentNativeVersion) <= 0) {
		throw new Error(`当前资源版本要求底座至少为 ${requiredNativeVersion}，请手动下载安装最新客户端`);
	}
	if (compareVersions(nativeUpdate.version, requiredNativeVersion) < 0) {
		throw new Error(`最新底座版本仍低于要求版本 ${requiredNativeVersion}，请检查发布配置`);
	}
	return nativeUpdate;
}

async function getCurrentNativeInfo(): Promise<NativeAppInfo> {
	if (!hasNativeUpdaterPlugin()) {
		return {
			versionName: "0.0.0",
			versionCode: 0,
			packageName: "fallback",
		};
	}

	try {
		return await NativeUpdater.getAppInfo();
	} catch {
		return {
			versionName: __APP_VERSION__,
			versionCode: 0,
			packageName: "fallback",
		};
	}
}

function emitError(error: string, action: RetryAction = "download", extra: Record<string, any> = {}) {
	statusCallback?.({
		status: "error",
		error,
		action,
		...extra,
	});
}

function openExternalUrl(url: string) {
	const popup = window.open(url, "_blank", "noopener,noreferrer");
	if (popup) {
		popup.opener = null;
		return;
	}

	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.target = "_blank";
	anchor.rel = "noopener noreferrer";
	anchor.click();
}

export function createCapUpdateAPI(): UpdateAPI {
	notifyAppReadySafe();

	return {
		async checkForUpdate() {
			try {
				const [cur, nativeInfo, webUpdate, nativeUpdate] = await Promise.all([
					CapacitorUpdater.current(),
					getCurrentNativeInfo(),
					fetchManifest<WebUpdateManifest>(getUpdateCheckUrl()),
					fetchManifest<NativeUpdateManifest>(getNativeUpdateCheckUrl()).catch(() => null),
				]);

				const currentBundleVersion = cur?.bundle?.version || __APP_VERSION__;
				const currentNativeVersion = nativeInfo.versionName || __APP_VERSION__;
				const currentBundleMinNativeVersion = __MIN_NATIVE_VERSION__ || "0.0.0";
				const currentBundleNeedsNativeUpdate =
					compareVersions(currentBundleMinNativeVersion, currentNativeVersion) > 0;

				if (!webUpdate.version || !webUpdate.url) {
					throw new Error("服务器更新信息不完整，缺少 version 或 url 字段");
				}

				if (currentBundleNeedsNativeUpdate) {
					const nextNativeUpdate = ensureNativeManifest(
						nativeUpdate,
						currentNativeVersion,
						currentBundleMinNativeVersion,
					);
					pendingKind = "native";
					pendingNativeUpdate = nextNativeUpdate;
					pendingWebUpdate = null;
					emitAvailable(
						"native",
						nextNativeUpdate.version,
						nextNativeUpdate.releaseNotes || DEFAULT_RELEASE_NOTE,
						{
							currentVersion: currentNativeVersion,
							requiredVersion: currentBundleMinNativeVersion,
						},
					);
					return {
						kind: "native",
						version: nextNativeUpdate.version,
						releaseNotes: nextNativeUpdate.releaseNotes,
					};
				}

				if (compareVersions(webUpdate.version, currentBundleVersion) <= 0) {
					return null;
				}

				const requiredNativeVersion = webUpdate.minNativeVersion || "0.0.0";
				if (compareVersions(requiredNativeVersion, currentNativeVersion) > 0) {
					const nextNativeUpdate = ensureNativeManifest(
						nativeUpdate,
						currentNativeVersion,
						requiredNativeVersion,
					);
					pendingKind = "native";
					pendingNativeUpdate = nextNativeUpdate;
					pendingWebUpdate = null;
					emitAvailable(
						"native",
						nextNativeUpdate.version,
						nextNativeUpdate.releaseNotes || webUpdate.releaseNotes || DEFAULT_RELEASE_NOTE,
						{
							currentVersion: currentNativeVersion,
							requiredVersion: requiredNativeVersion,
							targetBundleVersion: webUpdate.version,
						},
					);
					return {
						kind: "native",
						version: nextNativeUpdate.version,
						releaseNotes: nextNativeUpdate.releaseNotes,
					};
				}

				pendingKind = "web";
				pendingWebUpdate = webUpdate;
				pendingNativeUpdate = null;
				emitAvailable("web", webUpdate.version, webUpdate.releaseNotes || DEFAULT_RELEASE_NOTE);
				return { kind: "web", version: webUpdate.version, releaseNotes: webUpdate.releaseNotes };
			} catch (err: any) {
				const msg = err.message || "检查更新失败";
				console.error("[Updater] 检查更新失败:", msg);
				statusCallback?.({ status: "error", error: msg });
				return null;
			}
		},

		async startDownload() {
			if (pendingKind === "native" && pendingNativeUpdate) {
				resetDownloadStats();
				if (!hasNativeUpdaterPlugin()) {
					openExternalUrl(pendingNativeUpdate.url);
					emitError(
						"当前底座过旧，已尝试在系统浏览器中打开安装包下载链接；若未自动跳转，请复制下方链接到浏览器完成安装",
						"open-external",
						{ downloadUrl: pendingNativeUpdate.url },
					);
					return;
				}
				try {
					await NativeUpdater.downloadApk({
						url: pendingNativeUpdate.url,
						version: pendingNativeUpdate.version,
					});
				} catch (err: any) {
					emitError(err.message || "下载安装包失败");
				}
				return;
			}

			if (pendingKind === "web" && pendingWebUpdate) {
				try {
					resetDownloadStats();
					try {
						const headResp = await fetch(pendingWebUpdate.url, { method: "HEAD" });
						const cl = headResp.headers.get("Content-Length");
						if (cl) downloadTotalSize = parseInt(cl, 10);
					} catch {}

					const bundle = await CapacitorUpdater.download({
						version: pendingWebUpdate.version,
						url: pendingWebUpdate.url,
					});
					downloadedBundle = bundle;
					await CapacitorUpdater.next({ id: bundle.id });
				} catch (err: any) {
					emitError(err.message || "下载失败");
				}
				return;
			}

			emitError("没有待下载的更新");
		},

		async quitAndInstall() {
			if (pendingKind === "native") {
				try {
					await NativeUpdater.installDownloadedApk();
				} catch (err: any) {
					emitError(err.message || "拉起安装失败", "install");
				}
				return;
			}

			if (!downloadedBundle) return;
			try {
				await CapacitorUpdater.set({ id: downloadedBundle.id });
			} catch {
				window.location.reload();
			}
		},

		onUpdateStatus(callback) {
			statusCallback = callback;
			const fns: (() => void)[] = [];

			CapacitorUpdater.addListener("download", (e: any) => {
				if (pendingKind !== "web" || typeof e?.percent !== "number") return;
				const pct = e.percent < 1 ? e.percent * 100 : e.percent;
				const transferred = downloadTotalSize > 0 ? Math.round((pct / 100) * downloadTotalSize) : 0;

				const now = Date.now();
				let bytesPerSecond = 0;
				if (transferred > 0 && lastTransferred > 0 && lastSpeedTime > 0) {
					const dt = (now - lastSpeedTime) / 1000;
					const dBytes = transferred - lastTransferred;
					if (dt > 0 && dBytes >= 0) bytesPerSecond = Math.round(dBytes / dt);
				}
				lastTransferred = transferred;
				lastSpeedTime = now;

				statusCallback?.({
					status: "progress",
					progress: {
						kind: "web",
						percent: pct,
						bytesPerSecond,
						transferred,
						total: downloadTotalSize,
					},
				});
			}).then((h: any) => fns.push(() => h.remove()));

			CapacitorUpdater.addListener("downloadComplete", () => {
				if (pendingKind === "web") statusCallback?.({ status: "downloaded", info: { kind: "web" } });
			}).then((h: any) => fns.push(() => h.remove()));

			CapacitorUpdater.addListener("downloadFailed", () => {
				if (pendingKind === "web") statusCallback?.({ status: "error", error: "下载失败" });
			}).then((h: any) => fns.push(() => h.remove()));

			CapacitorUpdater.addListener("updateFailed", () => {
				if (pendingKind === "web") statusCallback?.({ status: "error", error: "安装失败" });
			}).then((h: any) => fns.push(() => h.remove()));

			if (hasNativeUpdaterPlugin()) {
				NativeUpdater.addListener("download", (e: any) => {
					if (pendingKind !== "native" || typeof e?.percent !== "number") return;
					statusCallback?.({
						status: "progress",
						progress: {
							kind: "native",
							percent: e.percent,
							bytesPerSecond: e.bytesPerSecond || 0,
							transferred: e.transferred || 0,
							total: e.total || 0,
						},
					});
				}).then((h: any) => fns.push(() => h.remove()));

				NativeUpdater.addListener("downloadComplete", () => {
					if (pendingKind === "native") statusCallback?.({ status: "downloaded", info: { kind: "native" } });
				}).then((h: any) => fns.push(() => h.remove()));

				NativeUpdater.addListener("downloadFailed", (e: any) => {
					if (pendingKind === "native") statusCallback?.({ status: "error", error: e?.error || "下载安装包失败" });
				}).then((h: any) => fns.push(() => h.remove()));
			}

			return () => {
				statusCallback = null;
				for (const fn of fns) fn();
			};
		},
	};
}

async function notifyAppReadySafe() {
	if (appReadyCalled) return;
	try {
		await CapacitorUpdater.notifyAppReady();
	} catch {}
	appReadyCalled = true;
}
