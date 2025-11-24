<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, shallowRef, watch } from "vue";

// --- 类型定义 (省略，与之前保持一致) ---
type GridCell = {
	content: string | object;
	scale: number;
	opacity: number;
};

interface Props {
	icons: (string | object)[];
	angle?: number;
	speed?: number;
	backgroundColor?: string;
	color?: string;
	iconSize?: number;
	gap?: number;
	scaleRange?: [number, number];
	opacityRange?: [number, number];
}

const props = withDefaults(defineProps<Props>(), {
	angle: 45,
	speed: 50,
	backgroundColor: "#f5f7fa",
	color: "currentColor",
	iconSize: 50,
	gap: 48,
	scaleRange: () => [0.8, 1.2],
	opacityRange: () => [0.2, 0.5],
});

const containerRef = ref<HTMLElement | null>(null);
const gridLayout = shallowRef<GridCell[][]>([]);
const rows = ref(0);
const cols = ref(0);

// --- 核心逻辑：动态计算网格覆盖面积 (保持不变，确保覆盖整个视口) ---
const calculateGridDimensions = () => {
	const unitSize = props.iconSize + props.gap;
	const vmax = typeof window !== "undefined" ? Math.max(window.innerWidth, window.innerHeight) : 1080;
	// 使用 2.5倍 vmax 保证覆盖旋转后的巨大容器
	const coverage = vmax * 2.5;

	const calculatedCount = Math.ceil(coverage / unitSize);

	rows.value = Math.max(calculatedCount, 2);
	cols.value = Math.max(calculatedCount, 2);
};

// --- 生成网格数据 (保持不变) ---
const generateGrid = () => {
	if (!props.icons.length || rows.value === 0) return;

	const newLayout: GridCell[][] = [];
	for (let r = 0; r < rows.value; r++) {
		const rowData: GridCell[] = [];
		for (let c = 0; c < cols.value; c++) {
			const iconContent = props.icons[Math.floor(Math.random() * props.icons.length)];
			rowData.push({
				content: iconContent,
				scale: props.scaleRange[0] + Math.random() * (props.scaleRange[1] - props.scaleRange[0]),
				opacity: props.opacityRange[0] + Math.random() * (props.opacityRange[1] - props.opacityRange[0]),
			});
		}
		newLayout.push(rowData);
	}
	gridLayout.value = newLayout;
};

// --- 样式计算：新增 --pattern-width CSS 变量 ---
const rotatorStyle = computed(() => ({
	transform: `translate(-50%, -50%) rotate(${props.angle}deg)`,
	width: "200vmax",
	height: "200vmax",
}));

const scrollerStyle = computed(() => {
	const unitSize = props.iconSize + props.gap;
	const patternWidth = cols.value * unitSize;
	const duration = props.speed > 0 ? patternWidth / props.speed : 0;

	return {
		// 动画移动的距离
		"--move-distance": `${patternWidth}px`,
		// 传递给 grid-pattern 的实际宽度
		"--pattern-width": `${patternWidth}px`,
		"--anim-duration": `${duration}s`,
		"--cols": `${cols.value}`,
	};
});

// 辅助函数 (保持不变)
const isComponent = (item: any) => typeof item === "object" || typeof item === "function";

// --- 生命周期与监听 (包含 ResizeObserver) ---
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
	calculateGridDimensions();
	generateGrid();

	if (typeof window !== "undefined" && containerRef.value) {
		resizeObserver = new ResizeObserver(() => {
			calculateGridDimensions();
			generateGrid();
		});
		resizeObserver.observe(document.body);
	}
});

onBeforeUnmount(() => {
	if (resizeObserver) resizeObserver.disconnect();
});

watch([() => props.iconSize, () => props.gap, () => props.icons], () => {
	calculateGridDimensions();
	generateGrid();
});
</script>

<template>
	<div class="dynamic-bg-container" :style="{ backgroundColor: backgroundColor }" ref="containerRef">
		<div class="bg-rotator" :style="rotatorStyle">
			<div class="bg-scroller" :style="scrollerStyle">
				<div class="grid-pattern" v-for="n in 3" :key="`pattern-${n}`" :style="{ width: 'var(--pattern-width)' }">
					<div
						class="grid-row"
						v-for="(rowItem, rIndex) in gridLayout"
						:key="`row-${rIndex}`"
						:style="{ marginBottom: `${gap}px` }"
					>
						<div
							class="grid-cell"
							v-for="(cellItem, cIndex) in rowItem"
							:key="`cell-${rIndex}-${cIndex}`"
							:style="{
								width: `${iconSize}px`,
								height: `${iconSize}px`,
								marginRight: `${gap}px`,
								fontSize: `${iconSize}px`,
							}"
						>
							<div
								class="icon-inner"
								:style="{
									transform: `rotate(${-props.angle}deg) scale(${cellItem.scale})`,
									opacity: cellItem.opacity,
									color: color,
								}"
							>
								<component v-if="isComponent(cellItem.content)" :is="cellItem.content" class="svg-content" />
								<div v-else v-html="cellItem.content" class="svg-content"></div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
/* 容器 */
.dynamic-bg-container {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	overflow: hidden;
	z-index: 0;
	pointer-events: none;
}

.bg-rotator {
	position: absolute;
	top: 50%;
	left: 50%;
	display: flex;
	justify-content: center;
	align-items: center;
}

/* 滚动器：执行动画 */
.bg-scroller {
	display: flex;
	flex-direction: row;
	animation: scroll-linear var(--anim-duration) linear infinite;
	will-change: transform;
}

/* FIX 关键点：
  这里强制设定宽度为 JS 计算出的精确值，
  防止 Flexbox 布局计算导致的一像素偏差。
*/
.grid-pattern {
	display: flex;
	flex-direction: column;
	flex-shrink: 0;
	/* width: var(--pattern-width) 由模板中的内联 style 绑定 */
}

.grid-row {
	display: flex;
	flex-direction: row;
	flex-shrink: 0;
}

.grid-cell {
	display: flex;
	justify-content: center;
	align-items: center;
	flex-shrink: 0;
	box-sizing: border-box;
}

.icon-inner {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 100%;
	height: 100%;
	transform-origin: center center;
}

.svg-content {
	width: 100%;
	height: 100%;
	fill: currentColor;
	display: block;
}

/* 动画定义：平移距离精确等于 Pattern 宽度 */
@keyframes scroll-linear {
	0% {
		transform: translateX(0);
	}
	100% {
		transform: translateX(calc(var(--move-distance) * -1));
	}
}
</style>
