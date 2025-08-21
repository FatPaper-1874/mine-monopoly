import {_axios} from "@/utils/axios";

export const getRoleList = async (page: number, size: number) => {
    const {total, roleList, current} = (await _axios.get("/role/list", {params: {page, size}})) as any;
    return {total, roleList, current};
};

export const preUpload = async (formData: FormData) => {
    const {fileName} = (await _axios.post("/role/pre-upload", formData, {headers: {"Content-Type": "multipart/form-data"}})) as any;
    return fileName;
}

export const createRole = async (
    formData: FormData
) => {
    const res = (await _axios.post("/role/create", formData, {headers: {"Content-Type": "multipart/form-data"}}));
    return res;
};

export const updateRole = async (
    formData: FormData
) => {
    const res = (await _axios.post("/role/update", formData, {headers: {"Content-Type": "multipart/form-data"}}));
    return res;
};

export const deleteModel = async (id: string) => {
    await _axios.delete("/role/delete", { params: { id } });
};