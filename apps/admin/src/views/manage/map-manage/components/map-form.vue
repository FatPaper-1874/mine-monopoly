<script setup lang="ts">
import { createGameMap, updateGameMap } from "@/utils/api/game-map";
import { GameMapInDb } from "@mine-monopoly/types";
import { FormInstance, message, UploadChangeParam, UploadFile, UploadProps } from "ant-design-vue";
import { onMounted, reactive, ref, watch } from "vue";
import { calculateFileHash, readMapFile, uint8ArrayToObjectURL, uint8ArrayToFile } from "@/utils/file";
import { Rule } from "ant-design-vue/es/form";

const { gameMap } = defineProps<{ gameMap: GameMapInDb | undefined }>();
const formRef = ref<FormInstance>();
const coverImagePreview = ref("");
const coverImageFile = ref<File | undefined>();
const visible = defineModel();
const emits = defineEmits(["finish"]);

watch(coverImagePreview, (newUrl, oldUrl) => {
	if (oldUrl) URL.revokeObjectURL(oldUrl);
});

onMounted(() => {
	if (!gameMap) return;
	formValue.name = gameMap.name;
	formValue.version = gameMap.version;
	coverImagePreview.value = gameMap.coverUrl;
});

const gameMapfileList = ref<UploadProps["fileList"]>([]);
type FormState = { name: string; author: string; version: string; file: UploadFile | undefined };
const formValue = reactive<FormState>({
	name: "",
	author: "",
	version: "",
	file: undefined,
});

async function handleFileChange(info: UploadChangeParam) {
	formValue.file = info.file;
	const file = info.file.originFileObj;
	if (!file) {
		message.error("获取文件对象失败");
		return;
	}

	try {
		const { mapData, images } = await readMapFile(file);
		formValue.name = mapData.info.name;
		formValue.author = mapData.info.author;
		formValue.version = mapData.info.version;
		// 查找封面图片
		const coverResource = images.find((img) => img.id === mapData.info.coverImageId);
		if (coverResource) {
			const mimeType = coverResource.filetype === "jpg" || coverResource.filetype === "jpeg"
				? "image/jpeg"
				: "image/png";
			coverImagePreview.value = uint8ArrayToObjectURL(coverResource.buffer, mimeType);
			coverImageFile.value = uint8ArrayToFile(coverResource.buffer, `cover.${coverResource.filetype}`, mimeType);
		}
	} catch (e: any) {
		message.error("读取地图文件失败: " + e.message);
	}
}

async function onFinish() {
	const formData = new FormData();
	if (!formValue.file || !formValue.file.originFileObj) {
		message.error("获取文件时错误");
		return;
	}
	const coverImage = coverImageFile.value;
	if (!coverImage) {
		message.error("获取封面文件时错误");
		return;
	}
	formData.append("game-map", formValue.file.originFileObj);
	formData.append("cover-image", coverImage);
	formData.append("name", formValue.name);
	formData.append("author", formValue.author);
	formData.append("version", formValue.version);
	formData.append("hash", await calculateFileHash(formValue.file.originFileObj));
	if (gameMap) {
		formData.append("id", gameMap.id);
		await updateGameMap(formData);
	} else {
		await createGameMap(formData);
	}
	visible.value = false;
	emits("finish");
}

async function checkCoverImage(_rule: Rule, value: string) {
	if (coverImagePreview.value === "") {
		return Promise.reject("你的地图没有封面");
	}
}
</script>

<template>
	<a-form :model="formValue" @finish="onFinish" ref="formRef">
		<a-form-item label="地图名称" name="name" :rules="[{ required: true, message: '你的地图没有名称' }]">
			<a-input v-model:value="formValue.name"></a-input>
		</a-form-item>
		<a-form-item label="地图作者" name="author" :rules="[{ required: true, message: '你的地图没有作者' }]">
			<a-input v-model:value="formValue.author"></a-input>
		</a-form-item>
		<a-form-item label="地图版本" name="version" :rules="[{ required: true, message: '你的地图没有版本' }]">
			<a-input v-model:value="formValue.version"></a-input>
		</a-form-item>

		<a-form-item label="地图封面" name="cover-image" :rules="[{ required: true, validator: checkCoverImage }]">
			<img v-if="coverImagePreview" class="cover-image-preview" :src="coverImagePreview" />
		</a-form-item>

		<a-form-item
			label="地图文件"
			name="file"
			:rules="[{ required: true, message: gameMap ? '选择新的地图' : '选择地图文件' }]"
		>
			<a-upload
				@change="handleFileChange"
				accept=".mmmap"
				v-model:file-list="gameMapfileList"
				:max-count="1"
				:customRequest="() => {}"
			>
				<template #itemRender="{ fileList }">
					<div class="file-item" v-for="file in fileList">{{ file.name }}</div>
				</template>
				<a-button>选择地图文件</a-button>
			</a-upload>
		</a-form-item>
		<a-form-item>
			<a-button style="float: right" type="primary" html-type="submit">添加</a-button>
		</a-form-item>
	</a-form>
</template>

<style lang="scss" scoped>
.cover-image-preview {
	aspect-ratio: 1.5;
	object-fit: contain;
	width: 100%;
	box-sizing: border-box;
	padding: 5px;
	border-radius: 10px;
	border: 1px solid #dddddd;
	background-color: #eeeeee;
}
</style>
