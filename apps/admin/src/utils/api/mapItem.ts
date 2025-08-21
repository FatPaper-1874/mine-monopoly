import {_axios} from "@/utils/axios";

export const createMapItem = (
    _id: string,
    x: number,
    y: number,
    rotation: 0 | 1 | 2 | 3,
    typeId: string,
    mapId: string
) => {
    return _axios.post("/map-item/create", {_id, x, y, rotation, typeId, mapId});
};

export function deleteMapItem(id: string){
    return _axios.delete("/map-item/delete", {params: {id}});
};

export function linkMapItem(sourceId: string, targetId: string){
    return _axios.post("/map-item/link", {sourceId, targetId});
};
