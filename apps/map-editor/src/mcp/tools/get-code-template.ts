/**
 * MCP Tool for Getting Code Templates
 *
 * Returns the correct code template based on code type and extra parameters.
 * This reuses the same template source as the map editor code editor.
 */

import { z } from "zod";
import { successResult } from "../utils.js";
import { getCodeTemplateDefinition, type EditorCodeType } from "@src/components/code-editor/code-templates";

// Schema definitions
const CodeTypeEnum = z.enum([
	"chance-card",
	"map-event",
	"role",
	"game-phase",
	"modifier",
	"property",
	"extra-libs",
]);

const TargetTypeEnum = z.enum([
	"ToSelf",
	"ToOtherPlayer",
	"ToPlayer",
	"ToProperty",
	"ToMapItem",
]);

const GetCodeTemplateSchema = z.object({
	codeType: CodeTypeEnum.describe("代码类型"),
	extraParams: z.object({
		targetType: TargetTypeEnum.optional().describe("机会卡的 type 字段"),
		commandType: z.string().optional().describe("修饰器的 commandType 字段"),
	}).optional(),
});

export async function getCodeTemplate(args: unknown) {
	const parsed = GetCodeTemplateSchema.parse(args);
	const { codeType, extraParams } = parsed;
	const definition = getCodeTemplateDefinition(codeType as EditorCodeType, {
		targetType: extraParams?.targetType,
		commandType: extraParams?.commandType,
	});
	return successResult({
		template: definition.template,
		params: definition.params,
		editorText: definition.editorText,
	});
}

export const getCodeTemplateTools = [
	{
		name: "get_code_template",
		description: "获取代码模板。模板与地图编辑器代码编辑器同源。参数: codeType(代码类型), extraParams(targetType-机会卡类型/commandType-修饰器命令类型)。对于修饰器，提供 commandType 会生成精确的类型签名。返回: { template, params, editorText }",
		inputSchema: GetCodeTemplateSchema,
		handler: getCodeTemplate,
	},
];
