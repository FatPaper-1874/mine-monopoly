import { GameMap } from "@fatpaper-monopoly/types";
import { debounce, ThreeSceneBase } from "@fatpaper-monopoly/utils";
import { CameraMode, OperationMode } from "@src/enums";
import { useEditorStore, useMapDataStore, useResourceStore } from "@src/stores";
import { eventBus } from "@src/utils/event-bus";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import gsap from "gsap";
import { MapItem, MapItemType } from "@fatpaper-monopoly/types/interfaces/game/item";
import { applyOpacityToObject, createDynamicLine, createMultiLine, DynamicLine, getModelById } from "@src/utils/three";
import { render } from "vue";
import { handleSaveProtoFile } from "@src/utils/file";
import { SolidOutlinePass } from "@src/utils/three/passes/SolidOutLinePass";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { GammaCorrectionShader } from "three/examples/jsm/shaders/GammaCorrectionShader";
import { message } from "ant-design-vue";

interface MapItemTypeWithModel extends MapItemType {
	model: THREE.Object3D;
}

export class MapRenderer {
	private canvasEl: HTMLCanvasElement;
	private renderer: THREE.WebGLRenderer;
	private scene: THREE.Scene;
	private camera: THREE.Camera;
	private requestAnimationFrameId: number = -1;
	private resizeObserver: ResizeObserver | undefined;

	private controls: OrbitControls;
	private cameraTarget = new THREE.Vector3(0, 0, 0);
	private currentRotation: 0 | 1 | 2 | 3 = 0;
	private outlinePass: SolidOutlinePass;
	private linkOutlinePass: SolidOutlinePass;
	private composer: EffectComposer;

	private itemTypesCache: Map<string, MapItemTypeWithModel> = new Map();

	private raycaster: THREE.Raycaster = new THREE.Raycaster();
	private point: THREE.Vector2 = new THREE.Vector2(0, 0);
	private plane: THREE.Mesh;
	private previewBoxInCreate: THREE.Object3D | undefined;
	private mapItemsInScene: Map<string, THREE.Object3D> = new Map();
	private mapItemGroup: THREE.Group = new THREE.Group();
	private mapIndexLineGroup: THREE.Group = new THREE.Group();
	private linkLineInScene: Map<string, THREE.Object3D> = new Map();
	private linkLineGroup: THREE.Group = new THREE.Group();
	private mapEventInScene: Map<string, THREE.Object3D> = new Map();
	private mapEventGroup: THREE.Group = new THREE.Group();
	private linkHelperLine: DynamicLine;

	constructor(canvasEl: HTMLCanvasElement) {
		this.renderer = new THREE.WebGLRenderer({ canvas: canvasEl });
		this.canvasEl = canvasEl;
		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(75, this.canvasEl.clientWidth / this.canvasEl.clientHeight, 0.1, 100);
		// this.renderLoop();
		this.renderer.setSize(this.canvasEl.clientWidth, this.canvasEl.clientHeight);
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;

		this.scene.background = new THREE.Color(0xbbbbbb);
		this.requestAnimationFrameId = -1;

		// 灯光
		this.scene.add(new THREE.AmbientLight(0xffffff, 4.5));

		// 链接辅助线
		this.linkHelperLine = createDynamicLine(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0));
		this.scene.add(this.linkHelperLine.line);

		// 相机初始位置
		this.camera.position.set(0, 10, 0);

		// 轨道控制器
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.target.copy(this.cameraTarget);
		this.controls.update();

		// 网格
		const gridHelper = new THREE.GridHelper(10000, 10000, 0x6666ff);
		this.scene.add(gridHelper);

		const planeGeometry = new THREE.PlaneGeometry(1000, 1000);
		const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0, transparent: true });
		this.plane = new THREE.Mesh(planeGeometry, planeMaterial);
		this.plane.rotateX(-Math.PI / 2);
		this.plane.position.set(0, 0, 0);

		this.scene.add(this.plane);

		//加载物块容器
		this.scene.add(this.mapItemGroup);

		//加载辅助线
		this.scene.add(this.linkLineGroup);

		//加载地图事件图标
		this.scene.add(this.mapEventGroup);

		//加载地图索引路径
		this.scene.add(this.mapIndexLineGroup);

		this.composer = new EffectComposer(this.renderer);
		this.composer.addPass(new RenderPass(this.scene, this.camera));
		const size = new THREE.Vector2(canvasEl.clientWidth, canvasEl.clientHeight);

		this.outlinePass = new SolidOutlinePass(size, this.scene, this.camera);
		this.outlinePass.edgeStrength = 10;
		this.outlinePass.edgeThickness = 1.5;
		this.outlinePass.visibleEdgeColor.set(0xffffff);
		this.outlinePass.hiddenEdgeColor.set(0xffffff);
		this.composer.addPass(this.outlinePass);

		this.linkOutlinePass = new SolidOutlinePass(size, this.scene, this.camera);
		this.linkOutlinePass.edgeStrength = 8;
		this.linkOutlinePass.edgeThickness = 1.5;
		this.linkOutlinePass.visibleEdgeColor.set(0x6611ff);
		this.linkOutlinePass.hiddenEdgeColor.set(0x6611ff);
		this.composer.addPass(this.linkOutlinePass);

		const gammaPass = new ShaderPass(GammaCorrectionShader);
		this.composer.addPass(gammaPass);

		this.switchCameraMode(useEditorStore().currentCameraMode);

		window.addEventListener("resize", () => {
			const w = canvasEl.clientWidth;
			const h = canvasEl.clientHeight;
			(this.camera as THREE.PerspectiveCamera).aspect = w / h;
			(this.camera as THREE.PerspectiveCamera).updateProjectionMatrix();
			this.renderer.setSize(w, h);
			this.composer.setSize(w, h);
			this.outlinePass.setSize(w, h); // 避免 framebuffer zero size
		});
		this.initEventListeners();
		eventBus.emit("renderer-ready");

		// 渲染循环
		const loop = () => {
			this.requestAnimationFrameId = requestAnimationFrame(loop);
			this.controls.update();
			this.composer.render();
		};
		loop();
	}

	private initEventListeners() {
		eventBus.on("map-loaded", async (mapData) => {
			await this.loadMap(mapData);
		});

		eventBus.on("map-background-update", () => {
			this.loadMapBackground();
		});

		eventBus.on("change-operation-mode", (newMode) => {
			switch (newMode) {
				case OperationMode.Edit:
					this.outlinePass.selectedObjects = [];
					this.linkOutlinePass.selectedObjects = [];
					break;
				case OperationMode.Select:
					useEditorStore().currentMapItemTypeId = "";
					this.updatePreviewBox();
					break;
			}
			useEditorStore().currentMapItemId = "";
			useEditorStore().isLinkMode = false;
		});

		eventBus.on("change-camera-mode", (newMode) => {
			this.switchCameraMode(newMode);
		});

		eventBus.on("change-link-mode", (isLinkMode) => {
			if (!isLinkMode) {
				this.outlinePass.selectedObjects = [];
				this.linkOutlinePass.selectedObjects = [];
			}
		});

		eventBus.on("map-item-link", (id) => {
			this.handleMapItemLink(id);
		});

		eventBus.on("map-item-unlink", (id) => {
			this.handleMapItemUnLink(id);
		});

		eventBus.on("map-event-link", (id) => {
			this.handleMapEventLink(id);
		});

		eventBus.on("map-event-unlink", (id) => {
			this.handleMapEventUnLink(id);
		});

		eventBus.on("map-index-update", (indexList) => {
			this.updateMapIndex([...indexList]);
		});

		eventBus.on("map-item-type-selected", (itemTypeId) => {
			this.updatePreviewBox(itemTypeId);
		});

		eventBus.on("map-item-deleted", (mapItemId) => {
			this.removeMapItem(mapItemId);
		});

		this.initMouseListener();
		this.initKeyBoardListener();
	}

	private initMouseListener() {
		this.canvasEl.addEventListener("mousemove", this.handleMouseMove.bind(this));
		this.canvasEl.addEventListener("click", this.handleMouseClick.bind(this));
	}

	private initKeyBoardListener() {
		document.addEventListener("keypress", this.handleKeyPress.bind(this));
	}

	private handleMouseMove(event: MouseEvent) {
		const mouseX = (event.offsetX / this.canvasEl.clientWidth) * 2 - 1;
		const mouseY = -(event.offsetY / this.canvasEl.clientHeight) * 2 + 1;

		this.point.set(mouseX, mouseY);

		this.raycaster.setFromCamera(this.point, this.camera);

		switch (useEditorStore().currentEditMode) {
			case OperationMode.Edit:
				this.handleMouseMoveInCreate();
				break;
			case OperationMode.Select:
				this.handleMouseMoveInSelect();
				break;
			default:
				this.handleMouseMoveInMove();
				break;
		}
	}

	private handleMouseMoveInCreate() {
		const throughInstances = this.raycaster.intersectObjects([this.plane], false);
		// console.log(throughInstances);
		if (throughInstances.length > 0) {
			const firstInstance = throughInstances[0];
			const x = Math.floor(firstInstance.point.x);
			const z = Math.floor(firstInstance.point.z);
			//旋转TODO
			if (this.previewBoxInCreate) this.setItemPositionOnMap(this.previewBoxInCreate, x, z, this.currentRotation);
		}
	}

	private handleMouseMoveInSelect() {
		const throughInstances = this.raycaster.intersectObjects(Array.from(this.mapItemsInScene.values()), true);
		if (throughInstances.length > 0) {
			const firstInstance = throughInstances[0];
			const target = firstInstance.object;
			//选择后
		} else {
			//TODO
		}
	}

	private handleMouseMoveInMove() {}

	private handleMouseClick(event: MouseEvent) {
		const mouseX = (event.offsetX / this.canvasEl.clientWidth) * 2 - 1;
		const mouseY = -(event.offsetY / this.canvasEl.clientHeight) * 2 + 1;

		this.point.set(mouseX, mouseY);

		this.raycaster.setFromCamera(this.point, this.camera);

		switch (useEditorStore().currentEditMode) {
			case OperationMode.Edit:
				this.handleMouseClickInCreate();
				this.outlinePass.selectedObjects = [];
				break;
			case OperationMode.Select:
				this.handleMouseClickInSelect();
				break;
		}
	}

	private handleMouseClickInCreate() {
		const throughInstances = this.raycaster.intersectObjects([this.plane], false);
		if (throughInstances.length > 0) {
			const firstInstance = throughInstances[0];
			const x = Math.floor(firstInstance.point.x);
			const z = Math.floor(firstInstance.point.z);
			const rotation = this.currentRotation;
			const currentItemType = useEditorStore().currentMapItemType;
			console.log("🚀 ~ MapRenderer ~ handleMouseClickInCreate ~ currentItemType:", currentItemType);
			if (currentItemType) this.createMapItem(x, z, rotation, currentItemType);
		}
	}

	private handleMouseClickInSelect() {
		const throughInstances = this.raycaster.intersectObjects(Array.from(this.mapItemsInScene.values()), true);
		if (throughInstances.length > 0) {
			const firstInstance = throughInstances[0];
			const target = firstInstance.object;

			let temp: THREE.Object3D | null = target;
			while (temp) {
				if (temp.userData.id && temp.userData.position) {
					const isLinkMode = useEditorStore().isLinkMode;
					const id = temp.userData.id;
					this.linkOutlinePass.selectedObjects = [];
					if (isLinkMode) {
						//链接模式选择第二个MapItem
						this.linkOutlinePass.selectedObjects = [temp];
						eventBus.emit("other-map-item-selected", id);
					} else {
						this.itemSelected(id);
						this.outlinePass.selectedObjects = [temp];
						//把绑定的另一方高亮
						const mapItem = useMapDataStore().findMapItemById(id);
						if (mapItem) {
							const targetId = mapItem.beLinked || mapItem.linkto || "";
							const target = this.mapItemsInScene.get(targetId);
							if (target) this.linkOutlinePass.selectedObjects = [target];
						}
					}
					break;
				} else {
					temp = temp.parent;
				}
			}
		} else {
			this.clearSelect();
			eventBus.emit("other-map-item-selected", "");
		}
	}

	private async handleKeyPress(event: KeyboardEvent) {
		if (event.ctrlKey && event.code === "KeyS") {
			event.preventDefault();
			await handleSaveProtoFile();
		}
		if (useEditorStore().currentEditMode !== OperationMode.Edit || !this.previewBoxInCreate) return;
		if (event.code === "KeyR") {
			this.currentRotation = (++this.currentRotation % 4) as 0 | 1 | 2 | 3;
			this.previewBoxInCreate.rotation.y = (Math.PI / 2) * this.currentRotation;
		}
		if (event.code === "KeyQ") {
			useEditorStore().currentMapItemTypeId = "";
			this.updatePreviewBox();
		}
	}

	private itemSelected(id: string) {
		useEditorStore().currentMapItemId = id;
	}

	// private handleLinkLine() {
	// 	const editorStore = useEditorStore();
	// 	if (editorStore.isLinkMode) {
	// 		const start = editorStore.currentMapItem;
	// 		if (!start) throw Error("在链接模式时没有选中MapItem");
	// 		const end = this.raycaster;
	// 		console.log("🚀 ~ MapRenderer ~ handleLinkLine ~ end:", end);
	// 	}
	// }

	private switchCameraMode(newMode: CameraMode) {
		const width = this.canvasEl.clientWidth;
		const height = this.canvasEl.clientHeight;
		const aspect = width / height;
		const distance = this.camera.position.distanceTo(this.cameraTarget);

		let newCamera: THREE.Camera;

		if (newMode === CameraMode.Perspective) {
			newCamera = new THREE.PerspectiveCamera(75, aspect, 0.1, 100);
		} else {
			const frustumSize = distance * 2;
			newCamera = new THREE.OrthographicCamera(
				(frustumSize * aspect) / -2,
				(frustumSize * aspect) / 2,
				frustumSize / 2,
				frustumSize / -2,
				0.1,
				50
			);
		}

		// 替换相机
		this.camera = newCamera;

		// 重建 OrbitControls
		this.controls.dispose();
		this.controls = new OrbitControls(this.camera, this.canvasEl);
		this.controls.target.copy(this.cameraTarget);

		// 控制器限制
		if (newMode === CameraMode.Orthographic) {
			// this.controls.maxPolarAngle = Math.PI / 2;
			// this.controls.minPolarAngle = Math.PI / 2;
			this.controls.enableRotate = false;
			this.controls.enablePan = true;
			// 鼠标左键也用于平移
			this.controls.mouseButtons = {
				LEFT: THREE.MOUSE.PAN,
				MIDDLE: THREE.MOUSE.DOLLY,
				RIGHT: THREE.MOUSE.PAN,
			};
		} else {
			this.controls.maxPolarAngle = Math.PI;
			this.controls.minPolarAngle = 0;
			this.controls.enableRotate = true;
			this.controls.enablePan = true;
			this.controls.mouseButtons = {
				LEFT: THREE.MOUSE.ROTATE,
				MIDDLE: THREE.MOUSE.DOLLY,
				RIGHT: THREE.MOUSE.PAN,
			};
		}

		this.controls.update();

		// 俯视动画（XZ 平面）
		const targetPos = {
			x: this.cameraTarget.x,
			y: this.cameraTarget.y + distance,
			z: this.cameraTarget.z,
		};

		// 直接设置位置
		this.camera.position.set(targetPos.x, targetPos.y, targetPos.z);
		this.camera.up.set(0, 1, 0);
		this.camera.lookAt(this.cameraTarget.x, this.cameraTarget.y, this.cameraTarget.z);

		this.outlinePass.renderCamera = this.camera;
		this.linkOutlinePass.renderCamera = this.camera;
		this.composer.passes.forEach((pass) => {
			if ("camera" in pass) {
				(pass as any).camera = this.camera;
			}
		});
		this.lookAtCenter();

		this.controls.update();
	}

	private setItemPositionOnMap(object: THREE.Object3D, x: number, z: number, rotation = 0, y: number = 0) {
		object.position.set(x + 0.5, y, z + 0.5);
		object.rotation.y = (Math.PI / 2) * rotation;
	}

	public setCameraTarget(x: number, y: number, z: number) {
		this.cameraTarget.set(x, y, z);
		this.controls.target.copy(this.cameraTarget);
		this.controls.update();
	}

	private async createMapItem(x: number, y: number, rotation: 0 | 1 | 2 | 3, currentItemType: MapItemType) {
		const newMapItem: MapItem = {
			id: `map-item-${crypto.randomUUID()}`,
			x,
			y,
			rotation,
			type: currentItemType,
		};
		if (useMapDataStore().hasMapItemRepeatCoord(x, y)) {
			message.error("这个坐标已经有一个MapItem了", 1);
			return;
		}
		useMapDataStore().addMapItem(newMapItem);
		await this.renderMapItemToMap(newMapItem);
	}

	private removeMapItem(id: string) {
		const mapItem = this.mapItemsInScene.get(id);
		if (!mapItem) throw Error("编辑器中找不到这个MapItem");
		this.mapItemGroup.remove(mapItem);
		this.mapItemsInScene.delete(id);
	}

	private async renderMapItemToMap(mapItem: MapItem) {
		let itemTypeCache = this.itemTypesCache.get(mapItem.type.id);
		if (!itemTypeCache) {
			const glft = await getModelById(mapItem.type.modelId);
			const model = glft.scene;
			itemTypeCache = { ...mapItem.type, model };
			this.itemTypesCache.set(mapItem.type.id, itemTypeCache);
		}
		const mapItemModel = new THREE.Object3D().copy(itemTypeCache.model);
		mapItemModel.scale.set(0.5, 0.5, 0.5);
		mapItemModel.userData["position"] = { x: mapItem.x, y: mapItem.y };
		mapItemModel.userData["rotation"] = mapItem.rotation;
		mapItemModel.userData["id"] = mapItem.id;
		this.setItemPositionOnMap(mapItemModel, mapItem.x, mapItem.y, mapItem.rotation);
		this.mapItemsInScene.set(mapItem.id, mapItemModel);
		this.mapItemGroup.add(mapItemModel);
	}

	public async loadMap(mapData: GameMap) {
		mapData = { ...mapData };
		useEditorStore().setLoading(true);
		this.mapItemGroup.clear();
		this.itemTypesCache.clear();
		const mapItemList = mapData.mapItems;
		//加载MapItem
		for (const mapItem of mapItemList) {
			await this.renderMapItemToMap(mapItem);
		}
		//加载MapItem连接
		for (const mapItem of mapItemList) {
			this.addLinkLine(mapItem);
		}
		//加载事件icon
		for (const mapItem of mapItemList) {
			await this.addMapEventIcon(mapItem);
		}

		this.loadMapBackground();
		//加载索引路径
		this.updateMapIndex([...mapData.mapIndex]);
		//TODO
		useEditorStore().setLoading(false);
		this.lookAtCenter();
	}

	private async loadMapBackground() {
		const imageResourceId = useMapDataStore().info.backgroundImageId;
		const imageResource = useResourceStore().findImageById(imageResourceId);
		if (!imageResource) return;
		const imageUrl = imageResource.url;
		const textureLoader = new THREE.TextureLoader();
		const texture = await textureLoader.loadAsync(imageUrl);
		texture.colorSpace = THREE.SRGBColorSpace;
		this.scene.background = texture;
	}

	private handleMapItemLink(id: string) {
		const mapItem = useMapDataStore().findMapItemById(id);
		if (!mapItem) return;
		this.addLinkLine(mapItem);
		this.clearSelect();
	}

	private handleMapItemUnLink(id: string) {
		this.removeLinkLine(id);
		this.clearSelect();
	}

	private handleMapEventLink(id: string) {
		const mapItem = useMapDataStore().findMapItemById(id);
		if (!mapItem) return;
		this.addMapEventIcon(mapItem);
		this.clearSelect();
	}

	private handleMapEventUnLink(id: string) {
		this.removeMapEventIcon(id);
		this.clearSelect();
	}

	private clearSelect() {
		useEditorStore().currentMapItemId = "";
		useEditorStore().isLinkMode = false;
		this.outlinePass.selectedObjects = [];
		this.linkOutlinePass.selectedObjects = [];
	}

	private async updatePreviewBox(itemTypeId?: string) {
		if (this.previewBoxInCreate) this.scene.remove(this.previewBoxInCreate);
		if (!itemTypeId) return;
		const itemType = useMapDataStore().findMapItemTypeById(itemTypeId);
		if (itemType) {
			const gltf = await getModelById(itemType.modelId);
			if (!gltf) return;
			const newPreModel = gltf.scene;
			newPreModel.scale.set(0.5, 0.5, 0.5);
			applyOpacityToObject(newPreModel, 0.5);
			this.previewBoxInCreate = newPreModel;
			this.scene.add(this.previewBoxInCreate);
		}
	}

	private addLinkLine(mapItem: MapItem) {
		if (!mapItem.linkto) return;
		const startMapItem = this.mapItemsInScene.get(mapItem.id);
		const endMapItem = this.mapItemsInScene.get(mapItem.linkto);
		if (startMapItem && endMapItem) {
			const startPoint = new THREE.Vector3().copy(startMapItem.position);
			const endPoint = new THREE.Vector3().copy(endMapItem.position);
			startPoint.y = startPoint.y + 0.1;
			endPoint.y = endPoint.y + 0.1;
			const line = createMultiLine([startPoint, endPoint], {
				color: 0x8844ff,
				dashed: true,
				dashScale: 1,
				dashSize: 0.1,
				gapSize: 0.1,
			});
			this.linkLineInScene.set(mapItem.id, line);
			this.linkLineGroup.add(line);
		}
	}

	private removeLinkLine(mapItemId: string) {
		const line = this.linkLineInScene.get(mapItemId);
		if (line) {
			this.linkLineInScene.delete(mapItemId);
			this.linkLineGroup.remove(line);
		}
	}

	private async addMapEventIcon(mapItem: MapItem) {
		const textureLoader = new THREE.TextureLoader();
		if (!mapItem.mapEventId) return;
		const mapEvent = useMapDataStore().findMapEventById(mapItem.mapEventId);
		if (!mapEvent) throw Error(`没找到Id为 "${mapItem.id}" 的事件`);
		const imageInfo = useResourceStore().findImageById(mapEvent.iconId);
		if (!imageInfo) throw Error(`没找到事件 "${mapEvent.name}" 的icon资源`);
		const texture = await textureLoader.loadAsync(imageInfo.url);
		texture.colorSpace = THREE.SRGBColorSpace;
		const planeGeometry = new THREE.PlaneGeometry(1, 1);
		const planeMaterial = new THREE.MeshBasicMaterial({
			map: texture,
			side: THREE.DoubleSide,
			transparent: true,
			depthTest: false,
			depthWrite: false,
		});
		const iconPlane = new THREE.Mesh(planeGeometry, planeMaterial);
		iconPlane.rotateX(-Math.PI / 2);
		iconPlane.renderOrder = 999;
		this.mapEventInScene.set(mapItem.id, iconPlane);
		this.mapEventGroup.add(iconPlane);
		this.setItemPositionOnMap(iconPlane, mapItem.x, mapItem.y, undefined, 0.1);
	}

	private removeMapEventIcon(mapItemId: string) {
		const mapEventIcon = this.mapEventInScene.get(mapItemId);
		if (mapEventIcon) {
			this.mapEventInScene.delete(mapItemId);
			this.mapEventGroup.remove(mapEventIcon);
		}
	}

	private updateMapIndex(indexList: string[]) {
		if (indexList.length === 0) {
			this.mapIndexLineGroup.clear();
			return;
		}
		//接头
		indexList.push(indexList[0]);
		const mapItemPositionList = indexList.map((mapItemId) => {
			const mapItem = this.mapItemsInScene.get(mapItemId);
			if (mapItem) {
				const p = new THREE.Vector3();
				p.copy(mapItem.position);
				p.y = 0.1;
				return p;
			} else {
				throw new Error("错误的路径");
			}
		});
		const line = createMultiLine(mapItemPositionList, {
			color: 0x009ad6,
			dashed: true,
			dashScale: 3,
			dashSize: 0.2,
			gapSize: 0.2,
		});
		this.mapIndexLineGroup.add(line);
	}

	public lookAtCenter() {
		if (this.mapItemGroup.children.length <= 0) return;
		// 获取场景中所有对象的中心点和最大高度
		const bbox = new THREE.Box3().setFromObject(this.mapItemGroup);

		const center = bbox.getCenter(new THREE.Vector3());
		const size = bbox.getSize(new THREE.Vector3());

		const maxSize = Math.max(...[size.x, size.z]);

		// 将相机移到合适的位置
		let distance = 0;
		if (this.camera instanceof THREE.PerspectiveCamera) {
			distance = maxSize * Math.tan(this.camera.fov / 2) * 4;
		} else if (this.camera instanceof THREE.OrthographicCamera) {
			// 获取渲染器的宽高比
			const aspect = this.renderer.domElement.width / this.renderer.domElement.height;

			// 根据宽高比调整正交相机的边界
			distance = maxSize * 1.2;
			const halfHeight = distance / 2;
			const halfWidth = halfHeight * aspect;

			this.camera.left = -halfWidth;
			this.camera.right = halfWidth;
			this.camera.top = halfHeight;
			this.camera.bottom = -halfHeight;
			this.camera.near = 0.1;
			this.camera.far = center.y + distance * 2;
			this.camera.updateProjectionMatrix();
		}
		console.log("🚀 ~ MapRenderer ~ lookAtCenter ~ distance:", distance);

		this.camera.position.set(center.x, center.y + Math.abs(distance) * 1.2, center.z);
		// this.camera.up.set(0, 0, -1);
		this.camera.lookAt(center);
		this.controls.target.set(center.x, center.y, center.z);
	}

	public destroy(): void {
		this.resizeObserver && this.resizeObserver.disconnect();
		cancelAnimationFrame(this.requestAnimationFrameId);
		this.scene.traverse((object) => {
			//@ts-ignore
			object.geometry && object.geometry.dispose();
			//@ts-ignore
			object.texture && object.texture.dispose();
			//@ts-ignore
			object.material && object.material.dispose();
		});
		this.scene.clear();
		this.renderer.dispose();
		this.renderer.forceContextLoss();
		let gl = this.renderer.domElement.getContext("webgl");
		if (gl) {
			const e = gl.getExtension("WEBGL_lose_context");
			e && e.loseContext();
		}
		this.canvasEl.removeEventListener("mousemove", this.handleMouseMove);
		this.canvasEl.removeEventListener("click", this.handleMouseClick);
		document.removeEventListener("keyup", this.handleKeyPress);
	}
}
