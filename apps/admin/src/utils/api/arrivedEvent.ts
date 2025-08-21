import {_axios} from "@/utils/axios";

export const createArrivedEvent = async (name: string, describe: string, effectCode: string, iconFile: File) => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("describe", describe);
    formData.append("effectCode", effectCode);
    formData.append("icon", iconFile);
    return await _axios.post("/arrived-event/create", formData)
}

export const updateArrivedEvent = async (id: string, name: string, describe: string, effectCode: string, iconFile?: File) => {
    const formData = new FormData();
    formData.append("id", id);
    formData.append("name", name);
    formData.append("describe", describe);
    formData.append("effectCode", effectCode);
    iconFile && formData.append("icon", iconFile);
    return await _axios.post("/arrived-event/update", formData)
}

export const deleteArrivedEvent = async (id: string) => {
    return await _axios.delete("/arrived-event/delete", {params: {id}});
};

export const getArrivedEventById = async (id: string) => {
    return (await _axios.get("/arrived-event/info", {params: {id}})) as any;
};

export const getArrivedEventList = async (page: number, size: number) => {
    const {total, arrivedEventsList, current} = (await _axios.get("/arrived-event/list", {
        params: {page, size},
    })) as any;
    return {total, arrivedEventsList, current};
};

export const bindArrivedEventToMapItem = async (arrivedEventId: string, mapItemId: string) => {
    return (await _axios.post("/arrived-event/bind", {arrivedEventId, mapItemId})) as any;
}

export const unbindArrivedEventFromMapItem = async (mapItemId: string) => {
    return (await _axios.post("/arrived-event/unbind", {mapItemId})) as any;
}
