<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import type { CoturnMetrics } from "@/interfaces/interfaces";
import { getCoturnMetrics } from "@/utils/api/coturn";

const metrics = ref<CoturnMetrics | null>(null);
const loading = ref(false);
const error = ref("");
const lastUpdate = ref<Date | null>(null);
let timer: ReturnType<typeof setInterval> | undefined;

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const units = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

const totalTraffic = computed(() => {
	if (!metrics.value) return "0 B";
	return formatBytes(
		metrics.value.traffic.receivedBytes +
			metrics.value.traffic.sentBytes +
			metrics.value.traffic.peerReceivedBytes +
			metrics.value.traffic.peerSentBytes,
	);
});

const packetRate = computed(() => {
	if (!metrics.value || metrics.value.packets.processed === 0) return "-";
	const dropped = metrics.value.packets.dropped;
	const processed = metrics.value.packets.processed;
	const rate = ((dropped / processed) * 100).toFixed(2);
	return `${rate}%`;
});

const allocationTypes = computed(() => {
	if (!metrics.value) return [];
	const a = metrics.value.allocations;
	return [
		{ type: "UDP", value: a.udp, color: "#52c41a" },
		{ type: "TCP", value: a.tcp, color: "#1890ff" },
		{ type: "TLS", value: a.tls, color: "#722ed1" },
		{ type: "DTLS", value: a.dtls, color: "#fa8c16" },
	];
});

async function fetchMetrics() {
	loading.value = true;
	error.value = "";
	try {
		const res = await getCoturnMetrics();
		if (res.status === 200) {
			metrics.value = res.data as CoturnMetrics;
			lastUpdate.value = new Date();
		} else {
			error.value = res.msg || "获取数据失败";
		}
	} catch (e: any) {
		error.value = e.message || "请求失败";
	} finally {
		loading.value = false;
	}
}

onMounted(() => {
	fetchMetrics();
	timer = setInterval(fetchMetrics, 5000);
});

onBeforeUnmount(() => {
	clearInterval(timer);
});
</script>

<template>
	<div class="turn-monitor">
		<div class="top-bar">
			<h4>TURN 监控</h4>
			<span v-if="lastUpdate" class="update-time">
				上次更新: {{ lastUpdate.toLocaleTimeString() }}
			</span>
		</div>

		<div v-if="error" class="error-tip">{{ error }}</div>

		<div v-if="!metrics && !error && loading" class="loading">加载中...</div>

		<div v-if="metrics" class="monitor-content">
			<div class="stats-cards">
				<div class="stat-card">
					<div class="stat-label">活跃分配</div>
					<div class="stat-value">{{ metrics.allocations.total }}</div>
				</div>
				<div class="stat-card">
					<div class="stat-label">累计流量</div>
					<div class="stat-value">{{ totalTraffic }}</div>
				</div>
				<div class="stat-card">
					<div class="stat-label">丢包率</div>
					<div class="stat-value">{{ packetRate }}</div>
				</div>
			</div>

			<div class="detail-section">
				<h5>分配类型</h5>
				<div class="allocation-types">
					<div v-for="item in allocationTypes" :key="item.type" class="type-item">
						<span class="type-dot" :style="{ backgroundColor: item.color }"></span>
						<span class="type-name">{{ item.type }}</span>
						<span class="type-value">{{ item.value }}</span>
					</div>
				</div>
			</div>

			<div class="detail-section">
				<h5>流量明细</h5>
				<div class="traffic-grid">
					<div class="traffic-item">
						<span class="traffic-label">接收</span>
						<span class="traffic-value">{{ formatBytes(metrics.traffic.receivedBytes) }}</span>
					</div>
					<div class="traffic-item">
						<span class="traffic-label">发送</span>
						<span class="traffic-value">{{ formatBytes(metrics.traffic.sentBytes) }}</span>
					</div>
					<div class="traffic-item">
						<span class="traffic-label">Peer 接收</span>
						<span class="traffic-value">{{ formatBytes(metrics.traffic.peerReceivedBytes) }}</span>
					</div>
					<div class="traffic-item">
						<span class="traffic-label">Peer 发送</span>
						<span class="traffic-value">{{ formatBytes(metrics.traffic.peerSentBytes) }}</span>
					</div>
				</div>
			</div>

			<div class="detail-section">
				<h5>STUN 统计</h5>
				<div class="stun-grid">
					<div class="stun-item">
						<span class="stun-label">绑定请求</span>
						<span class="stun-value">{{ metrics.stun.bindingRequests }}</span>
					</div>
					<div class="stun-item">
						<span class="stun-label">绑定响应</span>
						<span class="stun-value">{{ metrics.stun.bindingResponses }}</span>
					</div>
					<div class="stun-item">
						<span class="stun-label">绑定错误</span>
						<span class="stun-value error-text">{{ metrics.stun.bindingErrors }}</span>
					</div>
				</div>
			</div>

			<div class="detail-section">
				<h5>包处理</h5>
				<div class="packet-grid">
					<div class="packet-item">
						<span class="packet-label">已处理</span>
						<span class="packet-value">{{ metrics.packets.processed }}</span>
					</div>
					<div class="packet-item">
						<span class="packet-label">已丢弃</span>
						<span class="packet-value error-text">{{ metrics.packets.dropped }}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.turn-monitor {
	padding: 10px;
	display: flex;
	flex-direction: column;
	gap: 12px;

	.top-bar {
		width: 100%;
		height: 52px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		background-color: #fff;
		padding: 10px 20px;
		border-radius: 5px;

		.update-time {
			color: #999;
			font-size: 13px;
		}
	}

	.error-tip {
		padding: 10px 20px;
		background-color: var(--color-bg-error);
		color: #f56c6c;
		border-radius: 5px;
	}

	.loading {
		padding: 20px;
		text-align: center;
		color: #999;
	}

	.monitor-content {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.stats-cards {
		display: flex;
		gap: 12px;

		.stat-card {
			flex: 1;
			background: #fff;
			padding: 20px;
			border-radius: 5px;
			text-align: center;

			.stat-label {
				color: #999;
				font-size: 13px;
				margin-bottom: 8px;
			}

			.stat-value {
				font-size: 28px;
				font-weight: bold;
				color: var(--color-primary);
			}
		}
	}

	.detail-section {
		background: #fff;
		padding: 16px 20px;
		border-radius: 5px;

		h5 {
			margin-bottom: 12px;
			color: #333;
			font-size: 14px;
		}
	}

	.allocation-types {
		display: flex;
		gap: 20px;

		.type-item {
			display: flex;
			align-items: center;
			gap: 8px;

			.type-dot {
				width: 10px;
				height: 10px;
				border-radius: 50%;
			}

			.type-name {
				color: #666;
				font-size: 13px;
			}

			.type-value {
				font-weight: bold;
				color: #333;
			}
		}
	}

	.traffic-grid,
	.stun-grid,
	.packet-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 12px;
	}

	.packet-grid {
		grid-template-columns: repeat(2, 1fr);
	}

	.traffic-item,
	.stun-item,
	.packet-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 12px;
		background: var(--color-bg-light);
		border-radius: 4px;

		.traffic-label,
		.stun-label,
		.packet-label {
			color: #666;
			font-size: 13px;
		}

		.traffic-value,
		.stun-value,
		.packet-value {
			font-weight: bold;
			color: #333;
		}

		.error-text {
			color: #f56c6c;
		}
	}
}
</style>
