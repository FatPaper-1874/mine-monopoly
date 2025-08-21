<script setup lang="ts">
import { __PROTOCOL__ } from "@src/../global.config";
import { computed } from "vue";
const props = defineProps<{ username: string; color: string; avatar: string }>();
const avatarSrc = computed(() => {
	return props.avatar ? `${__PROTOCOL__}://${props.avatar}` : "";
});
</script>

<template>
	<div class="user-list-item">
		<div class="avatar" :style="{ 'background-color': color }">
			<img :src="avatarSrc" alt="" />
		</div>
		<p class="username" :style="{ color: color }">{{ username }}</p>
	</div>
</template>

<style lang="scss" scoped>
.user-list-item {
	height: 2.5rem;
	display: flex;
	justify-content: space-between;
	align-items: center;
	background-color: #ffffff;
	border-radius: 0.4rem;
	margin-bottom: 0.6rem;
	overflow: hidden;
	box-shadow: var(--box-shadow);

	& > .avatar {
		width: 2.5rem;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #ffffff;
		font-size: 1rem;
		overflow: hidden;

		& > img {
			width: 2.5rem;
			height: 2.5rem;
		}
	}

	& > .username {
		flex: 1;
		text-align: center;
	}
}
</style>
@src/global.config
