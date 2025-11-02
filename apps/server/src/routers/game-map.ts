import { Router } from "express";
import multer from "multer";
import {
	createGameMap,
	deleteGameMap,
	getGameMapById,
	getGameMapList,
	setMapUse,
	updateGameMap,
} from "src/db/api/game-map";
import { ResInterface } from "src/interfaces/res";
import { deleteFiles, uploadFile } from "src/utils/file-uploader";
import { getFileNameInPath, randomString } from "src/utils";
import { renameFile } from "src/utils/file";

export const gameMapRouter = Router();
const gameMapMulter = multer({ dest: "public/gameMap" });

interface FileArray {
	[fieldname: string]: Express.Multer.File[];
}

gameMapRouter.post(
	"/create",
	gameMapMulter.fields([
		{ name: "game-map", maxCount: 1 },
		{ name: "cover-image", maxCount: 1 },
	]),
	async (req, res) => {
		if (!req.files) {
			const resContent: ResInterface = {
				status: 400,
				msg: "地图文件上传异常",
			};
			res.status(400).json(resContent);
			return;
		}
		const files = req.files as FileArray;

		const coverImageFile = files["cover-image"][0];
		const gameMapFile = files["game-map"][0];

		const newFileName = randomString(16);
		const coverImage = renameFile(newFileName, coverImageFile, [".png", ".jpg", ".jpeg"]);
		const gameMap = renameFile(newFileName, gameMapFile, [".fpmap"]);
		if (!coverImage || !gameMap) {
			const resMsg: ResInterface = {
				status: 500,
				msg: "文件后缀名不合法",
			};
			res.status(500).json(resMsg);
			return;
		}

		const { name, author, version, hash } = req.body;

		if (name && author && version && hash) {
			try {
				const gameMapFileUrl = await uploadFile({
					filePath: gameMap.filePath,
					name: gameMap.fileName,
					targetPath: `monopoly/game-map`,
				});
				const coverImageFileUrl = await uploadFile({
					filePath: coverImage.filePath,
					name: coverImage.fileName,
					targetPath: `monopoly/game-map`,
				});
				const map = await createGameMap({
					name,
					author,
					version,
					hash,
					mapUrl: gameMapFileUrl,
					coverUrl: coverImageFileUrl,
					inuse: false,
				});
				const resContent: ResInterface = {
					status: 200,
					msg: "添加地图成功",
					data: map,
				};
				res.status(200).json(resContent);
			} catch (e: any) {
				const resContent: ResInterface = {
					status: 500,
					msg: e.message || "数据库处理错误",
				};
				res.status(500).json(resContent);
			}
		} else {
			const resContent: ResInterface = {
				status: 400,
				msg: "请求参数错误",
			};
			res.status(400).json(resContent);
		}
	}
);

gameMapRouter.post(
	"/update",
	gameMapMulter.fields([
		{ name: "game-map", maxCount: 1 },
		{ name: "cover-image", maxCount: 1 },
	]),
	async (req, res) => {
		if (!req.files) {
			const resContent: ResInterface = {
				status: 400,
				msg: "地图文件上传异常",
			};
			res.status(400).json(resContent);
			return;
		}
		const files = req.files as FileArray;

		const coverImageFile = files["cover-image"][0];
		const gameMapFile = files["game-map"][0];

		const newFileName = randomString(16);
		const coverImage = renameFile(newFileName, coverImageFile, [".png", ".jpg", ".jpeg"]);
		const gameMap = renameFile(newFileName, gameMapFile, [".fpmap"]);
		if (!coverImage || !gameMap) {
			const resMsg: ResInterface = {
				status: 500,
				msg: "文件后缀名不合法",
			};
			res.status(500).json(resMsg);
			return;
		}

		const { id, author, name, version, hash } = req.body;

		if (id && author && name && version && hash) {
			try {
				const gameMapFileUrl = await uploadFile({
					filePath: gameMap.filePath,
					name: gameMap.fileName,
					targetPath: `monopoly/game-map`,
				});
				const coverImageFileUrl = await uploadFile({
					filePath: coverImage.filePath,
					name: coverImage.fileName,
					targetPath: `monopoly/game-map`,
				});
				const map = await updateGameMap({
					id,
					name,
					author,
					version,
					hash,
					mapUrl: gameMapFileUrl,
					coverUrl: coverImageFileUrl,
					inuse: false,
				});
				const resContent: ResInterface = {
					status: 200,
					msg: "添加地图成功",
					data: map,
				};
				res.status(200).json(resContent);
			} catch (e: any) {
				const resContent: ResInterface = {
					status: 500,
					msg: e.message || "数据库处理错误",
				};
				res.status(500).json(resContent);
			}
		} else {
			const resContent: ResInterface = {
				status: 400,
				msg: "请求参数错误",
			};
			res.status(400).json(resContent);
		}
	}
);

gameMapRouter.get("/info", async (req, res, next) => {
	const { id } = req.query;
	if (!id) {
		const resContent: ResInterface = {
			status: 400,
			msg: "请求参数错误, 缺少地图id",
		};
		res.status(400).json(resContent);
		return;
	}
	try {
		const resMsg: ResInterface = {
			status: 200,
			data: await getGameMapById(id.toString()),
		};
		res.status(200).json(resMsg);
	} catch {
		const resMsg: ResInterface = {
			status: 500,
			msg: "获取地图列表失败",
		};
		res.status(500).json(resMsg);
	}
});

gameMapRouter.get("/list", async (req, res, next) => {
	const { page = 1, size = 8 } = req.query;
	try {
		const { gameMapList, total } = await getGameMapList(parseInt(page.toString()), parseInt(size.toString()));
		const resMsg: ResInterface = {
			status: 200,
			data: { total, current: parseInt(page.toString()), gameMapList },
		};
		res.status(200).json(resMsg);
	} catch {
		const resMsg: ResInterface = {
			status: 500,
			msg: "获取地图列表失败",
		};
		res.status(500).json(resMsg);
	}
});

gameMapRouter.post("/set-use", async (req, res, next) => {
	const { id, use } = req.body;
	try {
		const gameMap = await setMapUse(id, use);
		const resMsg: ResInterface = {
			status: 200,
			msg: use ? "已启用地图" : "已禁用地图",
			data: gameMap,
		};
		res.status(200).json(resMsg);
	} catch {
		const resMsg: ResInterface = {
			status: 500,
			msg: "修改地图状态失败",
		};
		res.status(500).json(resMsg);
	}
});

gameMapRouter.delete("/delete", async (req, res, next) => {
	const { id } = req.query;
	if (id) {
		try {
			const gameMap = await deleteGameMap(id.toString());
			if (gameMap) {
				const coverImageFileName = getFileNameInPath(gameMap.coverUrl);
				console.log("🚀 ~ coverImageFileName:", coverImageFileName);
				const gameMapFileName = getFileNameInPath(gameMap.mapUrl);
				await deleteFiles([`monopoly/game-map/${coverImageFileName}`, `monopoly/game-map/${gameMapFileName}`]);
			} else {
				throw Error();
			}
			const resMsg: ResInterface = {
				status: 200,
				msg: "删除成功",
				data: gameMap,
			};
			res.status(200).json(resMsg);
		} catch (e: any) {
			const resMsg: ResInterface = {
				status: 500,
				msg: e.message || "数据库请求错误",
			};
			res.status(500).json(resMsg);
		}
	}
});
