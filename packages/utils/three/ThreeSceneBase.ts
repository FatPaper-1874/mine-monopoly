import * as THREE from "three";
import { debounce } from "../common";

export class ThreeSceneBase {
	protected canvasEl: HTMLCanvasElement;
	protected containerEl: HTMLDivElement;
	protected renderer: THREE.WebGLRenderer;
	protected scene: THREE.Scene;
	protected camera: THREE.Camera;
	protected requestAnimationFrameId: number = -1;
	private resizeObserver: ResizeObserver | undefined;

	constructor(contianer: HTMLDivElement) {
		this.renderer = new THREE.WebGLRenderer({});
		this.canvasEl = this.renderer.domElement;
		this.renderer.setSize(this.canvasEl.clientWidth, this.canvasEl.clientHeight);
		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(75, this.canvasEl.clientWidth / this.canvasEl.clientHeight, 0.1, 1000);
		// this.renderLoop();

		this.containerEl = contianer;
		const parentEl = contianer;
		if (parentEl) {
			const tempDivEl = document.createElement("div");
			Object.assign(tempDivEl.style, {
				position: "relative",
				width: "100%",
				height: "100%",
			});
			Object.assign(this.canvasEl.style, {
				position: "absolute ",
				width: "100%",
				height: "100%",
				left: "0",
				top: "0",
			});
			tempDivEl.append(this.canvasEl);
			parentEl.append(tempDivEl);
			this.containerEl = tempDivEl;
			const callback: ResizeObserverCallback = (entries) => {
				if (entries.length === 0) return;
				const _parentEl = entries[0].target;
				if (_parentEl) {
					const camera = this.camera as THREE.PerspectiveCamera;
					this.renderer.setSize(_parentEl.clientWidth, _parentEl.clientHeight);
					camera.aspect = _parentEl.clientWidth / _parentEl.clientHeight;
					camera.updateProjectionMatrix();
					this.render();
				}
			};
			const resizeObserver = new ResizeObserver(debounce(callback.bind(this), 100));
			resizeObserver.observe(tempDivEl, {});
			this.resizeObserver = resizeObserver;
		}
	}

	public getCanvasEl() {
		return this.canvasEl;
	}

	protected setLoadingMaskVisible(visible: boolean) {
		if (this.containerEl) {
			if (visible) this.containerEl.setAttribute("loading", "");
			else this.containerEl.removeAttribute("loading");
		}
	}

	protected render() {
		this.renderer.render(this.scene, this.camera);
	}

	protected destroy() {
		this.resizeObserver && this.resizeObserver.disconnect();
		cancelAnimationFrame(this.requestAnimationFrameId);
		this.scene.traverse((object) => {
			//@ts-ignore
			object.geometry && object.geometry.dispose();
			//@ts-ignore
			object.texture && object.texture.dispose();
			//@ts-ignore
			object.material && object.material.dispose();
		});
		this.scene.clear();
		this.renderer.dispose();
		this.renderer.forceContextLoss();
		let gl = this.renderer.domElement.getContext("webgl");
		if (gl) {
			const e = gl.getExtension("WEBGL_lose_context");
			e && e.loseContext();
		}
	}
}
