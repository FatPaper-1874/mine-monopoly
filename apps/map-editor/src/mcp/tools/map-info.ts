/**
 * MCP Tools for Map Information
 */

import { z } from "zod";
import { invokeTool } from "../bridge.js";
import { successResult, errorResult } from "../utils.js";

/**
 * Zod schemas for input validation
 */
export const GetMapInfoSchema = z.object({});

export const UpdateMapInfoSchema = z
	.object({
		name: z.string().optional(),
		author: z.string().optional(),
		version: z
			.object({
				major: z.number().int().nonnegative(),
				minor: z.number().int().nonnegative(),
				patch: z.number().int().nonnegative(),
			})
			.optional(),
		description: z.string().optional(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field must be provided",
	});

export const GetMapSummarySchema = z.object({});

export const SetBackgroundImageSchema = z.object({
	id: z.string().min(1, "Image ID is required"),
});

export const SetCoverImageSchema = z.object({
	id: z.string().min(1, "Image ID is required"),
});

/**
 * Get map metadata
 */
export async function getMapInfo(args: unknown) {
	try {
		const validated = GetMapInfoSchema.parse(args);
		const result = await invokeTool("get_map_info", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to get map info");
	}
}

/**
 * Update map metadata
 */
export async function updateMapInfo(args: unknown) {
	try {
		const validated = UpdateMapInfoSchema.parse(args);
		const result = await invokeTool("update_map_info", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to update map info");
	}
}

/**
 * Get map summary statistics
 */
export async function getMapSummary(args: unknown) {
	try {
		const validated = GetMapSummarySchema.parse(args);
		const result = await invokeTool("get_map_summary", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to get map summary");
	}
}

/**
 * Set background image
 */
export async function setBackgroundImage(args: unknown) {
	try {
		const validated = SetBackgroundImageSchema.parse(args);
		const result = await invokeTool("set_background_image", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to set background image");
	}
}

/**
 * Set cover image
 */
export async function setCoverImage(args: unknown) {
	try {
		const validated = SetCoverImageSchema.parse(args);
		const result = await invokeTool("set_cover_image", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to set cover image");
	}
}

/**
 * Export tool definitions for MCP server
 */
export const mapInfoTools = [
	{
		name: "get_map_info",
		description: "获取当前地图的元数据，包括名称、作者、版本和描述信息",
		inputSchema: GetMapInfoSchema,
		handler: getMapInfo,
	},
	{
		name: "update_map_info",
		description: "更新地图的元数据信息。至少需要提供一个字段：name（名称）、author（作者）、version（版本）或 description（描述）",
		inputSchema: UpdateMapInfoSchema,
		handler: updateMapInfo,
	},
	{
		name: "get_map_summary",
		description: "获取地图的统计摘要信息，包括总元素数、事件数、角色数和资源数量",
		inputSchema: GetMapSummarySchema,
		handler: getMapSummary,
	},
	{
		name: "set_background_image",
		description: "设置地图背景图片。需要 id（图片资源ID）",
		inputSchema: SetBackgroundImageSchema,
		handler: setBackgroundImage,
	},
	{
		name: "set_cover_image",
		description: "设置地图封面图片。需要 id（图片资源ID）",
		inputSchema: SetCoverImageSchema,
		handler: setCoverImage,
	},
];
