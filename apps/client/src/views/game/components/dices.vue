<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useUtil } from "@src/store/index";
import { useGameData } from "@src/store/game";

const utilStore = useUtil();
const gameDataStore = useGameData();

// 状态获取
const canRoll = computed(() => utilStore.canRoll);
const playerData = computed(() => gameDataStore.myGameInfo);

const emit = defineEmits(["roll"]);

function handleRollDice() {
	if (canRoll.value) {
		emit("roll");
	}
}

// --- 轮播逻辑 ---
const loopIndex = ref(0);
let timer: any = null;

// 启动轮播定时器 (每 1.2 秒切换一次显示的索引)
onMounted(() => {
	timer = setInterval(() => {
		loopIndex.value = (loopIndex.value + 1) % 6; // 0-5 循环
	}, 1200);
});

onBeforeUnmount(() => {
	if (timer) clearInterval(timer);
});

// --- 视图模型逻辑 ---

// 计算每个骰子的显示状态
const displayDices = computed(() => {
	const dices = playerData.value?.dices || [];
	return dices.map((dice) => {
		let value: number | string = "?";
		let type: "normal" | "prophecy" | "placeholder" = "placeholder";
		let isLooping = false;

		// 优先级 1: 预言 (最高，直接定死显示)
		if (dice.prophecy && dice.prophecy) {
			value = dice.prophecy;
			type = "prophecy";
		}
		// 优先级 2: 真实值
		else if (dice.diceValues && dice.diceValues.length > 0) {
			type = "normal";

			// 如果只有一个值，直接显示
			if (dice.diceValues.length === 1) {
				value = dice.diceValues[0];
			}
			// 如果有多个值，开启轮播
			else {
				isLooping = true;
				// 确保索引不越界，最多轮播前6个
				const idx = loopIndex.value % Math.min(dice.diceValues.length, 6);
				value = dice.diceValues[idx];
			}
		}

		return {
			id: dice.id,
			value,
			type,
			isLooping, // 用于控制是否显示切换动画效果
		};
	});
});
</script>

<template>
	<div
		id="game_dice_canvas"
		class="dice-control-panel"
		:class="{ 'can-roll': canRoll, disabled: !canRoll }"
		@click="handleRollDice"
	>
		<!-- 遍历计算后的骰子列表 -->
		<div v-if="displayDices.length" class="dice-list">
			<div v-for="dice in displayDices" :key="dice.id" class="dice-item">
				<!-- 骰子面 -->
				<div class="dice-face" :class="`type-${dice.type}`">
					<!-- 内容容器：负责将内部元素整体居中 -->
					<div class="dice-content-wrapper">
						<!-- 数字展示区域 -->
						<transition name="fade-scale" mode="out-in">
							<span :key="dice.value" class="dice-number" :class="{ 'prophecy-text': dice.type === 'prophecy' }">
								{{ dice.value }}
							</span>
						</transition>

						<!-- 轮播指示器 -->
						<div v-if="dice.isLooping" class="loop-indicator">
							<div v-for="i in 3" :key="i" class="dot" :class="{ active: loopIndex % 3 === i - 1 }"></div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- 无数据兜底 -->
		<div v-else class="no-dice-text">无骰子</div>

		<!-- 底部状态提示文字 -->
		<div class="status-text">
			{{ canRoll ? "点击掷骰子" : "等待回合" }}
		</div>
	</div>
</template>

<style lang="scss" scoped>
.dice-control-panel {
	// 定位
	position: absolute;
	right: 1rem;
	bottom: 1rem;
	z-index: var(--z-ui);

	// 尺寸与布局
	min-width: 8rem;
	min-height: 8rem;
	padding: 0.8rem;
	border-radius: 1.5rem;

	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 0.6rem;

	// 视觉基础样式
	background: rgba(255, 255, 255, 0.65);
	backdrop-filter: blur(12px);
	-webkit-backdrop-filter: blur(12px);
	border: 4px solid rgba(255, 255, 255, 0.4);
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);

	// 交互
	cursor: pointer;
	transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
	user-select: none;
	color: #555;

	// --- 状态：可以掷骰子 ---
	&.can-roll {
		background: var(--color-second);
		border-color: rgba(255, 255, 255, 0.8);
		color: #fff;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);

		// 呼吸动画
		animation: breathing 2s infinite ease-in-out;

		&:hover {
			background: var(--color-third);
			transform: translateY(-4px) scale(1.02);
			box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
		}

		&:active {
			transform: translateY(0) scale(0.96);
		}
	}

	// --- 状态：不可用/等待中 ---
	&.disabled {
		opacity: 0.85;
		cursor: not-allowed;
		background: rgba(240, 240, 240, 0.7);

		&:hover {
			background: rgba(240, 240, 240, 0.8);
		}
	}
}

.dice-list {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 0.8rem;
}

.dice-item {
	display: flex;
	flex-direction: column;
	align-items: center;
}

// --- 骰子面样式 ---
.dice-face {
	width: 3.5rem;
	height: 3.5rem;
	background-color: #fff;
	border-radius: 0.8rem;
	border: 3px solid #e2e8f0; // 默认淡灰色
	box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.05);
	overflow: hidden;

	// Flex 居中布局
	display: flex;
	align-items: center;
	justify-content: center;

	// 预言状态
	&.type-prophecy {
		border-color: #9333ea; // 更加明显的深紫色
		background-color: #faf5ff; // 浅紫色背景
		box-shadow: 0 0 8px rgba(147, 51, 234, 0.3); // 微弱发光
	}

	// 占位状态
	&.type-placeholder {
		border-style: dashed;
		border-color: #cbd5e1;
	}
}

// 内容包裹器：确保数字和点作为一个整体居中
.dice-content-wrapper {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	position: relative;
}

// 数字样式
.dice-number {
	font-size: 1.6rem;
	font-weight: 800;
	color: #334155; // slate-700
	line-height: 1.1; // 稍微增加行高防止切边

	&.prophecy-text {
		color: #9333ea; // 预言文字紫色
		margin-bottom: 0.3rem;
	}
}

// 轮播指示器
.loop-indicator {
	display: flex;
	gap: 3px;
	margin-top: 2px; // 与数字的间距

	.dot {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background-color: #cbd5e1;
		transition: background-color 0.3s;

		&.active {
			background-color: var(--color-second);
		}
	}
}

.fade-scale-enter-active,
.fade-scale-leave-active {
	transition: all 0.25s ease;
}

.fade-scale-enter-from {
	opacity: 0;
	transform: scale(0.5) translateY(5px);
}

.fade-scale-leave-to {
	opacity: 0;
	transform: scale(0.5) translateY(-5px);
}

.status-text {
	font-size: 0.85rem;
	letter-spacing: 1px;
}

.no-dice-text {
	font-size: 0.8rem;
	opacity: 0.5;
}

@keyframes breathing {
	0% {
		box-shadow: 0 0 0 0 rgba(var(--color-second), 0.4);
	}
	70% {
		box-shadow: 0 0 0 10px rgba(var(--color-second), 0);
	}
	100% {
		box-shadow: 0 0 0 0 rgba(var(--color-second), 0);
	}
}
</style>
