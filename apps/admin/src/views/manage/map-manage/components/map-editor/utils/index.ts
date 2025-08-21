import { MapItem } from "@/interfaces/interfaces";
import * as THREE from "three";

export function createLineWithArrow(
	startPoint: THREE.Vector3,
	endPoint: THREE.Vector3,
	lineWidth: number,
	arrowWidth: number,
	arrowLength: number,
	color: THREE.Color
) {
	const direction = new THREE.Vector3().subVectors(endPoint, startPoint);
  const distance = direction.length();
  const arrowHeadLength = arrowLength;
  const arrowHeadWidth = arrowWidth;

  // Create the cone geometry for the arrowhead
  const coneGeometry = new THREE.ConeGeometry(arrowHeadWidth, arrowHeadLength, 32);
  const coneMaterial = new THREE.MeshBasicMaterial({ color });
  const coneMesh = new THREE.Mesh(coneGeometry, coneMaterial);

  // Position the cone at the end point
  coneMesh.position.copy(endPoint);

  // Rotate the cone to align with the direction vector
  coneMesh.lookAt(startPoint);

  // Create the cylinder geometry for the arrow body
  const cylinderGeometry = new THREE.CylinderGeometry(lineWidth / 2, lineWidth / 2, distance - arrowHeadLength, 32);
  const cylinderMaterial = new THREE.MeshBasicMaterial({ color });
  const cylinderMesh = new THREE.Mesh(cylinderGeometry, cylinderMaterial);

  // Position the cylinder at the start point
  cylinderMesh.position.copy(startPoint);

  // Rotate the cylinder to align with the direction vector
  cylinderMesh.lookAt(endPoint);

  // Create a group to hold the cone and cylinder
  const arrowGroup = new THREE.Group();
  arrowGroup.add(coneMesh);
  arrowGroup.add(cylinderMesh);

  return arrowGroup;
}

export function applyOpacityToObject(object: THREE.Object3D, opacity: number): void {
	// 检查是否为Mesh对象，因为只有Mesh对象才能应用材质
	if (object instanceof THREE.Mesh) {
		// 创建透明材质
		const transparentMaterial = new THREE.MeshPhongMaterial({
			color: object.material.color,
			transparent: true,
			opacity: opacity,
		});

		// 将透明材质应用到Object3D对象
		object.material = transparentMaterial;
	}
}

export function isMapItemBeLinked(mapItems: MapItem[], mapItem: MapItem) {
	const id = mapItem.id;
	return mapItems.some((item) => item.linkto && item.linkto.id === id);
}
