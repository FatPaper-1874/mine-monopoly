import { IsNull } from "typeorm";
import AppDataSource from "../dbConnecter";
import { ItemType } from "../entities/itemTypes";
import { Map } from "../entities/map";
import { Model } from "../entities/model";

const itemTypeRepository = AppDataSource.getRepository(ItemType);
const modelRepository = AppDataSource.getRepository(Model);
const mapRepository = AppDataSource.getRepository(Map);

export const createItemType = async (name: string, color: string, size: number, modelId: string, mapId: string) => {
	const model = await modelRepository.findOne({ where: { id: modelId } });
	const map = await mapRepository.findOne({ where: { id: mapId } });

	if (model) {
		const itemType = new ItemType();
		itemType.name = name;
		itemType.color = color;
		itemType.model = model;
		itemType.size = size;
		if (map) itemType.map = [map];
		return await itemTypeRepository.save(itemType);
	} else {
		throw new Error("不存在的模型Id");
	}
};

export const deleteItemTypes = async (id: string) => {
	const itemType = await itemTypeRepository.findOne({
		where: { id },
	});
	if (itemType) {
		await itemTypeRepository.remove(itemType);
		return true;
	} else return false;
};

export const updateItemType = async (
	id: string,
	name: string,
	color: string,
	size: number,
	modelId: string,
	effectCode: string = ""
) => {
	await itemTypeRepository
		.createQueryBuilder()
		.update(ItemType)
		.set({ id, name, color, size, model: { id: modelId } })
		.where("id = :id", { id })
		.execute();
	return await itemTypeRepository.findOne({ where: { id } });
};

export const getItemTypeById = async (id: string) => {
	const itemType = await itemTypeRepository.findOne({
		relations: ["model"],
		where: { id },
	});
	if (itemType) {
		return itemType;
	} else {
		return null;
	}
};

export const getItemTypeListByMapId = async (id: string) => {
	const itemType = await itemTypeRepository.find({
		where: [{ map: { id } }],
		select: ["id", "name", "color", "model", "size"],
		relations: ["model"],
		order: { createTime: "DESC" },
	});
	return itemType.sort((a, b) => a.name.localeCompare(b.name));
};
