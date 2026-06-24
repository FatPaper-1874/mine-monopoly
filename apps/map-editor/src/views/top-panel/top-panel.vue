<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { message } from "ant-design-vue";
import { useEditorStore, useMapDataStore, useResourceStore, useVersionStore } from "@src/stores";
import { handleNewProtoFile, handleSaveProtoFile, exportGameMapToProductFile, saveGameMapToBinFile } from "@src/utils/file";
import { loadMapAuto } from "@src/services/map-serializer";
import { getFsApi } from "@src/services/fs-api";
import { eventBus } from "@src/utils/event-bus";
import MCPControlPanel from "@src/components/mcp/MCPControlPanel.vue";
import ExportProgressDialog from "./export-progress-dialog.vue";
import VersionPanel from "@src/components/version-panel/VersionPanel.vue";

const editorStore = useEditorStore();
const versionStore = useVersionStore();
const modLabel = navigator.platform.startsWith("Mac") ? "⌘" : "Ctrl";

const mcpPanelVisible = ref(false);
const mcpPanelRef = ref();

// 升级对话框
const upgradeVisible = ref(false);

// 监听 Ctrl+S 快捷键（来自 map-renderer）
const onRequestSave = () => handleSaveMapFile();
onMounted(() => {
	eventBus.on("request-save", onRequestSave);
});
onUnmounted(() => {
	eventBus.off("request-save", onRequestSave);
});

// 导出进度状态
const exportProgressVisible = ref(false);
const exportProgressPercent = ref(0);
const exportProgressStage = ref("");

// 文件下拉菜单项点击处理
type FileMenuKey = "new" | "open-project" | "open-fpmap" | "save" | "saveas" | "export-fpmap" | "exportmmmap";
async function handleFileMenuClick({ key }: { key: FileMenuKey }) {
	switch (key) {
		case "new":
			handleNewProtoFile();
			versionStore.resetState();
			break;
		case "open-project":
			await handleOpenProjectDir();
			break;
		case "open-fpmap":
			await handleOpenFpmapFile();
			break;
		case "save":
			await handleSaveMapFile();
			break;
		case "saveas":
			await handleSaveAsMapFile();
			break;
		case "export-fpmap":
			await handleExportFpmapFile();
			break;
		case "exportmmmap":
			handleExportMmmapFile();
			break;
	}
}

// ─── 打开项目文件夹 ───
async function handleOpenProjectDir() {
	const result = await window.electronAPI.showOpenDialog({
		title: "打开地图项目文件夹",
		properties: ["openDirectory"],
	});
	const path = result.filePaths[0];
	if (!path) return;
	await loadAndSetup(path);
}

// ─── 打开旧版 .fpmap 文件 ───
async function handleOpenFpmapFile() {
	const result = await window.electronAPI.showOpenDialog({
		title: "打开 .fpmap 地图文件",
		properties: ["openFile"],
		filters: [{ name: "地图文件", extensions: ["fpmap"] }],
	});
	const path = result.filePaths[0];
	if (!path) return;

	// 清除旧的目录格式状态
	versionStore.resetState();
	await loadAndSetup(path);
	versionStore.pendingUpgrade = true;
	// 如果 detectAndInit 没匹配（旧 fpmap），设置 pendingUpgrade；如果恰是目录，detectAndInit 会覆盖
	if (versionStore.isDirFormat) {
		versionStore.pendingUpgrade = false;
	} else {
		versionStore.pendingUpgrade = true;
	}
	message.success("加载成功", 1);
}

// ─── 统一加载 + 注入 Store ───
async function loadAndSetup(filePath: string) {
	editorStore.setLoading(true);
	try {
		await window.electronAPI.clearTempDir();

		const { mapData, models, images } = await loadMapAuto(filePath);

		useMapDataStore().$patch(mapData);
		useResourceStore().$patch({ models, images });
		editorStore.setCurrentFilePath(filePath);
		await versionStore.detectAndInit(filePath);

		eventBus.emit("map-loaded", mapData);
	} finally {
		editorStore.setLoading(false);
	}
}

// ─── 保存（目录格式走快照） ───
async function handleSaveMapFile() {
	if (versionStore.isDirFormat && versionStore.mapDir) {
		// 目录格式：序列化 + 快照
		try {
			await versionStore.saveCurrent();
			message.success("保存成功", 1);
		} catch (e: any) {
			message.error(`保存失败: ${e.message}`);
		}
		return;
	}

	// 尝试从 currentFilePath 恢复版本管理状态（应对 HMR / store 重置）
	if (editorStore.currentFilePath) {
		const recovered = await versionStore.tryRecoverFromCurrentPath();
		if (recovered) {
			// 恢复成功，走目录格式保存
			try {
				await versionStore.saveCurrent();
				message.success("保存成功", 1);
			} catch (e: any) {
				message.error(`保存失败: ${e.message}`);
			}
			return;
		}
	}

	// 兜底前：防御性检查 — 如果 currentFilePath 是目录但版本状态丢失，尝试恢复
	const cp = editorStore.currentFilePath;
	if (cp) {
		try {
			const s = await getFsApi().statPath(cp);
			if (s.isDirectory) {
				// currentFilePath 是目录但 isDirFormat 未正确恢复 → 最后一次尝试
				const recovered = await versionStore.tryRecoverFromCurrentPath();
				if (recovered) {
					try {
						await versionStore.saveCurrent();
						message.success("保存成功", 1);
					} catch (e2: any) {
						message.error(`保存失败: ${e2.message}`);
					}
				} else {
					message.error("无法保存到此目录，请使用「保存为项目」选择其他位置");
				}
				return;
			}
		} catch {
			// statPath 失败 → 路径不存在，继续尝试旧格式
		}
	}

	// 旧格式 .fpmap：提示升级为项目
	if (versionStore.pendingUpgrade) {
		upgradeVisible.value = true;
		return;
	}

	// 最后兜底：调用前再检查一次，防止中间状态变化
	const pathToSave = editorStore.currentFilePath;
	if (pathToSave) {
		try {
			const check = await getFsApi().statPath(pathToSave);
			if (check.isDirectory) {
				message.error("保存错误：目标路径是目录，请使用「保存为项目」");
				return;
			}
		} catch {
			/* 路径不存在，让 handleSaveProtoFile 处理 */
		}
	}

	// 默认旧格式保存
	handleSaveProtoFile();
}

// ─── 保存为项目目录 ───
async function handleSaveAsMapFile() {
	// 第一步：选择父目录
	const dirResult = await window.electronAPI.showOpenDialog({
		title: "选择项目存放位置",
		properties: ["openDirectory"],
	});
	const parentDir = dirResult.filePaths[0];
	if (!parentDir) return;

	// 第二步：用地图名作为文件夹名
	const mapName = useMapDataStore().info.name || "新地图";
	const safeName = mapName.replace(/[\\/:*?"<>|]/g, "_"); // 移除非法字符
	const dirPath = `${parentDir}/${safeName}`.replace(/\\/g, "/");

	// 检查是否已存在
	if (await window.electronAPI.exists(dirPath)) {
		message.error(`目录已存在: ${dirPath}`);
		return;
	}

	// 创建项目目录
	const mapDataStore = useMapDataStore();
	mapDataStore.info.editorVersion = (window as any).electronAPI?.getVersion?.() || "";

	useEditorStore().setLoading(true);
	try {
		await versionStore.saveAsNewDir(dirPath);
		message.success(`项目已保存到: ${dirPath}`, 1);
	} catch (e: any) {
		message.error(`保存失败: ${e.message}`);
	} finally {
		useEditorStore().setLoading(false);
	}
}

// ─── 升级旧格式为项目 ───
async function handleUpgrade() {
	upgradeVisible.value = false;

	const dirResult = await window.electronAPI.showOpenDialog({
		title: "选择项目存放位置",
		properties: ["openDirectory"],
	});
	const parentDir = dirResult.filePaths[0];
	if (!parentDir) return;

	const mapName = useMapDataStore().info.name || "未命名地图";
	const safeName = mapName.replace(/[\\/:*?"<>|]/g, "_");
	const dirPath = `${parentDir}/${safeName}`.replace(/\\/g, "/");

	if (await window.electronAPI.exists(dirPath)) {
		message.error(`目录已存在: ${dirPath}`);
		return;
	}

	useEditorStore().setLoading(true);
	try {
		await versionStore.upgradeToDir(dirPath);
		message.success(`已升级为项目: ${dirPath}`, 2);
	} catch (e: any) {
		message.error(`升级失败: ${e.message}`);
	} finally {
		useEditorStore().setLoading(false);
	}
}

function openMCPPanel() {
	mcpPanelVisible.value = true;
}

async function handleExportMmmapFile() {
	const mapDataStore = useMapDataStore();
	const editorStore = useEditorStore();

	const res = await window.electronAPI.showSaveDialog({
		title: "导出 .mmmap 产品文件",
		filters: [{ name: "地图产品文件", extensions: ["mmmap"] }],
	});

	const path = res.filePath;
	if (!path) return;

	// 显示进度对话框
	exportProgressVisible.value = true;
	exportProgressPercent.value = 0;
	exportProgressStage.value = "准备中...";

	try {
		await exportGameMapToProductFile(mapDataStore.id, path, mapDataStore.$state, (stage, percent) => {
			exportProgressStage.value = stage;
			exportProgressPercent.value = percent;
		});

		// 导出成功，短暂延迟后关闭对话框
		exportProgressStage.value = "导出完成";
		exportProgressPercent.value = 100;

		setTimeout(() => {
			exportProgressVisible.value = false;
			message.success("导出 .mmmap 文件成功", 1);
		}, 500);
	} catch (error) {
		console.error("导出 .mmmap 文件失败:", error);
		exportProgressVisible.value = false;
		message.error(`导出失败: ${error instanceof Error ? error.message : "未知错误"}`);
	}
}

// ─── 导出 .fpmap ───
async function handleExportFpmapFile() {
	const mapDataStore = useMapDataStore();
	const result = await window.electronAPI.showSaveDialog({
		title: "导出 .fpmap 文件",
		filters: [{ name: "地图文件", extensions: ["fpmap"] }],
	});
	const path = result.filePath;
	if (!path) return;

	useEditorStore().setLoading(true);
	try {
		await saveGameMapToBinFile(mapDataStore.id, path, mapDataStore.$state);
		message.success("导出 .fpmap 成功", 1);
	} catch (e: any) {
		message.error(`导出失败: ${e.message}`);
	} finally {
		useEditorStore().setLoading(false);
	}
}

function handleUndoDelete() {
	eventBus.emit("undo-delete");
}

function handleReloadMap() {
	const mapDataStore = useMapDataStore();
	// 触发 map-loaded 事件，让渲染器重新加载当前地图数据
	eventBus.emit("map-loaded", mapDataStore.$state);
	message.success("地图已重新渲染");
}
</script>

<template>
	<div class="top-panel-container">
		<div class="top-panel left">
			<!-- 文件下拉菜单 -->
			<a-dropdown trigger="['click']">
				<a-button class="menu-button" size="small" type="text">
					<span>文件</span>
					<font-awesome-icon icon="fa-solid fa-chevron-down" style="font-size: 0.8em; margin-left: 4px" />
				</a-button>
				<template #overlay>
					<a-menu @click="handleFileMenuClick">
						<a-menu-item key="new">新建</a-menu-item>
						<a-menu-item key="open-project">打开项目</a-menu-item>
						<a-menu-item key="open-fpmap">打开 .fpmap 文件</a-menu-item>
						<a-menu-divider />
						<a-menu-item key="save">保存 ({{ modLabel }}+S)</a-menu-item>
						<a-menu-item key="saveas">保存为项目</a-menu-item>
						<a-menu-divider />
						<a-menu-item key="export-fpmap">导出 .fpmap</a-menu-item>
						<a-menu-item key="exportmmmap">导出 .mmmap</a-menu-item>
					</a-menu>
				</template>
			</a-dropdown>

			<!-- 恢复删除 -->
			<a-button v-if="editorStore.canUndoDelete" @click="handleUndoDelete" class="menu-button" size="small" type="text">
				<span>恢复删除 ({{ modLabel }}+Z)</span>
			</a-button>

			<!-- 重新渲染 -->
			<a-button @click="handleReloadMap" class="menu-button" size="small" type="text">
				<span>重新渲染</span>
			</a-button>

			<!-- Divider -->
			<a-divider v-if="versionStore.isRepo" type="vertical" style="height: 20px; margin: 0 10px" />

			<!-- 版本历史 -->
			<a-button
				v-if="versionStore.isRepo"
				@click="versionStore.togglePanel()"
				class="menu-button"
				size="small"
				type="text"
			>
				<span>版本历史 ({{ versionStore.snapshotCount }})</span>
			</a-button>

			<!-- Divider -->
			<a-divider type="vertical" style="height: 20px; margin: 0 10px" />

			<!-- MCP Server Section -->
			<div class="mcp-server-section">
				<a-button size="small" type="text" @click="openMCPPanel">
					MCP 服务器
					<!-- Server Status Indicator Dot inside button -->
					<span v-if="mcpPanelRef?.serverRunning" class="status-dot running" title="运行中"></span>
					<span v-else class="status-dot stopped" title="未启动"></span>
				</a-button>
			</div>
		</div>
		<div class="top-panel right">
			<span v-if="editorStore.currentFilePath">
				当前地图文件: {{ editorStore.currentFilePath }}
				<span v-if="versionStore.saveStatusText" style="margin-left: 12px; color: #888">
					· {{ versionStore.saveStatusText }}
				</span>
			</span>
		</div>
	</div>
	<MCPControlPanel ref="mcpPanelRef" v-model="mcpPanelVisible" />
	<VersionPanel v-model:open="versionStore.panelVisible" />
	<ExportProgressDialog
		v-model:open="exportProgressVisible"
		:percent="exportProgressPercent"
		:stage="exportProgressStage"
	/>
	<a-modal
		v-model:open="upgradeVisible"
		title="升级为项目格式"
		@ok="handleUpgrade"
		ok-text="升级"
		cancel-text="暂不升级"
		@cancel="upgradeVisible = false; handleSaveProtoFile()"
	>
		<p>当前地图为旧版单文件格式，升级后可使用 Git 版本管理和代码对比功能。</p>
	</a-modal>
</template>

<style lang="scss" scoped>
.top-panel-container {
	display: flex;
	width: 100%;
	height: 100%;
}

.top-panel {
	display: flex;
	align-items: center;

	&.left {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	&.right {
		font-size: 0.7em;
		text-align: right;
		margin-right: 10px;
		margin-left: auto;
	}
}

.menu-button {
	margin-left: 5px;

	&:first-child {
		margin-left: 0;
	}
}

.mcp-server-section {
	display: flex;
	align-items: center;
	gap: 8px;
}

.status-dot {
	display: inline-block;
	width: 8px;
	height: 8px;
	border-radius: 50%;
	margin-left: 6px;
	margin-bottom: 1px;

	&.running {
		background-color: #52c41a;
	}

	&.stopped {
		background-color: #d9d9d9;
	}
}
</style>
