/**
 * MCP Tools for Map Item Type Management
 */

import { z } from "zod";
import { invokeTool } from "../bridge.js";
import { successResult, errorResult } from "../utils.js";

/**
 * Zod schemas for input validation
 */
export const GetMapItemTypesSchema = z.object({});

export const AddMapItemTypeSchema = z.object({
	id: z.string().min(1, "Type ID is required"),
	name: z.string().min(1, "Type name is required"),
	modelId: z.string().min(1, "Model ID is required"),
});

export const RemoveMapItemTypeSchema = z.object({
	id: z.string().min(1, "Type ID is required"),
});

/**
 * Get all map item types
 */
export async function getMapItemTypes(args: unknown) {
	try {
		const validated = GetMapItemTypesSchema.parse(args);
		const result = await invokeTool("get_map_item_types", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to get map item types");
	}
}

/**
 * Add a new map item type
 */
export async function addMapItemType(args: unknown) {
	try {
		const validated = AddMapItemTypeSchema.parse(args);
		const result = await invokeTool("add_map_item_type", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to add map item type");
	}
}

/**
 * Remove a map item type
 */
export async function removeMapItemType(args: unknown) {
	try {
		const validated = RemoveMapItemTypeSchema.parse(args);
		const result = await invokeTool("remove_map_item_type", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to remove map item type");
	}
}

/**
 * Export tool definitions for MCP server
 */
export const mapItemTypeTools = [
	{
		name: "get_map_item_types",
		description: "获取当前地图中定义的所有地图元素类型",
		inputSchema: GetMapItemTypesSchema,
		handler: getMapItemTypes,
	},
	{
		name: "add_map_item_type",
		description: "添加新的地图元素类型。需要 id（类型ID）、name（类型名称）和 modelId（关联的3D模型ID）",
		inputSchema: AddMapItemTypeSchema,
		handler: addMapItemType,
	},
	{
		name: "remove_map_item_type",
		description: "根据ID删除地图元素类型。这将同时删除使用此类型的所有地图元素。",
		inputSchema: RemoveMapItemTypeSchema,
		handler: removeMapItemType,
	},
];
