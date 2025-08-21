<script setup lang="ts">
import { computed } from "vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { adjustColorAuto, adjustColorBrightness, lightenColor } from "@src/utils";
import { __PROTOCOL__ } from "@src/../global.config";

const props = defineProps<{ username: string; color: string; avatar: string }>();

const avatarSrc = computed(() => {
	return props.avatar ? `${__PROTOCOL__}://${props.avatar}` : "";
});
</script>

<template>
	<div class="user-card">
		<div class="avatar">
			<img v-if="avatarSrc" :src="avatarSrc" />
			<FontAwesomeIcon v-else :style="{ color: color }" icon="gamepad" />
		</div>
		<div class="info">
			<p class="username">{{ username }}</p>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.user-card {
	width: 100%;
	height: 100%;
	display: flex;
	justify-content: space-around;
	align-items: center;
	padding: 1.2rem;
	box-sizing: border-box;

	& > .avatar {
		$icon-size: 5rem;
		width: $icon-size;
		height: $icon-size;
		min-width: $icon-size;
		min-height: $icon-size;
		text-align: center;
		line-height: $icon-size;
		border: 0.2rem solid #ffffff;
		border-radius: 50%;
		font-size: 2.5rem;
		color: #ffffff;
		box-shadow: var(--box-shadow);
		overflow: hidden;
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: rgba(255, 255, 255, 0.45);

		& > img {
			width: $icon-size;
			height: $icon-size;
		}
	}

	& > .info {
		flex: 1;
		display: flex;
		justify-content: space-around;
		align-items: center;
		flex-direction: column;

		& > .username {
			color: #ffffff;
			font-size: 2em;
			text-shadow: var(--text-shadow);
			word-break: break-all;
		}
	}
}
</style>
@src/global.config
