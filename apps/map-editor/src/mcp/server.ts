/**
 * MCP Server Implementation
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
	type Tool,
} from "@modelcontextprotocol/sdk/types.js";
// MCP服务只支持6个核心功能模块
import { chanceCardTools } from "./tools/chance-cards.js";
import { mapEventTools } from "./tools/map-events.js";
import { roleTools } from "./tools/roles.js";
import { gamePhaseTools } from "./tools/game-phases.js";
import { extraLibsTools } from "./tools/extra-libs.js";
import { typeLibsTools } from "./tools/type-libs.js";
import { resourceTools } from "./tools/resources.js";
import { mapItemTools } from "./tools/map-items.js";
import { propertyTools } from "./tools/properties.js";
import { systemTools } from "./tools/system.js";
import { gameSettingTools } from "./tools/game-settings.js";
import { uiTemplateTools } from "./tools/ui-templates.js";
import { customUITools } from "./tools/custom-uis.js";
import { modifierTemplateTools } from "./tools/modifier-templates.js";
import { validateEffectCodeTools } from "./tools/validate-effect-code.js";
import { getCodeTemplateTools } from "./tools/get-code-template.js";
import { getDefaultCodeTools } from "./tools/get-default-code.js";

/**
 * Convert Zod schema to JSON Schema format for MCP
 */
export function zodToJsonSchema(zodSchema: any): any {
	// If already a plain JSON Schema object, return as-is
	if (zodSchema && zodSchema.type === "object" && "properties" in zodSchema && !zodSchema._def) {
		return zodSchema;
	}

	// This is a simplified conversion. In production, you might use zod-to-json-schema
	const shapeDef = zodSchema._def?.shape;

	if (!shapeDef) {
		// Handle empty object schemas
		return { type: "object", properties: {} };
	}

	// Check if shape is a function (ZodObject) or a property (other Zod types)
	const shapeObj = typeof shapeDef === 'function' ? shapeDef() : shapeDef;

	if (!shapeObj) {
		return { type: "object", properties: {} };
	}

	const properties: Record<string, any> = {};
	const required: string[] = [];

	for (const [key, value] of Object.entries(shapeObj)) {
		const field = value as any;
		properties[key] = {
			type: getJsonSchemaType(field),
			description: field.description || undefined,
		};

		if (!field.isOptional()) {
			required.push(key);
		}

		// Handle enums
		if (field._def?.values) {
			properties[key].enum = field._def.values;
		}
	}

	const schema: any = {
		type: "object",
		properties,
	};

	if (required.length > 0) {
		schema.required = required;
	}

	return schema;
}

function getJsonSchemaType(zodField: any): string {
	const typeName = zodField._def?.typeName;

	switch (typeName) {
		case "ZodString":
			return "string";
		case "ZodNumber":
			return "number";
		case "ZodBoolean":
			return "boolean";
		case "ZodArray":
			return "array";
		case "ZodObject":
		case "ZodRecord":
			return "object";
		case "ZodEnum":
			return "string";
		case "ZodOptional":
			return getJsonSchemaType(zodField._def?.innerType);
		default:
			return "string";
	}
}

/**
 * Collect all tools at module level
 * MCP服务只支持6个核心功能: 机会卡、地块事件、角色、游戏流程、额外库、资源管理
 */
const allTools = [
	...chanceCardTools,
	...mapEventTools,
	...roleTools,
	...gamePhaseTools,
	...extraLibsTools,
	...typeLibsTools,
	...resourceTools,
	...mapItemTools,
	...propertyTools,
	...systemTools,
	...gameSettingTools,
	...uiTemplateTools,
	...customUITools,
	...modifierTemplateTools,
	...validateEffectCodeTools,
	...getCodeTemplateTools,
	...getDefaultCodeTools,
];

/**
 * Export all tools for external access
 */
export function getAllTools() {
	return allTools;
}

/**
 * Create and configure the MCP server
 */
export function createMCPServer() {
	const server = new Server(
		{
			name: "minemonopoly-map-editor",
			version: "1.0.0",
		},
		{
			capabilities: {
				tools: {},
			},
		}
	);

	// Register list tools handler
	server.setRequestHandler(ListToolsRequestSchema, async () => {
		const tools: Tool[] = allTools.map((toolDef) => ({
			name: toolDef.name,
			description: toolDef.description,
			inputSchema: zodToJsonSchema(toolDef.inputSchema),
		}));

		return { tools };
	});

	// Register call tool handler
	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		const { name, arguments: args } = request.params;

		// Find the tool handler
		const toolDef = allTools.find((t) => t.name === name);

		if (!toolDef) {
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({
							success: false,
							error: `Unknown tool: ${name}`,
						}),
					},
				],
			};
		}

		try {
			// Call the tool handler
			const result = await toolDef.handler(args);

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(result, null, 2),
					},
				],
			};
		} catch (error: any) {
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(
							{
								success: false,
								error: error.message || `Error executing tool: ${name}`,
							},
							null,
							2
						),
					},
				],
			};
		}
	});

	return server;
}

/**
 * Start the MCP server with stdio transport (legacy/standalone mode)
 */

/**
 * Start the MCP server with stdio transport (legacy/standalone mode)
 */
export async function startStdioMCPServer() {
	const server = createMCPServer();
	const transport = new StdioServerTransport();

	await server.connect(transport);

	console.error("MineMonopoly Map Editor MCP Server started (stdio)");

	return server;
}
