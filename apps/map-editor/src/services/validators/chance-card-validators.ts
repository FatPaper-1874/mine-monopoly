/**
 * Chance Card Validator
 *
 * Zod schemas for validating chance card data structures.
 * This ensures data integrity for both UI forms and MCP operations.
 */

import { z } from "zod";

/**
 * Chance card type enumeration
 * Matches TargetSelectType enum from packages/types/enums/game/game.ts
 */
export const chanceCardTypeEnum = z.enum([
	"ToSelf",
	"ToOtherPlayer",
	"ToPlayer",
	"ToProperty",
	"ToMapItem",
]);

/**
 * Chance card creation/update schema
 */
export const chanceCardSchema = z.object({
	id: z.string().optional(),
	name: z.string().min(1, "Name is required"),
	description: z.string().min(1, "Description is required"),
	type: chanceCardTypeEnum,
	color: z.string().min(1, "Color is required"),
	iconId: z.string().optional(),
	effectCode: z.string().min(1, "Effect code is required"),
});

/**
 * Add chance card schema (iconId is optional, will be auto-generated if not provided)
 */
export const AddChanceCardSchema = chanceCardSchema;

/**
 * Update chance card schema (requires id field)
 */
export const UpdateChanceCardSchema = chanceCardSchema.extend({
	id: z.string().min(1, "Card ID is required"),
	originalId: z.string().min(1, "Original card ID is required").optional(),
});

/**
 * Remove chance card schema (requires cardId)
 */
export const RemoveChanceCardSchema = z.object({
	cardId: z.string().min(1, "Card ID is required"),
});

/**
 * Chance card list item schema
 */
export const chanceCardListItemSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: chanceCardTypeEnum,
});

// Export types inferred from schemas
export type ChanceCard = z.infer<typeof chanceCardSchema>;
export type ChanceCardType = z.infer<typeof chanceCardTypeEnum>;
export type ChanceCardListItem = z.infer<typeof chanceCardListItemSchema>;
