import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";
import { getModelByUrl } from "@src/utils/three";

export interface TransformState {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

export const DEFAULT_TRANSFORM: TransformState = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

/**
 * 加载模型 → 应用变换 → 导出为 GLB ArrayBuffer
 * 注意：有动画的模型不烘焙几何体变换，只保留根节点变换
 */
export async function bakeModelTransform(
  sourceUrl: string,
  transform: TransformState
): Promise<{ buffer: ArrayBuffer; fileType: "glb" }> {
  const gltf = await getModelByUrl(sourceUrl);
  const hasAnimations = gltf.animations && gltf.animations.length > 0;

  // 对于没有动画的模型，克隆场景并烘焙变换
  if (!hasAnimations) {
    const model = gltf.scene.clone(true);

    // 应用变换到根节点
    model.position.set(
      transform.position.x,
      transform.position.y,
      transform.position.z
    );
    model.rotation.set(
      THREE.MathUtils.degToRad(transform.rotation.x),
      THREE.MathUtils.degToRad(transform.rotation.y),
      THREE.MathUtils.degToRad(transform.rotation.z)
    );
    model.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
    model.updateMatrixWorld();

    // 烘焙几何体变换
    model.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        child.geometry = child.geometry.clone();
        child.geometry.applyMatrix4(child.matrixWorld);
        child.geometry.computeVertexNormals();
      }
    });

    model.traverse((child: THREE.Object3D) => {
      child.position.set(0, 0, 0);
      child.rotation.set(0, 0, 0);
      child.scale.set(1, 1, 1);
    });
    model.updateMatrixWorld(true);

    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      new GLTFExporter().parse(
        model,
        (result: unknown) => resolve(result as ArrayBuffer),
        (err: unknown) => reject(err),
        { binary: true }
      );
    });

    return { buffer, fileType: "glb" };
  }

  // 对于有动画的模型：直接使用原始 scene（不能 clone，否则 bone 引用会断）
  // 保存原始变换
  const originalPos = gltf.scene.position.clone();
  const originalRot = gltf.scene.rotation.clone();
  const originalScale = gltf.scene.scale.clone();

  // 应用变换到原始场景
  gltf.scene.position.set(
    transform.position.x,
    transform.position.y,
    transform.position.z
  );
  gltf.scene.rotation.set(
    THREE.MathUtils.degToRad(transform.rotation.x),
    THREE.MathUtils.degToRad(transform.rotation.y),
    THREE.MathUtils.degToRad(transform.rotation.z)
  );
  gltf.scene.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
  gltf.scene.updateMatrixWorld();

  try {
    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      new GLTFExporter().parse(
        gltf.scene,
        (result: unknown) => resolve(result as ArrayBuffer),
        (err: unknown) => reject(err),
        { binary: true, animations: gltf.animations }
      );
    });

    return { buffer, fileType: "glb" };
  } finally {
    // 恢复原始变换
    gltf.scene.position.copy(originalPos);
    gltf.scene.rotation.copy(originalRot);
    gltf.scene.scale.copy(originalScale);
    gltf.scene.updateMatrixWorld();
  }
}
