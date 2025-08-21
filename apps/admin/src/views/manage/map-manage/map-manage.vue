<script setup lang="ts">
import { ref, onMounted, reactive } from "vue";
import { createMap, getMapsList } from "@/utils/api/map";
import { GameMap } from "@/interfaces/interfaces";
import MapListCard from "@/views/manage/map-manage/components/map-list-card.vue";
import { FormInstance, FormRules } from "element-plus";
import {useRouter} from "vue-router";

const router = useRouter();

const createMapDialogVisible = ref(false);

const _mapList = ref<GameMap[]>([]);

const isLoading = ref(true);

//表单
const fromRef = ref<FormInstance>();
const newMapForm = reactive({
	name: "",
});
const rules = reactive<FormRules>({
	name: [{ required: true, message: "请输入地图名字", trigger: "blur" }],
});

//分页
const currentPage = ref(1);
const totalPage = ref(0);
const size = ref(6);

function handleCurrentChange(){
	loadMapsList();
};

const loadMapsList = async () => {
	isLoading.value = true;
	const { total, mapsList, current } = await getMapsList(currentPage.value, size.value);
	_mapList.value = mapsList;
	totalPage.value = total;
	currentPage.value = current;
	isLoading.value = false;
};

function handleCreateMap(){
	fromRef.value!.validate(async (valid) => {
		if (!valid) return;
		const { id } = (await createMap(newMapForm.name)) as any;
		router.push({ path: "/map-editor", query: { mapId: id } });
	});
};

function handleMapEdit(id: string){
	router.push({ path: "/map-editor", query: { mapId: id } });
};

function handleMapDelete(){
	loadMapsList();
};

onMounted(async () => {
	await loadMapsList();
});
</script>

<template>
	<div class="map-page">
		<el-row class="top-bar">
			<el-col :span="20" class="title"><h4>地图管理</h4></el-col>
			<el-col :span="4" class="button-container">
				<el-button class="button-create-map" type="primary" @click="createMapDialogVisible = true">创建地图</el-button>
			</el-col>
		</el-row>

		<div v-loading="isLoading" element-loading-text="Loading..." class="map-list-container">
			<map-list-card @edit="handleMapEdit" @delete="handleMapDelete" v-for="map in _mapList" :key="map.id" :map="map" />
		</div>

		<el-pagination
			background
			v-model:current-page="currentPage"
			:page-size="size"
			layout="total, prev, pager, next"
			:total="totalPage"
			@current-change="handleCurrentChange"
		/>
	</div>

	<el-dialog title="新建地图" close width="20%" v-model="createMapDialogVisible">
		<el-form ref="fromRef" :model="newMapForm" :rules="rules">
			<el-form-item label="地图名称" prop="name">
				<el-input placeholder="输入新建地图的名称" v-model="newMapForm.name"></el-input> </el-form-item
			><el-form-item>
				<el-button type="primary" @click="handleCreateMap">创建</el-button>
			</el-form-item>
		</el-form>
	</el-dialog>
</template>

<style lang="scss" scoped>
.map-page {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
}

.top-bar {
	width: 100%;
	height: 50px;
	border-radius: 10px;
	padding: 5px 20px;
	display: flex;
	align-items: center;
	box-shadow: var(--el-box-shadow-light);
	& > .button-container > * {
		float: right;
	}
}
.map-list-container {
	flex: 1;
	display: grid;
	grid-template-columns: repeat(3, 33.33%);
	grid-template-rows: repeat(2, 50%);
}
</style>
