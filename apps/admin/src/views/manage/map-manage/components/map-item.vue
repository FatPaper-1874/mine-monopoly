<script setup lang="ts">
import { bindGameMapCreator, deleteGameMap, setGameMapUse } from "@/utils/api/game-map";
import { getUserList } from "@/utils/api/user";
import { AdminUserListItem } from "@/interfaces/interfaces";
import { GameMapInDb } from "@mine-monopoly/types";
import { formatCreator } from "@/utils";
import { message } from "ant-design-vue";
import { onMounted, ref } from "vue";

const props = defineProps<{ mapInfo: GameMapInDb }>();
const emit = defineEmits(["deleted", "edit", "changed"]);
const switchLoading = ref(false);

// 绑定创作者弹窗
const bindVisible = ref(false);
const creatorOptions = ref<{ label: string; value: string }[]>([]);
const selectedCreatorId = ref<string | undefined>(undefined);
const bindLoading = ref(false);

async function handleGameMapUseSwitch(use: boolean) {
	switchLoading.value = true;
	await setGameMapUse(props.mapInfo.id, use);
	switchLoading.value = false;
}

function handleEdit() {
	emit("edit", props.mapInfo);
}

async function handleDelete() {
	await deleteGameMap(props.mapInfo.id);
	emit("deleted");
}

async function openBindModal() {
	selectedCreatorId.value = undefined;
	bindVisible.value = true;
	// 拉取全部用户（创作者可能是管理员，不能按 isAdmin 过滤），再筛选创作者身份
	const data = await getUserList(1, 100);
	creatorOptions.value = data.userList
		.filter((user: AdminUserListItem) => user.isCreator)
		.map((user: AdminUserListItem) => ({ label: `${user.username} (${user.useraccount})`, value: user.id }));
}

async function handleBind() {
	if (!selectedCreatorId.value) {
		message.warning("请选择创作者");
		return;
	}
	bindLoading.value = true;
	try {
		await bindGameMapCreator(props.mapInfo.id, selectedCreatorId.value);
		message.success("绑定创作者成功");
		bindVisible.value = false;
		emit("changed");
	} finally {
		bindLoading.value = false;
	}
}

onMounted(() => {
	// noop
});
</script>

<template>
	<a-card
		:bodyStyle="{
			display: 'flex',
			'justify-content': 'space-between',
			'align-items': 'center',
			flex: '1',
			width: '100%',
			'background-color': '#eeeeee',
			padding: 0,
			position: 'relative',
		}"
		class="map-item"
		size="small"
	>
		<template #title>
			<a-space wrap>
				<span>{{ props.mapInfo.name }}</span>
				<a-tag :color="props.mapInfo.inuse ? 'success' : 'error'">{{
					props.mapInfo.inuse ? "使用中" : "禁用中"
				}}</a-tag>
				<a-tag v-if="props.mapInfo.creatorId" color="green">创作者</a-tag>
				<a-tag v-else color="orange">未绑定创作者</a-tag>
			</a-space>
		</template>

		<template #extra>
			<a-popover trigger="click">
				<template #content>
					<a-space direction="vertical">
						<a-button @click="handleEdit" size="small" type="link">编辑</a-button>
						<a-button v-if="!props.mapInfo.creatorId" @click="openBindModal" size="small" type="link">绑定创作者</a-button>
						<a-popconfirm title="你确定删除这个地图吗" ok-text="确定" cancel-text="取消" @confirm="handleDelete">
							<a-button size="small" type="link" danger>删除</a-button>
						</a-popconfirm>
					</a-space>
				</template>
				<a>操作</a>
			</a-popover>
		</template>
		<a-switch
			@change="handleGameMapUseSwitch"
			class="use-switch"
			v-model:checked="props.mapInfo.inuse"
			checked-children="地图启用中"
			:loading="switchLoading"
			un-checked-children="地图禁用中"
		/>
		<span class="version-text">v{{ props.mapInfo.version }}</span>
		<img class="cover-image" :src="mapInfo.coverUrl" alt="" />
		<div v-if="props.mapInfo.creatorName" class="creator-info">
			<span class="creator-label">创作者：</span>{{ formatCreator(props.mapInfo.creatorName, props.mapInfo.creatorAccount) }}
		</div>
	</a-card>

	<a-modal v-model:open="bindVisible" title="绑定创作者" :footer="null" width="420px">
		<a-space direction="vertical" style="width: 100%">
			<a-select
				v-model:value="selectedCreatorId"
				:options="creatorOptions"
				placeholder="选择目标创作者"
				style="width: 100%"
				show-search
				option-filter-prop="label"
			/>
			<a-button type="primary" block :loading="bindLoading" @click="handleBind">确认绑定</a-button>
		</a-space>
	</a-modal>
</template>

<style lang="scss" scoped>
.map-item {
	display: flex;
	flex-direction: column;
	box-shadow: #c9c9c9 0px 1px 5px;
}
.version-text {
	position: absolute;
	left: 0;
	bottom: 0;
	margin: 5px;
	font-size: 0.8em;
	color: #bbb;
	background-color: rgba($color: #fff, $alpha: 0.4);
	padding: 2px 5px;
	border-radius: 3px;
}

.use-switch {
	position: absolute;
	left: 0;
	top: 0;
	margin: 10px;
}

.cover-image {
	width: 100%;
	aspect-ratio: 16 / 9;
	padding: 5px;
	object-fit: contain;
	display: block;
	margin: auto;
}

.creator-info {
	position: absolute;
	right: 0;
	bottom: 0;
	margin: 5px;
	font-size: 12px;
	color: #666;
	background-color: rgba($color: #fff, $alpha: 0.7);
	padding: 2px 6px;
	border-radius: 3px;
	max-width: 60%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.creator-label {
	color: #999;
}
</style>
