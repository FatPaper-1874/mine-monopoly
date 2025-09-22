import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

let draco: DRACOLoader | undefined = undefined;

export function getDracoLoader() {
	if (!draco) {
		draco = new DRACOLoader();
		draco.setDecoderPath("./draco/");
	}
	return draco;
}
