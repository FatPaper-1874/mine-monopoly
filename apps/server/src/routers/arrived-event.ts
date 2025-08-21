import {Router} from "express";
import multer from "multer";
import path from "path";
import {
    bindArrivedEventToMapItem,
    createArrivedEvent,
    deleteArrivedEvent,
    getArrivedEventById,
    getArrivedEventsList, unbindArrivedEventFromMapItem,
    updateArrivedEvent,
} from "../db/api/arrived-event";
import {ResInterface} from "../interfaces/res";
import {uploadFile} from "../utils/file-uploader";

export const routerArrivedEvent = Router();
const iconUploaderMulter = multer({dest: "public/arrived_event_icon"});


routerArrivedEvent.post("/create", iconUploaderMulter.single("icon"), async (req, res, next) => {
    if (!req.file) {
        const resMsg: ResInterface = {
            status: 403,
            msg: "创建到达事件必须要上传icon",
        };
        res.status(resMsg.status).json(resMsg);
        return
    }
    if (req.file.originalname) {
        const fileType = path.parse(req.file?.originalname).ext;
        if (!fileType) {
            const resMsg: ResInterface = {
                status: 500,
                msg: "文件后缀名不合法",
            };
            res.status(resMsg.status).json(resMsg);
            return;
        }
        const filePath = req.file.path;
        const fileName = req.file.filename + fileType;
        const fileUrl = await uploadFile({filePath, targetPath: "monopoly/arrived_event_icons/", name: fileName});

        if (req.body.name) {
            const {name, describe, effectCode} = req.body;
            try {
                await createArrivedEvent(name, describe, fileUrl, effectCode);
            } catch (e: any) {
                const resMsg: ResInterface = {
                    status: 500,
                    msg: e.message,
                };
                res.status(resMsg.status).json(resMsg);
                return;
            }
            const resMsg: ResInterface = {
                status: 200,
                msg: "ArrivedEvent创建成功",
            };
            res.status(resMsg.status).json(resMsg);
        } else {
            const resMsg: ResInterface = {
                status: 500,
                msg: "没有icon文件名",
            };
            res.status(resMsg.status).json(resMsg);
            return;
        }
    }
});

routerArrivedEvent.post("/update", iconUploaderMulter.single("icon"), async (req, res, next) => {
    let newFileUrl = "";
    if (req.file && req.file.originalname) {
        const fileType = path.parse(req.file.originalname).ext;
        if (!fileType) {
            const resMsg: ResInterface = {
                status: 500,
                msg: "文件后缀名不合法",
            };
            res.status(resMsg.status).json(resMsg);
            return;
        }
        const filePath = req.file.path;
        const fileName = req.file.filename + fileType;
        newFileUrl = await uploadFile({filePath, targetPath: "monopoly/arrived_event_icons/", name: fileName});
    }

    const {id, name, describe, effectCode} = req.body;
    if (id && name && describe && effectCode != undefined) {
        try {
            await updateArrivedEvent(id, name, describe, newFileUrl, effectCode);
        } catch (e: any) {
            const resMsg: ResInterface = {
                status: 500,
                msg: e.message,
            };
            res.status(resMsg.status).json(resMsg);
            return;
        }
        const resMsg: ResInterface = {
            status: 200,
            msg: "ArrivedEvent修改成功",
        };
        res.status(resMsg.status).json(resMsg);
    } else {
        const resMsg: ResInterface = {
            status: 500,
            msg: "参数错误",
        };
        res.status(resMsg.status).json(resMsg);
        return;
    }
});

routerArrivedEvent.get("/info", async (req, res, next) => {
    const id = req.query.id as string;
    if (id) {
        try {
            const resMsg: ResInterface = {
                status: 200,
                data: await getArrivedEventById(id),
            };
            res.status(resMsg.status).json(resMsg);
        } catch {
        }
    } else {
        const resMsg: ResInterface = {
            status: 500,
            msg: "获取到达事件信息失败, 无效的id",
        };
        res.status(resMsg.status).json(resMsg);
    }
});

routerArrivedEvent.delete("/delete", async (req, res, next) => {
    const {id} = req.query;
    if (id) {
        try {
            await deleteArrivedEvent(id.toString());
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

routerArrivedEvent.get("/list", async (req, res, next) => {
    const {page = -1, size = 8} = req.query;
    try {
        const {
            arrivedEventsList,
            total
        } = await getArrivedEventsList(parseInt(page.toString()), parseInt(size.toString()));
        const resMsg: ResInterface = {
            status: 200,
            data: {total, current: parseInt(page.toString()), arrivedEventsList},
        };
        res.status(resMsg.status).json(resMsg);
    } catch {
        const resMsg: ResInterface = {
            status: 500,
            msg: "获取到达事件列表失败",
        };
        res.status(resMsg.status).json(resMsg);
    }
});

routerArrivedEvent.post("/bind", async (req, res, next) => {
    const {arrivedEventId, mapItemId} = req.body;
    if (arrivedEventId && mapItemId) {
        try {
            await bindArrivedEventToMapItem(mapItemId, arrivedEventId);
            const resMsg: ResInterface = {
                status: 200,
                msg: "绑定mapItem成功",
            };
            res.status(resMsg.status).json(resMsg);
        } catch (e: any) {
            const resMsg: ResInterface = {
                status: 500,
                msg: e.msg,
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

routerArrivedEvent.post("/unbind", async (req, res, next) => {
    const {mapItemId} = req.body;
    if (mapItemId) {
        try {
            await unbindArrivedEventFromMapItem(mapItemId);
            const resMsg: ResInterface = {
                status: 200,
                msg: "MapItem事件解除绑定成功",
            };
            res.status(resMsg.status).json(resMsg);
        } catch (e: any) {
            const resMsg: ResInterface = {
                status: 500,
                msg: e.message,
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