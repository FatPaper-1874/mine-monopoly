import {
    AmbientLight,
    Box3,
    Color,
    Group,
    Object3D,
    SRGBColorSpace,
    Vector3,
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {ItemType, MapItem} from "@/interfaces/interfaces";
import {loadItemTypeModules} from "@/utils/three/model-loader";
import {ThreeSceneBase} from "@/utils/three/ThreeSceneBase";

export class MapPreviewerRenderer extends ThreeSceneBase {
    private controls: OrbitControls;
    private mapContainer: Group;
    private models: { [key: string]: Group };
    private mapItemList: Object3D[];

    constructor(canvas: HTMLCanvasElement) {
        super(canvas);
        this.scene.background = new Color(0xeeeeee);
        this.camera.fov = 45;
        this.renderer.outputColorSpace = SRGBColorSpace;
        this.mapContainer = new Group();
        this.models = {};
        this.mapItemList = [];
        this.requestAnimationFrameId = -1;

        this.scene.add(this.mapContainer);

        //创建灯光
        this.scene.add(new AmbientLight(0xffffff, 4.5));

        // 创建轨道控制器
        this.controls = new OrbitControls(this.camera, canvas);

        const loop = () => {
            this.requestAnimationFrameId = requestAnimationFrame(loop);

            this.controls.update();

            super.render();
        }

        loop();
    }

    public async loadModels(itemTypeList: ItemType[]) {
        this.setLoadingMaskVisible(true);
        const modelList = await loadItemTypeModules(itemTypeList.map((itemType) => itemType));
        const tempModelOBJ: { [key: string]: Group } = {};
        modelList.forEach((model) => {
            tempModelOBJ[model.id] = model.glft.scene;
        });
        this.models = tempModelOBJ;
        this.setLoadingMaskVisible(false);
    }

    public async loadMapItems(mapItemList: MapItem[]) {
        this.setLoadingMaskVisible(true);
        mapItemList.forEach((item) => {
            const tempModule = this.models[item.type.id].clone();
            tempModule.scale.set(0.5, 0.5, 0.5);
            tempModule.position.set(item.x + item.type.size / 2, 0, item.y + item.type.size / 2);
            tempModule.rotation.y = (Math.PI / 2) * item.rotation;
            this.mapContainer.add(tempModule);
        });
        this.setLoadingMaskVisible(false);
    }

    public async reloadMapItems(mapItemList: MapItem[]) {
        this.mapContainer.clear();
        await this.loadMapItems(mapItemList);
        this.lookAtCenter();
    }

    public lockCamera(isLock: boolean) {
        this.controls.enabled = !isLock;
        if (isLock) {
            this.lookAtCenter();
        }
    }

    public lookAtCenter() {
        // 获取场景中所有对象的中心点和最大高度
        const bbox = new Box3().setFromObject(this.mapContainer);

        const center = bbox.getCenter(new Vector3());
        const size = bbox.getSize(new Vector3());

        const maxSize = Math.max(...[size.x, size.z]);

        // 将相机移到合适的位置
        const distance = maxSize * Math.tan(this.camera.fov / 2) * 2;

        this.camera.position.set(center.x, center.y + distance * 1.2, center.z);
        this.camera.up.set(0, 0, -1);
        this.camera.lookAt(center);
        this.controls.target.set(center.x, center.y, center.z);
    }

    public destroy() {
        super.destroy();
    }
}
