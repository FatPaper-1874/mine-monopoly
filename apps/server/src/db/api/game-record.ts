import { AppDataSource } from "#src/db/dbConnecter";
import { GameRecord } from "#src/db/entities/GameRecord";

const gameRecordRepository = AppDataSource.getRepository(GameRecord);

export async function createRecord(name: string, duration: number) {
	const gameRecord = new GameRecord();
	gameRecord.name = name;
	gameRecord.duration = duration;

	return await gameRecordRepository.save(gameRecord);
}
