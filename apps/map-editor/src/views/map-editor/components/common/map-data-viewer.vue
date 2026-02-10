<script setup lang="ts">
import { useMapDataStore } from "@src/stores";
import { renderObjectTree } from "@src/utils/object-viewer";
import { clone, cloneDeep } from "lodash";
import { nextTick, onUpdated, ref, watch } from "vue";

const visible = defineModel({ default: false });

const mapDataViewerContainer = ref<HTMLDivElement | null>(null);

watch(
	() => visible.value,
	async (isOpen) => {
		if (isOpen) {
			await nextTick(); // 等待 DOM 渲染（Modal 打开）

			if (!mapDataViewerContainer.value) return;

			try {
				const data = cloneDeep(useMapDataStore().$state);

				// 格式化地皮列表，用地皮名字作为key
				const propertiesObj: Record<string, any> = {};
				data.mapItems
					.filter((m) => m.property !== undefined)
					.forEach((m) => {
						const name = m.property?.name || "未定义";
						propertiesObj[name] = m.property;
					});

				// 格式化机会卡列表，用名字作为key
				const chanceCardsObj: Record<string, any> = {};
				data.chanceCards.forEach((card) => {
					const name = card.name || "未定义";
					chanceCardsObj[name] = card;
				});

				// 格式化地图事件列表，用名字作为key
				const mapEventsObj: Record<string, any> = {};
				data.mapEvents.forEach((event) => {
					const name = event.name || "未定义";
					mapEventsObj[name] = event;
				});

				// 格式化角色列表，用名字作为key
				const rolesObj: Record<string, any> = {};
				data.roles.forEach((role) => {
					const name = role.name || "未定义";
					rolesObj[name] = role;
				});

				// 格式化游戏设置列表，用label作为key
				const gameSettingFormObj: Record<string, any> = {};
				data.gameSettingForm.forEach((setting) => {
					const label = setting.label || "未定义";
					gameSettingFormObj[label] = setting;
				});

				// 格式化自定义UI列表，用名字作为key
				const customUIsObj: Record<string, any> = {};
				data.customUIs.forEach((ui) => {
					const name = ui.name || "未定义";
					customUIsObj[name] = ui;
				});

				// 格式化UI模版列表，用名字作为key
				const uiTemplatesObj: Record<string, any> = {};
				data.uiTemplates.forEach((template) => {
					const name = template.name || "未定义";
					uiTemplatesObj[name] = template;
				});

				const json = {
					...data,
					properties: propertiesObj,
					chanceCards: chanceCardsObj,
					mapEvents: mapEventsObj,
					roles: rolesObj,
					gameSettingForm: gameSettingFormObj,
					customUIs: customUIsObj,
					uiTemplates: uiTemplatesObj,
				};

				// 清空旧内容（防止重复渲染）
				mapDataViewerContainer.value.innerHTML = "";

				// 渲染树
				renderObjectTree(mapDataViewerContainer.value, json);
			} catch (e) {
				console.error("渲染 JSON 失败", e);
			}
		}
	},
	{ immediate: true },
);
</script>

<template>
	<a-modal destroyOnClose :footer="null" width="70%" v-model:open="visible" title="地图Data">
		<div ref="mapDataViewerContainer" class="json-viewer-container"></div>
	</a-modal>
</template>

<style lang="scss" scoped>
.json-viewer-container {
	width: 100%;
	height: 70vh;
	overflow-y: scroll;
}
</style>
