/**
 * 数据库游戏地图接口
 * 表示存储在数据库中的游戏地图
 */
export interface GameMapInDb {
	/** 地图唯一标识 */
	id: string;

	/** 地图名称 */
	name: string;

	/** 地图作者 */
	author: string;

	/** 地图版本 */
	version: string;

	/** 地图描述 */
	description: string;

	/** 地图哈希值 */
	hash: string;

	/** 封面图片 URL */
	coverUrl: string;

	/** 地图数据 URL */
	mapUrl: string;

	/** 是否正在使用 */
	inuse: boolean;
}
