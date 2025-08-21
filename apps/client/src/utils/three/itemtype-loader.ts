import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { ItemType } from "@src/interfaces/game";
import { __MONOPOLYSERVER__, __PROTOCOL__ } from "@src/../global.config";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { getDracoLoader } from "@src/utils/three/draco";

export const loadItemTypeModules = async (itemTypeList: ItemType[]): Promise<{ id: string; glft: GLTF }[]> => {
	const promiseArr: Promise<{ id: string; glft: GLTF }>[] = new Array<Promise<{ id: string; glft: GLTF }>>();
	const gltfLoader = new GLTFLoader();
	gltfLoader.setDRACOLoader(getDracoLoader());
	itemTypeList.forEach((itemType) => {
		const promise = new Promise<{ id: string; glft: GLTF }>((resolve, reject) => {
			gltfLoader.load(
				`${__PROTOCOL__}://${itemType.model.fileUrl}`,
				(glft: GLTF) => {
					glft.userData = { typeId: itemType.id };
					resolve({ id: itemType.id, glft: glft });
				},
				undefined,
				(error) => {
					reject(error);
				}
			);
		});
		promiseArr.push(promise);
	});
	return await Promise.all(promiseArr);
};
