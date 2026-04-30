import { Router } from "express";
import { roleValidation } from "#src/utils/role-validation";
import { ResInterface } from "#src/interfaces/res";
import { verToken } from "#src/utils/token";
import { privateKey, publicKey } from "#src/utils/rsakey";
import { createUser, deleteUser, getUserById, getUserList, userLogin } from "#src/db/api/user";
import { setToken } from "#src/utils/token";
import { getStorage, avatarMulter, validateAndRename } from "#src/utils/storage";
import { randomString } from "#src/utils";

export const routerUser = Router();

routerUser.get("/is-admin", async (req, res, next) => {
	const token = req.headers.authorization;
	if (!token) {
		const resContent: ResInterface = {
			status: 401,
			msg: "没有携带token",
		};
		res.status(401).json(resContent);
		return;
	}
	const tokenInfo = await verToken(token);
	if (!tokenInfo) {
		const resContent: ResInterface = {
			status: 401,
			msg: "token解析失败",
		};
		res.status(401).json(resContent);
		return;
	}
	const isAdmin = tokenInfo.isAdmin;
	if (isAdmin) {
		const resContent: ResInterface = {
			status: 200,
			data: { isAdmin: true },
		};
		res.status(200).json(resContent);
	} else {
		const resContent: ResInterface = {
			status: 403,
			msg: "你不是管理员喔",
		};
		res.status(403).json(resContent);
	}
});

routerUser.get("/list", async (req, res, next) => {
	const { page = 1, size = 8 } = req.query;
	try {
		const { userList, total } = await getUserList(parseInt(page.toString()), parseInt(size.toString()));
		const resMsg: ResInterface = {
			status: 200,
			data: { total, current: parseInt(page.toString()), userList },
		};
		res.status(200).json(resMsg);
	} catch {
		const resMsg: ResInterface = {
			status: 500,
			msg: "获取用户列表失败",
		};
		res.status(500).json(resMsg);
	}
});

routerUser.get("/info", async (req, res, next) => {
	const token = req.body.token || req.header("authorization") || req.query.token;
	if (token) {
		try {
			//@ts-ignore
			const { userId } = verToken(token);
			const user = await getUserById(userId);
			if (user) {
				const resMsg: ResInterface = {
					status: 200,
					data: user,
				};
				res.status(200).json(resMsg);
			} else {
				const resMsg: ResInterface = {
					status: 401,
					msg: "获取用户信息异常",
				};
				res.status(401).json(resMsg);
			}
		} catch (err: any) {
			const resMsg: ResInterface = {
				status: 401,
				msg: "Token过期或失效，请重新登录",
			};
			res.status(401).json(resMsg);
		}
	} else {
		const resMsg: ResInterface = {
			status: 401,
			msg: "身份验证失败：没有附带token",
			data: {},
		};
		res.status(401).json(resMsg);
	}
});

routerUser.get("/public-key", async (req, res, next) => {
	const resMsg: ResInterface = {
		status: 200,
		data: publicKey,
	};
	res.status(200).json(resMsg);
});

routerUser.delete("/delete", async (req, res, next) => {
	const { id } = req.query;
	if (id) {
		try {
			const resMsg: ResInterface = {
				status: 200,
				msg: "删除成功",
				data: await deleteUser(id.toString()),
			};
			res.status(200).json(resMsg);
		} catch (e) {
			const resMsg: ResInterface = {
				status: 500,
				msg: "数据库请求错误",
			};
			res.status(500).json(resMsg);
		}
	}
});

routerUser.post("/login", async (req, res) => {
	const { useraccount, password } = req.body;
	if (useraccount && password) {
		try {
			const user = await userLogin(useraccount, password, privateKey);
			const tokenExpireTimeMs = 60 * 1000;
			const token = await setToken(user.id, user.isAdmin, tokenExpireTimeMs);
			// setRedis(user.id, token, tokenExpireTimeMs);

			const resContent: ResInterface = {
				status: 200,
				msg: "登录成功",
				data: token,
			};
			res.status(200).json(resContent);
		} catch (e: any) {
			const resContent: ResInterface = {
				status: 400,
				msg: e.message,
			};
			res.status(400).json(resContent);
		}
	} else {
		const resContent: ResInterface = {
			status: 400,
			msg: "请求参数错误",
		};
		res.status(400).json(resContent);
	}
});

routerUser.post("/register", avatarMulter.single("avatar"), async (req, res) => {
	if (!req.file) {
		const resContent: ResInterface = {
			status: 400,
			msg: "头像上传异常",
		};
		res.status(400).json(resContent);
		return;
	}

	const { useraccount, username, password, color } = req.body;

	if (!(useraccount && username && password && color)) {
		const resContent: ResInterface = {
			status: 400,
			msg: "请求参数错误",
		};
		res.status(400).json(resContent);
		return;
	}

	try {
		const { fileName, filePath } = await validateAndRename(
			randomString(16),
			req.file,
			[".png", ".jpg", ".jpeg"],
		);
		const avatarUrl = await getStorage().upload({
			filePath,
			name: fileName,
			targetPath: "user/avatars",
		});
		const user = await createUser(useraccount, username, password, avatarUrl, color || undefined);
		const resContent: ResInterface = {
			status: 200,
			msg: "注册成功",
			data: user,
		};
		res.status(200).json(resContent);
	} catch (e: any) {
		const resContent: ResInterface = {
			status: 500,
			msg: e.message || "服务器处理错误",
		};
		res.status(500).json(resContent);
	}
});

