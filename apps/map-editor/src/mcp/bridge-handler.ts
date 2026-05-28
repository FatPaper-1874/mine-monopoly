/**
 * MCP Bridge Handler for Renderer Process
 *
 * This file handles MCP tool invocations from the main process.
 * All MCP tools now route through this handler to access Pinia stores.
 */

import { useMapDataStore, useResourceStore, useEditorStore } from "@src/stores";
import { createDefaultMapData } from "@src/utils/file";
import { eventBus } from "@src/utils/event-bus";
import { mapContentService } from "@src/services";

// Define MCP tool names locally
type MCPToolName =
	// Chance card tools
	| "add_chance_card"
	| "update_chance_card"
	| "remove_chance_card"
	| "list_chance_cards"
	// Map event tools
	| "add_map_event"
	| "update_map_event"
	| "remove_map_event"
	| "get_map_event_by_id"
	| "list_map_events"
	// Role tools
	| "add_role"
	| "update_role"
	| "remove_role"
	| "list_roles"
	// Game phase tools
	| "get_phases"
	| "add_phase"
	| "remove_phase"
	| "update_phase"
	// Extra libs tools
	| "get_extra_libs"
	| "update_extra_libs"
	| "get_all_type_libs"
	// Resource tools
	| "list_models"
	| "list_images"
	| "get_resource_by_id"
	| "add_temp_model"
	| "add_temp_image"
	// Map item tools
	| "list_map_items"
	| "get_map_item"
	// Property tools
	| "add_property"
	| "update_property"
	| "remove_property"
	// Game setting tools
	| "list_game_settings"
	| "add_game_setting"
	| "update_game_setting"
	| "remove_game_setting"
	// UI Template tools
	| "create_ui_template"
	| "update_ui_template"
	| "remove_ui_template"
	| "get_ui_template"
	| "list_ui_templates"
	// Custom UI tools
	| "create_custom_ui"
	| "update_custom_ui"
	| "remove_custom_ui"
	| "get_custom_ui"
	| "list_custom_uis"
	// Modifier Template tools
	| "create_modifier_template"
	| "update_modifier_template"
	| "remove_modifier_template"
	| "get_modifier_template"
	| "list_modifier_templates"
	// System tools
	| "check_mcp_connection"
	// Validate tools
	| "validate_effect_code";

/**
 * Send MCP operation feedback event
 */
function sendMCPFeedback(operation: string, success: boolean, message: string, details?: any) {
	eventBus.emit("mcp-operation", {
		operation,
		success,
		message,
		details,
	});
}

/**
 * Helper to convert reactive objects to plain objects for IPC
 */
function toPlain<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}

/**
 * Initialize the MCP bridge handler
 * Call this in the main.ts of the renderer process
 */
export function initMCPBridge() {
	// Register the tool handler with the preload script via contextBridge
	console.log("MCP Bridge initialized");

	// Get the mcpAPI from window (exposed by contextBridge)
	const mcpAPI = (window as any).mcpAPI;
	if (mcpAPI && mcpAPI.registerToolHandler) {
		mcpAPI.registerToolHandler(handleToolInvocation);
		console.log("MCP Tool handler registered successfully");
	} else {
		console.error("mcpAPI.registerToolHandler not available!");
	}
}

/**
 * Handle tool invocation by routing to the appropriate store action
 */
export async function handleToolInvocation(toolName: MCPToolName, args: any): Promise<any> {
	const mapDataStore = useMapDataStore();
	const resourceStore = useResourceStore();
	const editorStore = useEditorStore();

	const startTime = Date.now();
	console.log(`[MCP Bridge] 🚀 Tool invoked: ${toolName}`);
	console.log(`[MCP Bridge] 📥 Arguments:`, JSON.stringify(args, null, 2));

	try {
		let result: any;

		switch (toolName) {
			// Chance Card Tools
			case "add_chance_card": {
				const serviceResult = await mapContentService.addChanceCard(args);
				result = toPlain(serviceResult);
				break;
			}

			case "update_chance_card": {
				const serviceResult = await mapContentService.updateChanceCard(args);
				result = toPlain(serviceResult);
				break;
			}

			case "remove_chance_card": {
				await mapContentService.removeChanceCard(args.cardId);
				result = { success: true };
				break;
			}

			case "list_chance_cards": {
				result = toPlain(mapDataStore.chanceCards);
				break;
			}

			// Map Event Tools
			case "add_map_event": {
				const serviceResult = await mapContentService.addMapEvent(args);
				result = toPlain(serviceResult);
				break;
			}

			case "update_map_event": {
				const serviceResult = await mapContentService.updateMapEvent(args);
				result = toPlain(serviceResult);
				break;
			}

			case "remove_map_event": {
				await mapContentService.removeMapEvent(args.eventId);
				result = { success: true };
				break;
			}

			case "get_map_event_by_id": {
				const event = mapDataStore.findMapEventById(args.eventId);
				if (!event) throw new Error(`MapEvent with ID ${args.eventId} not found`);
				result = toPlain(event);
				break;
			}

			case "list_map_events": {
				result = toPlain(mapDataStore.mapEvents);
				break;
			}

			// Role Tools
			case "add_role": {
				const serviceResult = await mapContentService.addRole(args);
				result = toPlain(serviceResult);
				break;
			}

			case "update_role": {
				const serviceResult = await mapContentService.updateRole(args);
				result = toPlain(serviceResult);
				break;
			}

			case "remove_role": {
				await mapContentService.removeRole(args.roleId);
				result = { success: true };
				break;
			}

			case "list_roles": {
				result = toPlain(mapDataStore.roles);
				break;
			}

			// Game Phase Tools
			case "get_phases": {
				const serviceResult = await mapContentService.getPhases();
				result = toPlain(serviceResult);
				break;
			}

			case "add_phase": {
				const serviceResult = await mapContentService.addPhase(args);
				result = toPlain(serviceResult);
				break;
			}

			case "update_phase": {
				const serviceResult = await mapContentService.updatePhase(args);
				result = toPlain(serviceResult);
				break;
			}

			case "remove_phase": {
				await mapContentService.removePhase(args.phaseId, args.phaseType);
				result = { success: true };
				break;
			}

			// Extra Libs Tools
			case "get_extra_libs": {
				const serviceResult = await mapContentService.getExtraLibs();
				result = toPlain(serviceResult);
				break;
			}

			case "update_extra_libs": {
				await mapContentService.updateExtraLibs(args.code);
				// 发送类型刷新事件，通知 Monaco 验证器清除缓存
				eventBus.emit("refresh-monaco-types");
				result = { success: true };
				break;
			}

			case "get_all_type_libs": {
				const serviceResult = await mapContentService.getAllTypeLibs();
				result = toPlain(serviceResult);
				break;
			}

			// Resource Tools
			case "list_models":
				result = toPlain(resourceStore.models);
				break;

			case "list_images":
				result = toPlain(resourceStore.images);
				break;

			case "get_resource_by_id": {
				// Try to find as image first, then as model
				let resource = resourceStore.findImageById(args.resourceId);
				if (!resource) {
					resource = resourceStore.models.find(m => m.id === args.resourceId);
				}
				if (!resource) throw new Error(`Resource not found: ${args.resourceId}`);
				result = toPlain(resource);
				break;
			}

			case "add_temp_model": {
				const tempModel = await resourceStore.addTempModel();
				result = toPlain(tempModel);
				break;
			}

			case "add_temp_image": {
				const tempImage = await resourceStore.addTempImage();
				result = toPlain(tempImage);
				break;
			}

			// Map Item Tools
			case "list_map_items": {
				result = toPlain(mapContentService.listMapItems());
				break;
			}

			case "get_map_item": {
				result = toPlain(mapContentService.getMapItem(args.mapItemId));
				break;
			}

			// Property Tools
			case "add_property": {
				const serviceResult = await mapContentService.addProperty(args);
				result = toPlain(serviceResult);
				break;
			}

			case "update_property": {
				const serviceResult = await mapContentService.updateProperty(args);
				result = toPlain(serviceResult);
				break;
			}

			case "remove_property": {
				await mapContentService.removeProperty(args.mapItemId);
				result = { success: true };
				break;
			}

			// Game Setting Tools
			case "list_game_settings": {
				result = toPlain(mapDataStore.gameSettingForm);
				break;
			}

			case "add_game_setting": {
				const serviceResult = await mapContentService.addGameSetting(args);
				result = toPlain(serviceResult);
				break;
			}

			case "update_game_setting": {
				const serviceResult = await mapContentService.updateGameSetting(args);
				result = toPlain(serviceResult);
				break;
			}

			case "remove_game_setting": {
				await mapContentService.removeGameSetting(args.settingId);
				result = { success: true };
				break;
			}

			// UI Template Tools
			case "create_ui_template": {
				const serviceResult = await mapContentService.createUITemplate(args);
				result = toPlain(serviceResult);
				break;
			}

			case "update_ui_template": {
				const serviceResult = await mapContentService.updateUITemplate(args);
				result = toPlain(serviceResult);
				break;
			}

			case "remove_ui_template": {
				await mapContentService.removeUITemplate(args.templateId);
				result = { success: true };
				break;
			}

			case "get_ui_template": {
				const template = mapDataStore.uiTemplates.find(t => t.id === args.templateId);
				if (!template) throw new Error(`UITemplate 不存在: ${args.templateId}`);
				result = toPlain(template);
				break;
			}

			case "list_ui_templates": {
				result = toPlain(mapDataStore.uiTemplates);
				break;
			}

			// Custom UI Tools
			case "create_custom_ui": {
				const serviceResult = await mapContentService.createCustomUI(args);
				result = toPlain(serviceResult);
				break;
			}

			case "update_custom_ui": {
				const serviceResult = await mapContentService.updateCustomUI(args);
				result = toPlain(serviceResult);
				break;
			}

			case "remove_custom_ui": {
				await mapContentService.removeCustomUI(args.instanceId);
				result = { success: true };
				break;
			}

			case "get_custom_ui": {
				const instance = mapDataStore.customUIs.find(ui => ui.id === args.instanceId);
				if (!instance) throw new Error(`CustomUI 不存在: ${args.instanceId}`);
				result = toPlain(instance);
				break;
			}

			case "list_custom_uis": {
				result = toPlain(mapDataStore.customUIs);
				break;
			}

		// Modifier Template Tools
		case "create_modifier_template": {
			const serviceResult = await mapContentService.createModifierTemplate(args);
			result = toPlain(serviceResult);
			break;
		}

		case "update_modifier_template": {
			const serviceResult = await mapContentService.updateModifierTemplate(args);
			result = toPlain(serviceResult);
			break;
		}

		case "remove_modifier_template": {
			await mapContentService.removeModifierTemplate(args.templateId);
			result = { success: true };
			break;
		}

		case "get_modifier_template": {
			const template = mapDataStore.modifierTemplates.find(t => t.id === args.templateId);
			if (!template) throw new Error(`ModifierTemplate 不存在: ${args.templateId}`);
			result = toPlain(template);
			break;
		}

		case "list_modifier_templates": {
			result = toPlain(mapDataStore.modifierTemplates);
			break;
		}

			// System Tools
			case "check_mcp_connection": {
				result = {
					success: true,
					connected: true,
					message: "MCP connection is active",
					timestamp: new Date().toISOString(),
					server: "minemonopoly-map-editor",
					version: "1.0.0"
				};
				break;
			}

			// Validate Tools
			case "validate_effect_code": {
				const serviceResult = await mapContentService.validateEffectCode(args);
				result = toPlain(serviceResult);
				break;
			}

			default:
				throw new Error(`Unknown tool: ${toolName}`);
		}

		// Log success
		const duration = Date.now() - startTime;
		console.log(`[MCP Bridge] ✅ Tool succeeded: ${toolName} (${duration}ms)`);
		console.log(`[MCP Bridge] 📤 Result:`, JSON.stringify(result, null, 2));

		return result;
	} catch (error: any) {
		const duration = Date.now() - startTime;
		console.error(`[MCP Bridge] ❌ Tool failed: ${toolName} (${duration}ms)`);
		console.error(`[MCP Bridge] 🔴 Error:`, error.message);
		console.error(`[MCP Bridge] 📚 Stack:`, error.stack);

		sendMCPFeedback(toolName, false, `操作失败: ${error.message}`, {
			error: error.message,
			stack: error.stack
		});
		throw error;
	}
}
