/**
 * MCP Tools for Property Management
 *
 * This module provides CRUD operations for properties (地皮) through the IPC Bridge.
 * All business logic is handled by mapContentService in the renderer process.
 */

import { invokeTool } from "../bridge.js";
import { successResult, errorResult } from "../utils.js";
import { z } from "zod";

const AddPropertyToolSchema = z.object({
	mapItemId: z.string().describe("目标地图项ID"),
	name: z.string().describe("地皮名称"),
	sellCost: z.number().describe("购买价格"),
	buildCost: z.number().describe("升级费用"),
	maxLevel: z.number().int().min(1).describe("最大等级"),
	costList: z.array(z.number()).min(1).describe("各等级过路费"),
	buildingModelIdList: z.array(z.string()).optional().describe("各等级建筑模型ID"),
	customUI: z.string().optional().describe("自定义UI模板ID"),
	effectCode: z.string().optional().describe("自定义效果代码"),
	exportData: z.record(z.any()).optional().describe("自定义扩展数据"),
});

const UpdatePropertyToolSchema = z.object({
	mapItemId: z.string().describe("目标地图项ID"),
	name: z.string().optional().describe("地皮名称"),
	sellCost: z.number().optional().describe("购买价格"),
	buildCost: z.number().optional().describe("升级费用"),
	maxLevel: z.number().int().min(1).optional().describe("最大等级"),
	costList: z.array(z.number()).min(1).optional().describe("各等级过路费"),
	buildingModelIdList: z.array(z.string()).optional().describe("各等级建筑模型ID"),
	customUI: z.string().optional().describe("自定义UI模板ID"),
	effectCode: z.string().optional().describe("自定义效果代码"),
	exportData: z.record(z.any()).optional().describe("自定义扩展数据"),
});

const RemovePropertyToolSchema = z.object({
	mapItemId: z.string().describe("目标地图项ID"),
});

/**
 * Wrap flat MCP args into { mapItemId, property: {...} } format expected by service layer
 */
function wrapPropertyArgs(args: any, required = false): any {
	const { mapItemId, ...rest } = args as Record<string, any>;
	// MCP clients may serialize object params as JSON strings; auto-parse them
	if (typeof rest.exportData === 'string') {
		try { rest.exportData = JSON.parse(rest.exportData); } catch {}
	}
	const property = required ? rest : Object.fromEntries(
		Object.entries(rest).filter(([, v]) => v !== undefined)
	);
	return { mapItemId, property };
}

/**
 * Add property to a map item
 */
export async function addProperty(args: unknown) {
	try {
		const result = await invokeTool("add_property", wrapPropertyArgs(args, true));
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
		const result = await invokeTool("update_property", wrapPropertyArgs(args));
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
		const result = await invokeTool("remove_property", args);
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
		description: "为地图项添加地皮属性。参数：mapItemId（目标地图项ID）, name（名称）, sellCost（购买价格）, buildCost（升级费用）, maxLevel（最大等级）, costList（各等级过路费数组）, buildingModelIdList?（建筑模型ID数组）, customUI?（自定义UI）, effectCode?（自定义效果代码）, exportData?（扩展数据）",
		inputSchema: AddPropertyToolSchema,
		handler: addProperty,
	},
	{
		name: "update_property",
		description: "更新地图项的地皮属性。参数：mapItemId（目标地图项ID），其余字段均为可选，只传需要更新的。支持更新：name, sellCost, buildCost, maxLevel, costList, buildingModelIdList, customUI, effectCode, exportData",
		inputSchema: UpdatePropertyToolSchema,
		handler: updateProperty,
	},
	{
		name: "remove_property",
		description: "移除地图项的地皮属性。参数：mapItemId（目标地图项ID）",
		inputSchema: RemovePropertyToolSchema,
		handler: removeProperty,
	},
];