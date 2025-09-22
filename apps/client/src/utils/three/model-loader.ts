import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { __MONOPOLYSERVER__ } from "@src/../global.config";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { getDracoLoader } from "../draco/draco";

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(getDracoLoader());

export function loadModel(name: string): Promise<GLTF> {
	return new Promise<GLTF>((resolve, reject) => {
		gltfLoader.load(
			`${name}`,//TODO
			(glft: GLTF) => {
				resolve(glft);
			},
			undefined,
			(error) => {
				reject(error);
			}
		);
	});
}
