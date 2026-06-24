/**
 * VersionStore — 地图版本管理 Pinia Store
 */
import { defineStore } from "pinia";
import {
	serializeToDir,
	deserializeFromDir,
	saveAssetsToDir,
	isDirFormatMap,
	type DeserializeResult,
} from "@src/services/map-serializer";
import type { SnapshotInfo, SnapshotDiff } from "@src/services/snapshot-service";
import { useMapDataStore, useResourceStore, useEditorStore } from "@src/stores";
import { eventBus } from "@src/utils/event-bus";
import { message } from "ant-design-vue";

/** 规范化路径 */
function norm(p: string): string {
	return p.replace(/\\/g, "/").replace(/\/+$/, "");
}

export const useVersionStore = defineStore("Version", {
	state: () => ({
		// 仓库状态
		mapDir: (() => {
			try { return localStorage.getItem(`version-map-dir-${navigator.platform}`) || ""; } catch { return ""; }
		})(),
		isRepo: false, // 运行时检测
		isDirFormat: (() => {
			try { return localStorage.getItem(`version-is-dir-${navigator.platform}`) === "1"; } catch { return false; }
		})(),
		// 保存状态
		isSaving: false,
		lastSaveTime: 0,
		pendingUpgrade: (() => {
			try { return localStorage.getItem(`version-upgrade-${navigator.platform}`) === "1"; } catch { return false; }
		})(),

		// UI 状态
		panelVisible: false,

		// 历史缓存
		snapshotList: [] as SnapshotInfo[],
		selectedSnapshotId: "" as string,
		comparePair: [] as [string, string] | [],

		// Diff 数据
		diffResult: [] as SnapshotDiff[],
		diffLoading: false,
	}),

	getters: {
		saveStatusText(): string {
			if (this.isSaving) return "保存中...";
			if (this.lastSaveTime) {
				const seconds = Math.floor((Date.now() - this.lastSaveTime) / 1000);
				if (seconds < 60) return `已保存 ${seconds}秒前`;
				if (seconds < 3600) return `已保存 ${Math.floor(seconds / 60)}分钟前`;
				return `已保存 ${Math.floor(seconds / 3600)}小时前`;
			}
			return "";
		},

		snapshotCount(): number {
			return this.snapshotList.length;
		},

		currentSnapshot(): SnapshotInfo | undefined {
			return this.snapshotList.find((s) => s.id === this.selectedSnapshotId);
		},
	},

	actions: {
		// ─── 持久化 helpers ───

		_persist() {
			try {
				localStorage.setItem(`version-map-dir-${navigator.platform}`, this.mapDir);
				localStorage.setItem(`version-is-dir-${navigator.platform}`, this.isDirFormat ? "1" : "0");
				localStorage.setItem(`version-upgrade-${navigator.platform}`, this.pendingUpgrade ? "1" : "0");
			} catch { /* ignore */ }
		},

		_clearPersist() {
			try {
				localStorage.removeItem(`version-map-dir-${navigator.platform}`);
				localStorage.removeItem(`version-is-dir-${navigator.platform}`);
				localStorage.removeItem(`version-upgrade-${navigator.platform}`);
			} catch { /* ignore */ }
		},

		/** 新建或关闭地图时重置版本状态 */
		resetState() {
			this.mapDir = "";
			this.isDirFormat = false;
			this.isRepo = false;
			this.pendingUpgrade = false;
			this.snapshotList = [];
			this.selectedSnapshotId = "";
			this._clearPersist();
		},

		/**
		 * 尝试从 currentFilePath 恢复版本管理状态（应对 store 重置 / HMR）
		 */
		async tryRecoverFromCurrentPath(): Promise<boolean> {
			const currentPath = useEditorStore().currentFilePath;
			if (!currentPath) return false;

			// 检查是否是有效的项目目录
			const isDir = await isDirFormatMap(currentPath);
			if (isDir) {
				this.mapDir = norm(currentPath);
				this.isDirFormat = true;
				this.pendingUpgrade = false;
				this.isRepo = true;
				this._persist();
				await this.refreshHistory();
				return true;
			}
			return false;
		},

		// ─── 初始化 ───

		/**
		 * 为目录格式地图初始化版本管理
		 */
		async initForDir(dirPath: string): Promise<void> {
			this.mapDir = norm(dirPath);
			this.isDirFormat = true;
			this._persist();
			await window.gitAPI.init(dirPath);
			this.isRepo = true;
			await this.refreshHistory();
		},

		/**
		 * 打开地图时自动检测并初始化
		 */
		async detectAndInit(path: string): Promise<boolean> {
			const isDir = await isDirFormatMap(path);
			if (isDir) {
				this.mapDir = norm(path);
				this.isDirFormat = true;
				this.pendingUpgrade = false;
				this._persist();
				// 检测是否已有 git 仓库
				const oid = await window.gitAPI.currentOid(path);
				if (oid === null) {
					await window.gitAPI.init(path);
				}
				this.isRepo = true;
				await this.refreshHistory();
				return true;
			}
			// 旧格式单文件 — 标记待升级
			this.pendingUpgrade = true;
			this._persist();
			return false;
		},

		// ─── 保存 ───

		/**
		 * 另存为新的目录格式地图
		 */
		async saveAsNewDir(dirPath: string, message?: string): Promise<void> {
			this.isSaving = true;
			try {
				const mapDataStore = useMapDataStore();
				const resourceStore = useResourceStore();

				// 序列化
				await serializeToDir(mapDataStore.$state, dirPath);
				await saveAssetsToDir(
					resourceStore.models,
					resourceStore.images,
					dirPath,
				);

				// 初始化版本管理
				this.mapDir = norm(dirPath);
				this.isDirFormat = true;
				this.pendingUpgrade = false;
				this._persist();
				await window.gitAPI.init(dirPath);
				await window.gitAPI.commitAll(dirPath, message || "init: 创建地图");
				this.isRepo = true;
				this.lastSaveTime = Date.now();
				await this.refreshHistory();

				// 更新编辑器路径
				useEditorStore().setCurrentFilePath(dirPath);
			} finally {
				this.isSaving = false;
			}
		},

		/**
		 * 保存当前地图并 git commit
		 */
		async saveCurrent(message?: string): Promise<void> {
			if (!this.isDirFormat || !this.mapDir) return;

			// 先检查是否有实际变更，没有就跳过
			if (!(await window.gitAPI.hasChanges(this.mapDir))) {
				return;
			}

			this.isSaving = true;
			try {
				const mapDataStore = useMapDataStore();
				const resourceStore = useResourceStore();

				// 更新编辑器版本
				mapDataStore.info.editorVersion = (window as any).electronAPI?.getVersion?.() || "";

				// 序列化到目录
				await serializeToDir(mapDataStore.$state, this.mapDir);
				await saveAssetsToDir(
					resourceStore.models,
					resourceStore.images,
					this.mapDir,
				);

				// git commit
				const msg = message || `save: ${new Date().toLocaleString()}`;
				await window.gitAPI.commitAll(this.mapDir, msg);
				this.lastSaveTime = Date.now();
				await this.refreshHistory();
			} finally {
				this.isSaving = false;
			}
		},

		// ─── 历史 ───

		async refreshHistory(): Promise<void> {
			if (!this.mapDir) return;
			const commits = await window.gitAPI.log(this.mapDir, 50);
			this.snapshotList = commits.map((c) => ({
				id: c.oid,
				message: c.message,
				timestamp: c.timestamp,
			}));
		},

		// ─── 回退 ───

		/**
		 * 恢复到指定提交版本
		 */
		async restoreToSnapshot(snapshotId: string): Promise<void> {
			if (!this.mapDir) return;

			const editorStore = useEditorStore();
			editorStore.setLoading(true);

			try {
				await window.gitAPI.checkout(this.mapDir, snapshotId);

				// 从恢复的目录重新加载
				const result: DeserializeResult = await deserializeFromDir(this.mapDir);

				const mapDataStore = useMapDataStore();
				const resourceStore = useResourceStore();

				mapDataStore.$patch(result.mapData);

				// 重建资源列表
				const modelsList: typeof resourceStore.models = [];
				for (const model of result.models) {
					const buf = await window.electronAPI.readFile(model.filePath);
					const absolutePath = await window.electronAPI.saveLocalFile(
						`temp/${model.id}.${model.fileType}`,
						new Uint8Array(buf),
					);
					const url = `fp-file://${absolutePath.replace(/\\/g, "/")}`;
					modelsList.push({
						id: model.id,
						name: model.name,
						fileType: model.fileType,
						url,
					});
				}

				const imagesList: typeof resourceStore.images = [];
				for (const image of result.images) {
					const buf = await window.electronAPI.readFile(image.filePath);
					const absolutePath = await window.electronAPI.saveLocalFile(
						`temp/${image.id}.${image.fileType}`,
						new Uint8Array(buf),
					);
					const url = `fp-file://${absolutePath.replace(/\\/g, "/")}`;
					imagesList.push({
						id: image.id,
						name: image.name,
						fileType: image.fileType,
						url,
					});
				}

				resourceStore.$patch({ models: modelsList, images: imagesList });

				eventBus.emit("map-loaded", result.mapData);
				message.success("已恢复到所选版本");
			} finally {
				editorStore.setLoading(false);
			}
		},

		/**
		 * 删除提交（git 不支持直接删除，标记为 no-op）
		 */
		// ─── Diff ───

		/**
		 * 比较两个提交
		 */
		async compareSnapshots(a: string, b: string): Promise<void> {
			if (!this.mapDir) return;
			this.diffLoading = true;
			try {
				const diffs = await window.gitAPI.diff(this.mapDir, a, b);
				this.diffResult = diffs.map((d) => ({
					filePath: d.filePath,
					status: d.status as "added" | "deleted" | "modified",
				}));
				this.comparePair = [a, b];
			} finally {
				this.diffLoading = false;
			}
		},

		/**
		 * 获取提交中文件的内容
		 */
		async getFileContent(snapshotId: string, filePath: string): Promise<string> {
			if (!this.mapDir) return "";
			return window.gitAPI.readFile(this.mapDir, snapshotId, filePath);
		},

		// ─── 升级 ───

		/**
		 * 将当前内存中的旧格式地图升级为目录格式
		 */
		async upgradeToDir(dirPath: string): Promise<void> {
			await this.saveAsNewDir(dirPath, "upgrade: 从 .fpmap 单文件升级");
			this.pendingUpgrade = false;
			this._persist();
		},

		// ─── UI ───

		togglePanel() {
			this.panelVisible = !this.panelVisible;
		},

		selectSnapshot(id: string) {
			this.selectedSnapshotId = id;
		},
	},
});
