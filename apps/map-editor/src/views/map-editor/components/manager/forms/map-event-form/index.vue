<script setup lang="ts">
import { MapEvent } from "@fatpaper-monopoly/types/interfaces/game/item";
import CodeEditor from "@src/components/code-editor/index.vue";
import libContent from "./editor-lib.d.ts?raw";
import templateText from "./template-text?raw";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useMapDataStore, useResourceStore } from "@src/stores";
import { message } from "ant-design-vue";
import { MapEventType } from "@fatpaper-monopoly/types";
import { addNewImage } from "@src/utils/file";
import { Rule } from "ant-design-vue/es/form";

const props = defineProps<{ mapEvent: MapEvent | undefined }>();
const emits = defineEmits(["close"]);

onMounted(async () => {
	if (!props.mapEvent) return;
	const imageResource = useResourceStore().findImageById(props.mapEvent.iconId);
	if (!imageResource) {
		message.error(`获取 ${props.mapEvent.name} 的icon资源失败`, 1);
		return;
	}
	iconUrl.value = imageResource.url;
	const content = await window.electronAPI.getImageBase64(imageResource.url);
	mapEventIconPreview.value = `data:image/png;base64,${content}`;
});

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

const iconUrl = ref("");

const mapEventForm = reactive<MapEvent>(props.mapEvent || getInitForm());

let isIconChange = false;

async function handleAddMapEvent() {
	try {
		const mapDataStore = useMapDataStore();
		if (isIconChange) {
			if (mapEventForm.iconId) useResourceStore().removeImage(mapEventForm.iconId);
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
		iconUrl.value = res.filePaths[0];
		const content = await window.electronAPI.getImageBase64(iconUrl.value);
		mapEventIconPreview.value = `data:image/png;base64,${content}`;
		isIconChange = true;
	} else {
		iconUrl.value = "";
		mapEventIconPreview.value = "";
		isIconChange = false;
	}
}

const mapEventIconPreview = ref("");

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
				<a-input v-model:value="mapEventForm.description" />
			</a-form-item>
			<a-form-item label="icon图片" name="iconUrl" :rules="[{ required: true, validator: iconRule }]">
				<template v-if="iconUrl">
					<span class="icon-url">{{ iconUrl }}</span>
					<img class="icon-preview" :src="mapEventIconPreview" />
				</template>
				<a-button @click="handleAddIcon" type="primary">选择图片</a-button>
			</a-form-item>
			<a-form-item>
				<a-button type="primary" html-type="submit">确认修改</a-button>
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
			<code-editor v-model="mapEventForm.effectCode" :template-text="templateText" :extra-libs="[libContent]" />
		</div>
	</div>
</template>

<style lang="scss" scoped>
.map-event-form-container {
	display: flex;
	height: 75vh;

	.map-event-form {
		width: 25vw;
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
