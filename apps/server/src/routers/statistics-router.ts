import { Router } from "express";
import { AppDataSource } from "#src/db/dbConnecter";
import { User } from "#src/db/entities/User";
import { GameRecord } from "#src/db/entities/GameRecord";
import { ResInterface } from "#src/interfaces/res";

export const statisticsRouter = Router();

const userRepository = AppDataSource.getRepository(User);
const gameRecordRepository = AppDataSource.getRepository(GameRecord);

statisticsRouter.get("/users", async (req, res) => {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
	sevenDaysAgo.setHours(0, 0, 0, 0);

	const [totalUsers, onlineUsers, adminUsers, newUsersToday, trendRows] = await Promise.all([
		userRepository.count(),
		userRepository.count({ where: { online: true } }),
		userRepository.count({ where: { isAdmin: true } }),
		userRepository.createQueryBuilder("user").where("user.create_time >= :today", { today }).getCount(),
		userRepository
			.createQueryBuilder("user")
			.select("DATE(user.create_time)", "date")
			.addSelect("COUNT(*)", "count")
			.where("user.create_time >= :sevenDaysAgo", { sevenDaysAgo })
			.groupBy("DATE(user.create_time)")
			.orderBy("DATE(user.create_time)", "ASC")
			.getRawMany(),
	]);

	const trend = buildTrend(trendRows, sevenDaysAgo);

	res.json(<ResInterface>{
		status: 200,
		data: { totalUsers, onlineUsers, adminUsers, newUsersToday, trend },
	});
});

statisticsRouter.get("/games", async (req, res) => {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
	sevenDaysAgo.setHours(0, 0, 0, 0);

	const [totalGames, todayGames, avgResult, trendRows, topMaps, topRoomIds] = await Promise.all([
		gameRecordRepository.count(),
		gameRecordRepository.createQueryBuilder("record").where("record.create_time >= :today", { today }).getCount(),
		gameRecordRepository.createQueryBuilder("record").select("AVG(record.duration)", "avgDuration").getRawOne(),
		gameRecordRepository
			.createQueryBuilder("record")
			.select("DATE(record.create_time)", "date")
			.addSelect("COUNT(*)", "count")
			.where("record.create_time >= :sevenDaysAgo", { sevenDaysAgo })
			.groupBy("DATE(record.create_time)")
			.orderBy("DATE(record.create_time)", "ASC")
			.getRawMany(),
		gameRecordRepository
			.createQueryBuilder("record")
			.select("record.mapId", "mapId")
			.addSelect("record.mapName", "mapName")
			.addSelect("COUNT(*)", "count")
			.where("record.mapId IS NOT NULL")
			.groupBy("record.mapId")
			.addGroupBy("record.mapName")
			.orderBy("count", "DESC")
			.limit(5)
			.getRawMany(),
		gameRecordRepository
			.createQueryBuilder("record")
			.select("record.name", "roomId")
			.addSelect("COUNT(*)", "count")
			.groupBy("record.name")
			.orderBy("count", "DESC")
			.limit(5)
			.getRawMany(),
	]);

	const avgDuration = Math.round(Number(avgResult?.avgDuration || 0));
	const trend = buildTrend(trendRows, sevenDaysAgo);

	res.json(<ResInterface>{
		status: 200,
		data: { totalGames, todayGames, avgDuration, trend, topMaps, topRoomIds },
	});
});

function buildTrend(rows: { date: string; count: string }[], startDate: Date) {
	const trend: { date: string; count: number }[] = [];
	const countMap = new Map(rows.map((r) => [r.date, Number(r.count)]));

	for (let i = 0; i < 7; i++) {
		const d = new Date(startDate);
		d.setDate(d.getDate() + i);
		const dateStr = d.toISOString().slice(0, 10);
		trend.push({ date: dateStr, count: countMap.get(dateStr) || 0 });
	}
	return trend;
}
