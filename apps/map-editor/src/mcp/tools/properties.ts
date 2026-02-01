/**
 * MCP Tools for Property Management
 */

import { z } from "zod";
import { invokeTool } from "../bridge.js";
import { successResult, errorResult } from "../utils.js";

/**
 * Zod schemas for input validation
 */
export const AddPropertySchema = z.object({
	mapItemId: z.string().min(1, "Map item ID is required"),
	property: z.object({
		price: z.number().nonnegative(),
		rent: z.number().nonnegative(),
		// Add other property fields as needed
	}),
});

export const UpdatePropertySchema = z.object({
	mapItemId: z.string().min(1, "Map item ID is required"),
	property: z.object({
		price: z.number().nonnegative(),
		rent: z.number().nonnegative(),
		// Add other property fields as needed
	}),
});

export const RemovePropertySchema = z.object({
	mapItemId: z.string().min(1, "Map item ID is required"),
});

/**
 * Add property to a map item
 */
export async function addProperty(args: unknown) {
	try {
		const validated = AddPropertySchema.parse(args);
		const result = await invokeTool("add_property", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to add property");
	}
}

/**
 * Update property on a map item
 */
export async function updateProperty(args: unknown) {
	try {
		const validated = UpdatePropertySchema.parse(args);
		const result = await invokeTool("update_property", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to update property");
	}
}

/**
 * Remove property from a map item
 */
export async function removeProperty(args: unknown) {
	try {
		const validated = RemovePropertySchema.parse(args);
		const result = await invokeTool("remove_property", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to remove property");
	}
}

/**
 * Export tool definitions for MCP server
 */
export const propertyTools = [
	{
		name: "add_property",
		description: "为地图元素添加地产属性。需要 mapItemId（地图元素ID）和 property（地产属性对象，包含 price、rent 等字段）",
		inputSchema: AddPropertySchema,
		handler: addProperty,
	},
	{
		name: "update_property",
		description: "更新地图元素的地产属性。需要 mapItemId（地图元素ID）和 property（地产属性对象，包含 price、rent 等字段）",
		inputSchema: UpdatePropertySchema,
		handler: updateProperty,
	},
	{
		name: "remove_property",
		description: "从地图元素移除地产属性。需要 mapItemId（地图元素ID）",
		inputSchema: RemovePropertySchema,
		handler: removeProperty,
	},
];
