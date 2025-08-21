<script setup lang="ts">
import { RoomMapItem } from "@/interfaces/interfaces";
import RoomItem from "./components/room-item.vue";
import { getRoomList } from "@/utils/api/roomList";
import { onMounted, ref } from "vue";

const roomList = ref<RoomMapItem[]>([]);

async function poll() {
	roomList.value = await getRoomList();
	setTimeout(poll, 3000);
}

onMounted(() => {
	poll();
});
</script>

<template>
	<div class="dashboard">
		<el-row style="height: 100%">
			<div class="room-list-container">
				<div class="room-list-title">当前房间列表({{ roomList.length }})</div>
				<div class="room-list">
					<RoomItem :room="room" v-for="room in roomList" :key="room.roomId" />
				</div>
			</div>
		</el-row>
	</div>
</template>

<style lang="scss" scoped>
.dashboard {
	height: 100%;
	.room-list-container {
		display: flex;
		flex: 1;
		justify-content: space-between;
		flex-direction: column;
		height: 100%;
		padding: 20px;
		border-radius: 20px;
		box-shadow: var(--el-box-shadow-light);
		box-sizing: border-box;

		& > .room-list-title {
			font-weight: bold;
			margin-bottom: 10px;
		}

		& > .room-list {
			flex: 1;
			display: flex;
			justify-content: flex-start;
			align-content: flex-start;
			overflow-y: scroll;
			flex-wrap: wrap;
		}
	}
}
</style>
