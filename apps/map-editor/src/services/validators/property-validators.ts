/**
 * Validators for Property Management
 */

import { z } from "zod";

/**
 * Property data schema — 完整字段，与 PropertyInfo 对齐
 * level 和 owner 不由 AI 设置（level 默认 0，owner 运行时才有）
 */
export const PropertyDataSchema = z.object({
	name: z.string().describe("地皮名称"),
	sellCost: z.number().nonnegative("售价必须为非负数").describe("购买价格"),
	buildCost: z.number().nonnegative("建造费用必须为非负数").describe("升级费用"),
	maxLevel: z.number().int().min(1, "最大等级至少为1").describe("最大等级"),
	costList: z.array(z.number()).min(1, "过路费列表不能为空").describe("各等级过路费"),
	buildingModelIdList: z.array(z.string()).optional().describe("各等级建筑模型ID"),
	customUI: z.string().optional().describe("自定义UI模板ID"),
	effectCode: z.string().optional().describe("自定义效果代码"),
	exportData: z.record(z.any()).optional().describe("自定义扩展数据"),
});

/**
 * Add property schema
 */
export const AddPropertySchema = z.object({
	mapItemId: z.string().min(1, "Map item ID is required"),
	property: PropertyDataSchema,
});

/**
 * Update property schema — 所有字段 optional
 */
export const UpdatePropertySchema = z.object({
	mapItemId: z.string().min(1, "Map item ID is required"),
	property: PropertyDataSchema.partial(),
});

/**
 * Remove property schema
 */
export const RemovePropertySchema = z.object({
	mapItemId: z.string().min(1, "Map item ID is required"),
});

/**
 * Type exports
 */
export type PropertyData = z.infer<typeof PropertyDataSchema>;
export type AddPropertyInput = z.infer<typeof AddPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof UpdatePropertySchema>;
export type RemovePropertyInput = z.infer<typeof RemovePropertySchema>;
