import * as THREE from "three";
import {spine as SPINE} from "../../../../../utils/spine-threejs";

export class Animated2DBase {
    protected readonly baseUrl;
    protected readonly name;
    protected readonly size;
    protected currentAnimationName: string = "";
    protected animationNamesList: string[] = [];
    protected skeletonMesh: SPINE.threejs.SkeletonMesh | undefined;
    public model: THREE.Group;

    protected lastFrameTime = Date.now() / 1000;

    constructor(size: number, baseUrl: string, fileNameWithoutType: string) {
        this.size = size;
        this.baseUrl = baseUrl;
        this.name = fileNameWithoutType;
        this.model = new THREE.Group();
    }

    public async load() {
        this.skeletonMesh = await loadRoleModel(this.size, this.baseUrl, this.name);
        if (this.animationNamesList.includes('idle')) {
            this.chanceAnimation('idle', true);
        }
        this.animationNamesList = this.skeletonMesh.state.data.skeletonData.animations.map(animation => animation.name) || [];
        this.model.add(this.skeletonMesh);
        return this.model;
    }

    public doAnimation(animation: string, loop: boolean = false) {
        //改变动画
        this.chanceAnimation(animation, loop);
    }

    protected waitNextAnimationComplete() {
        return new Promise((resolve, reject) => {
            if (this.skeletonMesh) {
                this.skeletonMesh.state.addListener({complete: resolve})
            } else {
                reject("在模型加载之前尝试调用函数：waitNextAnimationComplete！");
            }
        })
    }

    protected chanceAnimation(state: string, loop: boolean = false) {
        if (this.skeletonMesh && this.animationNamesList.includes(state)) {
            this.currentAnimationName = state;
            this.skeletonMesh.state.setAnimation(0, state, loop);
        } else {
            throw new Error("在模型加载之前尝试修改模型状态！")
        }
    }

    public getAnimationList() {
        return this.animationNamesList;
    }

    public update() {
        if (this.skeletonMesh) {
            // calculate delta time for animation purposes
            let now = Date.now() / 1000;
            let delta = now - this.lastFrameTime;
            this.lastFrameTime = now;

            this.skeletonMesh.update(delta);
        }
    }
}

async function loadRoleModel(size: number, baseUrl: string, fileNameWithType: string): Promise<SPINE.threejs.SkeletonMesh> {
    const jsonFileName = `${fileNameWithType}.json`;
    const atlasFileName = `${fileNameWithType}.atlas`

    const assetManager = new SPINE.threejs.AssetManager(baseUrl);
    const assetInfoText = await loadText(assetManager, jsonFileName);
    await loadTextureAtlas(assetManager, atlasFileName);

    const atlas = assetManager.get(atlasFileName);
    const atlasLoader = new SPINE.AtlasAttachmentLoader(atlas);
    const skeletonJson = new SPINE.SkeletonJson(atlasLoader);

    const assetInfoJson = JSON.parse(assetInfoText as string);
    const scale = size / assetInfoJson.skeleton.width;
    //使模型缩放为与three.js相同的单位
    skeletonJson.scale = scale || 1;
    // skeletonJson.scale = 1;

    const skeletonData = skeletonJson.readSkeletonData(
        assetManager.get(jsonFileName)
    );

    // Create a SkeletonMesh from the data and attach it to the scene
    const skeletonMesh = new SPINE.threejs.SkeletonMesh(
        skeletonData,
        (parameters) => {
            parameters.depthTest = true;
            parameters.depthWrite = true;
            parameters.alphaTest = 0.001;
        }
    );

    //调整正常的厚度
    skeletonMesh.scale.z = scale;
    return skeletonMesh;
}

function loadText(assetManager: SPINE.threejs.AssetManager, path: string) {
    return new Promise((resolve, reject) => {
        assetManager.loadText(path, (path: string, text: string) => {
            resolve(text);
        }, (path: string, message: string) => {
            reject(message);
        })
    })
}

function loadTextureAtlas(assetManager: SPINE.threejs.AssetManager, path: string) {
    return new Promise((resolve, reject) => {
        assetManager.loadTextureAtlas(path, (path: string, atlas: SPINE.TextureAtlas) => {
            resolve(atlas);
        }, (path: string, message: string) => {
            reject(message);
        })
    })
}