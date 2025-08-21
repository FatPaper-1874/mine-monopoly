<script setup lang="ts">
import TopPanel from "./top-panel/top-panel.vue";
</script>

<template>
	<header class="header-container">
		<top-panel />
	</header>
</template>

<style lang="scss" scoped>
.header-container {
	background-color: #ececec;
	width: 100%;
	display: flex;
	align-items: center;
	padding: 5px;
}

.menu-button {
	margin-left: 5px;
	font-size: 0.75em;
}
</style>
