import {Router} from "express";
import {ResInterface} from "../interfaces/res";
import {createMusic, deleteMusic, getMusicList} from "../db/api/music";
import multer from "multer";
import path from "path";
import {uploadFile} from "../utils/file-uploader";

export const routerMusic = Router();

const musicUploaderMulter = multer({dest: "public/musics"});

routerMusic.post('/create', musicUploaderMulter.single("music"), async (req, res, next) => {
    if (req.file?.originalname) {
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
        const fileUrl = await uploadFile({filePath, targetPath: "monopoly/musics/", name: fileName})

        if (req.body.name) {
            const musicName = req.body.name;
            try {
                await createMusic(musicName, fileUrl);
            } catch {
                const resMsg: ResInterface = {
                    status: 500,
                    msg: "音乐添加失败",
                };
                res.status(resMsg.status).json(resMsg);
                return;
            }
            const resMsg: ResInterface = {
                status: 200,
                msg: "音乐添加成功",
            };
            res.status(resMsg.status).json(resMsg);
        } else {
            const resMsg: ResInterface = {
                status: 500,
                msg: "没有音乐文件名",
            };
            res.status(resMsg.status).json(resMsg);
            return;
        }
    }
})

routerMusic.get('/list', async (req, res, next) => {
    const { page = 1, size = 8 } = req.query;
    try {
        const { musicList, total } = await getMusicList(parseInt(page.toString()), parseInt(size.toString()));
        const resMsg: ResInterface = {
            status: 200,
            data: { total, current: parseInt(page.toString()), musicList },
        };
        res.status(resMsg.status).json(resMsg);
    } catch {
        const resMsg: ResInterface = {
            status: 500,
            msg: "获取音乐列表失败",
        };
        res.status(resMsg.status).json(resMsg);
    }
})

routerMusic.delete('/delete', async (req, res, next) => {
    const {id} = req.query;
    if (id) {
        try {
            const resMsg: ResInterface = {
                status: 200,
                msg: "删除成功",
                data: await deleteMusic(id.toString()),
            };
            res.status(resMsg.status).json(resMsg);
        } catch (e: any) {
            const resMsg: ResInterface = {
                status: 500,
                msg: e.message || "数据库请求错误",
            };
            res.status(resMsg.status).json(resMsg);
        }
    }
})

