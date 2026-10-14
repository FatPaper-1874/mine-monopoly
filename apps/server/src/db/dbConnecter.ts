import { DataSource } from "typeorm";
import { env } from "@mine-monopoly/env";
import { User } from "#src/db/entities/User";
import { GameMap } from "#src/db/entities/GameMap";
import { GameRecord } from "#src/db/entities/GameRecord";
import { MapKey } from "#src/db/entities/MapKey";
import { AdminAuditLog } from "#src/db/entities/AdminAuditLog";
import { MapReviewNotifySetting } from "#src/db/entities/MapReviewNotifySetting";

export const AppDataSource = new DataSource({
	type: "mysql",
	host: env("MYSQL_HOST"),
	port: env<number>("MYSQL_PORT"),
	username: env("MYSQL_USERNAME"),
	password: env("MYSQL_PASSWORD"),
	database: "monopoly",
	synchronize: true,
	entities: [User, GameMap, GameRecord, MapKey, AdminAuditLog, MapReviewNotifySetting],
	extra: {
		connectionLimit: env<number>("MYSQL_POOL_SIZE", 20),
		acquireTimeout: env<number>("MYSQL_ACQUIRE_TIMEOUT", 30000),
		connectTimeout: 10000,
		enableKeepAlive: true,
		keepAliveInitialDelay: 30000,
	},
});