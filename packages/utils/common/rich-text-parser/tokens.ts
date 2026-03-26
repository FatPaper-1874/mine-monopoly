/**
 * 解析器状态枚举
 */
export enum ParserState {
  TEXT = 'TEXT',           // 解析普通文本
  OPEN_TAG = 'OPEN_TAG',   // 检测到 <，准备解析开始标签
  CLOSE_TAG = 'CLOSE_TAG', // 检测到 </，准备解析结束标签
  TAG_NAME = 'TAG_NAME',   // 解析标签名称
  COLOR_VALUE = 'COLOR_VALUE', // 解析 color 标签的值
  ERROR = 'ERROR'          // 错误状态
}

/**
 * 标签类型枚举
 */
export enum TagType {
  BOLD = 'b',
  ITALIC = 'i',
  UNDERLINE = 'u',
  LINE_BREAK = 'br',
  COLOR = 'color',
  TEXT = 'text'
}

/**
 * 标签节点接口
 */
export interface TagNode {
  type: TagType;
  content?: string;
  style?: Record<string, string>;
  children?: TagNode[];
}

/**
 * 支持的自闭合标签
 */
export const SELF_CLOSING_TAGS = new Set<TagType>([TagType.LINE_BREAK]);

/**
 * 支持的标签名称
 */
export const VALID_TAG_NAMES = new Set<string>([
  'b', 'i', 'u', 'br', 'color'
]);
