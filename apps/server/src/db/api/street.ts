import AppDataSource from "../dbConnecter";
import { Map } from "../entities/map";
import { Street } from "../entities/street";

const streetRepository = AppDataSource.getRepository(Street);
const mapRepository = AppDataSource.getRepository(Map);

export const createStreet = async (name: string, increase: number, mapId: string) => {
	const map = await mapRepository.findOne({ where: { id: mapId } });
	if (map) {
		const street = new Street();
		street.name = name;
		street.increase = increase;
		street.map = map;
		return await streetRepository.save(street);
	} else {
		new Error("mapId错误");
	}
};

export const deleteStreet = async (id: string) => {
	const street = await streetRepository.findOne({
		where: { id },
	});
	if (street) {
		streetRepository.remove(street);
		return true;
	} else return false;
};

export const updateStreet = async (newStreet: Street) => {
	streetRepository.merge(newStreet);
};

export const getStreetById = async (id: string) => {
	const street = await streetRepository.findOne({
		select: ["id", "name", "increase"],
		where: { id },
	});
	if (street) {
		return street;
	} else {
		return null;
	}
};

export const getStreetsList = async () => {
	const streetsList = await streetRepository.find();
	return streetsList;
};

export const getStreetListByMapId = async (id: string) => {
	const map = await mapRepository
		.createQueryBuilder("map")
		.leftJoinAndSelect("map.streets", "streets")
		.where("map.id = :id", { id })
		.getOne();
	const streets = map?.streets || null;
	return streets;
};
