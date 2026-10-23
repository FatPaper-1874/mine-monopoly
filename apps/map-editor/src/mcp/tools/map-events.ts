/**
 * MCP Tools for Map Event Management
 *
 * This module provides CRUD operations for map events through the IPC Bridge.
 * All business logic, validation, and event notifications are handled by mapContentService
 * in the renderer process via the bridge.
 */

import { invokeTool } from "../bridge.js";
import { successResult, errorResult } from "../utils.js";
import { z } from "zod";
import type { MapEvent } from "@src/services/validators/map-event-validators";

/**
 * Zod schemas for MCP tool registration
 */
const AddMapEventToolSchema = z.object({
	id: z.string().optional().describe("自定义ID（可选，留空自动生成）"),
	name: z.string().describe("地图事件名称"),
	type: z.string().describe("地图事件类型"),
	description: z.string().optional().describe("地图事件描述"),
	iconId: z.string().optional().describe("图标ID"),
	effectCode: z.string().optional().describe("效果代码"),
});

const UpdateMapEventToolSchema = z.object({
	id: z.string().describe("地图事件ID"),
	originalId: z.string().min(1).optional().describe("重命名前的ID；修改ID时必填"),
	name: z.string().describe("地图事件名称"),
	type: z.string().describe("地图事件类型"),
	description: z.string().optional().describe("地图事件描述"),
	iconId: z.string().optional().describe("图标ID"),
	effectCode: z.string().optional().describe("效果代码"),
});

const RemoveMapEventToolSchema = z.object({
	eventId: z.string().describe("地图事件ID"),
});

const GetMapEventByIdToolSchema = z.object({
	eventId: z.string().describe("地图事件ID"),
});

const ListMapEventsToolSchema = z.object({});

/**
 * Add a new map event
 */
export async function addMapEvent(args: unknown) {
	try {
		const result = await invokeTool("add_map_event", args);
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
		const result = await invokeTool("update_map_event", args);
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
		const result = await invokeTool("remove_map_event", args);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to remove map event");
	}
}

/**
 * Get a map event with full details
 */
export async function getMapEventById(args: unknown) {
	try {
		const result = await invokeTool("get_map_event_by_id", args);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to get map event");
	}
}

/**
 * List all map events
 */
export async function listMapEvents(args: unknown) {
	try {
		const result = await invokeTool("list_map_events", args);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to list map events");
	}
}

/**
 * Export tool definitions for MCP server
 */
export const mapEventTools = [
	{
		name: "add_map_event",
		description: "添加新地图事件。参数：id?（自定义ID）, name（名称）, type（类型）, description?（描述，可选）, iconId?（图标ID，可选）, effectCode?（效果代码，可选）",
		inputSchema: AddMapEventToolSchema,
		handler: addMapEvent
	},
	{
		name: "update_map_event",
		description: "更新地图事件。参数：id（保存后的ID）, originalId?（重命名前的ID）, name, type, description?, iconId?, effectCode?",
		inputSchema: UpdateMapEventToolSchema,
		handler: updateMapEvent
	},
	{
		name: "remove_map_event",
		description: "删除地图事件。参数：eventId（事件ID）",
		inputSchema: RemoveMapEventToolSchema,
		handler: removeMapEvent
	},
	{
		name: "get_map_event_by_id",
		description: "根据ID获取单个地图事件的完整信息，包含 effectCode。参数：eventId（地图事件ID）",
		inputSchema: GetMapEventByIdToolSchema,
		handler: getMapEventById
	},
	{
		name: "list_map_events",
		description: "获取当前地图中所有地图事件的摘要列表，包含 ID、名称、类型、描述和图标ID；不包含 effectCode。使用 get_map_event_by_id 获取完整数据。",
		inputSchema: ListMapEventsToolSchema,
		handler: listMapEvents
	}
];