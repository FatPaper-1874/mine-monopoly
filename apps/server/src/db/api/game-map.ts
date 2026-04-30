import type { GameMapInDb } from "@mine-monopoly/types";
import { AppDataSource } from "#src/db/dbConnecter";
import { GameMap } from "#src/db/entities/GameMap";

const gameMapRepository = AppDataSource.getRepository(GameMap);

export const createGameMap = async (info: Omit<GameMapInDb, "id">) => {
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

export const getGameMapById = async (id: string) => {
	const gameMap = await gameMapRepository.findOne({
		where: { id },
	});
	if (gameMap) {
		return gameMap;
	} else {
		return null;
	}
};

export const getGameMapList = async (page: number, size: number) => {
	const gameMapList = await gameMapRepository.find({
		skip: (page - 1) * size,
		take: size,
	});
	// const total = Math.round((await userRepository.count()) / size);
	const total = await gameMapRepository.count();
	return { gameMapList, total };
};
