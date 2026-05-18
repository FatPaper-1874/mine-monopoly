import { TargetSelectType } from "@mine-monopoly/types";

// =========================================================
// 静态模板文本
// =========================================================

/** 地图事件 effectCode 模板 */
export const MAP_EVENT_TEMPLATE = `(async (player: IPlayer, gameProcess: IGameProcess) => {
  
});`;

/** 地产 effectCode 模板 */
export const PROPERTY_TEMPLATE = `((property: IProperty, gameProcess: IGameProcess) => {

})`;

/** 角色 initCode 模板 */
export const ROLE_TEMPLATE = `((player: IPlayer, gameProcess: IGameProcess) => {
	
});`;

/** 游戏阶段 initEventCode 模板 */
export const GAME_PHASE_TEMPLATE = `(async (gameProcess: IGameProcess) => {
	
});`;

// =========================================================
// 机会卡 - 动态模板（根据 targetType 生成）
// =========================================================

const chanceCardTargetTypeMap: Record<TargetSelectType, string> = {
	[TargetSelectType.ToSelf]: "IPlayer",
	[TargetSelectType.ToOtherPlayer]: "IPlayer",
	[TargetSelectType.ToPlayer]: "IPlayer",
	[TargetSelectType.ToProperty]: "IProperty",
	[TargetSelectType.ToMapItem]: "string",
};

/** 生成机会卡完整模板代码 */
export function generateChanceCardTemplate(targetType: TargetSelectType): string {
	return `(async (sourcePlayer: IPlayer, target: ${chanceCardTargetTypeMap[targetType]}, gameProcess: IGameProcess) => {\n  \n});`;
}

/** 仅生成机会卡参数声明部分 */
export function generateChanceCardParams(targetType: TargetSelectType): string {
	return `sourcePlayer: IPlayer, target: ${chanceCardTargetTypeMap[targetType]}, gameProcess: IGameProcess`;
}

// =========================================================
// 修饰器模板 - 动态模板（根据 commandType 生成）
// =========================================================

/** 生成修饰器完整模板代码 */
export function generateModifierTemplate(commandType: string): string {
	return `(async (player: IPlayer, gameProcess: IGameProcess, cmd: ICommand<PlayerCommandMap, "${commandType}">, ctx: ICommandContext<PlayerCommandMap, "${commandType}">) => {
	
})`;
}

/** 仅生成修饰器参数声明部分 */
export function generateModifierParams(commandType: string): string {
	return `player: IPlayer, gameProcess: IGameProcess, cmd: ICommand<PlayerCommandMap, "${commandType}">, ctx: ICommandContext<PlayerCommandMap, "${commandType}">`;
}

// =========================================================
// 通用工具：替换 effectCode 中的函数参数声明部分，保留函数体
// =========================================================

/**
 * 替换异步箭头函数中的参数声明部分，保留函数体不变。
 * 匹配 `(async (...) => { ...body })` 中的参数区域。
 */
export function replaceEffectCodeParams(
	currentCode: string | undefined,
	generateTemplate: () => string,
	generateParams: () => string,
): string {
	const current = currentCode?.trim();
	if (!current) {
		return generateTemplate();
	}
	const paramPattern = /^(\(async\s*\()(\s*[\s\S]*?)(\s*\)\s*=>\s*\{)/;
	const match = current.match(paramPattern);
	if (match) {
		const newParams = generateParams();
		return match[1] + ' ' + newParams + match[3] + current.slice(match[0].length);
	}
	return generateTemplate();
}
