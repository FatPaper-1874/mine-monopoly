<script setup lang="ts">
import ItemTypeSelector from "../common/item-type-selector.vue";
</script>

<template>
	<div class="edit-mode-ui">
		<div class="ui-container left">
			<item-type-selector />
		</div>
		<div class="ui-container right"></div>
	</div>
</template>

<style lang="scss" scoped>
.edit-mode-ui {
	width: 100%;
	height: 100%;
	position: relative;

	.ui-container {
		position: absolute;
		height: 100%;
		top: 0;
		margin: 10px;
	}
	
	& > * {
		pointer-events: initial;
	}

	.left {
		left: 0;
	}

	.right {
		right: 0;
	}
}
</style>
