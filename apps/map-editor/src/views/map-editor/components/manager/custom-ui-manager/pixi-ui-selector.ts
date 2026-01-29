import { CustomUI } from "@mine-monopoly/types";
import * as PIXI from "pixi.js";

export interface UIEditorOptions {
	rows: number;
	cols: number;
	container: HTMLElement;
	gridSize?: number; // 可选，不传会自动计算
	onCreate?: (layout: { x: number; y: number; width: number; height: number }) => void;
	onSelect?: (ui: CustomUI) => void;
}

export class PixiUISelector {
	app: PIXI.Application;
	grid: PIXI.Graphics = new PIXI.Graphics();
	uiLayer: PIXI.Container = new PIXI.Container(); // 存放已有的 UI 方块
	selectBox: PIXI.Graphics = new PIXI.Graphics(); // 存放拖拽时的选框

	customUIs: CustomUI[] = [];
	options: Required<UIEditorOptions>;

	private startCellX = 0;
	private startCellY = 0;
	private curCellX = 0;
	private curCellY = 0;
	private isSelecting = false;

	constructor(options: UIEditorOptions) {
		this.app = new PIXI.Application();
		this.options = {
			onCreate: options.onCreate ?? (() => {}),
			onSelect: options.onSelect ?? (() => {}),
			gridSize: options.gridSize || 0,
			...options,
		} as Required<UIEditorOptions>;

		// 可以在这里先不 init，由外部调用或者在 mount 时调用
		// 为了简单，我们还是显式调用 init 方法
	}

	async init() {
		this.calcGridSize();

		const { rows, cols, gridSize } = this.options;
		const width = cols * gridSize;
		const height = rows * gridSize;

		// 如果计算出的宽高有问题，给予默认值防止报错
		if (width <= 0 || height <= 0) {
			console.warn("[PixiUISelector] Container size is too small, initialization skipped.");
			return;
		}

		await this.app.init({
			resizeTo: this.options.container, // 跟随容器大小
			background: "#1e1e1e",
			antialias: true,
			width,
			height,
		});

		this.options.container.appendChild(this.app.canvas);
		this.app.canvas.style.display = "block";

		// 添加图层顺序：网格底层 -> UI层 -> 拖拽选框顶层
		this.app.stage.addChild(this.grid, this.uiLayer, this.selectBox);

		this.drawGrid();
		this.initInteraction();

		// 监听 resize
		this.app.renderer.on("resize", () => {
			this.calcGridSize();
			this.drawGrid();
			this.renderExistingUIs(this.customUIs); // resize 后重新渲染 UI 以匹配新 grid
		});
	}

	/** 自动计算网格尺寸 */
	private calcGridSize() {
		const { container, cols, rows } = this.options;
		// 留一点 padding
		const clientW = container.clientWidth - 20;
		const clientH = container.clientHeight - 20;

		if (clientW <= 0 || clientH <= 0) return;

		const gridW = clientW / cols;
		const gridH = clientH / rows;
		// 取最小值保证网格是正方形且能完全放入容器
		this.options.gridSize = Math.floor(Math.min(gridW, gridH));
	}

	/** 绘制网格背景并居中 */
	private drawGrid() {
		const g = this.grid;
		g.clear();

		const { gridSize, cols, rows } = this.options;
		if (gridSize <= 0) return;

		const width = cols * gridSize;
		const height = rows * gridSize;
		const lineWidth = 1;
		const offset = lineWidth / 2;

		g.setStrokeStyle({ width: 1, color: 0x444444, alpha: 0.5 });

		// 垂直线
		for (let x = 0; x <= width; x += gridSize) {
			g.moveTo(x + offset, 0).lineTo(x + offset, height);
		}
		// 水平线
		for (let y = 0; y <= height; y += gridSize) {
			g.moveTo(0, y + offset).lineTo(width, y + offset);
		}
		g.stroke();

		// 居中逻辑
		const renderer = this.app.renderer;
		const cx = (renderer.width - width) / 2;
		const cy = (renderer.height - height) / 2;

		// 设置所有图层的容器位置，实现整体居中
		g.position.set(cx, cy);
		this.uiLayer.position.set(cx, cy);
		this.selectBox.position.set(cx, cy);
	}

	/** 渲染已有 UI 方块 */
	public renderExistingUIs(customUIs: CustomUI[]) {
		this.customUIs = customUIs || [];
		this.uiLayer.removeChildren(); // 清空旧的渲染

		const { gridSize } = this.options;
		if (gridSize <= 0) return;

		for (const ui of this.customUIs) {
			const { x, y, width, height } = ui.layout;

			// 创建一个容器代表这个 UI 组件
			const container = new PIXI.Container();

			// 1. 绘制方块
			const box = new PIXI.Graphics();
			box.rect(0, 0, width * gridSize, height * gridSize);
			box.fill({ color: 0x3399ff, alpha: 0.5 });
			box.stroke({ color: 0x3399ff, width: 2 }); // 加粗边框使其更明显
			container.addChild(box);

			// 2. 绘制文字标签
			const label = new PIXI.Text({
				text: ui.name || "未命名",
				style: {
					fill: "#ffffff",
					fontSize: Math.max(12, gridSize * 0.4), // 根据格子大小自适应字体
					fontFamily: "Arial",
					fontWeight: "bold",
					stroke: { color: "#000000", width: 2 }, // 描边防止背景色干扰
				},
			});
			label.x = 5;
			label.y = 5;

			// 裁剪文字防止溢出 (简单处理：如果太长就不显示或截断，这里暂不处理)
			container.addChild(label);

			// 设置容器位置
			container.x = x * gridSize;
			container.y = y * gridSize;

			// 3. 交互逻辑
			container.eventMode = "static";
			container.cursor = "pointer";

			// 悬停效果
			container.on("pointerover", () => {
				box.tint = 0x66aaff;
			});
			container.on("pointerout", () => {
				box.tint = 0xffffff;
			});

			// 点击事件：选中编辑
			container.on("pointertap", (e) => {
				// 阻止事件冒泡，防止触发 Stage 的创建逻辑
				e.stopPropagation();
				console.log("UI Selected:", ui.name);
				this.options.onSelect(ui);
			});

			this.uiLayer.addChild(container);
		}
	}

	/** 交互逻辑（拖拽创建） */
	private initInteraction() {
		const stage = this.app.stage;
		stage.eventMode = "static";
		stage.hitArea = this.app.screen; // 确保整个画布都能响应

		stage.on("pointerdown", (e) => {
			// 仅左键 (0) 允许创建
			if (e.button !== 0) return;

			const local = this.toLocal(e.global);
			if (!this.isInGrid(local.x, local.y)) return;

			const cell = this.posToCell(local.x, local.y);

			// 检查点击位置是否已经有 UI 了（防止重叠创建）
			// 注意：上面的 uiLayer 点击事件使用了 stopPropagation，
			// 所以理论上如果点在 UI 上，这里不会触发。但为了双重保险：
			const hitBlock = this.customUIs.some((ui) => {
				return (
					cell.x >= ui.layout.x &&
					cell.x < ui.layout.x + ui.layout.width &&
					cell.y >= ui.layout.y &&
					cell.y < ui.layout.y + ui.layout.height
				);
			});
			if (hitBlock) return;

			this.isSelecting = true;
			this.startCellX = cell.x;
			this.startCellY = cell.y;
			this.curCellX = cell.x;
			this.curCellY = cell.y;

			this.updateSelectBox();
		});

		stage.on("pointermove", (e) => {
			if (!this.isSelecting) return;

			// 右键 (buttons=2 或 3) 取消
			if (e.buttons === 2 || e.buttons === 3) {
				this.cancelSelection();
				return;
			}

			const local = this.toLocal(e.global);
			// 允许拖出边界一点点，按边界算
			const cell = this.posToCell(local.x, local.y);

			if (cell.x === this.curCellX && cell.y === this.curCellY) return;
			this.curCellX = cell.x;
			this.curCellY = cell.y;

			this.updateSelectBox();
		});

		stage.on("pointerup", () => {
			if (!this.isSelecting) return;
			this.isSelecting = false;
			this.selectBox.clear();
			this.selectBox.removeChildren();

			const { minX, minY, w, h } = this.getSelectionRect();
			// 只有宽高大于0才创建
			if (w > 0 && h > 0) {
				this.options.onCreate({
					x: minX,
					y: minY,
					width: w,
					height: h,
				});
			}
		});

		// 阻止右键菜单
		this.options.container.addEventListener("contextmenu", (e) => e.preventDefault());
	}

	private updateSelectBox() {
		const { gridSize } = this.options;
		const { minX, minY, w, h } = this.getSelectionRect();

		const s = this.selectBox;
		s.clear();
		s.removeChildren(); // 清除之前的文字

		s.rect(minX * gridSize, minY * gridSize, w * gridSize, h * gridSize);
		s.fill({ color: 0xffffff, alpha: 0.2 });
		s.stroke({ color: 0xffff00, width: 2 });

		// 显示尺寸文字
		const label = new PIXI.Text({
			text: `${w} × ${h}`,
			style: { fill: "#ffff00", fontSize: 16, fontWeight: "bold", stroke: { color: "#000", width: 3 } },
		});
		label.x = minX * gridSize + (w * gridSize) / 2 - label.width / 2;
		label.y = minY * gridSize + (h * gridSize) / 2 - label.height / 2;
		s.addChild(label);
	}

	private getSelectionRect() {
		const minX = Math.min(this.startCellX, this.curCellX);
		const maxX = Math.max(this.startCellX, this.curCellX);
		const minY = Math.min(this.startCellY, this.curCellY);
		const maxY = Math.max(this.startCellY, this.curCellY);
		return { minX, minY, w: maxX - minX + 1, h: maxY - minY + 1 };
	}

	private cancelSelection() {
		this.isSelecting = false;
		this.selectBox.clear();
		this.selectBox.removeChildren();
	}

	private toLocal(global: PIXI.PointData) {
		// 将全局坐标转换为相对于 Grid 的坐标
		return {
			x: global.x - this.grid.x,
			y: global.y - this.grid.y,
		};
	}

	private posToCell(x: number, y: number) {
		const { gridSize, cols, rows } = this.options;
		const cx = Math.floor(x / gridSize);
		const cy = Math.floor(y / gridSize);
		return {
			x: Math.max(0, Math.min(cols - 1, cx)),
			y: Math.max(0, Math.min(rows - 1, cy)),
		};
	}

	private isInGrid(x: number, y: number) {
		const totalW = this.options.cols * this.options.gridSize;
		const totalH = this.options.rows * this.options.gridSize;
		// 稍微放宽判定，或者严格判定
		return x >= 0 && y >= 0 && x < totalW && y < totalH;
	}

	destroy() {
		this.app.destroy(true, { children: true });
	}
}
