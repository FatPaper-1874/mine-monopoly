/**
 * MCP Tools for Chance Card Management
 *
 * This module provides CRUD operations for chance cards through the IPC Bridge.
 * All business logic, validation, and event notifications are handled by mapContentService
 * in the renderer process via the bridge.
 */

import { invokeTool } from "../bridge.js";
import { successResult, errorResult } from "../utils.js";
import { z } from "zod";
import type { ChanceCard } from "@src/services/validators/chance-card-validators";

/**
 * Zod schemas for MCP tool registration
 */
const AddChanceCardToolSchema = z.object({
	id: z.string().optional().describe("自定义ID（可选，留空自动生成）"),
	name: z.string().describe("机会卡名称"),
	type: z.enum(["ToSelf", "ToOtherPlayer", "ToPlayer", "ToProperty", "ToMapItem"]).describe("机会卡类型"),
	description: z.string().describe("机会卡描述"),
	color: z.string().describe("机会卡颜色"),
	iconId: z.string().optional().describe("图标ID"),
	effectCode: z.string().describe("效果代码"),
});

const UpdateChanceCardToolSchema = z.object({
	id: z.string().describe("机会卡ID"),
	originalId: z.string().min(1).optional().describe("重命名前的ID；修改ID时必填"),
	name: z.string().describe("机会卡名称"),
	type: z.enum(["ToSelf", "ToOtherPlayer", "ToPlayer", "ToProperty", "ToMapItem"]).describe("机会卡类型"),
	description: z.string().describe("机会卡描述"),
	color: z.string().describe("机会卡颜色"),
	iconId: z.string().optional().describe("图标ID"),
	effectCode: z.string().describe("效果代码"),
});

const RemoveChanceCardToolSchema = z.object({
	cardId: z.string().describe("机会卡ID"),
});

const GetChanceCardByIdToolSchema = z.object({
	cardId: z.string().describe("机会卡ID"),
});

const ListChanceCardsToolSchema = z.object({});

/**
 * Add a new chance card
 */
export async function addChanceCard(args: unknown) {
	try {
		const result = await invokeTool("add_chance_card", args);
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
		const result = await invokeTool("update_chance_card", args);
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
		const result = await invokeTool("remove_chance_card", args);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to remove chance card");
	}
}

/**
 * Get a chance card with full details
 */
export async function getChanceCardById(args: unknown) {
	try {
		const result = await invokeTool("get_chance_card_by_id", args);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to get chance card");
	}
}

/**
 * List all chance cards
 */
export async function listChanceCards(args: unknown) {
	try {
		const result = await invokeTool("list_chance_cards", args);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to list chance cards");
	}
}

/**
 * Export tool definitions for MCP server
 */
export const chanceCardTools = [
	{
		name: "add_chance_card",
		description: "添加新的机会卡。参数：id?（自定义ID）, name（名称）, type（类型：attack/defense/buff/debuff/special）, description（描述）, color（颜色，如#FF0000）, iconId?（图标ID，可选）, effectCode（效果代码）",
		inputSchema: AddChanceCardToolSchema,
		handler: addChanceCard
	},
	{
		name: "update_chance_card",
		description: "更新机会卡。参数：id（保存后的ID）, originalId?（重命名前的ID）, name, type, description, color, iconId?, effectCode",
		inputSchema: UpdateChanceCardToolSchema,
		handler: updateChanceCard
	},
	{
		name: "remove_chance_card",
		description: "删除机会卡。参数：cardId（机会卡ID）",
		inputSchema: RemoveChanceCardToolSchema,
		handler: removeChanceCard
	},
	{
		name: "get_chance_card_by_id",
		description: "根据ID获取单个机会卡的完整信息，包含 effectCode。参数：cardId（机会卡ID）",
		inputSchema: GetChanceCardByIdToolSchema,
		handler: getChanceCardById
	},
	{
		name: "list_chance_cards",
		description: "获取当前地图中所有机会卡的摘要列表，包含 ID、名称、类型、描述、颜色和图标ID；不包含 effectCode。使用 get_chance_card_by_id 获取完整数据。",
		inputSchema: ListChanceCardsToolSchema,
		handler: listChanceCards
	}
];