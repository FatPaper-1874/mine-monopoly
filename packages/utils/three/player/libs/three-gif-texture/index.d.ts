export class GIFTexture {
  image: THREE.CanvasTexture;

  constructor(
    /**
     * gif路径
     */
    path: string,
    /**
     * 是否自动播放gif 由定时器循环执行
     */
    autoDraw?: "autoDraw",
    /**
     * gif解析完毕回调
     */
    onLoad?: (image: GifTexture) => void
  );

  /**
   * 按需更新时需要手动执行此方法
   */
  draw: () => void;
}
