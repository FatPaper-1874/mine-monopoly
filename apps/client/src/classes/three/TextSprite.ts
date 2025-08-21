import { Texture, Sprite, SRGBColorSpace, SpriteMaterial, DoubleSide } from "three";

export class TextSprite {
	private canvas: HTMLCanvasElement;
	private context: CanvasRenderingContext2D;
	private texture: Texture;
	private sprite: Sprite;
	private fontSize: number;
	private color: string;
	private strokeWidth: number;
	private lineHight: number;

	constructor(text: string, fontSize: number, color: string, strokeWidth: number, lineHight: number) {
		this.fontSize = fontSize;
		this.color = color;
		this.strokeWidth = strokeWidth;
		this.lineHight = lineHight;

		// 创建画布
		this.canvas = document.createElement("canvas");
		const resolution = 10;
		this.canvas.width = fontSize * resolution;
		this.canvas.height = fontSize * resolution;

		this.context = this.canvas.getContext("2d") as CanvasRenderingContext2D;
		this.texture = new Texture(this.canvas);
		this.texture.needsUpdate = true;
		this.texture.colorSpace = SRGBColorSpace;

		// 创建材质和精灵
		const material = new SpriteMaterial({
			map: this.texture,
			depthWrite: false,
			transparent: true,
			side: DoubleSide,
		});
		this.sprite = new Sprite(material);

		// 初始化文字
		this.updateText(text);
	}

	// 更新文字的方法，支持换行
	public updateText(text: string, color = this.color) {
		const { context, canvas, fontSize, strokeWidth } = this;

		// 清空画布
		context.clearRect(0, 0, canvas.width, canvas.height);

		// 设置样式
		context.fillStyle = color;
		context.font = `bold ${fontSize}px ContentFont`;
		context.textBaseline = "middle";
		context.textAlign = "center";
		context.lineWidth = strokeWidth;
		context.strokeStyle = "#fff";

		// 处理换行
		const lines = text.split("\n");
		const lineHeight = this.lineHight; // 设置行高，可以调整
		const totalHeight = lineHeight * lines.length;
		const startY = -totalHeight / 2 + lineHeight / 2;

		context.save();
		context.translate(canvas.width / 2, canvas.height / 2);

		// 绘制每行文字
		lines.forEach((line, index) => {
			const y = startY + index * lineHeight;
			context.strokeText(line, 0, y);
			context.fillText(line, 0, y);
		});

		context.restore();

		// 更新纹理
		this.texture.needsUpdate = true;
	}

	// 获取精灵对象
	public getSprite() {
		return this.sprite;
	}
}
