import "reflect-metadata";
import fs from "fs";
import path from "path";
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
import { statisticsRouter } from "#src/routers/statistics-router";
import { env } from "@mine-monopoly/env";
import { User } from "#src/db/entities/User";

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

		// 定时清理超时在线用户
		setInterval(async () => {
			try {
				const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);
				await AppDataSource.getRepository(User)
					.createQueryBuilder()
					.update(User)
					.set({ online: false })
					.where("online = true AND lastActiveTime < :twoMinAgo", { twoMinAgo })
					.execute();
			} catch {}
		}, 2 * 60 * 1000);

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
	app.use("/statistics", statisticsRouter);

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
		const peerServerWithEvents = peerServer as {
			on?: (event: string, handler: (...args: any[]) => void) => void;
		};
		if (typeof peerServerWithEvents.on === "function") {
			peerServerWithEvents.on("error", (error: unknown) => {
				const err = error instanceof Error ? error : new Error(String(error));
				serverLog(`${chalk.bold.bgRed(" ICE服务 WebSocket 异常 ")}`, "error");
				console.error({
					message: err.message,
					code: (err as any).code,
					statusCode: (err as any)[Object.getOwnPropertySymbols(err).find((symbol) => symbol.toString() === "Symbol(status-code)") as any],
					stack: err.stack,
				});
			});
		}

		const adminPort = env<number>("MONOPOLY_ADMIN_PORT");
		const adminApp = express();
		adminApp.use(express.static("admin-dist", { index: false }));
		// Inject runtime env vars for admin frontend
		adminApp.get("/env.js", (req, res) => {
			res.type("application/javascript");
			res.send("window.__RUNTIME_ENV__=" + JSON.stringify({
				PROTOCOL: process.env.PROTOCOL || '',
				MONOPOLY_DOMAIN: process.env.MONOPOLY_DOMAIN || '',
				SERVER_PORT: process.env.SERVER_PORT || '',
				ADMIN_BASE_PREFIX: process.env.ADMIN_BASE_PREFIX || '',
				API_BASE_PREFIX: process.env.API_BASE_PREFIX || '',
				MAP_ENCRYPT_KEY: process.env.MAP_ENCRYPT_KEY || '',
			}) + ";");
		});

		const adminBasePrefix = env("ADMIN_BASE_PREFIX", "");
		if (adminBasePrefix && !/^\/[a-zA-Z0-9_-]+$/.test(adminBasePrefix)) {
			throw new Error(`ADMIN_BASE_PREFIX must be a clean path like "/monopoly-admin", got: "${adminBasePrefix}"`);
		}
		let adminIndexHtml: string | null = null;

		adminApp.get("*", (req, res) => {
			res.type("text/html");
			if (!adminIndexHtml) {
				try {
					adminIndexHtml = fs.readFileSync(path.join(process.cwd(), "admin-dist/index.html"), "utf-8");
				} catch {
					serverLog(`${chalk.bold.bgRed(" admin-dist/index.html not found ")}`, "error");
					return res.status(500).send("Admin panel not available");
				}
			}
			if (adminBasePrefix) {
				const prefixed = adminIndexHtml
					.replace(/(src|href)="\.?\/(assets\/)/g, `$1="${adminBasePrefix}/$2`)
					.replace(/(src|href)="\.?\/env\.js"/g, `$1="${adminBasePrefix}/env.js"`)
					.replace(/(src|href)="\.?\/logo\.ico"/g, `$1="${adminBasePrefix}/logo.ico"`);
				res.send(prefixed);
			} else {
				res.send(adminIndexHtml);
			}
		});
		adminApp.listen(adminPort, () => {
			serverLog(`${chalk.bold.bgGreen(` Admin服务启动成功 ${adminPort}端口`)}`);
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
