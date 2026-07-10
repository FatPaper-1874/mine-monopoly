import { AmbientLight, Box3, Color, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ThreeSceneBase } from "@mine-monopoly/utils";
import { createModelFromImage } from "./role";

export class RolePreviewerRenderer extends ThreeSceneBase {
	private controls!: OrbitControls; // 添加控制器实例变量
	private animationFrameId: number | null = null; // 用于存储动画帧ID

	constructor(contianer: HTMLDivElement) {
		super(contianer);
		this.scene.background = new Color(0xeeeeee);
		(this.camera as PerspectiveCamera).fov = 45;

		// 初始化控制器
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);

		// 启动渲染循环
		this.startRenderLoop();
	}

	// 启动渲染循环
	private startRenderLoop(): void {
		const renderLoop = () => {
			this.animationFrameId = requestAnimationFrame(renderLoop);
			this.controls.update(); // 更新控制器
			this.renderer.render(this.scene, this.camera);
		};

		renderLoop();
	}

	// 停止渲染循环
	private stopRenderLoop(): void {
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
	}

	public async loadRole(roleImageUrl: string) {
		this.setLoadingMaskVisible(true);
		this.scene.clear();
		if (!roleImageUrl) {
			this.render();
			return;
		}
		const role = await createModelFromImage(roleImageUrl);
		this.scene.add(role);
		const box = new Box3().setFromObject(role);
		const center = box.getCenter(new Vector3());
		const distance = box.getSize(new Vector3()).length();
		this.camera.position.copy(center);
		this.camera.position.z += distance;
		this.camera.lookAt(center);

		// 更新控制器的目标点
		this.controls.target.copy(center);
		this.controls.update();

		const light = new AmbientLight(0xffffff, 4.5);
		this.scene.add(light);

		this.render();
		this.setLoadingMaskVisible(false);
	}

	public clear() {
		this.scene.clear();
		this.renderer.render(this.scene, this.camera);
	}

	public destroy() {
		// 停止渲染循环
		this.stopRenderLoop();

		// 清理控制器
		this.controls.dispose();

		// 调用父类的销毁方法
		super.destroy();
	}

	protected render(): void {
		this.controls.update();
		super.render();
	}
}
