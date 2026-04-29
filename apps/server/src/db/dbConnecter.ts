import { DataSource } from "typeorm";
import { env } from "@mine-monopoly/env";
import { User } from "#src/db/entities/User";
import { GameMap } from "#src/db/entities/GameMap";
import { GameRecord } from "#src/db/entities/GameRecord";

export const AppDataSource = new DataSource({
	type: "mysql",
	host: env("MYSQL_HOST"),
	port: env<number>("MYSQL_PORT"),
	username: env("MYSQL_USERNAME"),
	password: env("MYSQL_PASSWORD"),
	database: "monopoly",
	synchronize: true,
	entities: [User, GameMap, GameRecord],
});
