import { ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, Shape, TextureLoader, Vector2 } from "three";

export const loadImg2mesh = async (
	path: string,
	depth: number,
	borderWidth: number,
	borderColor: number = 0xffffff
): Promise<Group> => {
	const img = new Image() as HTMLImageElement;
	img.crossOrigin = "anonymous";
	img.src = path;
	const promise = new Promise<Group>((resolve, reject) => {
		img.onload = async () => {
			// 创建一个 Canvas 对象，绘制图片
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d")!;
			canvas.width = img.width;
			canvas.height = img.height;
			ctx.drawImage(img, 0, 0);

			// 获取 Canvas 上每个像素的 RGBA 值，判断该像素是否是透明的，如果不是透明的，将其坐标加入到一个数组中
			const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

			const nonTransparentPixels: { x: number; y: number }[] = [];

			for (let y = 0; y < canvas.height; y++) {
				for (let x = 0; x < canvas.width; x++) {
					const index = (y * canvas.width + x) * 4;
					const a = pixels[index + 3];
					if (pixels[index + 3] !== 0) {
						nonTransparentPixels.push({ x, y });
					}
				}
			}

			// 通过扫描线算法或者其他算法找出非透明像素的边界点
			const boundaryPixels: { x: number; y: number }[] = [];

			for (let i = 0; i < nonTransparentPixels.length; i++) {
				const pixel = nonTransparentPixels[i];
				const isBoundaryPixel =
					pixel.x === 0 ||
					pixel.y === 0 ||
					pixel.x === canvas.width - 1 ||
					pixel.y === canvas.height - 1 ||
					isPixelTransparent(pixel.x - 1, pixel.y) ||
					isPixelTransparent(pixel.x + 1, pixel.y) ||
					isPixelTransparent(pixel.x, pixel.y - 1) ||
					isPixelTransparent(pixel.x, pixel.y + 1);
				if (isBoundaryPixel) {
					boundaryPixels.push(pixel);
				}
			}

			// 判断像素是否透明的函数
			function isPixelTransparent(x: number, y: number): boolean {
				const index = (y * canvas.width + x) * 4 + 3;
				const a = pixels[index];
				return a === 0;
			}

			//获取最小值,紧贴坐标轴
			const minX = Math.min(...boundaryPixels.map((pixel) => pixel.x));
			const minY = Math.min(...boundaryPixels.map((pixel) => pixel.y));

			boundaryPixels.forEach((pixel) => {
				pixel.x -= minX;
				pixel.y -= minY;
			});

			//获取最大值使中点变成(0, 0), 并进行水平翻转
			const maxX = Math.max(...boundaryPixels.map((pixel) => pixel.x));
			const maxY = Math.max(...boundaryPixels.map((pixel) => pixel.y));

			boundaryPixels.forEach((pixel) => {
				pixel.x -= maxX / 2;
				pixel.y -= maxY / 2;
				pixel.x = -pixel.x;
				pixel.y = -pixel.y;
			});

			//调整缩放, 使整个模型变成单位1
			const maxX1 = Math.max(...boundaryPixels.map((pixel) => pixel.x));
			const maxY1 = Math.max(...boundaryPixels.map((pixel) => pixel.y));
			const scale = maxX1 > maxY1 ? maxX1 / (img.width / 2) : maxY1 / (img.height / 2);

			boundaryPixels.forEach((pixel) => {
				pixel.x /= scale;
				pixel.y /= scale;
			});

			const linePixels = connectVertices(boundaryPixels);

			const shape = new Shape(linePixels.map((pixel) => new Vector2(pixel.x / img.width, pixel.y / img.height)));
			shape.closePath();

			const extrudeSettings = {
				depth: depth, // 定义厚度
				bevelEnabled: false, // 禁用斜面，只生成直角
			};

			const geometry = new ExtrudeGeometry(shape, extrudeSettings);

			const textureLoader = new TextureLoader();
			const texture = await textureLoader.loadAsync(path);
			texture.repeat.set(-scale, scale);
			texture.offset.set(0.5, 0.5);

			// 创建一个基础材质
			const material = new MeshBasicMaterial({ map: texture });

			// 创建一个平面模型对象
			const mesh = new Mesh(geometry, material);
			mesh.rotateY(Math.PI);
			const edgeMesh = mesh.clone();
			mesh.scale.set(1 - borderWidth, 1 - borderWidth, 1);
			// polygonOffset: true, polygonOffsetFactor: 1.0, polygonOffsetUnits: 4.0 解决重叠模型贴图闪烁的问题
			edgeMesh.material = new MeshBasicMaterial({
				color: borderColor,
				polygonOffset: true,
				polygonOffsetFactor: 1.0,
				polygonOffsetUnits: 4.0,
			});

			const group = new Group();
			group.add(mesh);
			group.add(edgeMesh);

			resolve(group);
		};
	});

	return promise;
};

function connectVertices(vertices: { x: number; y: number }[]) {
	const orderedVertices = [];
	let currentVertex = vertices[0];

	while (vertices.length) {
		let closestIndex = 0;
		let closestDistance = Infinity;
		for (let i = 0; i < vertices.length; i++) {
			const distance = getDistance(currentVertex, vertices[i]);
			if (distance < closestDistance) {
				closestIndex = i;
				closestDistance = distance;
			}
		}
		orderedVertices.push(vertices[closestIndex]);
		vertices.splice(closestIndex, 1);
		currentVertex = orderedVertices[orderedVertices.length - 1];
	}

	return orderedVertices;
}

function getDistance(point1: { x: number; y: number }, point2: { x: number; y: number }) {
	const dx = point2.x - point1.x;
	const dy = point2.y - point1.y;
	return Math.sqrt(dx * dx + dy * dy);
}
