/**
 * 游戏主题色映射
 */
export const GAME_THEME_COLORS: Record<string, string> = {
  primary: '#ff8f00',
  second: '#ffa000',
  third: '#ffc10f'
};

/**
 * 颜色名称白名单正则
 */
const COLOR_NAME_REGEX = /^(red|blue|green|yellow|orange|purple|gray|black|white|pink|cyan|lime|amber|teal|indigo|gold|primary|second|third)$/;

/**
 * 十六进制颜色正则
 */
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

/**
 * RGB 颜色正则（捕获 R、G、B 值）
 */
const RGB_COLOR_REGEX = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/;

/**
 * 验证颜色值是否合法
 * @param color - 颜色值
 * @returns 是否合法
 */
export function validateColor(color: string): boolean {
  // 颜色名称和十六进制验证
  if (COLOR_NAME_REGEX.test(color) || HEX_COLOR_REGEX.test(color)) {
    return true;
  }

  // RGB 验证（带范围检查）
  const rgbMatch = color.match(RGB_COLOR_REGEX);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return [r, g, b].every(v => {
      const num = parseInt(v, 10);
      return num >= 0 && num <= 255;
    });
  }

  return false;
}

/**
 * 获取颜色值
 * @param color - 颜色名称或值
 * @returns CSS 颜色值
 */
export function getColorValue(color: string): string {
  // 如果是主题色，返回映射的十六进制值
  if (color in GAME_THEME_COLORS) {
    return GAME_THEME_COLORS[color];
  }
  // 其他颜色直接返回
  return color;
}
