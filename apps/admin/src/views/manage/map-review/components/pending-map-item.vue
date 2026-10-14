<script setup lang="ts">
import type { GameMapInDb } from "@mine-monopoly/types";
import { formatCreator, formatSubmitTime } from "@/utils";

const props = defineProps<{ mapInfo: GameMapInDb; busy: boolean }>();
const emit = defineEmits(["view", "approve", "reject"]);
</script>

<template>
	<div class="pending-map-item">
		<img class="cover" :src="props.mapInfo.coverUrl" alt="" />
		<div class="info">
			<div class="name" :title="props.mapInfo.name">{{ props.mapInfo.name }}</div>
			<div class="creator" :class="{ muted: !props.mapInfo.creatorName }">
				{{ formatCreator(props.mapInfo.creatorName, props.mapInfo.creatorAccount) }}
			</div>
			<div class="meta">
				<a-tag color="gold">待审查</a-tag>
				<span class="version">v{{ props.mapInfo.version }} → {{ props.mapInfo.pendingVersion || "未标注" }}</span>
				<span class="submit-time">{{ formatSubmitTime(props.mapInfo.reviewSubmittedAt) }}</span>
			</div>
		</div>

		<!-- 每行自带的操作按钮组 -->
		<div class="actions">
			<a-button size="small" @click="emit('view', props.mapInfo)">查看</a-button>
			<a-popconfirm
				title="确认通过该地图？通过后将立即发布并启用该地图"
				ok-text="确认通过"
				cancel-text="取消"
				:disabled="!props.mapInfo.pendingUrl"
				@confirm="emit('approve', props.mapInfo)"
			>
				<a-button size="small" type="primary" :disabled="!props.mapInfo.pendingUrl" :loading="props.busy">通过</a-button>
			</a-popconfirm>
			<a-button size="small" danger :loading="props.busy" @click="emit('reject', props.mapInfo)">驳回</a-button>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.pending-map-item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 10px;
	background-color: #fff;
	border: 1px solid #f0f0f0;
	border-radius: 6px;
	transition: border-color 0.2s, box-shadow 0.2s;

	&:hover {
		border-color: #91caff;
		box-shadow: #91caff33 0 0 0 2px;
	}
}

.cover {
	width: 110px;
	aspect-ratio: 16 / 9;
	object-fit: contain;
	background-color: #fafafa;
	border-radius: 4px;
	flex-shrink: 0;
}

.info {
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
	flex: 1;
}

.name {
	font-weight: bold;
	color: #333;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.creator {
	font-size: 12px;
	color: #666;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.meta {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;

	.version {
		font-size: 12px;
		color: #666;
		font-variant-numeric: tabular-nums;
	}

	.submit-time {
		font-size: 12px;
		color: #999;
		font-variant-numeric: tabular-nums;
	}
}

.actions {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-shrink: 0;
}

.muted {
	color: #bbb;
}

@media (max-width: 768px) {
	.pending-map-item {
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 8px;
		padding: 8px;
	}

	.cover {
		width: 88px;
	}

	/* 窄屏时按钮组换到下一行右对齐 */
	.actions {
		width: 100%;
		justify-content: flex-end;
	}
}
</style>
