/**
 * Role Validator
 *
 * Zod schemas for validating role (player character) data structures.
 * This ensures data integrity for both UI forms and MCP operations.
 */

import { z } from "zod";

/**
 * Role creation/update schema
 */
export const roleSchema = z.object({
	id: z.string().optional(),
	name: z.string().min(1, "Name is required"),
	description: z.string().optional(),
	imageId: z.string().optional(),
	color: z.string().optional(),
	initCode: z.string().optional(),
});

/**
 * Add role schema (imageId is optional, will be auto-generated if not provided)
 */
export const AddRoleSchema = roleSchema;

/**
 * Update role schema (requires roleId field)
 */
export const UpdateRoleSchema = z.object({
	roleId: z.string().min(1, "Role ID is required"),
	id: z.string().min(1, "Role ID is required").optional(),
	name: z.string().optional(),
	description: z.string().optional(),
	color: z.string().optional(),
	initCode: z.string().optional(),
	imageId: z.string().optional(),
});

/**
 * Remove role schema (requires roleId)
 */
export const RemoveRoleSchema = z.object({
	roleId: z.string().min(1, "Role ID is required"),
});

/**
 * Role list item schema
 */
export const roleListItemSchema = z.object({
	id: z.string(),
	name: z.string(),
	imageId: z.string().optional(),
});

// Export types inferred from schemas
export type Role = z.infer<typeof roleSchema>;
export type RoleListItem = z.infer<typeof roleListItemSchema>;
