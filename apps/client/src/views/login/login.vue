<script setup lang="ts">
import { ref, onBeforeMount, onBeforeUnmount, reactive, onMounted, nextTick, h } from "vue";
import router from "@src/router";
import { __LOGINPAGEURL__, __PROTOCOL__ } from "@src/../global.config";
import { getUserByToken } from "@src/utils/api/user";
import { createLoginIframeOnBody, exitFullScreen, randomString, setTimeOutAsync } from "@src/utils";
import { FPMessage } from "@fatpaper-monopoly/ui";
import { useUserInfo } from "@src/store";
import { LoginDiceRenderer } from "@src/classes/three/LoginDiceRenderer";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import FpPopover from "@src/components/utils/fp-popover/fp-popover.vue";
import LoginExtra from "@src/views/login/components/login-extra.vue";
import FpDialog from "@src/components/utils/fp-dialog/fp-dialog.vue";
import { Login } from "@fatpaper-monopoly/login";

let loginCodeRenderer: LoginDiceRenderer | null;
let diceRotate: boolean = true;
const firstClick = ref(false);
const needLogin = ref(true);
const showLoginMode = ref(false);
const showDice = ref(false);

const showTouristLogin = ref(false);
const showUserLogin = ref(false);

const touristLoginForm = reactive({
	userName: "",
	color: "#000000",
});

function handleFirstClick() {
	firstClick.value = true;
	let token = localStorage.getItem("token") || "";
	let userInfo = localStorage.getItem("user") || "";
	const _needLogin = !token && !userInfo;
	needLogin.value = _needLogin;
	if (!_needLogin) {
		getUserInfoToRoomList();
	} else {
		showLoginMode.value = true;
	}
}

async function doLogin() {
	showUserLogin.value = true;
	// const token = await toLogin();
	// if (token) {
	// 	localStorage.setItem("token", token);
	// 	getUserInfoToRoomList();
	// }
}

onBeforeUnmount(() => {
	loginCodeRenderer && loginCodeRenderer.clear();
	loginCodeRenderer = null;
});

async function getUserInfoToRoomList() {
	try {
		showLoginMode.value = false;
		showDice.value = true;
		nextTick(async () => {
			const canvasEl = document.getElementById("dice-canvas") as HTMLCanvasElement;
			loginCodeRenderer = new LoginDiceRenderer(canvasEl, diceRotate);
			await loginCodeRenderer.initDice();
			let token = localStorage.getItem("token") || "";
			if (token) {
				//账号登录
				try {
					const { id: userId, useraccount, username, avatar, color } = await getUserByToken(token);
					const userInfoStore = useUserInfo();
					userInfoStore.$patch({ userId, useraccount, username, avatar, color });
					await setTimeOutAsync(1500);
					if (loginCodeRenderer) await loginCodeRenderer.showImage(`${__PROTOCOL__}://${avatar}`);
					await setTimeOutAsync(2000, toRoomList);
					return;
				} catch (e: any) {
					localStorage.removeItem("token");
					showDice.value = false;
					showLoginMode.value = true;
				}
			}
			let userInfo = localStorage.getItem("user") || "";
			if (userInfo) {
				//游客登录
				const { userId, useraccount = "", username, avatar = "", color } = JSON.parse(userInfo);
				const userInfoStore = useUserInfo();
				userInfoStore.$patch({ userId, useraccount, username, avatar, color });
				await setTimeOutAsync(1500);
				if (loginCodeRenderer) await loginCodeRenderer.showImage("");
				await setTimeOutAsync(2000, toRoomList);
				return;
			}
		});
	} catch (e: any) {
		FPMessage({
			type: "error",
			message: e || e.message || "在验证身份时发生了未知的错误",
			onClosed: () => {
				localStorage.removeItem("token");
				localStorage.removeItem("user");
			},
		});
	}
}

function handleShowTouristLoginDialog() {
	showTouristLogin.value = true;
}

function handleTouristLogin() {
	if (!touristLoginForm.userName) {
		FPMessage({
			type: "error",
			message: "不能逃避游客登记📝",
		});
		return;
	}
	const userInfo = {
		userId: "temp-player-" + randomString(8),
		useraccount: "",
		username: touristLoginForm.userName,
		color: touristLoginForm.color,
		avatar: "",
	};
	if (touristLoginForm.color == "#000000") {
		FPMessage({
			type: "info",
			message: "如此纯正的黑？你口味挺独特的🧐",
		});
	}
	localStorage.setItem("user", JSON.stringify(userInfo));
	getUserInfoToRoomList();
}

function toRoomList() {
	router.replace({ name: "room-router" });
}
</script>

<template>
	<div @click.once="handleFirstClick" class="login-page">
		<div class="title">
			<span>FatPaper的大富翁</span>
		</div>

		<div class="front-cover" v-show="!firstClick">
			<div class="login-code-container">
				<div class="tip">点击任意位置继续</div>
				<!-- <img class="login-code loading" :src="imgUrl" alt=""> -->
			</div>

			<LoginExtra></LoginExtra>
		</div>

		<div class="login-mode-choose" v-if="showLoginMode">
			<div @click="doLogin" class="login-mode">
				<span>我(想)有个号</span>
				<span>注册/登录</span>
				<FontAwesomeIcon class="icon" icon="circle-user" />
			</div>
			<div @click="handleShowTouristLoginDialog" class="login-mode">
				<span>我是游客</span>
				<span>随便玩玩</span>
				<FontAwesomeIcon class="icon" icon="gamepad" />
			</div>

			<FpDialog @submit="handleTouristLogin" v-model:visible="showTouristLogin">
				<template #title>
					<span style="font-size: 1.2rem">游客信息登记📝</span>
				</template>
				<div class="tourist-form-container">
					<span>用户名</span>
					<input
						v-model="touristLoginForm.userName"
						:style="{ color: touristLoginForm.color }"
						type="text"
						placeholder="输入名字"
					/><br />
					<span>代表颜色</span>
					<input v-model="touristLoginForm.color" type="color" />
				</div>
			</FpDialog>
		</div>

		<Login v-if="showUserLogin" class="user-login" />

		<div class="dice-container" v-show="showDice">
			<canvas id="dice-canvas" class="dice"></canvas>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.login-page {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.user-login {
	position: fixed;
	width: 80vw;
	height: 90vh;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	z-index: 1000;
}

.front-cover,
.login-mode-choose,
.dice-container {
	flex: 1;
}

.dice-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 8rem 0;

	canvas {
		width: 100%;
		height: 100%;
	}
}

.tourist-form-container {
	display: grid;
	padding: 0 0.3rem;

	& span {
		font-size: 1.3rem;
		margin-bottom: 0.3rem;
		color: var(--color-primary);
	}

	& input {
		height: 4rem;
		font-size: 1.5rem;
		box-sizing: border-box;
		margin-bottom: 0.5rem;
		transition: 0.3s all;
		border: 0.2rem solid var(--color-bg);

		&:focus {
			border: 0.2rem solid var(--color-primary);
		}
	}
}

.login-mode-choose {
	width: 85%;
	display: flex;
	flex-direction: row;
	justify-content: space-around;
	align-items: center;

	.login-mode {
		width: 19rem;
		height: 15rem;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		border: 0.5rem solid rgba(255, 255, 255, 0.5);
		border-radius: 1.8rem;
		background-color: rgba(255, 255, 255, 0.65);
		cursor: pointer;
		transition: 0.5s all;
		overflow: hidden;
		position: relative;

		& > span {
			transition: 0.2s all;
			font-size: 2rem;
			color: var(--color-primary);
			text-shadow: var(--text-shadow);
			z-index: 1;

			&:first-child {
				font-size: 2.5rem;
				font-weight: bold;
				color: #ffffff;
				margin-bottom: 0.5rem;
				text-shadow: 0.2rem 0.2rem 0.13rem rgb(255, 182, 59);
			}
		}

		& > .icon {
			transition: 0.2s all;
			position: absolute;
			font-size: 10rem;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			z-index: 0;
			color: var(--color-second);
			opacity: 0.2;
		}

		&:hover {
			background-color: var(--color-second);

			& > span {
				font-size: 2.8rem;
				color: #ffffff;
				margin-bottom: 0;
				text-shadow: 0.2rem 0.2rem 0.13rem rgb(255, 182, 59);

				&:first-child {
					font-size: 0;
					color: var(--color-primary);
					text-shadow: 0.13rem 0.13rem 0.13rem rgb(255, 245, 229);
				}
			}

			& > .icon {
				position: absolute;
				top: 0.5rem;
				left: 0.5rem;
				font-size: 5rem;
				transform: rotate(-10deg);
				color: #ffffff;
				opacity: 0.4;
			}
		}
	}
}

.login-code-container {
	width: 100%;
	height: 100%;
	flex: 1;
	display: flex;
	justify-content: center;
	align-items: center;
	margin-bottom: 5rem;

	& > .tip {
		font-size: 2rem;
		margin-top: auto;
		margin-bottom: 9rem;
		color: #ffffff;
		text-shadow: var(--text-shadow);
		animation: blink infinite 1.8s;
		cursor: pointer;

		@keyframes blink {
			0% {
				opacity: 1;
			}
			50% {
				opacity: 0.3;
			}
			100% {
				opacity: 1;
			}
		}
	}

	.dice {
		$img_size: 28rem;

		width: $img_size;
		height: $img_size;
		user-select: none;
	}
}

.title {
	margin-top: 30px;

	& > span {
		font-size: 6em;
		color: #ffffff;
		letter-spacing: 0.1em;
		display: block;
		position: relative;
		user-select: none;

		&::before,
		&::after {
			content: "FatPaper的大富翁";
		}

		&:before,
		&:after {
			position: absolute;
			left: 0;
			top: 0;
		}

		&:before {
			color: #ff9114;
			z-index: -1;
			animation: rotate1 5s ease-in-out infinite;
		}

		&:after {
			color: #7e7e7e;
			z-index: -2;
			animation: rotate2 5s ease-in-out infinite;
		}
	}

	@keyframes rotate1 {
		0%,
		100% {
			-webkit-transform: translate3d(0.2rem, 0.2rem, 0.2rem);
			transform: translate3d(0.2rem, 0.2rem, 0.2rem);
		}

		50% {
			-webkit-transform: translate3d((-0.2rem, 0.2rem, -0.2rem));
			transform: translate3d((-0.2rem, 0.2rem, -0.2rem));
		}
	}

	@keyframes rotate2 {
		0%,
		100% {
			-webkit-transform: translate3d(5px, 5px, 5px);
			transform: translate3d(5px, 5px, 5px);
		}

		50% {
			-webkit-transform: translate3d((-5px, 5px, -5px));
			transform: translate3d((-5px, 5px, -5px));
		}
	}
}
</style>
