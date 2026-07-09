import { Router } from "express";
import { env } from "@mine-monopoly/env";
import { roleValidation } from "#src/utils/role-validation";
import { ResInterface } from "#src/interfaces/res";
import { verToken } from "#src/utils/token";
import { privateKey, publicKey, encryptionKey } from "#src/utils/rsakey";
import { createUser, deleteUser, getUserById, getUserList, updateUser, userLogin } from "#src/db/api/user";
import { AppDataSource } from "#src/db/dbConnecter";
import { User } from "#src/db/entities/User";
import { setToken, setRefreshToken, verToken as verifyToken } from "#src/utils/token";
import { avatarMulter, withFileCleanup, cleanupTempFiles } from "#src/utils/storage";
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
	let tokenInfo;
	try {
		tokenInfo = await verToken(token);
	} catch {
		const resContent: ResInterface = {
			status: 401,
			msg: "token过期或失效，请重新登录",
		};
		res.status(401).json(resContent);
		return;
	}
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
	const { page = 1, size = 8, search, online, isAdmin, sortBy, sortOrder } = req.query;
	try {
		const onlineFilter =
			online === "true" ? true : online === "false" ? false : undefined;
		const isAdminFilter =
			isAdmin === "true" ? true : isAdmin === "false" ? false : undefined;
		const { userList, total } = await getUserList(
			parseInt(page.toString()),
			parseInt(size.toString()),
			{
				search: search?.toString(),
				online: onlineFilter,
				isAdmin: isAdminFilter,
				sortBy:
					sortBy === "createTime" ||
					sortBy === "lastActiveTime" ||
					sortBy === "username" ||
					sortBy === "useraccount"
						? sortBy
						: undefined,
				sortOrder: sortOrder === "ASC" || sortOrder === "DESC" ? sortOrder : undefined,
			}
		);
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

routerUser.get("/encryption-key", async (req, res, next) => {
	const resMsg: ResInterface = {
		status: 200,
		data: encryptionKey,
	};
	res.status(200).json(resMsg);
});

routerUser.post("/create", async (req, res) => {
	const { useraccount, username, password, color, isAdmin } = req.body;
	if (!(useraccount && username && password)) {
		const resContent: ResInterface = { status: 400, msg: "请求参数错误" };
		res.status(400).json(resContent);
		return;
	}
	if (isAdmin !== undefined && typeof isAdmin !== "boolean") {
		const resContent: ResInterface = { status: 400, msg: "isAdmin 参数类型错误" };
		res.status(400).json(resContent);
		return;
	}
	try {
		const user = await createUser(useraccount, username, password, "", color || undefined, isAdmin);
		const resContent: ResInterface = { status: 200, msg: "创建成功", data: user };
		res.status(200).json(resContent);
	} catch (e: any) {
		const resContent: ResInterface = { status: 500, msg: e.message || "服务器处理错误" };
		res.status(500).json(resContent);
	}
});

routerUser.post("/update", async (req, res) => {
	const { id, username, password, color, isAdmin } = req.body;
	if (!id) {
		const resContent: ResInterface = { status: 400, msg: "缺少用户ID" };
		res.status(400).json(resContent);
		return;
	}
	if (isAdmin !== undefined && typeof isAdmin !== "boolean") {
		const resContent: ResInterface = { status: 400, msg: "isAdmin 参数类型错误" };
		res.status(400).json(resContent);
		return;
	}
	try {
		const user = await updateUser(id, { username, password, color, isAdmin });
		const resContent: ResInterface = { status: 200, msg: "更新成功", data: user };
		res.status(200).json(resContent);
	} catch (e: any) {
		const resContent: ResInterface = { status: 500, msg: e.message || "服务器处理错误" };
		res.status(500).json(resContent);
	}
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
			const tokenExpireTimeMs = 30 * 60 * 1000;
			const token = await setToken(user.id, user.isAdmin, tokenExpireTimeMs);
			const refreshToken = await setRefreshToken(user.id, user.isAdmin);

			await AppDataSource.getRepository(User)
				.update({ id: user.id }, { online: true, lastActiveTime: new Date() });

			const resContent: ResInterface = {
				status: 200,
				msg: "登录成功",
				data: { token, refreshToken },
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

routerUser.post("/refresh-token", async (req, res) => {
	const { refreshToken } = req.body;
	if (!refreshToken) {
		const resContent: ResInterface = { status: 400, msg: "缺少 refreshToken" };
		res.status(400).json(resContent);
		return;
	}
	try {
		const tokenInfo = verifyToken(refreshToken, "refresh");
		if (!tokenInfo) {
			const resContent: ResInterface = { status: 401, msg: "refreshToken无效" };
			res.status(401).json(resContent);
			return;
		}
		const { userId, isAdmin } = tokenInfo;
		const tokenExpireTimeMs = 30 * 60 * 1000;
		const newToken = await setToken(userId, isAdmin, tokenExpireTimeMs);
		const newRefreshToken = await setRefreshToken(userId, isAdmin);

		await AppDataSource.getRepository(User)
			.update({ id: userId }, { online: true, lastActiveTime: new Date() });

		const resContent: ResInterface = {
			status: 200,
			msg: "刷新成功",
			data: { token: newToken, refreshToken: newRefreshToken },
		};
		res.status(200).json(resContent);
	} catch (e: any) {
		const resContent: ResInterface = { status: 401, msg: "refreshToken过期或无效" };
		res.status(401).json(resContent);
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
		await cleanupTempFiles([req.file]);
		const resContent: ResInterface = {
			status: 400,
			msg: "请求参数错误",
		};
		res.status(400).json(resContent);
		return;
	}

	try {
		const user = await withFileCleanup(
			{
				files: [{ file: req.file, targetPath: env("AVATAR_STORAGE_PATH", "user/avatars"), exts: [".png", ".jpg", ".jpeg"] }],
				name: randomString(16),
			},
			async (urls) => {
				return await createUser(useraccount, username, password, urls[0], color || undefined);
			},
		);
		const resContent: ResInterface = { status: 200, msg: "注册成功", data: user };
		res.status(200).json(resContent);
	} catch (e: any) {
		const resContent: ResInterface = { status: 500, msg: e.message || "服务器处理错误" };
		res.status(500).json(resContent);
	}
});
