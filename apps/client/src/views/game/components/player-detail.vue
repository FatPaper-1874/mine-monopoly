<script setup lang="ts">
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { __PROTOCOL__ } from "@src/../global.config";
import { computed } from "vue";
import ChanceCard from "./chance-card.vue";
import BuffItem from "./buff-item.vue";
import { PlayerInfo } from "@fatpaper-monopoly/types";
import { useRoomInfo } from "@src/store";
import { useGameData } from "@src/store/game";
import UiRenderer from "@src/components/utils/ui-renderer/ui-renderer.vue";

const props = defineProps<{
	player: PlayerInfo;
}>();

const playersPropertyies = computed(() => {
	return useGameData().properties.filter((property) => {
		return property.owner && property.owner.userId === props.player.id;
	});
});

const avatarSrc = computed(() => {
	return props.player.user.avatar ? `${__PROTOCOL__}://${props.player.user.avatar}` : "";
});

const chanceCardVisible = computed(() => {
	return useRoomInfo().gameSetting.chanceCardVisible;
});
</script>

<template>
	<div class="player-detail">
		<div class="info" v-if="player">
			<div class="user-properties">
				<div class="user">
					<div class="avatar">
						<img v-if="avatarSrc" :src="avatarSrc" />
						<FontAwesomeIcon v-else :style="{ color: player.user.color }" icon="gamepad" />
					</div>
					<div class="text" :style="{ color: player.user.color }">
						<UiRenderer :schema="player.infoDisplay" :context="player" />
					</div>
				</div>
				<div class="properyies-container">
					<div class="label">
						<FontAwesomeIcon icon="house" />
						地产 ({{ playersPropertyies.length }}处)
					</div>
					<div class="properyies-list">
						<div class="property-item" v-for="property in playersPropertyies" :key="property.id">
							<div class="name">{{ property.name }}</div>
							<div class="level">LV {{ property.level }}</div>
						</div>
					</div>
				</div>
			</div>

			<div class="buff-container">
				<div class="label">
					<FontAwesomeIcon icon="book-tanakh" />
					BUFF (持续状态效果)
				</div>
				<div class="buff-list">
					<BuffItem :buff="buff" v-for="buff in player.buff" :key="buff.id" />
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@import "@src/assets/variables.scss";

.player-detail {
	width: 100%;
	height: 100%;
	padding: 1rem;
	display: flex;

	& > .info {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.2rem;

		& > .user-properties {
			display: flex;
			align-self: stretch;
			align-items: center;
			justify-content: space-between;
			flex-direction: column;
			gap: 1.2rem;

			& > .user {
				@include felt-patch(#fff6d9);
				width: 100%;
				display: flex;
				align-items: center;
				justify-content: space-around;
				gap: 0.8rem;
				padding-left: 1.5rem;
				padding-right: 1.5rem;

				& > .text {
					flex: 1;
					display: flex;
					flex-direction: column;
					font-size: 1.3rem;
					text-align: center;
					border-radius: 1.4rem;
					margin: auto;
				}

				& > .avatar {
					$avatar_size: 5rem;

					color: #ffffff;
					width: $avatar_size;
					height: $avatar_size;
					font-size: 2.5rem;
					text-align: center;
					border-radius: 50%;
					border: 0.2rem solid #ffffff;
					overflow: hidden;
					box-shadow: var(--box-shadow);
					position: relative;
					display: flex;
					justify-content: center;
					align-items: center;
					background-color: rgba(255, 255, 255, 0.75);

					& > img {
						width: $avatar_size;
						height: $avatar_size;
						object-fit: contain;
					}
				}
			}

			& > .properyies-container {
				@include felt-patch(#fff6d9);
				flex: 1;
				width: 20rem;
				display: flex;
				flex-direction: column;
				border-radius: 1.2rem;
				box-sizing: border-box;
				position: relative;

				& > .properyies-list {
					padding: 1.2rem;
					flex: 1;
					display: flex;
					flex-direction: column;
					align-items: center;
					overflow-y: auto;
					gap: 0.7rem;

					& > .property-item {
						width: 100%;
						display: flex;
						justify-content: space-between;
						align-items: center;
						padding: 0.6rem 1.4rem;
						border-radius: 0.4rem;
						box-shadow: var(--box-shadow);
						box-sizing: border-box;

						& > .name {
							color: var(--color-second);
						}

						& > .level {
							color: var(--color-primary);
						}
					}
				}
			}
		}

		& > .buff-container {
			@include felt-patch(#fff6d9);
			flex: 1;
			height: 100%;
			width: 100%;
			display: flex;
			flex-direction: column;
			border-radius: 1.2rem;
			box-sizing: border-box;

			& > .buff-list {
				padding: 1.2rem;
				flex: 1;
				display: flex;
				flex-direction: column;
				align-items: center;
				overflow-y: auto;
				gap: 0.7rem;
			}
		}
	}
}
.label {
	position: absolute;
	padding: 0.5rem 0.7rem;
	top: -0.8rem;
	left: 0.6rem;
	margin: 0;
	z-index: 1000;
	background-color: var(--color-third);
	background-image: var(--texture-felt);
	border-radius: 0.5rem;
	color: #ffffff;
	box-shadow: var(--shadow-depth);
}
</style>
