<script setup lang="ts">
import { GameMapInfo } from "@fatpaper-monopoly/types";
import { useMapDataStore, useResourceStore } from "@src/stores";
import { handleNewImage } from "@src/utils/file";
import { message } from "ant-design-vue";
import { Rule } from "ant-design-vue/es/form";
import { ref, reactive, onMounted, onUpdated } from "vue";

const visible = defineModel({ default: false });

const mapInfoForm = reactive<GameMapInfo>({ ...useMapDataStore().info });
const coverImageUrl = ref("");
const coverImagePreview = ref("");

onUpdated(async () => {
	coverImagePreview.value = await getCoverImagePreviewUrl();
	Object.assign(mapInfoForm, useMapDataStore().info);
});

async function getCoverImagePreviewUrl() {
	const imageResourceId = useMapDataStore().info.coverImageId;
	const imageResource = useResourceStore().findImageById(imageResourceId);
	if (!imageResource) return "";
	return imageResource.url;
}

async function handleUpdateInfo() {
	try {
		if (coverImageUrl.value) {
			const coverImageId = await handleNewImage(coverImageUrl.value, "CoverImage");
			useMapDataStore().setCoverImageId(coverImageId);
		}
		useMapDataStore().updateMapInfo({ name: mapInfoForm.name, version: mapInfoForm.version });
		message.success(`更新地图信息成功`, 1);
	} catch (e: any) {
		message.error(e.message, 1);
	}

	handleClose();
	visible.value = false;
}

async function handleAddCoverImage() {
	const res = await window.electronAPI.showOpenDialog({
		filters: [{ name: "地图封面", extensions: ["png", "jpg", "jpeg"] }],
		properties: ["openFile"],
	});
	if (res.filePaths.length > 0) {
		coverImageUrl.value = res.filePaths[0];
		const content = await window.electronAPI.getImageBase64(coverImageUrl.value);
		coverImagePreview.value = `data:image/png;base64,${content}`;
	} else {
		coverImageUrl.value = "";
		coverImagePreview.value = "";
	}
}

async function checkVersion(_rule: Rule, value: string) {
	if (!value) {
		return Promise.reject("请输入版本号");
	}
	const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
	if (!semverRegex.test(value)) {
		return Promise.reject(`请按照"数字.数字.数字"的格式定义版本号`);
	}
}

function handleClose() {
	coverImageUrl.value = "";
}
</script>

<template>
	<a-modal destroyOnClose @cancel="handleClose" :footer="null" width="30%" v-model:open="visible" title="地图信息">
		<a-form @finish="handleUpdateInfo" :model="mapInfoForm" name="basic" autocomplete="off">
			<a-form-item label="地图名称" name="name" :rules="[{ required: true, message: '请输入地图名称' }]">
				<a-input v-model:value="mapInfoForm.name" />
			</a-form-item>

			<a-form-item
				label="地图版本"
				name="version"
				:rules="[{ required: true, validator: checkVersion, trigger: 'change' }]"
			>
				<a-input v-model:value="mapInfoForm.version" />
			</a-form-item>

			<a-form-item label="地图封面" name="cover-image">
				<img v-if="coverImagePreview" class="cover-image-preview" :src="coverImagePreview" />

				<a-button @click="handleAddCoverImage" type="primary">选择图片</a-button>
			</a-form-item>

			<a-form-item>
				<a-button style="float: right" type="primary" html-type="submit">更新</a-button>
			</a-form-item>
		</a-form>
	</a-modal>
</template>

<style lang="scss" scoped>
.role-image-url {
	display: block;
	margin-bottom: 10px;
	padding: 5px;
	border: 1px solid #ccc;
	border-radius: 5px;
	background-color: #f3f3f3;
}

.model-preview-canvas-container {
	display: block;
	margin-bottom: 10px;
	border-radius: 10px;
	width: 100%;
	height: 150px;
	border-radius: 5px;
	background-color: #f3f3f3;
	overflow: hidden;
}

.cover-image-preview {
	width: 100%;
	box-sizing: border-box;
	padding: 5px;
	border-radius: 10px;
	border: 1px solid #dddddd;
	background-color: #eeeeee;
}
</style>
