<script setup lang="ts">
import { MapItemType, MapItem } from "@fatpaper-monopoly/types";
import { message } from "ant-design-vue";
import { computed, onBeforeMount, ref } from "vue";
import { useMapDataStore } from "@src/stores/index";

const mapItemslist = computed(() => useMapDataStore().mapItems);
const itemTypeList = computed(() => useMapDataStore().mapItemTypes);

const startMapItemId = ref("");
const emits = defineEmits(["submit"]);

const _itemTypeIdToAppendPath = ref<string[]>([]);
const model = defineModel({ default: false });

async function handleAppendMapIndex() {
	let startMapItem: MapItem | undefined;
	startMapItem = useMapDataStore().findMapItemById(startMapItemId.value);
	if (!startMapItem) {
		message.error(`找不到ID为: ${startMapItemId.value}的MapItem`);
	}
	const tempMapItemsList = mapItemslist.value.filter((item) => _itemTypeIdToAppendPath.value.includes(item.type.id));
	if (tempMapItemsList.length > 0) {
		let mapIndex: string[] = [];
		try {
			mapIndex = findPath(tempMapItemsList, startMapItem);
			useMapDataStore().updateMapIndex(mapIndex);
			message.success("更新路径索引成功", 1);
			emits("submit");
		} catch (e: any) {
			useMapDataStore().updateMapIndex([]);
			message.error(e.message);
		}
	}
}

function findPath(mapItems: MapItem[], startMapItem?: MapItem): string[] | never {
	if (mapItems.length === 0) {
		throw new Error("输入数组不能为空");
	}

	const itemsCopy: MapItem[] = JSON.parse(JSON.stringify(mapItems));

	const startingPoint: MapItem = startMapItem ? startMapItem : itemsCopy[0];

	const traversedItems: MapItem[] | null = traverseMap(itemsCopy, startingPoint);
	if (!traversedItems || traversedItems.length == 0) {
		throw new Error("无法遍历整个数组");
	}

	return traversedItems.map((i) => i.id);
}

function traverseMap(items: MapItem[], startPoint: MapItem): MapItem[] | null {
	// 创建一个集合用于存储已经访问过的节点
	const visited: { [key: string]: boolean } = {};
	// 创建一个结果数组用于存储遍历的节点
	const result: MapItem[] = [];

	// 使用深度优先搜索（DFS）算法进行遍历
	function dfs(node: MapItem) {
		// 将当前节点标记为已访问
		visited[`${node.x},${node.y}`] = true;
		// 将当前节点加入结果数组
		result.push(node);

		// 寻找当前节点的相邻节点进行遍历
		const neighbors = findNeighbors(node, items);
		for (const neighbor of neighbors) {
			// 如果相邻节点未被访问，则递归访问它
			if (!visited[`${neighbor.x},${neighbor.y}`]) {
				dfs(neighbor);
			}
		}
	}

	// 开始遍历
	dfs(startPoint);

	// 检查是否所有节点都被访问到了
	if (result.length !== items.length) {
		return null;
	}

	return result;
}

function findNeighbors(node: MapItem, items: MapItem[]): MapItem[] {
	const neighbors: MapItem[] = [];
	const directions = [
		{ x: 1, y: 0 }, // 右
		{ x: -1, y: 0 }, // 左
		{ x: 0, y: 1 }, // 下
		{ x: 0, y: -1 }, // 上
	];

	for (const dir of directions) {
		const neighborX = node.x + dir.x;
		const neighborY = node.y + dir.y;

		const neighbor = items.find((item) => item.x === neighborX && item.y === neighborY);
		if (neighbor) {
			neighbors.push(neighbor);
		}
	}

	return neighbors;
}
</script>

<template>
	<a-modal :footer="null" v-model:open="model" title="建立地图路径索引">
		<a-input
			v-model:value="startMapItemId"
			style="margin-bottom: 10px"
			placeholder="输入起点MapItem的Id(可选)"
		></a-input>
		<a-select
			clearable
			v-model:value="_itemTypeIdToAppendPath"
			showArrow
			style="width: 70%"
			mode="multiple"
			placeholder="选择类型用来生成索引"
		>
			<a-select-option v-for="(item, index) in itemTypeList" :key="item.color" :value="item.id" :label="item.name">
				<span>{{ item.name }}</span>
			</a-select-option>
		</a-select>
		<a-button @click="handleAppendMapIndex" type="primary" style="margin-left: 10px">生成路线</a-button>
	</a-modal>
</template>

<style lang="scss" scoped>
.index-creator {
	padding: 10px;
	background-color: #ffffff;
}
</style>
