/**
 * MCP Tools for Resource Management
 */

import { z } from "zod";
import { invokeTool } from "../bridge.js";
import { successResult, errorResult } from "../utils.js";

/**
 * Zod schemas for input validation
 */
export const ListModelsSchema = z.object({});

export const ListImagesSchema = z.object({});

export const GetResourceByIdSchema = z.object({
	resourceId: z.string().min(1, "Resource ID is required"),
	type: z.enum(["model", "image"], {
		errorMap: () => ({ message: "Type must be either 'model' or 'image'" }),
	}),
});

const ResourceNameSchema = z.string().trim().min(1, "Resource name cannot be empty").max(64, "Resource name is too long");

export const AddTempModelSchema = z.object({
	name: ResourceNameSchema.optional().describe("资源名称（可选，缺省时自动生成不重名的“临时模型 N”）"),
});

export const AddTempImageSchema = z.object({
	name: ResourceNameSchema.optional().describe("资源名称（可选，缺省时自动生成不重名的“临时图片 N”）"),
});

export const UpdateResourceSchema = z.object({
	resourceId: z.string().min(1, "Resource ID is required"),
	type: z.enum(["model", "image"], {
		errorMap: () => ({ message: "Type must be either 'model' or 'image'" }),
	}),
	name: ResourceNameSchema.describe("新的资源名称"),
});
export const ListResourcesSchema = z.object({
	type: z.enum(["model", "image"]).optional(),
	query: z.string().optional(),
	offset: z.number().int().min(0).default(0),
	limit: z.number().int().min(1).max(200).default(50),
});

/**
 * List all 3D models
 */
export async function listModels(args: unknown) {
	try {
		const validated = ListModelsSchema.parse(args);
		const result = await invokeTool("list_models", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to list models");
	}
}

/**
 * List all images
 */
export async function listImages(args: unknown) {
	try {
		const validated = ListImagesSchema.parse(args);
		const result = await invokeTool("list_images", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to list images");
	}
}

/**
 * Get a resource by ID
 */
export async function getResourceById(args: unknown) {
	try {
		const validated = GetResourceByIdSchema.parse(args);
		const result = await invokeTool("get_resource_by_id", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to get resource");
	}
}

export async function listResources(args: unknown) {
	try {
		return successResult(await invokeTool("list_resources", ListResourcesSchema.parse(args)));
	} catch (error: any) {
		return errorResult(error.message || "Failed to list resources");
	}
}

/**
 * Add a temporary model using empty.glb template
 */
export async function addTempModel(args: unknown) {
	try {
		const validated = AddTempModelSchema.parse(args);
		const result = await invokeTool("add_temp_model", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to add temporary model");
	}
}

/**
 * Add a temporary image using empty.png template
 */
export async function addTempImage(args: unknown) {
	try {
		const validated = AddTempImageSchema.parse(args);
		const result = await invokeTool("add_temp_image", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to add temporary image");
	}
}

/**
 * Rename a model or image resource
 */
export async function updateResource(args: unknown) {
	try {
		const validated = UpdateResourceSchema.parse(args);
		const result = await invokeTool("update_resource", validated);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to update resource");
	}
}

/**
 * Export tool definitions for MCP server
 */
export const resourceTools = [
	{
		name: "list_models",
		description: "列出地图中所有可用的3D模型，包括它们的ID、名称和URL",
		inputSchema: ListModelsSchema,
		handler: listModels,
	},
	{
		name: "list_images",
		description: "列出地图中所有可用的图片，包括它们的ID、名称和URL",
		inputSchema: ListImagesSchema,
		handler: listImages,
	},
	{
		name: "list_resources",
		description: "按资源类型和名称筛选资源，并分页返回。",
		inputSchema: ListResourcesSchema,
		handler: listResources,
	},
	{
		name: "get_resource_by_id",
		description:
			"根据ID获取特定资源的详细信息。需要 resourceId（资源ID）和 type（类型，'model' 或 'image'）",
		inputSchema: GetResourceByIdSchema,
		handler: getResourceById,
	},
	{
		name: "add_temp_model",
		description: "添加一个临时3D模型资源（使用 empty.glb 作为模板）。可选参数 name 指定资源名称。返回新创建的模型信息，包括 id、name、fileType 和 url。",
		inputSchema: AddTempModelSchema,
		handler: addTempModel,
	},
	{
		name: "add_temp_image",
		description: "添加一个临时图片资源（使用 empty.png 作为模板）。可选参数 name 指定资源名称。返回新创建的图片信息，包括 id、name、fileType 和 url。",
		inputSchema: AddTempImageSchema,
		handler: addTempImage,
	},
	{
		name: "update_resource",
		description: "重命名模型或图片资源。只修改显示名称，资源 ID 和文件不变，已有引用不受影响。需要 resourceId、type（'model' 或 'image'）和 name。",
		inputSchema: UpdateResourceSchema,
		handler: updateResource,
	},
];
