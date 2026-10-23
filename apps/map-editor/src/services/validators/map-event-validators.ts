/**
 * Map Event Validator
 *
 * Zod schemas for validating map event data structures.
 * This ensures data integrity for both UI forms and MCP operations.
 */

import { z } from "zod";

/**
 * Map event creation/update schema
 */
export const mapEventSchema = z.object({
	id: z.string().optional(),
	type: z.string().min(1, "Event type is required"),
	name: z.string().min(1, "Name is required"),
	description: z.string().optional(),
	iconId: z.string().optional(),
	effectCode: z.string().min(1, "Effect code is required"),
});

/**
 * Add map event schema (iconId is optional, will be auto-generated if not provided)
 */
export const AddMapEventSchema = mapEventSchema;

/**
 * Update map event schema (requires id field)
 */
export const UpdateMapEventSchema = mapEventSchema.extend({
	id: z.string().min(1, "Event ID is required"),
	originalId: z.string().min(1, "Original event ID is required").optional(),
});

/**
 * Remove map event schema (requires eventId)
 */
export const RemoveMapEventSchema = z.object({
	eventId: z.string().min(1, "Event ID is required"),
});

/**
 * Map event list item schema
 */
export const mapEventListItemSchema = z.object({
	id: z.string(),
	type: z.string(),
	name: z.string(),
});

// Export types inferred from schemas
export type MapEvent = z.infer<typeof mapEventSchema>;
export type MapEventListItem = z.infer<typeof mapEventListItemSchema>;
