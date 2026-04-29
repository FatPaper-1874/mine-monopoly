import "reflect-metadata";
import { AppDataSource } from "#src/db/dbConnecter";
import express, { ErrorRequestHandler, RequestHandler } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { routerUser } from "#src/routers/user";
import { roomRouter } from "#src/routers/room-router";
import { serverLog } from "#src/utils/logger";
import chalk from "chalk";
import { roleValidation } from "#src/utils/role-validation";
import { PeerServer } from "peer";
import { gameMapRouter } from "#src/routers/game-map";
import { env } from "@mine-monopoly/env";

async function bootstrap() {
	try {
		await AppDataSource.initialize().then(() => {
			serverLog(`${chalk.bold.bgGreen(" 数据库连接成功 ")}`);
		});

		const app = express();

		app.use(cors());

		app.use("/static", express.static("public"));

		app.use(roleValidation); //身份验证

		app.use(bodyParser.json());

		app.use("/user", routerUser);
		app.use("/room-router", roomRouter);
		app.use("/game-map", gameMapRouter);

		app.get("/health", (req, res) => {
			// 在这里进行服务的健康检查，返回适当的响应
			// 为了配合docker-compose按顺序启动
			res.status(200).send("OK");
		});

		app.use(handleError);

		const serverPort = env<number>("SERVER_PORT");
		app.listen(serverPort, () => {
			serverLog(`${chalk.bold.bgGreen(` API服务启动成功 ${serverPort}端口`)}`);
		});

		const iceServerPort = env<number>("ICE_SERVER_PORT");
		const peerServer = PeerServer({ port: iceServerPort }, () => {
			serverLog(`${chalk.bold.bgGreen(` ICE服务启动成功 ${iceServerPort}端口`)}`);
		});
	} catch (e: any) {
		serverLog(`${chalk.bold.bgRed(` 服务器出错: `)}`, "error");
		console.log(e);
	}
}

bootstrap();

const handleError: ErrorRequestHandler = (err, req, res, next) => {
	console.error(err.stack);
	res.status(500).send(`服务器错误:${err.message}`);
};
