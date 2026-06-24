<script setup lang="ts">
import { computed } from "vue";
import { useVersionStore } from "@src/stores";
import { message } from "ant-design-vue";

const props = defineProps<{
	open: boolean;
}>();

const emit = defineEmits<{
	"update:open": [value: boolean];
}>();

const versionStore = useVersionStore();

const visible = computed({
	get: () => props.open,
	set: (v) => emit("update:open", v),
});

function formatTime(ts: number): string {
	const d = new Date(ts);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function messageType(msg: string): "auto" | "manual" | "tag" {
	if (msg.startsWith("tag:")) return "tag";
	if (msg.startsWith("auto:") || msg.startsWith("save: ")) return "auto";
	return "manual";
}

function getTagName(msg: string): string {
	if (msg.startsWith("tag: ")) return msg.slice(5);
	return "";
}

async function handleRestore(snapshotId: string) {
	try {
		await versionStore.restoreToSnapshot(snapshotId);
		visible.value = false;
	} catch (e: any) {
		message.error(`恢复失败: ${e.message}`);
	}
}
</script>

<template>
	<a-drawer
		v-model:open="visible"
		title="📜 版本历史"
		:width="400"
		placement="right"
	>
		<div class="version-panel">
			<!-- 统计 -->
			<div class="panel-header">
				<span class="snapshot-count">
					{{ versionStore.snapshotCount }} 个快照
				</span>
				<span class="dir-path" :title="versionStore.mapDir">
					{{ versionStore.mapDir }}
				</span>
			</div>

			<!-- 快照列表 -->
			<div class="snapshot-list" v-if="versionStore.snapshotList.length > 0">
				<div
					v-for="snap in versionStore.snapshotList"
					:key="snap.id"
					class="snapshot-item"
					:class="{
						selected: versionStore.selectedSnapshotId === snap.id,
						'tagged': !!snap.tag,
					}"
					@click="versionStore.selectSnapshot(snap.id)"
				>
					<div class="snapshot-time">
						<span class="time">{{ formatTime(snap.timestamp) }}</span>
						<span v-if="snap.tag" class="tag-badge">🏷 {{ snap.tag }}</span>
						<span v-else-if="messageType(snap.message) === 'auto'" class="type-badge auto">自动</span>
					</div>
					<div class="snapshot-message">{{ snap.message }}</div>
					<div class="snapshot-actions" v-if="versionStore.selectedSnapshotId === snap.id">
						<a-button size="small" type="primary" @click.stop="handleRestore(snap.id)">
							恢复到此版本
						</a-button>
					</div>
				</div>
			</div>

			<!-- 空状态 -->
			<div v-else class="empty-state">
				<p>暂无快照记录</p>
				<p class="hint">按 Ctrl+S 保存时自动创建快照</p>
			</div>
		</div>
	</a-drawer>
</template>

<style lang="scss" scoped>
.version-panel {
	display: flex;
	flex-direction: column;
	height: 100%;
}

.panel-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 0 0 12px 0;
	border-bottom: 1px solid #f0f0f0;
	margin-bottom: 8px;

	.snapshot-count {
		font-weight: 600;
		color: #333;
	}

	.dir-path {
		font-size: 0.75em;
		color: #aaa;
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
}

.snapshot-list {
	flex: 1;
	overflow-y: auto;
}

.snapshot-item {
	padding: 10px 12px;
	border-radius: 6px;
	cursor: pointer;
	border: 1px solid transparent;
	margin-bottom: 4px;
	transition: all 0.15s;

	&:hover {
		background: #f5f5f5;
	}

	&.selected {
		background: #e6f4ff;
		border-color: #91caff;
	}

	&.tagged {
		border-left: 3px solid #52c41a;
	}
}

.snapshot-time {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 4px;

	.time {
		font-size: 0.85em;
		color: #666;
	}

	.tag-badge {
		font-size: 0.75em;
		color: #389e0d;
		background: #f6ffed;
		padding: 1px 6px;
		border-radius: 3px;
	}

	.type-badge {
		font-size: 0.7em;
		padding: 1px 6px;
		border-radius: 3px;

		&.auto {
			color: #999;
			background: #fafafa;
		}
	}
}

.snapshot-message {
	font-size: 0.85em;
	color: #333;
	word-break: break-all;
}

.snapshot-actions {
	display: flex;
	gap: 8px;
	margin-top: 8px;
	padding-top: 8px;
	border-top: 1px solid #f0f0f0;
}

.empty-state {
	text-align: center;
	padding: 40px 0;
	color: #999;

	.hint {
		font-size: 0.85em;
		margin-top: 8px;
	}
}
</style>
