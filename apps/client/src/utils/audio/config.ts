import { AudioManagerConfig, SoundName, SoundType } from "./types";

/**
 * 音频管理器配置
 */
export const audioConfig: AudioManagerConfig = {
	// 资源基础路径（使用相对路径兼容 file:// 协议）
	basePath: "./assets/audio",
	// 背景音乐路径
	bgmPath: "./assets/audio/bgm/main.mp3",
	// 音效配置列表
	sounds: [
		// UI 音效
		{
			name: SoundName.BUTTON_CLICK,
			src: ["/sfx/button-click.ogg"],
			type: SoundType.UI,
			volume: 0.5,
		},
		{
			name: SoundName.BUTTON_HOVER,
			src: ["/sfx/button-hover.ogg"],
			type: SoundType.UI,
			volume: 0.3,
		},
		{
			name: SoundName.NOTIFICATION,
			src: ["/sfx/notification.ogg", "/sfx/notification.mp3"],
			type: SoundType.UI,
			volume: 0.6,
		},
		{
			name: SoundName.SUCCESS,
			src: ["/sfx/success.ogg", "/sfx/success.mp3"],
			type: SoundType.UI,
			volume: 0.6,
		},
		{
			name: SoundName.ERROR,
			src: ["/sfx/error.ogg", "/sfx/error.mp3"],
			type: SoundType.UI,
			volume: 0.5,
		},
		{
			name: SoundName.INFO,
			src: ["/sfx/info.ogg", "/sfx/info.mp3"],
			type: SoundType.UI,
			volume: 0.5,
		},

		// 游戏音效
		{
			name: SoundName.DICE_ROLL,
			src: ["/sfx/dice-roll.mp3"],
			type: SoundType.GAME,
			volume: 0.7,
		},
		// {
		// 	name: SoundName.DICE_RESULT,
		// 	src: ["/sfx/dice-result.ogg", "/sfx/dice-result.mp3"],
		// 	type: SoundType.GAME,
		// 	volume: 0.8,
		// },
		// {
		// 	name: SoundName.COIN_COLLECT,
		// 	src: ["/sfx/coin-collect.ogg", "/sfx/coin-collect.mp3"],
		// 	type: SoundType.GAME,
		// 	volume: 0.7,
		// },
		// {
		// 	name: SoundName.COIN_SPEND,
		// 	src: ["/sfx/coin-spend.ogg", "/sfx/coin-spend.mp3"],
		// 	type: SoundType.GAME,
		// 	volume: 0.7,
		// },
		// {
		// 	name: SoundName.CARD_DRAW,
		// 	src: ["/sfx/card-draw.ogg", "/sfx/card-draw.mp3"],
		// 	type: SoundType.GAME,
		// 	volume: 0.6,
		// },
		// {
		// 	name: SoundName.CARD_USE,
		// 	src: ["/sfx/card-use.ogg", "/sfx/card-use.mp3"],
		// 	type: SoundType.GAME,
		// 	volume: 0.7,
		// },
		// {
		// 	name: SoundName.PROPERTY_BUY,
		// 	src: ["/sfx/property-buy.ogg", "/sfx/property-buy.mp3"],
		// 	type: SoundType.GAME,
		// 	volume: 0.7,
		// },
		// {
		// 	name: SoundName.JAIL,
		// 	src: ["/sfx/jail.ogg", "/sfx/jail.mp3"],
		// 	type: SoundType.GAME,
		// 	volume: 0.8,
		// },
		// {
		// 	name: SoundName.PASS_GO,
		// 	src: ["/sfx/pass-go.ogg", "/sfx/pass-go.mp3"],
		// 	type: SoundType.GAME,
		// 	volume: 0.8,
		// },
		// {
		// 	name: SoundName.TURN_START,
		// 	src: ["/sfx/turn-start.ogg", "/sfx/turn-start.mp3"],
		// 	type: SoundType.GAME,
		// 	volume: 0.7,
		// },
		// {
		// 	name: SoundName.TURN_END,
		// 	src: ["/sfx/turn-end.ogg", "/sfx/turn-end.mp3"],
		// 	type: SoundType.GAME,
		// 	volume: 0.6,
		// },
	],
};

/**
 * 获取音效完整路径
 */
export function getSoundPath(src: string | string[]): string[] {
	const basePath = audioConfig.basePath;
	if (Array.isArray(src)) {
		return src.map((s) => basePath + s);
	}
	return [basePath + src];
}

/**
 * 获取背景音乐完整路径
 */
export function getBGMPath(): string {
	return audioConfig.bgmPath;
}
