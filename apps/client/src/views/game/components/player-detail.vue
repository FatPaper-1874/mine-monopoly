<script setup lang="ts">
import { PlayerInfo } from "@src/interfaces/game";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { __PROTOCOL__ } from "@src/../global.config";
import { computed } from "vue";
import ChanceCard from "./chance-card.vue";
import BuffItem from "./buff-item.vue";
import { useGameInfo, useRoomInfo } from "@src/store";
import { PropertyLevel } from "@src/utils/var";

const props = defineProps<{
	player: PlayerInfo;
}>();

const playersPropertyies = computed(() => {
	return useGameInfo().propertiesList.filter((property) => {
		return property.owner && property.owner.id === props.player.id;
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
						<div class="username">{{ player.user.username }}</div>
						<div class="money">￥{{ player.money }}</div>
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
							<div class="level" :style="{ color: PropertyLevel[property.buildingLevel].color }">
								{{ PropertyLevel[property.buildingLevel].name }}
							</div>
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
		<div class="card-container">
			<div
				class="label"
				:style="{
					'justify-content': player.chanceCards.length === 4 ? 'space-between' : 'flex-start',
				}"
			>
				<FontAwesomeIcon icon="wand-sparkles" />
				机会卡( {{ player.chanceCards.length }} / 4 )
			</div>
			<div v-if="chanceCardVisible" class="card-list">
				<ChanceCard v-for="card in player.chanceCards" :chance-card="card" :disable="false" :key="card.id" />
			</div>
			<div v-else>房主说不可以看喔😣</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.player-detail {
	padding: 1rem;

	& > .info {
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
				width: 100%;
				display: flex;
				align-items: center;
				justify-content: space-around;
				gap: 0.8rem;

				& > .text {
					flex: 1;
					display: flex;
					flex-direction: column;
					font-size: 1.3rem;
					text-align: center;
					background-color: rgba(255, 255, 255, 0.75);
					box-shadow: var(--box-shadow);
					border-radius: 1.4rem;
					padding: 0.8rem 1.5rem;
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
				// flex: 1;
				height: 16rem;
				width: 20rem;
				display: flex;
				flex-direction: column;
				border-radius: 1.2rem;
				background-color: rgba(255, 255, 255, 0.8);
				box-shadow: var(--box-shadow);
				box-sizing: border-box;

				& > .label {
					padding: 1.2rem;
					margin: 0;
				}

				& > .properyies-list {
					padding: 1.2rem;
					padding-top: 0.6rem;
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
					}
				}
			}
		}

		& > .buff-container {
			flex: 1;
			height: 20rem;
			width: 100%;
			display: flex;
			flex-direction: column;
			border-radius: 1.2rem;
			background-color: rgba(255, 255, 255, 0.8);
			box-shadow: var(--box-shadow);
			box-sizing: border-box;

			& > .label {
				padding: 1.2rem;
				margin: 0;
			}

			& > .buff-list {
				padding: 1.2rem;
				padding-top: 0;
				flex: 1;
				display: flex;
				flex-direction: column;
				align-items: center;
				overflow-y: auto;
				gap: 0.7rem;
			}
		}
	}

	& > .card-container {
		margin-top: 1.2rem;
		width: 100%;
		display: flex;
		flex-direction: column;
		border-radius: 1.2rem;
		background-color: rgba(255, 255, 255, 0.8);
		box-shadow: var(--box-shadow);
		padding: 1.2rem;
		box-sizing: border-box;

		& > .card-list {
			overflow-x: auto;
			display: flex;
			align-items: center;
			gap: 0.8rem;
		}
	}
}

.label {
	font-size: 1.2rem;
	color: var(--color-second);
	margin-bottom: 1.2rem;
	text-shadow: var(--text-shadow-light);
}
</style>
