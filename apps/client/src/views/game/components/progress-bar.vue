<script setup lang="ts">
import { computed } from "vue";
import { useGameInfo, useRoomInfo } from "@src/store";
import { lightenColor } from "@src/utils";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { __PROTOCOL__ } from "@src/../global.config";

const playerList = computed(() => useGameInfo().playersList);
const overMoney = computed(() => useRoomInfo().gameSetting.overMoney);

function getBlockHeight(money: number) {
	const height = money / overMoney.value;
	return height < 1 ? (height > 0 ? height * 100 + "%" : "0") : "100%";
}
</script>

<template>
	<div class="progress-bar">
		<div class="target-bar">目标: ￥{{ overMoney }}</div>
		<div
			:style="{ height: getBlockHeight(player.money), backgroundColor: player.user.color }"
			class="player-block"
			v-for="player in playerList"
			:key="player.id"
		>
			<div class="avatar-container" :style="{ '--c': lightenColor(player.user.color, 15) }">
				<div class="avatar">
					<img v-if="player.user.avatar" :src="`${__PROTOCOL__}://${player.user.avatar}`" />
					<FontAwesomeIcon v-else :style="{ color: player.user.color }" icon="gamepad" />
				</div>
				<div class="money">￥{{ player.money }}</div>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.progress-bar {
	position: relative;
	width: 1.3rem;
	height: 30rem;
	background-color: var(--color-bg);
	border-radius: 0 0 0.8rem 0;
	box-sizing: border-box;
	border: 0.45rem solid rgba(255, 255, 255, 0.7);
	border-left: 0;
}

.target-bar {
	position: absolute;
	top: -2rem;
	width: max-content;
	line-height: 0.8rem;
	background-color: var(--color-third);
	color: var(--color-text-white);
	padding: 0.45rem;
	font-size: 0.8rem;
	border-radius: 0 0.7rem 0.7rem 0;
	box-sizing: border-box;
	box-shadow: var(--box-shadow);
	border: 0.4rem solid rgba(255, 255, 255, 0.7);
	border-left: 0;
}

.player-block {
	position: absolute;
	width: 100%;
	left: 0;
	bottom: 0;
	transition: height 0.5s ease;
	border-radius: 0 0.2rem 0.5rem 0;
	user-select: none;

	$top-bar-width: 1.5rem;

	& > .avatar-container::before {
		content: "";
		position: absolute;
		top: 0;
		width: $top-bar-width;
		height: 0.2rem;
		background-color: var(--c);
		transform: translateY(-50%);
	}

	.avatar-container {
		width: fit-content;
		display: flex;
		$font-size: 1rem;

		& > .avatar {
			$avatar_size: 2rem;

			width: $avatar_size;
			height: $avatar_size;
			border-radius: 50%;
			border: 0.2rem solid #ffffff;
			overflow: hidden;
			box-shadow: var(--box-shadow);
			transform: translate($top-bar-width, -50%);
			display: flex;
			justify-content: center;
			align-items: center;
			background-color: rgba(255, 255, 255, 0.45);

			& > img {
				width: $avatar_size;
				height: $avatar_size;
			}
		}

		& > .money {
			font-size: $font-size;
			line-height: $font-size;
			height: $font-size;
			margin-left: 0.2rem;
			color: var(--c);
			text-shadow: var(--text-shadow-surround-white);
			transform: translate($top-bar-width, -50%);
		}
	}
}
</style>
