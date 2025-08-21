<script setup lang="ts">
import { ArrivedEvent } from "@/interfaces/interfaces";
import { ElMessageBox } from "element-plus";
import { computed } from "vue";
import { deleteArrivedEvent } from "@/utils/api/arrivedEvent";
import { __PROTOCOL__ } from "@G/global.config";

const props = defineProps<{ arrivedEvent: ArrivedEvent }>();
const emit = defineEmits(["delete", "edit"]);

function handleEdit() {
	emit("edit", props.arrivedEvent.id);
}

function handleDelete() {
	ElMessageBox.alert("删除这个到达事件会导致绑定这个事件的MapItem一并失去该功能,你确定要删除吗", "警告", {
		confirmButtonText: "确定删除",
		cancelButtonText: "取消",
		type: "warning",
	}).then(async () => {
		await deleteArrivedEvent(props.arrivedEvent.id);
		emit("delete");
	});
}

function handleCommand(command: string) {
	switch (command) {
		case "edit":
			handleEdit();
			break;
		case "delete":
			handleDelete();
			break;
	}
}

const iconUrl = computed(() => `${__PROTOCOL__}://${props.arrivedEvent.iconUrl}`);
</script>

<template>
	<el-card class="arrived-event-list-card" :body-style="{ width: '100%', flex: '1', 'box-sizing': 'border-box' }">
		<template #header>
			<div class="card-header">
				<span>{{ arrivedEvent.name }}</span>
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

		<el-image fit="cover" class="icon" :src="iconUrl"></el-image>
	</el-card>
</template>

<style lang="scss" scoped>
.arrived-event-list-card {
	margin: 10px;
	border-radius: 10px;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;

	.icon {
		width: 100%;
		height: 100%;
		border-radius: 10px;
	}
}

.card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}
</style>
