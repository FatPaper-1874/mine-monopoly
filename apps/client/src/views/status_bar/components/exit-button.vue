<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { FPMessageBox } from "@src/components/utils/fp-message-box";
import { useMonopolyClient } from "@src/core/monopoly-client/MonopolyClient";
import { useRoomInfo, useChat, useGameLog } from "@src/store";
import { useGameData } from "@src/store/game";
import router from "@src/router";

const route = useRoute();

// 只在游戏中显示
const visible = computed(() => route.name === "game");

async function handleExitGame() {
	const isOwner = useRoomInfo().amIRoomOwner;
	const content = isOwner
		? "你是房主，退出后游戏将解散，所有玩家将被送回大厅。确定退出？"
		: "确定退出游戏？退出后将由 AI 托管继续游戏。";

	try {
		await FPMessageBox({
			title: "退出游戏",
			content,
			confirmText: "确定退出",
			cancelText: "取消",
			showCancel: true,
		});

		const socketClient = useMonopolyClient();
		if (socketClient) {
			socketClient.leaveRoom();
		}
		useGameData().$reset();
		useRoomInfo().$reset();
		useChat().$reset();
		useGameLog().$reset();
		router.replace({ name: "room-router" });
	} catch {
		// 用户取消
	}
}
</script>

<template>
	<button v-if="visible" @click="handleExitGame" class="exit-button btn-small" title="退出游戏">
		<FontAwesomeIcon icon="right-from-bracket" />
	</button>
</template>

<style lang="scss" scoped>
.exit-button {
	height: 2.5rem;
	width: 2.5rem;
	border-radius: 0.5rem;
	font-size: 1.1rem;
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 0.4rem;
	--btn-bg: #e74c3c; // 红色背景，box-shadow 自动适配
	background-color: var(--btn-bg);
	color: #ffffff;
	// box-shadow 已在 ui.scss 中基于 --btn-bg 自适应
}
</style>
