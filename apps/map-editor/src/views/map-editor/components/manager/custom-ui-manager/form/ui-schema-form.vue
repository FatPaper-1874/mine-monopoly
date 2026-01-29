<script setup lang="ts">
import { ref, computed, defineAsyncComponent, watch } from "vue";
import { message } from "ant-design-vue";
import { UISchema } from "@mine-monopoly/types";

const props = defineProps<{ modelValue: UISchema }>();
const emit = defineEmits(["update:modelValue"]);

const KeyValueEditor = defineAsyncComponent(() => import("./key-value-editor.vue"));

// --- State ---
const activePanelKeys = ref<string[]>(["1", "2", "3", "4"]);
const selectedKeys = ref<string[]>([]);

// JSON 导入弹窗的状态
const isJsonModalVisible = ref(false);
const jsonImportContent = ref("");

const rootId = computed(() => props.modelValue?.id);

watch(
	() => props.modelValue,
	(val) => {
		if (val && selectedKeys.value.length === 0) selectedKeys.value = [val.id];
	},
	{ immediate: true },
);

// --- Computed ---
const treeData = computed(() => {
	if (!props.modelValue) return [];
	const transform = (node: UISchema): any => ({
		title: node.type,
		key: node.id,
		type: node.type,
		id: node.id,
		// [优化] 传递 content 用于树节点展示
		content: node.content,
		dataRef: node, // 保存引用
		children: node.children ? node.children.map(transform) : [],
		isLeaf: !node.children || node.children.length === 0,
		vFor: node.vFor,
	});
	return [transform(props.modelValue)];
});

const selectedKey = computed(() => selectedKeys.value[0]);
const selectedNode = computed(() => {
	if (!selectedKeys.value.length || !props.modelValue) return null;
	const key = selectedKeys.value[0];
	const findNode = (node: UISchema): UISchema | null => {
		if (node.id === key) return node;
		if (node.children) {
			for (const child of node.children) {
				const found = findNode(child);
				if (found) return found;
			}
		}
		return null;
	};
	return findNode(props.modelValue);
});

// --- Methods ---
const generateId = () => `node-${Math.random().toString(36).substring(2, 9)}`;

// [核心工具] 递归复制节点并生成新 ID
const cloneAndGenerateIds = (node: any): UISchema => {
	const newNode: UISchema = {
		...node,
		id: generateId(),
		type: node.type || "div",
		children: [],
	};

	if (node.children && Array.isArray(node.children)) {
		newNode.children = node.children.map((child: any) => cloneAndGenerateIds(child));
	}
	return newNode;
};

// 复制当前节点 JSON
const copyNodeJson = async () => {
	if (!selectedNode.value) return;
	try {
		const jsonStr = JSON.stringify(selectedNode.value, null, 2);
		await navigator.clipboard.writeText(jsonStr);
		message.success(`节点 "${selectedNode.value.type}" 已复制到剪贴板`);
	} catch (err) {
		message.error("复制失败");
	}
};

// 打开导入弹窗
const openImportModal = () => {
	if (!selectedNode.value) return;
	jsonImportContent.value = "";
	isJsonModalVisible.value = true;
};

// 执行导入 JSON
const handleImportJson = () => {
	const node = selectedNode.value;
	if (!node) return message.warning("请先选择一个节点");

	if (!jsonImportContent.value.trim()) {
		return message.warning("请输入 JSON 内容");
	}

	try {
		const parsed = JSON.parse(jsonImportContent.value);
		if (typeof parsed !== "object" || !parsed.type) {
			return message.error("无效的 UI Schema 格式 (缺少 type)");
		}

		const newNode = cloneAndGenerateIds(parsed);

		if (!node.children) node.children = [];
		node.children.push(newNode);

		emit("update:modelValue", props.modelValue);
		message.success("节点已导入");
		isJsonModalVisible.value = false;
	} catch (error) {
		message.error("JSON 解析失败，请检查语法");
	}
};

const insertTemplate = (templateName: string) => {
	if (!selectedNode.value) return;

	let templateNode: Partial<UISchema> = {};

	if (templateName === "loop") {
		templateNode = {
			type: "div",
			vFor: "item in list",
			style: { padding: "8px", borderBottom: "1px solid #eee" },
			children: [{ id: "", type: "div", children: [{ id: "", type: "text", textBinding: "item" }] }],
		};
	} else if (templateName === "card") {
		templateNode = {
			type: "div",
			style: {
				border: "1px solid #ddd",
				borderRadius: "8px",
				padding: "16px",
				display: "flex",
				flexDirection: "column",
				gap: "8px",
			},
			children: [
				{
					id: "",
					type: "img",
					style: { width: "100%", height: "120px", backgroundColor: "#f0f0f0", objectFit: "cover" },
				},
				{ id: "", type: "text", content: "Title", style: { fontWeight: "bold" } },
			],
		};
	} else if (templateName === "icon") {
		templateNode = {
			type: "svg",
			props: {
				viewBox: "0 0 24 24",
				width: "24",
				height: "24",
				fill: "none",
				stroke: "currentColor",
				"stroke-width": "2",
			},
			children: [
				{
					id: "",
					type: "path",
					props: { d: "M20 6L9 17l-5-5", "stroke-linecap": "round", "stroke-linejoin": "round" },
				},
			],
		};
	}

	const newNode = cloneAndGenerateIds(templateNode);
	if (!selectedNode.value.children) selectedNode.value.children = [];
	selectedNode.value.children.push(newNode);

	emit("update:modelValue", props.modelValue);
	message.success("模板已插入");
};

const addNode = () => {
	if (!selectedNode.value) return;
	const newNode: UISchema = { id: generateId(), type: "div", style: {}, children: [] };
	if (!selectedNode.value.children) selectedNode.value.children = [];
	selectedNode.value.children.push(newNode);
	emit("update:modelValue", props.modelValue);
	message.success("节点已添加");
};

const removeNode = () => {
	const keyToRemove = selectedKeys.value[0];
	if (!keyToRemove || keyToRemove === rootId.value) return message.warning("根节点不可删除");
	const removeRecursive = (node: UISchema, parent?: UISchema) => {
		if (node.id === keyToRemove && parent && parent.children) {
			const idx = parent.children.findIndex((c) => c.id === keyToRemove);
			if (idx > -1) {
				parent.children.splice(idx, 1);
				selectedKeys.value = [parent.id];
				emit("update:modelValue", props.modelValue);
				message.success("节点已删除");
			}
			return true;
		}
		if (node.children) {
			for (const child of node.children) {
				if (removeRecursive(child, node)) return true;
			}
		}
		return false;
	};
	removeRecursive(props.modelValue);
};
</script>

<template>
	<div class="schema-editor-container">
		<div class="left-panel">
			<div class="panel-header">
				<span class="header-title">组件树</span>
				<div class="header-actions">
					<a-dropdown :trigger="['click']">
						<button class="icon-btn" title="插入模板" :disabled="!selectedNode">模板</button>
						<template #overlay>
							<a-menu>
								<a-menu-item @click="insertTemplate('loop')">插入: 列表循环</a-menu-item>
								<a-menu-item @click="insertTemplate('card')">插入: 卡片组件</a-menu-item>
								<a-menu-item @click="insertTemplate('icon')">插入: SVG 图标</a-menu-item>
							</a-menu>
						</template>
					</a-dropdown>

					<button class="icon-btn" @click="openImportModal" :disabled="!selectedNode" title="导入 JSON 添加子节点">
						导入
					</button>

					<button class="icon-btn" @click="copyNodeJson" :disabled="!selectedNode" title="复制当前节点 JSON">
						导出
					</button>

					<div class="divider-v"></div>

					<button class="icon-btn" @click="addNode" :disabled="!selectedNode" title="添加空白节点">添加</button>

					<button
						class="icon-btn danger"
						@click="removeNode"
						:disabled="!selectedKey || selectedKey === rootId"
						title="删除节点"
					>
						删除
					</button>
				</div>
			</div>

			<div class="tree-wrapper custom-scrollbar">
				<a-tree
					v-if="treeData && treeData.length"
					:tree-data="treeData"
					:field-names="{ children: 'children', title: 'title', key: 'key' }"
					default-expand-all
					show-line
					block-node
					v-model:selectedKeys="selectedKeys"
				>
					<template #title="{ dataRef }">
						<div class="tree-node-content">
							<span class="type-tag" :class="dataRef.type">{{ dataRef.type }}</span>

							<span v-if="dataRef.content" class="node-content-preview" :title="dataRef.content">
								{{ dataRef.content.length > 15 ? dataRef.content.slice(0, 15) + "..." : dataRef.content }}
							</span>
							<span v-else class="node-id">{{ dataRef.id }}</span>

							<span v-if="dataRef.vFor" class="loop-badge">LOOP</span>
						</div>
					</template>
				</a-tree>
			</div>
		</div>

		<div class="right-panel">
			<div v-if="selectedNode" class="editor-content">
				<div class="panel-header">
					<span class="header-title">
						属性面板
						<span class="header-subtitle">/ {{ selectedNode.type }}</span>
					</span>
					<span class="header-id">ID: {{ selectedNode.id }}</span>
				</div>

				<div class="scrollable-form custom-scrollbar">
					<a-form layout="vertical" :model="selectedNode">
						<div class="form-section">
							<div class="section-title">基础属性</div>
							<a-row :gutter="12">
								<a-col :span="24">
									<a-form-item label="组件类型">
										<a-select v-model:value="selectedNode.type" show-search>
											<a-select-opt-group label="基础组件">
												<a-select-option value="div">容器 (div)</a-select-option>
												<a-select-option value="span">行内文本 (span)</a-select-option>
												<a-select-option value="text">纯文本节点 (text)</a-select-option>
												<a-select-option value="img">图片 (img)</a-select-option>
												<a-select-option value="button">按钮 (button)</a-select-option>
											</a-select-opt-group>
											<a-select-opt-group label="SVG 矢量图">
												<a-select-option value="svg">画布 (svg)</a-select-option>
												<a-select-option value="path">路径 (path)</a-select-option>
												<a-select-option value="circle">圆形 (circle)</a-select-option>
												<a-select-option value="rect">矩形 (rect)</a-select-option>
												<a-select-option value="line">线条 (line)</a-select-option>
												<a-select-option value="g">分组 (g)</a-select-option>
											</a-select-opt-group>
										</a-select>
									</a-form-item>
								</a-col>
							</a-row>

							<template v-if="['text', 'button', 'span'].includes(selectedNode.type)">
								<a-row :gutter="12">
									<a-col :span="12">
										<a-form-item label="静态文本">
											<a-input v-model:value="selectedNode.content" placeholder="输入文本内容" />
										</a-form-item>
									</a-col>
									<a-col :span="12">
										<a-form-item label="动态绑定">
											<a-input
												v-model:value="selectedNode.textBinding"
												prefix="{{"
												suffix="}}"
												placeholder="例如: user.name"
											/>
										</a-form-item>
									</a-col>
								</a-row>
							</template>
						</div>

						<div class="form-section">
							<div class="section-title">渲染逻辑</div>
							<a-row :gutter="12">
								<a-col :span="12">
									<a-form-item label="v-show (条件显示)">
										<a-input v-model:value="selectedNode.vShow" placeholder="例如: isVisible" />
									</a-form-item>
								</a-col>
								<a-col :span="12">
									<a-form-item label="v-for (循环渲染)">
										<a-input v-model:value="selectedNode.vFor" placeholder="例如: item in list" />
									</a-form-item>
								</a-col>
							</a-row>
						</div>

						<div class="collapse-container">
							<a-collapse ghost v-model:activeKey="activePanelKeys" :bordered="false">
								<a-collapse-panel key="1" header="样式配置 (Static Style)">
									<KeyValueEditor v-model:value="selectedNode.style" />
								</a-collapse-panel>
								<a-collapse-panel key="2" header="样式绑定 (Dynamic Style)">
									<p class="panel-desc">CSS 属性绑定</p>
									<KeyValueEditor v-model:value="selectedNode.styleBinding" />
								</a-collapse-panel>
								<a-collapse-panel key="3" header="原生属性 (HTML Props)">
									<p class="panel-desc">静态属性</p>
									<KeyValueEditor v-model:value="selectedNode.props" />
								</a-collapse-panel>
								<a-collapse-panel key="4" header="动态属性 (Props Binding)">
									<p class="panel-desc">动态属性绑定</p>
									<KeyValueEditor v-model:value="selectedNode.propsBinding" />
								</a-collapse-panel>
							</a-collapse>
						</div>
					</a-form>
				</div>
			</div>
			<div v-else class="empty-state">
				<svg viewBox="0 0 24 24" width="48" height="48" stroke="#e0e0e0" stroke-width="1" fill="none">
					<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
					<line x1="9" y1="3" x2="9" y2="21"></line>
				</svg>
				<p>请选择左侧节点进行编辑</p>
			</div>
		</div>

		<a-modal
			v-model:open="isJsonModalVisible"
			title="导入 JSON 节点"
			@ok="handleImportJson"
			okText="导入"
			cancelText="取消"
		>
			<a-textarea
				v-model:value="jsonImportContent"
				placeholder="请粘贴 UI Schema JSON (例如: { 'type': 'div', ... })"
				:rows="10"
				style="font-family: monospace; font-size: 12px"
			/>
		</a-modal>
	</div>
</template>

<style scoped>
.schema-editor-container {
	display: flex;
	height: 100%;
	width: 100%;
	border: 1px solid #e8e8e8;
	border-radius: 6px;
	background: #fff;
	overflow: hidden;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.panel-header {
	height: 48px;
	padding: 0 16px;
	border-bottom: 1px solid #f0f0f0;
	display: flex;
	justify-content: space-between;
	align-items: center;
	background: #fff;
	flex-shrink: 0;
}

.header-title {
	font-weight: 600;
	font-size: 14px;
	color: #1f1f1f;
}

.header-actions {
	display: flex;
	gap: 4px;
	align-items: center;
}

.divider-v {
	width: 1px;
	height: 16px;
	background: #e8e8e8;
	margin: 0 4px;
}

.header-subtitle {
	color: #999;
	font-weight: normal;
	font-size: 13px;
	margin-left: 4px;
}

.header-id {
	font-family: monospace;
	color: #bfbfbf;
	font-size: 12px;
	background: #f5f5f5;
	padding: 2px 6px;
	border-radius: 4px;
}

.icon-btn {
	border: none;
	background: transparent;
	cursor: pointer;
	padding: 6px;
	border-radius: 4px;
	color: #666;
	display: flex;
	align-items: center;
	transition: background 0.2s;
}

.icon-btn:hover:not(:disabled) {
	background: #f0f0f0;
	color: #1890ff;
}

.icon-btn.danger:hover:not(:disabled) {
	background: #fff1f0;
	color: #ff4d4f;
}

.icon-btn:disabled {
	color: #d9d9d9;
	cursor: not-allowed;
}

.left-panel {
	width: 360px;
	border-right: 1px solid #f0f0f0;
	display: flex;
	flex-direction: column;
}

.tree-wrapper {
	flex: 1;
	overflow-y: auto;
	padding: 10px 0;
}

.tree-node-content {
	display: flex;
	align-items: center;
	font-size: 13px;
	width: 100%;
}

.type-tag {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	height: 18px;
	padding: 0 6px;
	border-radius: 3px;
	font-size: 10px;
	font-weight: 700;
	margin-right: 8px;
	text-transform: uppercase;
	color: white;
}

.type-tag.div {
	background-color: #5c8ae6;
}

.type-tag.text {
	background-color: #52c41a;
}

.type-tag.button {
	background-color: #fa8c16;
}

.type-tag.img {
	background-color: #eb2f96;
}

.type-tag.span {
	background-color: #13c2c2;
}

.type-tag.svg,
.type-tag.path,
.type-tag.circle,
.type-tag.rect,
.type-tag.line,
.type-tag.g {
	background-color: #722ed1;
}

.node-id {
	color: #ccc;
	font-size: 12px;
	transform: scale(0.9);
}

/* [新增样式] 树节点内容预览 */
.node-content-preview {
	color: #555;
	font-weight: 500;
	margin-right: 8px;
}

.loop-badge {
	font-size: 9px;
	color: #faad14;
	border: 1px solid #faad14;
	border-radius: 2px;
	padding: 0 3px;
	margin-left: 6px;
	font-weight: bold;
}

.right-panel {
	flex: 1;
	display: flex;
	flex-direction: column;
	background: #fff;
	min-width: 0;
	overflow-y: hidden;
}

.editor-content {
	height: 100%;
	display: flex;
	flex-direction: column;
}

.scrollable-form {
	flex: 1;
	height: 100%;
	overflow-y: scroll;
	padding: 20px 24px;
	min-height: 0;
}

.form-section {
	margin-bottom: 24px;
	padding: 16px;
	background: #fff;
}

.section-title {
	font-size: 12px;
	font-weight: bold;
	color: #999;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	margin-bottom: 12px;
	padding-bottom: 8px;
	border-bottom: 1px dashed #f0f0f0;
}

.collapse-container {
	margin-top: 24px;
	border-top: 1px solid #f0f0f0;
}

.panel-desc {
	font-size: 12px;
	color: #bfbfbf;
	margin-bottom: 8px;
}

.empty-state {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	color: #bfbfbf;
	font-size: 13px;
}

.custom-scrollbar::-webkit-scrollbar {
	width: 6px;
	height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
	background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
	background: rgba(0, 0, 0, 0.1);
	border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
	background: rgba(0, 0, 0, 0.2);
}
:deep(.ant-form-item) {
	margin-bottom: 16px;
}

:deep(.ant-form-item-label > label) {
	font-size: 13px;
	color: #666;
}

:deep(.ant-tree .ant-tree-node-content-wrapper.ant-tree-node-selected) {
	background-color: #e6f7ff !important;
	color: #1890ff;
	font-weight: 500;
}
</style>
