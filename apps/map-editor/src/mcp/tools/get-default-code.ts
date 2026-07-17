/**
 * MCP Tool for Getting Default Code Templates
 *
 * Returns the default code template from default-code directory based on phase type.
 * These files are the same source used by the phase initialization defaults.
 */

import { z } from "zod";
import { successResult } from "../utils.js";
import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

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

function resolveDefaultCodePath(fileName: string): string | null {
  const targetRelativePath = join(
    "src",
    "views",
    "map-editor",
    "components",
    "manager",
    "process-manager",
    "default-code",
    fileName,
  );
  const baseDirs = [
    __dirname,
    dirname(__dirname),
    dirname(dirname(__dirname)),
    dirname(dirname(dirname(__dirname))),
    dirname(dirname(dirname(dirname(__dirname)))),
  ];

  for (const baseDir of baseDirs) {
    const candidatePath = resolve(baseDir, targetRelativePath);
    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return null;
}

export async function getDefaultCode(args: unknown) {
  const parsed = GetDefaultCodeSchema.parse(args);
  const { phaseType } = parsed;

  const fileName = FILE_NAME_MAP[phaseType];
  if (!fileName) {
    return successResult({ template: "", error: "Unknown phase type" });
  }

  const templatePath = resolveDefaultCodePath(fileName);
  if (!templatePath) {
    return successResult({
      template: "",
      error: `Default code template not found for ${phaseType}: ${fileName}`,
    });
  }

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
    description: "获取游戏阶段默认代码模板。从与阶段默认初始化同源的 default-code 目录读取指定阶段类型模板，包含完整代码包围格式（如 as GameEventFunction<ContextType>;）。参数: phaseType(阶段类型)。返回: { template, phaseType }",
    inputSchema: GetDefaultCodeSchema,
    handler: getDefaultCode,
  },
];
