<script setup lang="ts">
import { MapEvent } from "@mine-monopoly/types/interfaces/game/item";
import CodeEditor from "@src/components/code-editor/index.vue";
import libContent from "./editor-lib.d.ts?raw";
import templateText from "./template-text?raw";
import { computed, reactive, ref, watch } from "vue";
import { useMapDataStore, useResourceStore } from "@src/stores";
import { message } from "ant-design-vue";
import { MapEventType } from "@mine-monopoly/types";

// 事件类型选项
const eventTypeOptions = [
	{ label: "到达事件", value: MapEventType.ArrivedEvent },
	{ label: "经过事件", value: MapEventType.PassedEvent },
	{ label: "普通事件", value: MapEventType.NormalEvents },
];
import { addNewImage, convertToFpUrl } from "@src/utils/file";
import { Rule } from "ant-design-vue/es/form";
import { cloneDeep } from "lodash";

const props = defineProps<{ mapEvent: MapEvent | undefined }>();
const emits = defineEmits(["close"]);
const resourceStore = useResourceStore();

// 存储当前选中的图片路径（可能是 store 里的，也可能是新选的）
const iconUrl = ref("");

// 优化：实时计算预览 URL
const mapEventIconPreview = computed(() => {
	return iconUrl.value;
});

const mapEventForm = reactive<MapEvent>(getInitForm());
let isIconChange = false;

// 初始化表单
watch(
	() => props.mapEvent,
	(newEvent) => {
		if (newEvent) {
			Object.assign(mapEventForm, cloneDeep(newEvent));
			// 查找现有资源
			const imageResource = resourceStore.findImageById(newEvent.iconId);
			if (imageResource) {
				iconUrl.value = imageResource.url;
			} else {
				iconUrl.value = "";
			}
			isIconChange = false;
		} else {
			Object.assign(mapEventForm, getInitForm());
			iconUrl.value = "";
			isIconChange = false;
		}
	},
	{ immediate: true },
);

function getInitForm() {
	const initForm = {
		id: crypto.randomUUID(),
		name: "",
		description: "",
		type: MapEventType.ArrivedEvent,
		effectCode: "",
		iconId: "",
		properties: [],
	};
	return initForm;
}

async function handleAddMapEvent() {
	try {
		const mapDataStore = useMapDataStore();
		if (isIconChange) {
			if (mapEventForm.iconId) resourceStore.removeImage(mapEventForm.iconId);
			const iconId = await addNewImage(iconUrl.value, mapEventForm.name);
			mapEventForm.iconId = iconId;
		}
		if (props.mapEvent) {
			mapDataStore.editMapEvent(mapEventForm);
			message.success(`修改 "${mapEventForm.name}" 成功`);
		} else {
			mapDataStore.addMapEvent(mapEventForm);
			message.success(`添加 "${mapEventForm.name}" 成功`);
		}
		emits("close");
	} catch (e: any) {
		message.error(e.message, 1);
	}
}

async function handleAddIcon() {
	const res = await window.electronAPI.showOpenDialog({
		filters: [{ name: "icon图片", extensions: ["png", "jpg", "jpeg", "gif"] }],
		properties: ["openFile"],
	});
	if (res.filePaths.length > 0) {
		iconUrl.value = convertToFpUrl(res.filePaths[0]); // 直接拿路径
		isIconChange = true;
	}
}

const iconRule = async (_rule: Rule, value: string) => {
	if (!iconUrl.value) {
		return Promise.reject("请选择图片");
	} else {
		return Promise.resolve();
	}
};
</script>

<template>
	<div class="map-event-form-container">
		<a-form
			class="map-event-form"
			@finish="handleAddMapEvent"
			:model="mapEventForm"
			name="map-event"
			autocomplete="off"
		>
			<a-form-item label="ID">
				<a-alert style="word-break: break-all" :message="mapEventForm.id" type="info" />
			</a-form-item>
			<a-form-item label="事件名称" name="name" :rules="[{ required: true, message: '请输入事件名称' }]">
				<a-input v-model:value="mapEventForm.name" />
			</a-form-item>
			<a-form-item label="事件描述" name="description" :rules="[{ required: true, message: '请输入事件描述' }]">
				<a-textarea v-model:value="mapEventForm.description" :auto-size="{ minRows: 3, maxRows: 5 }" />
				<a-typography-paragraph type="secondary" style="font-size: 12px; margin-top: 4px;">
					支持 \n 进行换行
				</a-typography-paragraph>
			</a-form-item>
			<a-form-item label="事件触发类型" name="type" :rules="[{ required: true, message: '请选择事件触发类型' }]">
				<a-select v-model:value="mapEventForm.type" :options="eventTypeOptions" />
			</a-form-item>
			<a-form-item label="icon图片" name="iconUrl" :rules="[{ required: true, validator: iconRule }]">
				<template v-if="iconUrl">
					<img class="icon-preview" :src="mapEventIconPreview" />
				</template>
				<a-button @click="handleAddIcon" size="small">选择图片</a-button>
			</a-form-item>
			<a-form-item>
				<a-button style="width: 100%" type="primary" html-type="submit">提交</a-button>
			</a-form-item>
		</a-form>
		<div class="editor-container">
			<span class="title">
				<a-alert
					message="在下面编辑器编写触发代码，游戏进行到响应的触发时机会直接执行下面全部的代码"
					type="info"
					show-icon
				/>
			</span>
			<code-editor
				v-model="mapEventForm.effectCode"
				:template-text="templateText"
				:static-types="libContent"
			/>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.map-event-form-container {
	display: flex;
	height: 75vh;

	.map-event-form {
		width: 25vw;
		display: flex;
		flex-direction: column;
		overflow-y: scroll;
		padding-right: 10px;
	}

	.editor-container {
		display: flex;
		flex: 1;
		flex-direction: column;
		padding: 0 10px;
		gap: 10px;
	}

	.icon-url {
		display: block;
		word-break: break-all;
		margin-bottom: 10px;
		padding: 5px;
		border: 1px solid #ccc;
		border-radius: 5px;
		background-color: #f3f3f3;
	}
	.icon-preview {
		display: block;
		margin-bottom: 10px;
		border-radius: 10px;
		width: 150px;
		height: 150px;
		border-radius: 5px;
		background-color: #f3f3f3;
	}
}
</style>
