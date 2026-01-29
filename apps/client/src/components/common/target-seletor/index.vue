<script setup lang="ts">
import { TargetSelectType } from "@mine-monopoly/types";
import { provide, ref, watch } from "vue";
import ToMapItem from "./components/to-map-item.vue";
import ToOtherPlayer from "./components/to-other-player.vue";
import ToPlayer from "./components/to-player.vue";
import ToProperty from "./components/to-property.vue";
import ToSelf from "./components/to-self.vue";

const props = defineProps<{ targetType: TargetSelectType }>();
const emits = defineEmits(["targetSelected"]);

const targetIdList = ref<string[]>([]);

provide("targetIdList", targetIdList);

watch(
	targetIdList,
	(newVal) => {
		emits("targetSelected", newVal);
	},
	{ deep: true },
);

let selectorComponent;
switch (props.targetType) {
	case TargetSelectType.ToMapItem:
		selectorComponent = ToMapItem;
		break;
	case TargetSelectType.ToOtherPlayer:
		selectorComponent = ToOtherPlayer;
		break;
	case TargetSelectType.ToPlayer:
		selectorComponent = ToPlayer;
		break;
	case TargetSelectType.ToProperty:
		selectorComponent = ToProperty;
		break;
	default:
		selectorComponent = ToSelf;
		break;
}
</script>

<template>
	<div class="container">
		<component :is="selectorComponent" />
	</div>
</template>

<style lang="scss" scoped></style>
