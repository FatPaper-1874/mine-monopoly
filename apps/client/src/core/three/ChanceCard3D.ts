import * as THREE from "three";
import { ChanceCardTextureGenerator } from "./ChanceCardTextureGenerator";
import { ChanceCardInfo } from "@mine-monopoly/types";

/**
 * 3D机会卡类
 * 使用层级结构：Pivot（父容器，控制朝向）+ Mesh（子对象，控制3D翻转）
 */
export class ChanceCard3D {
	private pivot: THREE.Group; // 父容器：控制位置和朝向
	private mesh: THREE.Mesh | null = null; // 子对象：控制3D翻转
	private scene: THREE.Scene;
	private card: ChanceCardInfo;
	private iconUrl: string;
	private texture: THREE.CanvasTexture | null = null;

	constructor(
		card: ChanceCardInfo,
		iconUrl: string,
		scene: THREE.Scene
	) {
		this.card = card;
		this.iconUrl = iconUrl;
		this.scene = scene;

		// 创建父容器（用于控制位置和朝向）
		this.pivot = new THREE.Group();
		this.scene.add(this.pivot);
	}

	/**
	 * 创建3D卡片
	 */
	async createCard(): Promise<THREE.Mesh> {
		try {
			// 1. 生成纹理
			this.texture = await ChanceCardTextureGenerator.generateTexture(
				this.card,
				this.iconUrl
			);

			// ⭐ 设置纹理属性，确保正确显示
			this.texture.colorSpace = THREE.SRGBColorSpace;
			this.texture.minFilter = THREE.LinearFilter;
			this.texture.magFilter = THREE.LinearFilter;

			// ⭐ 关键修复：不设置texture.center，使用默认值(0, 0)
			// texture.center会改变纹理变换的参考点，但不会调整几何体的UV映射
			// 对于静态纹理，应该使用默认的center(0, 0)，而不是(0.5, 0.5)
			this.texture.repeat.set(1, 1);       // 不重复
			this.texture.offset.set(0, 0);       // 无偏移

			// 2. 创建几何体（保持与实际卡片相同的比例）
			// ⭐ 实际卡片尺寸是 11em × 14em，高度比例 = 14/11 ≈ 1.273
			const geometry = new THREE.PlaneGeometry(
				2,     // 宽度（从中心到两侧各1单位）
				2.545  // 高度（从中心到两侧各1.2725单位）
			);

			// 3. 创建材质
			const material = new THREE.MeshBasicMaterial({
				map: this.texture,
				transparent: true,
				side: THREE.DoubleSide,
				depthTest: false, // ⭐ 完全禁用深度测试，始终在最上层
				depthWrite: false, // ⭐ 不写入深度缓冲
				// ⭐ 使用 polygonOffset 确保在所有其他几何体前面渲染
				polygonOffset: true,
				polygonOffsetFactor: -4, // 负值表示更靠近相机
				polygonOffsetUnits: -4,
			});

			// 4. 创建Mesh（子对象，用于3D翻转）
			this.mesh = new THREE.Mesh(geometry, material);

			// ⭐ 设置最高的渲染顺序，确保始终在最上层
			this.mesh.renderOrder = 9999;
			this.pivot.renderOrder = 9999;

			// 5. 将Mesh添加到Pivot（形成层级结构）
			this.pivot.add(this.mesh);

			// ⭐ 关键修复：完全移除位置补偿，确保mesh在pivot中心
			this.mesh.position.set(0, 0, 0);

			// 6. 初始隐藏
			this.hide();

			return this.mesh;
		} catch (error) {
			console.error("[ChanceCard3D] 创建卡片失败:", error);
			throw error;
		}
	}

	/**
	 * 显示卡片
	 */
	show(): void {
		if (this.pivot) {
			this.pivot.visible = true;
			// ⭐ 确保在场景中最后渲染（移到场景图的最后）
			if (this.scene) {
				this.scene.remove(this.pivot);
				this.scene.add(this.pivot); // 重新添加到末尾
			}
		}
	}

	/**
	 * 隐藏卡片
	 */
	hide(): void {
		if (this.pivot) {
			this.pivot.visible = false;
		}
	}

	/**
	 * 获取位置（用于GSAP动画）
	 * 注意：返回的是Pivot的位置
	 */
	getPosition(): THREE.Vector3 {
		return this.pivot.position;
	}

	/**
	 * 获取缩放（用于GSAP动画）
	 * 注意：返回的是Mesh的缩放
	 */
	getScale(): THREE.Vector3 {
		return this.mesh ? this.mesh.scale : new THREE.Vector3(0, 0, 0);
	}

	/**
	 * 获取Mesh（用于3D翻转动画）
	 */
	getMesh(): THREE.Mesh | null {
		return this.mesh;
	}

	/**
	 * 获取Pivot（用于位置和朝向控制）
	 */
	getPivot(): THREE.Group {
		return this.pivot;
	}

	/**
	 * 设置朝向（面向指定方向）
	 */
	lookAt(target: THREE.Vector3): void {
		this.pivot.lookAt(target);
	}

	/**
	 * 设置位置
	 */
	setPosition(position: THREE.Vector3): void {
		this.pivot.position.copy(position);
	}

	/**
	 * 设置缩放
	 */
	setScale(scale: number | { x: number; y: number; z: number }): void {
		if (this.mesh) {
			if (typeof scale === "number") {
				this.mesh.scale.set(scale, scale, scale);
			} else {
				this.mesh.scale.set(scale.x, scale.y, scale.z);
			}
		}
	}

	/**
	 * 资源清理
	 */
	dispose(): void {
		// 1. 清理Mesh
		if (this.mesh) {
			if (this.mesh.geometry) {
				this.mesh.geometry.dispose();
			}
			if (Array.isArray(this.mesh.material)) {
				this.mesh.material.forEach((material) => material.dispose());
			} else {
				this.mesh.material.dispose();
			}

			// 从Pivot中移除Mesh
			this.pivot.remove(this.mesh);
			this.mesh = null;
		}

		// 2. 从场景中移除Pivot
		if (this.scene) {
			this.scene.remove(this.pivot);
		}

		// 注意：texture不在这里清理，因为它可能被其他卡片共享
		// 纹理由ChanceCardTextureGenerator统一管理
	}
}
