<script setup lang="ts">
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { lightenColor, randomString } from "@src/utils";
import { computed, ref, reactive, onMounted, watch, nextTick, onBeforeUnmount } from "vue";
import { ChangeRoleOperate, UserInRoomInfo } from "@mine-monopoly/types";
import { useMonopolyClient } from "@src/core/monopoly-client/MonopolyClient";
import { RolePreviewer } from "@src/views/room/utils/RolePreviewer";
import { __PROTOCOL__ } from "@src/../global.config";
import { PROTOCOL } from "@mine-monopoly/config";
import { useUserInfo, useRoomInfo } from "@src/store";
import { useMapData, useResourceStore } from "@src/store/game";

const props = defineProps<{ user: UserInRoomInfo | undefined }>();
const emits = defineEmits(["role-select"]);

const user = computed(() => props.user);
const lightColor = computed(() => (user.value ? lightenColor(user.value.color, 15) : "#ffffff"));
const avatarSrc = computed(() => {
	return user.value && (user.value.avatar ? `${__PROTOCOL__}://${user.value.avatar}` : "");
});

const isMe = computed(() => (user.value ? user.value.userId === useUserInfo().userId : false));
const isRoomOwner = computed(() => (user.value ? user.value.userId === useRoomInfo().ownerId : false));
const amIRoomOwner = computed(() => useRoomInfo().amIRoomOwner);

const canSelectRole = computed(() => useMapData().roles.length > 0 && isMe.value);
const role = computed(() => {
	if (!user.value) return undefined;
	return useMapData().getRoleById(user.value?.roleId);
});

const roleImageUrl = computed(() => {
	if (!role.value) return undefined;
	return useResourceStore().getRecourceById(role.value.imageId)?.url;
});

const colorPickerEl = ref<HTMLInputElement | null>(null);

function handleColorPickerClick() {
	colorPickerEl.value && colorPickerEl.value.click();
}

function handleKickOut() {
	if (!props.user) return;
	const monopolyClient = useMonopolyClient();
	monopolyClient.kickOut(props.user.userId);
}

function handleRoleSelect() {
	if (!canSelectRole.value) return;
	if (!isMe.value) return;
	emits("role-select");
}

function handleColorChange(e: Event) {
	const target = e.target as HTMLInputElement;
	const newColor = target.value;
	const monopolyClient = useMonopolyClient();
	monopolyClient.changeColor(newColor);
}
</script>

<template>
	<div class="room-user-card">
		<template v-if="user">
			<div class="ready-tag" v-if="user.isReady">准备</div>

			<div
				v-else="user"
				@click="handleRoleSelect"
				class="choose-role"
				:style="{ 'background-color': role?.color }"
				:class="{ 'no-role': role === undefined }"
				:disabled="!canSelectRole"
			>
				<span>{{ role ? role.name : "选择角色" }}</span>
			</div>
		</template>

		<div class="is-room-owner" v-if="isRoomOwner"><FontAwesomeIcon icon="crown" /> <span>房主</span></div>

		<div class="right-side">
			<div v-if="isMe" class="color-picker">
				<div @click="handleColorPickerClick" class="color-display"></div>
				<input ref="colorPickerEl" type="color" @change="handleColorChange" />
			</div>

			<div v-if="amIRoomOwner && user && !isMe" class="kick">
				<FontAwesomeIcon @click="handleKickOut" icon="person-running" />
			</div>
		</div>

		<div v-if="user && user.username" class="user-info">
			<div class="avatar" :style="{ 'background-color': user.color }">
				<img v-if="avatarSrc" :src="avatarSrc" />
				<FontAwesomeIcon v-else :style="{ color: '#ffffff' }" icon="gamepad" />
			</div>

			<div class="info" :style="{ 'background-color': lightColor }">
				<span class="username">{{ user.username }}</span>
			</div>
		</div>

		<div class="role-container">
			<img v-if="roleImageUrl" :src="roleImageUrl" alt="" />
		</div>
	</div>
</template>

<style lang="scss" scoped>
@import "@src/assets/variables.scss";

$top-bar-height: 2.8rem;

.room-user-card {
	width: auto;
	display: flex;
	justify-content: center;
	align-items: center;
	position: relative;
	border-radius: 0.8rem;
	box-sizing: border-box;
	box-shadow: var(--box-shadow);
	z-index: var(--z-ui);
	@include felt-patch(#ffedb7);

	& > .right-side {
		$item-size: 2.4rem;

		position: absolute;
		top: $top-bar-height;
		right: 0.5rem;
		z-index: 101;
		padding: 0.4rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;

		& > .color-picker {
			& > .color-display {
				width: $item-size;
				height: $item-size;
				background: conic-gradient(
					rgb(255, 0, 0),
					rgb(255, 187, 0),
					rgb(255, 255, 0),
					rgb(0, 255, 0),
					rgb(0, 0, 255),
					rgb(225, 0, 255),
					rgb(255, 0, 0)
				);
				border-radius: 50%;
				border: 0.3rem solid #ffffff;
				cursor: pointer;
				box-sizing: border-box;
			}

			& > input {
				width: 0;
				height: 0;
				opacity: 0;
				position: absolute;
				left: 0;
				top: 0;
			}
		}

		& > .kick {
			display: flex;
			justify-content: center;
			align-items: center;
			width: $item-size;
			height: $item-size;
			border-radius: 50%;
			border: 0.3rem solid #ffffff;
			cursor: pointer;
			z-index: 101;
			font-size: 1.2rem;
			color: #ffffff;
			background-color: rgb(223, 79, 79);
			box-sizing: border-box;

			&:hover {
				background-color: rgb(197, 47, 47);
			}
		}
	}

	& > .ready-tag,
	& > .choose-role {
		@include felt-patch(#f7c336);
		user-select: none;
		position: absolute;
		bottom: 5%;
		width: 85%;
		font-size: 1.3rem;
		height: 2.8rem;
		line-height: 2.8rem;
		color: #ffffff;
		text-align: center;
		z-index: 100;
		box-shadow: var(--shadow-depth);
		padding: 0;
	}

	& > .choose-role {
		background-color: rgba(185, 185, 185, 0.5);
		padding: 0 0.6rem;
		box-sizing: border-box;
		cursor: pointer;
		transition: 0.2s transform;

		&:hover {
			transform: translateY(-2px);
		}

		&.no-role[disabled] {
			cursor: initial;
		}
	}

	& > .is-room-owner {
		@include felt-patch(var(--color-third));
		position: absolute;
		display: flex;
		justify-content: center;
		align-items: center;
		left: 0.8rem;
		padding: 0.5rem 0.8rem;
		top: calc($top-bar-height + 0.4rem);
		font-size: 0.9rem;
		color: #ffffff;
		z-index: 101;
		background-color: var(--color-third);
		border-radius: 0.6rem;
		gap: 0.3rem;
		user-select: none;
		background-image: var(--texture-felt);

		&:before {
			top: 0.3rem;
			left: 0.3rem;
			right: 0.3rem;
			bottom: 0.3rem;
		}
	}

	& > .ban {
		font-size: 5rem;
		color: rgba(196, 196, 196, 0.6);
	}

	& > .user-info {
		width: 100%;
		display: flex;
		justify-content: space-between;
		position: absolute;
		left: 0;
		top: 0;
		$avatar-size: 3rem;

		& > .avatar {
			@include felt-patch(#ffffff);
			min-width: $avatar-size;
			min-height: $avatar-size;
			width: $avatar-size;
			height: $avatar-size;
			text-align: center;
			line-height: $avatar-size;
			// border: 4px solid #ffffff;
			font-size: 1.2rem;
			color: #ffffff;
			z-index: 20;
			overflow: hidden;
			position: absolute;
			left: -0.3rem;
			top: -0.3rem;
			display: flex;
			justify-content: center;
			align-items: center;

			& > img {
				width: $avatar-size;
				height: $avatar-size;
			}

			&:before {
				top: 0.3rem;
				left: 0.3rem;
				right: 0.3rem;
				bottom: 0.3rem;
			}
		}

		& > .info {
			@include felt-patch(#ffedb7);
			width: 90%;
			height: 2.5rem;
			text-align: center;
			position: absolute;
			right: 0;
			display: flex;
			justify-content: center;
			align-items: center;
			z-index: 19;

			&:before {
				top: 0.3rem;
				left: 0.3rem;
				right: 0.3rem;
				bottom: 0.3rem;
			}

			& > .username {
				line-height: 2.4rem;
				color: #ffffff;
				font-size: 1.1rem;
				text-shadow: var(--text-shadow);
			}
		}
	}
}

.role-container {
	width: 100%;
	height: 100%;
	padding-top: $top-bar-height;
	box-sizing: border-box;

	& img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		padding: 1rem;
		box-sizing: border-box;
	}
}
</style>
