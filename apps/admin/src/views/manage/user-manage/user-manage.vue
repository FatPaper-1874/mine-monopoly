<script setup lang="ts">
import { AdminUserListItem } from "@/interfaces/interfaces";
import { computed, onMounted, ref } from "vue";
import { getUserList, deleteUser } from "@/utils/api/user";
import { isMobileDevice } from "@/utils/index";
import UserForm from "./components/user-form.vue";

const isMobile = isMobileDevice();
const userList = ref<AdminUserListItem[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(8);
const searchText = ref("");
const formVisible = ref(false);
const currentUser = ref<AdminUserListItem | undefined>();
const tableLoading = ref(false);
const avatarPreviewVisible = ref(false);
const previewUser = ref<AdminUserListItem | undefined>();
const avatarLoadFailedIds = ref<string[]>([]);
const onlineFilter = ref<"all" | "online" | "offline">("all");
const adminFilter = ref<"all" | "admin" | "normal">("all");
const sortBy = ref<"createTime" | "lastActiveTime" | "username" | "useraccount">("lastActiveTime");
const sortOrder = ref<"ASC" | "DESC">("DESC");

const columns = [
	{ title: "头像", dataIndex: "avatar", key: "avatar", align: "center" as const },
	{ title: "账号", dataIndex: "useraccount", key: "useraccount", align: "center" as const },
	{ title: "用户名", dataIndex: "username", key: "username", align: "center" as const },
	{ title: "在线", dataIndex: "online", key: "online", align: "center" as const },
	{ title: "管理员", dataIndex: "isAdmin", key: "isAdmin", align: "center" as const },
	{ title: "创建时间", dataIndex: "createTime", key: "createTime", align: "center" as const },
	{ title: "近期登录", dataIndex: "lastActiveTime", key: "lastActiveTime", align: "center" as const },
	{ title: "操作", key: "action", align: "center" as const },
];

const onlineOptions = [
	{ label: "全部状态", value: "all" },
	{ label: "仅在线", value: "online" },
	{ label: "仅离线", value: "offline" },
];

const adminOptions = [
	{ label: "全部角色", value: "all" },
	{ label: "仅管理员", value: "admin" },
	{ label: "普通用户", value: "normal" },
];

const sortFieldOptions = [
	{ label: "按近期登录", value: "lastActiveTime" },
	{ label: "按创建时间", value: "createTime" },
	{ label: "按用户名", value: "username" },
	{ label: "按账号", value: "useraccount" },
];

const sortOrderOptions = [
	{ label: "降序", value: "DESC" },
	{ label: "升序", value: "ASC" },
];

const previewTitle = computed(() => previewUser.value?.username || "头像详情");

let searchTimer: ReturnType<typeof setTimeout> | null = null;

async function updateList() {
	tableLoading.value = true;
	try {
		const data = await getUserList(currentPage.value, pageSize.value, {
			search: searchText.value || undefined,
			online: onlineFilter.value === "all" ? undefined : onlineFilter.value === "online",
			isAdmin: adminFilter.value === "all" ? undefined : adminFilter.value === "admin",
			sortBy: sortBy.value,
			sortOrder: sortOrder.value,
		});
		userList.value = data.userList;
		total.value = data.total;
		const validIds = new Set(data.userList.map((user) => user.id));
		avatarLoadFailedIds.value = avatarLoadFailedIds.value.filter((id) => validIds.has(id));
	} finally {
		tableLoading.value = false;
	}
}

function handleSearch(value: string) {
	searchText.value = value;
	currentPage.value = 1;
	if (searchTimer) clearTimeout(searchTimer);
	searchTimer = setTimeout(() => updateList(), 300);
}

function handlePageChange(page: number) {
	currentPage.value = page;
	updateList();
}

function handleFilterChange() {
	currentPage.value = 1;
	updateList();
}

function handleCreate() {
	currentUser.value = undefined;
	formVisible.value = true;
}

function handleEdit(user: AdminUserListItem) {
	currentUser.value = user;
	formVisible.value = true;
}

function handleFormClose() {
	currentUser.value = undefined;
}

async function handleFormFinish() {
	formVisible.value = false;
	await updateList();
}

async function handleDelete(id: string) {
	await deleteUser(id);
	await updateList();
}

function openAvatarPreview(user: AdminUserListItem) {
	previewUser.value = user;
	avatarPreviewVisible.value = true;
}

function formatDateTime(value: string | null) {
	return value || "-";
}

function markAvatarLoadFailed(userId: string) {
	if (!avatarLoadFailedIds.value.includes(userId)) {
		avatarLoadFailedIds.value = [...avatarLoadFailedIds.value, userId];
	}
}

function hasAvatarLoadFailed(userId: string) {
	return avatarLoadFailedIds.value.includes(userId);
}

onMounted(() => {
	updateList();
});
</script>

<template>
	<div class="user-page">
		<div class="top-bar">
			<div class="left">
				<a-input-search
					placeholder="搜索用户名或账号"
					class="search-input"
					allow-clear
					@change="(e: Event) => handleSearch((e.target as HTMLInputElement).value)"
				/>
				<a-select v-model:value="onlineFilter" class="filter-select" :options="onlineOptions" @change="handleFilterChange" />
				<a-select v-model:value="adminFilter" class="filter-select" :options="adminOptions" @change="handleFilterChange" />
				<a-select v-model:value="sortBy" class="filter-select" :options="sortFieldOptions" @change="handleFilterChange" />
				<a-select
					v-model:value="sortOrder"
					class="filter-select short"
					:options="sortOrderOptions"
					@change="handleFilterChange"
				/>
			</div>
			<div class="right">
				<a-button type="primary" @click="handleCreate">新增用户</a-button>
			</div>
		</div>

		<div v-if="!isMobile" class="user-list-container">
			<a-table
				:columns="columns"
				:data-source="userList"
				:loading="tableLoading"
				:pagination="{
					current: currentPage,
					pageSize: pageSize,
					total: total,
					showTotal: (total: number) => `${total} 个用户`,
					onChange: handlePageChange,
					showLessItems: true,
				}"
				row-key="id"
			>
				<template #bodyCell="{ column, record }">
					<template v-if="column.key === 'avatar'">
						<button class="avatar-button" type="button" @click="openAvatarPreview(record)">
							<div v-if="record.avatar" class="avatar-wrapper">
								<img
									class="avatar-image"
									:src="record.avatar"
									:alt="`${record.username} avatar`"
									:style="{ border: `2px solid ${record.color}` }"
									@error="markAvatarLoadFailed(record.id)"
								/>
								<span v-if="hasAvatarLoadFailed(record.id)" class="avatar-flag">异常</span>
							</div>
							<div v-else class="avatar-circle" :style="{ backgroundColor: record.color }">
								{{ record.username?.charAt(0) }}
							</div>
						</button>
					</template>
					<template v-if="column.key === 'online'">
						<a-tag :color="record.online ? 'green' : 'default'">
							{{ record.online ? "在线" : "离线" }}
						</a-tag>
					</template>
					<template v-if="column.key === 'isAdmin'">
						<a-tag v-if="record.isAdmin" color="blue">管理员</a-tag>
						<a-tag v-if="hasAvatarLoadFailed(record.id)" color="red">头像异常</a-tag>
					</template>
					<template v-if="column.key === 'createTime'">
						<span class="time-text">{{ formatDateTime(record.createTime) }}</span>
					</template>
					<template v-if="column.key === 'lastActiveTime'">
						<span class="time-text">{{ formatDateTime(record.lastActiveTime) }}</span>
					</template>
					<template v-if="column.key === 'action'">
						<a-space>
							<a-button type="link" size="small" @click="handleEdit(record)">编辑</a-button>
							<a-popconfirm title="确认删除该用户？" @confirm="handleDelete(record.id)">
								<a-button type="link" danger size="small">删除</a-button>
							</a-popconfirm>
						</a-space>
					</template>
				</template>
			</a-table>
		</div>

		<div v-else class="user-card-list">
			<a-empty v-if="userList.length === 0" description="没有数据" />
			<div v-for="user in userList" :key="user.id" class="user-card">
				<div class="user-card-header">
					<button class="avatar-button" type="button" @click="openAvatarPreview(user)">
						<div v-if="user.avatar" class="avatar-wrapper">
							<img
								class="avatar-image"
								:src="user.avatar"
								:alt="`${user.username} avatar`"
								:style="{ border: `2px solid ${user.color}` }"
								@error="markAvatarLoadFailed(user.id)"
							/>
							<span v-if="hasAvatarLoadFailed(user.id)" class="avatar-flag">异常</span>
						</div>
						<div v-else class="avatar-circle" :style="{ backgroundColor: user.color }">
							{{ user.username?.charAt(0) }}
						</div>
					</button>
					<div class="user-card-info">
						<span class="user-card-name">{{ user.username }}</span>
						<span class="user-card-account">{{ user.useraccount }}</span>
						<span class="user-card-time">创建: {{ formatDateTime(user.createTime) }}</span>
						<span class="user-card-time">近期登录: {{ formatDateTime(user.lastActiveTime) }}</span>
					</div>
					<a-tag :color="user.online ? 'green' : 'default'" class="user-card-tag">
						{{ user.online ? "在线" : "离线" }}
					</a-tag>
				</div>
				<div class="user-card-footer">
					<div class="user-card-badges">
						<a-tag v-if="user.isAdmin" color="blue">管理员</a-tag>
						<a-tag v-if="hasAvatarLoadFailed(user.id)" color="red">头像异常</a-tag>
					</div>
					<a-space>
						<a-button type="link" size="small" @click="handleEdit(user)">编辑</a-button>
						<a-popconfirm title="确认删除该用户？" @confirm="handleDelete(user.id)">
							<a-button type="link" danger size="small">删除</a-button>
						</a-popconfirm>
					</a-space>
				</div>
			</div>
			<div class="user-card-pagination">
				<a-pagination
					show-less-items
					v-model:current="currentPage"
					:total="total"
					:pageSize="pageSize"
					@change="handlePageChange"
				/>
			</div>
		</div>
	</div>

	<a-modal
		@close="handleFormClose"
		destroyOnClose
		:title="currentUser ? '编辑用户' : '新增用户'"
		:width="'min(420px, 90vw)'"
		v-model:open="formVisible"
		:footer="null"
	>
		<UserForm :user="currentUser" @finish="handleFormFinish" />
	</a-modal>

	<a-modal v-model:open="avatarPreviewVisible" :title="previewTitle" :footer="null" width="420px">
		<div v-if="previewUser" class="avatar-preview">
			<div v-if="previewUser.avatar" class="preview-image-wrapper">
				<img
					class="preview-image"
					:src="previewUser.avatar"
					:alt="`${previewUser.username} avatar`"
					@error="markAvatarLoadFailed(previewUser.id)"
				/>
				<div v-if="hasAvatarLoadFailed(previewUser.id)" class="preview-error">
					头像加载失败，可能已被 COS 拦截
				</div>
			</div>
			<div v-else class="avatar-circle preview-fallback" :style="{ backgroundColor: previewUser.color }">
				{{ previewUser.username?.charAt(0) }}
			</div>
			<div class="preview-meta">
				<div><span class="meta-label">账号</span>{{ previewUser.useraccount }}</div>
				<div><span class="meta-label">用户名</span>{{ previewUser.username }}</div>
				<div v-if="hasAvatarLoadFailed(previewUser.id)" class="meta-warning">该头像当前无法加载，可能为违规资源或已失效</div>
				<div><span class="meta-label">创建时间</span>{{ formatDateTime(previewUser.createTime) }}</div>
				<div><span class="meta-label">近期登录</span>{{ formatDateTime(previewUser.lastActiveTime) }}</div>
			</div>
		</div>
	</a-modal>
</template>

<style lang="scss" scoped>
.user-page {
	padding: 10px;
	display: flex;
	flex-direction: column;
	height: 100%;

	.top-bar {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		background-color: #fff;
		padding: 10px 20px;
		border-radius: 5px;

		.left {
			flex: 1;
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 10px;
		}

		.search-input {
			flex: 1;
			min-width: 220px;
			max-width: 320px;
		}

		.filter-select {
			width: 130px;
		}

		.filter-select.short {
			width: 100px;
		}
	}

	.user-list-container {
		flex: 1;
		margin-top: 10px;
		background-color: #fff;
		border-radius: 5px;
		padding: 10px;
	}

	.avatar-button {
		border: none;
		padding: 0;
		background: transparent;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.avatar-circle {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		font-size: 16px;
		font-weight: bold;
	}

	.avatar-wrapper {
		position: relative;
		width: 40px;
		height: 40px;
	}

	.avatar-image {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		object-fit: cover;
		display: block;
		background: #f3f3f3;
	}

	.avatar-flag {
		position: absolute;
		right: -6px;
		bottom: -4px;
		padding: 1px 4px;
		border-radius: 999px;
		background: #ff4d4f;
		color: #fff;
		font-size: 10px;
		line-height: 1.2;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
	}

	.time-text {
		color: #444;
		font-variant-numeric: tabular-nums;
	}

	.user-card-list {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-top: 10px;

		.user-card {
			background: #fff;
			border-radius: 5px;
			padding: 12px 16px;

			.user-card-header {
				display: flex;
				align-items: center;
				gap: 12px;

				.user-card-info {
					flex: 1;
					display: flex;
					flex-direction: column;
					gap: 2px;

					.user-card-name {
						font-weight: bold;
						color: #333;
					}

					.user-card-account {
						font-size: 12px;
						color: #999;
					}

					.user-card-time {
						font-size: 12px;
						color: #666;
						font-variant-numeric: tabular-nums;
					}
				}
			}

			.user-card-footer {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-top: 10px;
				padding-top: 10px;
				border-top: 1px solid #f0f0f0;
			}
		}

		.user-card-pagination {
			display: flex;
			justify-content: center;
			padding: 10px 0;
		}
	}
}

.avatar-preview {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16px;

	.preview-image-wrapper {
		width: 220px;
	}

	.preview-image {
		width: 220px;
		height: 220px;
		border-radius: 16px;
		overflow: hidden;
		object-fit: cover;
		display: block;
		background: #f5f5f5;
	}

	.preview-fallback {
		width: 140px;
		height: 140px;
		font-size: 48px;
	}

	.preview-meta {
		width: 100%;
		display: grid;
		gap: 10px;
		font-variant-numeric: tabular-nums;

		.meta-label {
			display: inline-block;
			width: 80px;
			color: #888;
		}

		.meta-warning {
			color: #cf1322;
			background: #fff1f0;
			border: 1px solid #ffa39e;
			border-radius: 8px;
			padding: 8px 10px;
		}
	}

	.preview-error {
		margin-top: 10px;
		color: #cf1322;
		font-size: 12px;
		text-align: center;
	}
}

@media (max-width: 768px) {
	.user-page {
		.top-bar {
			padding: 12px;
			align-items: stretch;
			flex-direction: column;
		}

		.right {
			display: flex;
			justify-content: flex-end;
		}
	}
}
</style>
