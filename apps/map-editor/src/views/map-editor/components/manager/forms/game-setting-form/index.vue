<script setup lang="ts">
import GameSettingForm from "./game-setting-form.vue";
const visible = defineModel({ default: false });
</script>

<template>
	<a-modal destroyOnClose :footer="null" width="60%" v-model:open="visible" title="游戏参数表单设置">
		<game-setting-form />
	</a-modal>
</template>

<style lang="scss" scoped></style>
