/**
 * MCP Tool for Getting Default Code Templates
 *
 * Returns the default code template from default-code directory based on phase type.
 * This ensures AI skills get the correct wrapper format when modifying game phases.
 */

import { z } from "zod";
import { successResult } from "../utils.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Schema definitions
const PhaseTypeEnum = z.enum([
  "gameOverRule",
  "gameInited",
  "gameRoundStart",
  "gameRoundEnd",
  "playerPreInit",
  "propertyPreInit",
  "playerRoundStart",
  "rollDice",
  "playerMove",
  "arrivedEvent",
  "playerRoundEnd",
  "postRestore",
]);

const GetDefaultCodeSchema = z.object({
  phaseType: PhaseTypeEnum.describe("阶段类型"),
});

// File name mapping
const FILE_NAME_MAP: Record<string, string> = {
  gameOverRule: "game-over-rule.txt",
  gameInited: "game-inited-phase.txt",
  gameRoundStart: "game-round-start-phase.txt",
  gameRoundEnd: "game-round-end-phase.txt",
  playerPreInit: "player-pre-init-phase.txt",
  propertyPreInit: "property-pre-init-phase.txt",
  playerRoundStart: "player-round-start-phase.txt",
  rollDice: "roll-dice-phase.txt",
  playerMove: "player-move-phase.txt",
  arrivedEvent: "arrived-event-phase.txt",
  playerRoundEnd: "player-round-end-phase.txt",
  postRestore: "post-restore-phase.txt",
};

export async function getDefaultCode(args: unknown) {
  const parsed = GetDefaultCodeSchema.parse(args);
  const { phaseType } = parsed;

  const fileName = FILE_NAME_MAP[phaseType];
  if (!fileName) {
    return successResult({ template: "", error: "Unknown phase type" });
  }

  const templatePath = join(
    __dirname,
    "../../../views/map-editor/components/manager/process-manager/default-code",
    fileName
  );

  try {
    const template = readFileSync(templatePath, "utf-8");
    return successResult({ template, phaseType });
  } catch (error) {
    return successResult({ template: "", error: (error as Error).message });
  }
}

export const getDefaultCodeTools = [
  {
    name: "get_default_code",
    description: "获取游戏阶段默认代码模板。从 default-code 目录读取指定阶段类型的初始代码模板，包含完整的代码包围格式（如 as GameEventFunction<ContextType>;）。参数: phaseType(阶段类型)。返回: { template, phaseType }",
    inputSchema: GetDefaultCodeSchema,
    handler: getDefaultCode,
  },
];
