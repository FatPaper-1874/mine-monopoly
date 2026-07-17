<script setup lang="ts">
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { lightenColor } from "@src/utils";
import { computed, ref } from "vue";
import { UserInRoomInfo } from "@mine-monopoly/types";
import { useMonopolyClient } from "@src/core/monopoly-client/MonopolyClient";
import { useUserInfo, useRoomInfo } from "@src/store";
import { useMapData, useResourceStore } from "@src/store/game";

const props = defineProps<{ user: UserInRoomInfo | undefined; addAiButton?: boolean }>();
const emits = defineEmits(["role-select", "add-ai"]);

const user = computed(() => props.user);
const lightColor = computed(() => (user.value ? lightenColor(user.value.color, 15) : "#ffffff"));
const avatarSrc = computed(() => {
	return user.value?.avatar || "";
});

const isMe = computed(() => (user.value ? user.value.userId === useUserInfo().userId : false));
const isRoomOwner = computed(() => (user.value ? user.value.userId === useRoomInfo().ownerId : false));
const amIRoomOwner = computed(() => useRoomInfo().amIRoomOwner);
const isAIPlayer = computed(() => Boolean(user.value?.isAI));
const canChangeColor = computed(() => isMe.value || (amIRoomOwner.value && isAIPlayer.value));

const canSelectRole = computed(() => useMapData().roles.length > 0 && (isMe.value || (amIRoomOwner.value && isAIPlayer.value)));
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
	if (!props.user) return;
	emits("role-select", props.user);
}

function handleColorChange(e: Event) {
	if (!props.user) return;
	const target = e.target as HTMLInputElement;
	const newColor = target.value;
	const monopolyClient = useMonopolyClient();
	monopolyClient.changeColorForUser(props.user.userId, newColor);
}

function handleAddAi() {
	emits("add-ai");
}
</script>

<template>
	<div class="room-user-card">
		<button
			v-if="addAiButton && !user"
			type="button"
			@click="handleAddAi"
			style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 5; width: max-content;"
		>
			<FontAwesomeIcon style="margin-right: 0.35rem;" icon="robot" />
			添加 机器人 / AI
		</button>
		<template v-if="user">
			<div class="ready-tag" v-if="user.isReady && !canSelectRole">准备</div>

			<div
				v-else
				@click="handleRoleSelect"
				class="choose-role"
				:style="{ 'background-color': role?.color }"
				:class="{ 'no-role': role === undefined, 'my-button': canSelectRole }"
				:disabled="!canSelectRole"
			>
				<span>{{ role ? role.name : "选择角色" }}</span>
			</div>
		</template>

		<div v-if="isRoomOwner || isAIPlayer" class="status-badges">
			<div class="status-badge owner" v-if="isRoomOwner"><FontAwesomeIcon icon="crown" /> <span>房主</span></div>
			<div class="status-badge ai" v-if="isAIPlayer"><FontAwesomeIcon icon="robot" /> <span>AI</span></div>
		</div>

		<div class="right-side">
			<div v-if="canChangeColor" class="color-picker">
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
				<FontAwesomeIcon v-else :style="{ color: '#ffffff' }" :icon="isAIPlayer ? 'robot' : 'gamepad'" />
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
@use "@src/assets/variables" as *;
@use "@mine-monopoly/style/variables" as fp;

$top-bar-height: 2.8rem;

// 定义跳动动画
@keyframes bounce {
	0%,
	100% {
		transform: translateY(0);
	}
	50% {
		transform: translateY(-0.25rem);
	}
}

.room-user-card {
	width: auto;
	display: flex;
	justify-content: center;
	align-items: center;
	position: relative;
	border-radius: 0.8rem;
	box-sizing: border-box;
	box-shadow: var(--fp-shadow-md);
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
		box-shadow: var(--fp-shadow-depth);
		padding: 0;
	}

	& > .choose-role {
		background-color: rgba(185, 185, 185, 0.5);
		padding: 0 0.6rem;
		box-sizing: border-box;

		// 只有自己的按钮才有交互效果
		&.my-button {
			cursor: pointer;
			transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
			animation: bounce 1.5s ease-in-out infinite;

			&:hover:not([disabled]) {
				background-color: var(--fp-color-primary);
			}

			&.no-role[disabled] {
				cursor: initial;
				animation: none;
			}
		}
	}

	& > .status-badges {
		position: absolute;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.45rem;
		inset-inline-start: 0.8rem;
		inset-block-start: calc($top-bar-height + 0.4rem);
		z-index: 101;

		.status-badge {
			position: relative;
			display: flex;
			align-items: center;
			gap: 0.3rem;
			padding: 0.45rem 0.75rem;
			border-radius: 0.6rem;
			font-size: 0.85rem;
			color: #ffffff;
			user-select: none;
			background-image: var(--fp-texture-felt);
			box-shadow: var(--fp-shadow-card);

			&.owner {
				background-color: var(--fp-color-tertiary);
			}

			&.ai {
				background-color: var(--fp-color-secondary);
			}

			&:before {
				top: 0.3rem;
				left: 0.3rem;
				right: 0.3rem;
				bottom: 0.3rem;
			}
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
			min-width: $avatar-size;
			min-height: $avatar-size;
			width: $avatar-size;
			height: $avatar-size;
			text-align: center;
			line-height: $avatar-size;
			// border: 0.25rem solid #ffffff;
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
			box-shadow: var(--fp-shadow-card);
			border-radius: 0.8rem;

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
				text-shadow: var(--fp-text-shadow);
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
