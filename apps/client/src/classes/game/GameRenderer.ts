import {
	AmbientLight,
	Box3,
	BoxHelper,
	Color,
	DirectionalLight,
	DoubleSide,
	Group,
	HemisphereLight,
	MathUtils,
	Mesh,
	MeshBasicMaterial,
	MeshStandardMaterial,
	Object3D,
	PerspectiveCamera,
	PlaneGeometry,
	Quaternion,
	Raycaster,
	Scene,
	Sprite,
	SpriteMaterial,
	SRGBColorSpace,
	Texture,
	TextureLoader,
	Vector2,
	Vector3,
	WebGLRenderer,
} from "three";

import gsap from "gsap";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ChanceCardInfo, ItemType, MapItem, Model, PlayerInfo, PropertyInfo } from "@src/interfaces/game";
import { useDeviceStatus, useGameInfo, useLoading, useMapData, useSettig, useUserInfo } from "@src/store";
import { Component, ComponentPublicInstance, createApp, toRaw, watch, WatchStopHandle } from "vue";
import { loadItemTypeModules } from "@src/utils/three/itemtype-loader";
import { useMonopolyClient } from "@src/classes/monopoly-client/MonopolyClient";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer";
import PropertyInfoCard from "@src/views/game/utils/components/property-info-card.vue";
import ArrivedEventCard from "@src/views/game/utils/components/arrived-event-card.vue";
import moneyPopTip from "@src/views/game/components/money-pop-tip.vue";
import { loadHouseModels } from "@src/views/game/utils/house-loader";
import { debounce, getScreenPosition, isMobileDevice, throttle } from "@src/utils";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";
import { ChanceCardOperateType, ChanceCardType, GameEvents, RoleAnimations } from "@src/enums/game";
import { PlayerEntity } from "@src/classes/game/PlayerEntity";
import useEventBus from "@src/utils/event-bus";
import { GammaCorrectionShader } from "three/examples/jsm/shaders/GammaCorrectionShader";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { storeToRefs } from "pinia";
import { __PROTOCOL__ } from "@src/../global.config";
import { TextSprite } from "../three/TextSprite";

const BLOCK_HEIGHT = 0.09;
const PLAY_MODEL_SIZE = 0.7;
const loadingMask = useLoading();

export class GameRenderer {
	private canvas: HTMLCanvasElement;
	private renderer: WebGLRenderer;
	private popElementRenderer: CSS2DRenderer;
	private scene: Scene;
	private camera: PerspectiveCamera;
	private composer: EffectComposer;
	private renderPass: RenderPass;
	private chanceCardTargetOutlinePass: OutlinePass;
	private playerInRoundOutlinePass: OutlinePass;
	private controls: OrbitControls;

	private mapContainer: Group = new Group();
	private mapModules: Map<string, Group> = new Map<string, Group>();
	private mapItems: Map<string, Group> = new Map<string, Group>();
	private playerEntities: Map<string, PlayerEntity> = new Map<string, PlayerEntity>();
	private housesModules: Map<string, Group> = new Map<string, Group>();
	private housesItems: Map<string, { group: Group; textSprite: TextSprite }> = new Map<
		string,
		{ group: Group; textSprite: TextSprite }
	>();
	private arrivedEventIcons: Map<string, Mesh> = new Map<string, Mesh>();
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

	private currentFocusModule: Object3D | null = null;

	private propertyInfoLabel: CSS2DObject;
	private propertyInfoLabelInstance: ComponentPublicInstance;

	private arrivedEventInfoLabel: CSS2DObject;
	private arrivedEventInfoLabelInstance: ComponentPublicInstance;

	constructor(canvas: HTMLCanvasElement, container: HTMLDivElement) {
		this.canvas = canvas;
		this.renderer = new WebGLRenderer({ canvas, antialias: true });
		this.renderer.outputColorSpace = SRGBColorSpace;
		this.renderer.setPixelRatio(window.devicePixelRatio);

		this.scene = new Scene();
		this.camera = new PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 1000);
		this.composer = new EffectComposer(this.renderer);
		this.renderPass = new RenderPass(this.scene, this.camera);
		this.chanceCardTargetOutlinePass = new OutlinePass(
			new Vector2(canvas.clientWidth, canvas.clientHeight),
			this.scene,
			this.camera
		);
		this.playerInRoundOutlinePass = new OutlinePass(
			new Vector2(canvas.clientWidth, canvas.clientHeight),
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
		this.popElementRenderer.setSize(window.innerWidth, window.innerHeight);
		this.popElementRenderer.domElement.style.position = "absolute";
		this.popElementRenderer.domElement.style.top = "0px";
		this.popElementRenderer.domElement.style.pointerEvents = "none";
		this.popElementRenderer.domElement.style.zIndex = "500";
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
				this.camera.aspect = window.innerWidth / window.innerHeight; //相机视角长宽比
				this.camera.updateProjectionMatrix();
				this.renderer.setSize(window.innerWidth, window.innerHeight);
				this.renderPass.setSize(window.innerWidth, window.innerHeight);
				this.composer.setSize(window.innerWidth, window.innerHeight);
				this.popElementRenderer.setSize(window.innerWidth, window.innerHeight);
			}, 500)
		);
	}

	public async init() {
		loadingMask.loading = true;
		loadingMask.text = "正在进行初始化加载：背景";
		//加载背景
		this.initBackground();

		loadingMask.text = "正在进行初始化加载：地图数据";
		//加载地图
		await this.initMap();

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

		const userInfoStore = useUserInfo();

		//添加光线投射用于选择对象
		const propertyRaycaster = new Raycaster();
		const arrivedEventRaycaster = new Raycaster();
		const pointer = new Vector2();

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
				player.model.lookAt(this.camera.position);
				player.update();
			});

			// this.renderer.render(this.scene, this.camera);
			this.composer.render();
			this.popElementRenderer.render(this.scene, this.camera);
		};

		loop();
	}

	private initBackground() {
		const bgTextureLoader = new TextureLoader();
		const mapData = useMapData();
		const bgTexture = bgTextureLoader.load(`${__PROTOCOL__}://${mapData.mapBackground}`);

		this.scene.background = bgTexture;
		this.scene.add(this.mapContainer);
	}

	private async initMap() {
		//加载地图和模型
		const mapDataStore = useMapData();

		//加载模型
		const mapItemTypeList = mapDataStore.itemTypesList;
		await this.loadMapModels(mapItemTypeList);

		//加载屋子的模型
		const { lv0, lv1, lv2 } = mapDataStore.houseModels;
		if (lv0 && lv1 && lv2) await this.loadHousesModels({ lv0, lv1, lv2 });

		//加载地图
		const mapItemsList = mapDataStore.mapItemsList;
		await this.loadMap(mapItemsList);

		//加载地皮
		const gameInfo = useGameInfo();
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
				group: new Group(),
				textSprite: textSprite,
			});
			this.updateBuilding(property);
		});

		//监听地皮等级，进行升级的时候改变模型
		this.addPropertyLevelWatcher();

		//监听倍数变化，实时更新房屋的显示
		this.addMultiplierWatcher();

		//监听设置的变化
		this.addSettingWatcher();
	}

	private async initPlayer() {
		const mapDataStore = useMapData();
		const playersList = mapDataStore.playerList;
		await this.loadPlayersModules(playersList);
		this.breakUpPlayersInSameMapItem();

		const gameInfoStore = useGameInfo();
		gameInfoStore.playersList = playersList;
		playersList.forEach((player) => {
			this.updatePlayerPosition(player);
		});

		//玩家数据监听
		this.addPlayerStateWatcher();

		//玩家模型移动动画监听
		this.addPlayerMoveWatcher();

		//回合到切换到自己的视角
		useEventBus().on("RoundTurn", () => {
			if (this.isLockingRoleFromSetting) {
				this.focusMe.bind(this);
			}
		});

		this.focusMe();
	}

	private initChanceCard() {
		this.addChanceCardUseWatcher();
	}

	private initLight() {
		//创建灯光
		const ambientLight = new AmbientLight(0xffffff, 2); // soft white light
		this.scene.add(ambientLight);
		// const ambienLight2 = new AmbientLight(0xffffff, 0.7); // soft white light
		// this.scene.add(ambienLight2);

		const hemisphereLight = new HemisphereLight(0xf3f3f3, 0xfff1e2, 2);
		hemisphereLight.color.setHSL(0.6, 1, 0.6);
		hemisphereLight.groundColor.setHSL(0.095, 1, 0.75);
		hemisphereLight.position.copy(this.getGroupCenter(this.mapContainer));
		hemisphereLight.position.setY(20);
		this.scene.add(hemisphereLight);

		const dirLight = new DirectionalLight(0xffffff, 3);
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

	private initOutlinePass() {
		//模型描边颜色，默认白色
		this.chanceCardTargetOutlinePass.visibleEdgeColor.set(0x00ff00);
		//高亮发光描边厚度
		this.chanceCardTargetOutlinePass.edgeThickness = 1;
		//高亮描边发光强度
		this.chanceCardTargetOutlinePass.edgeStrength = 5;
		//模型闪烁频率控制，默认0不闪烁
		this.chanceCardTargetOutlinePass.pulsePeriod = 2;

		//模型描边颜色，默认白色
		this.playerInRoundOutlinePass.visibleEdgeColor.set(0x00ff00);
		//高亮发光描边厚度
		this.playerInRoundOutlinePass.edgeThickness = 1;
		//高亮描边发光强度
		this.playerInRoundOutlinePass.edgeStrength = 5;
		//模型闪烁频率控制，默认0不闪烁
		this.playerInRoundOutlinePass.pulsePeriod = 0;
	}

	private handlePropertyRaycaster(raycaster: Raycaster, pointer: Vector2) {
		// 通过摄像机和鼠标位置更新射线
		raycaster.setFromCamera(pointer, this.camera);

		const intersects = raycaster.intersectObjects(Array.from(this.housesItems.values()).map((h) => h.group));
		if (intersects.length > 0) {
			const intersect = intersects[0];
			const target = intersect.object.parent as Group;
			const propertyInfo = target.userData as any;
			if (propertyInfo.isProperty) {
				this.propertyInfoLabel.position.copy(target.position);
				this.propertyInfoLabel.position.y += new Box3().setFromObject(target).max.y;
				//@ts-ignore
				this.propertyInfoLabelInstance.updateProperty(propertyInfo);
			}
		} else {
			//@ts-ignore
			this.propertyInfoLabelInstance.updateProperty(null);
		}
	}

	private handleArrivedEventRaycaster(raycaster: Raycaster, pointer: Vector2) {
		// 通过摄像机和鼠标位置更新射线
		raycaster.setFromCamera(pointer, this.camera);

		const intersects = raycaster.intersectObjects(Array.from(this.mapItems.values()));
		if (intersects.length > 0) {
			const firstInstance = intersects[0];
			let target: Object3D | null = firstInstance.object;
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
	}

	private updateCamera(controls: OrbitControls, targetObject: Object3D, followDistance: number, followAngleY: number) {
		if (!targetObject) return;
		controls.enabled = false;
		const targetPos = targetObject.position;
		const followPos = new Vector3();
		const cameraFaceVector = controls.object.getWorldDirection(new Vector3());
		const coefficient = followDistance / cameraFaceVector.length();
		const v1 = new Vector2(targetPos.x, targetPos.z);
		const v2 = v1.add(new Vector2(cameraFaceVector.x, cameraFaceVector.z).multiplyScalar(coefficient).negate());

		followPos.x = v2.x;
		followPos.y = targetPos.y + followDistance * Math.tan(MathUtils.degToRad(followAngleY));
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

	private addPlayerStateWatcher() {
		const gameInfoStore = useGameInfo();
		gameInfoStore.playersList.forEach((player, index) => {
			const InfoWatcher = watch(
				() => gameInfoStore.playersList[index],
				(newInfo) => {
					const playerEntity = this.getPlayerEntity(player.id);
					playerEntity && playerEntity.updatePlayerInfo(newInfo);
				},
				{ immediate: true, deep: true }
			);
			// const moneyWatcher = watch(
			// 	() => gameInfoStore.playersList[index].money,
			// 	(newMoney, oldMoney = 0) => {
			// 		this.createPopoverOnPlayerTop(player.user.userId, moneyPopTip, { money: newMoney - oldMoney }, 2000);
			// 	},
			// 	{ immediate: true }
			// );
			useEventBus().on(GameEvents.GainMoney + player.id, (player: PlayerInfo, money: number, source?: PlayerInfo) => {
				this.createPopoverOnPlayerTop(player.user.userId, moneyPopTip, { money: money }, 2000);
			});
			useEventBus().on(GameEvents.CostMoney + player.id, (player: PlayerInfo, money: number, target?: PlayerInfo) => {
				this.createPopoverOnPlayerTop(player.user.userId, moneyPopTip, { money: -money }, 2000);
			});
			const bankruptWatcher = watch(
				() => gameInfoStore.playersList[index].isBankrupted,
				(isBankrupted) => {
					if (!isBankrupted) return;
					// const playerEntity = this.getPlayerEntity(player.id);
					// playerEntity && playerEntity.doAnimation("failed", true);
					const playerEntity = this.getPlayerEntity(player.id);
					playerEntity && this.scene.remove(playerEntity.model);
					this.playerEntities.delete(player.id);
					const watchers = this.playerWatchers.get(player.id);
					if (watchers) {
						watchers.InfoWatcher && watchers.InfoWatcher();
						// watchers.moneyWatcher && watchers.moneyWatcher();
						watchers.bankruptWatcher && watchers.bankruptWatcher();
					}
				},
				{ immediate: true }
			);
			this.playerWatchers.set(player.id, {
				InfoWatcher,
				// moneyWatcher,
				bankruptWatcher,
			});
		});
	}

	private addPlayerMoveWatcher() {
		const mapDataStore = useMapData();

		useEventBus().on("player-walk", async (walkPlayerId: string, step: number, walkId: string) => {
			//拆散重叠的玩家模型;
			// this.breakUpPlayersInSameMapItem();

			const playerEntity = this.playerEntities.get(walkPlayerId);
			if (playerEntity) {
				const sourcePosition = toRaw(this.playerPosition.get(walkPlayerId)) as number;
				const mapIndexLength = toRaw(mapDataStore.mapIndexList.length);
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
	}

	private addPropertyLevelWatcher() {
		const gameInfoStore = useGameInfo();
		this.commonWatchers.push(
			watch(
				() => gameInfoStore.propertiesList,
				(newList, oldList) => {
					for (let i = 0; i < newList.length; i++) {
						if (
							!this.housesItems.has(newList[i].id) ||
							newList[i].owner?.id !== oldList[i].owner?.id ||
							newList[i].buildingLevel !== oldList[i].buildingLevel
						) {
							// 对于新旧数组中不同的元素，更新 Three.js 地图
							this.updateBuilding(newList[i]);
						}
					}
					this.renderer.render(this.scene, this.camera);
				}
			)
		);
	}

	private addMultiplierWatcher() {
		const gameInfoStore = useGameInfo();
		this.commonWatchers.push(
			watch(
				() => gameInfoStore.currentMultiplier,
				(newMultiplier) => {
					Array.from(this.housesItems.entries()).forEach((houseItem) => {
						const propertyId = houseItem[0];
						const houseItemValue = houseItem[1];
						const property = gameInfoStore.propertiesList.find((property) => property.id === propertyId);
						if (!property) return;
						if (property.owner) {
							const costList = [property.cost_lv0, property.cost_lv1, property.cost_lv2];
							houseItemValue.textSprite.updateText(
								`${property.name}\n过路费: ${Math.round(costList[property.buildingLevel] * newMultiplier)}￥`,
								property.owner.color
							);
						} else {
							houseItemValue.textSprite.updateText(
								`${property.name}\n可购买: ${Math.round(property.sellCost)}￥`,
								"#000000"
							);
						}
					});
				}
			)
		);
	}

	private addSettingWatcher() {
		const settingStore = useSettig();
		const lockRoleWatcher = watch(
			() => settingStore.lockRole,
			(newValue) => {
				this.isLockingRoleFromSetting = newValue;
			}
		);
		this.commonWatchers.push(lockRoleWatcher);
	}

	private addChanceCardUseWatcher() {
		const eventEmitter = useEventBus();
		eventEmitter.on(ChanceCardOperateType.HOVER, handleChanceCardHover.bind(this));
		eventEmitter.on(ChanceCardOperateType.DROG, handleChanceCardDrog.bind(this));

		function handleChanceCardHover(this: GameRenderer, chanceCard: ChanceCardInfo) {
			switch (chanceCard.type) {
				case ChanceCardType.ToSelf:
					this.outlineModels(this.getModulesByChanceCardType(ChanceCardType.ToSelf));
					break;
				case ChanceCardType.ToPlayer:
					this.outlineModels(this.getModulesByChanceCardType(ChanceCardType.ToPlayer));
					break;
				case ChanceCardType.ToOtherPlayer:
					this.outlineModels(this.getModulesByChanceCardType(ChanceCardType.ToOtherPlayer));
					break;
				case ChanceCardType.ToProperty:
					this.outlineModels(this.getModulesByChanceCardType(ChanceCardType.ToProperty));
					break;
			}
		}

		function handleChanceCardDrog(this: GameRenderer, chanceCard: ChanceCardInfo, mouseX: number, mouseY: number) {
			const raycaster = new Raycaster();
			const pointer = new Vector2();
			pointer.x = (mouseX / this.canvas.clientWidth) * 2 - 1;
			pointer.y = -(mouseY / this.canvas.clientHeight) * 2 + 1;

			raycaster.setFromCamera(pointer, this.camera);
			const intersects = raycaster.intersectObjects(this.getModulesByChanceCardType(chanceCard.type), true);

			if (intersects.length > 0) {
				const firstInstance = intersects[0];
				let temp: Object3D | null = firstInstance.object;
				while (temp) {
					if (temp.userData.id) {
						useMonopolyClient().useChanceCard(chanceCard.id, temp.userData.id);
						break;
					} else {
						temp = temp.parent;
					}
				}
			} else {
				//@ts-ignore
				this.propertyInfoLabelInstance.updateProperty(null);
			}

			this.chanceCardTargetOutlinePass.selectedObjects = [];
		}
	}

	private outlineModels(models: Object3D[]) {
		this.chanceCardTargetOutlinePass.selectedObjects = models;
	}

	private async updateBuilding(newProperty: PropertyInfo) {
		const oldModel = this.housesItems.get(newProperty.id);
		if (oldModel) {
			await gsap.to(oldModel.group.scale, { x: 0, y: 0, z: 0, duration: 0.2 });
			this.mapContainer.remove(oldModel.group);
		}

		const mapInfo = useMapData();
		const targetMapItem = mapInfo.mapItemsList.find((item) => item.property?.id === newProperty.id);
		if (!targetMapItem) return;

		const targetMapItemModel = this.mapItems.get(targetMapItem?.id);
		if (!targetMapItemModel) return;

		const buildModel = this.housesModules.get(`house_lv${newProperty.buildingLevel}`)?.clone();
		if (!buildModel) return;

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
							const basicMaterial = new MeshStandardMaterial();
							if (newProperty.owner) {
								basicMaterial.color = new Color(Number(newProperty.owner.color.replace("#", "0x")));
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
							(<Mesh>o).material = basicMaterial;
						}
					});
				}
			}
		});

		const linkMapItem = mapInfo.mapItemsList.find((item) => {
			if (!item.linkto) return false;
			if (item.linkto.id === targetMapItem.id) return true;
		});

		if (linkMapItem && this.mapItems.has(linkMapItem.id)) {
			const lookat = new Vector3();
			lookat.copy(this.mapItems.get(linkMapItem.id)!.position);
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
					const costList = [newProperty.cost_lv0, newProperty.cost_lv1, newProperty.cost_lv2];
					if (newProperty.owner) {
						houseItem.textSprite.updateText(
							`${newProperty.name}\n过路费: ${Math.round(
								costList[newProperty.buildingLevel] * useGameInfo().currentMultiplier
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

					const box = new Box3().setFromObject(buildModel);
					// 计算边界框的高度
					const size = box.getSize(new Vector3());
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
			playerEntity.doAnimation(RoleAnimations.RoleWalking, true);

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
					const currentAnimationName = playerEntity.getCurrentAnimationName();
					if (
						nextMapItemScreenX > playerScreenX &&
						(currentAnimationName === RoleAnimations.RoleWalking || currentAnimationName === RoleAnimations.Idle)
					) {
						currentAnimation = gsap.to(playerEntity.model.scale, { x: 1, duration: 0.3 });
					} else if (
						nextMapItemScreenX < playerScreenX &&
						(currentAnimationName === RoleAnimations.RoleWalking || currentAnimationName === RoleAnimations.Idle)
					) {
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
			playerEntity.doAnimation(RoleAnimations.Idle, true);
		}
		// useMonopolyClient().AnimationComplete();
	}

	private updatePlayerPosition(player: PlayerInfo) {
		const { x, y, z } = this.getMapItemPosition(player.positionIndex);

		if (!this.playerEntities.has(player.id)) return;
		this.playerEntities.get(player.id)!.model.position.set(x, y + BLOCK_HEIGHT, z);
		// this.playerEntities.get(player.id)!.model.position.set(x, y, z);
	}

	private getMapItemPosition(index: number) {
		const mapStore = useMapData();
		const mapIndex = mapStore.mapIndexList;
		const id = mapIndex[index];
		if (!this.mapItems.has(id)) return new Vector3(0, 0, 0);
		return this.mapItems.get(id)!.position;
	}

	private getPlayerEntity(id: string) {
		return this.playerEntities.get(id);
	}

	private getMapItem(index: number) {
		const mapStore = useMapData();
		const mapIndex = mapStore.mapIndexList;
		const id = mapIndex[index];
		return this.mapItems.get(id);
	}

	private getGroupCenter(group: Group) {
		if (group.children.length === 0) return new Vector3(0, 0, 0);
		const centerPoint = new Vector3();
		group.children.forEach(function (child) {
			centerPoint.add(child.position);
		});
		const numChildren = group.children.length;
		centerPoint.divideScalar(numChildren);
		return centerPoint;
	}

	private getModulesByChanceCardType(type: ChanceCardType) {
		const chanceCardTargetEachType: Record<ChanceCardType, Object3D[]> = {
			[ChanceCardType.ToSelf]: (() => {
				const selfEntity = this.playerEntities.get(useUserInfo().userId);
				return selfEntity ? [selfEntity.model] : [];
			})(),
			[ChanceCardType.ToPlayer]: (() =>
				Array.from(this.playerEntities.values())
					.filter((playerEntity) => !playerEntity.playerInfo.isBankrupted)
					.map((p) => p.model))(),
			[ChanceCardType.ToOtherPlayer]: (() =>
				Array.from(this.playerEntities.values())
					.filter((playerEntity) => {
						return !playerEntity.playerInfo.isBankrupted && playerEntity.playerInfo.id != useUserInfo().userId;
					})
					.map((p) => p.model))(),
			[ChanceCardType.ToProperty]: (() => Array.from(this.housesItems.values()).map((h) => h.group))(),
			[ChanceCardType.ToMapItem]: (() => [])(),
		};
		return chanceCardTargetEachType[type];
	}

	private async loadPlayersModules(playerList: Array<PlayerInfo>) {
		for await (const playerInfo of playerList) {
			try {
				this.playerPosition.set(playerInfo.id, toRaw(playerInfo.positionIndex));
				const playerEntity = new PlayerEntity(
					PLAY_MODEL_SIZE,
					`${__PROTOCOL__}://${playerInfo.user.role.baseUrl}/`,
					playerInfo.user.role.fileName,
					playerInfo
				);
				await playerEntity.load();
				this.playerEntities.set(playerInfo.id, playerEntity);
				const textSprite = new TextSprite(
					`${playerInfo.user.username}${playerInfo.user.userId === useUserInfo().userId ? " (你)" : ""}`,
					32,
					playerInfo.user.color,
					5,
					0
				);
				const nameSprite = textSprite.getSprite();
				nameSprite.position.set(0, PLAY_MODEL_SIZE + 0.05, 0);
				playerEntity.model.add(nameSprite);
				this.scene.add(playerEntity.model);
			} catch (e) {}
		}
	}

	private async loadHousesModels(houseNameList: { lv0: Model; lv1: Model; lv2: Model }) {
		const modelList = await loadHouseModels(houseNameList);
		modelList.forEach((model) => {
			this.housesModules.set(model.name, model.glft.scene);
		});
	}

	private async loadMapModels(itemTypeList: ItemType[]) {
		const modelList = await loadItemTypeModules(itemTypeList);
		modelList.forEach((model) => {
			this.mapModules.set(model.id, model.glft.scene);
		});
	}

	private async loadMap(mapItemsList: Array<MapItem>) {
		const textureLoader = new TextureLoader();
		const mapDataStore = useMapData();
		const mapIndex = mapDataStore.mapIndexList;
		mapItemsList.forEach((mapItem) => {
			const tempModule = this.mapModules.get(mapItem.type.id)!.clone();
			tempModule.userData = {
				typeId: mapItem.type.id,
				itemId: mapItem.id,
				property: toRaw(mapItem.property) || undefined,
				arrivedEvent: toRaw(mapItem.arrivedEvent) || undefined,
				isMapItem: true,
			};
			tempModule.scale.set(0.5, 0.5, 0.5);
			// tempModule.position.set(mapItem.x + mapItem.type.size / 2, 0, mapItem.y + mapItem.type.size / 2);
			// tempModule.rotation.y = (Math.PI / 2) * mapItem.rotation;
			if (mapItem.arrivedEvent) {
				const mapItemsInMapIndex = mapItemsList.filter((i) => mapIndex.includes(i.id));
				const arrivedEvent = mapItem.arrivedEvent;
				textureLoader.load(`${__PROTOCOL__}://${arrivedEvent.iconUrl}`, (texture) => {
					// texture.matrixAutoUpdate = false

					texture.colorSpace = SRGBColorSpace;
					const planeGeometry = new PlaneGeometry(1, 1);
					const planeMaterial = new MeshBasicMaterial({
						map: texture,
						side: DoubleSide,
						transparent: true,
						depthWrite: false,
					});
					const iconPlane = new Mesh(planeGeometry, planeMaterial);
					iconPlane.rotateX(-Math.PI / 2);
					// if (mapIndex.length > 0) {
					//     //根据路径优化图标方向
					//     const currentIndex = mapIndex.findIndex((item) => item === mapItem.id);
					//     const preMapItem = mapItemsInMapIndex[(currentIndex - 1) < 0 ? (currentIndex - 1 + mapItemsInMapIndex.length) : (currentIndex - 1)]
					//     const nextMapItem = mapItemsInMapIndex[(currentIndex + 1) % mapItemsInMapIndex.length];
					//     // 计算两个点之间的向量
					//     const direction = new Vector3();
					//     direction.subVectors(new Vector3(preMapItem.x, 0, preMapItem.y), new Vector3(nextMapItem.x, 0, nextMapItem.y)).normalize();
					//     // 设定一个法向量，图片朝上，y=1
					//     const normal = new Vector3(0, 1, 0);
					//     // 计算旋转四元数，使得法向量旋转到direction
					//     const quaternion = new Quaternion();
					//     quaternion.setFromUnitVectors(normal, direction);
					//     //应用
					//     iconPlane.quaternion.copy(quaternion);
					//     this.arrivedEventIcons.set(arrivedEvent.id, iconPlane)
					// }
					this.arrivedEventIcons.set(arrivedEvent.id, iconPlane);
					this.mapContainer.add(iconPlane);
					this.setItemPositionOnMap(iconPlane, mapItem.x, mapItem.y, 0, BLOCK_HEIGHT + 0.01);
				});
			}
			this.setItemPositionOnMap(tempModule, mapItem.x, mapItem.y, mapItem.rotation);
			this.mapItems.set(mapItem.id, tempModule);
			this.mapContainer.add(tempModule);
		});
	}

	private setItemPositionOnMap(object: Object3D, x: number, z: number, rotation = 0, y: number = 0) {
		object.position.set(x + 0.5, y, z + 0.5);
		object.rotation.y = (Math.PI / 2) * rotation;
	}

	public async reloadMap(mapData: Array<MapItem>) {
		this.mapContainer.clear();
		await this.loadMap(mapData);
	}

	private breakUpPlayersInSameMapItem() {
		const playersList = useGameInfo().playersList;
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
		const position = new Vector3();
		position.copy(playerEntity.model.position);

		const { css2DObject, appInstance, unmount } = createCSS2DObjectFromVue(component, props);

		position.x += playerEntity.size * (Math.random() - 0.5) * 0.1;
		position.y += playerEntity.size / 2;
		position.z += playerEntity.size * (Math.random() - 0.5) * 0.1;
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
		this.currentFocusModule = this.playerEntities.get(useUserInfo().userId)?.model || null;
		if (this.currentFocusModule) {
			this.updateCamera(this.controls, this.currentFocusModule, 7, 30);
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
// 	texture.colorSpace = SRGBColorSpace;
// 	const material = new SpriteMaterial({
// 		map: texture,
// 		depthWrite: false,
// 		transparent: true,
// 		side: DoubleSide,
// 	});
// 	return new Sprite(material);
// }
