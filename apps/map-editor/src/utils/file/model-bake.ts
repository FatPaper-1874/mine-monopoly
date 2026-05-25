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
 * 加载模型 → 应用变换矩阵到 geometry → 导出为 GLB ArrayBuffer
 */
export async function bakeModelTransform(
  sourceUrl: string,
  transform: TransformState
): Promise<{ buffer: ArrayBuffer; fileType: "glb" }> {
  const gltf = await getModelByUrl(sourceUrl);
  const model = gltf.scene.clone();

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

  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry = child.geometry.clone();
      child.geometry.applyMatrix4(child.matrixWorld);
      child.geometry.computeVertexNormals();
    }
  });

  model.traverse((child) => {
    child.position.set(0, 0, 0);
    child.rotation.set(0, 0, 0);
    child.scale.set(1, 1, 1);
  });
  model.updateMatrixWorld(true);

  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    new GLTFExporter().parse(
      model,
      (result) => resolve(result as ArrayBuffer),
      (err: unknown) => reject(err),
      { binary: true }
    );
  });

  return { buffer, fileType: "glb" };
}
