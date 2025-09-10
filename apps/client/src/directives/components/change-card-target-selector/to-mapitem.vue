<script setup lang="ts">
import FpDialog from "@src/components/utils/fp-dialog/fp-dialog.vue";
import { ChanceCardInfo } from "@fatpaper-monopoly/types";
import { useMapData } from "@src/store/game";
import { ref } from "vue";

const props = defineProps<{ chanceCard: ChanceCardInfo }>();
const emit = defineEmits<{ (e: "useCard", targetId: string): void; (e: "cancel"): void }>();

const currentSelectedTargetId = ref("");

const mapDataStore = useMapData();

function handleTargetSelected() {
	emit("useCard", currentSelectedTargetId.value);
}

function handleCancel() {
	emit("cancel");
}
</script>

<template>
	<FpDialog visible @submit="handleTargetSelected" @cancel="handleCancel"> ToMapItem </FpDialog>
</template>

<style lang="scss" scoped></style>
