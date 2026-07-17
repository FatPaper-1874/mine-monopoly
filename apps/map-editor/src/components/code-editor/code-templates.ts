import { TargetSelectType } from "@mine-monopoly/types";

export type EditorCodeType =
	| "chance-card"
	| "map-event"
	| "role"
	| "game-phase"
	| "modifier"
	| "property"
	| "extra-libs";

export interface CodeTemplateExtraParams {
	targetType?: TargetSelectType | string;
	commandType?: string;
}

export interface CodeTemplateDefinition {
	editorText: string;
	template: string;
	params: string;
	header: string;
	footer: string;
}

export interface ValidationTemplateConfig {
	header: string;
	footer: string;
}

const USER_CODE_MARKER = "  // --- USER CODE ---";

function buildDefinition(header: string, footer: string, params: string): CodeTemplateDefinition {
	return {
		editorText: `${header}\n${footer}`,
		template: `${header}${USER_CODE_MARKER}\n${footer}`,
		params,
		header,
		footer,
	};
}

const chanceCardTargetTypeMap: Record<string, string> = {
	[TargetSelectType.ToSelf]: "IPlayer",
	[TargetSelectType.ToOtherPlayer]: "IPlayer",
	[TargetSelectType.ToPlayer]: "IPlayer",
	[TargetSelectType.ToProperty]: "IProperty",
	[TargetSelectType.ToMapItem]: "string",
};

function resolveChanceCardTargetType(targetType?: TargetSelectType | string): string {
	if (!targetType) {
		return chanceCardTargetTypeMap[TargetSelectType.ToSelf];
	}
	return chanceCardTargetTypeMap[targetType] || chanceCardTargetTypeMap[TargetSelectType.ToSelf];
}

function getCommandMapType(commandType: string): { commandMap: string; ownerName: string; ownerType: string } {
	if (commandType.startsWith("player.")) {
		return { commandMap: "PlayerCommandMap", ownerName: "player", ownerType: "IPlayer" };
	}
	if (commandType.startsWith("property.")) {
		return { commandMap: "PropertyCommandMap", ownerName: "property", ownerType: "IProperty" };
	}
	return { commandMap: "ICommandMap", ownerName: "owner", ownerType: "any" };
}

export function getCodeTemplateDefinition(
	codeType: EditorCodeType,
	extraParams: CodeTemplateExtraParams = {},
): CodeTemplateDefinition {
	switch (codeType) {
		case "chance-card": {
			const targetParamType = resolveChanceCardTargetType(extraParams.targetType);
			const params = `sourcePlayer: IPlayer, target: ${targetParamType}, gameProcess: IGameProcess`;
			return buildDefinition(`(async (${params}) => {\n`, `});`, params);
		}
		case "map-event": {
			const params = `player: IPlayer, gameProcess: IGameProcess`;
			return buildDefinition(`(async (${params}) => {\n`, `});`, params);
		}
		case "role": {
			const params = `player: IPlayer, gameProcess: IGameProcess`;
			return buildDefinition(`((` + params + `) => {\n`, `});`, params);
		}
		case "game-phase": {
			const params = `ctx: GameContext, gameProcess: IGameProcess`;
			return buildDefinition(`(async (${params}) => {\n`, `}) as GameEventFunction<GameContext>;`, params);
		}
		case "modifier": {
			if (extraParams.commandType && extraParams.commandType.trim()) {
				const { commandMap, ownerName, ownerType } = getCommandMapType(extraParams.commandType);
				const params = `${ownerName}: ${ownerType}, gameProcess: IGameProcess, cmd: ICommand<${commandMap}, "${extraParams.commandType}">, ctx: ICommandContext<${commandMap}, "${extraParams.commandType}">`;
				return buildDefinition(`(async (${params}) => {\n`, `});`, params);
			}
			const params = `player: IPlayer, gameProcess: IGameProcess, cmd: ICommand<ICommandMap, keyof ICommandMap>, ctx: ICommandContext<ICommandMap, keyof ICommandMap>`;
			return buildDefinition(`(async (${params}) => {\n`, `});`, params);
		}
		case "property": {
			const params = `property: IProperty, gameProcess: IGameProcess`;
			return buildDefinition(`((${params}) => {\n`, `});`, params);
		}
		case "extra-libs":
			return {
				editorText: "",
				template: `// --- USER CODE ---`,
				params: "",
				header: "",
				footer: "",
			};
		default: {
			const exhaustiveCheck: never = codeType;
			throw new Error(`Unsupported codeType: ${exhaustiveCheck}`);
		}
	}
}

export function resolveValidationTemplateConfig(
	codeType: EditorCodeType,
	extraParams: CodeTemplateExtraParams & { template?: string } = {},
): ValidationTemplateConfig {
	if (extraParams.template) {
		const fromTemplate = parseTemplateConfig(extraParams.template);
		if (fromTemplate) {
			return fromTemplate;
		}
	}
	const definition = getCodeTemplateDefinition(codeType, extraParams);
	return { header: definition.header, footer: definition.footer };
}

function parseTemplateConfig(template: string): ValidationTemplateConfig | null {
	if (!template) return null;

	const markerIndex = template.indexOf(USER_CODE_MARKER);
	if (markerIndex >= 0) {
		const header = template.slice(0, markerIndex);
		const footer = template.slice(markerIndex + USER_CODE_MARKER.length + 1);
		return { header, footer };
	}

	const matched = template.match(/^([\s\S]*?=>\s*\{\n?)([\s\S]*)(\n\}\)\s*(?:as[\s\S]+)?;?\s*)$/);
	if (!matched) {
		return null;
	}

	return {
		header: matched[1],
		footer: matched[3],
	};
}

// =========================================================
// Backward-compatible exports for existing editor components
// =========================================================

export const MAP_EVENT_TEMPLATE = getCodeTemplateDefinition("map-event").editorText;
export const PROPERTY_TEMPLATE = getCodeTemplateDefinition("property").editorText;
export const ROLE_TEMPLATE = getCodeTemplateDefinition("role").editorText;
export const GAME_PHASE_TEMPLATE = getCodeTemplateDefinition("game-phase").editorText;

export function generateChanceCardTemplate(targetType: TargetSelectType): string {
	return getCodeTemplateDefinition("chance-card", { targetType }).editorText;
}

export function generateChanceCardParams(targetType: TargetSelectType): string {
	return getCodeTemplateDefinition("chance-card", { targetType }).params;
}

export function generateModifierTemplate(commandType: string): string {
	return getCodeTemplateDefinition("modifier", { commandType }).editorText;
}

export function generateModifierParams(commandType: string): string {
	return getCodeTemplateDefinition("modifier", { commandType }).params;
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
	const paramPattern = /^(\((?:async\s*)?\()(\s*[\s\S]*?)(\s*\)\s*=>\s*\{)/;
	const match = current.match(paramPattern);
	if (match) {
		const newParams = generateParams();
		return match[1] + " " + newParams + match[3] + current.slice(match[0].length);
	}
	return generateTemplate();
}
