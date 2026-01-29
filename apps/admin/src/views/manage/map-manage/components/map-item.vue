<script setup lang="ts">
import { deleteGameMap, setGameMapUse } from "@/utils/api/game-map";
import { PROTOCOL } from "@mine-monopoly/config";
import { GameMapInDb } from "@mine-monopoly/types";
import { computed, ref } from "vue";

const props = defineProps<{ mapInfo: GameMapInDb }>();
const emit = defineEmits(["deleted", "edit"]);
const coverUrl = computed(() => `${PROTOCOL}://${props.mapInfo.coverUrl}`);
const switchLoading = ref(false);

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
			<a-space>
				<span>{{ props.mapInfo.name }}</span>
				<a-tag :color="props.mapInfo.inuse ? 'success' : 'error'">{{
					props.mapInfo.inuse ? "使用中" : "禁用中"
				}}</a-tag>
			</a-space>
		</template>

		<template #extra>
			<a-popover trigger="click">
				<template #content>
					<a-space direction="vertical">
						<a-button @click="handleEdit" size="small" type="link">编辑</a-button>
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
		<img class="cover-image" :src="coverUrl" alt="" />
	</a-card>
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
	max-width: 100%;
	max-height: 100%;
	width: auto;
	height: auto;
	padding: 5px;
	object-fit: contain;
	display: block;
	margin: auto;
}
</style>
