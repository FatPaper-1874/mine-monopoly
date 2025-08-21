import AppDataSource from "../dbConnecter";
import { GameRecord } from "../entities/gameRecord";

const gameRecordRepository = AppDataSource.getRepository(GameRecord);

export async function createRecord(name: string, duration: number) {
	const gameRecord = new GameRecord();
	gameRecord.name = name;
	gameRecord.duration = duration;

	return await gameRecordRepository.save(gameRecord);
}
