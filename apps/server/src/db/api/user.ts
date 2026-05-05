import { User } from "#src/db/entities/User";
import { AppDataSource } from "#src/db/dbConnecter";
import { Like } from "typeorm";
import { decryptPassword, generatePasswordHash, getRandomString, randomColor } from "#src/utils";

const userRepository = AppDataSource.getRepository(User);

export const createUser = async (
	useraccount: string,
	username: string,
	password: string,
	avatar: string,
	color?: string,
	isAdmin?: boolean
) => {
	const accountRegex = /^[a-zA-Z0-9_]{3,20}$/;
	if (!accountRegex.test(useraccount)) {
		throw new Error("账号需为3-20位的字母、数字或下划线");
	}
	if (username.length < 1 || username.length > 20) {
		throw new Error("用户名长度需在1-20位之间");
	}
	const user = await AppDataSource.manager.findOneBy(User, { useraccount });
	if (user) throw new Error("已经存在的账号名");
	const decryptedPassword = decryptPassword(password);
	if (decryptedPassword.length < 6) {
		throw new Error("密码长度不能少于6位");
	}
	const { salt, passwordHash } = generatePasswordHash(decryptedPassword, getRandomString(16));

	const userToCreate = new User();
	userToCreate.useraccount = useraccount;
	userToCreate.username = username;
	userToCreate.password = passwordHash;
	userToCreate.salt = salt;
	userToCreate.avatar = avatar;
	userToCreate.color = color || randomColor();
	if (isAdmin !== undefined) {
		userToCreate.isAdmin = isAdmin;
	}

	return await userRepository.save(userToCreate);
};

export const userLogin = async (useraccount: string, password: string, privateKey: string) => {
	const user = await AppDataSource.manager.findOneBy(User, { useraccount });
	if (user) {
		const decryptedPassword = decryptPassword(password);
		if (!decryptedPassword) throw new Error("客户端密码解密失败");
		const { passwordHash } = generatePasswordHash(decryptedPassword, user.salt);
		if (user.password === passwordHash) {
			return user;
		} else {
			throw new Error("密码错误");
		}
	} else {
		throw new Error("不存在的账号");
	}
};

export const updateUser = async (
	id: string,
	data: { username?: string; password?: string; color?: string; isAdmin?: boolean }
) => {
	const user = await userRepository.findOneBy({ id });
	if (!user) throw new Error("用户不存在");

	if (data.username !== undefined) {
		if (data.username.length < 1 || data.username.length > 20) {
			throw new Error("用户名长度需在1-20位之间");
		}
		user.username = data.username;
	}
	if (data.color !== undefined) user.color = data.color;
	if (data.isAdmin !== undefined) user.isAdmin = data.isAdmin;
	if (data.password) {
		const decryptedPassword = decryptPassword(data.password);
		if (decryptedPassword.length < 6) throw new Error("密码长度不能少于6位");
		const { salt, passwordHash } = generatePasswordHash(decryptedPassword, getRandomString(16));
		user.password = passwordHash;
		user.salt = salt;
	}
	return await userRepository.save(user);
};

export const deleteUser = async (id: string) => {
	const user = await userRepository.findOne({
		where: { id },
	});
	if (user) {
		return userRepository.remove(user);
	} else {
		return null;
	}
};

export const getUserById = async (userId: string) => {
	const user = await AppDataSource.manager.findOne(User, {
		select: ["id", "useraccount", "username", "avatar", "color"],
		where: { id: userId },
	});
	if (user) {
		return user;
	} else {
		return null;
	}
};

export const getUserList = async (page: number, size: number, search?: string) => {
	const where = search
		? [{ username: Like(`%${search}%`) }, { useraccount: Like(`%${search}%`) }]
		: undefined;

	const [userList, total] = await userRepository.findAndCount({
		where,
		skip: (page - 1) * size,
		take: size,
		select: ["id", "useraccount", "username", "avatar", "color", "online", "isAdmin"],
	});
	return { userList, total };
};
