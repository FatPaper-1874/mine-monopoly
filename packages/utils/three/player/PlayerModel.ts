import * as THREE from "three";
import { GIFTexture } from "./libs/three-gif-texture";

export class PlayerModel {
  public model: THREE.Group = new THREE.Group();
  private bodyMesh: THREE.Object3D | undefined;

  constructor() {}

  public async load(url: string, fileType: string) {
    this.model = await loadRoleModel(url, fileType);
    this.bodyMesh = this.model.getObjectByName("RoleBody");
    return this.model;
  }

  public update(camera: THREE.Camera) {
    if (!this.bodyMesh) return;

    const targetPos = new THREE.Vector3();
    camera.getWorldPosition(targetPos);
    this.bodyMesh.lookAt(targetPos);
  }
}

async function loadRoleModel(url: string, fileType: string): Promise<THREE.Group> {
  let texture: THREE.Texture;
  if (fileType.includes("gif")) {
    texture = await new Promise((resolve) => {
      new GIFTexture(url, "autoDraw", (map: THREE.Texture) => resolve(map));
    });
    texture.repeat.set(1, 1);
  } else {
    const textureLoader = new THREE.TextureLoader();
    texture = await textureLoader.loadAsync(url);
    texture.repeat.set(1, 1);
  }
  texture.colorSpace = THREE.SRGBColorSpace;

  const group = new THREE.Group();

  // --- 1. 角色主体 ---
  const planeMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    alphaTest: 0.5,
  });
  const planeGeometry = new THREE.PlaneGeometry(1, 1);
  const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
  
  planeMesh.name = "RoleBody"; // <--- 关键：命名
  planeMesh.position.y = 0.5;
  
  group.add(planeMesh);

  // --- 2. 阴影 (使用纯代码生成的圆) ---
  const shadowGeometry = new THREE.CircleGeometry(0.35, 32);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false, 
  });
  
  const shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
  shadowMesh.name = "Shadow";
  shadowMesh.rotation.x = -Math.PI / 2; 
  shadowMesh.position.y = 0.02; 
  
  group.add(shadowMesh);

  // --- 3. 缩放逻辑 ---
  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxSide = Math.max(size.x, size.y, size.z);
  const scale = 1 / maxSide;
  group.scale.set(scale, scale, scale);

  // --- 4. 居中逻辑 ---
  const center = new THREE.Vector3();
  box.getCenter(center).multiplyScalar(scale);
  group.position.x = -center.x;
  group.position.z = -center.z;
  // 保持 Y = 0 不动

  return group;
}