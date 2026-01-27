<script setup lang="ts">
import { CameraMode, OperationMode } from "@src/enums";
import { message } from "ant-design-vue";
import { useEditorStore, useMapDataStore } from "@src/stores";
import { computed, ref, defineAsyncComponent, shallowRef } from "vue";
import { eventBus } from "@src/utils/event-bus";
import { addNewImage } from "@src/utils/file";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

const editorStore = useEditorStore();

// --- 类型定义 ---
type ItemType = "modal" | "action";

interface ToolbarItem {
	key: string; // 唯一标识
	text: string; // 按钮文字
	icon: string; // 图标 class
	type: ItemType; // 类型：打开弹窗 或 执行函数
	component?: any; // 异步组件 (type='modal' 时必填)
	action?: () => void; // 执行函数 (type='action' 时必填)
}

// --- 核心配置表：在这里管理所有功能 ---
const toolbarItems: ToolbarItem[] = [
	{
		key: "MapInfo",
		text: "地图信息",
		icon: "fas fa-circle-info",
		type: "modal",
		component: defineAsyncComponent(() => import("../manager/map-info-form.vue")),
	},
	{
		key: "Model",
		text: "模型资源",
		icon: "fas fa-cubes",
		type: "modal",
		component: defineAsyncComponent(() => import("../manager/model-manager.vue")),
	},
	{
		key: "Role",
		text: "角色管理",
		icon: "fas fa-mask",
		type: "modal",
		component: defineAsyncComponent(() => import("../manager/role-manager.vue")),
	},
	{
		key: "MapIndex",
		text: "路径索引",
		icon: "fas fa-bezier-curve",
		type: "modal",
		component: defineAsyncComponent(() => import("../common/map-index-creator.vue")),
	},
	{
		key: "Background",
		text: "地图背景",
		icon: "fas fa-image",
		type: "action",
		action: selectMapBackgroundImage, // 特殊逻辑直接引用函数
	},
	{
		key: "Building",
		text: "建筑模型",
		icon: "fas fa-house",
		type: "modal",
		component: defineAsyncComponent(() => import("../manager/default-building-manager.vue")),
	},
	{
		key: "Process",
		text: "游戏流程",
		icon: "fas fa-microchip",
		type: "modal",
		component: defineAsyncComponent(() => import("../manager/process-manager/process-manager.vue")),
	},
	{
		key: "Event",
		text: "地块事件",
		icon: "fas fa-book",
		type: "modal",
		component: defineAsyncComponent(() => import("../manager/event-manager.vue")),
	},
	{
		key: "ChanceCard",
		text: "机会卡",
		icon: "fas fa-wand-magic-sparkles",
		type: "modal",
		component: defineAsyncComponent(() => import("../manager/chancecard-manager.vue")),
	},
	{
		key: "CustomUI",
		text: "自定义UI",
		icon: "fas fa-layer-group",
		type: "modal",
		component: defineAsyncComponent(() => import("../manager/custom-ui-manager/custom-ui-manager.vue")),
	},
	{
		key: "MapData",
		text: "JSON数据",
		icon: "fas fa-database",
		type: "modal",
		component: defineAsyncComponent(() => import("../common/map-data-viewer.vue")),
	},
	{
		key: "GameSetting",
		text: "游戏参数",
		icon: "fas fa-sliders-h",
		type: "modal",
		component: defineAsyncComponent(() => import("../manager/forms/game-setting-form/index.vue")),
	},
	{
		key: "ExtraLibs",
		text: "TS类型",
		icon: "fas fa-code",
		type: "modal",
		component: defineAsyncComponent(() => import("../manager/forms/extra-libs-editor/extra-libs-editor.vue")),
	},
];

// --- 状态管理 ---
// 当前激活的功能 Key
const activeKey = ref<string | null>(null);

// 计算当前应该渲染的组件
// 使用 shallowRef 或直接返回 definition 都可以，Vue 会自动处理 defineAsyncComponent
const currentComponent = computed(() => {
	const item = toolbarItems.find((i) => i.key === activeKey.value);
	return item?.type === "modal" ? item.component : null;
});

// 控制弹窗显示的 v-model 绑定值
// 当 activeKey 有值时为 true，设为 false 时清空 activeKey (即关闭弹窗)
const isModalVisible = computed({
	get: () => !!activeKey.value,
	set: (val) => {
		if (!val) activeKey.value = null;
	},
});

// --- 事件处理 ---
function handleItemClick(item: ToolbarItem) {
	if (item.type === "action" && item.action) {
		// 如果是动作，直接执行
		item.action();
	} else if (item.type === "modal") {
		// 如果是弹窗，切换激活状态
		// 如果点的是当前已经打开的，不做处理或者可以设计为关闭
		activeKey.value = item.key;
	}
}

// --- 业务逻辑：设置背景图 ---
async function selectMapBackgroundImage() {
	const res = await window.electronAPI.showOpenDialog({
		title: "选择地图背景",
		filters: [{ name: "图片", extensions: ["png", "jpg", "jpeg"] }],
	});
	if (res.filePaths.length > 0) {
		const filePath = res.filePaths[0];
		const id = await addNewImage(filePath, "Background");
		useMapDataStore().setBackgroundImageId(id);
		message.success("背景图设置成功");
	}
}

// --- 业务逻辑：模式切换 ---
const operationModeNameMap: Record<OperationMode, string> = {
	[OperationMode.Edit]: "创造模式",
	[OperationMode.Select]: "选择模式",
};

const caremaModeNameMap: Record<CameraMode, string> = {
	[CameraMode.Perspective]: "正常视角",
	[CameraMode.Orthographic]: "俯视视角",
};

function handleOperationModeChange() {
	message.success({ content: `已切换到 ${operationModeNameMap[editorStore.currentEditMode]}`, duration: 1 });
	eventBus.emit("change-operation-mode", editorStore.currentEditMode);
}

function handleCameraModeChange() {
	message.success({ content: `摄像机已切换到 ${caremaModeNameMap[editorStore.currentCameraMode]}`, duration: 1 });
	eventBus.emit("change-camera-mode", editorStore.currentCameraMode);
}
</script>

<template>
	<div class="top-panel">
		<div class="left">
			<a-space>
				<a-radio-group
					@change="handleOperationModeChange"
					button-style="solid"
					class="mode-selector"
					v-model:value="editorStore.currentEditMode"
				>
					<a-radio-button :value="OperationMode.Select">
						<a-space>
							<span v-if="editorStore.currentEditMode === OperationMode.Select">
								{{ operationModeNameMap[OperationMode.Select] }}
							</span>
							<font-awesome-icon :icon="['fas', 'hand-pointer']" />
						</a-space>
					</a-radio-button>
					<a-radio-button :value="OperationMode.Edit">
						<a-space>
							<span v-if="editorStore.currentEditMode === OperationMode.Edit">
								{{ operationModeNameMap[OperationMode.Edit] }}
							</span>
							<font-awesome-icon :icon="['fas', 'plus']" />
						</a-space>
					</a-radio-button>
				</a-radio-group>

				<a-radio-group
					@change="handleCameraModeChange"
					button-style="solid"
					class="mode-selector"
					v-model:value="editorStore.currentCameraMode"
				>
					<a-radio-button :value="CameraMode.Perspective">
						<a-space>
							<span v-if="editorStore.currentCameraMode === CameraMode.Perspective">
								{{ caremaModeNameMap[CameraMode.Perspective] }}
							</span>
							<font-awesome-icon :icon="['fas', 'camera']" />
						</a-space>
					</a-radio-button>
					<a-radio-button :value="CameraMode.Orthographic">
						<a-space>
							<span v-if="editorStore.currentCameraMode === CameraMode.Orthographic">
								{{ caremaModeNameMap[CameraMode.Orthographic] }}
							</span>
							<font-awesome-icon :icon="['fas', 'plane']" />
						</a-space>
					</a-radio-button>
				</a-radio-group>
			</a-space>
		</div>

		<div class="right">
			<a-space wrap>
				<a-button
					v-for="item in toolbarItems"
					:key="item.key"
					@click="handleItemClick(item)"
					:type="activeKey === item.key ? 'primary' : 'default'"
				>
					<font-awesome-icon style="margin-right: 5px" :icon="item.icon" />
					<span>{{ item.text }}</span>
				</a-button>
			</a-space>
		</div>

		<component v-if="currentComponent" :is="currentComponent" v-model="isModalVisible" />
	</div>
</template>

<style lang="scss" scoped>
.top-panel {
	width: 100%;
	display: flex;
	padding: 10px;
	justify-content: space-between;
	pointer-events: initial;
	gap: 10px;

	& .right {
		flex: 1;

		& > div {
			width: 100%;
			justify-content: end;
		}
	}
}
</style>
