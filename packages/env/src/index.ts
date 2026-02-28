/**
 * @mine-monopoly/env
 *
 * 带类型验证的环境变量管理（Node.js 专用）
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// 确定项目根目录并加载 .env 文件
// 此文件位于: packages/env/dist/index.js
// 我们需要向上3级到达项目根目录: dist/../ -> env/ -> packages/ -> 项目根目录
let __dirname = dirname(fileURLToPath(import.meta.url));
let projectRoot = resolve(__dirname, "../..");  // 从 packages/env/dist 到 packages/

// 从构建文件运行时，需要调整路径
// 如果我们在 packages/env/dist，向上到项目根目录
if (__dirname.includes("dist")) {
	projectRoot = resolve(__dirname, "../../.."); // dist -> env -> packages -> 根目录
} else {
	// 从源代码运行时（开发模式）
	projectRoot = resolve(__dirname, "../.."); // env/src -> packages -> 根目录
}

// 尝试从项目根目录加载 .env
const envPath = resolve(projectRoot, ".env");
const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
	// 尝试父目录（以防我们在 apps/server 或类似位置）
	const parentEnvPath = resolve(projectRoot, "../.env");
	const parentResult = dotenv.config({ path: parentEnvPath });
	if (parentResult.parsed) {
		// 成功从父目录加载
	} else {
		// 回退到默认的 dotenv 行为
		dotenv.config();
	}
}

// 调试：如果 .env 已加载则记录日志（仅开发环境）
if (process.env.NODE_ENV !== "production" && (envResult.parsed || process.env.FATPAPER_DOMAIN)) {
	console.log(`[env] Loaded .env file from: ${envPath}`);
}

/**
 * 获取环境变量值（核心函数）
 * @param key - 环境变量键名（大写，如 'SERVER_PORT'）
 * @param defaultValue - 可选的默认值
 * @returns 环境变量值（自动转换类型：端口号转为 number）
 * @throws {Error} 如果变量未定义且未提供默认值
 */
export function env<T = string>(key: string, defaultValue?: T): T {
	const value = process.env[key];

	if (value === undefined || value === '') {
		if (defaultValue !== undefined) {
			return defaultValue;
		}
		throw new Error(
			`[@mine-monopoly/env] 环境变量 "${key}" 未定义。\n` +
			`请检查 .env 文件中是否配置了 ${key}。`
		);
	}

	// 端口号自动转换为 number
	if (key.includes('PORT') || key === 'MYSQL_PORT') {
		const port = parseInt(value, 10);
		if (isNaN(port) || port < 1 || port > 65535) {
			throw new Error(`[@mine-monopoly/env] 端口号 "${value}" 无效（1-65535）`);
		}
		return port as T;
	}

	// 协议验证
	if (key === 'PROTOCOL') {
		if (value !== 'http' && value !== 'https') {
			throw new Error(`[@mine-monopoly/env] 协议 "${value}" 必须是 "http" 或 "https"`);
		}
		return value as T;
	}

	return value as T;
}

// Export Vite plugin for use in Vite configs
export { envPlugin as viteEnvPlugin } from './vite-plugin-env.js';
export type { EnvPluginOptions } from './vite-plugin-env.js';
