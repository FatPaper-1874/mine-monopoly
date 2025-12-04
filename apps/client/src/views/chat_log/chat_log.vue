<script setup lang="ts">
import { ref, watch, computed, nextTick } from "vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { useChat, useGameLog, useRoomInfo } from "@src/store";
import { useMonopolyClient } from "@src/core/monopoly-client/MonopolyClient";
import ChatMessageItem from "./components/chat-message-item.vue";
import gsap from "gsap";
import GameLogItem from "./components/game-log-item.vue";

const chatStore = useChat();
const chatMessageList = chatStore.chatMessageQueue;
const newChatMessageNum = computed(() => chatStore.newMessageNum);
const isChatShow = computed(() => chatStore.visible);

const gameLogStore = useGameLog();
const gameLogList = gameLogStore.gameLogQueue;
const isGameLogShow = computed(() => gameLogStore.visible);

const newMessageNotify = computed(() => (newChatMessageNum.value > 0 ? `(${newChatMessageNum.value}条新消息)` : ""));

const inputMessage = ref("");
const roomId = useRoomInfo().roomId;

function sendChatMessage(e: Event) {
	e.preventDefault();
	const socketClient = useMonopolyClient();
	socketClient && socketClient.sendRoomChatMessage(inputMessage.value, roomId);
	inputMessage.value = "";
}

watch(chatMessageList, () => {
	nextTick(() => {
		const container = document.querySelector(".chat_content-container");
		if (container) {
			container.scrollTop = container.scrollHeight;
		}
	});
});

watch(gameLogList, () => {
	nextTick(() => {
		const container = document.querySelector(".game_log_content-container");
		if (container) {
			container.scrollTop = container.scrollHeight;
		}
	});
});

const containerVisible = computed(() => {
	return isChatShow.value || isGameLogShow.value;
});

function handleChatShow() {
	const chatStore = useChat();
	chatStore.visible = !chatStore.visible;
	if (chatStore.visible) {
		gameLogStore.visible = false;
	}
	chatStore.resetNewMessageNum();
}

function handleGameLogShow() {
	const gameLogStore = useGameLog();
	gameLogStore.visible = !gameLogStore.visible;
	if (gameLogStore.visible) {
		chatStore.visible = false;
	}
}

function handleHideContainer() {
	const chatStore = useChat();
	const gameLogStore = useGameLog();
	chatStore.visible = false;
	gameLogStore.visible = false;
}
</script>

<template>
	<div class="chat_log">
		<div class="container" :style="{ height: containerVisible ? '18rem' : '0' }">
			<div class="chat-container">
				<button class="button" @click="handleChatShow">
					<FontAwesomeIcon icon="comments" style="margin-right: 0.3rem" />
					聊天 <span style="font-size: 0.8em">{{ newMessageNotify }}</span>
				</button>

				<button class="button" @click="handleGameLogShow">
					<FontAwesomeIcon icon="book" style="margin-right: 0.3rem" />
					游戏记录
				</button>

				<button v-show="containerVisible" class="button" @click="handleHideContainer">
					<FontAwesomeIcon icon="angle-down" style="font-size: 1.2rem" />
				</button>

				<div class="containers">
					<div v-show="isChatShow" class="chat_main-container">
						<div class="chat_content-container">
							<TransitionGroup name="list">
								<ChatMessageItem
									v-for="message in chatMessageList"
									:key="message.user.userId + message.time"
									:chat-message="message"
								/>
							</TransitionGroup>
						</div>
					</div>
					<div v-show="isGameLogShow" class="game_log_main-container">
						<div class="game_log_content-container">
							<TransitionGroup name="list">
								<GameLogItem v-for="log in gameLogList" :key="log.id" :game-log="log" />
							</TransitionGroup>
						</div>
					</div>
				</div>
			</div>

			<!-- <div class="game_log-container">
				
			</div> -->
		</div>

		<form @submit="sendChatMessage" class="chat_input-container">
			<input v-model="inputMessage" type="text" />
			<input type="submit" value="发送" />
		</form>
	</div>
</template>

<style lang="scss" scoped>
.list-enter-active,
.list-leave-active {
	transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
	opacity: 0;
	transform: translateX(30px);
}

.chat_log {
	position: absolute;
	bottom: 0;
	left: 0.5rem;
	z-index: var(--z-chat-log);
	width: 23rem;
	display: flex;
	flex-direction: column;
	box-sizing: border-box;

	.container {
		position: relative;

		.chat-container,
		.game_log-container {
			position: absolute;
			transform: translateY(-100%);
			width: 100%;
			pointer-events: none;
		}
	}

	.button {
		width: fit-content;
		padding: 0.4rem 1.2rem;
		font-size: 0.8rem;
		box-shadow: var(--box-shadow);
		text-align: center;
		color: var(--color-text-white);
		border-radius: 0.5rem 0.5rem 0 0;
		pointer-events: auto;
		margin-right: 0.3rem;
	}

	.containers {
		height: 0;
		.chat_main-container,
		.game_log_main-container {
			display: flex;
			height: 18rem;
			flex-direction: column;
			box-shadow: var(--box-shadow-dark);
			border-radius: 0 1rem 0 0;
			background-color: rgba($color: #ffffff, $alpha: 0.9);
			overflow: hidden;
			pointer-events: auto;

			.chat_content-container,
			.game_log_content-container {
				flex: 1;
				width: 100%;
				padding: 0.6rem;
				box-sizing: border-box;
				overflow-y: scroll;
				overflow-x: hidden;
				backdrop-filter: blur(0.13rem);
			}

			// .chat_content-container {
			// 	padding-bottom: 2.2rem;
			// }
		}
	}
	.chat_input-container {
		width: max-content;
		display: flex;
		justify-content: space-between;
		background-color: var(--color-second);
		padding: 0.5rem 0.4rem;
		border-radius: 0 0.5rem 0 0;
		box-shadow: var(--box-shadow);
		box-sizing: border-box;
		z-index: calc(var(--z-chat-log) + 1);

		& > input {
			flex: 1;
			width: 20rem;
			height: 1.8rem;
			line-height: 1.8rem;
			border-radius: 0.3rem;
			margin-right: 0.6rem;
			caret-color: var(--color-primary);
			font-size: unset;
			box-sizing: border-box;
		}

		& > input[type="submit"] {
			width: fit-content;
			word-break: keep-all;
			border-radius: 0.3rem;
			box-sizing: border-box;
			font-size: 1.2rem;
			padding: 0;
		}
	}
}
</style>
