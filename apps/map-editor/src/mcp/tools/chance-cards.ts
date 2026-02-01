/**
 * MCP Tools for Chance Card Management
 */

import { z } from "zod";
import { invokeTool } from "../bridge.js";
import { successResult, errorResult } from "../utils.js";

/**
 * Zod schemas for input validation
 */
export const GetChanceCardsSchema = z.object({});

export const AddChanceCardSchema = z.object({
	name: z.string().min(1, "Chance card name is required"),
	type: z.enum(["ToSelf", "ToOtherPlayer", "ToPlayer", "ToProperty", "ToMapItem"], {
		errorMap: () => ({ message: "Invalid target type. Must be one of: ToSelf, ToOtherPlayer, ToPlayer, ToProperty, ToMapItem" }),
	}),
	description: z.string().min(1, "Description is required"),
	color: z.string().min(1, "Color is required"),
	iconId: z.string().optional(), // 改为可选，如未提供将自动创建临时图片
	effectCode: z.string().min(1, "Effect code is required"),
});

export const RemoveChanceCardSchema = z.object({
	cardId: z.string().min(1, "Card ID is required"),
});

export const UpdateChanceCardSchema = z.object({
	id: z.string().min(1, "Card ID is required"),
	name: z.string().min(1, "Chance card name is required"),
	type: z.enum(["ToSelf", "ToOtherPlayer", "ToPlayer", "ToProperty", "ToMapItem"], {
		errorMap: () => ({ message: "Invalid target type. Must be one of: ToSelf, ToOtherPlayer, ToPlayer, ToProperty, ToMapItem" }),
	}),
	description: z.string().min(1, "Description is required"),
	color: z.string().min(1, "Color is required"),
	iconId: z.string().optional(),
	effectCode: z.string().min(1, "Effect code is required"),
});

/**
 * Get all chance cards
 */
export async function getChanceCards(args: unknown) {
	try {
		const validated = GetChanceCardsSchema.parse(args);
		const result = await invokeTool("get_chance_cards", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to get chance cards");
	}
}

/**
 * Add a new chance card
 * 如果没有提供 iconId，将自动创建临时图片资源
 */
export async function addChanceCard(args: unknown) {
	try {
		let validated = AddChanceCardSchema.parse(args);

		// 如果没有提供 iconId，自动创建临时图片
		if (!validated.iconId) {
			const tempImageResult = await invokeTool("add_temp_image", {});
			validated.iconId = tempImageResult.id;
		}

		const result = await invokeTool("add_chance_card", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to add chance card");
	}
}

/**
 * Update an existing chance card
 */
export async function updateChanceCard(args: unknown) {
	try {
		let validated = UpdateChanceCardSchema.parse(args);

		// 如果没有提供 iconId，自动创建临时图片
		if (!validated.iconId) {
			const tempImageResult = await invokeTool("add_temp_image", {});
			validated.iconId = tempImageResult.id;
		}

		const result = await invokeTool("update_chance_card", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to update chance card");
	}
}

/**
 * Remove a chance card
 */
export async function removeChanceCard(args: unknown) {
	try {
		const validated = RemoveChanceCardSchema.parse(args);
		const result = await invokeTool("remove_chance_card", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to remove chance card");
	}
}

/**
 * Export tool definitions for MCP server
 */
export const chanceCardTools = [
	{
		name: "get_chance_cards",
		description: "获取当前地图中定义的所有机会卡",
		inputSchema: GetChanceCardsSchema,
		handler: getChanceCards,
	},
	{
		name: "add_chance_card",
		description:
			"添加新的机会卡。机会卡是玩家可以购买并在其回合中主动使用的物品。区别说明：机会卡不是地图事件 - 地图事件是玩家到达地块时的被动触发器，而机会卡是玩家主动选择使用的物品。重要编码规则：1) 编写 effectCode 时，始终对命令/修饰器模式调用使用 'await'，如 'await targetPlayer.gain(money)'、'await targetPlayer.cost(money)'、'await sourcePlayer.gainProperty(property)' 等。2) Buff 是由修饰器驱动的状态 - 修饰器中的 'meta' 字段将在客户端渲染为 buff。3) effectCode 签名因类型而异：对于 ToSelf/ToOtherPlayer/ToPlayer：(sourcePlayer: IPlayer, target: IPlayer | IPlayer[], gameProcess: IGameProcess) => Promise<void>。对于 ToProperty/ToMapItem：(sourcePlayer: IPlayer, target: IProperty | IProperty[], gameProcess: IGameProcess) => Promise<void>。需要 name（名称）、type（类型）、description（描述）、color（颜色）和 effectCode（效果代码）。可选参数：iconId（图标ID）。注意：如果不提供 iconId，系统将自动创建临时图片资源（使用占位模板）。用户后续可以在编辑器中替换为想要的图片。",
		inputSchema: AddChanceCardSchema,
		handler: addChanceCard,
	},
	{
		name: "update_chance_card",
		description: "更新现有的机会卡。需要 id（卡片ID）、name（名称）、type（类型）、description（描述）、color（颜色）和 effectCode（效果代码）。可选参数：iconId（图标ID）。",
		inputSchema: UpdateChanceCardSchema,
		handler: updateChanceCard,
	},
	{
		name: "remove_chance_card",
		description: "根据ID删除机会卡",
		inputSchema: RemoveChanceCardSchema,
		handler: removeChanceCard,
	},
];
