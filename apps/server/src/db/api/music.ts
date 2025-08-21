import AppDataSource from "../dbConnecter";
import { Music } from "../entities/music";
import { deleteFiles } from "../../utils/file-uploader";
import { getFileNameInPath } from "../../utils";

const musicRepository = AppDataSource.getRepository(Music);

export const createMusic = async (name: string, url: string): Promise<Music> => {
	const musicToCreate = new Music();
	musicToCreate.name = name;
	musicToCreate.url = url;

	return await musicRepository.save(musicToCreate);
};

export const getMusicList = async (page: number, size: number): Promise<{ musicList: Music[]; total: number }> => {
	const total = await musicRepository.count();
	if (page > 0) {
		const musicList = await musicRepository.find({
			skip: (page - 1) * size,
			take: size,
			order: { createTime: "DESC" },
		});
		return { musicList, total };
	} else {
		const musicList = await musicRepository.find({ order: { createTime: "DESC" } });
		return { musicList, total };
	}
};

export const getMusicById = async (id: string): Promise<Music | null> => {
	return await musicRepository.findOneBy({ id });
};

export const updateMusic = async (id: string, name: string, url: string): Promise<Music | null> => {
	const musicToUpdate = await musicRepository.findOneBy({ id });

	if (!musicToUpdate) {
		return null;
	}

	musicToUpdate.name = name;
	musicToUpdate.url = url;

	return await musicRepository.save(musicToUpdate);
};

export const deleteMusic = async (id: string): Promise<boolean> => {
	const musicToDelete = await musicRepository.findOneBy({ id });

	if (!musicToDelete) {
		return false;
	}

	try {
		await deleteFiles([`monopoly/music/${getFileNameInPath(musicToDelete.url)}`]);
	} catch (e: any) {
		throw new Error(`删除音乐失败：${e.message}`);
	}

	await musicRepository.remove(musicToDelete);
	return true;
};
