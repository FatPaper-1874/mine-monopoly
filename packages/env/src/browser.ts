/**
 * @mine-monopoly/env
 *
 * 浏览器环境变量（通过 Vite 插件在构建时注入）
 */

declare global {
  const __ENV_VARS__: Record<string, string | undefined>;
  const __RUNTIME_ENV__: Record<string, string | undefined>;
}

/**
 * 获取环境变量值（浏览器版本）
 * @param key - 环境变量键名（不区分大小写，会自动转换为大写）
 * @param defaultValue - 可选的默认值
 * @returns 环境变量值（自动转换类型：端口号转为 number）
 * @throws {Error} 如果变量未定义且未提供默认值
 */
export function env<T = string>(key: string, defaultValue?: T): T {
  const upperKey = key.toUpperCase();

  // 运行时注入优先，但空值不覆盖构建时变量
  const runtimeVal = typeof __RUNTIME_ENV__ !== 'undefined' ? __RUNTIME_ENV__[upperKey] : undefined;
  const buildVal = typeof __ENV_VARS__ !== 'undefined' ? __ENV_VARS__[upperKey] : undefined;

  // 优先取运行时非空值，否则取构建时值
  const value = (runtimeVal !== undefined && runtimeVal !== '') ? runtimeVal : buildVal;

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
  if (upperKey.includes('PORT') || upperKey === 'MYSQL_PORT') {
    const port = parseInt(value, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error(`[@mine-monopoly/env] 端口号 "${value}" 无效（1-65535）`);
    }
    return port as T;
  }

  // 协议验证
  if (upperKey === 'PROTOCOL') {
    if (value !== 'http' && value !== 'https') {
      throw new Error(`[@mine-monopoly/env] 协议 "${value}" 必须是 "http" 或 "https"`);
    }
    return value as T;
  }

  return value as T;
}
