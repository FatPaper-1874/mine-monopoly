import { ThreeSceneBase } from "@/utils/three/ThreeSceneBase";
import * as THREE from "three";
import { RoleModel } from "@/views/manage/role-manage/components/utils/RoleModel";
import { __PROTOCOL__ } from "@G/global.config";

export class RoleCardPreviewerRenderer extends ThreeSceneBase {
	private role: RoleModel | undefined;

	constructor(canvas: HTMLCanvasElement, baseUrl: string, fileName: string) {
		super(canvas);
		const light = new THREE.AmbientLight(0xffffff, 1);
		this.scene.add(light);
		this.scene.background = new THREE.Color(0xffffff);
		this.camera.position.set(0, 0.4, 0.7);
		this.camera.lookAt(new THREE.Vector3(0, 0.4, 0));
		this.loadRole(baseUrl, fileName);
		this.renderLoop();
	}

	protected renderLoop() {
		this.role && this.role.update();
		super.render();
		this.requestAnimationFrameId = requestAnimationFrame(this.renderLoop.bind(this));
	}

	public async loadRole(baseUrl: string, fileName: string) {
		this.setLoadingMaskVisible(true);
		this.role = new RoleModel(1, `${__PROTOCOL__}://${baseUrl}/`, fileName);
		const model = await this.role.load();
		this.scene.add(model);
		this.setLoadingMaskVisible(false);
		await this.role.doAnimation("hi", false);
		this.role.doAnimation("idle");
	}

	public destroy() {
		super.destroy();
	}
}
