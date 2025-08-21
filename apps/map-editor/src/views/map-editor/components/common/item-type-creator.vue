<script setup lang="ts">
import { MapItemType } from "@fatpaper-monopoly/types/interfaces/game/item";
import { useEditorStore, useMapDataStore, useResourceStore } from "@src/stores";
import { computed, onBeforeUnmount, onUpdated, reactive } from "vue";
import { randomHEXColor } from "@fatpaper-monopoly/utils";
import { message } from "ant-design-vue";

const mapDataStroe = useMapDataStore();
const visible = defineModel({ default: false });
const resourcesStore = useResourceStore();

const models = computed(() => resourcesStore.models);

type formType = {
	name: string;
	modelId: string;
};

const createMapItemTypeForm = reactive<formType>({
	name: "",
	modelId: "",
});

function handleCreateMapItemType() {
	const newMapItemType: MapItemType = {
		id: crypto.randomUUID(),
		name: createMapItemTypeForm.name,
		modelId: createMapItemTypeForm.modelId,
		color: randomHEXColor(),
		size: 1,
	};
	mapDataStroe.addMapItemType(newMapItemType);
	message.success("创建成功", 1);
	visible.value = false;
}

onUpdated(() => {
	createMapItemTypeForm.name = "";
	createMapItemTypeForm.modelId = "";
});
</script>

<template>
	<a-modal title="创建物块类型" :footer="null" v-model:open="visible" width="260px">
		<a-form @submit="handleCreateMapItemType" :model="createMapItemTypeForm">
			<a-form-item label="名字" name="name" :rules="[{ required: true, message: '请输入名字' }]">
				<a-input v-model:value="createMapItemTypeForm.name" />
			</a-form-item>
			<a-form-item label="模型" name="modelId" :rules="[{ required: true, message: '请选择模型' }]">
				<a-select ref="select" v-model:value="createMapItemTypeForm.modelId" style="width: 100%">
					<a-select-option v-for="model in models" :value="model.id">
						<span>{{ model.name }}</span>
					</a-select-option>
				</a-select>
			</a-form-item>
			<a-form-item>
				<a-button style="float: right" type="primary" html-type="submit">添加</a-button>
			</a-form-item>
		</a-form>
	</a-modal>
</template>

<style lang="scss" scoped></style>
