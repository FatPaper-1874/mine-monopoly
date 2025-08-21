import * as THREE from "three";
import {debounce} from "@/utils";

export class ThreeSceneBase {
    protected canvasEl: HTMLCanvasElement;
    protected containerEl: HTMLDivElement | undefined;
    protected renderer: THREE.WebGLRenderer;
    protected scene: THREE.Scene;
    protected camera: THREE.PerspectiveCamera;
    protected requestAnimationFrameId: number = -1;
    private resizeObserver: ResizeObserver | undefined;

    constructor(canvas: HTMLCanvasElement) {
        this.canvasEl = canvas;
        this.renderer = new THREE.WebGLRenderer({canvas});
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000)
        // this.renderLoop();

        const parentEl = canvas.parentElement;
        if (parentEl) {
            const tempDivEl = document.createElement('div');
            Object.assign(tempDivEl.style, {
                position: 'relative',
                width: '100%',
                height: '100%',
            });
            Object.assign(canvas.style, {
                position: 'absolute ',
                width: '100%',
                height: '100%',
                left: '0',
                top: '0',
            });
            tempDivEl.append(canvas);
            parentEl.append(tempDivEl)
            this.containerEl = tempDivEl;
            const callback: ResizeObserverCallback = (entries) => {
                if (entries.length === 0) return
                const _parentEl = entries[0].target;
                if (_parentEl) {
                    this.renderer.setSize(_parentEl.clientWidth, _parentEl.clientHeight);
                    this.camera.aspect = _parentEl.clientWidth / _parentEl.clientHeight;
                    this.camera.updateProjectionMatrix();
                }
            }
            const resizeObserver = new ResizeObserver(debounce(callback.bind(this), 100));
            resizeObserver.observe(tempDivEl, {})
            this.resizeObserver = resizeObserver;
        }
    }

    protected setLoadingMaskVisible(visible: boolean) {
        if (this.containerEl) {
            if (visible) this.containerEl.setAttribute('loading', '');
            else this.containerEl.removeAttribute('loading');
        }
    }

    protected render() {
        this.renderer.render(this.scene, this.camera);
    }

    protected destroy() {
        this.resizeObserver && this.resizeObserver.disconnect();
        cancelAnimationFrame(this.requestAnimationFrameId);
        this.scene.traverse(object => {
            //@ts-ignore
            object.geometry && object.geometry.dispose();
            //@ts-ignore
            object.texture && object.texture.dispose();
            //@ts-ignore
            object.material && object.material.dispose();
        })
        this.scene.clear();
        this.renderer.dispose();
        this.renderer.forceContextLoss();
        let gl = this.renderer.domElement.getContext("webgl");
        if (gl) {
            const e = gl.getExtension("WEBGL_lose_context")
            e && e.loseContext();
        }
    }
}