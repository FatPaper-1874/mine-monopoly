import {DiceRenderer} from "./DiceRenderer";
import * as THREE from "three";

export class LoginDiceRenderer extends DiceRenderer {
    private imagePlane: THREE.Mesh | undefined;

    constructor(el: HTMLCanvasElement, rotate: boolean) {
        super(el, rotate);
        const codePlaneGeometry = new THREE.ShapeGeometry(roundedRect(new THREE.Shape(), -0.8, -0.8, 1.6, 1.6, 0.2), 10);
        const codePlaneMaterial = new THREE.MeshBasicMaterial({
            opacity: 0,
            transparent: true,
        });
        this.imagePlane = new THREE.Mesh(codePlaneGeometry, codePlaneMaterial);
        this.imagePlane.position.set(1.0005, 0, 0);
        this.imagePlane.rotateY(Math.PI / 2);
        // this.codePlane.lookAt(super.camera.position);

        super.addToScene(this.imagePlane);
    }

    public async showImage(imgUrl: string) {
        if (!this.imagePlane) return;
        if (imgUrl) {
            const textureLoader = new THREE.TextureLoader();
            const texture = await new Promise<THREE.Texture>((resolve, reject) => {
                textureLoader.load(imgUrl, (texture) => {
                    texture.matrixAutoUpdate = false
                    texture.colorSpace = THREE.SRGBColorSpace
                    resolve(texture);
                });
            });

            await super.stopRotate([1]);
            const material = new THREE.MeshBasicMaterial({
                transparent: true,
                map: texture,
                side: THREE.DoubleSide,
            });
            material.map && material.map.matrix.scale(0.6, 0.6).translate(0.5, 0.5)
            this.imagePlane.material = material;
            //获取图片后，停止转动;
        } else {
            await super.stopRotate([1]);
        }
    }

    public cleanImage() {
        if (!this.imagePlane) return;
        const codePlaneMaterial = new THREE.MeshBasicMaterial({
            opacity: 0,
            transparent: true,
            side: THREE.DoubleSide,
        });
        this.imagePlane.material = codePlaneMaterial;
        this.rollAllDice();
    }

    private rollAllDice() {
        this.dices.forEach((dice) => {
            super.startRotate();
        });
    }
}

function roundedRect(shape: THREE.Shape, x: number, y: number, width: number, height: number, radius: number) {
    shape.moveTo(x, y + radius);
    shape.lineTo(x, y + height - radius);
    shape.quadraticCurveTo(x, y + height, x + radius, y + height);
    shape.lineTo(x + width - radius, y + height);
    shape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
    shape.lineTo(x + width, y + radius);
    shape.quadraticCurveTo(x + width, y, x + width - radius, y);
    shape.lineTo(x + radius, y);
    shape.quadraticCurveTo(x, y, x, y + radius);
    return shape
}
