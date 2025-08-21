<script setup lang="ts">
import { RoomMapItem } from "@/interfaces/interfaces";

const props = defineProps<{ room: RoomMapItem }>();
</script>

<template>
	<div class="room-item">
		<div class="top-bar">
			<div class="room-id">
				房间号: <b>{{ room.roomId }}</b>
			</div>
			<div class="right">
				<div :style="{ background: room.isPrivate ? '#409EFF' : '#67C23A' }" class="is-private">
					{{ room.isPrivate ? "私有" : "公开" }}房间
				</div>
				<div :style="{ background: room.isStarted ? '#67C23A' : '#E6A23C' }" class="is-started">
					{{ room.isStarted ? "游戏中" : "等待中" }}
				</div>
			</div>
		</div>
		<div class="foot-bar">
			<div class="owner-name">
				房主: <b>{{ room.hostName }}</b>
			</div>
			<div class="owner-id">
				房主ID: <b>{{ room.hostId }}</b>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.room-item {
	border-radius: 8px;
	margin: 10px;
	margin-left: 5px;
	padding: 20px;
	box-sizing: border-box;
	box-shadow: var(--el-box-shadow-light);
	height: max-content;

	& > .top-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;

		& > .right {
			display: flex;
			justify-content: space-between;
			align-items: center;
			font-size: 12px;

			& > div {
				color: #fff;
				margin-left: 10px;
				background-color: #dbdbdb;
				padding: 5px 8px;
				border-radius: 5px;
			}
		}
	}

	b {
		color: var(--el-color-primary);
	}

	& > .foot-bar {
		margin-top: 20px;
		font-size: 12px;
		display: flex;
		justify-content: space-between;
		align-items: center;

		& > .owner-id {
			margin-left: 50px;
		}
	}
}
</style>
