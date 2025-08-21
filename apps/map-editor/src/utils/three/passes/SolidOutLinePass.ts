import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import * as THREE from "three";

export class SolidOutlinePass extends OutlinePass {
	constructor(resolution: THREE.Vector2, scene: THREE.Scene, camera: THREE.Camera, selectedObjects?: THREE.Object3D[]) {
		super(resolution, scene, camera, selectedObjects);

		// 禁用 glow 模糊
		this.edgeGlow = 0.0;
		this.usePatternTexture = false;

		// 修改 overlayMaterial 片元着色器
		const solidOverlayShader = this.overlayMaterial.clone();
		solidOverlayShader.fragmentShader = solidOverlayShader.fragmentShader.replace(
			/gl_FragColor = getOverlayColor\(edgeTexel, visibleEdgeColor, hiddenEdgeColor, .*\);/,
			`
        // 直接用纯色替代
        if (edgeTexel.r > 0.0) {
          gl_FragColor = vec4(visibleEdgeColor, 1.0);
        } else if (edgeTexel.g > 0.0) {
          gl_FragColor = vec4(hiddenEdgeColor, 1.0);
        } else {
          discard;
        }
      `
		);

		this.overlayMaterial = solidOverlayShader;
	}
}
