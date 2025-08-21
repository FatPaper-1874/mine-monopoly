import { AmbientLight, Box3, Color, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { ThreeSceneBase } from "@/utils/three/ThreeSceneBase";
import { getDracoLoader } from "@/utils/three/draco";
import { __PROTOCOL__ } from "@G/global.config";

export class ModelPreviewerRenderer extends ThreeSceneBase {
	constructor(canvas: HTMLCanvasElement) {
		super(canvas);
		this.scene.background = new Color(0xeeeeee);
		this.camera.fov = 45;
		this.render();
	}

	public async loadModel(modelFileUrl: string, rotatable: boolean) {
		this.setLoadingMaskVisible(true);
		this.scene.clear();
		if (!modelFileUrl) {
			this.renderer.render(this.scene, this.camera);
			return;
		}
		const loader = new GLTFLoader();
		loader.setDRACOLoader(getDracoLoader());
		const gltf = await loader.loadAsync(`${__PROTOCOL__}://${modelFileUrl}`);
		const model = gltf.scene;
		this.scene.add(model);
		const box = new Box3().setFromObject(model);
		const center = box.getCenter(new Vector3());
		const distance = box.getSize(new Vector3()).length();
		this.camera.position.copy(center);
		this.camera.position.x += distance;
		this.camera.position.y += distance;
		this.camera.position.z += distance;
		this.camera.lookAt(center);

		const light = new AmbientLight(0xffffff, 4.5); // soft white light
		this.scene.add(light);

		this.renderer.render(this.scene, this.camera);
		this.setLoadingMaskVisible(false);

		if (rotatable) {
			const _this = this;

			let requestAnimationFrameId = -1;

			function rotate() {
				requestAnimationFrameId = requestAnimationFrame(rotate);
				model.rotateY(Math.PI / 180);
				_this.renderer.render(_this.scene, _this.camera);
			}

			this.canvasEl.addEventListener("mouseenter", () => {
				rotate();
			});

			this.canvasEl.addEventListener("mouseleave", () => {
				cancelAnimationFrame(requestAnimationFrameId);
			});
		}
	}

	public clear() {
		this.scene.clear();
		this.renderer.render(this.scene, this.camera);
	}

	public destroy() {
		super.destroy();
	}
}
