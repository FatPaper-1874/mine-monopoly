<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, nextTick } from "vue";
import StatCard from "./stat-card.vue";
import { getGameStatistics, type GameStatistics } from "@/utils/api/statistics";

const stats = ref<GameStatistics | null>(null);
const chartLoading = ref(true);
let chartInstance: any = null;
let ChartClass: any = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
const chartContainerId = "game-trend-chart";

function formatDuration(ms: number): string {
	const minutes = Math.round(ms / 60000);
	return `${minutes}`;
}

async function loadChartLib() {
	if (!ChartClass) {
		const g2 = await import("@antv/g2");
		ChartClass = g2.Chart;
	}
}

async function refresh() {
	try {
		const [data] = await Promise.all([getGameStatistics(), loadChartLib()]);
		stats.value = data;
		await nextTick();
		await renderChart();
	} catch {
		// 静默处理
	}
	refreshTimer = setTimeout(refresh, 30000);
}

async function renderChart() {
	if (!stats.value?.trend || !ChartClass) return;

	const container = document.getElementById(chartContainerId);
	if (!container) return;

	if (chartInstance) {
		chartInstance.changeData(stats.value.trend);
		return;
	}

	chartInstance = new ChartClass({
		container,
		autoFit: true,
		height: 200,
		padding: [20, 30, 30, 50],
		animate: false,
	});

	chartInstance
		.line()
		.data(stats.value.trend)
		.encode("x", "date")
		.encode("y", "count")
		.style("stroke", "#52c41a")
		.style("lineWidth", 2);

	chartInstance
		.point()
		.data(stats.value.trend)
		.encode("x", "date")
		.encode("y", "count")
		.style("fill", "#52c41a")
		.style("r", 3);

	chartInstance.axis("x", {
		title: false,
		labelFormatter: (d: string) => {
			const parts = d.split("-");
			return `${Number(parts[1])}/${Number(parts[2])}`;
		},
	});
	chartInstance.axis("y", { title: false });

	await chartInstance.render();
	chartLoading.value = false;
}

onMounted(() => {
	refresh();
});

onBeforeUnmount(() => {
	if (refreshTimer) clearTimeout(refreshTimer);
	if (chartInstance) chartInstance.destroy();
});
</script>

<template>
	<div class="game-stats">
		<a-row :gutter="[12, 12]" v-if="stats">
			<a-col :xs="8" :sm="8">
				<StatCard title="总对局" :value="stats.totalGames" icon="fa-solid fa-gamepad" />
			</a-col>
			<a-col :xs="8" :sm="8">
				<StatCard title="今日对局" :value="stats.todayGames" icon="fa-solid fa-calendar-day" />
			</a-col>
			<a-col :xs="8" :sm="8">
				<StatCard title="平均时长" :value="formatDuration(stats.avgDuration)" icon="fa-solid fa-clock" suffix="min" />
			</a-col>
		</a-row>
		<a-row :gutter="[12, 12]" class="chart-section" v-if="stats">
			<a-col :xs="24" :sm="8">
				<a-card :bordered="false" class="chart-card">
					<h4>7天对局趋势</h4>
					<div :id="chartContainerId" class="chart-container"></div>
					<div v-if="chartLoading" class="chart-loading">
						<a-spin size="small" />
					</div>
				</a-card>
			</a-col>
			<a-col :xs="24" :sm="8">
				<a-card :bordered="false" class="top-maps-card">
					<h4>热门地图 Top 5</h4>
					<div class="top-maps-list" v-if="stats.topMaps.length > 0">
						<div class="top-map-item" v-for="(map, index) in stats.topMaps" :key="map.mapId">
							<span class="rank">{{ index + 1 }}</span>
							<span class="map-name">{{ map.mapName }}</span>
							<span class="map-count">{{ map.count }}局</span>
						</div>
					</div>
					<a-empty v-else description="暂无数据" />
				</a-card>
			</a-col>
			<a-col :xs="24" :sm="8">
				<a-card :bordered="false" class="top-maps-card">
					<h4>热门房间ID Top 5</h4>
					<div class="top-maps-list" v-if="stats.topRoomIds.length > 0">
						<div class="top-map-item" v-for="(room, index) in stats.topRoomIds" :key="room.roomId">
							<span class="rank">{{ index + 1 }}</span>
							<span class="map-name">{{ room.roomId }}</span>
							<span class="map-count">{{ room.count }}局</span>
						</div>
					</div>
					<a-empty v-else description="暂无数据" />
				</a-card>
			</a-col>
		</a-row>
	</div>
</template>

<style lang="scss" scoped>
.game-stats {
	margin-bottom: 16px;
}

.chart-section {
	margin-top: 12px;
}

.chart-card,
.top-maps-card {
	position: relative;
	height: 100%;

	h4 {
		margin: 0 0 8px;
		font-size: 14px;
		color: #666;
	}
}

.chart-container {
	width: 100%;
	min-height: 200px;
}

.top-maps-card {
	display: flex;
	flex-direction: column;

	:deep(.ant-card-body) {
		flex: 1;
		display: flex;
		flex-direction: column;
	}
}

.chart-loading {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
}

.top-maps-list {
	.top-map-item {
		display: flex;
		align-items: center;
		padding: 8px 0;
		border-bottom: 1px solid #f0f0f0;

		&:last-child {
			border-bottom: none;
		}

		.rank {
			width: 24px;
			height: 24px;
			border-radius: 50%;
			background: #1890ff;
			color: #fff;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 12px;
			margin-right: 10px;
			flex-shrink: 0;
		}

		&:nth-child(1) .rank { background: #f5222d; }
		&:nth-child(2) .rank { background: #fa8c16; }
		&:nth-child(3) .rank { background: #faad14; }

		.map-name {
			flex: 1;
			font-size: 14px;
		}

		.map-count {
			color: #999;
			font-size: 13px;
		}
	}
}
</style>
