/**
 * MCP Tools for Role Management
 *
 * This module provides CRUD operations for roles through the IPC Bridge.
 * All business logic, validation, and event notifications are handled by mapContentService
 * in the renderer process via the bridge.
 */

import { invokeTool } from "../bridge.js";
import { successResult, errorResult } from "../utils.js";
import { z } from "zod";
import type { Role } from "@src/services/validators/role-validators";

/**
 * Zod schemas for MCP tool registration
 */
const AddRoleToolSchema = z.object({
	name: z.string().describe("角色名称"),
	description: z.string().optional().describe("角色描述"),
	color: z.string().optional().describe("角色颜色"),
	initCode: z.string().optional().describe("初始化代码"),
	imageId: z.string().optional().describe("图片ID"),
});

const UpdateRoleToolSchema = z.object({
	roleId: z.string().describe("当前角色ID"),
	id: z.string().min(1).optional().describe("新的角色ID（可选，用于重命名）"),
	name: z.string().optional().describe("角色名称"),
	description: z.string().optional().describe("角色描述"),
	color: z.string().optional().describe("角色颜色"),
	initCode: z.string().optional().describe("初始化代码"),
	imageId: z.string().optional().describe("图片ID"),
});

const RemoveRoleToolSchema = z.object({
	roleId: z.string().describe("角色ID"),
});

const GetRoleByIdToolSchema = z.object({
	roleId: z.string().describe("角色ID"),
});

const ListRolesToolSchema = z.object({});

/**
 * Add a new role
 */
export async function addRole(args: unknown) {
	try {
		const result = await invokeTool("add_role", args);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to add role");
	}
}

/**
 * Update an existing role
 */
export async function updateRole(args: unknown) {
	try {
		const result = await invokeTool("update_role", args);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to update role");
	}
}

/**
 * Remove a role
 */
export async function removeRole(args: unknown) {
	try {
		const result = await invokeTool("remove_role", args);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to remove role");
	}
}

/**
 * Get a role with full details
 */
export async function getRoleById(args: unknown) {
	try {
		const result = await invokeTool("get_role_by_id", args);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to get role");
	}
}

/**
 * List all roles
 */
export async function listRoles(args: unknown) {
	try {
		const result = await invokeTool("list_roles", args);
		return successResult(result);
	} catch (error: any) {
		return errorResult(error.message || "Failed to list roles");
	}
}

/**
 * Export tool definitions for MCP server
 */
export const roleTools = [
	{
		name: "add_role",
		description: "添加新角色。参数：name（名称）, description?（描述，可选）, color?（颜色，可选）, initCode?（初始化代码，可选）, imageId?（图片ID，可选）",
		inputSchema: AddRoleToolSchema,
		handler: addRole
	},
	{
		name: "update_role",
		description: "更新角色。参数：roleId（当前角色ID）, id?（新的角色ID）, name?, description?, color?, initCode?, imageId?",
		inputSchema: UpdateRoleToolSchema,
		handler: updateRole
	},
	{
		name: "remove_role",
		description: "删除角色。参数：roleId（角色ID）",
		inputSchema: RemoveRoleToolSchema,
		handler: removeRole
	},
	{
		name: "get_role_by_id",
		description: "根据ID获取单个角色的完整信息，包含 initCode。参数：roleId（角色ID）",
		inputSchema: GetRoleByIdToolSchema,
		handler: getRoleById
	},
	{
		name: "list_roles",
		description: "获取当前地图中所有角色的摘要列表，包含 ID、名称、描述、颜色和图片ID；不包含 initCode。使用 get_role_by_id 获取完整数据。",
		inputSchema: ListRolesToolSchema,
		handler: listRoles
	}
];