<script setup lang="ts">
import { CameraMode, OperationMode } from "@src/enums";
import { RadioChangeEvent } from "ant-design-vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { message } from "ant-design-vue";
import { useEditorStore } from "@src/stores";
import { ref } from "vue";
import MapIndexCreator from "../common/map-index-creator.vue";
import processManager from "../manager/process-manager/process-manager.vue";
import ModelManager from "../manager/model-manager.vue";
import EventManager from "../manager/event-manager.vue";
import ChanceCardManager from "../manager/chancecard-manager.vue";
import streetManager from "../manager/street-manager.vue";
import { eventBus } from "@src/utils/event-bus";

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
			<a-space>
				<a-button @click="mapIndexCreatorVisible = true">
					<font-awesome-icon style="margin-right: 5px" :icon="['fas', 'bezier-curve']" />
					<span>路径索引</span>
				</a-button>
				<a-button @click="processManagerVisible = true">
					<font-awesome-icon style="margin-right: 5px" :icon="['fas', 'microchip']" />
					<span>游戏流程</span>
				</a-button>
				<a-button @click="streetManagerVisible = true">
					<font-awesome-icon style="margin-right: 5px" :icon="['fas', 'road']" />
					<span>街道</span>
				</a-button>
				<a-button @click="modelManagerVisible = true">
					<font-awesome-icon style="margin-right: 5px" :icon="['fas', 'boxes-stacked']" />
					<span>模型</span>
				</a-button>
				<a-button @click="eventManagerVisible = true">
					<font-awesome-icon style="margin-right: 5px" :icon="['fas', 'book']" />
					<span>地块事件</span>
				</a-button>
				<a-button @click="chanceCardManagerVisible = true">
					<font-awesome-icon style="margin-right: 5px" :icon="['fas', 'wand-magic-sparkles']" />
					<span>机会卡</span>
				</a-button>
			</a-space>
		</div>

		<map-index-creator v-model="mapIndexCreatorVisible"/>
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
}
</style>
