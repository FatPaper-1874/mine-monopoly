<script setup lang="ts">
import { CameraMode, OperationMode } from "@src/enums";
import { RadioChangeEvent } from "ant-design-vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { message } from "ant-design-vue";
import { useEditorStore, useMapDataStore, useResourceStore } from "@src/stores";
import { ref } from "vue";
import MapInfoForm from "../manager/map-info-form.vue";
import MapIndexCreator from "../common/map-index-creator.vue";
import processManager from "../manager/process-manager/process-manager.vue";
import ModelManager from "../manager/model-manager.vue";
import EventManager from "../manager/event-manager.vue";
import ChanceCardManager from "../manager/chancecard-manager.vue";
import StreetManager from "../manager/street-manager.vue";
import RoleManager from "../manager/role-manager.vue";
import { eventBus } from "@src/utils/event-bus";
import { handleNewImage } from "@src/utils/file";

const editorStore = useEditorStore();

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

type ButtonConifg = {
	text: string;
	icon: string;
	onClick: () => any;
};

const buttonConfigs: ButtonConifg[] = [
	{
		text: "地图背景",
		icon: "fas fa-image",
		onClick: seleteMapBackgroundImage,
	},
	{
		text: "地图信息",
		icon: "fas fa-circle-info",
		onClick: () => {
			mapInfoFormVisible.value = true;
		},
	},
	{
		text: "角色",
		icon: "fas fa-mask",
		onClick: () => {
			roleManagerVisible.value = true;
		},
	},
	{
		text: "路径索引",
		icon: "fas fa-bezier-curve",
		onClick: () => {
			mapIndexCreatorVisible.value = true;
		},
	},
	{
		text: "游戏流程",
		icon: "fas fa-microchip",
		onClick: () => {
			processManagerVisible.value = true;
		},
	},
	{
		text: "街道",
		icon: "fas fa-road",
		onClick: () => {
			streetManagerVisible.value = true;
		},
	},
	{
		text: "模型",
		icon: "fas fa-cubes",
		onClick: () => {
			modelManagerVisible.value = true;
		},
	},
	{
		text: "地块事件",
		icon: "fas fa-book",
		onClick: () => {
			eventManagerVisible.value = true;
		},
	},
	{
		text: "机会卡",
		icon: "fas fa-wand-magic-sparkles",
		onClick: () => {
			chanceCardManagerVisible.value = true;
		},
	},
];

async function seleteMapBackgroundImage() {
	const res = await window.electronAPI.showOpenDialog({
		title: "选择地图背景",
		filters: [{ name: "图片", extensions: ["png", "jpg", "jpeg"] }],
	});
	const filePath = res.filePaths[0];
	const id = await handleNewImage(filePath, "Background");
	useMapDataStore().setBackgroundImageId(id);
}

const mapInfoFormVisible = ref(false);
const roleManagerVisible = ref(false);
const mapIndexCreatorVisible = ref(false);
const processManagerVisible = ref(false);
const streetManagerVisible = ref(false);
const modelManagerVisible = ref(false);
const eventManagerVisible = ref(false);
const chanceCardManagerVisible = ref(false);
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
							<span v-if="editorStore.currentEditMode === OperationMode.Select">{{
								operationModeNameMap[OperationMode.Select]
							}}</span>
							<font-awesome-icon :icon="['fas', 'hand-pointer']" />
						</a-space>
					</a-radio-button>
					<a-radio-button :value="OperationMode.Edit">
						<a-space>
							<span v-if="editorStore.currentEditMode === OperationMode.Edit">{{
								operationModeNameMap[OperationMode.Edit]
							}}</span>
							<font-awesome-icon :icon="['fas', 'pen-to-square']" />
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
							<span v-if="editorStore.currentCameraMode === CameraMode.Perspective"
								>{{ caremaModeNameMap[CameraMode.Perspective] }}
							</span>
							<font-awesome-icon :icon="['fas', 'camera']" />
						</a-space>
					</a-radio-button>
					<a-radio-button :value="CameraMode.Orthographic">
						<a-space>
							<span v-if="editorStore.currentCameraMode === CameraMode.Orthographic"
								>{{ caremaModeNameMap[CameraMode.Orthographic] }}
							</span>
							<font-awesome-icon :icon="['fas', 'plane']" />
						</a-space>
					</a-radio-button>
				</a-radio-group>
			</a-space>
		</div>

		<div class="right">
			<a-space wrap>
				<a-button v-for="btnConfig in buttonConfigs" @click="btnConfig.onClick">
					<font-awesome-icon style="margin-right: 5px" :icon="btnConfig.icon" />
					<span>{{ btnConfig.text }}</span>
				</a-button>
			</a-space>
		</div>

		<map-info-form v-model="mapInfoFormVisible" />
		<role-manager v-model="roleManagerVisible" />
		<map-index-creator v-model="mapIndexCreatorVisible" />
		<process-manager v-model="processManagerVisible" />
		<street-manager v-model="streetManagerVisible" />
		<model-manager v-model="modelManagerVisible" />
		<event-manager v-model="eventManagerVisible" />
		<chance-card-manager v-model="chanceCardManagerVisible" />
	</div>
</template>

<style lang="scss" scoped>
.top-panel {
	width: 100%;
	display: flex;
	padding: 10px;
	justify-content: space-between;
	pointer-events: initial;

	& .right {
		flex: 1;

		& > div {
			width: 100%;
			justify-content: end;
		}
	}
}
</style>
