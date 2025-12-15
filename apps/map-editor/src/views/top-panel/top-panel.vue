<script setup lang="ts">
import { useEditorStore, useMapDataStore, useResourceStore } from "@src/stores";
import {
	handleNewProtoFile,
	handleOpenProtoFile,
	handleSaveAsOtherProtoFile,
	handleSaveProtoFile,
} from "@src/utils/file";

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
