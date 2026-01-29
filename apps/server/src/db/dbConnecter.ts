import { DataSource } from "typeorm";
import { MYSQL_PASSWORD, MYSQL_PORT, MYSQL_USERNAME } from "@mine-monopoly/config";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const AppDataSource = new DataSource({
	type: "mysql",
	host: process.env.NODE_ENV == "production" ? "mysql" : "localhost",
	port: MYSQL_PORT,
	username: MYSQL_USERNAME,
	password: MYSQL_PASSWORD,
	database: "monopoly",
	synchronize: true,
	entities: [__dirname + "/entities/*{.js,.ts}"],
});
