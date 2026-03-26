import { ParserState, TagType, TagNode, VALID_TAG_NAMES, SELF_CLOSING_TAGS } from './tokens';
import { validateColor, getColorValue } from './validator';

/**
 * 标签栈项接口
 */
interface StackItem {
  type: TagType;
  nodeName: string;
  children: TagNode[];
  buffer?: string; // 用于收集标签内容或属性值
}

/**
 * 状态机解析器类
 * 将富文本标记转换为 TagNode 树
 */
export class RichTextStateMachine {
  private state: ParserState = ParserState.TEXT;
  private stack: StackItem[] = [];
  private rootNode: TagNode = { type: TagType.TEXT, children: [] };
  private currentNode: StackItem = {
    type: TagType.TEXT,
    nodeName: 'root',
    children: []
  };
  private buffer: string = '';
  private tagBuffer: string = '';
  private colorBuffer: string = '';
  private errorBuffer: string = '';
  private isClosingTag: boolean = false; // 跟踪当前处理的标签是否是闭合标签
  private lastNodeWasEscaped: boolean = false; // 跟踪最后一个节点是否是转义的标签

  /**
   * 解析富文本字符串
   * @param input - 富文本输入
   * @returns TagNode 树
   */
  parse(input: string): TagNode {
    // 重置状态
    this.reset();

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      switch (this.state) {
        case ParserState.TEXT:
          this.handleText(char);
          break;
        case ParserState.OPEN_TAG:
          this.handleOpenTag(char);
          break;
        case ParserState.CLOSE_TAG:
          this.handleCloseTag(char);
          break;
        case ParserState.TAG_NAME:
          this.handleTagName(char);
          break;
        case ParserState.COLOR_VALUE:
          this.handleColorValue(char);
          break;
        case ParserState.ERROR:
          this.handleError(char);
          break;
      }
    }

    // 处理结束状态
    this.handleEndState();

    return this.rootNode;
  }

  /**
   * 重置解析器状态
   */
  private reset(): void {
    this.state = ParserState.TEXT;
    this.stack = [];
    this.rootNode = { type: TagType.TEXT, children: [] };
    this.currentNode = {
      type: TagType.TEXT,
      nodeName: 'root',
      children: []
    };
    this.buffer = '';
    this.tagBuffer = '';
    this.colorBuffer = '';
    this.errorBuffer = '';
    this.isClosingTag = false;
    this.lastNodeWasEscaped = false;
  }

  /**
   * 处理文本状态
   */
  private handleText(char: string): void {
    if (char === '<') {
      // 检查是否有累积的文本
      if (this.buffer.length > 0) {
        this.addTextNode(this.buffer);
        this.buffer = '';
      }
      // 转到开放标签状态
      this.state = ParserState.OPEN_TAG;
    } else {
      this.buffer += char;
    }
  }

  /**
   * 处理开放标签状态
   */
  private handleOpenTag(char: string): void {
    if (char === '/') {
      // 这是闭合标签
      this.state = ParserState.CLOSE_TAG;
    } else if (char === '>') {
      // 空标签 <>，转义为文本（强制分离）
      this.addTextNode('<>', true);
      this.state = ParserState.TEXT;
    } else {
      // 收集标签名的第一个字符
      this.tagBuffer = char;
      this.isClosingTag = false; // 标记为开始标签
      this.state = ParserState.TAG_NAME;
    }
  }

  /**
   * 处理闭合标签状态
   */
  private handleCloseTag(char: string): void {
    if (char === '>') {
      // 空闭合标签 </>，转义为文本（强制分离）
      this.addTextNode('</>', true);
      this.state = ParserState.TEXT;
      this.tagBuffer = '';
    } else {
      // 收集标签名的第一个字符
      this.tagBuffer = char;
      this.isClosingTag = true; // 标记为闭合标签
      this.state = ParserState.TAG_NAME;
    }
  }

  /**
   * 处理标签名状态
   */
  private handleTagName(char: string): void {
    if (char === '>') {
      // 标签结束
      this.processTag();
      this.tagBuffer = '';
      this.colorBuffer = '';
      this.state = ParserState.TEXT;
    } else if (char === '=' || char === ':') {
      // 属性值开始（仅用于 color 标签）
      // 支持 <color=red> 和 <color:red> 两种语法
      if (this.tagBuffer === 'color') {
        this.state = ParserState.COLOR_VALUE;
        this.colorBuffer = '';
      } else {
        // 非法标签，转义为文本
        this.enterErrorState(`<${this.tagBuffer}${char}`);
      }
    } else if (char === '<') {
      // 嵌套 <，非法，转义为文本
      this.enterErrorState(`<${this.tagBuffer}<`);
    } else {
      // 继续收集标签名或属性值
      this.tagBuffer += char;
    }
  }

  /**
   * 处理颜色值状态
   */
  private handleColorValue(char: string): void {
    if (char === '>') {
      // 颜色值结束
      if (this.validateAndProcessColorTag()) {
        // 成功处理颜色标签
        this.state = ParserState.TEXT;
      } else {
        // 颜色值无效，转义为文本
        this.enterErrorState(`<color=${this.colorBuffer}>`);
      }
      this.tagBuffer = '';
      this.colorBuffer = '';
    } else if (char === '<') {
      // 嵌套 <，非法
      this.enterErrorState(`<color=${this.colorBuffer}<`);
    } else {
      this.colorBuffer += char;
    }
  }

  /**
   * 处理错误状态
   */
  private handleError(char: string): void {
    this.errorBuffer += char;
    if (char === '>') {
      // 错误序列结束（强制分离）
      this.addTextNode(this.errorBuffer, true);
      this.errorBuffer = '';
      this.state = ParserState.TEXT;
    }
  }

  /**
   * 进入错误状态
   */
  private enterErrorState(prefix: string): void {
    this.errorBuffer = prefix;
    this.state = ParserState.ERROR;
    this.tagBuffer = '';
    this.colorBuffer = '';
  }

  /**
   * 处理标签（开始或结束）
   */
  private processTag(): void {
    const tagName = this.tagBuffer.toLowerCase();

    // 检查是否是有效的标签名
    if (!VALID_TAG_NAMES.has(tagName)) {
      // 非法标签，转义为文本（强制分离）
      const prefix = this.isClosingTag ? '</' : '<';
      this.addTextNode(`${prefix}${this.tagBuffer}>`, true);
      return;
    }

    // 检查是否是自闭合标签
    if (SELF_CLOSING_TAGS.has(tagName as TagType)) {
      this.addSelfClosingTag(tagName as TagType);
      return;
    }

    // 处理开始或结束标签
    if (this.isClosingTag) {
      this.closeTag(tagName);
    } else {
      this.openTag(tagName);
    }
  }

  /**
   * 验证并处理颜色标签
   */
  private validateAndProcessColorTag(): boolean {
    const colorValue = this.colorBuffer.trim();
    if (!validateColor(colorValue)) {
      return false;
    }

    // 创建临时节点并添加到父节点
    const tempNode: TagNode = {
      type: TagType.COLOR,
      style: { color: getColorValue(colorValue) },
      children: []
    };

    // 添加到当前节点的子节点
    if (!this.currentNode.children) {
      this.currentNode.children = [];
    }
    this.currentNode.children.push(tempNode);

    // 将当前节点压入栈
    this.stack.push(this.currentNode);

    // 创建新的栈项作为当前节点
    this.currentNode = {
      type: TagType.COLOR,
      nodeName: 'color',
      children: [],
      buffer: colorValue
    };

    return true;
  }

  /**
   * 打开标签
   */
  private openTag(tagName: string): void {
    const tagType = tagName as TagType;

    // 创建临时节点并添加到父节点
    const tempNode: TagNode = {
      type: tagType,
      children: []
    };

    // 添加到当前节点的子节点
    if (!this.currentNode.children) {
      this.currentNode.children = [];
    }
    this.currentNode.children.push(tempNode);

    // 将当前节点压入栈
    this.stack.push(this.currentNode);

    // 创建新的栈项作为当前节点
    this.currentNode = {
      type: tagType,
      nodeName: tagName,
      children: []
    };
  }

  /**
   * 关闭标签
   */
  private closeTag(tagName: string): void {
    // 检查当前节点是否匹配要关闭的标签
    if (this.currentNode.nodeName === tagName) {
      // 当前节点就是要关闭的标签
      // 构建完成的节点
      const completedNode = this.buildTagNode();

      // 弹出栈，返回到父节点
      if (this.stack.length > 0) {
        const parentNode = this.stack.pop()!;

        // 更新父节点的最后一个子节点（我们之前添加的临时节点）
        if (parentNode.children.length > 0) {
          parentNode.children[parentNode.children.length - 1] = completedNode;
        } else {
          // 如果父节点没有子节点（不应该发生），直接添加
          parentNode.children.push(completedNode);
        }

        this.currentNode = parentNode;
      }
    } else {
      // 当前节点不匹配，需要在栈中查找匹配的标签
      // 这意味着有标签未正确闭合，需要自动修正
      let found = false;
      let unclosedNodes: StackItem[] = [];

      // 保存当前未闭合的节点
      unclosedNodes.push(this.currentNode);

      while (this.stack.length > 0) {
        const parentNode = this.stack.pop()!;

        if (parentNode.nodeName === tagName) {
          // 找到匹配的开放标签
          // 构建当前节点
          const currentNode = this.buildTagNode();

          // 更新父节点的最后一个子节点
          parentNode.children[parentNode.children.length - 1] = currentNode;

          // 将未闭合的节点转义为文本
          for (const unclosed of unclosedNodes) {
            const textRep = this.stackItemToText(unclosed);
            this.addTextNodeToNode(parentNode, textRep);
          }

          this.currentNode = parentNode;
          found = true;
          break;
        } else {
          // 继续向上查找
          unclosedNodes.unshift(parentNode);
          this.currentNode = parentNode;
        }
      }

      if (!found) {
        // 没有找到匹配的开放标签，转义为文本
        this.addTextNode(`</${tagName}>`);
      }
    }
  }

  /**
   * 添加文本节点到指定节点
   */
  private addTextNodeToNode(node: StackItem, text: string): void {
    if (text.length === 0) return;

    if (!node.children) {
      node.children = [];
    }

    // 检查最后一个子节点是否是文本节点
    const lastChild = node.children[node.children.length - 1];
    if (lastChild && lastChild.type === TagType.TEXT) {
      // 合并文本节点
      lastChild.content = (lastChild.content || '') + text;
    } else {
      // 创建新的文本节点
      const textNode: TagNode = {
        type: TagType.TEXT,
        content: text
      };
      node.children.push(textNode);
    }
  }

  /**
   * 将栈项转换为文本表示
   */
  private stackItemToText(item: StackItem): string {
    if (item.type === TagType.COLOR && item.buffer) {
      const colorValue = item.buffer;
      const childrenText = item.children.map(child => this.nodeToText(child)).join('');
      return `<color=${colorValue}>${childrenText}</color>`;
    } else if (item.type === TagType.TEXT) {
      return item.buffer || '';
    } else {
      const childrenText = item.children.map(child => this.nodeToText(child)).join('');
      return `<${item.nodeName}>${childrenText}</${item.nodeName}>`;
    }
  }

  /**
   * 添加自闭合标签
   */
  private addSelfClosingTag(tagType: TagType): void {
    const tagNode: TagNode = {
      type: tagType
    };
    this.currentNode.children.push(tagNode);
  }

  /**
   * 添加文本节点
   */
  private addTextNode(text: string, forceSeparate: boolean = false): void {
    if (text.length === 0) return;

    // 检查最后一个子节点是否是文本节点
    const lastChild = this.currentNode.children[this.currentNode.children.length - 1];

    // 检查是否是空标签（<> 或 </>）
    const isEmptyTag = text === '<>' || text === '</>';

    // 只有当不是空标签，且上一个节点不是空标签时，才合并
    const shouldMerge = !forceSeparate && !isEmptyTag && !this.lastNodeWasEscaped && lastChild && lastChild.type === TagType.TEXT;

    if (shouldMerge) {
      // 合并文本节点
      lastChild.content = (lastChild.content || '') + text;
    } else {
      // 创建新的文本节点
      const textNode: TagNode = {
        type: TagType.TEXT,
        content: text
      };
      this.currentNode.children.push(textNode);
    }

    // 设置标志（只有空标签才会阻止后续合并）
    this.lastNodeWasEscaped = isEmptyTag;
  }

  /**
   * 构建标签节点
   */
  private buildTagNode(): TagNode {
    const node: TagNode = {
      type: this.currentNode.type,
      children: [...this.currentNode.children]
    };

    // 如果是颜色标签，添加样式
    if (this.currentNode.type === TagType.COLOR && this.currentNode.buffer) {
      node.style = { color: getColorValue(this.currentNode.buffer) };
    }

    return node;
  }

  /**
   * 处理结束状态
   */
  private handleEndState(): void {
    // 处理缓冲区中的剩余文本
    if (this.buffer.length > 0) {
      this.addTextNode(this.buffer);
      this.buffer = '';
    }

    // 处理未闭合的标签
    // 如果栈不为空，说明有标签未闭合，需要转义为文本
    if (this.stack.length > 0) {
      // 从根节点开始，逐层处理未闭合的标签
      // 我们需要找到根节点（栈底）
      let rootNode = this.currentNode;
      while (this.stack.length > 0) {
        const parent = this.stack.pop()!;

        // 构建当前未闭合的节点（不包括闭合标签）
        const unclosedNode = this.buildTagNode();

        // 转义为文本（不包含闭合标签）
        const textRep = this.nodeToTextWithoutClosing(unclosedNode);

        // 从父节点中删除最后一个子节点（临时节点）
        parent.children.pop();

        // 添加转义后的文本
        this.addTextNodeToNode(parent, textRep);

        rootNode = parent;
      }

      // 设置根节点的子节点
      this.rootNode.children = rootNode.children;
    } else {
      // 所有标签都正确闭合，设置根节点的子节点
      this.rootNode.children = this.currentNode.children;
    }

    // 合并相邻的文本节点（但保留空标签）
    this.mergeTextNodesButPreserveEmptyTags(this.rootNode);
  }

  /**
   * 合并相邻的文本节点，但保留空标签
   */
  private mergeTextNodesButPreserveEmptyTags(node: TagNode): void {
    if (!node.children || node.children.length === 0) return;

    const mergedChildren: TagNode[] = [];
    let currentTextContent = '';

    for (const child of node.children) {
      // 递归处理子节点
      this.mergeTextNodesButPreserveEmptyTags(child);

      if (child.type === TagType.TEXT) {
        const content = child.content || '';

        // 检查是否是空标签
        if (content === '<>' || content === '</>') {
          // 如果有累积的文本，先添加
          if (currentTextContent) {
            mergedChildren.push({
              type: TagType.TEXT,
              content: currentTextContent
            });
            currentTextContent = '';
          }
          // 添加空标签
          mergedChildren.push(child);
        } else {
          // 累积文本内容
          currentTextContent += content;
        }
      } else {
        // 如果有累积的文本，先添加
        if (currentTextContent) {
          mergedChildren.push({
            type: TagType.TEXT,
            content: currentTextContent
          });
          currentTextContent = '';
        }
        // 添加非文本节点
        mergedChildren.push(child);
      }
    }

    // 添加剩余的文本
    if (currentTextContent) {
      mergedChildren.push({
        type: TagType.TEXT,
        content: currentTextContent
      });
    }

    node.children = mergedChildren;
  }

  /**
   * 将节点转换为文本表示（用于转义）
   */
  private nodeToText(node: TagNode): string {
    const tagName = node.type;
    const isClosing = node.children && node.children.length > 0;

    if (node.type === TagType.COLOR) {
      const colorValue = node.style?.color || '';
      return `<color=${colorValue}>${this.childrenToText(node.children || [])}</color>`;
    } else if (node.type === TagType.TEXT) {
      return node.content || '';
    } else if (isClosing) {
      return `<${tagName}>${this.childrenToText(node.children || [])}</${tagName}>`;
    } else {
      return `<${tagName}>`;
    }
  }

  /**
   * 将节点转换为文本表示（不包含闭合标签，用于未闭合标签）
   */
  private nodeToTextWithoutClosing(node: TagNode): string {
    if (node.type === TagType.COLOR) {
      const colorValue = node.style?.color || '';
      return `<color=${colorValue}>${this.childrenToText(node.children || [])}`;
    } else if (node.type === TagType.TEXT) {
      return node.content || '';
    } else {
      return `<${node.type}>${this.childrenToText(node.children || [])}`;
    }
  }

  /**
   * 将子节点转换为文本
   */
  private childrenToText(children: TagNode[]): string {
    return children.map(child => this.nodeToText(child)).join('');
  }
}
