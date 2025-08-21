import {Router} from "express";
import {ResInterface} from "../interfaces/res";
import {createRole, deleteRole, getRoleList, updateRole} from "../db/api/role";
import path from "path";
import fs from "fs";
import multer from "multer";
import crypto from "crypto";
import {deleteModel} from "../db/api/model";
import {uploadFiles} from "../utils/file-uploader";
import {getFileNameInPath} from "../utils";

export const routerRole = Router();
const roleUploaderMulter = multer({dest: "public/roles"});
const rolePreUploaderMulter = multer({dest: "public/temp"});

routerRole.get("/list", async (req, res, next) => {
    const {page = -1, size = 0} = req.query;
    try {
        const {roleList, total} = await getRoleList(parseInt(page.toString()), parseInt(size.toString()));
        const resMsg: ResInterface = {
            status: 200,
            data: {total, current: parseInt(page.toString()), roleList},
        };
        res.status(resMsg.status).json(resMsg);
    } catch {
        const resMsg: ResInterface = {
            status: 500,
            msg: "获取游戏角色列表失败",
        };
        res.status(resMsg.status).json(resMsg);
    }
});


routerRole.post("/create", roleUploaderMulter.array("role"), async (req, res, next) => {
    // console.log(req.file);
    const files = req.files;
    const acceptTypes = ['.json', '.atlas', '.png'];
    if (files && files instanceof Array) {
        //检查是否为三种文件;
        if (!checkFileTypes(acceptTypes, files)) {
            const resMsg: ResInterface = {
                status: 400,
                msg: "文件类型不正确，请上传.json, .atlas, .png三种文件",
            };
            res.status(400).json(resMsg);
            files.forEach(file => fs.unlink(file.path, (e) => {
            }))
            return
        }

        //对文件进行修改操作
        const newFileName = crypto.randomUUID();
        const newFilePathArr: string[] = [];
        files.forEach(file => {
            const fileType = path.parse(file.originalname).ext;
            const oldFilePath = file.path;
            const tempArr = oldFilePath.split('/');
            tempArr.pop();
            const newFilePath = `${tempArr.join('/')}/${newFileName + fileType}`;
            fs.renameSync(oldFilePath, newFilePath);
            newFilePathArr.push(newFilePath);
            if (fileType === ".atlas") {
                //修改atlas文件的png文件名
                try {
                    const data = fs.readFileSync(newFilePath, 'utf-8');
                    const lines = data.split('\n');
                    if (lines.length < 1) {
                        throw new Error("文件为空");
                    }
                    lines[1] = newFileName + '.png';

                    // 将修改后的内容重新组合成一个字符串
                    const modifiedData = lines.join('\n');
                    fs.writeFileSync(newFilePath, modifiedData, 'utf-8');
                } catch (e: any) {
                    const resMsg: ResInterface = {
                        status: 500,
                        msg: `在修改atlas文件时出错：${e.message}`,
                    };
                    res.status(500).json(resMsg);
                }
            }
        })

        const rolelName = req.body.name;
        const roleColor = req.body.color;
        if (rolelName && roleColor) {
            try {
                const fileUrls = await uploadFiles(newFilePathArr.map(filePath => {
                    const fileName = getFileNameInPath(filePath);
                    return {filePath, targetPath: 'monopoly/roles/', name: fileName}
                }));
                if (fileUrls.length > 0) {
                    const tempArr = fileUrls[0].split("/")
                    tempArr.pop();
                    const baseUrl = tempArr.join("/");
                    await createRole(rolelName, `${baseUrl}`, newFileName, roleColor);
                } else {
                    throw new Error("COS错误的返回值")
                }
            } catch {
                const resMsg: ResInterface = {
                    status: 500,
                    msg: "角色创建失败",
                };
                res.status(resMsg.status).json(resMsg);
                return;
            }
            const resMsg: ResInterface = {
                status: 200,
                msg: "角色创建成功",
            };
            res.status(resMsg.status).json(resMsg);
        } else {
            const resMsg: ResInterface = {
                status: 400,
                msg: "没有文件",
            };
            res.status(400).json(resMsg);
            return;
        }
    } else {
        const resMsg: ResInterface = {
            status: 500,
            msg: "没有上传文件",
        };
        res.status(500).json(resMsg);
    }
});

routerRole.post("/update", roleUploaderMulter.array("role"), async (req, res, next) => {
    // console.log(req.file);
    const files = req.files;
    const acceptTypes = ['.json', '.atlas', '.png'];

    if (files && files instanceof Array && files.length === 3) {
        //检查是否为三种文件;
        if (!checkFileTypes(acceptTypes, files)) {
            const resMsg: ResInterface = {
                status: 400,
                msg: "文件类型不正确，请上传.json, .atlas, .png三种文件",
            };
            res.status(400).json(resMsg);
            files.forEach(file => fs.unlink(file.path, (e) => {
            }))
            return
        }

        //对文件进行修改操作
        const newFileName = crypto.randomUUID();
        const newFilePathArr: string[] = [];
        files.forEach(file => {
            const fileType = path.parse(file.originalname).ext;
            const oldFilePath = file.path;
            const tempArr = oldFilePath.split('/');
            tempArr.pop();
            const newFilePath = `${tempArr.join('/')}/${newFileName + fileType}`;
            fs.renameSync(oldFilePath, newFilePath);
            newFilePathArr.push(newFilePath);
            if (fileType === ".atlas") {
                //修改atlas文件的png文件名
                try {
                    const data = fs.readFileSync(newFilePath, 'utf-8');
                    const lines = data.split('\n');
                    if (lines.length < 1) {
                        throw new Error("文件为空");
                    }
                    lines[1] = newFileName + '.png';

                    // 将修改后的内容重新组合成一个字符串
                    const modifiedData = lines.join('\n');
                    fs.writeFileSync(newFilePath, modifiedData, 'utf-8');
                } catch (e: any) {
                    const resMsg: ResInterface = {
                        status: 500,
                        msg: `在修改atlas文件时出错：${e.message}`,
                    };
                    res.status(500).json(resMsg);
                }
            }
        })
        const roleId = req.body.id;
        const roleName = req.body.name;
        const roleColor = req.body.color;
        if (roleId && roleName && roleColor) {
            try {
                await uploadFiles(newFilePathArr.map(filePath => {
                    const fileName = getFileNameInPath(filePath);
                    return {filePath, targetPath: 'monopoly/roles/', name: fileName}
                }));
                await updateRole(roleId, roleName, roleColor, newFileName);
            } catch {
                const resMsg: ResInterface = {
                    status: 500,
                    msg: "角色更新失败",
                };
                res.status(500).json(resMsg);
                return;
            }
            const resMsg: ResInterface = {
                status: 200,
                msg: "角色更新成功",
            };
            res.status(200).json(resMsg);
        } else {
            const resMsg: ResInterface = {
                status: 400,
                msg: "没有附带信息",
            };
            res.status(400).json(resMsg);
            return;
        }
    } else {
        const resMsg: ResInterface = {
            status: 500,
            msg: "没有上传文件",
        };
        res.status(500).json(resMsg);
        return;
    }
});

routerRole.delete("/delete", async (req, res, next) => {
    const {id} = req.query;
    if (id) {
        try {
            const resMsg: ResInterface = {
                status: 200,
                msg: "删除成功",
                data: await deleteRole(id.toString()),
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


routerRole.post("/pre-upload", rolePreUploaderMulter.array("role"), async (req, res, next) => {
    const files = req.files;
    const acceptTypes = ['.json', '.atlas', '.png'];
    if (files && files instanceof Array) {
        //检查是否为三种文件;
        if (!checkFileTypes(acceptTypes, files)) {
            const resMsg: ResInterface = {
                status: 400,
                msg: "文件类型不正确，请上传.json, .atlas, .png三种文件",
            };
            res.status(400).json(resMsg);
            files.forEach(file => fs.unlink(file.path, (e) => {
            }))
            return
        }

        const tempName = crypto.randomUUID();
        const tempFilePathList: string[] = [];
        files.forEach(file => {
            const fileType = path.parse(file.originalname).ext;
            const oldFileName = file.path;
            const tempArr = oldFileName.split('/');
            tempArr.pop();
            const newFileName = `${tempArr.join('/')}/${tempName + fileType}`;
            tempFilePathList.push(newFileName);
            fs.renameSync(oldFileName, newFileName);
            if (fileType === ".atlas") {
                //修改atlas文件的png文件名
                try {
                    const data = fs.readFileSync(newFileName, 'utf-8');
                    const lines = data.split('\n');
                    if (lines.length < 1) {
                        throw new Error();
                    }
                    lines[1] = tempName + '.png';

                    // 将修改后的内容重新组合成一个字符串
                    const modifiedData = lines.join('\n');
                    fs.writeFileSync(newFileName, modifiedData, 'utf-8');
                } catch (e: any) {
                    const resMsg: ResInterface = {
                        status: 500,
                        msg: "在修改atlas文件时出错",
                    };
                    res.status(500).json(resMsg);

                }
            }
        })
        //五分钟后删除临时文件
        setTimeout(() => {
            tempFilePathList.forEach(filePath => {
                fs.unlink(filePath, () => {
                });
            })
        }, 30000)
        const resJson: ResInterface = {
            status: 200,
            data: {fileName: tempName},
            msg: '文件预检成功'
        }
        res.status(200).json(resJson);
    } else {
        const resMsg: ResInterface = {
            status: 400,
            msg: "没有文件",
        };
        res.status(400).json(resMsg);
        return;
    }
});


function checkFileTypes(typesArr: string[], filesArr: Express.Multer.File[]) {
    const typesMap = new Map<string, boolean>();
    typesArr.forEach(type => typesMap.set(type, false));
    filesArr.forEach(file => {
        const fileType = path.parse(file.originalname).ext;
        if (typesArr.includes(fileType)) {
            typesMap.set(fileType, true);
        }
    })
    return Array.from(typesMap.values()).every(b => b);
}
