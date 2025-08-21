<script setup lang="ts">
import { getItemTypesListByMapId, updateIndexList } from "@/utils/api/map";
import { ItemType, MapItem } from "@/interfaces/interfaces";
import { ElMessage } from "element-plus";
import { onBeforeMount, ref } from "vue";
import { useRoute } from "vue-router";

const props = withDefaults(defineProps<{ mapItemslist: MapItem[]; itemTypeList: ItemType[] }>(), {
	mapItemslist: () => new Array<MapItem>(),
	itemTypeList: () => new Array<ItemType>(),
});
const emits = defineEmits(["submit"]);

const mapId = useRoute().query.mapId as string;

const _itemTypeIdToAppendPath = ref<string[]>([]);

async function handleAppendIndexList() {
	const tempMapItemsList = props.mapItemslist.filter((item) => _itemTypeIdToAppendPath.value.includes(item.type.id));
	if (tempMapItemsList.length > 0) {
		let indexList: string[] = [];
		try {
			indexList = findPath(tempMapItemsList);
		} catch (e: any) {
			ElMessage({ message: e.message, type: "error" });
		}
		await updateIndexList(mapId, indexList);
		emits("submit");
	}
}

function findPath(mapItems: MapItem[]): string[] | never {
	if (mapItems.length === 0) {
		throw new Error("输入数组不能为空");
	}

	const itemsCopy: MapItem[] = JSON.parse(JSON.stringify(mapItems));

	const startingPoint: MapItem = itemsCopy[0];

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

// function findPath(itemList: MapItem[]) {
//   const tempList: MapItem[] = [];
//   const startItem: MapItem = itemList[0];
//   tempList.push(startItem);
//   for (let i = 0; i < itemList.length - 1; i++) {
//     const tempItem = tempList[tempList.length - 1];
//     for (let j = 0; j < itemList.length; j++) {
//       const nextTempItem = itemList[j];
//       if (isAdjacent(tempItem, nextTempItem) && !tempList.includes(nextTempItem)) {
//         tempList.push(nextTempItem);
//         break;
//       }
//     }
//   }
//   if (!isAdjacent(tempList[0], tempList[tempList.length - 1])) throw Error("不是闭环的的地图");
//   return tempList.map((item) => item.id);
//
//   function isAdjacent(sourceItem: MapItem, targetItem: MapItem) {
//     return (
//       (sourceItem.x + 1 === targetItem.x && sourceItem.y === targetItem.y) ||
//       (sourceItem.x - 1 === targetItem.x && sourceItem.y === targetItem.y) ||
//       (sourceItem.y + 1 === targetItem.y && sourceItem.x === targetItem.x) ||
//       (sourceItem.y - 1 === targetItem.y && sourceItem.x === targetItem.x)
//     );
//   };
// };
</script>

<template>
	<div class="index-creator">
		<el-select
			size="small"
			multiple
			value-key="color"
			clearable
			v-model="_itemTypeIdToAppendPath"
			placeholder="选择类型用来生成索引"
		>
			<el-option v-for="(item, index) in itemTypeList" :key="item.color" :value="item.id" :label="item.name">
				<div class="flex align-center justify-space-between">
					<span :style="{ color: item.color }">{{ item.name }}</span>
				</div>
			</el-option>
		</el-select>
		<el-button size="small" @click="handleAppendIndexList" type="primary" style="margin-left: 10px">生成路线</el-button>
	</div>
</template>

<style lang="scss" scoped>
.index-creator {
	padding: 10px;
	background-color: #ffffff;
}
</style>
