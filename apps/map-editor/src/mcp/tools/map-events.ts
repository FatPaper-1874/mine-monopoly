/**
 * MCP Tools for Map Events
 */

import { z } from "zod";
import { invokeTool } from "../bridge.js";
import { successResult, errorResult } from "../utils.js";

/**
 * Zod schemas for input validation
 */
export const GetMapEventsSchema = z.object({});

export const GetMapEventByIdSchema = z.object({
	eventId: z.string().min(1, "Event ID is required"),
});

export const AddMapEventSchema = z.object({
	name: z.string().min(1, "Event name is required"),
	type: z.string().min(1, "Event type is required"),
	description: z.string().optional(),
	iconId: z.string().optional(), // 改为可选，如未提供将自动创建临时图片
	effectCode: z.string().min(1, "Effect code is required"),
});

export const UpdateMapEventSchema = z.object({
	id: z.string().min(1, "Event ID is required"),
	name: z.string().min(1, "Event name is required"),
	type: z.string().min(1, "Event type is required"),
	description: z.string().optional(),
	iconId: z.string().optional(),
	effectCode: z.string().min(1, "Effect code is required"),
});

export const RemoveMapEventSchema = z.object({
	eventId: z.string().min(1, "Event ID is required"),
});

export const LinkEventToItemSchema = z.object({
	itemId: z.string().min(1, "Item ID is required"),
	eventId: z.string().min(1, "Event ID is required"),
});

export const UnlinkEventFromItemSchema = z.object({
	itemId: z.string().min(1, "Item ID is required"),
});

/**
 * Get all map events
 */
export async function getMapEvents(args: unknown) {
	try {
		const validated = GetMapEventsSchema.parse(args);
		const result = await invokeTool("get_map_events", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to get map events");
	}
}

/**
 * Get map event by ID
 */
export async function getMapEventById(args: unknown) {
	try {
		const validated = GetMapEventByIdSchema.parse(args);
		const result = await invokeTool("get_map_event_by_id", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to get map event");
	}
}

/**
 * Add a new map event
 * 如果没有提供 iconId，将自动创建临时图片资源
 */
export async function addMapEvent(args: unknown) {
	try {
		let validated = AddMapEventSchema.parse(args);

		// 如果没有提供 iconId，自动创建临时图片
		if (!validated.iconId) {
			const tempImageResult = await invokeTool("add_temp_image", {});
			validated.iconId = tempImageResult.id;
		}

		const result = await invokeTool("add_map_event", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to add map event");
	}
}

/**
 * Update an existing map event
 */
export async function updateMapEvent(args: unknown) {
	try {
		let validated = UpdateMapEventSchema.parse(args);

		// 如果没有提供 iconId，自动创建临时图片
		if (!validated.iconId) {
			const tempImageResult = await invokeTool("add_temp_image", {});
			validated.iconId = tempImageResult.id;
		}

		const result = await invokeTool("update_map_event", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to update map event");
	}
}

/**
 * Remove a map event
 */
export async function removeMapEvent(args: unknown) {
	try {
		const validated = RemoveMapEventSchema.parse(args);
		const result = await invokeTool("remove_map_event", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to remove map event");
	}
}

/**
 * Link an event to a map item
 */
export async function linkEventToItem(args: unknown) {
	try {
		const validated = LinkEventToItemSchema.parse(args);
		const result = await invokeTool("link_event_to_item", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to link event to item");
	}
}

/**
 * Unlink an event from a map item
 */
export async function unlinkEventFromItem(args: unknown) {
	try {
		const validated = UnlinkEventFromItemSchema.parse(args);
		const result = await invokeTool("unlink_event_from_item", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to unlink event from item");
	}
}

/**
 * Export tool definitions for MCP server
 */
export const mapEventTools = [
	{
		name: "get_map_events",
		description: "获取当前地图中定义的所有地图事件",
		inputSchema: GetMapEventsSchema,
		handler: getMapEvents,
	},
	{
		name: "get_map_event_by_id",
		description: "根据ID获取特定的地图事件详情",
		inputSchema: GetMapEventByIdSchema,
		handler: getMapEventById,
	},
	{
		name: "add_map_event",
		description:
			"添加新的地图事件。地图事件是玩家到达或经过地块时的被动触发器。需要 name（名称）、type（类型）和 effectCode（效果代码）。可选参数：iconId（图标ID）、description（描述）。注意：如果不提供 iconId，系统将自动创建临时图片资源（使用占位模板）。用户后续可以在编辑器中替换为想要的图片。",
		inputSchema: AddMapEventSchema,
		handler: addMapEvent,
	},
	{
		name: "update_map_event",
		description: "更新现有的地图事件。需要 id（事件ID）、name（名称）、type（类型）和 effectCode（效果代码）。可选参数：iconId（图标ID）、description（描述）。",
		inputSchema: UpdateMapEventSchema,
		handler: updateMapEvent,
	},
	{
		name: "remove_map_event",
		description: "根据ID删除地图事件。这将同时解除它与所有地图元素的绑定。",
		inputSchema: RemoveMapEventSchema,
		handler: removeMapEvent,
	},
	{
		name: "link_event_to_item",
		description:
			"将地图事件绑定到地图元素。当玩家到达此元素时，将触发该事件。",
		inputSchema: LinkEventToItemSchema,
		handler: linkEventToItem,
	},
	{
		name: "unlink_event_from_item",
		description: "从地图元素解除（移除）事件绑定",
		inputSchema: UnlinkEventFromItemSchema,
		handler: unlinkEventFromItem,
	},
];
