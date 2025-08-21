<script setup lang="ts">
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { lightenColor, randomString } from "@src/utils";
import { computed, ref, reactive, onMounted, watch, nextTick, onBeforeUnmount } from "vue";
import { Role, User, UserInRoomInfo } from "@src/interfaces/bace";
import { useRoomInfo, useUserInfo } from "@src/store";
import { ChangeRoleOperate } from "@src/enums/bace";
import { useMonopolyClient } from "@src/classes/monopoly-client/MonopolyClient";
import { RolePreviewer } from "@src/views/room/utils/RolePreviewer";
import { __PROTOCOL__ } from "@src/../global.config";

const props = defineProps<{ user: UserInRoomInfo | undefined }>();

const user = computed(() => props.user);
const lightColor = computed(() => (user.value ? lightenColor(user.value.color, 15) : "#ffffff"));
const avatarSrc = computed(() => {
	return user.value && (user.value.avatar ? `${__PROTOCOL__}://${user.value.avatar}` : "");
});

const isMe = computed(() => (user.value ? user.value.userId === useUserInfo().userId : false));
const isRoomOwner = computed(() => (user.value ? user.value.userId === useRoomInfo().ownerId : false));
const amIRoomOwner = computed(() => {
	const me = useUserInfo();
	return me.userId === useRoomInfo().ownerId;
});
function handleChangeRole(operate: ChangeRoleOperate) {
	const monopolyClient = useMonopolyClient();
	monopolyClient.changeRole(operate);
}

const canvasId = randomString(16);
const colorPickerEl = ref<HTMLInputElement | null>(null);
let rolePreviewer: RolePreviewer | null = null;

function handleColorPickerClick() {
	colorPickerEl.value && colorPickerEl.value.click();
}

function handleKickOut() {
	if (!props.user) return;
	const monopolyClient = useMonopolyClient();
	monopolyClient.kickOut(props.user.userId);
}

function handleColorChange(e: Event) {
	const target = e.target as HTMLInputElement;
	const newColor = target.value;
	const monopolyClient = useMonopolyClient();
	monopolyClient.changeColor(newColor);
}

onMounted(() => {
	nextTick(() => {
		const canvasEl = document.getElementById(canvasId) as HTMLCanvasElement;
		watch(
			() => props.user,
			(newUser, oldUser) => {
				if (newUser) {
					if (!oldUser) {
						rolePreviewer = new RolePreviewer(canvasEl);
					}
					if (newUser.role.id !== (oldUser?.role.id || "")) {
						rolePreviewer &&
							rolePreviewer.loadRole(`${__PROTOCOL__}://${newUser.role.baseUrl}/`, newUser.role.fileName);
					}
				} else {
					rolePreviewer && rolePreviewer.destroy();
					rolePreviewer = null;
				}
			},
			{ immediate: true, deep: true }
		);
	});
});

onBeforeUnmount(() => {
	if (!rolePreviewer) return;
	rolePreviewer.destroy();
	rolePreviewer = null;
});
</script>

<template>
	<div class="room-user-card">
		<div class="ready-tag" v-if="user && user.isReady">准备</div>
		<div class="choose-role" v-else-if="user && user.role" :style="{ 'background-color': user.role.color }">
			<FontAwesomeIcon v-if="isMe" @click="handleChangeRole(ChangeRoleOperate.Prev)" class="icon" icon="angle-left" />
			<span>{{ user.role.roleName }}</span>
			<FontAwesomeIcon v-if="isMe" @click="handleChangeRole(ChangeRoleOperate.Next)" class="icon" icon="angle-right" />
		</div>
		<div class="choose-role" v-else-if="user && !user.role">
			<span>选择角色</span>
		</div>

		<div class="is-room-owner" v-if="isRoomOwner"><FontAwesomeIcon icon="crown" /> <span>房主</span></div>

		<div v-if="isMe" class="color-picker">
			<div @click="handleColorPickerClick" class="color-display"></div>
			<input ref="colorPickerEl" type="color" @change="handleColorChange" />
		</div>

		<div v-if="amIRoomOwner && user && !isMe" class="kick">
			<FontAwesomeIcon @click="handleKickOut" icon="person-running" />
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

		<!--    <div v-else-if="isban" class="ban">-->
		<!--      <font-awesome-icon class="icon" icon="ban"/>-->
		<!--    </div>-->

		<div class="role-container">
			<canvas :id="canvasId" />
		</div>
	</div>
</template>

<style lang="scss" scoped>
$avatar-size: 2.4rem;
$top-bar-height: $avatar-size;
.room-user-card {
	width: auto;
	display: flex;
	justify-content: center;
	align-items: center;
	position: relative;
	border-radius: 0.8rem;
	overflow: hidden;
	background-color: rgba(255, 255, 255, 0.7);
	backdrop-filter: blur(0.2rem);
	box-sizing: border-box;
	box-shadow: var(--box-shadow);

	& > .color-picker {
		position: absolute;
		top: calc($top-bar-height + 0.4rem);
		right: 0.4rem;
		z-index: 101;

		& > .color-display {
			width: 2.4rem;
			height: 2.4rem;
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
		width: 2.4rem;
		height: 2.4rem;
		border-radius: 50%;
		border: 0.3rem solid #ffffff;
		cursor: pointer;
		position: absolute;
		top: calc($top-bar-height + 0.4rem);
		right: 0.4rem;
		z-index: 101;
		font-size: 1.2rem;
		color: #ffffff;
		background-color: rgb(223, 79, 79);
		box-sizing: border-box;

		&:hover {
			background-color: rgb(197, 47, 47);
		}
	}

	& > .ready-tag,
	.choose-role {
		position: absolute;
		bottom: 5%;
		width: 100%;
		font-size: 1.5rem;
		height: 2.6rem;
		line-height: 2.6rem;
		color: #ffffff;
		background-color: rgb(255, 221, 25);
		text-align: center;
		box-shadow: 0.13rem 0.13rem 0.2rem rgba(0, 0, 0, 0.1);
		text-shadow: 0.2rem 0.2rem 0.13rem rgba(0, 0, 0, 0.1);
		z-index: 100;
	}

	& > .is-room-owner {
		position: absolute;
		display: flex;
		justify-content: center;
		align-items: center;
		left: 0.4rem;
		padding: 0.3rem 0.6rem;
		top: calc($top-bar-height + 0.4rem);
		font-size: 1.3rem;
		color: #ffffff;
		z-index: 101;
		background-color: var(--color-third);
		border-radius: 0.6rem;
		gap: 0.3rem;
		user-select: none;
	}

	& > .choose-role {
		display: flex;
		justify-content: space-between;
		align-items: center;
		line-height: 0;
		user-select: none;
		background-color: rgba(185, 185, 185, 0.8);
		padding: 0 0.6rem;
		box-sizing: border-box;

		& > span {
			flex: 1;
		}

		& > svg:hover {
			cursor: pointer;
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

		& > .avatar {
			min-width: $avatar-size;
			min-height: $avatar-size;
			width: $avatar-size;
			height: $avatar-size;
			text-align: center;
			line-height: $avatar-size;
			// border: 4px solid #ffffff;
			font-size: 1.2rem;
			color: #ffffff;
			box-shadow: var(--box-shadow);
			z-index: 101;
			overflow: hidden;

			& > img {
				width: $avatar-size;
				height: $avatar-size;
			}
		}

		& > .info {
			height: 2.4rem;
			text-align: center;
			flex: 1;
			// border: 4px solid #ffffff;
			border-left: 0px;
			box-shadow: var(--box-shadow);

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

	& > .no-role {
		font-size: 10rem;
		color: rgba($color: #777777, $alpha: 0.2);
	}

	& canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
}
</style>
