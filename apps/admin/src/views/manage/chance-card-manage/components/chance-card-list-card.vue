<script setup lang="ts">
import { deleteChanceCard } from "@/utils/api/chanceCard";
import { ChanceCard } from "@/interfaces/interfaces";
import { ElMessageBox } from "element-plus";
import chanceCardItem from "@/components/sample/chance-card.vue";

const { chanceCard } = defineProps<{ chanceCard: ChanceCard }>();
const emit = defineEmits(["delete", "edit"]);

function handleEdit(){
	emit("edit", chanceCard.id);
};

const handleDelete = async () => {
	await ElMessageBox.alert("删除这张机会卡时引用这张卡的地图也会丢失这张卡，确定删除吗", "警告", {
		confirmButtonText: "确定删除",
		cancelButtonText: "取消",
		type: "warning",
	}).then(async () => {
		await deleteChanceCard(chanceCard.id);
		emit("delete");
	});
};

function handleCommand(command: string){
	switch (command) {
		case "edit":
			handleEdit();
			break;
		case "delete":
			handleDelete();
			break;
	}
};
</script>

<template>
	<el-card class="map-preview-card" :body-style="{ width: '100%', flex: '1', 'box-sizing': 'border-box' }">
		<template #header>
			<div class="card-header">
				<span>{{ chanceCard.name }}</span>
				<el-dropdown trigger="click" @command="handleCommand">
					<el-button class="button" text style="color: #409eff">操作</el-button>
					<template #dropdown>
						<el-dropdown-menu>
							<el-dropdown-item command="edit">编辑</el-dropdown-item>
							<el-dropdown-item command="delete" style="color: red">删除</el-dropdown-item>
						</el-dropdown-menu>
					</template>
				</el-dropdown>
			</div>
		</template>
		<div class="container">
			<chanceCardItem
				:id="chanceCard.id"
				:name="chanceCard.name"
				:describe="chanceCard.describe"
				:icon="chanceCard.icon"
				:color="chanceCard.color"
				:effect-code="chanceCard.effectCode"
			></chanceCardItem>
		</div>
	</el-card>
</template>

<style lang="scss" scoped>
.map-preview-card {
	margin: 10px;
	border-radius: 10px;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;

	.container {
		margin: auto;
		display: flex;
		justify-content: center;
		align-items: center;
	}
}
.card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}
.map-preview__canvas {
	display: block;
	border-radius: 10px;
	width: 100%;
	height: 100%;
}
</style>
