<script setup lang="ts">
import { useEditorStore } from "@src/stores";
import { computed } from "vue";

const alertList = computed(() => useEditorStore().alertList);
</script>

<template>
	<div class="alert-list-container">
		<a-space direction="vertical">
			<a-alert showIcon v-for="alert in alertList" :type="alert.type" :message="alert.message"></a-alert>
		</a-space>
	</div>
</template>

<style lang="scss" scoped>
.alert-list-container {
	position: fixed;
	left: 10px;
	bottom: 10px;
	max-height: 30vh;
  overflow-y: auto;
}
</style>
