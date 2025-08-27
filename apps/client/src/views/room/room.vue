<script setup lang="ts">
import MapPreviewer from "@src/views/room/components/map-previewer.vue";
import roomUserCard from "@src/views/room/components/room-user-card.vue";
import FpDialog from "@src/components/utils/fp-dialog/fp-dialog.vue";
import { FPMessage } from "@fatpaper-monopoly/ui";
import ItemSelector from "@src/components/utils/item-selector/item-selector.vue";
import { GameSetting } from "@src/interfaces/bace";
import router from "@src/router";
import { useLoading, useRoomInfo } from "@src/store";
import { useUserInfo } from "@src/store";
import { getGameMapList } from "@src/utils/api/map";
import { GameMap } from "@src/interfaces/game";
import { MapPreviewerRenderer } from "@src/views/room/utils/MapPreviewerRenderer";
import { MonopolyClient, useMonopolyClient } from "@src/classes/monopoly-client/MonopolyClient";
import { computed, onBeforeMount, onBeforeUnmount, onMounted, reactive, ref, toRaw, watch } from "vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { copyToClipboard } from "@src/utils";
import { setRoomPrivate } from "@src/utils/api/room-router";
import { GameMapInDb } from "@fatpaper-monopoly/types";
import { PROTOCOL } from "@fatpaper-monopoly/config";

const roomInfoStore = useRoomInfo();
const userInfoStore = useUserInfo();

const playerList = computed(() => roomInfoStore.userList);
const ownerName = computed(() => roomInfoStore.ownerName);
const ownerId = computed(() => roomInfoStore.ownerId);
const roomId = computed(() => roomInfoStore.roomId);
const roleList = computed(() => roomInfoStore.roleList);
const isPrivate = ref(true);

const isOwner = computed(() => userInfoStore.userId === roomInfoStore.ownerId);
const isReady = computed(() => roomInfoStore.userList.find((user) => user.userId === userInfoStore.userId)?.isReady);

const _mapList = ref<GameMapInDb[]>([]);
const gameSetting = computed(() => roomInfoStore.gameSetting);
const _tempMapSelectedId = ref<string>(gameSetting.value.mapId || "");

const _tempGameSettingFrom = ref<GameSetting>(JSON.parse(JSON.stringify(roomInfoStore.gameSetting)));

const _currentMap = ref<GameMapInDb>();
const coverImageUrl = computed(() => (_currentMap.value ? `${PROTOCOL}://${_currentMap.value.coverUrl}` : ""));

const mapSelectorVisible = ref(false);

const _selectMapButtonText = computed(() => (_currentMap.value ? _currentMap.value.name : "选择地图"));

const canStart = computed(
	() =>
		!(
			Boolean(gameSetting.value.mapId) &&
			roomInfoStore.userList.every((user) => user.userId === ownerId.value || user.isReady)
		)
);

watch(
	gameSetting,
	async (newGameSetting, oldGameSetting) => {
		const map = _mapList.value.find((_item) => _item.id === newGameSetting.mapId);
		if (map) {
			map;
			_currentMap.value = map;
		}
		_tempGameSettingFrom.value = JSON.parse(JSON.stringify(roomInfoStore.gameSetting));
	},
	{ deep: true }
);

onMounted(async () => {
	socketClient = useMonopolyClient();
	const { gameMapList } = await getGameMapList(1, 1000);
	_mapList.value = gameMapList;
	_currentMap.value = _mapList.value.find((_item) => _item.id === gameSetting.value.mapId);
});

let socketClient: MonopolyClient;

function handleLeaveRoom() {
	if (socketClient) {
		socketClient.leaveRoom();
	}
}

async function handleSetPrivate() {
	isPrivate.value = !isPrivate.value;
	const res = await setRoomPrivate(roomId.value, isPrivate.value);
}

async function handleCopyRoomId() {
	await copyToClipboard(roomId.value);
	FPMessage({
		type: "success",
		message: "房间ID成功复制到剪贴板, 快去邀请小伙伴吧!",
	});
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

function handleChangeMap() {
	if (socketClient) {
		_tempGameSettingFrom.value.mapId = _tempMapSelectedId.value;
		socketClient.changeGameSetting(toRaw(_tempGameSettingFrom.value));
	}
}

function handleUpdateGameSetting() {
	if (_tempGameSettingFrom.value.overMoney <= _tempGameSettingFrom.value.initMoney) {
		FPMessage({ type: "error", message: "目标金钱必须大于初始金钱" });
		return;
	}
	if (socketClient) {
		socketClient.changeGameSetting(toRaw(_tempGameSettingFrom.value));
	}
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
				<div class="map-cover-image">
					<img v-if="coverImageUrl" :src="coverImageUrl" />
				</div>
				<button
					class="select-map-button"
					:class="{ nomap: !Boolean(_tempGameSettingFrom.mapId) }"
					:disabled="!isOwner"
					@click="mapSelectorVisible = true"
				>
					{{ _selectMapButtonText }}
				</button>
			</div>

			<div class="map-option">
				<div class="options">
					<span class="label">目标金额</span>
					<div>
						<input
							:disabled="!isOwner"
							type="number"
							:min="_tempGameSettingFrom.initMoney"
							v-model="_tempGameSettingFrom.overMoney"
						/>￥
					</div>
				</div>
				<div class="options">
					<span class="label">骰子数量</span>
					<div>
						<input :disabled="!isOwner" type="number" min="1" max="5" v-model="_tempGameSettingFrom.diceNum" />个
					</div>
				</div>
				<div class="options">
					<span class="label">回合时间</span>
					<div>
						<input :disabled="!isOwner" type="number" min="5" max="30" v-model="_tempGameSettingFrom.roundTime" />秒
					</div>
				</div>
				<div class="options">
					<span class="label">初始金钱</span>
					<div>
						<input
							:disabled="!isOwner"
							type="number"
							min="1000"
							step="1000"
							v-model="_tempGameSettingFrom.initMoney"
						/>￥
					</div>
				</div>
				<div class="options">
					<span class="label">倍率涨幅</span>
					<div><input :disabled="!isOwner" type="number" min="0" v-model="_tempGameSettingFrom.multiplier" />倍</div>
				</div>
				<div class="options">
					<span class="label">涨幅频率</span>
					<div>
						<input
							:disabled="!isOwner"
							type="number"
							min="1"
							v-model="_tempGameSettingFrom.multiplierIncreaseRounds"
						/>回合
					</div>
				</div>
				<div class="options">
					<span class="label">机会卡可视</span>
					<div>
						<input :disabled="!isOwner" type="checkbox" v-model="_tempGameSettingFrom.chanceCardVisible" />
						<span>(玩家详情只显示机会卡数量)</span>
					</div>
				</div>
				<div class="options">
					<span class="label">摸鱼模式</span>
					<div>
						<input :disabled="!isOwner" type="checkbox" v-model="_tempGameSettingFrom.slackOffMode" />
						<span>(房主离开/隐藏视窗会暂停游戏)</span>
					</div>
				</div>
				<button v-if="isOwner" class="submit" @click="handleUpdateGameSetting">更新设置</button>
			</div>

			<div class="room-footbar">
				<button v-if="isOwner" :disabled="canStart" class="ready-button" @click="handleGameStart">
					{{ _currentMap ? "开始游戏" : "先选择地图吧" }}
				</button>
				<button v-else class="ready-button" @click="handleReadyToggle">
					{{ isReady ? "取消准备" : "准备" }}
				</button>
			</div>
		</div>

		<div class="right-container">
			<div class="player-list-container">
				<roomUserCard v-for="player in playerList" :key="player.userId" :user="player" />
				<roomUserCard v-for="i in 6 - playerList.length" :key="i" :user="undefined" />
			</div>
		</div>
	</div>
	<FpDialog @submit="handleChangeMap" v-model:visible="mapSelectorVisible">
		<template #title>选择地图 (点击想玩的地图然后确认)</template>
		<template #default>
			<ItemSelector
				:column="1"
				:multiple="false"
				:item-list="_mapList"
				key-name="id"
				v-model:selected-key="_tempMapSelectedId"
			>
				<template #item="map">
					<MapPreviewer :map="map" />
				</template>
			</ItemSelector>
		</template>
	</FpDialog>
</template>

<style lang="scss" scoped>
.room-page {
	width: 80vw;
	height: 85%;
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
		height: 2rem;
		// min-height: 1.5rem;
		margin-left: 0.3rem;
		border-radius: 0.4rem;
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
	border-radius: 0.6rem;
	border: 0.2rem solid #ffffff;
	background-color: #ffffff;
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
		border: 0;
		font-size: 0.8rem;
		padding: 0.6rem 1.2rem;
		border-radius: 0.6rem;
		z-index: 1;

		&.nomap:not([disabled]) {
			background-color: var(--color-second);
			animation: identifier 1s infinite ease-in-out;

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

	& > .map-cover-image {
		width: 100%;
		height: 100%;
		border-radius: 0.6rem;
		overflow: hidden;
		background-color: #ddd;

		img {
			width: 100%;
			height: 100%;
			display: block;
			object-fit: contain;
		}
	}
}

.map-option {
	width: 100%;
	padding: 0.6rem;
	box-sizing: border-box;
	flex: 1;
	overflow-y: auto;

	& > .options {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 0.4rem 0;
		color: var(--color-text-primary);
		padding: 0 0.5rem;

		& > span {
			width: 5rem;
		}

		& > div {
			display: flex;
			align-items: center;
			justify-content: space-between;
			flex: 1;

			& > input {
				width: 6rem;
				flex: 1;
				color: var(--color-text-primary);
				padding: 0.5rem 0.7rem;
				margin-right: 0.5rem;
			}

			& > input[type="checkbox"] {
				cursor: pointer;
				position: relative;
				margin: 0.7rem;
				width: 1.5rem;
				height: 1.5rem;
				display: block;
				flex: 0;

				&::after {
					position: absolute;
					top: 50%;
					left: 50%;
					transform: translate(-50%, -50%);
					color: #000;
					width: 1.6rem;
					height: 1.6rem;
					display: inline-block;
					visibility: visible;
					padding-left: 0px;
					text-align: center;
					content: " ";
					border-radius: 0.2rem;
				}

				&:checked::after {
					content: "✓";
					color: #fff;
					font-size: 1rem;
					font-weight: bold;
					background-color: var(--color-primary);
				}
			}

			& > span {
				flex: 1;
				font-size: 0.8rem;
			}
		}
	}

	& > .submit {
		float: right;
		font-size: 0.8rem;
		padding: 0.5rem;
		margin-top: 0.1rem;
		border-radius: 0.6rem;
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
