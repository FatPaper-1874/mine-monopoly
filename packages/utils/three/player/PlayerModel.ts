import * as THREE from "three";
import { GIFTexture } from "./libs/three-gif-texture";

export class PlayerModel {
	public model: THREE.Group = new THREE.Group();

	constructor() {}

	public async load(url: string, fileType: string) {
		this.model = await loadRoleModel(url, fileType);
		return this.model;
	}
}

async function loadRoleModel(url: string, fileType: string): Promise<THREE.Group> {
	let texture: THREE.Texture;

	if (fileType.includes("gif")) {
		// GIF 用 GIFTexture
		texture = await new Promise((resolve, reject) => {
			new GIFTexture(url, "autoDraw", (map: THREE.Texture) => resolve(map));
		});
		texture.repeat.set(1, 1);
	} else {
		// 普通图片用 TextureLoader
		const textureLoader = new THREE.TextureLoader();
		texture = await textureLoader.loadAsync(url);
		texture.repeat.set(1, 1);
	}
	texture.colorSpace = THREE.SRGBColorSpace;

	// 创建一个基础材质
	const planeMaterial = new THREE.MeshBasicMaterial({
		map: texture,
		transparent: true,
		side: THREE.DoubleSide,
		alphaTest: 0.5,
	});
	const planeGeometry = new THREE.PlaneGeometry(1, 1);
	const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
	planeMesh.position.y = 0.5;
	const group = new THREE.Group();
	group.add(planeMesh);

	// 缩放到单位大小
	const box = new THREE.Box3().setFromObject(group);
	const size = new THREE.Vector3();
	box.getSize(size);
	const maxSide = Math.max(size.x, size.y, size.z);
	const scale = 1 / maxSide;
	group.scale.set(scale, scale, scale);

	// 把几何移到原点
	const center = new THREE.Vector3();
	box.getCenter(center).multiplyScalar(scale);
	group.position.sub(center);

	return group;
}
