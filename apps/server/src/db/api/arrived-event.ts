import AppDataSource from "../dbConnecter";
import {ArrivedEvent} from "../entities/arrivedEvent";
import {MapItem} from "../entities/mapItem";
import {deleteFiles} from "../../utils/file-uploader";
import {getFileNameInPath} from "../../utils";

const arrivedEventRepository = AppDataSource.getRepository(ArrivedEvent);
const mapItemRepository = AppDataSource.getRepository(MapItem);

export const createArrivedEvent = async (name: string, describe: string, iconUrl: string, effectCode: string) => {
    const arrivedEvent = new ArrivedEvent();
    arrivedEvent.name = name;
    arrivedEvent.describe = describe;
    arrivedEvent.iconUrl = iconUrl;
    arrivedEvent.effectCode = effectCode;
    await arrivedEventRepository.save(arrivedEvent);
};

export const updateArrivedEvent = async (
    id: string,
    name: string,
    describe: string,
    iconUrl: string,
    effectCode: string
) => {
    const arrivedEvent = await arrivedEventRepository.findOne({where: {id}});
    if (arrivedEvent) {
        Object.assign(arrivedEvent, {name, describe, effectCode});
        if (iconUrl) {
            await deleteFiles([`monopoly/arrived_event_icons/${getFileNameInPath(arrivedEvent.iconUrl)}`])
            arrivedEvent.iconUrl = iconUrl;
        }
        await arrivedEventRepository.save(arrivedEvent);
        return arrivedEvent;
    } else {
        throw new Error("无效的Id");
    }
};

export const deleteArrivedEvent = async (id: string) => {
    const arrivedEvent = await arrivedEventRepository.findOne({
        where: {id},
    });
    if (arrivedEvent) {
        await deleteFiles([`monopoly/arrived-event-icons/${getFileNameInPath(arrivedEvent.iconUrl)}`])
        await arrivedEventRepository.remove(arrivedEvent);
        return;
    } else {
        throw new Error("无效的id");
    }
};

// export const saveArrivedEventInMap = async (chanceCardIdList: string[], mapId: string) => {
// 	const map = await mapRepository.findOne({ where: { id: mapId } });
// 	if (map) {
// 		const chanceCards = await arrivedEventRepository
// 			.createQueryBuilder("arrivedEvent")
// 			.whereInIds(chanceCardIdList)
// 			.getMany();
// 		map.chanceCards = chanceCards;
// 		mapRepository.save(map);
// 	}
// };

// export const getArrivedEventsListByMapId = async (id: string) => {
// 	const map = await mapRepository
// 		.createQueryBuilder("map")
// 		.leftJoinAndSelect("map.chanceCards", "chanceCards")
// 		.where("map.id = :id", { id })
// 		.getOne();
// 	const chanceCards = map?.chanceCards || null;
// 	return chanceCards;
// };

export const getArrivedEventById = async (id: string) => {
    const arrivedEvent = await arrivedEventRepository.findOne({
        select: ["id", "name", "describe", "iconUrl", "effectCode"],
        where: {id},
    });
    if (arrivedEvent) {
        return arrivedEvent;
    } else {
        throw new Error("无效的id");
    }
};

export const getArrivedEventsList = async (page: number, size: number) => {
    const total = await arrivedEventRepository.count();
    if (page > 0) {
        const arrivedEventsList = await arrivedEventRepository.find({skip: (page - 1) * size, take: size, order: { createTime: "DESC" } });
        return {arrivedEventsList, total};
    } else {
        const arrivedEventsList = await arrivedEventRepository.find();
        return {arrivedEventsList, total};
    }
};

export const bindArrivedEventToMapItem = async (mapItemId: string, arrivedEventId: string) => {
    const mapItem = await mapItemRepository.findOne({where: {id: mapItemId}});
    const arrivedEvent = await arrivedEventRepository.findOne({where: {id: arrivedEventId}});
    if (mapItem && arrivedEvent) {
        mapItem.arrivedEvent = arrivedEvent;
        mapItemRepository.save(mapItem);
    } else {
        throw new Error(`无效的${!mapItem ? "MapItem" : ""} ${!arrivedEvent ? "ArrivedEvent" : ""} id`);
    }
};

export const unbindArrivedEventFromMapItem = async (mapItemId: string) => {
    // const mapItem = await mapItemRepository.findOne({where: {id: mapItemId}});
    // if (mapItem) {
    //     mapItem.arrivedEvent = undefined;
    //     mapItemRepository.save(mapItem);
    // } else {
    //     throw new Error(`无效的MapItem id`);
    // }
    await mapItemRepository.query(`
        UPDATE map_item
        SET arrivedEventId = NULL
        WHERE id = '${mapItemId}'
    `)
};
