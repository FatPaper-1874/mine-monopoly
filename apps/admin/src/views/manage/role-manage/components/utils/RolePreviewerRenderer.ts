import * as THREE from 'three'
import {RoleModel} from "@/views/manage/role-manage/components/utils/RoleModel";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {ThreeSceneBase} from "@/utils/three/ThreeSceneBase";

export class RolePreviewerRenderer extends ThreeSceneBase {
    private orbitControls;

    private rolesReady = false;

    private role: RoleModel | undefined;

    constructor(canvas: HTMLCanvasElement) {
        super(canvas);
        this.scene.background = new THREE.Color(0x000000);
        this.camera.position.set(1, 1, 2);
        this.camera.lookAt(new THREE.Vector3(0, 0, 0))

        this.orbitControls = new OrbitControls(this.camera, canvas);
        this.scene.add(new THREE.AmbientLight(0xffffff, 1))
        this.renderLoop();
    }

    public async loadRoleModel(baseUrl: string, roleName: string) {
        this.setLoadingMaskVisible(true);
        this.role && this.scene.remove(this.role.model);
        const role = new RoleModel(1, baseUrl, roleName);
        const roleModel = await role.load();
        this.role = role;
        this.scene.add(roleModel);
        this.rolesReady = true
        this.setLoadingMaskVisible(false);
        return this.role;
    }

    public clear() {
        this.scene.clear();
        this.role = undefined;
    }

    private renderLoop() {
        this.orbitControls.update();
        if (this.rolesReady && this.role) {
            this.role.update();
        }
        super.render();
        requestAnimationFrame(this.renderLoop.bind(this));
    }

    public destroy(){
        super.destroy()
    }
}