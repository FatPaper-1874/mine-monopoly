import {_axios} from "@/utils/axios";
import {Music} from "@/interfaces/interfaces";

export const getMusicList = async (page: number, size: number) => {
    const { total, musicList, current } = (await _axios.get("/music/list", { params: { page, size } })) as any;
    return { total, musicList, current };
};

export const deleteMusic = async (id: string) => {
    await _axios.delete("/music/delete", { params: { id } });
};
