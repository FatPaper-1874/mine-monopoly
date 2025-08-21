import * as THREE from "three";
import { ThreeSceneBase } from "@src/classes/three/ThreeSceneBase";
import { RoleModel } from "@src/views/room/utils/RoleModel";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { GammaCorrectionShader } from "three/examples/jsm/shaders/GammaCorrectionShader";

export class RolePreviewer extends ThreeSceneBase {
	private role: RoleModel | undefined;
	private composer: EffectComposer;
	private renderPass: RenderPass;

	constructor(canvas: HTMLCanvasElement) {
		super(canvas);
		const light = new THREE.AmbientLight(0xffffff, 1);
		this.scene.add(light);
		this.renderer.setClearAlpha(0);
		this.composer = new EffectComposer(this.renderer);
		this.renderPass = new RenderPass(this.scene, this.camera);
		this.camera.position.set(0, 0.4, 1);
		this.camera.lookAt(new THREE.Vector3(0, 0.4, 0));

		this.composer.addPass(this.renderPass);
		const gammaPass = new ShaderPass(GammaCorrectionShader);
		this.composer.addPass(gammaPass);
		this.renderLoop();
	}

	protected renderLoop() {
		this.role && this.role.update();
		super.render();
		this.composer.render();
		this.requestAnimationFrameId = requestAnimationFrame(this.renderLoop.bind(this));
	}

	public async loadRole(baseUrl: string, fileName: string) {
		this.setLoadingMaskVisible(true);
		this.scene.clear();
		this.role = new RoleModel(1, baseUrl, fileName);
		const model = await this.role.load();

		this.scene.add(model);
		this.role.doAnimation("hi", false);
		this.setLoadingMaskVisible(false);
		return this.role;
	}

	public destroy() {
		super.destroy();
	}
}
