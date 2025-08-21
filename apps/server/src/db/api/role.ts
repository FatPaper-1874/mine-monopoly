import AppDataSource from "../dbConnecter";
import { Role } from "../entities/role";
import { deleteFiles } from "../../utils/file-uploader";

const roleRepository = AppDataSource.getRepository(Role);

export const createRole = async (roleName: string, baseUrl: string, fileName: string, color: string) => {
	const roleToCreate = new Role();
	roleToCreate.roleName = roleName;
	roleToCreate.fileName = fileName;
	roleToCreate.baseUrl = baseUrl;
	roleToCreate.color = color;
	await roleRepository.save(roleToCreate);
	return roleToCreate;
};

export const updateRole = async (id: string, rolename: string, color: string, filename?: string) => {
	const roleToUpdate = await roleRepository.findOne({ where: { id } });
	if (roleToUpdate) {
		if (filename) {
			await deleteRoleFile(roleToUpdate.fileName);
			roleToUpdate.fileName = filename;
		}
		roleToUpdate.roleName = rolename;
		roleToUpdate.color = color;
		await roleRepository.save(roleToUpdate);
	} else {
		throw new Error("不存在的角色");
	}
	return roleToUpdate;
};

export const deleteRole = async (id: string) => {
	const role = await roleRepository.findOne({
		where: { id },
	});
	if (role) {
		await deleteRoleFile(role.fileName);
		return roleRepository.remove(role);
	} else {
		throw new Error("不存在的角色");
	}
};

export const getRoleList = async (page: number, size: number = 0) => {
	if (page > 0) {
		const roleList = await roleRepository.find({ skip: (page - 1) * size, take: size, order: { createTime: "DESC" } });
		const total = await roleRepository.count();
		return { roleList, total };
	} else {
		const roleList = await roleRepository.find({ order: { createTime: "DESC" } });
		const total = await roleRepository.count();
		return { roleList, total };
	}
};

async function deleteRoleFile(fileName: string) {
	await deleteFiles(["json", "png", "atlas"].map((type) => `monopoly/roles/${fileName}.${type}`));
}
