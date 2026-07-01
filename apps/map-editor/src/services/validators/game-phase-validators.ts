/**
 * Validators for Game Phase Management
 */

import { z } from "zod";

/**
 * Game phase type enum
 */
export const PhaseType = z.enum([
	"gameOverRule",
	"gameInited",
	"gameRoundStart",
	"playerRound",
	"gameRoundEnd",
	"postRestore",
], {
	errorMap: () => ({ message: "Invalid phase type. Must be one of: gameOverRule, gameInited, gameRoundStart, playerRound, gameRoundEnd, postRestore" }),
});

/**
 * Phase mark enum
 */
export const PhaseMark = z.enum([
	"GameRoundStart",
	"PlayerRoundStart",
	"RollDice",
	"PlayerMove",
	"ArrivedEvent",
	"PlayerRoundEnd",
	"GameRoundEnd",
]);

/**
 * Add game phase schema
 */
export const AddPhaseSchema = z.object({
	id: z.string().min(1, "Phase ID is required"),
	name: z.string().min(1, "Phase name is required"),
	description: z.string().min(1, "Description is required"),
	phaseType: PhaseType,
	mark: PhaseMark.optional(),
	from: z.string().min(1, "From is required"),
	initEventCode: z.string().min(1, "Init event code is required"),
});

/**
 * Remove game phase schema
 */
export const RemovePhaseSchema = z.object({
	phaseId: z.string().min(1, "Phase ID is required"),
	phaseType: PhaseType,
});

/**
 * Update game phase schema
 */
export const UpdatePhaseSchema = z.object({
	phaseId: z.string().min(1, "Phase ID is required"),
	phaseType: PhaseType,
	name: z.string().min(1, "Phase name is required").optional(),
	description: z.string().min(1, "Description is required").optional(),
	mark: PhaseMark.optional(),
	initEventCode: z.string().min(1, "Init event code is required").optional(),
});

/**
 * Type exports
 */
export type PhaseType = z.infer<typeof PhaseType>;
export type PhaseMark = z.infer<typeof PhaseMark>;
export type AddPhaseInput = z.infer<typeof AddPhaseSchema>;
export type RemovePhaseInput = z.infer<typeof RemovePhaseSchema>;
export type UpdatePhaseInput = z.infer<typeof UpdatePhaseSchema>;
