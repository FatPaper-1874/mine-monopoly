import { UISchema } from '@mine-monopoly/types';
import { RichTextStateMachine } from './state-machine';
import { TagNode, TagType } from './tokens';
import { getColorValue } from './validator';

/**
 * 富文本解析器类
 * 将富文本标记解析为 UISchema
 */
export class RichTextParser {
  /**
   * 解析富文本标记为 UISchema
   * @param input - 包含标记的字符串
   * @returns UISchema 组件树
   */
  parse(input: string): UISchema {
    // 空字符串返回空文本节点
    if (!input || input.trim() === '') {
      return {
        id: 'root',
        type: 'text',
        content: ''
      };
    }

    // 使用状态机解析
    const stateMachine = new RichTextStateMachine();
    const tagTree = stateMachine.parse(input);

    // 检查根节点是否包含转义的文本
    // 注意：只有根节点本身的 content 包含 &lt; 时才认为是完全转义的
    // 不检查 children，因为 children 可能包含正常的标签内容
    if (tagTree.content && tagTree.content.includes('&lt;')) {
      return {
        id: 'root',
        type: 'text',
        content: tagTree.content
      };
    }

    // 转换为 UISchema
    return this.convertToUISchema(tagTree, 0);
  }

  /**
   * 将 TagNode 树转换为 UISchema
   */
  private convertToUISchema(node: TagNode, index: number = 0): UISchema {
    const id = `node-${Date.now()}-${Math.random()}-${index}`;

    // 处理根节点或容器节点：直接处理 children
    if (node.type === TagType.TEXT && node.children && node.children.length > 0) {
      // 如果有多个子节点，返回 div 容器
      if (node.children.length > 1) {
        return {
          id,
          type: 'div',
          children: node.children.map((child, i) => this.convertToUISchema(child, i))
        };
      }
      // 如果只有一个子节点，直接返回该子节点
      return this.convertToUISchema(node.children[0], 0);
    }

    // 处理纯文本节点（没有 children）
    if (node.type === TagType.TEXT) {
      return {
        id,
        type: 'text',
        content: node.content || ''
      };
    }

    // 处理换行
    if (node.type === TagType.LINE_BREAK) {
      return {
        id,
        type: 'text',
        content: '\n'
      };
    }

    // 处理粗体
    if (node.type === TagType.BOLD) {
      return {
        id,
        type: 'span',
        style: { 'font-weight': 'bold' },
        children: node.children?.map((child, i) => this.convertToUISchema(child, i)) || []
      };
    }

    // 处理斜体
    if (node.type === TagType.ITALIC) {
      return {
        id,
        type: 'span',
        style: { 'font-style': 'italic' },
        children: node.children?.map((child, i) => this.convertToUISchema(child, i)) || []
      };
    }

    // 处理下划线
    if (node.type === TagType.UNDERLINE) {
      return {
        id,
        type: 'span',
        style: { 'text-decoration': 'underline' },
        children: node.children?.map((child, i) => this.convertToUISchema(child, i)) || []
      };
    }

    // 处理颜色
    if (node.type === TagType.COLOR) {
      // 注意：state-machine 已经处理了颜色值映射
      // 这里直接使用 node.style.color
      const colorValue = node.style?.color || 'inherit';
      return {
        id,
        type: 'span',
        style: { color: colorValue },
        children: node.children?.map((child, i) => this.convertToUISchema(child, i)) || []
      };
    }

    // 默认返回 div 容器
    return {
      id,
      type: 'div',
      children: node.children?.map((child, i) => this.convertToUISchema(child, i)) || []
    };
  }
}

/**
 * 便捷函数：解析富文本为 UISchema
 * @param input - 包含标记的字符串
 * @returns UISchema 组件树
 */
export function parseRichText(input: string): UISchema {
  const parser = new RichTextParser();
  return parser.parse(input);
}

// 导出类型和工具函数
export * from './tokens';
export * from './validator';
export * from './state-machine';
