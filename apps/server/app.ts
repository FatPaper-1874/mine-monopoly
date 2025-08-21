import "reflect-metadata";
import AppDataSource from "./src/db/dbConnecter";
import express, { ErrorRequestHandler, RequestHandler } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import routerModel from "./src/routers/model";
import { routerUser } from "./src/routers/user";
import { routerMap } from "./src/routers/map";
import { routerRole } from "./src/routers/role";
import { routerItemType } from "./src/routers/item-type";
import { routerMapItem } from "./src/routers/mapItem";
import { routerStreet } from "./src/routers/street";
import { routerProperty } from "./src/routers/property";
import { routerChanceCard } from "./src/routers/chance-card";
import { routerMusic } from "./src/routers/music";
import { roomRouter } from "./src/routers/room-router";
import { serverLog } from "./src/utils/logger";
import chalk from "chalk";
import { __APIPORT__, __ICE_SERVER_PORT__, __USERSERVERHOST__ } from "./global.config";
import { getPublicKey } from "./src/utils/api/keys";
import { roleValidation } from "./src/utils/role-validation";
import { routerArrivedEvent } from "./src/routers/arrived-event";
import { RoomRouter } from "./src/classes/RoomRouter";
import { PeerServer } from "peer";

// import { roleValidation } from "./src/utils/role-validation";

async function bootstrap() {
	try {
		await AppDataSource.initialize().then(() => {
			serverLog(`${chalk.bold.bgGreen(" 数据库连接成功 ")}`);
		});

		const publicKey = await getPublicKey();
		serverLog(`${chalk.bold.bgGreen(" 用户服务器连接成功 ")}`);

		const app = express();

		app.use(cors());

		app.use("/static", express.static("public"));

		app.use(roleValidation); //身份验证

		app.use(bodyParser.json());

		app.use("/user", routerUser);
		app.use("/role", routerRole);
		app.use("/model", routerModel);
		app.use("/map", routerMap);
		app.use("/item-type", routerItemType);
		app.use("/arrived-event", routerArrivedEvent);
		app.use("/map-item", routerMapItem);
		app.use("/street", routerStreet);
		app.use("/property", routerProperty);
		app.use("/chance-card", routerChanceCard);
		app.use("/music", routerMusic);
		app.use("/room-router", roomRouter);

		app.get("/health", (req, res) => {
			// 在这里进行服务的健康检查，返回适当的响应
			// 为了配合docker-compose按顺序启动
			res.status(200).send("OK");
		});

		app.use(handleError);

		app.listen(__APIPORT__, () => {
			serverLog(`${chalk.bold.bgGreen(` API服务启动成功 ${__APIPORT__}端口`)}`);
		});

		const peerServer = PeerServer({ port: __ICE_SERVER_PORT__ }, () => {
			serverLog(`${chalk.bold.bgGreen(` ICE服务启动成功 ${__ICE_SERVER_PORT__}端口`)}`);
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
