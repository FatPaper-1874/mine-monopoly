<script setup lang="ts">
import { ref } from "vue";
import { useEditorStore, useMapDataStore, useResourceStore } from "@src/stores";
import {
	handleNewProtoFile,
	handleOpenProtoFile,
	handleSaveAsOtherProtoFile,
	handleSaveProtoFile,
} from "@src/utils/file";
import MCPControlPanel from "@src/components/mcp/MCPControlPanel.vue";
import { eventBus } from "@src/utils/event-bus";

const editorStore = useEditorStore();

enum OperationType {
	NEW = "new",
	OPEN = "open",
	SAVE = "save",
	SAVEAS = "saveas",
}

type MenuItem = { label: string; key: OperationType };

const menus: MenuItem[] = [
	{ label: "新建", key: OperationType.NEW },
	{ label: "打开", key: OperationType.OPEN },
	{ label: "保存 (ctrl+s)", key: OperationType.SAVE },
	{ label: "另存为", key: OperationType.SAVEAS },
];

const mcpPanelVisible = ref(false);
const mcpPanelRef = ref();

function handleMenuClick(key: OperationType) {
	switch (key) {
		case OperationType.NEW:
			handleNewProtoFile();
			break;

		case OperationType.OPEN:
			handleOpenProtoFile();
			break;

		case OperationType.SAVE:
			handleSaveProtoFile();
			break;

		case OperationType.SAVEAS:
			handleSaveAsOtherProtoFile();
			break;
	}
}

function openMCPPanel() {
	mcpPanelVisible.value = true;
}

function handleUndoDelete() {
	eventBus.emit("undo-delete");
}
</script>

<template>
	<div class="top-panel-container">
		<div class="top-panel left">
			<!-- File Operations -->
			<!-- 新建 -->
			<a-button
				@click="handleMenuClick(OperationType.NEW)"
				class="menu-button"
				size="small"
				type="text"
			>
				<span>新建</span>
			</a-button>

			<!-- 打开 -->
			<a-button
				@click="handleMenuClick(OperationType.OPEN)"
				class="menu-button"
				size="small"
				type="text"
			>
				<span>打开</span>
			</a-button>

			<!-- 恢复删除 (插入到"打开"和"保存"之间) -->
			<a-button
				v-if="editorStore.canUndoDelete"
				@click="handleUndoDelete"
				class="menu-button"
				size="small"
				type="text"
			>
				<span>恢复删除 (Ctrl+Z)</span>
			</a-button>

			<!-- 保存 -->
			<a-button
				@click="handleMenuClick(OperationType.SAVE)"
				class="menu-button"
				size="small"
				type="text"
			>
				<span>保存 (ctrl+s)</span>
			</a-button>

			<!-- 另存为 -->
			<a-button
				@click="handleMenuClick(OperationType.SAVEAS)"
				class="menu-button"
				size="small"
				type="text"
			>
				<span>另存为</span>
			</a-button>

			<!-- Divider -->
			<a-divider type="vertical" style="height: 20px; margin: 0 10px;" />

			<!-- MCP Server Section -->
			<div class="mcp-server-section">
				<a-button size="small" type="text" @click="openMCPPanel">
					MCP 服务器
					<!-- Server Status Indicator Dot inside button -->
					<span
						v-if="mcpPanelRef?.serverRunning"
						class="status-dot running"
						title="运行中"
					></span>
					<span
						v-else
						class="status-dot stopped"
						title="未启动"
					></span>
				</a-button>
			</div>
		</div>
		<div class="top-panel right">
			<span v-if="editorStore.currentFilePath">当前地图文件: {{ editorStore.currentFilePath }}</span>
		</div>
	</div>
	<MCPControlPanel ref="mcpPanelRef" v-model="mcpPanelVisible" />
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
