import AppDataSource from "../dbConnecter";
import { Property } from "../entities/property";
import { Street } from "../entities/street";
import { Map } from "../entities/map";
import { MapItem } from "../entities/mapItem";

const propertyRepository = AppDataSource.getRepository(Property);
const mapItemRepository = AppDataSource.getRepository(MapItem);
const streetRepository = AppDataSource.getRepository(Street);
const mapRepository = AppDataSource.getRepository(Map);

export const createProperty = async (
	name: string,
	sellCost: number,
	buildCost: number,
	cost_lv0: number,
	cost_lv1: number,
	cost_lv2: number,
	mapItemId: string,
	streetId: string,
	mapId: string
) => {
	const mapItem = await mapItemRepository.findOne({ where: { id: mapItemId } });
	const street = await streetRepository.findOne({ where: { id: streetId } });
	const map = await mapRepository.findOne({ where: { id: mapId } });
	if (mapItem && street && map) {
		const newPropertyInfo = await propertyRepository
			.createQueryBuilder()
			.insert()
			.into(Property)
			.values({ name, sellCost, buildCost, cost_lv0, cost_lv1, cost_lv2, map, street })
			.execute();

		const property = await propertyRepository
			.createQueryBuilder()
			.where("id = :id", { id: newPropertyInfo.identifiers[0].id })
			.getOne();
		if (property) {
			mapItemRepository
				.createQueryBuilder()
				.update(MapItem)
				.set({ property: property })
				.where("id = :id", { id: mapItemId })
				.execute();

			return property;
		}
	}
};

export const deleteProperty = async (id: string) => {
	const property = await propertyRepository.findOne({
		where: { id },
	});
	if (property) {
		propertyRepository.remove(property);
		return;
	} else {
		new Error("无效的id");
	}
};

export const updateProperty = async (
	id: string,
	name: string,
	sellCost: number,
	buildCost: number,
	cost_lv0: number,
	cost_lv1: number,
	cost_lv2: number,
	streetId: string
) => {
	const street = await streetRepository.findOne({ where: { id: streetId } });
	if (street) {
		await propertyRepository
			.createQueryBuilder()
			.update(Property)
			.set({ id, name, sellCost, buildCost, cost_lv0, cost_lv1, cost_lv2, street })
			.where("id = :id", { id })
			.execute();
		return await propertyRepository.createQueryBuilder().where("id = :id", { id }).getOne();
	} else {
		return null;
	}
};

export const getPropertyById = async (id: string) => {
	const property = await propertyRepository.findOne({
		select: ["id", "name", "sellCost", "buildCost", "cost_lv0", "cost_lv1", "cost_lv2"],
		where: { id },
	});
	if (property) {
		return property;
	} else {
		return null;
	}
};

export const getPropertysListByMapId = async (id: string) => {
	const map = await mapRepository
		.createQueryBuilder("map")
		.leftJoinAndSelect("map.properties", "property")
		.leftJoinAndMapOne("property.street", Street, "streetInProperty", "property.streetId = streetInProperty.id")
		.where("map.id = :id", { id })
		.getOne();
	const properties = map?.properties || null;
	return properties;
};

export const getPropertysList = async () => {
	const propertysList = await propertyRepository.find();
	return propertysList;
};
