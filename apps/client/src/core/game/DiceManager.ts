import * as THREE from "three";
import * as CANNON from "cannon-es";

export interface DiceObject {
	mesh: THREE.Object3D; // 视觉模型
	body: CANNON.Body; // 物理刚体
	target: number; // 目标点数

	// 动画过渡用的状态存储
	initialPosition: THREE.Vector3;
	initialQuaternion: THREE.Quaternion;
	finalPosition: THREE.Vector3;
	finalQuaternion: THREE.Quaternion;
}

export class DiceManager {
	public diceModel: THREE.Object3D | null;
	public diceObjects: DiceObject[];

	// 状态标记
	public isRolling: boolean;
	public isArranged: boolean;

	// 动画时间控制
	private arrangementStartTime: number;
	private readonly arrangementDuration: number;

	// --- Scene Components ---
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;

	// --- Camera State ---
	private actionPos: THREE.Vector3; // 默认动作视角
	private targetCameraPos: THREE.Vector3; // 目标位置
	private currentLookAt: THREE.Vector3; // 当前注视点
	private targetLookAt: THREE.Vector3; // 目标注视点

	// --- Physics ---
	public world: CANNON.World;

	// --- Logic Data ---
	// 骰子点数对应的局部向上向量
	private faceVectors: Record<number, THREE.Vector3>;

	/**
	 * @param diceModel - 用于克隆的骰子模型模板 (D6)
	 * @param aspect - 渲染器的宽高比 (width / height)
	 */
	constructor(diceModel: THREE.Object3D | null, aspect: number = 1) {
		this.diceModel = diceModel;
		this.diceObjects = [];

		this.isRolling = false;
		this.isArranged = false;
		this.arrangementStartTime = 0;
		this.arrangementDuration = 500;

		// --- 1. Scene ---
		this.scene = new THREE.Scene();
		this.scene.background = null;

		// --- 2. Camera ---
		this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);

		this.actionPos = new THREE.Vector3(0, 15, 15);
		this.targetCameraPos = this.actionPos.clone();
		this.currentLookAt = new THREE.Vector3(0, 0, 0);
		this.targetLookAt = new THREE.Vector3(0, 0, 0);

		this.camera.position.copy(this.actionPos);
		this.camera.lookAt(this.currentLookAt);

		// --- 3. Physics World ---
		this.world = new CANNON.World({
			gravity: new CANNON.Vec3(0, -25, 0),
		});
		const defaultMat = new CANNON.Material();
		const contactMat = new CANNON.ContactMaterial(defaultMat, defaultMat, {
			friction: 0.3,
			restitution: 0.5,
		});
		this.world.addContactMaterial(contactMat);

		// --- 4. Environment ---
		this._initEnvironment();

		// 目标面向量映射 (D6)
		this.faceVectors = {
			1: new THREE.Vector3(0, 1, 0),
			6: new THREE.Vector3(0, -1, 0),
			2: new THREE.Vector3(0, 0, 1),
			5: new THREE.Vector3(0, 0, -1),
			3: new THREE.Vector3(1, 0, 0),
			4: new THREE.Vector3(-1, 0, 0),
		};
	}

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

	private _initEnvironment(): void {
		// Lights
		const ambientLight = new THREE.AmbientLight(0xffffff, 3);
		this.scene.add(ambientLight);

		const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
		dirLight.position.set(0, 20, 0);
		dirLight.castShadow = true;

		// 阴影贴图设置
		dirLight.shadow.mapSize.set(2048, 2048);
		dirLight.shadow.camera.left = -30;
		dirLight.shadow.camera.right = 30;
		dirLight.shadow.camera.top = 30;
		dirLight.shadow.camera.bottom = -30;
		this.scene.add(dirLight);

		// Physics Floor (无限平面)
		const floorBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
		floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
		this.world.addBody(floorBody);

		// Floor Mesh (Shadow Receiver)
		const floorGeo = new THREE.PlaneGeometry(200, 200);
		const floorMat = new THREE.ShadowMaterial({ opacity: 1 });
		const floorMesh = new THREE.Mesh(floorGeo, floorMat);
		floorMesh.rotation.x = -Math.PI / 2;
		floorMesh.receiveShadow = true;
		this.scene.add(floorMesh);
	}

	public setDiceCount(count: number): void {
		this.diceObjects.forEach((obj) => {
			this.scene.remove(obj.mesh);
			this.world.removeBody(obj.body);
		});
		this.diceObjects = [];

		if (!this.diceModel) return;

		const diceSize = 1.5;
		const halfExtent = diceSize / 2;

		for (let i = 0; i < count; i++) {
			// Mesh
			const mesh = this.diceModel.clone();
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			mesh.position.set(0, -100, 0);
			this.scene.add(mesh);

			// Body
			const shape = new CANNON.Box(new CANNON.Vec3(halfExtent, halfExtent, halfExtent));
			const body = new CANNON.Body({ mass: 1, shape: shape });
			body.angularDamping = 0.3;
			body.linearDamping = 0.3;
			body.sleep();
			this.world.addBody(body);

			// Create Object
			const obj: DiceObject = {
				mesh,
				body,
				target: 1,
				initialPosition: new THREE.Vector3(),
				initialQuaternion: new THREE.Quaternion(),
				finalPosition: new THREE.Vector3(),
				finalQuaternion: new THREE.Quaternion(),
			};
			this.diceObjects.push(obj);
		}
	}

	public roll(targets: number[]): Promise<void> {
		return new Promise((resolve) => {
			this.isRolling = true;
			this.isArranged = false;

			// 重置相机
			this.targetCameraPos.copy(this.actionPos);
			this.targetLookAt.set(0, 0, 0);

			this.diceObjects.forEach((obj, i) => {
				// 重置为动态物体
				obj.body.type = CANNON.Body.DYNAMIC;
				obj.target = targets[i] || 1;
				obj.body.wakeUp();

				// 随机起始位置
				obj.body.position.set((Math.random() - 0.5) * 2, 5 + i * 1.5, (Math.random() - 0.5) * 2);

				obj.body.quaternion.set(Math.random(), Math.random(), Math.random(), Math.random());
				obj.body.quaternion.normalize();

				obj.body.velocity.set(0, 0, 0);
				obj.body.angularVelocity.set(0, 0, 0);

				// 施加力
				obj.body.applyImpulse(
					new CANNON.Vec3((Math.random() - 0.5) * 8, 8, (Math.random() - 0.5) * 8),
					obj.body.position
				);

				// 施加随机旋转
				obj.body.angularVelocity.set(
					(Math.random() - 0.5) * 15,
					(Math.random() - 0.5) * 15,
					(Math.random() - 0.5) * 15
				);
			});

			// 定时器逻辑
			setTimeout(() => {
				this._startArranging();
			}, 1500);
			// setTimeout(() => {
			// 	this._finalizeArrangement();
			// 	resolve();
			// }, 3000 + this.arrangementDuration);
			setTimeout(() => {
				this._finalizeArrangement();
				resolve();
			}, 3000);
		});
	}

	public update(dt: number = 1 / 60): void {
		this.world.step(dt);

		this.diceObjects.forEach((obj) => {
			// Rigging: 只在滚动且未排列时介入
			if (this.isRolling && !this.isArranged) {
				// TS Tip: 将 Cannon 的 Vec3/Quaternion 视为 Three 的类型进行 copy
				obj.mesh.position.copy(obj.body.position as unknown as THREE.Vector3);
				obj.mesh.quaternion.copy(obj.body.quaternion as unknown as THREE.Quaternion);

				const speed = obj.body.velocity.length();
				const angularSpeed = obj.body.angularVelocity.length();

				if (speed < 1.5 && angularSpeed < 3.0 && obj.mesh.position.y < 2.5) {
					this._applyCheatForce(obj);
				}
			}
		});

		// Arrangement Animation
		if (this.isArranged) {
			const elapsed = performance.now() - this.arrangementStartTime;
			const alpha = Math.min(1, elapsed / this.arrangementDuration);

			this.diceObjects.forEach((obj) => {
				// 插值计算
				obj.mesh.position.lerpVectors(obj.initialPosition, obj.finalPosition, alpha);
				obj.mesh.quaternion.slerpQuaternions(obj.initialQuaternion, obj.finalQuaternion, alpha);

				// 同步回物理刚体 (Kinematic)
				obj.body.position.copy(obj.mesh.position as unknown as CANNON.Vec3);
				obj.body.quaternion.copy(obj.mesh.quaternion as unknown as CANNON.Quaternion);
			});

			this._calculateArrangedFocus();
		} else {
			this._calculateActionFocus();
		}

		// 相机平滑过渡
		this.camera.position.lerp(this.targetCameraPos, 0.05);
		this.currentLookAt.lerp(this.targetLookAt, 0.05);
		this.camera.lookAt(this.currentLookAt);
	}

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
		const up = new THREE.Vector3(0, 1, 0);

		this.diceObjects.forEach((obj, i) => {
			// 切换为 KINEMATIC
			obj.body.type = CANNON.Body.KINEMATIC;
			obj.body.velocity.set(0, 0, 0);
			obj.body.angularVelocity.set(0, 0, 0);

			// 记录起始
			obj.initialPosition.copy(obj.mesh.position);
			obj.initialQuaternion.copy(obj.mesh.quaternion);

			// 计算目标旋转
			const targetVec = this.faceVectors[obj.target];
			if (targetVec) {
				obj.finalQuaternion.setFromUnitVectors(targetVec, up);
			} else {
				obj.finalQuaternion.identity();
			}

			// 计算目标位置
			const finalX = startX + i * spacing;
			obj.finalPosition.set(finalX, diceHeight, 0);
		});
	}

	private _finalizeArrangement(): void {
		this.diceObjects.forEach((obj) => {
			obj.body.type = CANNON.Body.STATIC;
			// 强制设为最终状态，消除插值误差
			obj.mesh.position.copy(obj.finalPosition);
			obj.mesh.quaternion.copy(obj.finalQuaternion);

			obj.body.position.set(obj.finalPosition.x, obj.finalPosition.y, obj.finalPosition.z);
			obj.body.quaternion.set(
				obj.finalQuaternion.x,
				obj.finalQuaternion.y,
				obj.finalQuaternion.z,
				obj.finalQuaternion.w
			);
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
		const targetVec = this.faceVectors[diceObj.target];
		if (!targetVec) return;

		// Cannon Quaternion -> Three Quaternion 转换
		const q = diceObj.body.quaternion;
		const bodyQuat = new THREE.Quaternion(q.x, q.y, q.z, q.w);

		const currentDir = targetVec.clone().applyQuaternion(bodyQuat);
		const up = new THREE.Vector3(0, 1, 0);
		const angle = currentDir.angleTo(up);

		if (angle < 0.1) {
			diceObj.body.angularVelocity.scale(0.9, diceObj.body.angularVelocity);
			diceObj.body.velocity.scale(0.9, diceObj.body.velocity);
			return;
		}

		const axis = new THREE.Vector3().crossVectors(currentDir, up).normalize();
		const strength = 30 * angle;

		diceObj.body.angularVelocity.x += axis.x * strength * 0.05;
		diceObj.body.angularVelocity.y += axis.y * strength * 0.05;
		diceObj.body.angularVelocity.z += axis.z * strength * 0.05;
	}

	public dispose(): void {
		this.diceObjects.forEach((obj) => {
			this.scene.remove(obj.mesh);

			// 几何体
			const mesh = obj.mesh as THREE.Mesh;
			if (mesh.geometry) mesh.geometry.dispose();

			// 材质
			if (mesh.material) {
				if (Array.isArray(mesh.material)) {
					mesh.material.forEach((m) => m.dispose());
				} else {
					(mesh.material as THREE.Material).dispose();
				}
			}

			this.world.removeBody(obj.body);
		});
		this.diceObjects = [];

		// 清理场景中其他物体
		this.scene.traverse((object) => {
			if ((object as THREE.Mesh).isMesh) {
				const mesh = object as THREE.Mesh;
				if (mesh.geometry) mesh.geometry.dispose();
				if (mesh.material) {
					if (Array.isArray(mesh.material)) {
						mesh.material.forEach((m) => m.dispose());
					} else {
						(mesh.material as THREE.Material).dispose();
					}
				}
			}
		});

		this.scene.clear();
	}
}
