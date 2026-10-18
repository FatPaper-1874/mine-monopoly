import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

/** 视图模式：立体（默认）/ 俯视棋盘 */
export type ViewMode = "3d" | "top-down";

/** 棋盘在整数网格上的边界（含端点，单位：格） */
export type BoardBounds = {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
};

/** 俯视时棋盘最多占屏幕短边的比例，其余留作边距 */
const BOARD_MAX_SCREEN_COVERAGE = 0.8;
/** 俯视相机最低高度；实际高度随地图尺寸增长 */
const ORTHO_MIN_CAMERA_HEIGHT = 50;
/** 俯视相机高度 = 棋盘跨度 × 该系数（不低于最低高度） */
const ORTHO_HEIGHT_PER_BOARD_SPAN = 3;
/** 正交相机近/远裁剪面：近面固定，远面随相机高度延伸 */
const ORTHO_NEAR = 1;
const ORTHO_FAR_MARGIN = 100;
/** 俯视缩放范围（1×–6×） */
const TOP_DOWN_MIN_ZOOM = 1;
const TOP_DOWN_MAX_ZOOM = 6;
/** 俯视平移允许超出棋盘边缘的格数 */
const PAN_MARGIN = 1;
/** 整图视图下让棋盘离视口边缘留出的世界单位余量（抵消相机微小的极角偏移） */
const VIEW_EDGE_EPSILON = 0.001;
/** 3D 模式的 OrbitControls 约束，保持与改造前完全一致 */
const PERSPECTIVE_MIN_DISTANCE = 1;
const PERSPECTIVE_MAX_DISTANCE = 30;
const PERSPECTIVE_MIN_POLAR_ANGLE = Math.PI / 3;
const PERSPECTIVE_MAX_POLAR_ANGLE = Math.PI / 2;
const PERSPECTIVE_MOUSE_BUTTONS = {
	LEFT: THREE.MOUSE.ROTATE,
	MIDDLE: THREE.MOUSE.DOLLY,
	RIGHT: THREE.MOUSE.PAN,
};
const PERSPECTIVE_TOUCHES = {
	ONE: THREE.TOUCH.ROTATE,
	TWO: THREE.TOUCH.DOLLY_PAN,
};
/** 俯视模式只允许平移 + 缩放，不允许旋转 */
const TOP_DOWN_MOUSE_BUTTONS = {
	LEFT: THREE.MOUSE.PAN,
	MIDDLE: THREE.MOUSE.DOLLY,
	RIGHT: THREE.MOUSE.PAN,
};
const TOP_DOWN_TOUCHES = {
	ONE: THREE.TOUCH.PAN,
	TWO: THREE.TOUCH.DOLLY_PAN,
};

const DEFAULT_BOUNDS: BoardBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
const DEFAULT_FRUSTUM_HEIGHT = 10;

type CameraPose = {
	position: THREE.Vector3;
	target: THREE.Vector3;
};

/**
 * 双相机装置：同一套 3D 场景在透视相机（立体）与正交相机（俯视棋盘）之间切换。
 * 相机相关的 resize / 缩放约束 / 棋盘取景 / 平移边界都收敛在这里，
 * 渲染管线与选路控制器只需要在切换时重新绑定 `camera`。
 */
export class CameraRig {
	public readonly perspective: THREE.PerspectiveCamera;
	public readonly ortho: THREE.OrthographicCamera;
	public readonly controls: OrbitControls;

	public mode: ViewMode = "3d";

	/** 没有可恢复的 3D 位姿时（开局即俯视）由外部兜底聚焦 */
	public onNeedDefault3DView?: () => void;

	private bounds: BoardBounds = { ...DEFAULT_BOUNDS };
	private aspect: number;
	private savedPerspectivePose: CameraPose | null = null;
	/** 应用相机状态期间跳过平移边界夹取，避免与 fit/restore 相互覆盖 */
	private isApplyingState = false;
	private isDisposed = false;

	constructor(canvas: HTMLCanvasElement, aspect: number, initialMode: ViewMode = "3d") {
		this.aspect = aspect > 0 ? aspect : 1;

		this.perspective = new THREE.PerspectiveCamera(45, this.aspect, 0.1, 1000);

		// 近/远裁剪面在 applyOrthoFrustum 中按相机高度重新计算
		this.ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, ORTHO_NEAR, ORTHO_MIN_CAMERA_HEIGHT + ORTHO_FAR_MARGIN);
		this.orthoPosition();
		// 正上方俯视时默认 up=(0,1,0) 与视线平行会退化；改为 -Z 朝屏幕下方，
		// 与地图网格 / 迷你地图的朝向保持一致。
		this.ortho.up.set(0, 0, -1);
		this.ortho.zoom = 1;
		this.applyOrthoFrustum(DEFAULT_FRUSTUM_HEIGHT);
		this.ortho.updateProjectionMatrix();

		this.controls = new OrbitControls(this.perspective, canvas);
		this.controls.enableDamping = true;
		this.applyPerspectiveConstraints();
		this.controls.addEventListener("change", this.handleControlsChange);
		this.controls.update();

		// 持久化的设置可能让玩家一进游戏就是俯视；此时不记录 3D 位姿，
		// 由 GameRenderer 在初始化末尾兜底取景。
		if (initialMode === "top-down") {
			this.applyMode("top-down", false);
		}
	}

	/** 当前生效的相机（透视或正交） */
	public get camera(): THREE.Camera {
		return this.mode === "3d" ? this.perspective : this.ortho;
	}

	public get isTopDown(): boolean {
		return this.mode === "top-down";
	}

	/**
	 * 切换视图模式。
	 * @param rememberPose 进入俯视时是否记录当前 3D 位姿；加载期尚未聚焦时传 false，
	 * 切回 3D 会改为重新聚焦，避免恢复到原点附近的无效位姿。
	 */
	public setMode(mode: ViewMode, rememberPose = true): void {
		this.applyMode(mode, rememberPose);
	}

	public setBounds(bounds: BoardBounds): void {
		this.bounds = { ...bounds };
	}

	/** 让整张棋盘铺满视口（仅在当前为俯视时生效） */
	public fitToBoard(): void {
		if (!this.isTopDown) return;

		const centerX = (this.bounds.minX + this.bounds.maxX + 1) / 2;
		const centerZ = (this.bounds.minY + this.bounds.maxY + 1) / 2;

		this.whileApplyingState(() => {
			this.applyOrthoFrustum(this.getFittedFrustumHeight());
			this.ortho.zoom = 1;
			this.ortho.updateProjectionMatrix();
			this.orthoPosition(centerX, centerZ);
			this.controls.target.set(centerX, 0, centerZ);
			this.controls.update();
		});
	}

	/**
	 * 当前正交俯视下 1 个世界单位对应多少屏幕像素（CSS px，不含 devicePixelRatio）。
	 * 用于把 3D 文字标签校正到固定的屏幕字号。
	 */
	public getPixelsPerWorldUnit(viewportHeight: number): number {
		if (!this.isTopDown) return 0;
		const frustumHeight = this.ortho.top - this.ortho.bottom;
		if (frustumHeight <= 0) return 0;
		return (viewportHeight * this.ortho.zoom) / frustumHeight;
	}

	/** 俯视下只平移镜头（不改缩放、不旋转），用于“回归视角”等入口 */
	public recenterTo(worldX: number, worldZ: number): void {
		if (!this.isTopDown || this.isDisposed) return;

		const visible = this.getVisibleHalfSizes();
		const centerX = this.clampPanAxis(worldX, this.bounds.minX, this.bounds.maxX + 1, visible.x);
		const centerZ = this.clampPanAxis(worldZ, this.bounds.minY, this.bounds.maxY + 1, visible.z);

		this.whileApplyingState(() => {
			this.controls.target.set(centerX, 0, centerZ);
			this.orthoPosition(centerX, centerZ);
			this.ortho.lookAt(this.controls.target);
			this.controls.update();
		});
	}

	/** 窗口尺寸 / 画布尺寸变化：透视改 aspect，正交重算 frustum 宽度 */
	public handleResize(width: number, height: number): void {
		if (this.isDisposed) return;

		this.aspect = width / Math.max(1, height);
		this.perspective.aspect = this.aspect;
		this.perspective.updateProjectionMatrix();

		// 俯视下按新比例重新适配棋盘，保证整图不拉伸、不裁切；缩放与平移中心保持不变。
		const frustumHeight = this.isTopDown ? this.getFittedFrustumHeight() : this.ortho.top - this.ortho.bottom;
		if (frustumHeight > 0) {
			this.applyOrthoFrustum(frustumHeight);
		}
		this.ortho.updateProjectionMatrix();
	}

	public dispose(): void {
		if (this.isDisposed) return;
		this.isDisposed = true;
		this.controls.removeEventListener("change", this.handleControlsChange);
		this.controls.dispose();
	}

	private applyMode(mode: ViewMode, rememberPose: boolean): void {
		if (this.isDisposed || mode === this.mode) return;

		this.isApplyingState = true;
		this.controls.enabled = false;

		let restoredPerspectivePose = false;
		try {
			if (mode === "top-down") {
				// 位姿退化（加载期尚未聚焦 / 相机仍在原点）时不记录，切回 3D 时交给外部重新聚焦
				if (rememberPose) {
					this.savedPerspectivePose = this.capturePerspectivePose();
				}
				this.mode = "top-down";
				this.controls.object = this.ortho;
				this.applyTopDownConstraints();
				this.fitToBoard();
				return;
			}

			this.mode = "3d";
			this.controls.object = this.perspective;
			this.applyPerspectiveConstraints();

			if (this.savedPerspectivePose) {
				this.perspective.position.copy(this.savedPerspectivePose.position);
				this.controls.target.copy(this.savedPerspectivePose.target);
				this.savedPerspectivePose = null;
				restoredPerspectivePose = true;
			}
		} finally {
			// 位置 + target 已确定，朝向由 lookAt + camera.up 推导，无需保存四元数
			this.controls.object.lookAt(this.controls.target);
			this.controls.update();
			this.controls.enabled = true;
			this.isApplyingState = false;
		}

		if (!restoredPerspectivePose) {
			// 开局就是俯视：没有可恢复的 3D 位姿，交给外部重新聚焦
			this.onNeedDefault3DView?.();
		}
	}

	/** 记录当前 3D 位姿；距离退化（尚未聚焦 / 相机仍在原点）时返回 null */
	private capturePerspectivePose(): CameraPose | null {
		const position = this.perspective.position.clone();
		const target = this.controls.target.clone();
		const distance = position.distanceTo(target);
		if (!Number.isFinite(distance) || distance < PERSPECTIVE_MIN_DISTANCE) return null;
		return { position, target };
	}

	private applyPerspectiveConstraints(): void {
		this.controls.enableRotate = true;
		this.controls.enablePan = true;
		this.controls.enableZoom = true;
		this.controls.minDistance = PERSPECTIVE_MIN_DISTANCE;
		this.controls.maxDistance = PERSPECTIVE_MAX_DISTANCE;
		this.controls.minPolarAngle = PERSPECTIVE_MIN_POLAR_ANGLE;
		this.controls.maxPolarAngle = PERSPECTIVE_MAX_POLAR_ANGLE;
		// 正交相机遗留的 zoom 不应影响透视成像
		this.controls.minZoom = 0;
		this.controls.maxZoom = Infinity;
		this.perspective.zoom = 1;
		this.perspective.updateProjectionMatrix();
		this.controls.mouseButtons = { ...PERSPECTIVE_MOUSE_BUTTONS };
		this.controls.touches = { ...PERSPECTIVE_TOUCHES };
	}

	private applyTopDownConstraints(): void {
		this.controls.enableRotate = false;
		this.controls.enablePan = true;
		this.controls.enableZoom = true;
		// OrbitControls 对正交相机同样会执行距离夹取（maxDistance），
		// 沿用 30 会把位于 y=100 的俯视相机拉回，必须放开。
		this.controls.minDistance = 0;
		this.controls.maxDistance = Infinity;
		this.controls.minPolarAngle = 0;
		this.controls.maxPolarAngle = 0;
		this.controls.minZoom = TOP_DOWN_MIN_ZOOM;
		this.controls.maxZoom = TOP_DOWN_MAX_ZOOM;
		this.controls.mouseButtons = { ...TOP_DOWN_MOUSE_BUTTONS };
		this.controls.touches = { ...TOP_DOWN_TOUCHES };
	}

	/** 按当前视口比例计算“刚好容纳整张棋盘”的竖直取景高度 */
	private getFittedFrustumHeight(): number {
		const { minX, maxX, minY, maxY } = this.bounds;
		const width = Math.max(1, maxX - minX + 1);
		const depth = Math.max(1, maxY - minY + 1);
		// 取景高度让棋盘在受限的那一边恰好占 80% 屏幕
		return Math.max(depth, width / this.aspect) / BOARD_MAX_SCREEN_COVERAGE;
	}

	/** 正交相机高度：随地图尺寸调整，保证大图也有足够的裁剪空间 */
	private getCameraHeight(): number {
		const { minX, maxX, minY, maxY } = this.bounds;
		const span = Math.max(1, maxX - minX + 1, maxY - minY + 1);
		return Math.max(ORTHO_MIN_CAMERA_HEIGHT, span * ORTHO_HEIGHT_PER_BOARD_SPAN);
	}

	private applyOrthoFrustum(frustumHeight: number): void {
		this.ortho.top = frustumHeight / 2;
		this.ortho.bottom = -frustumHeight / 2;
		this.ortho.left = (-frustumHeight * this.aspect) / 2;
		this.ortho.right = (frustumHeight * this.aspect) / 2;
		this.ortho.near = ORTHO_NEAR;
		this.ortho.far = this.getCameraHeight() + ORTHO_FAR_MARGIN;
	}

	private orthoPosition(x = 0, z = 0): void {
		this.ortho.position.set(x, this.getCameraHeight(), z);
	}

	/**
	 * 平移边界（按视野计算）：
	 * - 视野比棋盘大（整图视图）：只允许在空白范围里移动，保证棋盘始终完整可见；
	 * - 视野比棋盘小（放大后）：允许浏览整张棋盘，最多再外扩一点。
	 */
	private clampPanAxis(value: number, min: number, max: number, visibleHalf: number): number {
		const center = (min + max) / 2;
		const boardHalf = (max - min) / 2;

		if (visibleHalf > boardHalf) {
			// 再收一点余量，抵消 OrbitControls 的极角 epsilon 带来的亚像素级偏移
			const slack = Math.max(0, visibleHalf - boardHalf - VIEW_EDGE_EPSILON);
			return THREE.MathUtils.clamp(value, center - slack, center + slack);
		}

		const margin = PAN_MARGIN / Math.max(1, this.ortho.zoom);
		return THREE.MathUtils.clamp(value, min - margin, max + margin);
	}

	/** 当前缩放下的视野半宽（x / z 对应正交视锥的两个方向） */
	private getVisibleHalfSizes(): { x: number; z: number } {
		const zoom = Math.max(1, this.ortho.zoom);
		return {
			x: (this.ortho.right - this.ortho.left) / 2 / zoom,
			z: (this.ortho.top - this.ortho.bottom) / 2 / zoom,
		};
	}

	private whileApplyingState(fn: () => void): void {
		const previous = this.isApplyingState;
		this.isApplyingState = true;
		try {
			fn();
		} finally {
			this.isApplyingState = previous;
		}
	}

	/** 平移边界：按视野夹取 target，避免整图视图下把棋盘拖出视野 */
	private handleControlsChange = (): void => {
		if (this.isDisposed || !this.isTopDown || this.isApplyingState) return;

		const { minX, maxX, minY, maxY } = this.bounds;
		const visible = this.getVisibleHalfSizes();
		const clampedX = this.clampPanAxis(this.controls.target.x, minX, maxX + 1, visible.x);
		const clampedZ = this.clampPanAxis(this.controls.target.z, minY, maxY + 1, visible.z);
		if (clampedX === this.controls.target.x && clampedZ === this.controls.target.z) return;

		this.controls.target.set(clampedX, this.controls.target.y, clampedZ);
		// update() 已在本帧按旧 target 摆好相机，这里立即回写，避免边缘回弹抖动。
		this.orthoPosition(clampedX, clampedZ);
		this.ortho.lookAt(this.controls.target);
	};
}
