import { __MONOPOLYSERVER__, __PROTOCOL__ } from "@G/global.config";
import { ItemType, MapItem } from "@/interfaces/interfaces";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { OperationMode } from "./enum/OperationMode";
import { applyOpacityToObject, createLineWithArrow } from "./utils";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { GammaCorrectionShader } from "three/examples/jsm/shaders/GammaCorrectionShader";
import { getDracoLoader } from "@/utils/three/draco";

const BLOCK_HEIGHT = 0.09;

export class MapEditor {
	//静态数据
	private size: number;

	//动态数据
	private mode: OperationMode;
	private currentRotation: 0 | 1 | 2 | 3;
	//动态数据--缓存
	private itemTypes: Map<string, ItemType> = new Map();
	private mapItems: Map<string, MapItem> = new Map();
	private mapIndex: string[] = [];
	private mapItemsInScene: Map<string, THREE.Object3D> = new Map();
	private models: Map<string, THREE.Object3D> = new Map();
	private background: THREE.Texture | undefined;
	private currentItemType: ItemType | undefined;

	//THREE.js 核心对象
	private canvasEl: HTMLCanvasElement;
	private scene: THREE.Scene;
	private camera: THREE.Camera;
	private renderer: THREE.WebGLRenderer;
	private ambientLight: THREE.AmbientLight;
	// private pointLight: THREE.PointLight;
	private controls: OrbitControls;
	private composer: EffectComposer;

	//场景物体对象
	private plane: THREE.Mesh;
	private previewBoxInCreate: THREE.Object3D | undefined;
	private point: THREE.Vector2;
	private linkLinesContainer: THREE.Group = new THREE.Group();
	private pathLinesContainer: THREE.Group = new THREE.Group();
	private arrivedEventiconContainer: THREE.Group = new THREE.Group();

	//工具对象
	private raycaster: THREE.Raycaster;
	private gridHelper: THREE.GridHelper;
	private previewOutlinePass: OutlinePass;
	private selectOutlinePass: OutlinePass;
	private linkItemOutlinePass: OutlinePass;
	private renderPass: RenderPass;

	//回调函数
	private createItemCallback?: (x: number, y: number, rotation: 0 | 1 | 2 | 3, itemType: ItemType) => void;
	private itemSelectedCallback?: (x: number, y: number, id: string) => void;

	constructor(canvasEl: HTMLCanvasElement, size: number = 21, operationMode: OperationMode = OperationMode.MOVE) {
		this.currentRotation = 0;
		this.canvasEl = canvasEl;
		this.size = size;
		this.mode = operationMode;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0xffffff);
		this.renderer = new THREE.WebGLRenderer({ canvas: canvasEl });
		this.renderer.setSize(this.canvasEl.clientWidth, this.canvasEl.clientHeight);
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.camera = new THREE.PerspectiveCamera(45, canvasEl.clientWidth / canvasEl.clientHeight, 0.1, 1000);
		this.camera.position.set(this.size / 2, (this.size * 3) / 2, this.size * 1.3);
		this.scene.add(this.camera);
		this.scene.add(this.linkLinesContainer);
		this.scene.add(this.pathLinesContainer);
		this.scene.add(this.arrivedEventiconContainer);

		this.composer = new EffectComposer(this.renderer);
		this.composer.setSize(this.canvasEl.clientWidth, this.canvasEl.clientHeight);

		this.previewOutlinePass = new OutlinePass(
			new THREE.Vector2(this.canvasEl.clientWidth, this.canvasEl.clientHeight),
			this.scene,
			this.camera
		);
		this.selectOutlinePass = new OutlinePass(
			new THREE.Vector2(this.canvasEl.clientWidth, this.canvasEl.clientHeight),
			this.scene,
			this.camera
		);
		this.linkItemOutlinePass = new OutlinePass(
			new THREE.Vector2(this.canvasEl.clientWidth, this.canvasEl.clientHeight),
			this.scene,
			this.camera
		);
		this.initOutlinePass();
		this.renderPass = new RenderPass(this.scene, this.camera);
		this.composer.addPass(this.renderPass);
		this.composer.addPass(this.previewOutlinePass);
		this.composer.addPass(this.selectOutlinePass);
		this.composer.addPass(this.linkItemOutlinePass);
		const gammaPass = new ShaderPass(GammaCorrectionShader);
		this.composer.addPass(gammaPass);

		this.ambientLight = new THREE.AmbientLight(0xffffff, 5);
		this.scene.add(this.ambientLight);

		const planeGeometry = new THREE.PlaneGeometry(this.size, this.size);
		const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0, transparent: true });
		this.plane = new THREE.Mesh(planeGeometry, planeMaterial);
		this.plane.rotateX(-Math.PI / 2);
		this.plane.position.set(this.size / 2, 0, this.size / 2);

		this.point = new THREE.Vector2(0, 0);

		this.scene.add(this.plane);
		// this.scene.add(this.previewBox);

		this.raycaster = new THREE.Raycaster();
		this.gridHelper = new THREE.GridHelper(this.size, this.size);
		this.gridHelper.position.set(this.size / 2, 0, this.size / 2);
		this.scene.add(this.gridHelper);

		this.controls = new OrbitControls(this.camera, this.canvasEl);
		this.controls.target = new THREE.Vector3(this.size / 2, 0, this.size / 2);

		const renderLoop = () => {
			requestAnimationFrame(renderLoop);
			this.controls.update();
			this.composer.render();
			// this.update();
		};

		renderLoop();

		this.initOutlinePass();
		this.initMouseListener();
		this.initKeyBoardListener();
	}

	private initMouseListener() {
		this.canvasEl.addEventListener("mousemove", this.handleMouseMove.bind(this));
		this.canvasEl.addEventListener("click", this.handleMouseClick.bind(this));
	}

	private initKeyBoardListener() {
		document.addEventListener("keyup", this.handleKeyUp.bind(this));
	}

	private initOutlinePass() {
		const _this = this;
		//初始化预览用的描边
		this.previewOutlinePass.renderToScreen = true;
		this.previewOutlinePass.visibleEdgeColor.set(0xff6622);
		this.previewOutlinePass.hiddenEdgeColor.set(0xff6622);
		this.previewOutlinePass.edgeStrength = 5;
		this.previewOutlinePass.edgeThickness = 1;
		this.previewOutlinePass.usePatternTexture = false;
		//初始化选择后的描边
		this.selectOutlinePass.renderToScreen = true;
		this.selectOutlinePass.visibleEdgeColor.set(0xff0000);
		this.selectOutlinePass.hiddenEdgeColor.set(0xff0000);
		this.selectOutlinePass.edgeStrength = 5;
		this.selectOutlinePass.edgeThickness = 1;
		this.selectOutlinePass.usePatternTexture = true;
		new THREE.TextureLoader().load("images/tri_pattern.jpg", function (texture) {
			_this.selectOutlinePass.patternTexture = texture;
			texture.wrapS = THREE.RepeatWrapping;
			texture.wrapT = THREE.RepeatWrapping;
		});

		//初始化显示link关系的描边
		this.linkItemOutlinePass.renderToScreen = true;
		this.linkItemOutlinePass.visibleEdgeColor.set(0xffdd22);
		this.linkItemOutlinePass.hiddenEdgeColor.set(0xffdd22);
		this.linkItemOutlinePass.edgeStrength = 3;
		this.linkItemOutlinePass.edgeThickness = 1;
		this.linkItemOutlinePass.usePatternTexture = false;
	}

	private handleMouseMove(event: MouseEvent) {
		const mouseX = (event.offsetX / this.canvasEl.clientWidth) * 2 - 1;
		const mouseY = -(event.offsetY / this.canvasEl.clientHeight) * 2 + 1;

		this.point.set(mouseX, mouseY);

		this.raycaster.setFromCamera(this.point, this.camera);

		switch (this.mode) {
			case OperationMode.CREATE:
				this.handleMouseMoveInCreate();
				break;
			case OperationMode.SELECT:
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
			if (this.previewBoxInCreate) this.setItemPositionOnMap(this.previewBoxInCreate, x, z, this.currentRotation);
		}
	}

	private handleMouseMoveInSelect() {
		const throughInstances = this.raycaster.intersectObjects(Array.from(this.mapItemsInScene.values()), true);
		if (throughInstances.length > 0) {
			const firstInstance = throughInstances[0];
			const target = firstInstance.object;
			if (target.parent) {
				this.previewOutlinePass.selectedObjects = [target.parent];
			} else {
				this.previewOutlinePass.selectedObjects = [target];
			}
		} else {
			this.previewOutlinePass.selectedObjects = [];
		}
	}

	private handleMouseMoveInMove() {}

	private handleMouseClick(event: MouseEvent) {
		const mouseX = (event.offsetX / this.canvasEl.clientWidth) * 2 - 1;
		const mouseY = -(event.offsetY / this.canvasEl.clientHeight) * 2 + 1;

		this.point.set(mouseX, mouseY);

		this.raycaster.setFromCamera(this.point, this.camera);

		switch (this.mode) {
			case OperationMode.CREATE:
				this.handleMouseClickInCreate();
				break;
			case OperationMode.SELECT:
				this.handleMouseClickInSelect();
				break;
		}
	}

	private handleKeyUp(event: KeyboardEvent) {
		if (this.mode !== OperationMode.CREATE || !this.previewBoxInCreate) return;
		if (event.key === "r" || event.key === "R") {
			this.currentRotation = (++this.currentRotation % 4) as 0 | 1 | 2 | 3;
			this.previewBoxInCreate.rotation.y = (Math.PI / 2) * this.currentRotation;
		}
	}

	private handleMouseClickInCreate() {
		const throughInstances = this.raycaster.intersectObjects([this.plane], false);
		if (throughInstances.length > 0) {
			const firstInstance = throughInstances[0];
			const x = Math.floor(firstInstance.point.x);
			const z = Math.floor(firstInstance.point.z);
			const rotation = this.currentRotation;
			if (this.currentItemType) this.createItem(x, z, rotation, this.currentItemType);
			if (this.previewBoxInCreate) this.setItemPositionOnMap(this.previewBoxInCreate, x, z, this.currentRotation);
			this.currentRotation = 0;
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
					const position = temp.userData.position;
					const id = temp.userData.id;
					this.itemSelected(position.x, position.y, id);
					this.selectOutlinePass.selectedObjects = [temp];
					break;
				} else {
					temp = temp.parent;
				}
			}

			// if (target.parent) {
			// 	this.selectOutlinePass.selectedObjects = [target.parent];
			// 	if (target.parent.userData.id && target.parent.userData.position) {
			// 		const position = target.parent.userData.position;
			// 		const id = target.parent.userData.id;
			// 		this.itemSelected(position.x, position.y, id);
			// 	}
			// } else {
			// 	this.selectOutlinePass.selectedObjects = [target];
			// }
		}
	}

	private createItem(x: number, y: number, rotation: 0 | 1 | 2 | 3, itemType: ItemType) {
		if (this.createItemCallback) this.createItemCallback(x, y, rotation, itemType);
	}

	private itemSelected(x: number, y: number, id: string) {
		if (this.itemSelectedCallback) this.itemSelectedCallback(x, y, id);
	}

	public onCreateItem(f: (x: number, y: number, rotation: 0 | 1 | 2 | 3, itemType: ItemType) => void) {
		this.createItemCallback = f;
	}

	public onItemClick(f: (x: number, y: number, id: string) => void) {
		this.itemSelectedCallback = f;
	}

	private setItemPositionOnMap(object: THREE.Object3D, x: number, z: number, rotation = 0, y: number = 0) {
		object.position.set(x + 0.5, y, z + 0.5);
		object.rotation.y = (Math.PI / 2) * rotation;
	}

	public setMode(newMode: OperationMode) {
		this.mode = newMode;
		const isMoveMode = newMode == OperationMode.MOVE;
		const isCreateMode = newMode == OperationMode.CREATE;
		const isSelectMode = newMode == OperationMode.SELECT;
		this.controls.enabled = isMoveMode;
		if (isCreateMode) {
			this.currentRotation = 0;
			this.previewBoxInCreate && (this.previewBoxInCreate.rotation.y = (Math.PI / 2) * this.currentRotation);
			if (this.currentItemType) {
				this.updatePreviewBox(this.currentItemType);
				if (this.previewBoxInCreate) this.scene.add(this.previewBoxInCreate);
			}
		} else {
			if (this.previewBoxInCreate) this.scene.remove(this.previewBoxInCreate);
		}
		if (isSelectMode) {
			this.scene.background = new THREE.Color(0x000000);
		} else {
			this.scene.background = this.background || new THREE.Color(0xffffff);
			this.previewOutlinePass.selectedObjects = [];
			this.selectOutlinePass.selectedObjects = [];
		}
	}

	public setCurrentItemType(itemType: ItemType | undefined) {
		this.currentItemType = itemType;
		this.updatePreviewBox(this.currentItemType);
	}

	public setBackground(imageUrl: string) {
		if (!imageUrl) return;
		const textureLoader = new THREE.TextureLoader();
		imageUrl = `${__PROTOCOL__}://${imageUrl}`;
		try {
			this.background = textureLoader.load(imageUrl);
			this.scene.background = this.background;
		} catch (e) {
			console.error(e);
		}
	}

	public setMapItemsList(newMapItemsList: MapItem[]) {
		const { extraItems, lackItems } = this.diff(newMapItemsList, Array.from(this.mapItems.values()), "id");
		extraItems.forEach((mapItem) => {
			this.mapItems.set(mapItem.id, mapItem);
			const newMapItemGroup = this.models.get(mapItem.type.model.id)?.clone() || undefined;
			if (newMapItemGroup) {
				newMapItemGroup.scale.set(0.5, 0.5, 0.5);
				newMapItemGroup.userData["position"] = { x: mapItem.x, y: mapItem.y };
				newMapItemGroup.userData["rotation"] = mapItem.rotation;
				newMapItemGroup.userData["id"] = mapItem.id;
				this.setItemPositionOnMap(newMapItemGroup, mapItem.x, mapItem.y, mapItem.rotation);
				this.mapItemsInScene.set(mapItem.id, newMapItemGroup);
				this.scene.add(newMapItemGroup);
			}
		});
		lackItems.forEach((mapItem) => {
			this.mapItems.delete(mapItem.id);
			const itemToDelete = this.mapItemsInScene.get(mapItem.id);
			if (itemToDelete) this.scene.remove(itemToDelete);
			this.mapItemsInScene.delete(mapItem.id);
		});
		this.updateLinkLines(newMapItemsList);
		this.updateArrivedEventIcon(newMapItemsList);
		this.update();
	}

	public async setItemTypesList(newItemTypesList: ItemType[]) {
		const newModelsList = await this.loadModels(newItemTypesList);
		newModelsList.forEach((item) => {
			this.models.set(item.id, item.glft.scene);
		});
		const { extraItems, lackItems } = this.diff(newItemTypesList, Array.from(this.itemTypes.values()), "id");
		extraItems.forEach((itemType) => {
			this.itemTypes.set(itemType.id, itemType);
		});
		lackItems.forEach((itemType) => {
			this.itemTypes.delete(itemType.id);
		});
	}

	private updatePreviewBox(itemType: ItemType | undefined) {
		if (this.previewBoxInCreate) this.scene.remove(this.previewBoxInCreate);
		if (itemType) {
			const newPreModel = this.models.get(itemType.model.id);
			if (newPreModel) {
				newPreModel.scale.set(0.5, 0.5, 0.5);
				applyOpacityToObject(newPreModel, 0.5);
				this.previewBoxInCreate = newPreModel;
				this.scene.add(this.previewBoxInCreate);
			}
		}
	}

	private updateLinkLines(mapItemsList: MapItem[]) {
		console.time("updateLinkLines");
		this.linkLinesContainer.clear();
		this.linkItemOutlinePass.selectedObjects = [];
		mapItemsList.forEach((mapItem) => {
			if (mapItem.linkto) {
				const target = mapItem.linkto;
				const mapItemObj = this.mapItemsInScene.get(mapItem.id);
				const targetItemObj = this.mapItemsInScene.get(target.id);
				if (mapItemObj && targetItemObj) {
					const lineStart = new THREE.Vector3();
					lineStart.copy(mapItemObj.position);
					lineStart.y = 0.2;
					const lineEnd = new THREE.Vector3();
					lineEnd.copy(targetItemObj.position);
					lineEnd.y = 0.2;
					// this.linesContainer.add(createLineWithArrow(lineStart, lineEnd, 0.5, 0.5, 0.5, new THREE.Color(0xff0000)));
					const geometry = new MeshLineGeometry();
					geometry.setPoints([lineStart, lineEnd]);
					const material = new MeshLineMaterial({
						color: new THREE.Color(0xff0000),
						lineWidth: 0.1,
						dashArray: 0.1,
						resolution: new THREE.Vector2(this.canvasEl.clientWidth, this.canvasEl.clientHeight),
					});
					const mesh = new THREE.Mesh(geometry, material);
					this.linkLinesContainer.add(mesh);
				}
			}
		});
		this.linkItemOutlinePass.selectedObjects = this.linkLinesContainer.children;
		console.timeEnd("updateLinkLines");
	}

	private updateArrivedEventIcon(mapItemsList: MapItem[]) {
		this.arrivedEventiconContainer.clear();
		const textureLoader = new THREE.TextureLoader();
		const _this = this;
		for (const mapItem of mapItemsList) {
			if (!mapItem.arrivedEvent) continue;
			const arrivedEvent = mapItem.arrivedEvent;
			textureLoader.load(`${__PROTOCOL__}://${arrivedEvent.iconUrl}`, (texture) => {
				// texture.matrixAutoUpdate = false
				const planeGeometry = new THREE.PlaneGeometry(1, 1);
				const planeMaterial = new THREE.MeshBasicMaterial({
					map: texture,
					side: THREE.DoubleSide,
					transparent: true,
				});
				const iconPlane = new THREE.Mesh(planeGeometry, planeMaterial);
				iconPlane.rotateX(-Math.PI / 2);
				// if (this.mapIndex.length > 0) {
				//     const mapItemsInMapIndex = mapItemsList.filter((i) =>
				//         this.mapIndex.includes(i.id)
				//     );
				//     //根据路径优化图标方向
				//     const currentIndex = this.mapIndex.findIndex((item) => item === mapItem.id);
				//     const preMapItem = mapItemsInMapIndex[(currentIndex - 1) < 0 ? (currentIndex - 1 + mapItemsInMapIndex.length) : (currentIndex - 1)];
				//     const nextMapItem = mapItemsInMapIndex[(currentIndex + 1) % mapItemsInMapIndex.length];
				//     const preMapItemModel = _this.mapItemsInScene.get(preMapItem.id);
				//     const nextMapItemModel = _this.mapItemsInScene.get(nextMapItem.id);
				//     if (preMapItemModel && nextMapItemModel) {
				//         // 计算两个点之间的向量
				//         const direction = new THREE.Vector3();
				//         const {x: px, z: pz} = preMapItemModel.position;
				//         const {x: nx, z: nz} = nextMapItemModel.position;
				//         direction.subVectors(new THREE.Vector3(px, 0, pz), new THREE.Vector3(nx, 0, nz)).normalize();
				//         console.log(direction)
				//         // 设定一个法向量，图片朝上，y=1
				//         const normal = new THREE.Vector3(0, 1, 0);
				//         // 计算旋转四元数，使得法向量旋转到direction
				//         const quaternion = new THREE.Quaternion();
				//         quaternion.setFromUnitVectors(normal, direction);
				//         //应用
				//         iconPlane.quaternion.copy(quaternion);
				//     }
				// }
				this.arrivedEventiconContainer.add(iconPlane);
				this.setItemPositionOnMap(iconPlane, mapItem.x, mapItem.y, 0, BLOCK_HEIGHT + 0.05);
			});
		}
	}

	public updateIndexPath(mapIndexs: string[]) {
		this.mapIndex = mapIndexs;
		this.pathLinesContainer.clear();
		const pathPoints: THREE.Vector3[] = [];
		let firstItemPosition = new THREE.Vector3();
		for (let index = 0; index < mapIndexs.length; index++) {
			const mapItemId = mapIndexs[index];
			const mapItem = this.mapItemsInScene.get(mapItemId);
			if (mapItem) {
				const p = new THREE.Vector3();
				p.copy(mapItem.position);
				p.y = 0.2;
				pathPoints.push(p);
				if (index === 0) {
					firstItemPosition = p;
				}
			} else {
				throw new Error("错误的路径");
			}
		}
		pathPoints.push(firstItemPosition);

		const geometry = new MeshLineGeometry();
		geometry.setPoints(pathPoints);
		const material = new MeshLineMaterial({
			color: new THREE.Color(0x00ff00),
			lineWidth: 0.1,
			dashArray: 0.1,
			resolution: new THREE.Vector2(this.canvasEl.clientWidth, this.canvasEl.clientHeight),
		});
		const mesh = new THREE.Mesh(geometry, material);
		this.pathLinesContainer.add(mesh);
	}

	private async loadModels(itemTypes: ItemType[]) {
		const modelsUrlSet = new Set<{ id: string; url: string }>();
		const modelKeys = Array.from(this.models.keys());
		const loadPromiseArr: Array<Promise<{ id: string; glft: GLTF }>> = [];
		itemTypes.forEach((itemType) => {
			if (!modelKeys.includes(itemType.model.id))
				modelsUrlSet.add({
					id: itemType.model.id,
					url: `${__PROTOCOL__}://${itemType.model.fileUrl}`,
				});
		});

		const modelsUrlList = Array.from(modelsUrlSet);
		const gltfLoader = new GLTFLoader();
		gltfLoader.setDRACOLoader(getDracoLoader());
		modelsUrlList.forEach((item) => {
			const promise = new Promise<{ id: string; glft: GLTF }>((resolve, reject) => {
				gltfLoader.load(
					item.url,
					(glft: GLTF) => {
						resolve({ id: item.id, glft: glft });
					},
					undefined,
					(error) => {
						reject(error);
					}
				);
			});
			loadPromiseArr.push(promise);
		});
		return await Promise.all(loadPromiseArr);
	}

	private update() {
		console.time("render");
		this.composer.render();
		console.timeEnd("render");
	}

	private diff<T extends Record<string, any>>(newArr: Array<T>, oldArr: Array<T>, key: string) {
		const extraItems = newArr.filter((item) => !oldArr.some((oItem) => oItem[key] === item[key]));
		const lackItems = oldArr.filter((item) => !newArr.some((nItem) => nItem[key] === item[key]));
		return { extraItems, lackItems };
	}

	public logData() {
		console.log({
			mapItems: this.mapItems,
			itemTypes: this.itemTypes,
			models: this.models,
		});
	}

	public destory() {
		this.canvasEl.removeEventListener("mousemove", this.handleMouseMove);
		this.canvasEl.removeEventListener("click", this.handleMouseClick);
		document.removeEventListener("keyup", this.handleKeyUp);
	}
}
