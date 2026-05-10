<script setup lang="ts">
import { onBeforeMount, onMounted, computed, ref, onUpdated } from "vue";
import { useUserInfo, useUserList, useRoomList, useRoomInfo, useLoading } from "@src/store";
import { useMonopolyClient } from "@src/core/monopoly-client/MonopolyClient";
import userCard from "@src/components/common/user-card.vue";
import router from "@src/router";
import { getUserByToken } from "@src/utils/api/user";
import { FPMessage } from "@mine-monopoly/ui";
import { __FATPAPER_HOST__, __ICE_SERVER_PORT__ } from "@src/../global.config";
import LoginExtra from "@src/views/login/components/login-extra.vue";
import FpPopover from "@src/components/utils/fp-popover/fp-popover.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { getRandomPublicRoom } from "@src/utils/api/room-router";
import { throttle } from "@src/utils";
import { useResourceStore } from "@src/store/game";

const userInfoStore = useUserInfo();
const userListStore = useUserList();
const roomListStore = useRoomList();

const user = computed(() => userInfoStore);
const roomId = ref("");

onMounted(async () => {
	// 清除缓存
	useResourceStore().clear();
	roomListStore.$reset();
	if (!userInfoStore.hasUserInfo()) {
		useLoading().showLoading("读取用户信息中");
		let token = localStorage.getItem("token") || "";
		if (token) {
			//账号登录
			try {
				const { id: userId, useraccount, username, avatar, color } = await getUserByToken(token);
				const userInfoStore = useUserInfo();
				userInfoStore.$patch({ userId, useraccount, username, avatar, color });
				useLoading().hideLoading();
				return;
			} catch (e: any) {
				FPMessage({ type: "error", message: e.message || e });
				handleLogout();
			}
		}
		let userInfo = localStorage.getItem("user") || "";
		if (userInfo) {
			//游客登录
			try {
				const { userId, useraccount = "", username, avatar = "", color } = JSON.parse(userInfo);
				const userInfoStore = useUserInfo();
				userInfoStore.$patch({ userId, useraccount, username, avatar, color });
				useLoading().hideLoading();
				return;
			} catch (e: any) {
				FPMessage({ type: "error", message: "读取用户信息失败, 请重新进行游客登记" });
				handleLogout();
			}
		}
		handleLogout();
	}
});

function handleLogout() {
	localStorage.removeItem("token");
	localStorage.removeItem("user");
	router.replace({ name: "login" });
}

async function handleJoinRoom(e: Event) {
	e.preventDefault();
	const _roomId = roomId.value;
	if (!_roomId) {
		FPMessage({ type: "error", message: "请输入房间号" });
		return;
	}
	await joinRoom(_roomId);
}

async function joinRoom(id: string) {
	try {
		const monopolyClient = await useMonopolyClient({
			iceServer: {
				host: __FATPAPER_HOST__,
				port: __ICE_SERVER_PORT__,
			},
		});
		useLoading().showLoading("正在尝试连接");
		await monopolyClient.joinRoom(id);
	} catch (e: any) {
		FPMessage({ type: "error", message: e.message || e });
	} finally {
		useLoading().hideLoading();
	}
}

const randomRoomButtonDisable = ref(false);
let interval: any;
async function handleGetRandomPublicRoom(e: Event) {
	e.preventDefault();
	if (interval) clearInterval(interval);
	randomRoomButtonDisable.value = true;
	interval = setInterval(() => {
		randomRoomButtonDisable.value = false;
	}, 1000);
	try {
		const res = await getRandomPublicRoom();
		if (res.roomId) {
			FPMessage({ type: "success", message: "遇到等待的小伙伴了呢!" });
			await joinRoom(res.roomId);
		} else {
			FPMessage({ type: "error", message: "现在没有公开的房间喔" });
		}
	} catch (e: any) {
		FPMessage({ type: "error", message: e.message || e });
	}
}
</script>

<template>
	<LoginExtra></LoginExtra>
	<div class="hall-page">
		<div class="user-container">
			<userCard :avatar="user.avatar" :username="user.username" :color="user.color" />

			<div class="side-bar">
				<button class="quit btn-small" @click="handleLogout">登出</button>
			</div>
		</div>
		<div class="join-room">
			<div class="title">Room-Router</div>
			<div class="describe">
				·输入房间号可加入房间，第一个使用房间号的将成为主机(房主)<br />
				·建议使用稍微复杂的房间号(防止误入别人的房间)<br />
			</div>
			<form @submit="handleJoinRoom">
				<input maxlength="12" v-model="roomId" type="text" placeholder="房间号(1-12个字符)" />
				<button type="submit">加入/创建房间</button>
				<FpPopover placement="bottom">
					<template #default>
						<button class="random-room-button" :disabled="randomRoomButtonDisable" @click="handleGetRandomPublicRoom">
							<FontAwesomeIcon :icon="randomRoomButtonDisable ? 'hourglass-half' : 'shuffle'" />
						</button>
					</template>
					<template #content>
						<div class="tips">寻找随机的公开房间</div>
					</template>
				</FpPopover>
			</form>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@import "@src/assets/variables.scss";
.hall-page {
	width: 100%;
	height: 100%;
	display: flex;
	//flex-direction: column;
	justify-content: center;
	align-items: center;

	& > div {
		border-radius: 1.5rem;
		background-color: rgba(255, 255, 255, 0.65);
		backdrop-filter: blur(0.2rem);
	}

	.user-container {
		width: 18rem;
		height: 7.5rem;
		margin-right: 0.7rem;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		position: relative;

		& > .side-bar {
			position: absolute;
			right: 0.3rem;
			top: 0.3rem;
			display: flex;
			flex-direction: column;
			align-items: center;

			& > button {
				width: 100%;
				height: 1.8rem;
				border-radius: 0.6rem 0.8rem 0.6rem 0.6rem;
				font-size: 0.8rem;
				padding: 0 0.8rem;
				z-index: 10;
			}
		}
	}

	.join-room {
		@include felt-patch(#ffedb7);
		padding: 1.8rem;
		border-radius: 2rem;

		& .title {
			display: inline-block;
			font-size: 1.6rem;
			color: var(--color-primary);
			margin-bottom: 0.7rem;
			background-color: rgba(255, 255, 255, 0.45);
			padding: 0.4rem 0.8rem;
			border-radius: 1rem;
		}

		& .describe {
			font-size: 0.9rem;
			color: #393939;
			margin-bottom: 0.8rem;
			padding-left: 0.8rem;
		}

		& form {
			display: flex;
			justify-content: space-around;

			& .random-room-button {
				width: 3rem;
				padding: 0 0.6rem;
			}

			& .tips {
				width: max-content;
				margin-top: 4rem;
				font-size: 1.2rem;
				background-color: rgba(255, 255, 255, 0.7);
				border-radius: 0.7rem;
				padding: 0.6rem;
				color: var(--color-primary);
				text-shadow: var(--text-shadow);
			}
		}

		& input {
			height: 3rem;
		}

		& button {
			margin-left: 0.5rem;
			border-radius: 0.7rem;
			height: 3rem;
		}
	}
}
</style>
