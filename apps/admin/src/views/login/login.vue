<script setup lang="ts">
import router from "@/router";
import { Login } from "@mine-monopoly/login";

function toMain(token: string) {
	localStorage.setItem("token", token);
	router.push({ name: "main" });
}
</script>

<template>
	<div class="login-page">
		<login @success="toMain" />
	</div>
</template>

<style lang="scss" scoped>
.login-page {
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	font-size: 12px;
}
</style>
