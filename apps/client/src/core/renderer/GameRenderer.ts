import * as THREE from "three";
import gsap from "gsap";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import {
	ChanceCardInfo,
	MapItemType,
	MapItem,
	PlayerInfo,
	PropertyInfo,
	GameMap,
	DiceResult,
} from "@mine-monopoly/types";
import { useDeviceStatus, useLoading, useSettig, useUserInfo, useUtil } from "@src/store";
import { Component, ComponentPublicInstance, createApp, toRaw, watch, WatchStopHandle } from "vue";
import { loadItemTypeModules } from "@src/utils/three/itemtype-loader";
import { useMonopolyClient } from "@src/core/monopoly-client/MonopolyClient";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer";
import PropertyInfoCard from "@src/views/game/utils/components/property-info-card.vue";
import MapEventCard from "@src/views/game/utils/components/map-event-card.vue";
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
import { PlayerModel } from "@mine-monopoly/utils";
import { DiceManager } from "./DiceManager";
import { loadModel } from "@src/utils/three/model-loader";
import { clone } from "lodash";
import { getDracoLoader } from "@src/utils/draco/draco";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

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
	private playerPendingWalks: Map<string, string> = new Map<string, string>(); // 防止同一玩家的走路动画并发执行
	private requestAnimationFrameId: number = -1;

	private playerWatchers: Map<
		string,
		{
			InfoWatcher: WatchStopHandle | undefined;
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
	private diceRollQueue: DiceResult[][] = []; // 骰子动画队列
	private isProcessingDiceRoll: boolean = false; // 是否正在处理骰子动画

	// FPS 计算相关
	private lastFrameTime: number = performance.now();
	private frameCount: number = 0;
	private fpsUpdateInterval: number = 1000; // 每1秒更新一次FPS
	private lastFpsUpdateTime: number = performance.now();

	constructor(canvas: HTMLCanvasElement, container: HTMLDivElement, mapData: GameMap) {
		this.mapData = mapData;
		this.container = container;
		this.canvas = canvas;
		this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.setClearAlpha(0);

		// 初始化画质设置
		const settingStore = useSettig();
		settingStore.initGraphicQuality();

		// 应用初始像素比
		const initialPixelRatio = settingStore.getPixelRatio();
		console.log("[画质设置] 初始化像素比:", initialPixelRatio);
		this.renderer.setPixelRatio(initialPixelRatio);

		// 初始化阴影设置
		console.log("[阴影设置] 初始化阴影设置:", settingStore.enableShadow ? "开启" : "关闭");
		this.renderer.toneMapping = THREE.LinearToneMapping;
		this.renderer.toneMappingExposure = 1.1;
		this.renderer.shadowMap.enabled = settingStore.enableShadow;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 1000);
		this.composer = new EffectComposer(this.renderer);
		this.renderPass = new RenderPass(this.scene, this.camera);
		this.chanceCardTargetOutlinePass = new OutlinePass(
			new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
			this.scene,
			this.camera,
		);
		this.playerInRoundOutlinePass = new OutlinePass(
			new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
			this.scene,
			this.camera,
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
			},
		);
		this.propertyInfoLabel = propertyCSS2DObject;
		this.propertyInfoLabelInstance = propertyInfoLabelInstance;

		const { css2DObject: arrivedEventCSS2DObject, appInstance: arrivedEventLabelInstance } = createCSS2DObjectFromVue(
			MapEventCard,
			{
				property: null,
			},
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

		const handleResize = () => {
			this.camera.aspect = container.clientWidth / container.clientHeight; //相机视角长宽比
			this.camera.updateProjectionMatrix();
			this.renderer.setSize(container.clientWidth, container.clientHeight);
			this.renderPass.setSize(container.clientWidth, container.clientHeight);
			this.composer.setSize(container.clientWidth, container.clientHeight);
			this.popElementRenderer.setSize(container.clientWidth, container.clientHeight);
			this.diceManager && this.diceManager.updateAspect(container.clientWidth / container.clientHeight);
		};

		window.addEventListener("resize", debounce(handleResize.bind(this), 500));

		handleResize();
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

		const updatePointer = (clientX: number, clientY: number) => {
			// 1. 获取 Canvas 在视口中的精确位置和尺寸
			const rect = this.canvas.getBoundingClientRect();

			// 2. 计算相对于 Canvas 左上角的坐标 (0,0 在 Canvas 左上角)
			const xInCanvas = clientX - rect.left;
			const yInCanvas = clientY - rect.top;

			// 3. 归一化为设备坐标 (NDC) -> x: [-1, 1], y: [1, -1]
			pointer.x = (xInCanvas / rect.width) * 2 - 1;
			pointer.y = -(yInCanvas / rect.height) * 2 + 1;
		};

		// 检查事件目标是否在 canvas 内（不在 UI 上）
		const isTargetOnCanvas = (target: EventTarget | null): boolean => {
			if (!target || !(target instanceof Element)) return false;
			// 检查是否是 canvas 本身或是 canvas 的子元素
			return target === this.canvas || this.canvas.contains(target);
		};

		if (isMobileDevice()) {
			const onPointerMove = (event: TouchEvent) => {
				// 阻止默认滚动行为（可选，视需求而定）
				// event.preventDefault();
				// 只有当触摸目标在 canvas 上时才更新指针
				if (!isTargetOnCanvas(event.target)) return;
				const touch = event.touches[0];
				updatePointer(touch.clientX, touch.clientY);
			};
			window.addEventListener("touchmove", onPointerMove, { passive: false });
		} else {
			const onPointerMove = (event: MouseEvent) => {
				// 只有当鼠标目标在 canvas 上时才更新指针
				if (!isTargetOnCanvas(event.target)) return;
				updatePointer(event.clientX, event.clientY);
			};
			window.addEventListener("pointermove", onPointerMove);
		}

		const loop = () => {
			this.requestAnimationFrameId = requestAnimationFrame(loop);
			this.handlePropertyRaycaster(propertyRaycaster, pointer);
			this.handleMapEventRaycaster(propertyRaycaster, pointer);

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

			// 计算 FPS
			this.updateFPS();
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
		const bgResource = useResourceStore().getRecourceById(this.mapData.info.backgroundImageId);
		if (!bgResource) return;

		const bgTexture = bgTextureLoader.load(bgResource.url);

		this.scene.background = bgTexture;
		this.scene.add(this.mapContainer);
	}

	private async initMap() {
		await this.initMapModels();
		await this.initMapItems();
		await this.initProperties();
	}

	private async initMapModels() {
		const modelResourcesList = Array.from(useResourceStore().recourceMap.values()).filter((r) => r.type === "model");
		const enableShadow = useSettig().enableShadow;
		for await (const modelResource of modelResourcesList) {
			const model = await getModelById(modelResource.id);
			enableShadows(model, enableShadow);
			this.mapModules.set(modelResource.id, model);
		}
	}

	private async initMapItems() {
		const textureLoader = new THREE.TextureLoader();

		const mapItems = this.mapData.mapItems;
		for (const mapItem of mapItems) {
			const model = this.mapModules.get(mapItem.type.modelId);
			if (!model) throw Error("加载MapItem时找不到模型");
			const mapItemModel = new THREE.Group().copy(model);
			// mapItemModel.scale.set(0.5, 0.5, 0.5);
			mapItemModel.userData["position"] = { x: mapItem.x, y: mapItem.y };
			mapItemModel.userData["rotation"] = mapItem.rotation;
			mapItemModel.userData["id"] = mapItem.id;
			mapItemModel.userData["isMapItem"] = true;
			if (mapItem.mapEventId) {
				const mapEvent = useMapData().getMapEventById(mapItem.mapEventId);
				if (mapEvent) mapItemModel.userData["mapEvent"] = clone(mapEvent);
			}

			this.setItemPositionOnMap(mapItemModel, mapItem.x, mapItem.y, mapItem.rotation);
			this.mapItemsInScene.set(mapItem.id, mapItemModel);
			this.mapContainer.add(mapItemModel);

			// [修改] 如果有事件图标，需要计算当前格子的表面高度来放置图标
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

				// 获取格子表面高度
				const surfaceY = this.getMapItemSurfaceHeight(mapItemModel);
				// 放在表面上方一点点，防止 Z-fighting
				this.setItemPositionOnMap(iconPlane, mapItem.x, mapItem.y, 0, surfaceY + 0.01);
			}
		}
	}

	private async initProperties() {
		//加载地皮
		const gameInfo = useGameData();
		gameInfo.properties.forEach((property) => {
			const textSprite = new TextSprite(
				`${property.name}\n可购买: ${Math.round(property.sellCost)}￥`,
				64,
				"#000000",
				10,
				82,
			);
			// textSprite.getSprite().scale.set(2.5, 2.5, 2.5);
			this.housesItems.set(property.id, {
				group: new THREE.Group(),
				textSprite: textSprite,
			});
			this.updateBuilding(property);
		});
	}

	private async initPlayer() {
		const playersList = useGameData().players;
		await this.loadPlayersModules(playersList);
		playersList.forEach((p) => {
			this.updatePlayerPosition(p);
		});
	}

	private initChanceCard() {}

	private initLight() {
		const centerPos = this.getGroupCenter(this.mapContainer);
		const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
		this.scene.add(ambientLight);
		const skyColor = 0xffffff;
		const groundColor = 0xeef1f5;
		const hemisphereLight = new THREE.HemisphereLight(skyColor, groundColor, 0.9);
		hemisphereLight.position.set(0, 50, 0);
		this.scene.add(hemisphereLight);

		const dirLight = new THREE.DirectionalLight(0xffffff, 2);
		dirLight.position.set(-40, 100, -40);
		dirLight.target.position.copy(centerPos);

		this.scene.add(dirLight);
		this.scene.add(dirLight.target);

		// 从设置中读取阴影开关
		const enableShadow = useSettig().enableShadow;
		dirLight.castShadow = enableShadow;

		if (enableShadow) {
			// 提高阴影贴图分辨率以获得更清晰的阴影
			dirLight.shadow.mapSize.width = 4096;
			dirLight.shadow.mapSize.height = 4096;

			// 调整阴影偏移以减少伪影
			dirLight.shadow.bias = -0.0005;
			dirLight.shadow.normalBias = 0.02;

			// 设置阴影半径以软化边缘（PCFSoftShadowMap）
			dirLight.shadow.radius = 2;

			// 调整阴影相机范围
			const d = 100;
			dirLight.shadow.camera.left = -d;
			dirLight.shadow.camera.right = d;
			dirLight.shadow.camera.top = d;
			dirLight.shadow.camera.bottom = -d;
			dirLight.shadow.camera.near = 0.1;
			dirLight.shadow.camera.far = 500;
		}
	}

	private initOutlinePass() {}

	private initEventListener() {
		// 监听当前回合玩家变化
		useEventBus().on("game-currentPlayerIdInRound", (newPlayerId: string, oldPlayerId: string) => {
			if (newPlayerId && newPlayerId !== oldPlayerId) {
				console.log("[相机] 回合切换:", oldPlayerId, "->", newPlayerId);
				this.focusPlayerById(newPlayerId);
			}
		});

		const mapDataStore = useMapData();

		// 监听画质变化事件
		useEventBus().on("graphics:quality:change", ({ quality }: { quality: "low" | "medium" | "high" }) => {
			console.log("[画质设置] 接收到画质变化事件:", quality);
			const ratioMap = { low: 0.85, medium: 1.0, high: 2.0 };
			const newPixelRatio = window.devicePixelRatio * ratioMap[quality];
			this.applyPixelRatio(newPixelRatio);
		});

		// 监听阴影变化事件
		useEventBus().on("graphics:shadow:change", ({ enable }: { enable: boolean }) => {
			console.log("[阴影设置] 接收到阴影变化事件:", enable);
			this.applyShadowSetting(enable);
		});

		// 监听视角锁定变化事件
		useEventBus().on("graphics:lockRole:change", ({ lockRole }: { lockRole: boolean }) => {
			console.log("[视角设置] 接收到视角锁定变化事件:", lockRole);
			this.isLockingRoleFromSetting = lockRole;
		});

		// 监听相机回归视角事件
		useEventBus().on("camera:focus:self", () => {
			this.focusOnSelf();
		});

		useEventBus().on(
			"player-walk",
			async (walkPlayerId: string, step: number, walkId: string, totalSteps?: number, startStep?: number) => {
				// 等待前一个动画完成，防止并发执行
				const pendingWalk = this.playerPendingWalks.get(walkPlayerId);
				if (pendingWalk) {
					// 等待前一个动画完成
					await new Promise<void>((resolve) => {
						const checkPending = () => {
							const currentPending = this.playerPendingWalks.get(walkPlayerId);
							if (!currentPending) {
								resolve();
							} else {
								// 继续等待，使用 setTimeout 避免阻塞
								setTimeout(checkPending, 50);
							}
						};
						checkPending();
					});
				}

				// 标记动画开始
				this.playerPendingWalks.set(walkPlayerId, walkId);

				const playerEntity = this.playerEntities.get(walkPlayerId);
				if (playerEntity) {
					const sourcePosition = toRaw(this.playerPosition.get(walkPlayerId)) as number;
					const mapIndexLength = toRaw(mapDataStore.mapIndex.length);
					const endIndex = (((sourcePosition + step) % mapIndexLength) + mapIndexLength) % mapIndexLength;

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

					try {
						await this.updatePlayerPositionByStep(
							walkPlayerId,
							sourcePosition,
							step,
							mapIndexLength,
							totalSteps ?? Math.abs(step), // 向后兼容：如果没有提供 totalSteps，使用当前步数
							startStep ?? 1, // 向后兼容：如果没有提供 startStep，从第1步开始
						);
					} finally {
						// 无论动画成功还是失败，都要清除标志
						this.playerPendingWalks.delete(walkPlayerId);
					}

					this.currentFocusModule = null;
					this.isLockingRole = false;

					// 更新 playerPosition Map，确保下一段走路从正确位置开始
					this.playerPosition.set(walkPlayerId, endIndex);

					// 拆散重叠的玩家模型
					this.breakUpPlayersInSameMapItem();
					useMonopolyClient().AnimationComplete(walkId);
				}
			},
		);
		useEventBus().on("player-tp", async (tpPlayerId: string, positionIndex: number, walkId: string) => {
			const playerEntity = this.getPlayerEntity(tpPlayerId);

			if (playerEntity) {
				const model = playerEntity.model;
				const body = playerEntity.bodyMesh; // 获取 bodyMesh

				this.currentFocusModule = model;
				this.isLockingRole = true;

				if (!body) return;
				// 1. 记录原始朝向
				const originalDir = Math.sign(body.scale.x) || 1;

				// 2. 消失动画
				await gsap.to(body.scale, {
					x: 0,
					duration: 0.5,
					ease: "back.in(1.7)",
				});

				// 3. 执行位移 (瞬间) - 修复高度问题
				const mapItem = this.getMapItem(positionIndex);
				if (mapItem) {
					const { x, z } = mapItem.position;
					const surfaceY = this.getMapItemSurfaceHeight(mapItem);
					model.position.set(x, surfaceY, z);
				}
				this.playerPosition.set(tpPlayerId, positionIndex);

				// 4. 出现动画
				await gsap.to(body.scale, {
					x: originalDir,
					duration: 0.5,
					delay: 0.1,
					ease: "back.out(1.7)",
				});

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

		useEventBus().on("dice-roll", async (diceRes: DiceResult[]) => {
			if (!this.diceManager) return;

			// 将请求加入队列
			this.diceRollQueue.push(diceRes);

			// 如果当前没有正在处理的动画，开始处理队列
			if (!this.isProcessingDiceRoll) {
				await this._processDiceRollQueue();
			}
		});
	}

	/**
	 * 处理骰子动画队列（确保动画按顺序执行，不会并发）
	 */
	private async _processDiceRollQueue(): Promise<void> {
		if (this.isProcessingDiceRoll || this.diceRollQueue.length === 0) {
			return;
		}

		this.isProcessingDiceRoll = true;

		while (this.diceRollQueue.length > 0) {
			const diceRes = this.diceRollQueue.shift();
			if (!diceRes) break;

			try {
				this.diceManager!.setDiceCount(diceRes.length);
				this.isRenderDice = true;
				await this.diceManager!.roll(diceRes);
				this.isRenderDice = false;
			} catch (error) {
				console.error("[骰子动画] 执行失败:", error);
			}
		}

		this.isProcessingDiceRoll = false;
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

	private handleMapEventRaycaster(raycaster: THREE.Raycaster, pointer: THREE.Vector2) {
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
			if (target && target.userData.mapEvent) {
				const mapEvent = target.userData.mapEvent;

				this.arrivedEventInfoLabel.position.copy(target.position);
				// this.arrivedEventInfoLabel.position.y += 2.2;
				//@ts-ignore
				this.arrivedEventInfoLabelInstance.updateArrivedEvent(mapEvent);
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

	/**
	 * 更新 FPS 计算
	 */
	private updateFPS() {
		const now = performance.now();
		this.frameCount++;

		// 每隔 fpsUpdateInterval 毫秒更新一次 FPS
		if (now - this.lastFpsUpdateTime >= this.fpsUpdateInterval) {
			const elapsed = now - this.lastFpsUpdateTime;
			const fps = Math.round((this.frameCount * 1000) / elapsed);

			// 更新 store 中的 FPS 值
			useUtil().fps = fps;

			// 重置计数器
			this.frameCount = 0;
			this.lastFpsUpdateTime = now;
		}
	}

	private async loadPlayersModules(playerList: Array<PlayerInfo>) {
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
					0,
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
		followAngleY: number,
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

		// [修改] 获取目标格子的表面高度
		const surfaceY = this.getMapItemSurfaceHeight(targetMapItemModel);

		const modelIdList = newProperty.buildingModelIdList ?? mapInfo.buildingModelIdList;
		if (!modelIdList || modelIdList.length === 0) return;
		const getModel = (index: number) => {
			const id = modelIdList[index];
			return id ? this.mapModules.get(id) : undefined;
		};
		const buildModel = getModel(newProperty.level) ?? getModel(modelIdList.length - 1);

		if (!buildModel) return;
		const propertyBuildModel = buildModel.clone();
		propertyBuildModel.position.copy(targetMapItemModel.position);
		// [修改] 设置为表面高度，替代 BLOCK_HEIGHT
		propertyBuildModel.position.y = surfaceY;
		propertyBuildModel.scale.copy(targetMapItemModel.scale);
		propertyBuildModel.userData = { ...newProperty, isProperty: true };
		propertyBuildModel.traverse((object) => {
			if (object.userData.name) {
				const meshName = object.userData.name as string;
				if (meshName.includes("color")) {
					object.traverse((o) => {
						//@ts-ignore
						if (o.isMesh) {
							const basicMaterial = new THREE.MeshStandardMaterial();
							if (newProperty.owner) {
								basicMaterial.color = new THREE.Color(Number(newProperty.owner.color.replace("#", "0x")));
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
			const linkItem = this.mapItemsInScene.get(linkMapItem.id)!;
			// [修改] LookAt 的高度也基于目标表面
			const linkSurfaceY = this.getMapItemSurfaceHeight(linkItem);

			const lookat = new THREE.Vector3();
			lookat.copy(linkItem.position);
			lookat.setY(linkSurfaceY);
			propertyBuildModel.lookAt(lookat);
			propertyBuildModel.rotateY(-Math.PI / 2);
		}
		propertyBuildModel.scale.set(0, 0, 0);
		this.mapContainer.add(propertyBuildModel);
		gsap.to(propertyBuildModel.scale, {
			x: 1,
			y: 1,
			z: 1,
			duration: 0.4,
			onComplete: () => {
				const houseItem = this.housesItems.get(newProperty.id);
				if (houseItem) {
					const costList = newProperty.costList;
					if (newProperty.owner) {
						houseItem.textSprite.updateText(
							`${newProperty.name}\n过路费: ${Math.round(
								costList[newProperty.level] * useGameData().currentMultiplier,
							)}￥`,
							newProperty.owner.color,
						);
					} else {
						houseItem.textSprite.updateText(
							`${newProperty.name}\n可购买: ${Math.round(newProperty.sellCost)}￥`,
							"#000000",
						);
					}
					const textSpriteModel = houseItem.textSprite.getSprite();
					const box = new THREE.Box3().setFromObject(propertyBuildModel);
					// 计算边界框的高度
					const size = box.getSize(new THREE.Vector3());
					textSpriteModel.position.y = 1;
					propertyBuildModel.add(textSpriteModel);
					houseItem.group = propertyBuildModel;
				}
			},
		});
	}

	private async updatePlayerPositionByStep(
		playerId: string,
		sourceIndex: number,
		stepNum: number,
		total: number,
		totalSteps?: number,
		startStep?: number,
	) {
		if (!this.playerEntities.has(playerId)) return;

		// 向后兼容：如果没有提供 totalSteps，使用当前步数
		const actualTotalSteps = totalSteps ?? Math.abs(stepNum);
		const actualStartStep = startStep ?? 1;

		// 动画执行次数基于这一段的步数，而不是总步数
		const animationSteps = Math.abs(stepNum);

		// 不提前设置 playerPosition，由服务器通过 GameData 统一控制
		const endIndex = (((sourceIndex + stepNum) % total) + total) % total;

		const playerEntity = this.playerEntities.get(playerId);

		if (playerEntity) {
			const playerModule = playerEntity.model;
			const playerBody = playerEntity.bodyMesh;

			// 初始显示剩余步数
			const initialRemaining = actualTotalSteps - actualStartStep + 1;
			const stepTextSprite = new TextSprite(initialRemaining.toString(), 64, "#ffb84d", 8, 0);
			const stepMesh = stepTextSprite.getSprite();
			stepMesh.position.set(0.5, PLAY_MODEL_SIZE - 0.3, 0);
			stepMesh.scale.set(3, 3, 3);
			stepMesh.renderOrder = 9999999;
			playerBody && playerBody.add(stepMesh);
			// ----------------------------

			let animationShouldStop = false;
			let currentAnimation: gsap.core.Timeline | null = null;
			const deviceStatusStore = useDeviceStatus();

			deviceStatusStore.$subscribe(
				(mutation, state) => {
					animationShouldStop = state.isFocus;
				},
				{ once: true },
			);

			try {
				for (let i = 1; i <= animationSteps; i++) {
					if (animationShouldStop) {
						currentAnimation && currentAnimation.kill();
						const endMapItem = this.getMapItem(endIndex);
						if (endMapItem) {
							const surfaceY = this.getMapItemSurfaceHeight(endMapItem);
							const { x, z } = endMapItem.position;

							playerModule.position.set(x, surfaceY, z);
							if (playerBody) {
								playerBody.scale.y = 1;
								playerBody.scale.x = Math.sign(playerBody.scale.x);
							}
						}
						break;
					}

					const nextMapItem = this.getMapItem((((sourceIndex + Math.sign(stepNum) * i) % total) + total) % total);

					if (nextMapItem) {
						const { x: nextMapItemScreenX } = getScreenPosition(nextMapItem, this.camera);
						const { x: playerScreenX } = getScreenPosition(playerModule, this.camera);

						currentAnimation = gsap.timeline();
						const duration = 0.35;

						const nextSurfaceY = this.getMapItemSurfaceHeight(nextMapItem);

						// --- 1. 方向翻转 ---
						if (playerBody) {
							let targetDir = Math.sign(playerBody.scale.x);
							if (nextMapItemScreenX > playerScreenX) targetDir = 1;
							else if (nextMapItemScreenX < playerScreenX) targetDir = -1;

							currentAnimation.to(playerBody.scale, { x: targetDir, duration: 0.1 }, 0);
						}

						// --- 2. 整体位移 ---
						const { x, z } = nextMapItem.position;
						currentAnimation.to(
							playerModule.position,
							{
								x,
								y: nextSurfaceY,
								z,
								duration: duration,
								ease: "power2.inOut",
							},
							0,
						);

						// --- 3. 动态形变 ---
						if (playerBody) {
							currentAnimation.to(
								playerBody.scale,
								{
									y: 0.98,
									duration: duration * 0.2,
									ease: "power2.in",
									onComplete: () => {
										// 计算剩余步数：总步数 - (起始步数 + 当前步索引 - 1)
										const remaining = actualTotalSteps - (actualStartStep + i - 1);
										if (remaining >= 0) {
											stepTextSprite.updateText(remaining.toString());
										}
									},
								},
								duration * 0.5,
							);

							currentAnimation.to(
								nextMapItem.scale,
								{
									x: 0.95,
									y: 0.95,
									z: 0.95,
									duration: duration * 0.2,
									ease: "power2.in",
								},
								duration * 0.5,
							);

							currentAnimation.to(
								playerBody.scale,
								{
									y: 1.02,
									duration: duration * 0.5,
									ease: "power2.out",
								},
								0,
							);

							currentAnimation.to(
								nextMapItem.scale,
								{
									x: 1.05,
									y: 1.05,
									z: 1.05,
									duration: duration * 0.5,
									ease: "power2.out",
								},
								duration * 0.5,
							);

							currentAnimation.to(
								playerBody.scale,
								{
									y: 1,
									duration: duration * 0.2,
									ease: "sine.out",
								},
								duration * 0.9,
							);

							currentAnimation.to(
								nextMapItem.scale,
								{
									x: 1,
									y: 1,
									z: 1,
									duration: duration * 0.2,
									ease: "sine.out",
								},
								duration * 0.9,
							);
						}

						await currentAnimation;
					} else {
						throw new Error("MapItem error");
					}
				}
			} finally {
				// --- [新增] 清理资源 ---
				// 动画结束或中断后，移除并销毁步数文字
				playerBody && playerBody.remove(stepMesh);
				stepMesh.geometry.dispose();
				if (Array.isArray(stepMesh.material)) {
					stepMesh.material.forEach((m) => m.dispose());
				} else {
					stepMesh.material.dispose();
				}
				// -------------------
			}
		}
	}

	private updatePlayerPosition(playerInfo: PlayerInfo) {
		const mapItem = this.getMapItem(playerInfo.positionIndex);
		if (!mapItem) return;

		const surfaceY = this.getMapItemSurfaceHeight(mapItem);
		const { x, z } = mapItem.position;

		const player = this.playerEntities.get(playerInfo.id);
		if (!player) return;
		// 使用动态高度
		player.model.position.set(x, surfaceY, z);
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

	/**
	 * 获取指定 MapItem 模型的表面高度 (世界坐标 Y)
	 * 优先查找名为 'Floor'/'Base'/'Ground' 的子Mesh作为地面基准
	 * @param mapItem 格子的 Group 对象
	 */
	private getMapItemSurfaceHeight(mapItem: THREE.Object3D): number {
		if (!mapItem) return 0;

		let target: THREE.Object3D | null = null;
		// 1. 尝试寻找明确标记为地面的子对象
		mapItem.traverse((child) => {
			const name = child.name.toLowerCase();
			if (name.includes("floor") || name.includes("base") || name.includes("ground")) {
				// 简单的启发式：通常地面是 Mesh
				//@ts-ignore
				if (child.isMesh) {
					target = child;
				}
			}
		});

		// 2. 如果没找到特定地面，就计算整体包围盒
		if (!target) target = mapItem;

		const box = new THREE.Box3().setFromObject(target);

		// 3. 安全检查：如果包围盒无效，回退到物体原点
		if (box.isEmpty()) return mapItem.position.y;

		return box.max.y;
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
		// 使用内部 playerPosition Map 而不是 GameData
		// 因为在走路动画完成后，GameData 还没有更新，会导致位置被重置为旧值
		const playersList = useGameData().players;

		// 使用 playerPosition Map 获取玩家实际位置
		const positionMap = new Map<string, number>();
		this.playerPosition.forEach((pos, playerId) => {
			positionMap.set(playerId, pos);
		});

		groupByPositionIndex(playersList, positionMap).forEach((a) => {
			const positionIndex = a[0].positionIndex;
			const mapItem = this.getMapItem(positionIndex);
			if (!mapItem) return;

			const { x, z } = mapItem.position;
			const surfaceY = this.getMapItemSurfaceHeight(mapItem);

			if (a.length > 1) {
				const offsetArr = generateCirclePointsOffset(x, z, 0.5, a.length);
				offsetArr.forEach((offset, index) => {
					const playerEntity = this.getPlayerEntity(a[index].id);
					if (playerEntity) {
						// 使用初始位置减去偏移量
						playerEntity.model.position.x = x + offset.offsetX;
						playerEntity.model.position.z = z + offset.offsetY;
						playerEntity.model.position.y = surfaceY;

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
					// 动画已经把模型移动到正确位置了，只需要调整朝向
					gsap.to(playerEntity.model.scale, {
						x: Math.sign(playerEntity.model.scale.x),
						y: Math.sign(playerEntity.model.scale.y),
						z: Math.sign(playerEntity.model.scale.z),
					});
				}
			}
		});

		function groupByPositionIndex(items: PlayerInfo[], positionMap: Map<string, number>): PlayerInfo[][] {
			const groups = new Map<number, PlayerInfo[]>();

			for (const item of items) {
				// 使用 positionMap 而不是 item.positionIndex
				const pos = positionMap.get(item.id) ?? item.positionIndex;
				if (!groups.has(pos)) {
					groups.set(pos, []);
				}
				groups.get(pos)!.push(item);
			}

			return Array.from(groups.values());
		}

		function generateCirclePointsOffset(
			x: number,
			y: number,
			r: number,
			n: number,
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

	/**
	 * 将相机回归到自己的视角
	 */
	public focusOnSelf() {
		const userId = useUserInfo().userId;
		const playerEntity = this.playerEntities.get(userId);
		if (!playerEntity) {
			console.warn("[相机] 未找到当前玩家模型");
			return;
		}

		this.currentFocusModule = playerEntity.model;
		this.updateCamera(this.controls, this.currentFocusModule, 8, 30);
		this.controls.update();

		console.log("[相机] 相机已回归到自己的视角");
	}

	private createPopoverOnPlayerTop(
		playerId: string,
		component: Component,
		props?: Record<string, any>,
		delay?: number,
	) {
		const playerEntity = this.playerEntities.get(playerId);
		if (!playerEntity) return;
		const position = new THREE.Vector3();
		position.copy(playerEntity.model.position);

		const { css2DObject, appInstance, unmount } = createCSS2DObjectFromVue(component, props);
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
		const playerEntity = this.playerEntities.get(id);
		if (!playerEntity) {
			console.warn(`[相机] 无法聚焦玩家: 找不到 ID 为 ${id} 的玩家实体`);
			return;
		}

		this.currentFocusModule = playerEntity.model;
		this.updateCamera(this.controls, this.currentFocusModule, 8, 30);
		this.controls.update();
	}

	/**
	 * 应用新的像素比
	 */
	private applyPixelRatio(newPixelRatio: number) {
		console.log("[画质设置] 应用像素比:", newPixelRatio);
		console.log("[画质设置] 设置前 Canvas:", this.canvas.width, "x", this.canvas.height);

		// 设置所有像素比
		this.renderer.setPixelRatio(newPixelRatio);
		this.composer.setPixelRatio(newPixelRatio);

		// 更新相机和尺寸
		this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
		this.renderPass.setSize(this.container.clientWidth, this.container.clientHeight);
		this.composer.setSize(this.container.clientWidth, this.container.clientHeight);
		this.popElementRenderer.setSize(this.container.clientWidth, this.container.clientHeight);
		this.diceManager && this.diceManager.updateAspect(this.container.clientWidth / this.container.clientHeight);

		console.log("[画质设置] 设置后 Canvas:", this.canvas.width, "x", this.canvas.height);
		console.log("[画质设置] 像素比生效:", this.renderer.getPixelRatio());
	}

	/**
	 * 应用阴影设置
	 */
	private applyShadowSetting(enable: boolean) {
		console.log("[阴影设置] 应用阴影设置:", enable);

		// 设置渲染器阴影开关
		this.renderer.shadowMap.enabled = enable;

		// 遍历场景中所有对象，更新阴影属性
		this.scene.traverse((object) => {
			if ((object as THREE.Mesh).isMesh) {
				(object as THREE.Mesh).castShadow = enable;
				(object as THREE.Mesh).receiveShadow = enable;
			}
		});

		// 更新灯光阴影
		this.scene.traverse((object) => {
			if ((object as THREE.DirectionalLight).isDirectionalLight) {
				const light = object as THREE.DirectionalLight;
				light.castShadow = enable;
			}
		});

		console.log("[阴影设置] 阴影设置已应用");
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

function enableShadows(object: THREE.Object3D, enable: boolean) {
	object.traverse((child) => {
		if ((child as THREE.Mesh).isMesh) {
			child.castShadow = enable;
			child.receiveShadow = enable;
		}
	});
}
