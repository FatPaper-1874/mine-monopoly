<script setup lang="ts">
import type { GameMapInDb } from "@mine-monopoly/types";
import { formatCreator, formatSubmitTime } from "@/utils";

const props = defineProps<{ open: boolean; mapInfo?: GameMapInDb }>();
const emit = defineEmits(["update:open"]);

/** 待审核版本的产物/源文件 */
function pendingFiles(map: GameMapInDb) {
	return [
		...(map.pendingUrl ? [{ label: ".mmmap", url: map.pendingUrl }] : []),
		...(map.pendingSourceUrl ? [{ label: ".fpmap", url: map.pendingSourceUrl }] : []),
	];
}

function close() {
	emit("update:open", false);
}
</script>

<template>
	<a-modal
		:open="props.open"
		:title="props.mapInfo ? `待审详情 · ${props.mapInfo.name}` : '待审详情'"
		:footer="null"
		:width="'min(720px, 96vw)'"
		destroy-on-close
		@cancel="close"
	>
		<div v-if="props.mapInfo" class="review-detail">
			<img class="cover" :src="props.mapInfo.coverUrl" alt="" />

			<div class="field">
				<span class="label">地图名称</span>
				<span class="value">{{ props.mapInfo.name }}</span>
			</div>
			<div class="field">
				<span class="label">创作者</span>
				<span class="value" :class="{ muted: !props.mapInfo.creatorName }">
					{{ formatCreator(props.mapInfo.creatorName, props.mapInfo.creatorAccount) }}
				</span>
			</div>
			<div class="field">
				<span class="label">版本</span>
				<span class="value">已发布 v{{ props.mapInfo.version }} → 待审 {{ props.mapInfo.pendingVersion || "未标注" }}</span>
			</div>
			<div class="field">
				<span class="label">当前状态</span>
				<span class="value">
					<a-tag :color="props.mapInfo.inuse ? 'success' : 'default'">{{ props.mapInfo.inuse ? "已启用" : "已禁用" }}</a-tag>
					<span class="hint">通过审核后将自动启用</span>
				</span>
			</div>
			<div class="field">
				<span class="label">提交时间</span>
				<span class="value">{{ formatSubmitTime(props.mapInfo.reviewSubmittedAt) }}</span>
			</div>
			<div class="field">
				<span class="label">待审文件</span>
				<span class="value">
					<a-space v-if="pendingFiles(props.mapInfo).length > 0" wrap>
						<a v-for="file in pendingFiles(props.mapInfo)" :key="file.label" :href="file.url" target="_blank" rel="noopener">
							{{ file.label }}
						</a>
					</a-space>
					<span v-else class="muted">无</span>
				</span>
			</div>
			<div class="field column">
				<span class="label">地图描述</span>
				<div class="long-text">{{ props.mapInfo.description || "（无）" }}</div>
			</div>
			<div class="field column">
				<span class="label">本次更新日志</span>
				<div class="long-text">{{ props.mapInfo.pendingChangelog || "（无）" }}</div>
			</div>
		</div>
	</a-modal>
</template>

<style lang="scss" scoped>
.review-detail {
	display: flex;
	flex-direction: column;
	gap: 10px;
	max-height: 70vh;
	overflow-y: auto;
	padding-right: 4px;
}

.cover {
	width: 100%;
	max-height: 240px;
	aspect-ratio: 16 / 9;
	object-fit: contain;
	background-color: #fafafa;
	border-radius: 4px;
}

.field {
	display: flex;
	gap: 10px;
	font-size: 13px;

	&.column {
		flex-direction: column;
		gap: 4px;
	}

	.label {
		width: 74px;
		flex-shrink: 0;
		color: #888;
	}

	.value {
		color: #333;
		min-width: 0;
		word-break: break-all;
	}
}

.long-text {
	white-space: pre-wrap;
	word-break: break-word;
	color: #333;
	background-color: #fafafa;
	border-radius: 4px;
	padding: 6px 8px;
	font-size: 13px;
}

.muted {
	color: #bbb;
}

.hint {
	margin-left: 6px;
	font-size: 12px;
	color: #999;
}

@media (max-width: 768px) {
	.cover {
		max-height: 160px;
	}
}
</style>
