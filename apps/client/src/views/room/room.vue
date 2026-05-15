<script setup lang="ts">
import MapPreviewer from "@src/views/room/components/map-previewer.vue";
import roomUserCard from "@src/views/room/components/room-user-card.vue";
import FpDialog from "@src/components/utils/fp-dialog/fp-dialog.vue";
import { FPMessage } from "@mine-monopoly/ui";
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
import { FormSchema, GameMapInDb, GameSetting, RoleInRoom } from "@mine-monopoly/types";
import { loadGameMapFromServer } from "@src/utils/file/game-map";
import RolePreviewer from "./components/role-previewer.vue";
import { useResourceStore, useMapData } from "@src/store/game";
import { SaveManager, SaveRecord } from "@src/core/save";
import FpPopover from "@src/components/utils/fp-popover/fp-popover.vue";
import { arrayBufferToBase64 } from "@mine-monopoly/utils";
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

const saveManager = new SaveManager();
const saveRecords = ref<SaveRecord[]>([]);
const saveDialogVisible = ref(false);

// 地图相关
const mapList = ref<GameMapInDb[]>([]);
const mapSelectorVisible = ref(false);
const currentMap = computed(() => roomInfoStore.mapInfo);
const tempMapSelectedId = ref<string[]>(roomInfoStore.mapId ? [roomInfoStore.mapId] : []);

async function checkSaves() {
	if (!currentMap.value) {
		saveRecords.value = [];
		return;
	}
	const mapId = roomInfoStore.mapId;
	const mapVersion = useMapData().info?.version ?? "0.0.0";
	saveRecords.value = await saveManager.listByMap(mapId, mapVersion);
}

watch(currentMap, () => {
	checkSaves();
});

function handleChangeMap() {
	if (socketClient && tempMapSelectedId.value.length > 0 && tempMapSelectedId.value[0] !== currentMap.value?.id) {
		useLoading().showLoading("地图传输中...");
		socketClient.changeGameMap({ from: "server", data: tempMapSelectedId.value[0] });
	}
}

// 角色相关
const roleList = computed(() => roomInfoStore.roleList);
const roleSelectorVisible = ref(false);
const tempRoleSelectedId = ref<string[]>([]);

function handleChangeRole() {
	if (socketClient && tempMapSelectedId.value[0] !== currentMap.value?.id) {
		socketClient.changeRole(tempRoleSelectedId.value[0]);
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
		),
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

async function handleLoadSave(record: SaveRecord, usePrevious: boolean = false) {
	saveDialogVisible.value = false;
	useLoading().showLoading("正在加载存档...");

	try {
		if (socketClient) {
			const result = await socketClient.loadSave(record, usePrevious);
			if (!result.success) {
				FPMessage({ type: "error", message: result.error! });
			}
		}
	} catch (e: any) {
		FPMessage({ type: "error", message: `加载存档失败: ${e.message}` });
	} finally {
		useLoading().hideLoading();
	}
}

async function handleDeleteSave(record: SaveRecord) {
	try {
		await saveManager.delete(record.id);
		saveRecords.value = saveRecords.value.filter(r => r.id !== record.id);
		FPMessage({ type: "success", message: "存档已删除" });
	} catch (e: any) {
		FPMessage({ type: "error", message: `删除失败: ${e.message}` });
	}
}

async function handleSelectMap() {
	try {
		useLoading().showLoading("地图列表加载中...");
		const { gameMapList } = await getGameMapList(1, 1000);
		mapList.value = gameMapList;
		mapSelectorVisible.value = true;
	} catch {
		FPMessage({ type: "error", message: "加载地图列表失败" });
	} finally {
		useLoading().hideLoading();
	}
}

async function handleUploadMap() {
	const file = await new Promise<ArrayBuffer | null>((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".fpmap,.mmmap";
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (file) {
				const content = await file.arrayBuffer();
				resolve(content);
			}
		};
		input.addEventListener("cancel", () => resolve(null));
		input.click();
	});
	if (!file) return;
	if (!socketClient) return;
	//传输需要将地图从ArrayBuffer编码为Base64字符串
	socketClient.changeGameMap({ from: "custom", data: arrayBufferToBase64(file) });
	useLoading().showLoading("等待其他玩家确认");
}
</script>

<template>
	<div class="room-page">
		<div class="left-container">
			<div class="room-topbar">
				<button class="leave-room-button btn-small" @click="handleLeaveRoom">退出房间</button>
				<div class="room-name">
					<span>{{ ownerName }}的房间</span>
				</div>
			</div>

			<div class="room-id">
				<button v-if="isOwner" class="set-private-button btn-small" @click="handleSetPrivate">
					{{ isPrivate ? "点击公开" : "点击隐藏" }}
				</button>
				<div class="room-id-value" @click="handleCopyRoomId">
					房间ID:<span>{{ roomId }}</span>
				</div>
			</div>

			<div class="map-preview-inroom">
				<div class="map-cover-container">
					<MapPreviewer class="map-previewer" v-if="currentMap" :map="currentMap" />
					<span v-else>上传地图 & 选择官方地图</span>
				</div>
				<div class="select-map-button">
					<FpPopover v-if="isOwner" placement="top">
						<template #default>
							<button :class="{ nomap: !Boolean(roomInfoStore.mapId) }" class="btn-small" @click="handleUploadMap">
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
				<button
					class="game-setting-button btn-small"
					v-if="isOwner && currentMap"
					@click="gameSettingFormVisible = true"
				>
					修改地图参数
				</button>
				<div class="game-setting-item" v-for="(setting, key) in gameSettingForShow">
					<span class="label">{{ setting.label }}:</span>
					<span class="value">{{ setting.displayValue }}</span>
				</div>
			</div>

			<div class="room-footbar">
				<template v-if="isOwner">
					<div v-if="saveRecords.length > 0" class="footbar-row">
						<button :disabled="canStart" class="ready-button footbar-btn-start" @click="handleGameStart">
							{{ currentMap ? "开始游戏" : "先选择地图吧" }}
						</button>
						<button class="load-save-button btn-small footbar-btn-load" @click="saveDialogVisible = true">
							<FontAwesomeIcon style="font-size: 0.9rem; margin-right: 0.3rem" icon="clock-rotate-left" />
							读取存档
						</button>
					</div>
					<button v-else :disabled="canStart" class="ready-button" @click="handleGameStart">
						{{ currentMap ? "开始游戏" : "先选择地图吧" }}
					</button>
				</template>
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
				<roomUserCard v-for="i in Math.max(0, 6 - playerList.length)" :key="i" :user="undefined" />
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
	<FpDialog v-model:visible="saveDialogVisible" title="读取存档" @submit="saveDialogVisible = false" @cancel="saveDialogVisible = false">
		<div class="save-list">
			<div v-for="record in saveRecords" :key="record.id" class="save-item">
				<div class="save-item-header">
					<div class="save-map-name">{{ record.mapName }}</div>
					<div class="save-round-badge">回合 {{ record.round }}</div>
				</div>
				<div class="save-item-body">
					<div class="save-meta">
						<span class="save-players">
							<FontAwesomeIcon style="font-size: 0.8rem; margin-right: 0.25rem" icon="users" />
							{{ record.playerNames.join(", ") }}
						</span>
						<span class="save-time">
							<FontAwesomeIcon style="font-size: 0.8rem; margin-right: 0.25rem" icon="clock" />
							{{ new Date(record.saveTime).toLocaleString() }}
						</span>
					</div>
					<div class="save-actions">
						<button class="btn-small save-load-btn" @click="handleLoadSave(record, false)">
							<FontAwesomeIcon style="font-size: 0.8rem; margin-right: 0.25rem" icon="play" />
							读取
						</button>
						<button
							class="btn-small save-delete-btn"
							@click="handleDeleteSave(record)"
						>
							<FontAwesomeIcon style="font-size: 0.8rem; margin-right: 0.25rem" icon="trash-can" />
							删除
						</button>
					</div>
				</div>
			</div>
			<div v-if="saveRecords.length === 0" class="save-empty">
				<FontAwesomeIcon style="font-size: 1.5rem; margin-bottom: 0.5rem" icon="box-open" />
				<span>没有找到存档</span>
			</div>
		</div>
	</FpDialog>
</template>

<style lang="scss" scoped>
@import "@src/assets/variables.scss";

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
		width: 21rem;
		margin-right: 0.5rem;
		box-sizing: border-box;
		border-radius: 0.6rem;
		backdrop-filter: blur(0.2rem);
		box-shadow: var(--box-shadow);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
		@include felt-patch(#ffedb7);
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
	position: absolute;
	top: -1rem;
	width: 100%;
	color: #ffffff;
	z-index: 20;

	& > .leave-room-button {
		height: 2.2rem;
		position: absolute;
		top: 0.3rem;
		left: -0.3rem;
		padding: 0 0.7rem;
		font-size: 1rem;
		text-shadow: var(--text-shadow);
		border-radius: 0.6rem;
		transform: rotate(-2.5deg);
	}

	& > .room-name {
		background-image: var(--texture-felt);
		border-radius: 0.6rem;
		height: 2.7rem;
		font-size: 1.1rem;
		display: block;
		position: absolute;
		right: 0.5rem;
		text-align: center;
		width: 70%;
		background-color: var(--color-third);
		text-shadow: var(--text-shadow);
		display: flex;
		justify-content: center;
		align-items: center;
		box-shadow:
			0 0.15rem 0 darken($color-second, 12%),
			0 0.2rem 0.3rem rgba(0, 0, 0, 0.15);
	}
}

.room-id {
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 0.6rem;
	margin-top: 1.5rem;
	margin-bottom: 0.4rem;
	padding: 0.3rem;

	& > .set-private-button {
		font-size: 0.8rem;
		margin-left: 0.3rem;
		border-radius: 0.3rem;
		transform: rotate(-1deg);
	}

	& .room-id-value {
		flex: 1;
		font-size: 0.8rem;
		padding: 0.2rem;
		text-align: center;
		background-color: rgba(255, 255, 255, 0.5);
		color: var(--color-third);
		user-select: none;
		font-size: 1rem;
		border-radius: 0.4rem;
		cursor: pointer;
		width: 100%;
		display: flex;
		justify-content: center;
		align-items: center;

		& > span {
			font-size: 1.1rem;
			margin-left: 0.8rem;
			user-select: text;
			color: var(--color-second);
			border-radius: 0.4rem;
			padding: 0 0.4rem;
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
						background-color: lighten($color-second, 10%);
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

	& .game-setting-button {
		font-size: 0.8rem;
		padding: 0.5rem;
		margin-top: 0.1rem;
		border-radius: 0.6rem;
		width: 100%;
	}

	.game-setting-item {
		background-color: #ffffff;
		background-image: var(--texture-felt);
		margin-top: 0.7rem;
		padding: 0.5rem 0.8rem;
		border: 0.2rem solid #ffffff;
		border-radius: 0.5rem;
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
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: 0.4rem;

	& > .ready-button {
		width: 100%;
		height: 2.7rem;
		padding: 0 0.7rem;
		border: 0;
		font-size: 1.2rem;
		text-shadow: var(--text-shadow);
		margin-bottom: 0;
		border-radius: 0.5rem;
	}

	.footbar-row {
		display: flex;
		gap: 0.4rem;
		width: 100%;

		.footbar-btn-start {
			flex: 2;
			height: 2.7rem;
			padding: 0 0.7rem;
			border: 0;
			font-size: 1.2rem;
			text-shadow: var(--text-shadow);
			border-radius: 0.5rem;
		}

		.footbar-btn-load {
			flex: 1;
			height: 2.7rem;
			font-size: 1rem;
			background-color: var(--color-third);
			display: flex;
			justify-content: center;
			align-items: center;
		}
	}

	.load-save-button {
		display: flex;
		justify-content: center;
		align-items: center;
	}
}

.save-list {
	display: flex;
	flex-direction: column;
	gap: 0.6rem;
	max-height: 24rem;
	overflow-y: auto;
	padding: 0.2rem;

	.save-item {
		background-color: rgba(255, 255, 255, 0.8);
		border-radius: 0.6rem;
		box-shadow: var(--box-shadow);
		overflow: hidden;

		.save-item-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 0.6rem 0.8rem;
			border-bottom: 1px solid rgba(0, 0, 0, 0.06);

			.save-map-name {
				font-weight: bold;
				font-size: 1rem;
				color: var(--color-primary);
			}

			.save-round-badge {
				font-size: 0.85rem;
				padding: 0.15rem 0.5rem;
				border-radius: 1rem;
				background-color: var(--color-primary);
				color: white;
				font-weight: 500;
			}
		}

		.save-item-body {
			padding: 0.6rem 0.8rem;
			display: flex;
			flex-direction: column;
			gap: 0.5rem;

			.save-meta {
				display: flex;
				justify-content: space-between;
				font-size: 0.85rem;
				color: #666;

				.save-players, .save-time {
					display: flex;
					align-items: center;
				}
			}

			.save-actions {
				display: flex;
				gap: 0.4rem;

				.save-load-btn {
					flex: 1;
					background-color: var(--color-primary);
					color: white;
					display: flex;
					justify-content: center;
					align-items: center;
				}

				.save-delete-btn {
					background-color: #e74c3c;
					color: white;
					display: flex;
					justify-content: center;
					align-items: center;
					box-shadow: 0 0.15rem 0 darken(#c0392b, 12%),
						0 0.2rem 0.3rem rgba(0, 0, 0, 0.15);

					&:hover {
						box-shadow: 0 0.2rem 0 darken(#e74c3c, 12%),
							0 0.3rem 0.4rem rgba(0, 0, 0, 0.2);
					}
				}
			}
		}
	}

	.save-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		color: #999;
		font-size: 0.95rem;
		gap: 0.3rem;
	}
}
</style>
