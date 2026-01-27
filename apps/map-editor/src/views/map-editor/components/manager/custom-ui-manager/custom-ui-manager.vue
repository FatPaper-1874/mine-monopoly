<script setup lang="ts">
import { ref, computed } from "vue";
import { message } from "ant-design-vue";
import { CustomUI, UITemplate } from "@fatpaper-monopoly/types";
import { useMapDataStore } from "@src/stores";

// 组件引入
import UiSelector from "./ui-selector.vue";
import CustomUiTemplateEditor from "./form/custom-ui-template-editor.vue";
import CustomUiInstanceEditor from "./form/custom-ui-instance-editor.vue";

const mapStore = useMapDataStore();
const model = defineModel<boolean>({ default: false });

// 状态定义
const activeTab = ref<"library" | "map">("library");
const editorVisible = ref(false);

// 当前正在编辑的数据
const currentTemplate = ref<UITemplate | null>(null);
const currentInstance = ref<CustomUI | null>(null);

// 模式判断
const isEditingTemplate = computed(() => !!currentTemplate.value);

// 工具函数：生成UUID
function generateUUID() {
	if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
	return URL.createObjectURL(new Blob([])).slice(-36);
}

/**
 * --- 组件库管理 (Templates) ---
 */
function handleCreateTemplate() {
	// 1. 初始化一个新的 UITemplate 结构
	const newTemplate: UITemplate = {
		id: generateUUID(),
		name: "新组件_" + Math.floor(Math.random() * 1000),
		slug: "",
		template: {
			id: generateUUID(),
			type: "div", // 根节点类型
			children: [],
			style: {
				width: "100%",
				height: "100%",
				boxSizing: "border-box",
			},
		},
	};
	currentTemplate.value = newTemplate;
	currentInstance.value = null;
	editorVisible.value = true;
}

function handleEditTemplate(t: UITemplate) {
	// 深拷贝，防止编辑时直接修改 Store
	currentTemplate.value = JSON.parse(JSON.stringify(t));
	currentInstance.value = null;
	editorVisible.value = true;
}

function handleDeleteTemplate(id: string) {
	// 检查占用：CustomUI.uiSchema 字段存的是 UITemplate.id
	const isUsed = mapStore.customUIs.some((ui) => ui.uiSchema === id);
	if (isUsed) {
		message.error("无法删除：该组件正被地图上的实例引用，请先删除相关实例。");
		return;
	}
	mapStore.removeUITemplate(id);
	message.success("组件模板已删除");
}

function handleSaveTemplate(t: UITemplate) {
	mapStore.saveUITemplate(t);
	message.success("组件模板保存成功");
	closeEditor();
}

/**
 * --- 地图实例管理 (Instances) ---
 */
function handleMapCreate(layout: { x: number; y: number; width: number; height: number }) {
	if (mapStore.uiTemplates.length === 0) {
		message.warning("请先在【组件库】中创建一个组件模板");
		return;
	}

	const tempInstance: CustomUI = {
		id: generateUUID(),
		name: "新建实例",
		layout,
		uiSchema: mapStore.uiTemplates[0]?.id || "", // 默认选中第一个模板ID
	};

	currentInstance.value = tempInstance;
	currentTemplate.value = null;
	editorVisible.value = true;
}

function handleMapSelect(ui: CustomUI) {
	currentInstance.value = JSON.parse(JSON.stringify(ui));
	currentTemplate.value = null;
	editorVisible.value = true;
}

function handleSaveInstance(ui: CustomUI) {
	mapStore.saveCustomUI(ui);
	message.success("实例保存成功");
	closeEditor();
}

function handleDeleteInstance(id: string) {
	mapStore.removeCustomUI(id);
	message.success("实例已删除");
	closeEditor();
}

function closeEditor() {
	editorVisible.value = false;
	currentTemplate.value = null;
	currentInstance.value = null;
}
</script>

<template>
	<a-modal
		v-model:open="model"
		title="自定义UI管理器"
		width="100%"
		destroyOnClose
		:footer="null"
		wrap-class-name="custom-ui-manager-container"
	>
		<div class="manager-layout">
			<div class="toolbar">
				<a-radio-group v-model:value="activeTab" button-style="solid">
					<a-radio-button value="library">组件库</a-radio-button>
					<a-radio-button value="map">自定义UI</a-radio-button>
				</a-radio-group>
			</div>

			<div v-if="activeTab === 'library'" class="library-view custom-scrollbar">
				<div class="library-header">
					<span>共 {{ mapStore.uiTemplates.length }} 个组件模板</span>
					<a-button type="primary" @click="handleCreateTemplate"> + 新建组件 </a-button>
				</div>

				<div class="card-grid">
					<div v-for="item in mapStore.uiTemplates" :key="item.id" class="schema-card">
						<div class="card-info">
							<div class="card-name">{{ item.name }}</div>
							<div class="card-slug">{{ item.slug }}</div>
							<div class="card-id">ID: {{ item.id }}</div>
						</div>
						<div class="card-actions">
							<a-button size="small" @click="handleEditTemplate(item)">编辑</a-button>
							<a-button size="small" danger @click="handleDeleteTemplate(item.id)">删除</a-button>
						</div>
					</div>
					<div v-if="mapStore.uiTemplates.length === 0" class="empty-state">暂无组件，请点击上方按钮创建</div>
				</div>
			</div>

			<div v-if="activeTab === 'map'" class="map-view">
				<ui-selector @select="handleMapSelect" @create="handleMapCreate"></ui-selector>
			</div>
		</div>
	</a-modal>

	<a-modal
		v-model:open="editorVisible"
		:title="isEditingTemplate ? '编辑组件模板' : '编辑 UI 实例'"
		width="100%"
		centered
		destroyOnClose
		:footer="null"
		:mask-closable="false"
		class="editor-modal"
	>
		<custom-ui-template-editor
			v-if="isEditingTemplate && currentTemplate"
			:data="currentTemplate"
			@save="handleSaveTemplate"
			@cancel="closeEditor"
		/>

		<custom-ui-instance-editor
			v-if="!isEditingTemplate && currentInstance"
			:instance="currentInstance"
			:templates="mapStore.uiTemplates"
			@save="handleSaveInstance"
			@delete="handleDeleteInstance"
		/>
	</a-modal>
</template>

<style lang="scss">
.custom-ui-manager-container {
	.ant-modal {
		max-width: 96vw;
		top: 5vh;
		padding-bottom: 0;
	}
	.ant-modal-content {
		display: flex;
		flex-direction: column;
		height: 90vh;
		overflow: hidden;
	}
	.ant-modal-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		padding: 0;
	}
}

.manager-layout {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
	border-radius: 10px;
}

.toolbar {
	padding: 12px 24px;
	border-bottom: 1px solid #f0f0f0;
	background: #fafafa;
	display: flex;
	justify-content: center;
}

.library-view {
	flex: 1;
	padding: 24px;
	overflow-y: auto;
	background: #f5f5f5;
}

.library-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 16px;
	font-weight: bold;
	color: #666;
}

.card-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	gap: 16px;
}

.schema-card {
	background: #fff;
	border-radius: 8px;
	padding: 16px;
	border: 1px solid #e8e8e8;
	display: flex;
	justify-content: space-between;
	align-items: center;
	transition: all 0.2s;
	&:hover {
		border-color: #1890ff;
	}
}

.card-name {
	font-weight: 600;
	font-size: 16px;
	margin-bottom: 2px;
}

.card-slug {
	font-size: 12px;
	color: #58afff;
	font-weight: 600;
	margin-bottom: 2px;
}

.card-id {
	font-size: 12px;
	color: #999;
	font-family: monospace;
}

.card-actions {
	display: flex;
	gap: 8px;
}

.empty-state {
	text-align: center;
	padding: 40px;
	color: #999;
}

.map-view {
	flex: 1;
	padding: 12px;
	overflow: hidden;
	background: #f5f5f5;
}
</style>
