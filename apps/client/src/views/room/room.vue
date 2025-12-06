<script setup lang="ts">
import MapPreviewer from "@src/views/room/components/map-previewer.vue";
import roomUserCard from "@src/views/room/components/room-user-card.vue";
import FpDialog from "@src/components/utils/fp-dialog/fp-dialog.vue";
import { FPMessage } from "@fatpaper-monopoly/ui";
import ItemSelector from "@src/components/utils/item-selector/item-selector.vue";
import router from "@src/router";
import { useLoading, useRoomInfo } from "@src/store";
import { useUserInfo } from "@src/store";
import { getGameMapById, getGameMapList } from "@src/utils/api/map";
import { MonopolyClient, useMonopolyClient } from "@src/core/monopoly-client/MonopolyClient";
import { computed, onBeforeMount, onBeforeUnmount, onMounted, reactive, ref, toRaw, watch } from "vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { copyToClipboard, getDisplayValueByFormSchema } from "@src/utils";
import { setRoomPrivate } from "@src/utils/api/room-router";
import { FormSchema, GameMapInDb, GameSetting, RoleInRoom } from "@fatpaper-monopoly/types";
import { PROTOCOL } from "@fatpaper-monopoly/config";
import { loadGameMapFromServer } from "@src/utils/file/game-map";
import RolePreviewer from "./components/role-previewer.vue";
import { useResourceStore } from "@src/store/game";
import FpPopover from "@src/components/utils/fp-popover/fp-popover.vue";
import { arrayBufferToBase64 } from "@fatpaper-monopoly/utils";
import CustomForm from "@src/components/utils/custom-form/index.vue";

let socketClient: MonopolyClient;

onMounted(async () => {
	socketClient = useMonopolyClient();
});

const roomInfoStore = useRoomInfo();
const userInfoStore = useUserInfo();

const playerList = computed(() => roomInfoStore.userList);
const ownerName = computed(() => roomInfoStore.ownerName);
const ownerId = computed(() => roomInfoStore.ownerId);
const roomId = computed(() => roomInfoStore.roomId);
const isPrivate = ref(true);

const isOwner = computed(() => userInfoStore.userId === roomInfoStore.ownerId);
const isReady = computed(() => roomInfoStore.userList.find((user) => user.userId === userInfoStore.userId)?.isReady);

// 地图相关
const mapList = ref<GameMapInDb[]>([]);
const mapSelectorVisible = ref(false);
const currentMap = computed(() => roomInfoStore.mapInfo);
const tempMapSelectedId = ref<string>(roomInfoStore.mapId || "");

function handleChangeMap() {
	if (socketClient && tempMapSelectedId.value !== currentMap.value?.id) {
		socketClient.changeGameMap({ from: "server", data: tempMapSelectedId.value });
	}
}

// 角色相关
const roleList = computed(() => roomInfoStore.roleList);
const roleSelectorVisible = ref(false);
const tempRoleSelectedId = ref<string>("");

function handleChangeRole() {
	if (socketClient && tempMapSelectedId.value !== currentMap.value?.id) {
		socketClient.changeRole(tempRoleSelectedId.value);
	}
}

// 游戏设置相关
const gameSettingForm = computed(() => roomInfoStore.gameSettingForm);
const gameSettingForShow = computed(() => roomInfoStore.gameSetting);
const gameSettingForForm = computed(() => {
	const setting = roomInfoStore.gameSetting;
	const temp: Record<string, any> = {};
	for (const key in setting) {
		const item = setting[key];
		temp[key] = item.value;
	}
	return temp;
});
const gameSettingFormVisible = ref(false);

function handleGameSettingChange(gameSetting: Record<string, { field: FormSchema; value: any }>) {
	const res: GameSetting = {};
	for (const key in gameSetting) {
		const item = gameSetting[key];
		res[key] = {
			label: item.field.label,
			value: gameSetting[key].value as any,
			displayValue: getDisplayValueByFormSchema(item.field, gameSetting[key].value),
		};
	}
	socketClient.changeGameSetting(res);
	gameSettingFormVisible.value = false;
}

const canStart = computed(
	() =>
		!(
			Boolean(roomInfoStore.mapInfo) &&
			roomInfoStore.userList.every((user) => Boolean(user.roleId) || user.userId === ownerId.value || user.isReady) &&
			!useLoading().loading
		)
);

async function handleSetPrivate() {
	isPrivate.value = !isPrivate.value;
	await setRoomPrivate(roomId.value, isPrivate.value);
}

async function handleCopyRoomId() {
	await copyToClipboard(roomId.value);
	FPMessage({
		type: "success",
		message: "房间ID成功复制到剪贴板, 快去邀请小伙伴吧!",
	});
}

function handleLeaveRoom() {
	if (socketClient) {
		socketClient.leaveRoom();
	}
}

function handleReadyToggle() {
	if (socketClient) {
		socketClient.readyToggle();
	}
}

function handleGameStart() {
	if (socketClient) {
		socketClient.startGame();
	}
}

async function handleSelectMap() {
	useLoading().showLoading("地图列表加载中...");
	const { gameMapList } = await getGameMapList(1, 1000);
	mapList.value = gameMapList;
	mapSelectorVisible.value = true;
	useLoading().hideLoading();
}

async function handleUploadMap() {
	const file = await new Promise<ArrayBuffer>((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".fpmap";
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (file) {
				const content = await file.arrayBuffer();
				resolve(content);
			}
		};
		input.click();
	});
	if (!file) return;
	//传输需要将地图从ArrayBuffer编码为Base64字符串
	socketClient.changeGameMap({ from: "custom", data: arrayBufferToBase64(file) });
	useLoading().showLoading("等待其他玩家确认");
}
</script>

<template>
	<div class="room-page">
		<div class="left-container">
			<div class="room-topbar">
				<button class="leave-room-button" @click="handleLeaveRoom">退出房间</button>
				<span style="flex: 1; text-align: center">{{ ownerName }}的房间</span>
			</div>

			<div class="room-id">
				<button v-if="isOwner" class="set-private-button" @click="handleSetPrivate">
					{{ isPrivate ? "点击公开" : "点击隐藏" }}
				</button>
				<span @click="handleCopyRoomId" style="flex: 1; text-align: center">
					房间ID:<span>{{ roomId }}</span>
				</span>
			</div>

			<div class="map-preview-inroom">
				<div class="map-cover-container">
					<MapPreviewer class="map-previewer" v-if="currentMap" :map="currentMap" />
					<span v-else>上传地图 & 选择官方地图</span>
				</div>
				<div class="select-map-button">
					<FpPopover v-if="isOwner" placement="top">
						<template #default>
							<button :class="{ nomap: !Boolean(roomInfoStore.mapId) }" @click="handleUploadMap">
								<FontAwesomeIcon style="font-size: 0.9rem" icon="fa-upload" />
							</button>
						</template>
						<template #content>
							<div class="tips">分享自己的地图(需要房间成员确认)</div>
						</template>
					</FpPopover>
					<button :class="{ nomap: !Boolean(roomInfoStore.mapId) }" :disabled="!isOwner" @click="handleSelectMap">
						选择地图
					</button>
				</div>
			</div>

			<div class="game-setting">
				<button v-if="isOwner && currentMap" @click="gameSettingFormVisible = true">修改地图参数</button>
				<div class="game-setting-item" v-for="(setting, key) in gameSettingForShow">
					<span class="label">{{ setting.label }}:</span>
					<span class="value">{{ setting.displayValue }}</span>
				</div>
			</div>

			<div class="room-footbar">
				<button v-if="isOwner" :disabled="canStart" class="ready-button" @click="handleGameStart">
					{{ currentMap ? "开始游戏" : "先选择地图吧" }}
				</button>
				<button v-else class="ready-button" @click="handleReadyToggle">
					{{ isReady ? "取消准备" : "准备" }}
				</button>
			</div>
		</div>

		<div class="right-container">
			<div class="player-list-container">
				<room-user-card
					@role-select="roleSelectorVisible = true"
					v-for="player in playerList"
					:key="player.userId"
					:user="player"
				/>
				<roomUserCard v-for="i in 6 - playerList.length" :key="i" :user="undefined" />
			</div>
		</div>
	</div>

	<FpDialog v-model:visible="gameSettingFormVisible" :hidden-footer="true">
		<template #title>修改地图参数</template>
		<template #default>
			<custom-form
				:initial-data="gameSettingForForm"
				@submit="handleGameSettingChange"
				:schema="gameSettingForm"
				:submit-text="'保存地图参数'"
			/>
		</template>
	</FpDialog>
	<FpDialog @submit="handleChangeRole" v-model:visible="roleSelectorVisible">
		<template #title>选择角色</template>
		<template #default>
			<ItemSelector
				:column="3"
				:multiple="false"
				:item-list="roleList"
				key-name="id"
				v-model:selected-key="tempRoleSelectedId"
			>
				<template #item="role">
					<RolePreviewer :role="role" />
				</template>
			</ItemSelector>
		</template>
	</FpDialog>
	<FpDialog @submit="handleChangeMap" v-model:visible="mapSelectorVisible">
		<template #title>选择地图 (点击想玩的地图然后确认)</template>
		<template #default>
			<ItemSelector
				:column="3"
				:multiple="false"
				:item-list="mapList"
				key-name="id"
				v-model:selected-key="tempMapSelectedId"
			>
				<template #item="map">
					<MapPreviewer style="width: 23rem; height: 14rem" :map="map" />
				</template>
			</ItemSelector>
		</template>
	</FpDialog>
</template>

<style lang="scss" scoped>
.room-page {
	width: 80%;
	height: 80%;
	padding: 1.2rem;
	margin: auto;
	box-sizing: border-box;
	display: flex;
	justify-content: space-between;

	& > div {
		height: 100%;
	}

	& > .left-container {
		width: 20rem;
		margin-right: 0.5rem;
		box-sizing: border-box;
		border-radius: 0.6rem;
		background-color: rgba(255, 255, 255, 0.7);
		backdrop-filter: blur(0.2rem);
		box-shadow: var(--box-shadow);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
	}

	& > .right-container {
		flex: 1;
		display: flex;
		flex-direction: column;

		& > .player-list-container {
			flex: 1;
			display: grid;
			grid-template-rows: 1fr 1fr;
			grid-template-columns: 1fr 1fr 1fr;
			row-gap: 8px;
			column-gap: 8px;
		}
	}
}

.room-topbar {
	height: 2rem;
	line-height: 2rem;
	width: 100%;
	color: #ffffff;
	background-color: rgba(255, 255, 255, 0.65);
	backdrop-filter: blur(0.2rem);
	background-color: var(--color-third);
	display: flex;
	justify-content: space-between;
	align-items: center;
	box-shadow: var(--box-shadow);
	text-shadow: var(--text-shadow);
	overflow: hidden;

	& > .leave-room-button {
		height: 100%;
		padding: 0 0.7rem;
		font-size: 1rem;
		text-shadow: var(--text-shadow);
	}
}

.room-id {
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	background-color: rgba(255, 255, 255, 0.45);
	margin-bottom: 0.8rem;
	padding: 0.3rem;

	& > .set-private-button {
		font-size: 0.8rem;
		// min-height: 1.5rem;
		margin-left: 0.3rem;
		border-radius: 0.3rem;
	}

	& > span {
		color: var(--color-third);
		user-select: none;
		font-size: 1rem;
		& > span {
			font-size: 1.1rem;
			margin: 0 0.8rem;
			user-select: text;
			color: var(--color-second);
			border-radius: 0.4rem;
			padding: 0 0.4rem;
			cursor: pointer;
		}
	}
}

.map-preview-inroom {
	width: 95%;
	height: 12rem;
	position: relative;
	overflow: hidden;

	& > .select-map-info {
		position: absolute;
		left: 0;
		top: 0;

		& > .name {
			width: auto;
			display: inline-block;
			padding: 0.6rem 1rem;
			border-radius: 0 0.3rem 0.3rem 0.3rem;
			background-color: var(--color-second);
			color: var(--color-text-white);
		}
	}

	& > .select-map-button {
		position: absolute;
		right: 0;
		bottom: 0;
		z-index: 100;
		display: flex;
		gap: 0.2rem;

		button {
			border: 0;
			font-size: 0.8rem;
			padding: 0.6rem 1.2rem;
			border-radius: 0.6rem;
			&.nomap:not([disabled]) {
				background-color: var(--color-second);
				animation: identifier 1.5s infinite ease-in-out;

				&:hover {
					background-color: var(--color-third);
				}

				@keyframes identifier {
					50% {
						background-color: var(--color-third);
					}
				}
			}
		}

		.tips {
			width: max-content;
			margin-top: 4rem;
			font-size: 0.8rem;
			background-color: rgba(255, 255, 255, 0.7);
			border-radius: 0.7rem;
			padding: 0.6rem;
			color: var(--color-primary);
			text-shadow: var(--text-shadow);
			margin-bottom: 0.3rem;
		}
	}

	& .map-cover-container {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		box-sizing: border-box;
		border: 0.4rem solid var(--color-border-lighter);
		border-radius: 1rem;
		background-color: var(--color-bg-disable);
		color: var(--color-text-secondary);
	}

	& .map-previewer {
		position: absolute;
		z-index: 1;
	}
}

.game-setting {
	width: 100%;
	padding: 0.6rem;
	box-sizing: border-box;
	flex: 1;
	overflow-y: auto;

	& button {
		font-size: 0.8rem;
		padding: 0.5rem;
		margin-top: 0.1rem;
		border-radius: 0.6rem;
		width: 100%;
	}

	.game-setting-item {
		background-color: rgba(255, 255, 255, 0.7);
		margin-top: 0.7rem;
		padding: 0.5rem 0.8rem;
		border-radius: 0.3rem;
		display: flex;
		justify-content: space-between;

		& .label {
			color: #393939;
		}
		& .value {
			color: var(--color-second);
		}
	}
}

.room-footbar {
	height: 2.3rem;
	line-height: 2.3rem;
	width: 100%;
	color: #ffffff;
	background-color: rgba(255, 255, 255, 0.65);
	backdrop-filter: blur(0.2rem);
	background-color: var(--color-third);
	display: flex;
	justify-content: space-between;
	align-items: center;
	text-shadow: var(--text-shadow);
	overflow: hidden;

	& > .ready-button {
		width: 100%;
		height: 100%;
		padding: 0 0.7rem;
		border: 0;
		font-size: 1.2rem;
		text-shadow: var(--text-shadow);
	}
}
</style>
