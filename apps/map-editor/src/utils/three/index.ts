import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { getDracoLoader } from "./draco";
import { useResourceStore } from "@src/stores";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";

export async function getModelById(id: string): Promise<GLTF> {
	const loader = new GLTFLoader();
	const modelInfo = useResourceStore().findModelById(id);
	if (!modelInfo) throw Error(`找不到id为 ${id} 的模型资源`);
	loader.setDRACOLoader(getDracoLoader());
	const bufferData = await window.electronAPI.readFile(modelInfo.url);
	if (!bufferData) throw new Error("获取模型文件失败");
	const arrayBuffer = bufferData.buffer.slice(
		bufferData.byteOffset,
		bufferData.byteOffset + bufferData.byteLength
	) as ArrayBuffer;
	const gltf = await loader.parseAsync(arrayBuffer, "");
	return gltf;
}

export async function getImageById(id: string): Promise<Buffer> {
	const imageInfo = useResourceStore().findImageById(id);
	if (!imageInfo) throw Error(`找不到id为 ${id} 的图片资源`);
	const bufferData = await window.electronAPI.readFile(imageInfo.url);
	return bufferData;
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

interface DynamicLineOptions {
	color?: THREE.ColorRepresentation; // 支持 Color, string, number
	lineWidth?: number;
	dashed?: boolean;
	dashSize?: number;
	gapSize?: number;
}

export interface DynamicLine {
	line: THREE.Line;
	update: (startPoint: THREE.Vector3, endPoint: THREE.Vector3) => void;
	setColor: (color: THREE.ColorRepresentation) => void;
	dispose: () => void;
}

/**
 * 创建动态标线（支持直线、虚线、动态更新）
 * @param startPoint 起点坐标
 * @param endPoint 终点坐标
 * @param options 配置项
 * @returns 包含标线对象和控制方法的接口
 */
export function createDynamicLine(
	startPoint: THREE.Vector3,
	endPoint: THREE.Vector3,
	options: DynamicLineOptions = {}
): DynamicLine {
	const { color = 0xff0000, lineWidth = 1, dashed = false, dashSize = 0.5, gapSize = 0.2 } = options;

	// 初始化几何体
	const geometry = new THREE.BufferGeometry();
	const positions = new Float32Array(6); // 2 points × 3 (x,y,z)
	updateGeometry(startPoint, endPoint);

	// 材质选择（虚线/实线）
	const material = dashed
		? new THREE.LineDashedMaterial({
				color: new THREE.Color(color),
				linewidth: lineWidth,
				dashSize,
				gapSize,
		  })
		: new THREE.LineBasicMaterial({
				color: new THREE.Color(color),
				linewidth: lineWidth,
		  });

	// 创建线对象
	const line = new THREE.Line(geometry, material);
	if (dashed) line.computeLineDistances();

	// 更新几何体数据
	function updateGeometry(newStart: THREE.Vector3, newEnd: THREE.Vector3) {
		positions[0] = newStart.x;
		positions[1] = newStart.y;
		positions[2] = newStart.z;
		positions[3] = newEnd.x;
		positions[4] = newEnd.y;
		positions[5] = newEnd.z;
		geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
		geometry.attributes.position.needsUpdate = true;
	}

	return {
		line,
		update: (newStart: THREE.Vector3, newEnd: THREE.Vector3) => {
			updateGeometry(newStart, newEnd);
			if (dashed) line.computeLineDistances();
		},
		setColor: (newColor: THREE.ColorRepresentation) => {
			material.color.set(newColor);
		},
		dispose: () => {
			geometry.dispose();
			material.dispose();
			if (line.parent) line.parent.remove(line);
		},
	};
}

interface MultiLineOptions {
	color?: THREE.ColorRepresentation; // 支持 hex, string, THREE.Color
	width?: number; // 线宽（像素，不受抗锯齿影响）
	dashed?: boolean; // 是否虚线
	dashScale?: number; // 虚线缩放比例
	dashSize?: number; // 虚线片段长度
	gapSize?: number; // 虚线间隔长度
	opacity?: number; // 透明度（0-1）
}

/**
 * 创建支持粗细调整的多段线段（高性能）
 * @param points 顶点数组（至少2个点）
 * @param options 配置项
 * @returns Line2 对象（需在渲染循环中调用 `line.computeLineDistances()` 如果虚线）
 */
export function createMultiLine(points: THREE.Vector3[], options: MultiLineOptions = {}): Line2 {
	const {
		color = 0x00ff00,
		width = 0.05,
		dashed = false,
		dashScale = 1,
		dashSize = 0.3,
		gapSize = 0.2,
		opacity = 1,
	} = options;

	// 校验输入
	if (points.length < 2) {
		throw new Error("At least 2 points are required to create a line");
	}

	// 1. 创建几何体
	const geometry = new LineGeometry();
	const positions = points.flatMap((p) => [p.x, p.y, p.z]);
	geometry.setPositions(positions);

	// 2. 创建材质（支持宽度和虚线）
	const material = new LineMaterial({
		color: new THREE.Color(color).getHex(),
		linewidth: width,
		dashed,
		dashScale,
		dashSize,
		gapSize,
		transparent: opacity < 1,
		opacity,
		worldUnits: true, // 宽度以像素为单位
		depthTest: false,
		depthWrite: false,
	});

	// 3. 创建线对象
	const line = new Line2(geometry, material);
	line.renderOrder = 999;
	if (dashed) line.computeLineDistances();

	return line;
}
