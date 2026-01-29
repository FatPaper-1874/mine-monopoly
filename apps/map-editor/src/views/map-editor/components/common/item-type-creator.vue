<script setup lang="ts">
import { MapItemType } from "@mine-monopoly/types/interfaces/game/item";
import { useMapDataStore, useResourceStore } from "@src/stores"; // 注意 store 拼写修正
import { computed, reactive, watch } from "vue"; // 引入 watch
import { randomHEXColor } from "@mine-monopoly/utils";
import { message, SelectProps } from "ant-design-vue";

const mapDataStore = useMapDataStore();
const visible = defineModel({ default: false });
const resourcesStore = useResourceStore();

const models = computed<SelectProps["options"]>(() => {
	return resourcesStore.models.map((m) => ({
		label: m.name,
		value: m.id,
	}));
});

const createMapItemTypeForm = reactive({
	name: "",
	modelId: undefined as string | undefined,
});

watch(visible, (isOpen) => {
	if (isOpen) {
		createMapItemTypeForm.name = "";
		createMapItemTypeForm.modelId = undefined;
	}
});

function handleSelectChange(value: string, option: any) {
	if (!createMapItemTypeForm.name && option.label) {
		createMapItemTypeForm.name = option.label;
	}
}

function handleCreateMapItemType() {
	if (!createMapItemTypeForm.modelId || !createMapItemTypeForm.name) {
		return;
	}

	const newMapItemType: MapItemType = {
		id: crypto.randomUUID(),
		name: createMapItemTypeForm.name,
		modelId: createMapItemTypeForm.modelId,
		color: randomHEXColor(),
		size: 1,
	};

	mapDataStore.addMapItemType(newMapItemType);
	message.success("创建成功", 1);
	visible.value = false;
}
</script>

<template>
	<a-modal title="创建物块类型" :footer="null" v-model:open="visible" width="300px">
		<a-form @finish="handleCreateMapItemType" :model="createMapItemTypeForm" layout="vertical">
			<a-form-item label="模型" name="modelId" :rules="[{ required: true, message: '请选择模型' }]">
				<a-select
					placeholder="请选择一个模型"
					@change="handleSelectChange"
					:options="models"
					style="width: 100%"
					v-model:value="createMapItemTypeForm.modelId"
				>
				</a-select>
			</a-form-item>

			<a-form-item label="名字" name="name" :rules="[{ required: true, message: '请输入名字' }]">
				<a-input v-model:value="createMapItemTypeForm.name" placeholder="请输入物块类型名称" />
			</a-form-item>

			<a-form-item>
				<a-button block type="primary" html-type="submit">添加</a-button>
			</a-form-item>
		</a-form>
	</a-modal>
</template>

<style lang="scss" scoped></style>
