<script setup lang="ts">
import { useEditorStore, useMapDataStore, useResourceStore } from "@src/stores";
import { handleOpenProtoFile, handleSaveAsOtherProtoFile, handleSaveProtoFile } from "@src/utils/file";

const editorStore = useEditorStore();

enum OperationType {
	OPEN = "open",
	SAVE = "save",
	SAVEAS = "saveas",
}

type MenuItem = { label: string; key: OperationType; icon: string };

const menus: MenuItem[] = [
	{ label: "打开", key: OperationType.OPEN, icon: "folder-open" },
	{ label: "保存 (ctrl+s)", key: OperationType.SAVE, icon: "floppy-disk" },
	{ label: "另存为", key: OperationType.SAVEAS, icon: "file-export" },
];

function handleMenuClick(key: OperationType) {
	switch (key) {
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
</script>

<template>
	<div class="top-panel left">
		<a-button
			@click="handleMenuClick(menuItem.key)"
			v-for="menuItem in menus"
			class="menu-button"
			size="small"
			type="text"
		>
			<span>{{ menuItem.label }}</span>
		</a-button>
	</div>
	<div class="top-panel right">
		<span v-if="editorStore.currentFilePath">当前地图文件: {{ editorStore.currentFilePath }}</span>
	</div>
</template>

<style lang="scss" scoped>
.top-panel {
	&.right {
		flex: 1;
		font-size: 0.7em;
		text-align: right;
		margin-right: 10px;
	}
}

.menu-button {
	margin-left: 5px;
}
</style>
