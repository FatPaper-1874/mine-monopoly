<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { message } from "ant-design-vue";
import type { GameMapInDb } from "@mine-monopoly/types";
import { getNotifySetting, getPendingGameMapList, reviewGameMap } from "@/utils/api/game-map";
import PendingMapItem from "./components/pending-map-item.vue";
import ReviewDetailModal from "./components/review-detail-modal.vue";
import NotifySettingModal from "./components/notify-setting-modal.vue";

/** 待审队列自动刷新间隔 */
const AUTO_REFRESH_INTERVAL_MS = 30 * 1000;

const gameMapList = ref<GameMapInDb[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);
const loading = ref(false);
const autoRefresh = ref(true);
/** 正在提交审核操作的行（用于按钮 loading 与自动刷新互斥） */
const busyId = ref<string | undefined>(undefined);
/**
 * 队列快照游标：进入本页时固定一次，之后翻页/自动刷新都带上。
 * 否则新提交的地图会把整个列表挤动一位，第 1 页的末尾条目会「流」到第 2 页首条（跨页重复）。
 * 回到第 1 页或点「刷新」会重新取快照，保证能看到最新提交。
 */
const queueCursor = ref<string | undefined>(undefined);

// 详情弹窗与驳回弹窗共用同一个「当前地图」（两者不会同时打开：决定按钮在列表行上）
const currentMap = ref<GameMapInDb | undefined>(undefined);
const detailVisible = ref(false);
const rejectVisible = ref(false);
const rejectReason = ref("");
const rejectSubmitting = ref(false);

// 通知设置
const notifyVisible = ref(false);
/** null 表示还未取到状态（不展示提示） */
const notifyConfigured = ref<boolean | null>(null);

async function loadNotifyState() {
	try {
		const data = await getNotifySetting();
		notifyConfigured.value = Boolean(data.config.webhook || data.config.feishu);
	} catch {
		notifyConfigured.value = null;
	}
}

let refreshTimer: ReturnType<typeof setInterval> | null = null;
/** 请求在途时被触发的刷新（如审核完成、切换分页）在此标记，当前请求结束后补跑一轮 */
let refreshQueued = false;

/** 当前页最新的入队时间，作为翻页快照（与后端「reviewSubmittedAt DESC」排序一致） */
const snapshotOf = (list: GameMapInDb[]) => list[0]?.reviewSubmittedAt?.toString();

/**
 * 拉取当前页。
 *
 * 游标（`reset`）语义：带上游标时列表被固定在某个队列快照上，翻页/自动刷新都不会因新提交而错位；
 * 仅在「首次进入」「回到第 1 页」「点刷新」时重置，保证这些时刻看到的是最新队列。
 */
async function loadPage(reset = false, page = currentPage.value) {
	if (loading.value) {
		refreshQueued = true;
		return;
	}
	loading.value = true;
	try {
		do {
			refreshQueued = false;
			if (reset) queueCursor.value = undefined;
			currentPage.value = page;

			let data = await getPendingGameMapList(currentPage.value, pageSize.value, queueCursor.value);

			// 带游标过滤时结果为空（期间被审核完）或审核后整页清空：丢掉游标再看一次最新队列
			if (data.gameMapList.length === 0 && queueCursor.value) {
				queueCursor.value = undefined;
				data = await getPendingGameMapList(currentPage.value, pageSize.value);
			}
			// 仍然为空且不在首页：回退一页，避免停在空页
			if (data.gameMapList.length === 0 && currentPage.value > 1) {
				currentPage.value -= 1;
				data = await getPendingGameMapList(currentPage.value, pageSize.value);
			}

			gameMapList.value = data.gameMapList;
			total.value = data.total;
			// list[0] 是当前页最新的入队时间，与后端「reviewSubmittedAt DESC」排序一致
			if (!queueCursor.value) queueCursor.value = snapshotOf(data.gameMapList);
		} while (refreshQueued);
	} finally {
		loading.value = false;
	}
}

function handleView(mapInfo: GameMapInDb) {
	currentMap.value = mapInfo;
	detailVisible.value = true;
}

function handleReject(mapInfo: GameMapInDb) {
	currentMap.value = mapInfo;
	rejectReason.value = "";
	rejectVisible.value = true;
}

async function handleApprove(mapInfo: GameMapInDb) {
	if (busyId.value) return;
	busyId.value = mapInfo.id;
	try {
		await reviewGameMap({ mapId: mapInfo.id, action: "approve" });
		await loadPage();
	} finally {
		busyId.value = undefined;
	}
}

async function confirmReject() {
	if (!currentMap.value) return;
	const reason = rejectReason.value.trim();
	if (!reason) {
		message.warning("请填写驳回原因");
		return;
	}
	rejectSubmitting.value = true;
	try {
		await reviewGameMap({ mapId: currentMap.value.id, action: "reject", reason });
		rejectVisible.value = false;
		rejectReason.value = "";
		await loadPage();
	} finally {
		rejectSubmitting.value = false;
	}
}

function handlePageChange(page: number) {
	// 回到第 1 页重新取快照；翻到后面的页沿用快照，避免列表流动导致同一条在两页都出现
	loadPage(page === 1, page);
}

function handleRefresh() {
	// 用户主动刷新：重新取快照，保证能看到刚提交的地图
	loadPage(true);
}

onMounted(async () => {
	await loadPage(true, 1);
	void loadNotifyState();
	refreshTimer = setInterval(() => {
		// 审核操作进行中不刷新，避免行数据在弹窗/按钮操作期间跳动
		if (autoRefresh.value && !loading.value && !busyId.value && !rejectSubmitting.value) loadPage();
	}, AUTO_REFRESH_INTERVAL_MS);
});

onUnmounted(() => {
	if (refreshTimer) {
		clearInterval(refreshTimer);
		refreshTimer = null;
	}
});
</script>

<template>
	<div class="map-review">
		<div class="top-bar">
			<div class="left">
				<h4>待审查地图</h4>
				<a-tag color="gold">{{ total }} 个待审</a-tag>
			</div>
			<div class="right">
				<span class="auto-refresh-label">自动刷新</span>
				<a-switch v-model:checked="autoRefresh" size="small" />
				<a-tag v-if="notifyConfigured === false" color="warning">通知未配置</a-tag>
				<a-button @click="notifyVisible = true">通知设置</a-button>
				<a-button :loading="loading" @click="handleRefresh">刷新</a-button>
			</div>
		</div>

		<a-empty v-if="!loading && total === 0" class="empty-state" description="暂无待审地图" />
		<div v-else class="pending-list">
			<pending-map-item
				v-for="mapInfo in gameMapList"
				:key="mapInfo.id"
				:map-info="mapInfo"
				:busy="busyId === mapInfo.id"
				@view="handleView"
				@approve="handleApprove"
				@reject="handleReject"
			/>
		</div>

		<a-pagination
			class="review-pagination"
			v-model:current="currentPage"
			:show-total="() => `${total} 个待审地图`"
			:total="total"
			:pageSize="pageSize"
			show-less-items
			@change="handlePageChange"
		/>
	</div>

	<review-detail-modal v-model:open="detailVisible" :map-info="currentMap" />

	<notify-setting-modal v-model:open="notifyVisible" @saved="loadNotifyState" />

	<a-modal
		v-model:open="rejectVisible"
		title="驳回地图"
		:confirm-loading="rejectSubmitting"
		:ok-button-props="{ danger: true }"
		ok-text="确认驳回"
		cancel-text="取消"
		destroy-on-close
		@ok="confirmReject"
	>
		<a-form layout="vertical">
			<a-form-item label="地图名称">
				<span>{{ currentMap?.name }}</span>
			</a-form-item>
			<a-form-item label="驳回原因" required>
				<a-textarea v-model:value="rejectReason" :rows="3" placeholder="请输入驳回原因（作者可见）" :maxlength="200" show-count />
			</a-form-item>
		</a-form>
	</a-modal>
</template>

<style lang="scss" scoped>
.map-review {
	box-sizing: border-box;
	padding: 10px;
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;

	.top-bar {
		flex-shrink: 0;
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		background-color: #fff;
		padding: 10px 20px;
		border-radius: 5px;

		.left {
			display: flex;
			align-items: center;
			gap: 10px;
		}

		.right {
			display: flex;
			align-items: center;
			gap: 8px;
		}
	}

	/* 列表占满顶部栏与分页之间的剩余高度，内容超出时列表内部滚动 */
	.pending-list {
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 10px 4px 10px 0;
	}

	.empty-state {
		flex: 1 1 auto;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.review-pagination {
		flex-shrink: 0;
		text-align: right;
		padding: 10px 0;
	}
}

.auto-refresh-label {
	font-size: 12px;
	color: #888;
}

@media (max-width: 768px) {
	.map-review .top-bar {
		flex-direction: column;
		align-items: stretch;
	}

	.map-review .top-bar .right {
		justify-content: flex-end;
	}

	.map-review .review-pagination {
		text-align: center;
	}
}
</style>

<!--
	.content-wrapper 自身没有高度，导致页面内的 height: 100% 会被解析为 auto（列表无法占满剩余空间）。
	这里只给「承载本页的容器」补上确定高度：:has() 限定作用范围，不影响其他管理页；
	不支持 :has() 的浏览器自动退化为原来的自然高度滚动。
-->
<style lang="scss">
.content-wrapper:has(.map-review) {
	box-sizing: border-box;
	height: 100%;
	min-height: 0;
}
</style>
