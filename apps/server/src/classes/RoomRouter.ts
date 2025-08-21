import WebSocket, { WebSocketServer } from "ws";
import fs from "fs";
import { MonopolyWebSocketMsgType } from "../enums/bace";
import { asyncMissionQueue, MissionQueueItem } from "../utils/async-mission-queue";
import { MonopolyWebSocketMsg } from "../interfaces/bace";
import { serverLog } from "../utils/logger";
import chalk from "chalk";

export class RoomRouter {
	private webSocketPort: number;

	private webSocketServer: WebSocketServer;

	//K：房间Id,  V：主机游戏进程的peerId
	private roomMap: Map<string, string> = new Map();

	constructor(webSocketPort: number) {
		this.webSocketPort = webSocketPort;
		this.webSocketServer = new WebSocketServer(
			{
				port: webSocketPort,
			},
			() => {
				serverLog(`${chalk.bold.bgGreen(` RoomRouter-WebSocket服务启动成功 ${webSocketPort}端口`)}`);
			}
		);
		this.webSocketServer.on("connection", async (client) => {
			sendToClient(client, MonopolyWebSocketMsgType.Connected, "success");

			let end = false;
			while (!end) {
				const missionQueue: MissionQueueItem<MonopolyWebSocketMsgType, MonopolyWebSocketMsg>[] = [
					{
						type: MonopolyWebSocketMsgType.JoinRoom,
						fn: (data, cancle) => {
							const roomId = data.data;
							if (!roomId) {
								sendToClient(client, MonopolyWebSocketMsgType.Error, "不合法的房间ID");
								throw Error("不合法的房间ID");
							}
							if (this.roomMap.has(roomId)) {
								//有Id就加入
								//Join Room
								sendToClient(client, MonopolyWebSocketMsgType.JoinRoom, this.roomMap.get(roomId));
								end = true;
								cancle("通讯结束");
							} else {
								//没有Id就创建
								sendToClient(client, MonopolyWebSocketMsgType.JoinRoom, {
									create: true,
									roomId: roomId,
								});

								//添加一条任务: 等待客户端生成游戏主机服务端
								missionQueue.push({
									type: MonopolyWebSocketMsgType.CreateRoom,
									fn: (data) => {
										const hostPeerId = data.data;
										this.roomMap.set(roomId, hostPeerId);
										end = true;
									},
								});
							}
						},
					},
				];
				await asyncMissionQueue<MonopolyWebSocketMsgType, MonopolyWebSocketMsg>((callback) => {
					const messageHandler = (event: WebSocket.MessageEvent) => {
						const data: MonopolyWebSocketMsg = JSON.parse(event.data.toString());
						callback(data);
					};
					client.addEventListener("message", messageHandler);
					return () => client.removeEventListener("message", messageHandler);
				}, missionQueue)
					.then((e) => {
						console.log(e);
					})
					.catch((e) => {
						console.log(e);
					});
			}
			console.dir(this.roomMap);
			client.close();
		});
	}
}

function sendToClient(ws: WebSocket, type: MonopolyWebSocketMsgType, data: any) {
	ws.send(JSON.stringify({ type, data }));
}
