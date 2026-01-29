import * as THREE from "three";
import * as CANNON from "cannon-es";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { DiceResult } from "@mine-monopoly/types";

export interface DiceObject {
	mesh: THREE.Mesh;
	body: CANNON.Body;
	targetIndex: number; // 目标面的索引 (0-5)
	prophecyValue?: number; // 预言值

	// 动画状态
	initialPosition: THREE.Vector3;
	initialQuaternion: THREE.Quaternion;
	finalPosition: THREE.Vector3;
	finalQuaternion: THREE.Quaternion;
}

export class DiceManager {
	public diceModel: THREE.Object3D | null;
	public diceObjects: DiceObject[];

	public isRolling: boolean;
	public isArranged: boolean;

	private arrangementStartTime: number;
	private readonly arrangementDuration: number;

	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;

	private actionPos: THREE.Vector3;
	private targetCameraPos: THREE.Vector3;
	private currentLookAt: THREE.Vector3;
	private targetLookAt: THREE.Vector3;

	public world: CANNON.World;

	// 映射：材质索引 (0-5) -> 局部法线向量
	private faceVectors: Record<number, THREE.Vector3>;
	// 映射：材质索引 (0-5) -> 纹理"向上"向量
	private faceUpVectors: Record<number, THREE.Vector3>;

	private baseGeometry: RoundedBoxGeometry;
	private baseShape: CANNON.Box;

	constructor(diceModel: THREE.Object3D | null = null, aspect: number = 1) {
		this.diceModel = diceModel;
		this.diceObjects = [];

		this.isRolling = false;
		this.isArranged = false;
		this.arrangementStartTime = 0;
		this.arrangementDuration = 800;

		// 1. Scene
		this.scene = new THREE.Scene();
		this.scene.background = null;

		// 2. Camera
		this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
		this.actionPos = new THREE.Vector3(0, 15, 15);
		this.targetCameraPos = this.actionPos.clone();
		this.currentLookAt = new THREE.Vector3(0, 0, 0);
		this.targetLookAt = new THREE.Vector3(0, 0, 0);
		this.camera.position.copy(this.actionPos);
		this.camera.lookAt(this.currentLookAt);

		// 3. Physics
		this.world = new CANNON.World({
			gravity: new CANNON.Vec3(0, -25, 0),
		});
		const defaultMat = new CANNON.Material();
		const contactMat = new CANNON.ContactMaterial(defaultMat, defaultMat, {
			friction: 0.3,
			restitution: 0.5,
		});
		this.world.addContactMaterial(contactMat);

		// 4. Environment
		this._initEnvironment();

		// 5. Geometry
		this.baseGeometry = new RoundedBoxGeometry(1.5, 1.5, 1.5, 10, 0.15);
		this.baseShape = new CANNON.Box(new CANNON.Vec3(0.74, 0.74, 0.74));

		// 6. Face Mappings (基于 Three.js BoxGeometry 材质索引顺序)
		// 0:Right, 1:Left, 2:Top, 3:Bottom, 4:Front, 5:Back
		this.faceVectors = {
			0: new THREE.Vector3(1, 0, 0), // Right
			1: new THREE.Vector3(-1, 0, 0), // Left
			2: new THREE.Vector3(0, 1, 0), // Top
			3: new THREE.Vector3(0, -1, 0), // Bottom
			4: new THREE.Vector3(0, 0, 1), // Front
			5: new THREE.Vector3(0, 0, -1), // Back
		};

		// 定义每个面纹理的"顶部"朝向，用于文字摆正
		this.faceUpVectors = {
			0: new THREE.Vector3(0, 1, 0),
			1: new THREE.Vector3(0, 1, 0),
			2: new THREE.Vector3(0, 0, -1), // Top 面的纹理顶端指向 -Z
			3: new THREE.Vector3(0, 0, 1), // Bottom 面的纹理顶端指向 +Z
			4: new THREE.Vector3(0, 1, 0),
			5: new THREE.Vector3(0, 1, 0),
		};
	}

	// --- API ---

	public getScene(): THREE.Scene {
		return this.scene;
	}
	public getCamera(): THREE.PerspectiveCamera {
		return this.camera;
	}

	public updateAspect(aspect: number): void {
		this.camera.aspect = aspect;
		this.camera.updateProjectionMatrix();
	}

	// --- Core Logic ---

	/**
	 * 初始化指定数量的骰子 (默认面)
	 */
	public setDiceCount(count: number): void {
		// 简单的增量更新逻辑
		// 如果现有少于需求，增加
		while (this.diceObjects.length < count) {
			this._addDice();
		}
		// 如果现有由多于需求，移除
		while (this.diceObjects.length > count) {
			this._removeDice();
		}
	}

	private _addDice(): void {
		// 默认材质 (空白或占位)
		const materials = new Array(6).fill(null).map(() => new THREE.MeshStandardMaterial({ color: 0xdddddd }));

		const mesh = new THREE.Mesh(this.baseGeometry, materials);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		mesh.position.set(0, -100, 0);
		this.scene.add(mesh);

		const body = new CANNON.Body({ mass: 1, shape: this.baseShape });
		body.angularDamping = 0.3;
		body.linearDamping = 0.3;
		body.sleep();
		this.world.addBody(body);

		this.diceObjects.push({
			mesh,
			body,
			targetIndex: 0,
			initialPosition: new THREE.Vector3(),
			initialQuaternion: new THREE.Quaternion(),
			finalPosition: new THREE.Vector3(),
			finalQuaternion: new THREE.Quaternion(),
		});
	}

	private _removeDice(): void {
		const obj = this.diceObjects.pop();
		if (obj) {
			this.scene.remove(obj.mesh);
			if (Array.isArray(obj.mesh.material)) {
				obj.mesh.material.forEach((m) => m.dispose());
			}
			this.world.removeBody(obj.body);
		}
	}

	/**
	 * 核心投掷函数
	 * @param configs 对象数组，定义每个骰子的面和目标
	 */
	public roll(configs: DiceResult[]): Promise<void> {
		return new Promise((resolve) => {
			this.isRolling = true;
			this.isArranged = false;

			// 1. 自动调整骰子数量以匹配配置
			this.setDiceCount(configs.length);

			// 2. 重置相机
			this.targetCameraPos.copy(this.actionPos);
			this.targetLookAt.set(0, 0, 0);

			this.diceObjects.forEach((obj, i) => {
				const config = configs[i];

				// 保存预言值供后续阶段使用
				obj.prophecyValue = config.prophecy;

				// --- A. 更新材质 (根据 config.dice) ---
				// 销毁旧材质
				if (Array.isArray(obj.mesh.material)) {
					obj.mesh.material.forEach((m) => m.dispose());
				}

				// 生成新材质
				// config.dice 应该有 6 个元素，分别对应 Material Index 0-5
				// 如果不足 6 个，用 "?" 填充
				const faces = [...config.diceValues];
				while (faces.length < 6) faces.push(0);

				const baseColor = "#eeeeee";
				obj.mesh.material = faces.map((num) => this._createDiceFaceTexture(num, baseColor));

				// --- B. 确定目标面索引 ---
				// 找到 target 在 dice 数组中的索引
				let targetIdx = config.diceValues.indexOf(config.result);
				if (targetIdx === -1) {
					console.warn(`Target ${config.result} not found in dice faces [${config.diceValues}]. Using random.`);
					targetIdx = Math.floor(Math.random() * 6);
				}
				obj.targetIndex = targetIdx;

				// --- C. 物理状态重置 ---
				obj.body.type = CANNON.Body.DYNAMIC;
				obj.body.wakeUp();

				// 随机位置
				obj.body.position.set((Math.random() - 0.5) * 2, 5 + i * 1.5, (Math.random() - 0.5) * 2);

				// 随机旋转
				obj.body.quaternion.set(Math.random(), Math.random(), Math.random(), Math.random());
				obj.body.quaternion.normalize();

				obj.body.velocity.set(0, 0, 0);
				obj.body.angularVelocity.set(0, 0, 0);

				// 施加力
				obj.body.applyImpulse(
					new CANNON.Vec3((Math.random() - 0.5) * 8, 10, (Math.random() - 0.5) * 8),
					obj.body.position,
				);

				// 施加旋转
				obj.body.angularVelocity.set(
					(Math.random() - 0.5) * 15,
					(Math.random() - 0.5) * 15,
					(Math.random() - 0.5) * 15,
				);
			});

			// 动画时间轴
			setTimeout(() => {
				this._startArranging();
			}, 1500);

			setTimeout(() => {
				this._finalizeArrangement();
				resolve();
			}, 3000);
		});
	}

	// --- Texture Generation (Cute Style) ---
	/**
	 * 创建骰子面纹理
	 * @param value 显示的数值
	 * @param baseColor 背景颜色
	 * @param isProphecy 是否是预言状态（会改变文字颜色、边框和增加标签）
	 */
	private _createDiceFaceTexture(
		value: number | string,
		baseColor: string,
		isProphecy: boolean = false,
	): THREE.MeshStandardMaterial {
		const canvas = document.createElement("canvas");
		const size = 512;
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext("2d");

		if (!ctx) throw new Error("Canvas context creation failed");

		// 1. 底色
		ctx.fillStyle = baseColor;
		ctx.fillRect(0, 0, size, size);

		// 2. 噪点 (增加质感)
		for (let i = 0; i < 400; i++) {
			ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.4})`;
			ctx.beginPath();
			ctx.arc(Math.random() * size, Math.random() * size, Math.random() * 2.5, 0, Math.PI * 2);
			ctx.fill();
		}

		// 3. 边框
		if (isProphecy) {
			// 预言状态：紫色实线边框 + 发光感
			ctx.strokeStyle = "#9333ea"; // Purple
			ctx.lineWidth = 20;
			ctx.lineJoin = "round";
			ctx.strokeRect(20, 20, size - 40, size - 40);

			// 额外的内发光效果模拟
			ctx.strokeStyle = "rgba(147, 51, 234, 0.3)";
			ctx.lineWidth = 10;
			ctx.strokeRect(35, 35, size - 70, size - 70);
		} else {
			// 普通状态：灰色虚线
			ctx.strokeStyle = "#777a83";
			ctx.lineWidth = 12;
			ctx.setLineDash([30, 20]);
			ctx.lineCap = "round";
			ctx.lineJoin = "round";
			const pad = 35;
			ctx.strokeRect(pad, pad, size - pad * 2, size - pad * 2);
			ctx.setLineDash([]);
		}

		// 4. 文字
		ctx.save();
		ctx.translate(size / 2, size / 2);
		// 预言状态下不旋转文字，保持庄重；普通状态随机旋转一点增加俏皮感
		if (!isProphecy) {
			ctx.rotate((Math.random() - 0.5) * 0.15);
		}

		if (isProphecy) {
			ctx.fillStyle = "#9333ea"; // 预言文字紫色
		} else {
			ctx.fillStyle = "#111316"; // 普通文字黑色
		}

		ctx.font = "bold 260px ContentFont";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(String(value), 0, isProphecy ? 40 : 0); // 预言状态稍微下移给标签腾位置

		// 5. 预言标签 (Tag)
		if (isProphecy) {
			// 绘制标签背景
			ctx.fillStyle = "#9333ea";
			const tagW = 160;
			const tagH = 60;
			const tagX = -tagW / 2;
			const tagY = -180; // 文字上方

			ctx.beginPath();
			ctx.roundRect(tagX, tagY, tagW, tagH, 10);
			ctx.fill();

			// 绘制标签文字
			ctx.fillStyle = "#ffffff";
			ctx.font = "bold 36px ContentFont";
			ctx.fillText("预言", 0, tagY + tagH / 2 + 2);
		}

		ctx.restore();

		const tex = new THREE.CanvasTexture(canvas);

		return new THREE.MeshStandardMaterial({
			map: tex,
			roughness: 0.8,
			metalness: 0.0,
			color: 0xffffff,
			emissive: isProphecy ? 0x220033 : 0x222222, // 预言状态微弱紫光
			emissiveIntensity: 0.2,
		});
	}

	// --- Loop & Updates ---

	public update(dt: number = 1 / 60): void {
		this.world.step(dt);

		this.diceObjects.forEach((obj) => {
			if (this.isRolling && !this.isArranged) {
				obj.mesh.position.copy(obj.body.position as unknown as THREE.Vector3);
				obj.mesh.quaternion.copy(obj.body.quaternion as unknown as THREE.Quaternion);

				const speed = obj.body.velocity.length();

				// [优化回归]: 启用物理层面的作弊修正，但使用更自然的方式
				// 只有当骰子接近地面 (< 3.0) 且速度降低到一定程度 (< 5.0) 时才介入
				// 这样可以保留高速投掷时的自然随机感
				if (obj.mesh.position.y < 3.0 && speed < 5.0) {
					this._applyCheatForce(obj);
				}
			}
		});

		if (this.isArranged) {
			const elapsed = performance.now() - this.arrangementStartTime;
			const alpha = Math.min(1, elapsed / this.arrangementDuration);
			const t = alpha * (2 - alpha); // EaseOut

			this.diceObjects.forEach((obj) => {
				obj.mesh.position.lerpVectors(obj.initialPosition, obj.finalPosition, t);
				obj.mesh.quaternion.slerpQuaternions(obj.initialQuaternion, obj.finalQuaternion, t);

				obj.body.position.copy(obj.mesh.position as unknown as CANNON.Vec3);
				obj.body.quaternion.copy(obj.mesh.quaternion as unknown as CANNON.Quaternion);
			});

			this._calculateArrangedFocus();
		} else {
			this._calculateActionFocus();
		}

		this.camera.position.lerp(this.targetCameraPos, 0.05);
		this.currentLookAt.lerp(this.targetLookAt, 0.05);
		this.camera.lookAt(this.currentLookAt);
	}

	// --- Internal Helpers ---

	private _startArranging(): void {
		if (this.isArranged) return;
		this.isArranged = true;
		this.arrangementStartTime = performance.now();

		const diceCount = this.diceObjects.length;
		if (diceCount === 0) return;

		const spacing = 2.0;
		const totalWidth = (diceCount - 1) * spacing;
		const startX = -totalWidth / 2;
		const diceHeight = 0.75;
		const cameraUp = this.camera.up.clone();

		// 计算相机排列视角位置，用于确定每个骰子的朝向
		const maxDim = Math.max(10, totalWidth);
		const camHeight = maxDim * 0.8;
		const finalCamPos = new THREE.Vector3(0, camHeight, camHeight * 0.7);

		this.diceObjects.forEach((obj, i) => {
			// 切换到 Kinematic 模式，停止物理模拟，开始手动插值
			obj.body.type = CANNON.Body.KINEMATIC;
			obj.body.velocity.set(0, 0, 0);
			obj.body.angularVelocity.set(0, 0, 0);

			obj.initialPosition.copy(obj.mesh.position);
			obj.initialQuaternion.copy(obj.mesh.quaternion);

			if (obj.prophecyValue !== undefined && obj.prophecyValue !== null) {
				const materials = obj.mesh.material as THREE.MeshStandardMaterial[];
				const targetMatIndex = obj.targetIndex;

				if (materials[targetMatIndex].map) materials[targetMatIndex].map.dispose();
				materials[targetMatIndex].dispose();

				// 创建新的预言纹理 (紫色背景，预言值)
				materials[targetMatIndex] = this._createDiceFaceTexture(obj.prophecyValue, "#faf5ff", true);
			}
			// ----------------------------

			// 计算目标位置
			const finalX = startX + i * spacing;
			const finalPos = new THREE.Vector3(finalX, diceHeight, 0);
			obj.finalPosition.copy(finalPos);

			// 计算目标旋转
			const targetVec = this.faceVectors[obj.targetIndex];
			const targetUpVec = this.faceUpVectors[obj.targetIndex];

			const viewDir = new THREE.Vector3().subVectors(finalCamPos, finalPos).normalize();

			if (targetVec && targetUpVec) {
				// 1. 面朝向相机
				const q1 = new THREE.Quaternion().setFromUnitVectors(targetVec, viewDir);

				// 2. 修正旋转，让数字正对上方
				const currentWorldUp = targetUpVec.clone().applyQuaternion(q1);
				const projCameraUp = cameraUp.clone().projectOnPlane(viewDir).normalize();
				const projCurrentUp = currentWorldUp.clone().projectOnPlane(viewDir).normalize();

				let angle = projCurrentUp.angleTo(projCameraUp);
				const cross = new THREE.Vector3().crossVectors(projCurrentUp, projCameraUp);
				if (cross.dot(viewDir) < 0) angle = -angle;

				const q2 = new THREE.Quaternion().setFromAxisAngle(viewDir, angle);
				obj.finalQuaternion.multiplyQuaternions(q2, q1);
			} else {
				obj.finalQuaternion.identity();
			}
		});
	}

	private _finalizeArrangement(): void {
		this.diceObjects.forEach((obj) => {
			obj.body.type = CANNON.Body.STATIC;
			obj.mesh.position.copy(obj.finalPosition);
			obj.mesh.quaternion.copy(obj.finalQuaternion);
			obj.body.position.copy(obj.finalPosition as unknown as CANNON.Vec3);
			obj.body.quaternion.copy(obj.finalQuaternion as unknown as CANNON.Quaternion);
		});
		this.isRolling = false;
	}

	private _calculateArrangedFocus(): void {
		const diceCount = this.diceObjects.length;
		const spacing = 2.0;
		const totalWidth = (diceCount - 1) * spacing;
		const center = new THREE.Vector3(0, 0.75, 0);
		const maxDim = Math.max(10, totalWidth);
		const height = maxDim * 0.8;
		this.targetCameraPos.set(center.x, height, center.z + height * 0.7);
		this.targetLookAt.copy(center);
	}

	private _calculateActionFocus(): void {
		this.targetCameraPos.copy(this.actionPos);
		this.targetLookAt.set(0, 0, 0);
	}

	private _applyCheatForce(diceObj: DiceObject): void {
		const targetVec = this.faceVectors[diceObj.targetIndex];
		if (!targetVec) return;

		const body = diceObj.body;

		// 1. 计算当前目标面法线在世界坐标系的方向
		const q = body.quaternion;
		const bodyQuat = new THREE.Quaternion(q.x, q.y, q.z, q.w);
		const currentDir = targetVec.clone().applyQuaternion(bodyQuat);
		const up = new THREE.Vector3(0, 1, 0);

		const cross = new THREE.Vector3().crossVectors(currentDir, up);
		const dot = currentDir.dot(up); // cos(theta)

		// 如果已经非常接近 (cos(theta) > 0.99 约等于 8度以内)，增加阻尼让其停稳
		if (dot > 0.99) {
			body.angularDamping = 0.9; // 强阻尼
			body.linearDamping = 0.9;
			return;
		} else {
			body.angularDamping = 0.3; // 恢复默认
			body.linearDamping = 0.3;
		}

		// 3. 基于速度的介入强度 (Fade in)
		// 速度越慢，控制力越强
		const speed = body.velocity.length();
		const maxSpeedThreshold = 4.0;
		if (speed > maxSpeedThreshold) return; // 速度太快时不干预，保持物理自然性

		// 介入系数 (0 ~ 1)
		const factor = 1.0 - Math.min(speed / maxSpeedThreshold, 1.0);
		const Kp = 150 * factor;
		const Kd = 10 * factor;

		// 目标力矩
		const torqueX = cross.x * Kp - body.angularVelocity.x * Kd;
		const torqueY = cross.y * Kp - body.angularVelocity.y * Kd;
		const torqueZ = cross.z * Kp - body.angularVelocity.z * Kd;

		body.applyTorque(new CANNON.Vec3(torqueX, torqueY, torqueZ));
		if (dot < -0.8 && speed < 0.5) {
			const pushDir = new CANNON.Vec3(Math.random() - 0.5, 1, Math.random() - 0.5).unit();
			pushDir.scale(5, pushDir); // 强度
			const relPoint = new CANNON.Vec3(0.5, 0.5, 0.5);
			body.applyImpulse(pushDir, relPoint);
		}
	}

	private _initEnvironment(): void {
		const ambientLight = new THREE.AmbientLight(0xffffff, 3);
		this.scene.add(ambientLight);

		// const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
		// dirLight.position.set(0, 20, 0);
		// dirLight.castShadow = true;
		// dirLight.shadow.mapSize.set(2048, 2048);
		// dirLight.shadow.camera.left = -30;
		// dirLight.shadow.camera.right = 30;
		// dirLight.shadow.camera.top = 30;
		// dirLight.shadow.camera.bottom = -30;
		// this.scene.add(dirLight);

		const floorBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
		floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
		this.world.addBody(floorBody);

		const floorGeo = new THREE.PlaneGeometry(200, 200);
		const floorMat = new THREE.ShadowMaterial({ opacity: 1 });
		const floorMesh = new THREE.Mesh(floorGeo, floorMat);
		floorMesh.rotation.x = -Math.PI / 2;
		floorMesh.receiveShadow = true;
		this.scene.add(floorMesh);
	}

	public dispose(): void {
		this.diceObjects.forEach((obj) => {
			this.scene.remove(obj.mesh);
			if (obj.mesh.geometry) obj.mesh.geometry.dispose();
			if (Array.isArray(obj.mesh.material)) {
				obj.mesh.material.forEach((m) => m.dispose());
			}
			this.world.removeBody(obj.body);
		});
		this.diceObjects = [];
		if (this.baseGeometry) this.baseGeometry.dispose();
		this.scene.clear();
	}
}
