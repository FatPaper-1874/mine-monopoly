<script setup lang="ts">
import { useChat } from "@src/store";
import { ChatMessage } from "@src/interfaces/bace";
import DanmakuItem from "@src/views/danmaku/components/danmaku_item.vue";
import { reactive, ref, watch } from "vue";

const chatStore = useChat();

const messageQueue = reactive<ChatMessage[]>([]);

watch(
	() => chatStore.newMessage,
	(newMessage) => {
		newMessage && messageQueue.push(newMessage);
	}
);

function handleEnter(el: Element, done: () => void) {
	const id = el.getAttribute("data-message_id");
	messageQueue.splice(
		messageQueue.findIndex((m) => m.id === id),
		1
	);
}

function randomHeight() {
	return Math.random() * 60 + "%";
}
</script>

<template>
	<div class="danmaku_container">
		<TransitionGroup @enter="handleEnter" name="danmaku">
			<DanmakuItem
				:style="{ top: randomHeight() }"
				:data-message_id="message.id"
				class="danmaku_item"
				v-for="message in messageQueue"
				:key="message.id"
				:message="message"
			/>
		</TransitionGroup>
	</div>
</template>

<style scoped lang="scss">
.danmaku_container {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	z-index: 10001;
	pointer-events: none;
}

.danmaku-enter-active,
.danmaku-leave-active {
	transition: all 6s linear;
}

.danmaku-enter-from {
	transform: translateX(100vw);
}
</style>
