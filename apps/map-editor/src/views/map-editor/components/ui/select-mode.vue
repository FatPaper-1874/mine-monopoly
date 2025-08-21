<script setup lang="ts">
import { useEditorStore, useMapDataStore } from "@src/stores";
import MapItemInfo from "../common/map-item-info.vue";
import PropertyForm from "../common/property-form.vue";
import MapEventSelector from "../common/map-event-selector.vue";
import { computed, ref } from "vue";
import { eventBus } from "@src/utils/event-bus";
import { message } from "ant-design-vue";

const currentMapItemId = computed(() => useEditorStore().currentMapItemId);
const currentMapItem = computed(() => useEditorStore().currentMapItem);
const isLinkMode = computed(() => useEditorStore().isLinkMode);
const otherMapItemId = ref("");

eventBus.on("other-map-item-selected", (id) => {
	otherMapItemId.value = id;
});

const buttonDisabled = computed(() => isLinkMode.value && otherMapItemId.value === "");

const buttonText = computed(() =>
	isLinkMode.value ? (otherMapItemId.value === "" ? "点击另一个MapItem绑定为地皮" : "点击完成绑定") : "绑定地皮"
);

function handleStartLink() {
	if (isLinkMode.value) {
		if (currentMapItemId.value && otherMapItemId.value) {
			try {
				useMapDataStore().linkToMapItem(currentMapItemId.value, otherMapItemId.value);
				useEditorStore().$patch({
					currentMapItemId: "",
					isLinkMode: false,
				});
				message.success("绑定成功", 1);
				eventBus.emit("change-link-mode", false);
			} catch (e: any) {
				message.error(e.message, 1);
			}
		}
	} else {
		useEditorStore().isLinkMode = true;
		message.info("请选择另一个MapItem成为地皮");
	}
}

function handleUnLink() {
	if (currentMapItemId.value) {
		try {
			useMapDataStore().unLinkMapItem(currentMapItemId.value);
			message.success("解除绑定成功", 1);
		} catch (e: any) {
			message.error(e.message, 1);
		}
	}
}

function handleMapItemDelete() {
	if (currentMapItemId.value) {
		try {
			useMapDataStore().deleteMapItem(currentMapItemId.value);
			message.success("删除成功", 1);
		} catch (e: any) {
			message.error(e.message, 1);
		}
	}
}
</script>

<template>
	<div class="select-mode-ui">
		<div class="ui-container left">
			<a-space direction="vertical">
				<template v-if="currentMapItem">
					<map-event-selector v-if="!currentMapItem.beLinked" />
					<map-item-info :map-item="currentMapItem"></map-item-info>
					<a-button
						type="primary"
						v-if="!(currentMapItem.linkto || currentMapItem.beLinked)"
						:disabled="buttonDisabled"
						@click="handleStartLink"
					>
						{{ buttonText }}
					</a-button>
					<a-button type="primary" danger v-else :disabled="buttonDisabled" @click="handleUnLink">解除绑定</a-button>
					<a-button type="primary" @click="handleMapItemDelete" danger v-if="currentMapItem">
						删除这个MapItem
					</a-button>
				</template>
			</a-space>
		</div>
		<div class="ui-container right">
			<a-space direction="vertical">
				<template v-if="currentMapItem && currentMapItem.beLinked">
					<property-form />
				</template>
			</a-space>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.select-mode-ui {
	width: 100%;
	height: 100%;
	position: relative;

	.ui-container {
		position: absolute;
		height: 100%;
		top: 0;
		margin: 10px;

		& > * {
			pointer-events: initial;
		}
	}

	.left {
		left: 0;
	}

	.right {
		right: 0;
	}
}
</style>
