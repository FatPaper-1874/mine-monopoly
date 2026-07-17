/**
 * MCP Tool for Effect Code Validation
 *
 * Validates TypeScript effectCode using Monaco's TS language service.
 * Runs in the renderer process where Monaco holds the full type context.
 */

import { invokeTool } from "../bridge.js";
import { successResult, errorResult } from "../utils.js";
import { z } from "zod";

const ValidateEffectCodeSchema = z.object({
	code: z.string().describe("\u7528\u6237\u4EE3\u7801\u7247\u6BB5\uFF0C\u4E0D\u542B\u6A21\u677F\u5305\u88C5"),
	codeType: z.enum([
		"chance-card",
		"map-event",
		"role",
		"game-phase",
		"modifier",
		"property",
		"extra-libs",
	]).describe("\u4EE3\u7801\u7C7B\u578B"),
	commandType: z.string().optional().describe("\u547D\u4EE4\u7C7B\u578B\uFF08\u4EC5\u4FEE\u9970\u5668\u9700\u8981\uFF0C\u7528\u4E8E\u751F\u6210\u7CBE\u786E\u6A21\u677F\uFF09"),
	targetType: z.enum(["ToSelf", "ToOtherPlayer", "ToPlayer", "ToProperty", "ToMapItem"]).optional().describe("\u673A\u4F1A\u5361 targetType\uff08\u7528\u4E8E\u751F\u6210\u7CBE\u786E\u6A21\u677F\uFF09"),
	template: z.string().optional().describe("\u53EF\u9009\uff1A\u5B8C\u6574\u6A21\u677F\u5B57\u7B26\u4E32\u3002\u63D0\u4F9B\u540E\u6821\u9A8C\u5668\u4F1A\u76F4\u63A5\u4EE5\u8BE5\u6A21\u677F\u4F5C\u4E3A wrapper \u6765\u7EC4\u88C5\u6216\u6821\u9A8C"),
	mode: z.enum(["snippet", "full"]).optional().describe("snippet=\u4F20\u5165\u51FD\u6570\u4F53\uff0cfull=\u4F20\u5165\u5B8C\u6574\u5305\u88C5\u4EE3\u7801"),
});

export async function validateEffectCode(args: unknown) {
	try {
		const parsed = ValidateEffectCodeSchema.parse(args);
		const result = await invokeTool("validate_effect_code", {
			code: parsed.code,
			codeType: parsed.codeType,
			commandType: parsed.commandType,
			targetType: parsed.targetType,
			template: parsed.template,
			mode: parsed.mode,
		});
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to validate effect code");
	}
}

export const validateEffectCodeTools = [
	{
		name: "validate_effect_code",
		description: "\u4F7F\u7528 Monaco TS \u8BED\u8A00\u670D\u52A1\u6821\u9A8C effectCode \u7684 TypeScript \u7C7B\u578B\u3002\u53C2\u6570: code(\u4EE3\u7801\u7247\u6BB5\u6216\u5B8C\u6574\u4EE3\u7801), codeType(\u4EE3\u7801\u7C7B\u578B: chance-card/map-event/role/game-phase/modifier/property/extra-libs), commandType(\u4FEE\u9970\u5668 commandType), targetType(\u673A\u4F1A\u5361 targetType), template(\u4E0E get_code_template \u6216 get_default_code \u540C\u6E90\u7684\u5B8C\u6574\u6A21\u677F), mode(snippet/full)\u3002\u8FD4\u56DE: { valid, errors: [{ line, column, message }] }",
		inputSchema: ValidateEffectCodeSchema,
		handler: validateEffectCode,
	},
];
