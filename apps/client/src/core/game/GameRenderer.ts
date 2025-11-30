import * as THREE from "three";

import gsap from "gsap";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ChanceCardInfo, MapItemType, MapItem, PlayerInfo, PropertyInfo, GameMap } from "@fatpaper-monopoly/types";
import { useDeviceStatus, useLoading, useSettig, useUserInfo } from "@src/store";
import { Component, ComponentPublicInstance, createApp, toRaw, watch, WatchStopHandle } from "vue";
import { loadItemTypeModules } from "@src/utils/three/itemtype-loader";
import { useMonopolyClient } from "@src/core/monopoly-client/MonopolyClient";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer";
import PropertyInfoCard from "@src/views/game/utils/components/property-info-card.vue";
import ArrivedEventCard from "@src/views/game/utils/components/arrived-event-card.vue";
import moneyPopTip from "@src/views/game/components/money-pop-tip.vue";
import { loadHouseModels } from "@src/views/game/utils/house-loader";
import { debounce, getScreenPosition, isMobileDevice, throttle } from "@src/utils";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";
import useEventBus from "@src/utils/event-bus";
import { GammaCorrectionShader } from "three/examples/jsm/shaders/GammaCorrectionShader";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { storeToRefs } from "pinia";
import { __PROTOCOL__ } from "@src/../global.config";
import { TextSprite } from "../three/TextSprite";
import { useGameData, useMapData, useResourceStore } from "@src/store/game";
import { getModelById } from "@src/utils/file/game-map";
import { PlayerModel } from "@fatpaper-monopoly/utils";
import { DiceManager } from "./DiceManager";
import { loadModel } from "@src/utils/three/model-loader";

const BLOCK_HEIGHT = 0.09;
const PLAY_MODEL_SIZE = 0.7;
const loadingMask = useLoading();

export class GameRenderer {
	private mapData: GameMap;
	private container: HTMLDivElement;
	private canvas: HTMLCanvasElement;
	private renderer: THREE.WebGLRenderer;
	private popElementRenderer: CSS2DRenderer;
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private composer: EffectComposer;
	private renderPass: RenderPass;
	private chanceCardTargetOutlinePass: OutlinePass;
	private playerInRoundOutlinePass: OutlinePass;
	private controls: OrbitControls;

	private mapContainer: THREE.Group = new THREE.Group();
	private mapModules: Map<string, THREE.Group> = new Map<string, THREE.Group>();
	private mapItemsInScene: Map<string, THREE.Group> = new Map<string, THREE.Group>();

	private playerEntities: Map<string, PlayerModel> = new Map<string, PlayerModel>();
	private housesModules: Map<string, THREE.Group> = new Map<string, THREE.Group>();
	private housesItems: Map<string, { group: THREE.Group; textSprite: TextSprite }> = new Map<
		string,
		{ group: THREE.Group; textSprite: TextSprite }
	>();
	private arrivedEventIcons: Map<string, THREE.Mesh> = new Map<string, THREE.Mesh>();
	private playerPosition: Map<string, number> = new Map<string, number>();
	private requestAnimationFrameId: number = -1;

	private playerWatchers: Map<
		string,
		{
			InfoWatcher: WatchStopHandle | undefined;
			// moneyWatcher: WatchStopHandle | undefined;
			bankruptWatcher: WatchStopHandle | undefined;
		}
	> = new Map();
	private commonWatchers: WatchStopHandle[] = [];

	private isLockingRole: boolean = false;
	private isLockingRoleFromSetting: boolean = useSettig().lockRole;

	private currentFocusModule: THREE.Object3D | null = null;

	private propertyInfoLabel: CSS2DObject;
	private propertyInfoLabelInstance: ComponentPublicInstance;

	private arrivedEventInfoLabel: CSS2DObject;
	private arrivedEventInfoLabelInstance: ComponentPublicInstance;

	private diceManager: DiceManager | null = null;
	private isRenderDice = false;

	constructor(canvas: HTMLCanvasElement, container: HTMLDivElement, mapData: GameMap) {
		this.mapData = mapData;
		this.container = container;
		this.canvas = canvas;
		this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.setClearAlpha(0);
		this.renderer.setPixelRatio(window.devicePixelRatio * 2);

		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 1000);
		this.composer = new EffectComposer(this.renderer);
		this.renderPass = new RenderPass(this.scene, this.camera);
		this.chanceCardTargetOutlinePass = new OutlinePass(
			new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
			this.scene,
			this.camera
		);
		this.playerInRoundOutlinePass = new OutlinePass(
			new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
			this.scene,
			this.camera
		);
		const pixelRatio = this.renderer.getPixelRatio();
		// width、height是canva画布的宽高度

		// const smaaPass = new SMAAPass(canvas.clientWidth * pixelRatio, canvas.clientHeight * pixelRatio);
		//
		// this.composer.addPass(smaaPass);
		this.composer.addPass(this.renderPass);
		this.composer.addPass(this.chanceCardTargetOutlinePass);
		this.composer.addPass(this.playerInRoundOutlinePass);
		const gammaPass = new ShaderPass(GammaCorrectionShader);
		this.composer.addPass(gammaPass);

		const { css2DObject: propertyCSS2DObject, appInstance: propertyInfoLabelInstance } = createCSS2DObjectFromVue(
			PropertyInfoCard,
			{
				property: null,
			}
		);
		this.propertyInfoLabel = propertyCSS2DObject;
		this.propertyInfoLabelInstance = propertyInfoLabelInstance;

		const { css2DObject: arrivedEventCSS2DObject, appInstance: arrivedEventLabelInstance } = createCSS2DObjectFromVue(
			ArrivedEventCard,
			{
				property: null,
			}
		);
		this.arrivedEventInfoLabel = arrivedEventCSS2DObject;
		this.arrivedEventInfoLabelInstance = arrivedEventLabelInstance;

		this.scene.add(this.propertyInfoLabel);
		this.scene.add(this.arrivedEventInfoLabel);

		this.popElementRenderer = new CSS2DRenderer();
		this.popElementRenderer.setSize(container.clientWidth, container.clientHeight);
		this.popElementRenderer.domElement.style.position = "absolute";
		this.popElementRenderer.domElement.style.top = "0px";
		this.popElementRenderer.domElement.style.pointerEvents = "none";
		this.popElementRenderer.domElement.style.zIndex = "var(--z-ui)";
		container.appendChild(this.popElementRenderer.domElement);

		const controls = new OrbitControls(this.camera, this.canvas);
		controls.enableDamping = true;
		controls.maxDistance = 30;
		controls.minDistance = 1;
		controls.maxPolarAngle = Math.PI / 2;
		controls.minPolarAngle = Math.PI / 3;
		controls.update();
		this.controls = controls;

		window.addEventListener(
			"resize",
			debounce(() => {
				this.camera.aspect = container.clientWidth / container.clientHeight; //相机视角长宽比
				this.camera.updateProjectionMatrix();
				this.renderer.setSize(container.clientWidth, container.clientHeight);
				this.renderPass.setSize(container.clientWidth, container.clientHeight);
				this.composer.setSize(container.clientWidth, container.clientHeight);
				this.popElementRenderer.setSize(container.clientWidth, container.clientHeight);
				this.diceManager && this.diceManager.updateAspect(container.clientWidth / container.clientHeight);
			}, 500)
		);
	}

	public async init() {
		await this.initDiceManager();

		loadingMask.loading = true;
		loadingMask.text = "正在进行初始化加载：地图数据";
		//加载地图
		await this.initMap();

		loadingMask.text = "正在进行初始化加载：背景";
		//加载背景
		this.initBackground();

		loadingMask.text = "正在进行初始化加载：玩家数据";
		//加载玩家模型
		await this.initPlayer();

		loadingMask.text = "正在进行初始化加载：机会卡";
		//加载机会卡
		this.initChanceCard();

		//初始化灯光
		this.initLight();

		//设置OutlinePass
		this.initOutlinePass();

		this.initEventListener();

		this.focusMe();

		const userInfoStore = useUserInfo();

		//添加光线投射用于选择对象
		const propertyRaycaster = new THREE.Raycaster();
		const arrivedEventRaycaster = new THREE.Raycaster();
		const pointer = new THREE.Vector2();

		// 创建轨道控制器

		if (isMobileDevice()) {
			const onPointerMove = (event: TouchEvent) => {
				const touch = event.touches[0];
				pointer.x = (touch.clientX / this.canvas.clientWidth) * 2 - 1;
				pointer.y = -(touch.clientY / this.canvas.clientHeight) * 2 + 1;
			};
			window.addEventListener("touchmove", onPointerMove);
		} else {
			const onPointerMove = (event: MouseEvent) => {
				// 将鼠标位置归一化为设备坐标。x 和 y 方向的取值范围是 (-1 to +1)
				pointer.x = (event.clientX / this.canvas.clientWidth) * 2 - 1;
				pointer.y = -(event.clientY / this.canvas.clientHeight) * 2 + 1;
			};
			window.addEventListener("pointermove", onPointerMove);
		}

		const loop = () => {
			this.requestAnimationFrameId = requestAnimationFrame(loop);
			this.handlePropertyRaycaster(propertyRaycaster, pointer);
			this.handleArrivedEventRaycaster(propertyRaycaster, pointer);

			if (this.isLockingRole && this.isLockingRoleFromSetting && this.currentFocusModule) {
				this.updateCamera(this.controls, this.currentFocusModule, 7, 30);
			}
			this.controls.update(100);

			Array.from(this.playerEntities.values()).forEach((player) => {
				player.update(this.camera);
			});

			// 1. 关闭自动清除，完全由我们接管
			this.renderer.autoClear = false;

			// 2. 每一帧开始时，手动清除颜色、深度、模板缓冲区
			this.renderer.clear();

			// 3. 渲染主场景 (通过 Composer)
			this.composer.render();

			this.popElementRenderer.render(this.scene, this.camera);

			if (this.isRenderDice && this.diceManager) {
				this.diceManager.update();
				this.renderer.clearDepth();
				this.renderer.render(this.diceManager.getScene(), this.diceManager.getCamera());
			}
		};

		loop();
	}

	private async initDiceManager() {
		const diceModel = (await loadModel("dice.glb")).scene;
		diceModel.scale.set(0.8, 0.8, 0.8);
		this.diceManager = new DiceManager(diceModel);
		this.diceManager.updateAspect(this.container.clientWidth / this.container.clientHeight);
	}

	private initBackground() {
		const bgTextureLoader = new THREE.TextureLoader();
		const bgResource = useResourceStore().getRecourceById(this.mapData.info.coverImageId);
		if (!bgResource) return;

		const bgTexture = bgTextureLoader.load(bgResource.url);

		this.scene.background = bgTexture;
		this.scene.add(this.mapContainer);
	}

	private async initMap() {
		await this.initMapItems();
		await this.initHouses();
		await this.initProperties();
	}

	private async initMapItems() {
		const textureLoader = new THREE.TextureLoader();

		const itemTypes = this.mapData.mapItemTypes;
		for (const itemType of itemTypes) {
			this.mapModules.set(itemType.id, await getModelById(itemType.modelId));
		}
		const mapItems = this.mapData.mapItems;
		for (const mapItem of mapItems) {
			const model = this.mapModules.get(mapItem.type.id);
			if (!model) throw Error("加载MapItem时找不到模型");
			const mapItemModel = new THREE.Group().copy(model);
			mapItemModel.scale.set(0.5, 0.5, 0.5);
			mapItemModel.userData["position"] = { x: mapItem.x, y: mapItem.y };
			mapItemModel.userData["rotation"] = mapItem.rotation;
			mapItemModel.userData["id"] = mapItem.id;
			this.setItemPositionOnMap(mapItemModel, mapItem.x, mapItem.y, mapItem.rotation);
			this.mapItemsInScene.set(mapItem.id, mapItemModel);
			this.mapContainer.add(mapItemModel);

			if (mapItem.mapEventId) {
				const arrivedEvent = useMapData().getMapEventById(mapItem.mapEventId);
				if (!arrivedEvent) return;
				const iconUrl = useResourceStore().getRecourceById(arrivedEvent.iconId)?.url;
				if (!iconUrl) return;
				const texture = await textureLoader.loadAsync(iconUrl);
				texture.colorSpace = THREE.SRGBColorSpace;
				const planeGeometry = new THREE.PlaneGeometry(1, 1);
				const planeMaterial = new THREE.MeshBasicMaterial({
					map: texture,
					side: THREE.DoubleSide,
					transparent: true,
					depthWrite: false,
				});
				const iconPlane = new THREE.Mesh(planeGeometry, planeMaterial);
				iconPlane.rotateX(-Math.PI / 2);
				this.arrivedEventIcons.set(arrivedEvent.id, iconPlane);
				this.mapContainer.add(iconPlane);
				this.setItemPositionOnMap(iconPlane, mapItem.x, mapItem.y, 0, BLOCK_HEIGHT + 0.01);
			}
		}
	}

	private async initHouses() {
		const buildingModelIdList = this.mapData.buildingModelIdList;
		for (const buildingModelId of buildingModelIdList) {
			this.mapModules.set(buildingModelId, await getModelById(buildingModelId));
		}
	}

	private async initProperties() {
		//加载地皮
		const gameInfo = useGameData();
		gameInfo.propertiesList.forEach((property) => {
			const textSprite = new TextSprite(
				`${property.name}\n可购买: ${Math.round(property.sellCost)}￥`,
				64,
				"#000000",
				10,
				82
			);
			textSprite.getSprite().scale.set(2.5, 2.5, 2.5);
			this.housesItems.set(property.id, {
				group: new THREE.Group(),
				textSprite: textSprite,
			});
			this.updateBuilding(property);
		});
	}

	private async initPlayer() {
		const playersList = useGameData().playersList;
		await this.loadPlayersModules(playersList);
		playersList.forEach((p) => {
			this.updatePlayerPosition(p);
		});
	}

	private initChanceCard() {}

	private initLight() {
		//创建灯光
		const ambientLight = new THREE.AmbientLight(0xffffff, 2); // soft white light
		this.scene.add(ambientLight);
		// const ambienLight2 = new THREE.AmbientLight(0xffffff, 0.7); // soft white light
		// this.scene.add(ambienLight2);

		const hemisphereLight = new THREE.HemisphereLight(0xf3f3f3, 0xfff1e2, 2);
		hemisphereLight.color.setHSL(0.6, 1, 0.6);
		hemisphereLight.groundColor.setHSL(0.095, 1, 0.75);
		hemisphereLight.position.copy(this.getGroupCenter(this.mapContainer));
		hemisphereLight.position.setY(20);
		this.scene.add(hemisphereLight);

		const dirLight = new THREE.DirectionalLight(0xffffff, 3);
		dirLight.color.setHSL(0.1, 1, 0.95);
		dirLight.position.set(-1, 20, -1);
		dirLight.position.multiplyScalar(30);
		dirLight.target.position.set(21, 0, 21);
		this.scene.add(dirLight);

		dirLight.castShadow = true;

		dirLight.shadow.mapSize.width = 2048;
		dirLight.shadow.mapSize.height = 2048;

		const d = 50;

		dirLight.shadow.camera.left = -d;
		dirLight.shadow.camera.right = d;
		dirLight.shadow.camera.top = d;
		dirLight.shadow.camera.bottom = -d;

		dirLight.shadow.camera.far = 3500;
		dirLight.shadow.bias = -0.0001;
	}

	private initOutlinePass() {}

	private initEventListener() {
		const mapDataStore = useMapData();
		useEventBus().on("round-trun", () => {
			this.focusMe();
		});
		useEventBus().on("player-walk", async (walkPlayerId: string, step: number, walkId: string) => {
			//拆散重叠的玩家模型;
			// this.breakUpPlayersInSameMapItem();

			const playerEntity = this.playerEntities.get(walkPlayerId);
			if (playerEntity) {
				const sourcePosition = toRaw(this.playerPosition.get(walkPlayerId)) as number;
				const mapIndexLength = toRaw(mapDataStore.mapIndex.length);
				const model = this.playerEntities.get(walkPlayerId)?.model;
				if (model) {
					this.currentFocusModule = model;
					// this.playerInRoundOutlinePass.selectedObjects = [model];
				}
				this.isLockingRole = true;
				gsap.to(playerEntity.model.scale, {
					x: Math.sign(playerEntity.model.scale.x),
					y: Math.sign(playerEntity.model.scale.y),
					z: Math.sign(playerEntity.model.scale.z),
				});
				await this.updatePlayerPositionByStep(walkPlayerId, sourcePosition, step, mapIndexLength);
				this.currentFocusModule = null;
				this.isLockingRole = false;

				//拆散重叠的玩家模型;
				this.breakUpPlayersInSameMapItem();
				useMonopolyClient().AnimationComplete(walkId);
			}
		});
		useEventBus().on("player-tp", async (walkPlayerId: string, positionIndex: number, walkId: string) => {
			const playerEntity = this.getPlayerEntity(walkPlayerId);
			if (playerEntity) {
				const model = this.playerEntities.get(walkPlayerId)?.model;
				if (model) {
					this.currentFocusModule = model;
					// this.playerInRoundOutlinePass.selectedObjects = [model];
				}
				this.isLockingRole = true;
				playerEntity.model.scale.set(
					Math.sign(playerEntity.model.scale.x),
					Math.sign(playerEntity.model.scale.y),
					Math.sign(playerEntity.model.scale.z)
				);
				await gsap.to(playerEntity.model.scale, {
					x: -playerEntity.model.scale.x,
					direction: 0.2,
					repeat: 1,
				});
				const { x, y, z } = this.getMapItemPosition(positionIndex);
				playerEntity.model.position.set(x, y + BLOCK_HEIGHT, z);
				await gsap.to(playerEntity.model.scale, {
					x: -playerEntity.model.scale.x,
					direction: 0.2,
					repeat: 1,
				});
				this.playerPosition.set(walkPlayerId, positionIndex);

				this.currentFocusModule = null;
				this.isLockingRole = false;
				this.breakUpPlayersInSameMapItem();
				useMonopolyClient().AnimationComplete(walkId);
			}
		});

		useEventBus().on("player-money", async (playerId: string, oldMoney: number, newMoney: number) => {
			this.createPopoverOnPlayerTop(playerId, moneyPopTip, { money: newMoney - oldMoney }, 2000);
		});
		useEventBus().on("property-level", async (propertyId: string) => {
			this.updateBuilding(useGameData().getPropertyById(propertyId)!);
		});
		useEventBus().on("property-owner", async (propertyId: string) => {
			this.updateBuilding(useGameData().getPropertyById(propertyId)!);
		});

		useEventBus().on("dice-roll", async (diceRes: number[]) => {
			if (!this.diceManager) return;
			this.diceManager.setDiceCount(diceRes.length);
			this.isRenderDice = true;
			await this.diceManager.roll(diceRes);
			this.isRenderDice = false;
		});
	}

	private handlePropertyRaycaster(raycaster: THREE.Raycaster, pointer: THREE.Vector2) {
		// 通过摄像机和鼠标位置更新射线
		raycaster.setFromCamera(pointer, this.camera);

		const intersects = raycaster.intersectObjects(Array.from(this.housesItems.values()).map((h) => h.group));
		if (intersects.length > 0) {
			const intersect = intersects[0];
			const target = intersect.object.parent as THREE.Group;
			const propertyInfo = target.userData as any;
			if (propertyInfo.isProperty) {
				this.propertyInfoLabel.position.copy(target.position);
				this.propertyInfoLabel.position.y += new THREE.Box3().setFromObject(target).max.y;
				//@ts-ignore
				this.propertyInfoLabelInstance.updateProperty(propertyInfo);
			}
		} else {
			//@ts-ignore
			this.propertyInfoLabelInstance.updateProperty(null);
		}
	}

	private handleArrivedEventRaycaster(raycaster: THREE.Raycaster, pointer: THREE.Vector2) {
		// 通过摄像机和鼠标位置更新射线
		raycaster.setFromCamera(pointer, this.camera);

		const intersects = raycaster.intersectObjects(Array.from(this.mapItemsInScene.values()));
		if (intersects.length > 0) {
			const firstInstance = intersects[0];
			let target: THREE.Object3D | null = firstInstance.object;
			while (target) {
				if (target.userData.isMapItem) {
					break;
				} else {
					target = target.parent;
				}
			}
			if (target && target.userData.arrivedEvent) {
				const arrivedEvent = target.userData.arrivedEvent;

				this.arrivedEventInfoLabel.position.copy(target.position);
				// this.arrivedEventInfoLabel.position.y += 2.2;
				//@ts-ignore
				this.arrivedEventInfoLabelInstance.updateArrivedEvent(arrivedEvent);
			} else {
				//@ts-ignore
				this.arrivedEventInfoLabelInstance.updateArrivedEvent(null);
			}
		} else {
			//@ts-ignore
			this.arrivedEventInfoLabelInstance.updateArrivedEvent(null);
		}
	}

	public destroy() {
		cancelAnimationFrame(this.requestAnimationFrameId);
		Array.from(this.playerWatchers.values()).forEach((watchers) => {
			watchers.InfoWatcher && watchers.InfoWatcher();
			// watchers.moneyWatcher && watchers.moneyWatcher();
			watchers.bankruptWatcher && watchers.bankruptWatcher();
		});
		useEventBus().removeAll();
		this.commonWatchers.forEach((f) => f());
		this.diceManager && this.diceManager.dispose();
	}

	private async loadPlayersModules(playerList: Array<PlayerInfo>) {
		console.log("🚀 ~ GameRenderer ~ loadPlayersModules ~ playerList:", playerList);
		for await (const playerInfo of playerList) {
			try {
				this.playerPosition.set(playerInfo.id, toRaw(playerInfo.positionIndex));
				const role = useMapData().getRoleById(playerInfo.user.roleId);
				if (!role) throw Error("初始化玩家模型时: 找不到角色信息");
				const modelResource = useResourceStore().getRecourceById(role.imageId);
				if (!modelResource) throw Error("初始化玩家模型时: 找不到模型文件");
				const playerEntity = new PlayerModel();
				await playerEntity.load(modelResource.url, modelResource.fileType);
				this.playerEntities.set(playerInfo.id, playerEntity);
				const textSprite = new TextSprite(
					`${playerInfo.user.username}${playerInfo.user.userId === useUserInfo().userId ? " (你)" : ""}`,
					32,
					playerInfo.user.color,
					5,
					0
				);
				const nameSprite = textSprite.getSprite();
				nameSprite.renderOrder = 999;
				nameSprite.position.set(0, PLAY_MODEL_SIZE * 1.5, 0);
				playerEntity.model.add(nameSprite);
				playerEntity.model.scale.set(PLAY_MODEL_SIZE, PLAY_MODEL_SIZE, PLAY_MODEL_SIZE);
				this.scene.add(playerEntity.model);
			} catch (e) {
				console.error("🚀 ~ GameRenderer ~ loadPlayersModules ~ e:", e);
			}
		}
	}

	private updateCamera(
		controls: OrbitControls,
		targetObject: THREE.Object3D,
		followDistance: number,
		followAngleY: number
	) {
		if (!targetObject) return;
		controls.enabled = false;
		const targetPos = targetObject.position;
		const followPos = new THREE.Vector3();
		const cameraFaceVector = controls.object.getWorldDirection(new THREE.Vector3());
		const coefficient = followDistance / cameraFaceVector.length();
		const v1 = new THREE.Vector2(targetPos.x, targetPos.z);
		const v2 = v1.add(new THREE.Vector2(cameraFaceVector.x, cameraFaceVector.z).multiplyScalar(coefficient).negate());

		followPos.x = v2.x;
		followPos.y = targetPos.y + followDistance * Math.tan(THREE.MathUtils.degToRad(followAngleY));
		followPos.z = v2.y;
		// controls.target.copy(targetPos);
		gsap.to(controls.target, {
			x: targetPos.x,
			y: targetPos.y,
			z: targetPos.z,
			duration: 0.5,
		});
		gsap.to(controls.object.position, {
			x: followPos.x,
			y: followPos.y,
			z: followPos.z,
			duration: 0.5,
			onComplete: () => {
				controls.enabled = true;
			},
		});
	}

	private outlineModels(models: THREE.Object3D[]) {
		this.chanceCardTargetOutlinePass.selectedObjects = models;
	}

	private async updateBuilding(newProperty: PropertyInfo) {
		const oldModel = this.housesItems.get(newProperty.id);
		if (oldModel) {
			await gsap.to(oldModel.group.scale, { x: 0, y: 0, z: 0, duration: 0.2 });
			this.mapContainer.remove(oldModel.group);
		}
		const mapInfo = useMapData();
		const targetMapItem = mapInfo.getMapItemByPropertyId(newProperty.id);
		if (!targetMapItem) return;
		const targetMapItemModel = this.mapItemsInScene.get(targetMapItem?.id);
		if (!targetMapItemModel) return;
		let buildModel = this.mapModules.get(mapInfo.buildingModelIdList[newProperty.level]);
		if (!buildModel) {
			buildModel = this.mapModules.get(mapInfo.buildingModelIdList[mapInfo.buildingModelIdList.length - 1]);
		}
		if (!buildModel) return;
		buildModel = buildModel.clone();
		buildModel.position.copy(targetMapItemModel.position);
		buildModel.position.y += BLOCK_HEIGHT;
		buildModel.scale.copy(targetMapItemModel.scale);
		buildModel.userData = { ...newProperty, isProperty: true };
		buildModel.traverse((object) => {
			if (object.userData.name) {
				const meshName = object.userData.name as string;
				if (meshName.includes("color-block")) {
					object.traverse((o) => {
						//@ts-ignore
						if (o.isMesh) {
							// const basicMaterial = (<Mesh>o).material as Material;
							const basicMaterial = new THREE.MeshStandardMaterial();
							if (newProperty.owner) {
								basicMaterial.color = new THREE.Color(Number(newProperty.owner.color.replace("#", "0x")));
								// const {r, g, b} = hexToRgbNormalized(newProperty.owner.color);
								// basicMaterial.onBeforeCompile = function (shader) {
								//     shader.fragmentShader = shader.fragmentShader.replace(
								//         '#include <dithering_fragment>',
								//         `
								//         #include <dithering_fragment>
								//         gl_FragColor = vec4(${r} * gl_FragColor.r, ${g} * gl_FragColor.g, ${b} * gl_FragColor.b, gl_FragColor.a);
								//         `
								//     )
								// }
							} else {
								basicMaterial.color.set("#cccccc");
							}
							(<THREE.Mesh>o).material = basicMaterial;
						}
					});
				}
			}
		});
		const linkMapItem = mapInfo.mapItems.find((item) => {
			if (!item.linkto) return false;
			if (item.linkto === targetMapItem.id) return true;
		});
		if (linkMapItem && this.mapItemsInScene.has(linkMapItem.id)) {
			const lookat = new THREE.Vector3();
			lookat.copy(this.mapItemsInScene.get(linkMapItem.id)!.position);
			lookat.setY(BLOCK_HEIGHT);
			buildModel.lookAt(lookat);
			buildModel.rotateY(-Math.PI / 2);
		}
		buildModel.scale.set(0, 0, 0);
		this.mapContainer.add(buildModel);
		gsap.to(buildModel.scale, {
			x: 0.45,
			y: 0.45,
			z: 0.45,
			duration: 0.4,
			onComplete: () => {
				const houseItem = this.housesItems.get(newProperty.id);
				if (houseItem) {
					const costList = newProperty.costList;
					if (newProperty.owner) {
						houseItem.textSprite.updateText(
							`${newProperty.name}\n过路费: ${Math.round(
								costList[newProperty.level] * useGameData().currentMultiplier
							)}￥`,
							newProperty.owner.color
						);
					} else {
						houseItem.textSprite.updateText(
							`${newProperty.name}\n可购买: ${Math.round(newProperty.sellCost)}￥`,
							"#000000"
						);
					}
					const textSpriteModel = houseItem.textSprite.getSprite();
					const box = new THREE.Box3().setFromObject(buildModel);
					// 计算边界框的高度
					const size = box.getSize(new THREE.Vector3());
					textSpriteModel.position.y = Math.max(size.y * 2 + 0.5, 1.5);
					buildModel.add(textSpriteModel);
					houseItem.group = buildModel;
				}
			},
		});
	}

	private async updatePlayerPositionByStep(playerId: string, sourceIndex: number, stepNum: number, total: number) {
		if (!this.playerEntities.has(playerId)) return;
		const endIndex = (((sourceIndex + stepNum) % total) + total) % total;
		this.playerPosition.set(playerId, endIndex);
		const playerEntity = this.playerEntities.get(playerId);
		if (playerEntity) {
			// playerEntity.doAnimation(RoleAnimations.Idle, true);
			const playerModule = playerEntity.model;

			//页面进入后台后取消动画
			let animationShouldStop = false;
			let currentAnimation: gsap.core.Tween | null = null;
			const deviceStatusStore = useDeviceStatus();
			deviceStatusStore.$subscribe((mutation, state) => {
				animationShouldStop = state.isFocus;
			});
			for (let i = 1; i <= Math.abs(stepNum); i++) {
				//页面进入后台后取消动画
				if (animationShouldStop) {
					currentAnimation && currentAnimation.kill();
					const endMapItem = this.getMapItem(endIndex);
					if (endMapItem) {
						const { x, y, z } = endMapItem.position;
						playerModule.position.set(x, y + BLOCK_HEIGHT, z);
					} else {
						throw new Error("在读取EndMapItem错误");
					}
					break;
				}
				const nextMapItem = this.getMapItem((((sourceIndex + Math.sign(stepNum) * i) % total) + total) % total); //下一步
				if (nextMapItem) {
					const { x: nextMapItemScreenX, y: nextMapItemScreenY } = getScreenPosition(nextMapItem, this.camera);
					const { x: playerScreenX, y: playerScreenY } = getScreenPosition(playerEntity.model, this.camera);
					if (nextMapItemScreenX > playerScreenX) {
						currentAnimation = gsap.to(playerEntity.model.scale, { x: 1, duration: 0.3 });
					} else if (nextMapItemScreenX < playerScreenX) {
						currentAnimation = gsap.to(playerEntity.model.scale, { x: -1, duration: 0.3 });
					}
					const { x, y, z } = nextMapItem.position;
					currentAnimation = gsap.to(playerModule.position, { x, y: y + BLOCK_HEIGHT, z, duration: 0.6 });
					await currentAnimation.play();
					// await gsap.to(playerModule.position, {x, y, z, duration: 0.6});
				} else {
					throw new Error("在设置角色运动朝向时读取MapItem错误");
				}
			}
		}
		// useMonopolyClient().AnimationComplete();
	}

	private updatePlayerPosition(playerInfo: PlayerInfo) {
		const { x, y, z } = this.getMapItemPosition(playerInfo.positionIndex);
		const player = this.playerEntities.get(playerInfo.id);
		if (!player) return;
		player.model.position.set(x, y + BLOCK_HEIGHT, z);
	}

	private getMapItemPosition(index: number) {
		const mapIndex = useMapData().mapIndex;
		const id = mapIndex[index];
		if (!this.mapItemsInScene.has(id)) return new THREE.Vector3(0, 0, 0);
		return this.mapItemsInScene.get(id)!.position;
	}

	private getPlayerEntity(id: string) {
		return this.playerEntities.get(id);
	}

	private getMapItem(index: number) {
		const mapIndex = useMapData().mapIndex;
		const id = mapIndex[index];
		return this.mapItemsInScene.get(id);
	}

	private getGroupCenter(group: THREE.Group) {
		if (group.children.length === 0) return new THREE.Vector3(0, 0, 0);
		const centerPoint = new THREE.Vector3();
		group.children.forEach(function (child) {
			centerPoint.add(child.position);
		});
		const numChildren = group.children.length;
		centerPoint.divideScalar(numChildren);
		return centerPoint;
	}

	private setItemPositionOnMap(object: THREE.Object3D, x: number, z: number, rotation = 0, y: number = 0) {
		object.position.set(x + 0.5, y, z + 0.5);
		object.rotation.y = (Math.PI / 2) * rotation;
	}

	private breakUpPlayersInSameMapItem() {
		const playersList = useGameData().playersList;
		groupByPositionIndex(playersList).forEach((a) => {
			if (a.length > 1) {
				const positionIndex = a[0].positionIndex;
				const { x, y, z } = this.getMapItemPosition(positionIndex);
				const offsetArr = generateCirclePointsOffset(x, z, 0.5, a.length);
				offsetArr.forEach((offset, index) => {
					const playerEntity = this.getPlayerEntity(a[index].id);
					if (playerEntity) {
						// 使用初始位置减去偏移量
						playerEntity.model.position.x = x + offset.offsetX;
						playerEntity.model.position.z = z + offset.offsetY;
						const scale = 1 - 1 / a.length;

						gsap.to(playerEntity.model.scale, {
							x: Math.sign(playerEntity.model.scale.x) * scale,
							y: Math.sign(playerEntity.model.scale.y) * scale,
							z: Math.sign(playerEntity.model.scale.z) * scale,
						});
					}
				});
			} else {
				const playerEntity = this.getPlayerEntity(a[0].id);
				if (playerEntity) {
					const positionIndex = a[0].positionIndex;
					const { x, y, z } = this.getMapItemPosition(positionIndex);
					playerEntity.model.position.setX(x);
					playerEntity.model.position.setY(y + BLOCK_HEIGHT);
					playerEntity.model.position.setZ(z);
					gsap.to(playerEntity.model.scale, {
						x: Math.sign(playerEntity.model.scale.x),
						y: Math.sign(playerEntity.model.scale.y),
						z: Math.sign(playerEntity.model.scale.z),
					});
				}
			}
		});

		function groupByPositionIndex(items: PlayerInfo[]): PlayerInfo[][] {
			const groups = new Map<number, PlayerInfo[]>();

			for (const item of items) {
				if (!groups.has(item.positionIndex)) {
					groups.set(item.positionIndex, []);
				}
				groups.get(item.positionIndex)!.push(item);
			}

			return Array.from(groups.values());
		}

		function generateCirclePointsOffset(
			x: number,
			y: number,
			r: number,
			n: number
		): {
			offsetX: number;
			offsetY: number;
		}[] {
			const points = [];
			r = r - PLAY_MODEL_SIZE / 2;
			const angleStep = (2 * Math.PI) / n;
			for (let i = 0; i < n; i++) {
				const angle = i * angleStep;
				const pointX = r * Math.cos(angle);
				const pointY = r * Math.sin(angle);
				points.push({ offsetX: pointX, offsetY: pointY });
			}
			return points;
		}
	}

	public toggleLockCamera() {
		this.isLockingRole = !this.isLockingRole;
		return this.isLockingRole;
	}

	private createPopoverOnPlayerTop(
		playerId: string,
		component: Component,
		props?: Record<string, any>,
		delay?: number
	) {
		const playerEntity = this.playerEntities.get(playerId);
		if (!playerEntity) return;
		const position = new THREE.Vector3();
		position.copy(playerEntity.model.position);

		const { css2DObject, appInstance, unmount } = createCSS2DObjectFromVue(component, props);

		// position.x += playerEntity.size * (Math.random() - 0.5) * 0.1;
		// position.y += playerEntity.size / 2;
		// position.z += playerEntity.size * (Math.random() - 0.5) * 0.1;
		css2DObject.position.copy(position);
		this.scene.add(css2DObject);
		if (delay)
			gsap.to(css2DObject.position, {
				x: position.x + (Math.random() - 0.5),
				y: position.y + (Math.random() - 0.5),
				z: position.z + (Math.random() - 0.5),
				duration: delay / 1000,
			});
		delay && setTimeout(unmount, delay);
	}

	//让摄像机看自己
	private focusMe() {
		this.focusPlayerById(useUserInfo().userId);
	}

	private focusPlayerById(id: string) {
		this.currentFocusModule = this.playerEntities.get(id)?.model || null;
		if (this.currentFocusModule) {
			this.updateCamera(this.controls, this.currentFocusModule, 8, 30);
			this.controls.update();
		}
	}
}

function createCSS2DObjectFromVue(rootComponent: Component, rootProps?: Record<string, any>) {
	// 创建Vue应用程序实例
	const app = createApp(rootComponent, rootProps);

	// 创建一个div元素，并将应用程序实例挂载到该元素上
	const containerEl = document.createElement("div");
	const appInstance = app.mount(containerEl);

	// 创建CSS2DObject，并将包含组件DOM的div元素作为参数传递
	const css2DObject = new CSS2DObject(containerEl);

	function unmount() {
		app.unmount();
	}

	// 返回CSS2DObject
	return { css2DObject, appInstance, containerEl, unmount };
}

// function createTextSprite(text: string, fontSize: number, color: string, strokeWidth: number) {
// 	const canvas = document.createElement("canvas");
// 	const resolution = 10;
// 	const h = fontSize * resolution;
// 	const w = fontSize * resolution;
// 	canvas.width = w;
// 	canvas.height = h;
// 	const c = canvas.getContext("2d") as CanvasRenderingContext2D;
// 	// 文字
// 	c.beginPath();
// 	c.translate(w / 2, h / 2);
// 	c.fillStyle = color;
// 	c.font = `bold ${fontSize}px ContentFont`;
// 	c.textBaseline = "middle";
// 	c.textAlign = "center";
// 	c.lineWidth = strokeWidth;
// 	c.strokeStyle = "#fff";
// 	c.strokeText(text, 0, 0);
// 	c.fillText(text, 0, 0);
// 	const texture = new Texture(canvas);
// 	texture.needsUpdate = true;
// 	texture.colorSpace = THREE.SRGBColorSpace;
// 	const material = new SpriteMaterial({
// 		map: texture,
// 		depthWrite: false,
// 		transparent: true,
// 		side: DoubleSide,
// 	});
// 	return new Sprite(material);
// }
