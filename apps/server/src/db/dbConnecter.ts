import { DataSource } from "typeorm";
import { env } from "@mine-monopoly/env";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const AppDataSource = new DataSource({
	type: "mysql",
	host: process.env.NODE_ENV == "production" ? "mysql" : "localhost",
	port: env<number>("MYSQL_PORT"),
	username: env("MYSQL_USERNAME"),
	password: env("MYSQL_PASSWORD"),
	database: "monopoly",
	synchronize: true,
	entities: [__dirname + "/entities/*{.js,.ts}"],
});
