import {_axios} from "@/utils/axios";

export const getModelList = async (page: number, size: number) => {
	const { total, modelList, current } = (await _axios.get("/model/list", { params: { page, size } })) as any;
	return { total, modelList, current };
};

export const deleteModel = async (id: string) => {
	await _axios.delete("/model/delete", { params: { id } });
};

export const createModel = async (name: string, modelFile: File) => {
	const formData = new FormData();
	formData.append("name", name);
	formData.append("model", modelFile);
	return await _axios.post("/model/create", formData)
}

export const updateModel = async (id: string, name: string, modelFile?: File) => {
	const formData = new FormData();
	formData.append("id", id);
	formData.append("name", name);
	modelFile && formData.append("model", modelFile);
	return await _axios.post("/model/update", formData)
}