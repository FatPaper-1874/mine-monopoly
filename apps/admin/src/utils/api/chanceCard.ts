import {_axios} from "@/utils/axios";

export const createChanceCard = async (
    name: string,
    describe: string,
    type: string,
    color: string,
    iconFile: File,
    effectCode: string
) => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("describe", describe);
    formData.append("color", color);
    formData.append("type", type);
    formData.append("icon", iconFile);
    formData.append("effectCode", effectCode);
    await _axios.post("/chance-card/create", formData);
};

export const updateChanceCard = async (
    id: string,
    name: string,
    describe: string,
    type: string,
    color: string,
    effectCode: string,
    iconFile?: File
) => {
    const formData = new FormData();
    formData.append("id", id);
    formData.append("name", name);
    formData.append("describe", describe);
    formData.append("color", color);
    formData.append("type", type);
    iconFile && formData.append("icon", iconFile);
    formData.append("effectCode", effectCode);
    return await _axios.post("/chance-card/update", formData);
};

export const getChanceCardById = async (id: string) => {
    return await _axios.get("/chance-card/info", {params: {id}});
};

export const getChanceCardsList = async (page: number, size: number) => {
    const {total, chanceCardsList, current} = (await _axios.get("/chance-card/list", {params: {page, size}})) as any;
    return {total, chanceCardsList, current};
};

export const deleteChanceCard = async (id: string) => {
    return await _axios.delete("/chance-card/delete", {params: {id}});
};

export const updateChanceCardInMap = async (chanceCardIdList: string[], mapId: string) => {
    await _axios.post("/chance-card/bind-map", {chanceCardIdList, mapId});
};
