/**
 * 音效类型枚举
 */
export enum SoundType {
	/** UI 音效 */
	UI = "ui",
	/** 游戏音效 */
	GAME = "game",
}

/**
 * 预设音效名称
 */
export enum SoundName {
	// UI 音效
	BUTTON_CLICK = "button-click",
	BUTTON_HOVER = "button-hover",
	NOTIFICATION = "notification",
	SUCCESS = "success",
	ERROR = "error",
	INFO = "info",

	// 游戏音效
	DICE_ROLL = "dice-roll",
	GAIN_MONEY = "gain-money",
	LOSE_MONEY = "lose-money",
	PLAYER_STEP = "player-step",
	// DICE_RESULT = "dice-result",
	// COIN_COLLECT = "coin-collect",
	// COIN_SPEND = "coin-spend",
	// CARD_DRAW = "card-draw",
	// CARD_USE = "card-use",
	// PROPERTY_BUY = "property-buy",
	// JAIL = "jail",
	// PASS_GO = "pass-go",
	// TURN_START = "turn-start",
	// TURN_END = "turn-end",
}

/**
 * 音效配置
 */
export interface SoundConfig {
	/** 音效名称 */
	name: SoundName;
	/** 音效文件路径（支持多格式，优先使用第一个支持的格式） */
	src: string | string[];
	/** 音效类型 */
	type: SoundType;
	/** 默认音量 (0-1) */
	volume?: number;
	/** 是否循环播放 */
	loop?: boolean;
}

/**
 * 音频管理器配置
 */
export interface AudioManagerConfig {
	/** 音效资源基础路径 */
	basePath: string;
	/** 背景音乐路径 */
	bgmPath: string;
	/** 音效配置列表 */
	sounds: SoundConfig[];
}

/**
 * 音量控制配置
 */
export interface VolumeConfig {
	/** 主音量 (0-1) */
	master: number;
	/** 音效音量 (0-1) */
	sfx: number;
	/** 背景音乐音量 (0-1) */
	bgm: number;
	/** 全局静音 */
	muted: boolean;
	/** 主音量静音 */
	masterMuted: boolean;
	/** 音效静音 */
	sfxMuted: boolean;
	/** 背景音乐静音 */
	bgmMuted: boolean;
}
