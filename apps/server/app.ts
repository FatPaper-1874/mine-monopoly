import "reflect-metadata";
import { AppDataSource } from "#src/db/dbConnecter";
import express, { ErrorRequestHandler, RequestHandler } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import rateLimit from "express-rate-limit";
import { routerUser } from "#src/routers/user";
import { roomRouter } from "#src/routers/room-router";
import { serverLog } from "#src/utils/logger";
import chalk from "chalk";
import { roleValidation } from "#src/utils/role-validation";
import { PeerServer } from "peer";
import { gameMapRouter } from "#src/routers/game-map";
import { coturnRouter } from "#src/routers/coturn-router";
import { env } from "@mine-monopoly/env";

async function bootstrap() {
	try {
		await AppDataSource.initialize().then(() => {
			serverLog(`${chalk.bold.bgGreen(" 数据库连接成功 ")}`);
		});

		const app = express();

		app.set("trust proxy", true);
		app.use(cors());

		app.use("/static", express.static("public"));

		app.use(roleValidation); //身份验证

		app.use(bodyParser.json());

		app.use("/user/register", rateLimit({
			windowMs: 60 * 60 * 1000,
			max: 5,
			message: { status: 429, msg: "注册请求过于频繁，请稍后再试" },
			standardHeaders: true,
			legacyHeaders: false,
		}));
		app.use("/user/login", rateLimit({
			windowMs: 60 * 1000,
			max: 10,
			message: { status: 429, msg: "登录请求过于频繁，请稍后再试" },
			standardHeaders: true,
			legacyHeaders: false,
		}));

		app.use("/user", routerUser);
		app.use("/room-router", roomRouter);
		app.use("/game-map", gameMapRouter);
		app.use("/coturn", coturnRouter);

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
		const peerServer = PeerServer({
			port: iceServerPort,
		}, () => {
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
