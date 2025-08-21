import { Router } from "express";
import { ResInterface } from "../interfaces/res";
import {
	createMap,
	getMapById,
	getMapsList,
	deleteMap,
	updateIndexList,
	setBackground,
	getMapIndexsByMapId,
	updateHouseModelList,
	updateMapName,
	updateMapUseState,
} from "../db/api/map";
import { getMapItemListByMapId } from "../db/api/mapItem";
import { getStreetListByMapId } from "../db/api/street";
import { getItemTypeListByMapId } from "../db/api/item-type";
import { getPropertysListByMapId } from "../db/api/property";
import { getChanceCardsListByMapId } from "../db/api/chance-card";
import path from "path";
import multer from "multer";
import { uploadFile } from "../utils/file-uploader";
import { verToken } from "../utils/token";

export const routerMap = Router();
const backgroundMulter = multer({ dest: "public/backgrounds" });

routerMap.post("/create", async (req, res, next) => {
	const { name } = req.body;
	if (name) {
		try {
			res.status(200).json({ data: await createMap(name) });
		} catch {
			const resMsg: ResInterface = {
				status: 500,
				msg: "创建地图失败",
			};
			res.status(resMsg.status).json(resMsg);
		}
	} else {
		const resMsg: ResInterface = {
			status: 500,
			msg: "没有传递name",
		};
		res.status(resMsg.status).json(resMsg);
	}
});

routerMap.post("/update-index-list", async (req, res, next) => {
	const { id, indexList } = req.body;
	if (id && indexList) {
		try {
			await updateIndexList(id, indexList);
			if (indexList.length == 0) {
				const resMsg: ResInterface = {
					status: 400,
					msg: "已清空地图路径",
				};
				res.status(resMsg.status).json(resMsg);
			} else {
				const resMsg: ResInterface = {
					status: 200,
					msg: "更新地图路径成功",
				};
				res.status(resMsg.status).json(resMsg);
			}
		} catch {
			const resMsg: ResInterface = {
				status: 500,
				msg: "更新地图路径失败",
			};
			res.status(resMsg.status).json(resMsg);
		}
	} else {
		const resMsg: ResInterface = {
			status: 400,
			msg: "参数错误",
		};
		res.status(resMsg.status).json(resMsg);
	}
});

routerMap.post("/update-house-model-list", async (req, res, next) => {
	const { id, houseModels } = req.body as {
		id: string | undefined;
		houseModels: { lv0: string; lv1: string; lv2: string } | undefined;
	};
	if (id && houseModels) {
		try {
			await updateHouseModelList(id, houseModels);
			const resMsg: ResInterface = {
				status: 200,
				msg: "更新地图房子模型成功",
			};
			res.status(resMsg.status).json(resMsg);
		} catch (e: any) {
			const resMsg: ResInterface = {
				status: 500,
				msg: "更新地图房子模型失败",
			};
			res.status(resMsg.status).json(resMsg);
		}
	} else {
		const resMsg: ResInterface = {
			status: 400,
			msg: "参数错误",
		};
		res.status(resMsg.status).json(resMsg);
	}
});

routerMap.delete("/delete", async (req, res, next) => {
	const { id } = req.query;
	if (id) {
		try {
			await deleteMap(id.toString());
			const resMsg: ResInterface = {
				status: 200,
				msg: "删除成功",
			};
			res.status(resMsg.status).json(resMsg);
		} catch (e: any) {
			const resMsg: ResInterface = {
				status: 500,
				msg: e.toString(),
			};
			res.status(resMsg.status).json(resMsg);
		}
	}
});

routerMap.get("/info", async (req, res, next) => {
	const id = req.query.id as string;
	const isFromConsole = req.query.console as string;
	if (id) {
		try {
			const resMsg: ResInterface = {
				status: 200,
				data: await getMapById(id, Boolean(isFromConsole)),
			};
			res.status(resMsg.status).json(resMsg);
		} catch (e: any) {
			const resMsg: ResInterface = {
				status: 500,
				msg: e.toString(),
			};
			res.status(resMsg.status).json(resMsg);
		}
	}
});

routerMap.get("/item-type", async (req, res, next) => {
	const id = req.query.id as string;
	if (id) {
		try {
			const resMsg: ResInterface = {
				status: 200,
				data: await getItemTypeListByMapId(id),
			};
			res.status(resMsg.status).json(resMsg);
		} catch {}
	}
});

routerMap.get("/map-item", async (req, res, next) => {
	const id = req.query.id as string;
	if (id) {
		try {
			const resMsg: ResInterface = {
				status: 200,
				data: await getMapItemListByMapId(id),
			};
			res.status(resMsg.status).json(resMsg);
		} catch (e: any) {
			const resMsg: ResInterface = {
				status: 400,
				msg: e.message,
			};
			res.status(resMsg.status).json(resMsg);
		}
	}
});

routerMap.get("/street", async (req, res, next) => {
	const id = req.query.id as string;
	if (id) {
		try {
			const resMsg: ResInterface = {
				status: 200,
				data: await getStreetListByMapId(id),
			};
			res.status(resMsg.status).json(resMsg);
		} catch {}
	}
});

routerMap.get("/property", async (req, res, next) => {
	const id = req.query.id as string;
	if (id) {
		try {
			const resMsg: ResInterface = {
				status: 200,
				data: await getPropertysListByMapId(id),
			};
			res.status(resMsg.status).json(resMsg);
		} catch {}
	}
});

routerMap.get("/chance-card", async (req, res, next) => {
	const id = req.query.id as string;
	if (id) {
		try {
			const resMsg: ResInterface = {
				status: 200,
				data: await getChanceCardsListByMapId(id),
			};
			res.status(resMsg.status).json(resMsg);
		} catch {}
	}
});

routerMap.get("/map-indexs", async (req, res, next) => {
	const id = req.query.id as string;
	if (id) {
		try {
			const resMsg: ResInterface = {
				status: 200,
				data: await getMapIndexsByMapId(id),
			};
			res.status(resMsg.status).json(resMsg);
		} catch (e: any) {
			const resMsg: ResInterface = {
				status: 500,
				data: e.message,
			};
			res.status(resMsg.status).json(resMsg);
		}
	}
});

routerMap.get("/list", async (req, res, next) => {
	let isAdmin = false;
	const token = req.headers.authorization;
	if (token) {
		const tokenInfo = await verToken(token);
		if (!tokenInfo) {
			const resContent: ResInterface = {
				status: 401,
				msg: "token解析失败",
			};
			res.status(401).json(resContent);
			return;
		}
		isAdmin = tokenInfo.isAdmin;
	}

	const { page = 1, size = 8 } = req.query;
	try {
		const { mapsList, total } = await getMapsList(parseInt(page.toString()), parseInt(size.toString()), isAdmin);
		const resMsg: ResInterface = {
			status: 200,
			data: { total, current: parseInt(page.toString()), mapsList },
		};
		res.status(resMsg.status).json(resMsg);
	} catch {
		const resMsg: ResInterface = {
			status: 500,
			msg: "获取地图列表失败",
		};
		res.status(resMsg.status).json(resMsg);
	}
});

routerMap.post("/background", backgroundMulter.single("background"), async (req, res, next) => {
	// console.log(req.file);
	if (req.file?.originalname) {
		const fileType = path.parse(req.file?.originalname).ext;
		if (!fileType && !fileType.includes("png") && !fileType.includes("jpg")) {
			const resMsg: ResInterface = {
				status: 500,
				msg: "文件后缀名不合法",
			};
			res.status(resMsg.status).json(resMsg);
			return;
		}
		const filePath = req.file.path;
		const fileName = req.file.filename + fileType;
		const fileUrl = await uploadFile({ filePath, targetPath: "monopoly/backgrounds/", name: fileName });

		if (req.body.mapId) {
			const mapId = req.body.mapId;
			try {
				await setBackground(mapId, fileUrl);
			} catch {
				const resMsg: ResInterface = {
					status: 500,
					msg: "背景添加失败",
				};
				res.status(resMsg.status).json(resMsg);
				return;
			}
			const resMsg: ResInterface = {
				status: 200,
				msg: "背景添加成功",
				data: fileUrl,
			};
			res.status(resMsg.status).json(resMsg);
		} else {
			const resMsg: ResInterface = {
				status: 500,
				msg: "没有文件名",
			};
			res.status(resMsg.status).json(resMsg);
			return;
		}
	}
});

routerMap.post("/update-name", async (req, res, next) => {
	const { id, name } = req.body;
	if (id && name) {
		await updateMapName(id, name);
		const resMsg: ResInterface = {
			status: 200,
			msg: "更新地图名成功",
		};
		res.status(resMsg.status).json(resMsg);
	} else {
		const resMsg: ResInterface = {
			status: 400,
			msg: "参数错误",
		};
		res.status(resMsg.status).json(resMsg);
		return;
	}
});

routerMap.post("/update-inuse", async (req, res, next) => {
	const { id, inUse } = req.body;
	if (id && inUse !== undefined) {
		await updateMapUseState(id, inUse);
		const resMsg: ResInterface = {
			status: 200,
			msg: inUse ? "地图启用成功" : "地图禁用成功",
		};
		res.status(resMsg.status).json(resMsg);
	} else {
		const resMsg: ResInterface = {
			status: 400,
			msg: "参数错误",
		};
		res.status(resMsg.status).json(resMsg);
		return;
	}
});
