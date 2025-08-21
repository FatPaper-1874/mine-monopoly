import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { getDracoLoader } from "@src/utils/three/draco";
import { Model } from "@src/interfaces/game";
import { __PROTOCOL__ } from "@src/../global.config";

export const loadHouseModels = async (houseModels: {
	lv0: Model;
	lv1: Model;
	lv2: Model;
}): Promise<{ name: string; glft: GLTF }[]> => {
	// const houseArr = ["house_lv0", "house_lv1", "house_lv2"];
	const promiseArr: Promise<{ name: string; glft: GLTF }>[] = new Array<Promise<{ name: string; glft: GLTF }>>();
	const gltfLoader = new GLTFLoader();
	gltfLoader.setDRACOLoader(getDracoLoader());

	for (const _model of Object.entries(houseModels)) {
		const name = _model[0];
		const model = _model[1];

		const promise = new Promise<{ name: string; glft: GLTF }>((resolve, reject) => {
			gltfLoader.load(
				`${__PROTOCOL__}://${model.fileUrl}`,
				(glft: GLTF) => {
					glft.userData = { name: `house_${name}` };
					resolve({ name: `house_${name}`, glft: glft });
				},
				undefined,
				(error) => {
					reject(error);
				}
			);
		});
		promiseArr.push(promise);
	}
	return await Promise.all(promiseArr);
};
