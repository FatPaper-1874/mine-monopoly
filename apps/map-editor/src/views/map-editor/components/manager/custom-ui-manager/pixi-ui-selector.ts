import { CustomUI } from "@fatpaper-monopoly/types";
import * as PIXI from "pixi.js";

export interface UIEditorOptions {
	rows: number;
	cols: number;
	container: HTMLElement;
	gridSize?: number;
	onCreate?: (layout: { x: number; y: number; width: number; height: number }) => void;
	onSelect?: (ui: CustomUI) => void;
}

export class PixiUISelector {
	app: PIXI.Application = new PIXI.Application();
	grid: PIXI.Graphics = new PIXI.Graphics();
	uiLayer: PIXI.Container = new PIXI.Container();
	selectBox: PIXI.Graphics = new PIXI.Graphics();
	customUIs: CustomUI[] = [];
	options: Required<UIEditorOptions>;
	private startCellX = 0;
	private startCellY = 0;
	private curCellX = 0;
	private curCellY = 0;
	private isSelecting = false;

	constructor(options: UIEditorOptions) {
		this.options = {
			onCreate: options.onCreate ?? (() => {}),
			onSelect: options.onSelect ?? (() => {}),
			...options,
		} as Required<UIEditorOptions>;

		this.calcGridSize();
		this.init();
	}

	/** 自动计算网格尺寸 */
	private calcGridSize() {
		const { container, cols, rows } = this.options;
		const clientW = container.clientWidth - 30;
		const clientH = container.clientHeight - 30;
		const gridW = clientW / cols;
		const gridH = clientH / rows;
		this.options.gridSize = Math.floor(Math.min(gridW, gridH));
	}

	async init() {
		const { rows, cols, gridSize } = this.options;
		const width = cols * gridSize;
		const height = rows * gridSize;

		await this.app.init({
			resizeTo: this.options.container,
			background: "#1e1e1e",
			antialias: true,
			width,
			height,
		});

		this.options.container.appendChild(this.app.canvas);
		this.app.canvas.style.display = "block";
		this.app.stage.addChild(this.grid, this.uiLayer, this.selectBox);

		this.drawGrid();
		this.initInteraction();

		this.app.renderer.on("resize", () => {
			this.calcGridSize();
			this.drawGrid();
		});
	}

	/** 绘制网格背景并居中 */
	private drawGrid() {
		const g = this.grid;
		g.clear();

		const { gridSize, cols, rows } = this.options;
		const width = cols * gridSize;
		const height = rows * gridSize;
		const lineWidth = 1;
		const offset = lineWidth / 2;

		g.setStrokeStyle({
			width: 2,
			color: 0x444444,
			alpha: 0.6,
		});

		for (let x = 0; x <= width; x += gridSize) {
			const px = Math.round(x + offset);
			g.moveTo(px, 0).lineTo(px, height);
		}
		for (let y = 0; y <= height; y += gridSize) {
			const py = Math.round(y + offset);
			g.moveTo(0, py).lineTo(width, py);
		}
		g.stroke();

		const renderer = this.app.renderer;
		const cx = (renderer.width - width) / 2;
		const cy = (renderer.height - height) / 2;
		g.position.set(cx, cy);
		this.uiLayer.position.set(cx, cy);
		this.selectBox.position.set(cx, cy);
	}

	/** 渲染已有 UI 方块 */
	public renderExistingUIs(customUIs: CustomUI[]) {
		this.uiLayer.removeChildren();
		this.customUIs = customUIs;
		const { gridSize } = this.options;

		for (const ui of customUIs) {
			const { x, y, width, height } = ui.layout;
			const box = new PIXI.Graphics();
			box.rect(x * gridSize, y * gridSize, width * gridSize, height * gridSize);
			box.fill({ color: 0x3399ff, alpha: 0.5 });
			box.stroke({ color: 0x3399ff, width: 1 });
			box.cursor = "pointer";

			const label = new PIXI.Text({
				text: ui.name,
				style: {
					fill: "#ffffff",
					fontSize: 14,
					fontFamily: "Arial",
				},
			});
			label.x = x * gridSize + 5;
			label.y = y * gridSize + 5;

			const container = new PIXI.Container();
			container.addChild(box, label);
			container.eventMode = "static";

			// ✅ 点击已有UI时触发 onSelect
			container.on("pointertap", (e) => {
				e.stopPropagation(); // 防止触发 stage 的 pointerdown
				this.options.onSelect(ui);
			});

			container.on("pointerover", () => {
				box.tint = 0x66aaff;
				this.app.canvas.style.cursor = "pointer";
			});

			container.on("pointerout", () => {
				box.tint = 0xffffff;
				this.app.canvas.style.cursor = "default";
			});

			this.uiLayer.addChild(container);
		}
	}

	/** 交互逻辑（左键拖拽创建，右键取消） */
	private initInteraction() {
		const stage = this.app.stage;
		stage.eventMode = "static";
		stage.hitArea = this.app.screen;

		const { gridSize, cols, rows } = this.options;

		const posToCell = (worldX: number, worldY: number) => {
			const cx = Math.floor(worldX / gridSize);
			const cy = Math.floor(worldY / gridSize);
			return {
				x: Math.max(0, Math.min(cols - 1, cx)),
				y: Math.max(0, Math.min(rows - 1, cy)),
			};
		};

		stage.on("pointerdown", (e) => {
			// 仅左键创建新UI
			if (e.button !== 0) return;

			const local = this.toLocal(e.global);
			if (!this.isInGrid(local.x, local.y)) return;

			const start = posToCell(local.x, local.y);

			const hitBlock = this.customUIs.some((ui) => {
				return (
					start.x >= ui.layout.x &&
					start.x < ui.layout.x + ui.layout.width &&
					start.y >= ui.layout.y &&
					start.y < ui.layout.y + ui.layout.height
				);
			});
			if (hitBlock) return; // 点击在已有 UI 块上，不创建新框

			this.isSelecting = true;
			this.startCellX = start.x;
			this.startCellY = start.y;
			this.curCellX = start.x;
			this.curCellY = start.y;

			this.drawSelectBox(this.startCellX * gridSize, this.startCellY * gridSize, gridSize, gridSize);
		});

		stage.on("pointermove", (e) => {
			// ✅ 拖拽中右键立即取消
			if (this.isSelecting && e.buttons === 3) {
				this.cancelSelection();
				return;
			}

			if (!this.isSelecting) return;

			const local = this.toLocal(e.global);
			if (!this.isInGrid(local.x, local.y)) return;

			const cur = posToCell(local.x, local.y);
			if (cur.x === this.curCellX && cur.y === this.curCellY) return;
			this.curCellX = cur.x;
			this.curCellY = cur.y;

			const minX = Math.min(this.startCellX, this.curCellX);
			const maxX = Math.max(this.startCellX, this.curCellX);
			const minY = Math.min(this.startCellY, this.curCellY);
			const maxY = Math.max(this.startCellY, this.curCellY);

			this.drawSelectBox(minX * gridSize, minY * gridSize, (maxX - minX + 1) * gridSize, (maxY - minY + 1) * gridSize);
		});

		stage.on("pointerup", () => {
			if (!this.isSelecting) return;
			this.isSelecting = false;

			const minX = Math.min(this.startCellX, this.curCellX);
			const maxX = Math.max(this.startCellX, this.curCellX);
			const minY = Math.min(this.startCellY, this.curCellY);
			const maxY = Math.max(this.startCellY, this.curCellY);

			this.options.onCreate({
				x: minX,
				y: minY,
				width: maxX - minX + 1,
				height: maxY - minY + 1,
			});

			this.selectBox.removeChildren();
			this.selectBox.clear();
		});

		this.options.container.addEventListener("contextmenu", (e) => e.preventDefault());
	}

	private cancelSelection() {
		this.isSelecting = false;
		this.selectBox.removeChildren();
		this.selectBox.clear();
	}

	private toLocal(global: PIXI.PointData) {
		return {
			x: global.x - this.grid.x,
			y: global.y - this.grid.y,
		};
	}

	private isInGrid(x: number, y: number) {
		const totalW = this.options.cols * this.options.gridSize;
		const totalH = this.options.rows * this.options.gridSize;
		return x >= 0 && y >= 0 && x < totalW && y < totalH;
	}

	private drawSelectBox(x: number, y: number, w: number, h: number) {
		const s = this.selectBox;
		s.clear();

		s.rect(x, y, w, h);
		s.fill({ color: 0xffffff, alpha: 0.12 });
		s.stroke({ color: 0xffff00, width: 2 });

		const oldLabel = s.getChildByLabel("selectLabel") as PIXI.Text | undefined;
		if (oldLabel) s.removeChild(oldLabel);

		const { gridSize } = this.options;
		const cols = Math.round(w / gridSize);
		const rows = Math.round(h / gridSize);

		const label = new PIXI.Text({
			text: `${cols} × ${rows}\n松开以创建自定义UI(右键取消)`,
			style: {
				fill: "#ffffff",
				fontSize: 15,
				fontWeight: "bold",
				align: "center",
			},
		});
		label.label = "selectLabel";
		label.x = x + w / 2 - label.width / 2;
		label.y = y + h / 2 - label.height / 2;

		s.addChild(label);
	}

	destroy() {
		this.app.destroy(true);
	}
}
