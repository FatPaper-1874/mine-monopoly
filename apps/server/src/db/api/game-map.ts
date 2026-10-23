import type { GameMapInDb, GameMapStatus } from "@mine-monopoly/types";
import { AppDataSource } from "#src/db/dbConnecter";
import { GameMap } from "#src/db/entities/GameMap";
import { FindOptionsWhere, IsNull } from "typeorm";

const gameMapRepository = AppDataSource.getRepository(GameMap);

export type CreateGameMapInput = Omit<GameMapInDb, "id">;

export const createGameMap = async (info: CreateGameMapInput) => {
	const gameMapToCreate = new GameMap();
	Object.assign(gameMapToCreate, info);

	return await gameMapRepository.save(gameMapToCreate);
};

export const updateGameMap = async (info: GameMapInDb) => {
	const gameMapToUpdate = await gameMapRepository.findOne({ where: { id: info.id } });
	if (!gameMapToUpdate) throw Error("查找地图错误");
	Object.assign(gameMapToUpdate, info);
	return await gameMapRepository.save(gameMapToUpdate);
};

export const setMapUse = async (id: string, use: boolean) => {
	const gameMap = await gameMapRepository.findOne({
		where: { id },
	});
	if (gameMap) {
		gameMap.inuse = use;
		return gameMapRepository.save(gameMap);
	} else {
		null;
	}
};

export const deleteGameMap = async (id: string) => {
	const gameMap = await gameMapRepository.findOne({
		where: { id },
	});
	if (gameMap) {
		return gameMapRepository.remove(gameMap);
	} else {
		null;
	}
};

export const getGameMapById = async (id: string, options?: { publishedOnly?: boolean }) => {
	const where: FindOptionsWhere<GameMap> = { id };
	if (options?.publishedOnly) where.status = "published";
	const gameMap = await gameMapRepository.findOne({ where });
	if (gameMap) {
		return gameMap;
	} else {
		return null;
	}
};

export const getGameMapList = async (
	page: number,
	size: number,
	options?: { publishedOnly?: boolean; inuse?: boolean }
) => {
	const qb = gameMapRepository
		.createQueryBuilder("map")
		.leftJoinAndSelect("map.creator", "creator");
	if (options?.publishedOnly) qb.andWhere("map.status = :status", { status: "published" });
	if (options?.inuse !== undefined) qb.andWhere("map.inuse = :inuse", { inuse: options.inuse });
	qb.addSelect(
		"CASE WHEN map.creatorId IS NULL OR creator.isAdmin = TRUE THEN 1 ELSE 0 END",
		"isOfficialOrder"
	)
		.orderBy("isOfficialOrder", "DESC")
		.addOrderBy("map.version", "DESC")
		.skip((page - 1) * size)
		.take(size);
	const [gameMapList, total] = await qb.getManyAndCount();
	const list = gameMapList.map(withCreatorInfo);
	return { gameMapList: list, total };
};

/** 附加创作者展示信息（用户名/账号/官方标识），剥离 User 实体敏感字段 */
function withCreatorInfo(gameMap: GameMap) {
	const creator = gameMap.creator;
	return {
		id: gameMap.id,
		name: gameMap.name,
		author: gameMap.author,
		version: gameMap.version,
		description: gameMap.description,
		pendingChangelog: gameMap.pendingChangelog,
		changelog: gameMap.changelog ?? [],
		hash: gameMap.hash,
		coverUrl: gameMap.coverUrl,
		mapUrl: gameMap.mapUrl,
		inuse: gameMap.inuse,
		creatorId: gameMap.creatorId,
		status: gameMap.status,
		rejectReason: gameMap.rejectReason,
		pendingUrl: gameMap.pendingUrl,
		pendingSourceUrl: gameMap.pendingSourceUrl,
		sourceUrl: gameMap.sourceUrl,
		pendingHash: gameMap.pendingHash,
		pendingVersion: gameMap.pendingVersion,
		reviewSubmittedAt: gameMap.reviewSubmittedAt ?? null,
		creatorName: creator?.username ?? null,
		creatorAccount: creator?.useraccount ?? null,
		// 官方地图：管理员直建（creator 为空）或创作者是管理员
		isOfficial: !creator || creator.isAdmin === true,
	};
}

/** 获取地图详情（附带创作者信息与官方标识） */
export const getGameMapDetail = async (id: string, options?: { publishedOnly?: boolean }) => {
	const where: FindOptionsWhere<GameMap> = { id };
	if (options?.publishedOnly) where.status = "published";
	const gameMap = await gameMapRepository.findOne({ where, relations: { creator: true } });
	if (gameMap) {
		return withCreatorInfo(gameMap);
	} else {
		return null;
	}
};

export const countGameMapsByCreator = async (creatorId: string) => {
	return await gameMapRepository.count({ where: { creatorId } });
};

export const getGameMapByCreator = async (id: string, creatorId: string) => {
	return await gameMapRepository.findOne({ where: { id, creatorId } });
};

export const createPendingGameMap = async (info: {
	creatorId: string;
	name: string;
	author: string;
	description: string;
	coverUrl: string;
	pendingUrl: string;
	pendingSourceUrl: string | null;
	pendingHash: string;
	pendingVersion: string;
	pendingChangelog: string | null;
}) => {
	return await createGameMap({
		name: info.name,
		author: info.author,
		version: 0,
		description: info.description,
		pendingChangelog: info.pendingChangelog,
		changelog: [],
		hash: "",
		coverUrl: info.coverUrl,
		mapUrl: "",
		inuse: false,
		creatorId: info.creatorId,
		status: "reviewing",
		rejectReason: null,
		pendingUrl: info.pendingUrl,
		pendingSourceUrl: info.pendingSourceUrl,
		sourceUrl: null,
		pendingHash: info.pendingHash,
		pendingVersion: info.pendingVersion,
		reviewSubmittedAt: new Date(),
	});
};

export const updatePendingGameMap = async (gameMap: GameMap, info: {
	name: string;
	description: string;
	coverUrl?: string;
	pendingUrl: string;
	pendingSourceUrl: string | null;
	pendingHash: string;
	pendingVersion: string;
	pendingChangelog: string | null;
	author: string;
}) => {
	gameMap.name = info.name;
	gameMap.author = info.author;
	gameMap.description = info.description;
	gameMap.pendingChangelog = info.pendingChangelog;
	if (info.coverUrl !== undefined) gameMap.coverUrl = info.coverUrl;
	gameMap.pendingUrl = info.pendingUrl;
	gameMap.pendingSourceUrl = info.pendingSourceUrl;
	gameMap.pendingHash = info.pendingHash;
	gameMap.pendingVersion = info.pendingVersion;
	gameMap.status = "reviewing";
	gameMap.rejectReason = null;
	// 重新提交视为重新入队，刷新待审队列的排序与通知时间
	gameMap.reviewSubmittedAt = new Date();
	return await gameMapRepository.save(gameMap);
};

export const reviewGameMap = async (id: string, action: "approve" | "reject" | "offline" | "online") => {
	const gameMap = await gameMapRepository.findOne({ where: { id } });
	if (!gameMap) throw new Error("地图不存在");

	if (action === "approve") {
		if (!gameMap.pendingUrl) throw new Error("没有待审核版本");
		gameMap.mapUrl = gameMap.pendingUrl;
		gameMap.sourceUrl = gameMap.pendingSourceUrl;
		gameMap.hash = gameMap.pendingHash || gameMap.hash;
		gameMap.pendingUrl = null;
		gameMap.pendingSourceUrl = null;
		gameMap.pendingHash = null;
		const pendingSemver = gameMap.pendingVersion;
		gameMap.pendingVersion = null;
		gameMap.rejectReason = null;
		const nextVersion = (gameMap.version || 0) + 1;
		gameMap.version = nextVersion;
		// 固化更新日志：非空才追加，避免产生空历史条目
		if (gameMap.pendingChangelog?.trim()) {
			const history = gameMap.changelog ?? [];
			history.push({
				version: nextVersion,
				semver: pendingSemver,
				content: gameMap.pendingChangelog.trim(),
				createdAt: new Date().toISOString(),
			});
			gameMap.changelog = history;
		}
		gameMap.pendingChangelog = null;
		gameMap.status = "published";
		// 审核通过即视为启用：创作者上传的新地图通过后直接进入客户端可选列表，无需管理端再次手动启用
		gameMap.inuse = true;
	}
	if (action === "reject") {
		gameMap.status = "rejected";
		gameMap.pendingUrl = null;
		gameMap.pendingSourceUrl = null;
		gameMap.pendingHash = null;
		gameMap.pendingVersion = null;
		gameMap.pendingChangelog = null;
	}
	if (action === "offline") {
		if (gameMap.status !== "published") throw new Error("仅已发布地图可下架");
		gameMap.status = "offline";
	}
	if (action === "online") {
		if (!gameMap.mapUrl) throw new Error("没有已发布文件，无法上架");
		gameMap.status = "published";
	}
	return await gameMapRepository.save(gameMap);
};

export const setGameMapRejectReason = async (gameMap: GameMap, reason: string) => {
	gameMap.rejectReason = reason;
	return await gameMapRepository.save(gameMap);
};

/** 将存量地图绑定到指定创作者（creatorId 为 null 的历史地图） */
export const bindGameMapCreator = async (id: string, creatorId: string) => {
	const gameMap = await gameMapRepository.findOne({ where: { id } });
	if (!gameMap) throw new Error("地图不存在");
	if (gameMap.creatorId) throw new Error("该地图已绑定创作者");
	gameMap.creatorId = creatorId;
	return await gameMapRepository.save(gameMap);
};

export const getAdminGameMapList = async (options: {
	page: number;
	size: number;
	creatorId?: string;
	status?: GameMapStatus;
	/** "newest"：待审队列排序（最近入队在前，无入队时间的存量数据排在最后），默认保持历史排序 */
	sort?: "newest";
	/** 分页游标（ISO 时间）：只返回入队时间不晚于该时刻的数据，避免新提交把列表整体挤动导致跨页重复 */
	cursor?: Date;
}) => {
	const qb = gameMapRepository
		.createQueryBuilder("map")
		.leftJoinAndSelect("map.creator", "creator");
	if (options.creatorId) qb.andWhere("map.creatorId = :creatorId", { creatorId: options.creatorId });
	if (options.status) qb.andWhere("map.status = :status", { status: options.status });

	if (options.sort === "newest") {
		// MySQL 的 DESC 会把 NULL 排在最后，存量数据（本次改动前提交）本来就在这里，符合「最新的在前」
		qb.orderBy("map.reviewSubmittedAt", "DESC").addOrderBy("map.version", "DESC");
		if (options.cursor) {
			qb.andWhere("(map.reviewSubmittedAt IS NULL OR map.reviewSubmittedAt <= :cursor)", {
				cursor: options.cursor,
			});
		}
	} else {
		qb.orderBy("map.status", "ASC").addOrderBy("map.version", "DESC");
	}

	qb.skip((options.page - 1) * options.size).take(options.size);
	const [gameMapList, total] = await qb.getManyAndCount();
	return { gameMapList: gameMapList.map(withCreatorInfo), total };
};

/** 当前待审（status = reviewing）地图总数，供通知文案使用 */
export const countReviewingMaps = async () => {
	return await gameMapRepository.count({ where: { status: "reviewing" } });
};

export const detachPublishedMapsAndRemoveDraftsByCreator = async (creatorId: string) => {
	const maps = await gameMapRepository.find({ where: { creatorId } });
	const deletedMaps: GameMap[] = [];
	for (const gameMap of maps) {
		if (gameMap.status === "published") {
			gameMap.creatorId = null;
			await gameMapRepository.save(gameMap);
		} else {
			deletedMaps.push(await gameMapRepository.remove(gameMap));
		}
	}
	return deletedMaps;
};

/**
 * 启动时修补历史数据：status 字段上线前创建的地图仍停留在默认值 "reviewing"，
 * 但它们有已发布的文件且处于启用状态，这里把它们补成 "published"。
 *
 * 限定条件很重要：只处理「无待审版本(pendingUrl IS NULL) 且 有已发布文件(mapUrl != '')」的
 * 这类残留数据。否则重启会把审核中的地图直接置为已发布（待审队列被清空）、
 * 把已下架/已驳回的地图重新发布。
 *
 * 注意：已下架(status=offline)的存量地图不会被重新发布，"下架"语义优先于"启用"。
 */
export const publishExistingInUseMaps = async () => {
	await gameMapRepository
		.createQueryBuilder()
		.update(GameMap)
		.set({ status: "published" })
		.where("inuse = :inuse", { inuse: true })
		.andWhere("status = :status", { status: "reviewing" })
		.andWhere("pendingUrl IS NULL")
		.andWhere("mapUrl != ''")
		.execute();
};

export const getActiveMapKeyOwnerMapCount = async (userId: string) => {
	return await gameMapRepository.count({ where: { creatorId: userId } });
};