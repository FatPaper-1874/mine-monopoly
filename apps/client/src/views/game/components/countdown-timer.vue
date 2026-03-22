<script setup lang="ts">
import { useRoomInfo, useUtil } from "@src/store/index";
import { computed } from "vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

const roomInfoStore = useRoomInfo();
const utilStore = useUtil();

// ==================== 计算属性 ====================

/** 当前事件名称 */
const currentEventName = computed(() => utilStore.currentEventName);

/** 倒计时信息 */
const waitingFor = computed(() => utilStore.waitingFor);

/** 总时间（秒），默认 20 秒 */
const totalTime = computed(() => waitingFor.value.totalTime || 20);

/** 倒计时进度百分比（0-100） */
const progressPercent = computed(() => {
	const ratio = Math.max(0, waitingFor.value.remainingTime / totalTime.value);
	return `${ratio * 100}%`;
});

/** 是否显示倒计时（由服务端控制） */
const showCountdown = computed(() => utilStore.showCountdown);
</script>

<template>
	<div class="countdown-timer">
		<div class="block" :style="{ width: progressPercent }"></div>
		<div class="text">
			<FontAwesomeIcon :icon="showCountdown ? 'clock' : 'clock-rotate-left'" />
			<span v-if="showCountdown">{{ currentEventName }}: {{ waitingFor.remainingTime }} 秒</span>
			<span v-else>{{ currentEventName }}</span>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.countdown-timer {
	width: max-content;
	display: flex;
	justify-content: space-around;
	align-items: center;
	font-size: 1.4rem;
	background-color: var(--color-third);
	padding: 1.2rem;
	border-radius: 1rem;
	border: 0.4rem solid rgba(255, 255, 255, 0.5);
	box-sizing: border-box;
	box-shadow: var(--box-shadow);
	overflow: hidden;
	transition: width 0.3s ease-in-out;
	position: absolute;
	top: 15%;
	left: 50%;
	transform: translate(-50%, -50%);
	z-index: var(--z-countdown-timer);

	& > .block {
		position: absolute;
		left: 0;
		top: 0;
		height: 100%;
		z-index: 1;
		background-color: var(--color-second);
		transition: width 0.3s ease-in-out;
	}

	& > .text {
		color: var(--color-text-white);
		white-space: nowrap;
		z-index: 2;

		& > * {
			margin: 0 0.4rem;
		}
	}
}
</style>
