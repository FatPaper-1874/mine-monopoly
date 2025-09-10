<script setup lang="ts">
import { PlayerInfo } from "@fatpaper-monopoly/types";
import { PropType, computed, ref, watch } from "vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { __PROTOCOL__ } from "@src/../global.config";
import gsap from "gsap";

// const props = defineProps({
// 	player: { type: Object as PropType<PlayerInfo>, default: {} },
// 	roundMark: { type: Boolean, default: true },
// });

const props = defineProps<{ player: PlayerInfo; roundMark: boolean }>();

const displayNumber = ref(0);

const _userInfo = computed(() => props.player.user);
const _isBankrupted = computed(() => props.player.isBankrupted);
const avatarSrc = computed(() => {
	return _userInfo.value.avatar ? `${__PROTOCOL__}://${_userInfo.value.avatar}` : "";
});

watch(
	() => props.player.money,
	(newValue) => {
		gsap.to(displayNumber, {
			duration: 0.5,
			value: newValue,
			roundProps: "value",
			onUpdate: () => {
				displayNumber.value = Math.round(Number(gsap.getProperty(displayNumber, "value")));
			},
		});
	},
	{ immediate: true }
);
</script>

<template>
	<div
		class="player-card"
		:class="{ is_bankrupted: _isBankrupted }"
		:style="{ 'border-color': roundMark ? 'var(--color-third)' : '' }"
	>
		<div :style="{ color: _userInfo.color }" class="card-num">
			<FontAwesomeIcon icon="wand-sparkles" style="margin-right: 0.3rem" />{{ player.chanceCards.length }}
		</div>

		<div class="avatar">
			<div v-if="player.isOffline" class="disconnect-marker">
				<FontAwesomeIcon icon="link-slash" />
			</div>
			<img v-if="avatarSrc" :src="avatarSrc" />
			<FontAwesomeIcon v-else :style="{ color: _userInfo.color }" icon="gamepad" />
		</div>

		<div class="info" :style="{ color: _userInfo.color }">
			<span class="username">{{ _userInfo.username }}</span>
			<span class="money">￥{{ displayNumber }}</span>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.player-card {
	width: 100%;
	max-width: max-content;
	min-width: 11rem;
	display: flex;
	justify-content: space-around;
	align-items: center;
	border-radius: 0.8rem;
	padding: 0.4rem 0.6rem;
	background-color: rgba($color: #ffffff, $alpha: 0.85);
	backdrop-filter: blur(0.2rem);
	border: 0.25rem solid rgba($color: #ffffff, $alpha: 0.85);
	box-sizing: border-box;
	user-select: none;
	margin: 0.2rem 0;
	cursor: pointer;

	& > .card-num {
		position: absolute;
		left: 0;
		bottom: 0;
		z-index: 1;
		padding: 0.2rem 0.4rem;
		border-radius: 0 0.8rem 0 0.8rem;
		background-color: rgba($color: #ffffff, $alpha: 0.75);
		text-shadow: var(--text-shadow-surround-white);
		font-size: 1.1rem;
	}

	&.is_bankrupted {
		position: relative;
		filter: grayscale(1);
	}

	&.is_bankrupted::after {
		content: "OUT!";
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: #444444;
		font-size: 2.5rem;
		line-height: 2.5rem;
		text-align: center;
		display: block;
		border-radius: 0.8rem;
		padding: 0.4rem;
		background-color: rgba(255, 255, 255, 0.6);
	}

	& > .avatar {
		$avatar_size: 3rem;

		color: #ffffff;
		width: $avatar_size;
		height: $avatar_size;
		font-size: 1.5rem;
		line-height: 3rem;
		text-align: center;
		border-radius: 50%;
		border: 0.2rem solid #ffffff;
		overflow: hidden;
		box-shadow: var(--box-shadow);
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: rgba(255, 255, 255, 0.45);

		& > .disconnect-marker {
			font-size: 1.5rem;
			width: $avatar_size;
			height: $avatar_size;
			color: var(--color-text-error);
			background-color: rgba($color: #ffffff, $alpha: 0.5);
			position: absolute;
			left: 0;
			top: 0;
		}

		& > img {
			width: $avatar_size;
			height: $avatar_size;
		}
	}

	& > .info {
		margin: 0 0.6rem;
		display: flex;
		flex-direction: column;
		justify-content: space-around;
		align-items: center;
		text-shadow: var(--text-shadow-surround-white);

		& > .money {
			font-size: 1.1rem;
		}
	}
}
</style>
