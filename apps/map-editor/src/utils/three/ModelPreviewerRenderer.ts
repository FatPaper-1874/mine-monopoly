import {
  AmbientLight, ArrowHelper, Box3, BoxGeometry, BoxHelper, Color,
  GridHelper, Group, MathUtils, Mesh, MeshBasicMaterial,
  PerspectiveCamera, Vector3, LoopRepeat, Clock
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ThreeSceneBase, AnimationManager } from "@mine-monopoly/utils";
import { getModelByUrl } from ".";

export class ModelPreviewerRenderer extends ThreeSceneBase {
  private currentModel: Group | null = null;
  private isRunning = false;
  private controls!: OrbitControls;
  private animationManager: AnimationManager | null = null;
  private clock: Clock | null = null;
  private currentModelId: string | null = null;

  constructor(contianer: HTMLDivElement, showGuides = false) {
    super(contianer);
    this.scene.background = new Color(0xeeeeee);
    (this.camera as PerspectiveCamera).fov = 45;

    this.scene.add(new AmbientLight(0xffffff, 4.5));

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    if (showGuides) {
      this.addGuides();
    }

    this.render();
  }

  private addGuides() {
    this.scene.add(new GridHelper(10, 10, 0xcccccc, 0xe0e0e0));

    const refCubeGeo = new BoxGeometry(1, 1, 1);
    const refCubeMesh = new Mesh(refCubeGeo, new MeshBasicMaterial({ visible: false }));
    refCubeMesh.position.set(0, 0.5, 0);
    this.scene.add(refCubeMesh);
    this.scene.add(new BoxHelper(refCubeMesh, 0x666666));

    this.scene.add(new ArrowHelper(
      new Vector3(0, 0, 1),
      new Vector3(0, 0.01, 0),
      1.5,
      0x4444ff,
      0.2,
      0.15
    ));
  }

  public async loadModel(modelFileUrl: string, _rotatable?: boolean) {
    this.setLoadingMaskVisible(true);

    if (this.currentModel) {
      if (this.currentModelId && this.animationManager) {
        this.animationManager.unregisterModel(this.currentModelId);
      }
      this.scene.remove(this.currentModel);
      this.currentModel = null;
    }

    if (!modelFileUrl) {
      this.render();
      this.setLoadingMaskVisible(false);
      return;
    }

    const gltf = await getModelByUrl(modelFileUrl);
    const model = gltf.scene;
    this.currentModel = model;
    this.scene.add(model);

    // 初始化动画管理器
    if (!this.animationManager) {
      this.animationManager = new AnimationManager();
      this.clock = new Clock();
    }

    // 生成唯一 ID
    this.currentModelId = `preview_${Date.now()}`;

    // 注册并自动播放动画
    this.animationManager.registerModel(this.currentModelId, gltf, model, {
      autoPlay: true,
      loop: LoopRepeat
    });

    const box = new Box3().setFromObject(model);
    const center = box.getCenter(new Vector3());
    const distance = box.getSize(new Vector3()).length();
    this.camera.position.copy(center);
    this.camera.position.x += distance;
    this.camera.position.y += distance;
    this.camera.position.z += distance;
    this.camera.lookAt(center);

    this.controls.target.copy(center);
    this.controls.update();

    this.render();
    this.setLoadingMaskVisible(false);
  }

  public setTransform(
    position: { x: number; y: number; z: number },
    rotation: { x: number; y: number; z: number },
    scale: { x: number; y: number; z: number }
  ) {
    if (!this.currentModel) return;
    this.currentModel.position.set(position.x, position.y, position.z);
    this.currentModel.rotation.set(
      MathUtils.degToRad(rotation.x),
      MathUtils.degToRad(rotation.y),
      MathUtils.degToRad(rotation.z)
    );
    this.currentModel.scale.set(scale.x, scale.y, scale.z);
  }

  public startRenderLoop() {
    if (this.isRunning) return;
    this.isRunning = true;
    const loop = () => {
      if (!this.isRunning) return;

      // 更新动画
      if (this.animationManager && this.clock) {
        const delta = this.clock.getDelta();
        this.animationManager.update(delta);
      }

      this.controls.update();
      this.render();
      this.requestAnimationFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  public stopRenderLoop() {
    this.isRunning = false;
    cancelAnimationFrame(this.requestAnimationFrameId);
  }

  public clear() {
    this.stopRenderLoop();
    if (this.currentModelId && this.animationManager) {
      this.animationManager.unregisterModel(this.currentModelId);
    }
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      this.currentModel = null;
    }
    this.renderer.render(this.scene, this.camera);
  }

  public destroy() {
    this.animationManager?.dispose();
    this.controls.dispose();
    super.destroy();
  }
}
