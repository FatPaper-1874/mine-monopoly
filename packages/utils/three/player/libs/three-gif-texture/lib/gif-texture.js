/*
 * @Author: hongbin
 * @Date: 2023-03-17 21:46:30
 * @LastEditors: hongbin
 * @LastEditTime: 2023-03-18 19:07:26
 * @Description:处理纹理
 */
import { Clock } from 'three';
import { CanvasTexture } from 'three';

export default class GifTexture extends CanvasTexture {
    constructor(image, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy) {
        super(image, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy);

        this.needsUpdate = false;
    }

    setReader(reader) {
        this.reader = reader;
        this.numFrames = reader.numFrames();
        this.image = document.createElement('canvas');

        this.image.width = reader.width;
        this.image.height = reader.height;
        this.context = this.image.getContext('2d', { willReadFrequently: true });

        this.frameNumber = 0;
        this.previousFrameInfo = null;
        this.clock = new Clock()
        if (this._autoDraw) {
            this.autoDraw()
        }
    }


    draw() {
        if (!this.reader) {
            return;
        }

        const { reader, image, context, clock } = this;
        const { width, height } = image;
        const frameNum = Math.floor(this.frameNumber % this.numFrames);
        const frameInfo = reader.frameInfo(frameNum);

        if (frameNum === 0) {
            context.clearRect(0, 0, width, height);
        } else if (this.previousFrameInfo && this.previousFrameInfo.disposal === 2) {
            context.clearRect(this.previousFrameInfo.x,
                this.previousFrameInfo.y,
                this.previousFrameInfo.width,
                this.previousFrameInfo.height);
        }
        // this.frameNumber += 0.01 * frameInfo.delay;
        // 在onAfterRender中更新会比正常的逐帧更新多一次运行（当相机在轨道控制器中移动时 所以根据时间长度播放进度）
        this.frameNumber += clock.getDelta() * 0.5 * frameInfo.delay;

        const imageData = context.getImageData(0, 0, width, height);
        reader.decodeAndBlitFrameRGBA(frameNum, imageData.data);
        context.putImageData(imageData, 0, 0);

        this.needsUpdate = true;

        this.previousFrameInfo = frameInfo;
    }

    /**
    * 开启定时器自动更新
    */
    autoDraw() {
        this._autoDraw = true;
        if (!this.reader) {
            return;
        }

        const { reader, image, context } = this;
        const { width, height } = image;
        const frameNum = this.frameNumber % this.numFrames;
        const frameInfo = reader.frameInfo(frameNum);

        if (frameNum === 0) {
            context.clearRect(0, 0, width, height);
            // always clear canvas to start
        } else if (this.previousFrameInfo && this.previousFrameInfo.disposal === 2) {
            // disposal was "restore to background" which is essentially "restore to transparent"
            context.clearRect(this.previousFrameInfo.x,
                this.previousFrameInfo.y,
                this.previousFrameInfo.width,
                this.previousFrameInfo.height);
        }
        this.frameNumber++;

        const imageData = context.getImageData(0, 0, width, height);
        reader.decodeAndBlitFrameRGBA(frameNum, imageData.data);
        context.putImageData(imageData, 0, 0);

        this.needsUpdate = true;

        this.previousFrameInfo = frameInfo;
        setTimeout(this.autoDraw.bind(this), frameInfo.delay * 10);
    }

};