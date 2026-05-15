import { SaveRecord, SaveSnapshot } from "./types";
import { IndexedDBSaveStorage, ISaveStorage } from "./IndexedDBSaveStorage";
import { randomString } from "@src/utils";

export class SaveManager {
	private storage: ISaveStorage;

	constructor(storage?: ISaveStorage) {
		this.storage = storage ?? new IndexedDBSaveStorage();
	}

	/**
	 * 保存快照到 IndexedDB
	 */
	async save(
		snapshot: SaveSnapshot,
		mapId: string,
		mapVersion: string,
		mapName: string,
	): Promise<void> {
		// 查找是否已有同一局游戏的存档记录
		const existingRecords = await this.storage.listByMap(mapId, mapVersion);
		// 取最近一次存档作为 previousSnapshot 回滚参考
		const latest = existingRecords.length > 0 ? existingRecords[existingRecords.length - 1] : null;

		const userIds = Object.keys(snapshot.playerSnapshots);
		const names = userIds.map(id => `Player-${id.slice(0, 4)}`);

		const record: SaveRecord = {
			id: randomString(16),
			mapId,
			mapVersion,
			mapName,
			saveTime: Date.now(),
			round: snapshot.currentRound,
			playerCount: userIds.length,
			playerUserIds: userIds,
			playerNames: names,
			snapshot,
			previousSnapshot: latest?.snapshot,
		};

		await this.storage.save(record);
	}

	/**
	 * 按地图查询存档列表
	 */
	async listByMap(mapId: string, mapVersion: string): Promise<SaveRecord[]> {
		return this.storage.listByMap(mapId, mapVersion);
	}

	/**
	 * 读取指定存档
	 */
	async load(id: string): Promise<SaveRecord | null> {
		return this.storage.load(id);
	}

	/**
	 * 删除存档
	 */
	async delete(id: string): Promise<void> {
		return this.storage.delete(id);
	}

	/**
	 * 校验玩家身份
	 */
	validatePlayers(
		record: SaveRecord,
		roomUserIds: string[],
	): { valid: boolean; aiPlayerIds: string[]; error?: string } {
		const saveUserIds = record.playerUserIds;

		for (const roomUserId of roomUserIds) {
			if (!saveUserIds.includes(roomUserId)) {
				return {
					valid: false,
					aiPlayerIds: [],
					error: `玩家 ${roomUserId} 不属于该存档，无法读取`,
				};
			}
		}

		const aiPlayerIds = saveUserIds.filter(id => !roomUserIds.includes(id));

		return { valid: true, aiPlayerIds };
	}
}
