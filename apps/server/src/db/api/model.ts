import path, { resolve } from "path";
import AppDataSource from "../dbConnecter";
import { Model } from "../entities/model";
import fs from "fs";
import { deleteFiles } from "../../utils/file-uploader";
import { getFileNameInPath } from "../../utils";

const modelRepository = AppDataSource.getRepository(Model);

export const createModel = async (name: string, fileUrl: string, fileName: string) => {
	const model = new Model();
	model.name = name;
	model.fileUrl = fileUrl;
	model.fileName = fileName;
	await modelRepository.save(model);
};

export const deleteModel = async (id: string) => {
	const model = await modelRepository.findOne({
		where: { id },
	});
	if (model) {
		try {
			await modelRepository.remove(model);
			await deleteFiles([`monopoly/models/${model.fileName}`]);
		} catch (e: any) {
			throw new Error(`删除Model失败：${e.message}`);
		}
	} else {
		throw new Error("不存在的Model");
	}
};

export const updateModel = async (id: string, name: string, fileUrl?: string, fileName?: string) => {
	const model = await modelRepository.findOne({ where: { id } });
	if (model) {
		model.name = name;
		if (fileUrl && fileName) {
			deleteFiles([`monopoly/models/${getFileNameInPath(model.fileUrl)}`]);
			model.fileUrl = fileUrl;
			model.fileName = fileName;
		}
		await modelRepository.save(model);
	} else {
		throw new Error("不存在的Model");
	}
};

export const getModelById = async (id: string) => {
	const model = await modelRepository.findOne({
		select: ["id", "name", "fileUrl"],
		where: { id },
	});
	if (model) {
		return model;
	} else {
		return null;
	}
};

export const getModelList = async (page: number, size: number) => {
	const total = await modelRepository.count();
	if (page > 0) {
		const modelList = await modelRepository.find({
			skip: (page - 1) * size,
			take: size,
			order: { createTime: "DESC" },
		});
		return { modelList, total };
	} else {
		const modelList = await modelRepository.find({ order: { createTime: "DESC" } });
		return { modelList, total };
	}
	// const total = Math.round((await modelRepository.count()) / size);
};
