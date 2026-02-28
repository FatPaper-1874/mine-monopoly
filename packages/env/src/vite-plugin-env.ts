/**
 * @mine-monopoly/env
 *
 * Vite 插件，用于在构建时注入环境变量
 */

import { Plugin } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

export interface EnvPluginOptions {
  include?: string[];
  exclude?: string[];
  envPath?: string;
}

const DEFAULT_EXCLUDE = [
  'MYSQL_PASSWORD',
  'TC_KEY',
  'SECRET',
  'PASSWORD',
  'TOKEN',
];

/**
 * Vite 插件，用于将环境变量注入到浏览器代码中
 *
 * 该插件在构建时读取 .env 文件并将变量作为常量注入，
 * 使其通过 __ENV_VARS__ 在浏览器中可用。
 */
export function envPlugin(options: EnvPluginOptions = {}): Plugin {
  const { exclude = DEFAULT_EXCLUDE, envPath } = options;
  let envVars: Record<string, string> = {};

  return {
    name: 'vite-plugin-universal-env',

    config(config, { mode }) {
      const projectRoot = config.root || process.cwd();

      // 确定要加载的 .env 文件
      let envFilePath: string;
      if (envPath) {
        envFilePath = resolve(projectRoot, envPath);
      } else {
        // 优先尝试特定模式的 .env 文件（.env.development、.env.production）
        const modeEnvFile = resolve(projectRoot, `.env.${mode}`);
        if (fs.existsSync(modeEnvFile)) {
          envFilePath = modeEnvFile;
        } else {
          // 回退到默认的 .env
          envFilePath = resolve(projectRoot, '.env');
        }
      }

      if (fs.existsSync(envFilePath)) {
        const envContent = fs.readFileSync(envFilePath, 'utf-8');
        const parsed = parseEnvFile(envContent);
        envVars = filterEnvVars(parsed, { exclude });

        console.log(`[vite-plugin-universal-env] Loaded ${Object.keys(envVars).length} variables from ${envFilePath}`);
      } else {
        console.warn(`[vite-plugin-universal-env] .env file not found at ${envFilePath}`);
      }

      return {
        define: {
          '__ENV_VARS__': JSON.stringify(envVars),
        },
      };
    },
  };
}

/**
 * 解析 .env 文件内容为键值对
 */
function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    // 跳过空行和注释
    if (!trimmed || trimmed.startsWith('#')) continue;

    const splitIndex = trimmed.indexOf('=');
    if (splitIndex === -1) continue;

    const key = trimmed.substring(0, splitIndex).trim();
    const value = trimmed.substring(splitIndex + 1).trim();

    // 移除引号（如果存在）
    const cleanValue = value.replace(/^["']|["']$/g, '');

    if (key) {
      result[key] = cleanValue;
    }
  }
  return result;
}

/**
 * 过滤环境变量以排除敏感变量
 */
function filterEnvVars(
  vars: Record<string, string>,
  options: { exclude?: string[] }
): Record<string, string> {
  const result: Record<string, string> = {};
  const { exclude } = options;

  for (const [key, value] of Object.entries(vars)) {
    const upperKey = key.toUpperCase();

    // 跳过 VITE_ 前缀的变量（我们只需要非前缀的变量）
    if (upperKey.startsWith('VITE_')) continue;

    // 跳过排除列表中的变量
    if (exclude && exclude.some(excluded => upperKey.includes(excluded))) {
      continue;
    }

    result[upperKey] = value;
  }

  return result;
}

export default envPlugin;
