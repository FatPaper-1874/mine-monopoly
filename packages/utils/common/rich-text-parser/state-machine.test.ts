import { describe, it, expect } from 'vitest';
import { RichTextStateMachine } from './state-machine';
import { TagType } from './tokens';

describe('RichTextStateMachine', () => {
  const parser = new RichTextStateMachine();

  describe('解析纯文本', () => {
    it('应该正确解析纯文本', () => {
      const result = parser.parse('Hello World');
      expect(result.children).toHaveLength(1);
      expect(result.children![0].type).toBe(TagType.TEXT);
      expect(result.children![0].content).toBe('Hello World');
    });

    it('应该正确解析空字符串', () => {
      const result = parser.parse('');
      expect(result.children).toHaveLength(0);
    });

    it('应该正确解析包含特殊字符的文本', () => {
      const result = parser.parse('Hello & goodbye <test>');
      expect(result.children).toHaveLength(1);
      expect(result.children![0].type).toBe(TagType.TEXT);
      expect(result.children![0].content).toBe('Hello & goodbye <test>');
    });
  });

  describe('解析粗体标签', () => {
    it('应该正确解析粗体文本', () => {
      const result = parser.parse('<b>Bold text</b>');
      expect(result.children).toHaveLength(1);
      expect(result.children![0].type).toBe(TagType.BOLD);
      expect(result.children![0].children).toHaveLength(1);
      expect(result.children![0].children![0].type).toBe(TagType.TEXT);
      expect(result.children![0].children![0].content).toBe('Bold text');
    });

    it('应该正确解析多个粗体标签', () => {
      const result = parser.parse('<b>Bold1</b> and <b>Bold2</b>');
      expect(result.children).toHaveLength(3);
      expect(result.children![0].type).toBe(TagType.BOLD);
      expect(result.children![1].type).toBe(TagType.TEXT);
      expect(result.children![2].type).toBe(TagType.BOLD);
    });
  });

  describe('解析颜色标签', () => {
    it('应该正确解析颜色名称', () => {
      const result = parser.parse('<color=red>Red text</color>');
      expect(result.children).toHaveLength(1);
      expect(result.children![0].type).toBe(TagType.COLOR);
      expect(result.children![0].style?.color).toBe('red');
      expect(result.children![0].children).toHaveLength(1);
      expect(result.children![0].children![0].content).toBe('Red text');
    });

    it('应该正确解析十六进制颜色', () => {
      const result = parser.parse('<color=#ff0000>Red text</color>');
      expect(result.children).toHaveLength(1);
      expect(result.children![0].type).toBe(TagType.COLOR);
      expect(result.children![0].style?.color).toBe('#ff0000');
    });

    it('应该正确解析 RGB 颜色', () => {
      const result = parser.parse('<color=rgb(255, 0, 0)>Red text</color>');
      expect(result.children).toHaveLength(1);
      expect(result.children![0].type).toBe(TagType.COLOR);
      expect(result.children![0].style?.color).toBe('rgb(255, 0, 0)');
    });

    it('应该正确解析主题色', () => {
      const result = parser.parse('<color=primary>Primary text</color>');
      expect(result.children).toHaveLength(1);
      expect(result.children![0].type).toBe(TagType.COLOR);
      expect(result.children![0].style?.color).toBe('#ff8f00');
    });

    it('应该转义无效的颜色值', () => {
      const result = parser.parse('<color=invalid>Text</color>');
      expect(result.children).toHaveLength(1);
      expect(result.children![0].type).toBe(TagType.TEXT);
      expect(result.children![0].content).toBe('<color=invalid>Text</color>');
    });
  });

  describe('解析换行', () => {
    it('应该正确解析换行标签', () => {
      const result = parser.parse('Line 1<br>Line 2');
      expect(result.children).toHaveLength(3);
      expect(result.children![0].type).toBe(TagType.TEXT);
      expect(result.children![1].type).toBe(TagType.LINE_BREAK);
      expect(result.children![2].type).toBe(TagType.TEXT);
    });

    it('应该正确解析多个换行标签', () => {
      const result = parser.parse('Line 1<br><br>Line 2');
      expect(result.children).toHaveLength(4);
      expect(result.children![1].type).toBe(TagType.LINE_BREAK);
      expect(result.children![2].type).toBe(TagType.LINE_BREAK);
    });
  });

  describe('解析嵌套标签', () => {
    it('应该正确解析嵌套的粗体和斜体', () => {
      const result = parser.parse('<b>Bold <i>italic</i> text</b>');
      expect(result.children).toHaveLength(1);
      expect(result.children![0].type).toBe(TagType.BOLD);
      expect(result.children![0].children).toHaveLength(3);
      expect(result.children![0].children![0].type).toBe(TagType.TEXT);
      expect(result.children![0].children![1].type).toBe(TagType.ITALIC);
      expect(result.children![0].children![2].type).toBe(TagType.TEXT);
    });

    it('应该正确解析多层嵌套', () => {
      const result = parser.parse('<b>Bold <i>italic <u>underline</u></i></b>');
      expect(result.children).toHaveLength(1);
      expect(result.children![0].type).toBe(TagType.BOLD);
      expect(result.children![0].children![1].type).toBe(TagType.ITALIC);
      expect(result.children![0].children![1].children![1].type).toBe(TagType.UNDERLINE);
    });

    it('应该正确解析嵌套的颜色标签', () => {
      const result = parser.parse('<color=red>Red <b>bold</b> text</color>');
      expect(result.children).toHaveLength(1);
      expect(result.children![0].type).toBe(TagType.COLOR);
      expect(result.children![0].children).toHaveLength(3);
      expect(result.children![0].children![1].type).toBe(TagType.BOLD);
    });
  });

  describe('转义未闭合标签', () => {
    it('应该转义未闭合的粗体标签', () => {
      const result = parser.parse('<b>Unclosed bold');
      expect(result.children).toHaveLength(1);
      expect(result.children![0].type).toBe(TagType.TEXT);
      expect(result.children![0].content).toBe('<b>Unclosed bold');
    });

    it('应该转义未闭合的颜色标签', () => {
      const result = parser.parse('<color=red>Unclosed color');
      expect(result.children).toHaveLength(1);
      expect(result.children![0].type).toBe(TagType.TEXT);
      expect(result.children![0].content).toBe('<color=red>Unclosed color');
    });

    it('应该正确处理未闭合的嵌套标签', () => {
      const result = parser.parse('<b>Outer <i>Inner</b>');
      expect(result.children).toHaveLength(1);
      expect(result.children![0].type).toBe(TagType.TEXT);
      // 未闭合的标签应该被转义为文本
      expect(result.children![0].content).toContain('<i>Inner</i>');
    });
  });

  describe('转义非法标签', () => {
    it('应该转义非法的标签名', () => {
      const result = parser.parse('<script>alert("xss")</script>');
      expect(result.children).toHaveLength(1);
      expect(result.children![0].type).toBe(TagType.TEXT);
      expect(result.children![0].content).toBe('<script>alert("xss")</script>');
    });

    it('应该转义空的标签', () => {
      const result = parser.parse('Text <> more');
      expect(result.children).toHaveLength(3);
      expect(result.children![0].type).toBe(TagType.TEXT);
      expect(result.children![1].type).toBe(TagType.TEXT);
      expect(result.children![1].content).toBe('<>');
    });

    it('应该转义空的自闭合标签', () => {
      const result = parser.parse('Text </> more');
      expect(result.children).toHaveLength(3);
      expect(result.children![0].type).toBe(TagType.TEXT);
      expect(result.children![1].type).toBe(TagType.TEXT);
      expect(result.children![1].content).toBe('</>');
    });

    it('应该转义带有非法属性的非颜色标签', () => {
      const result = parser.parse('<b=value>Bold</b>');
      expect(result.children).toHaveLength(1);
      expect(result.children![0].type).toBe(TagType.TEXT);
      expect(result.children![0].content).toBe('<b=value>Bold</b>');
    });

    it('应该转义嵌套的 < 字符', () => {
      const result = parser.parse('Text <<b>> more');
      expect(result.children).toHaveLength(1);
      expect(result.children![0].type).toBe(TagType.TEXT);
      expect(result.children![0].content).toBe('Text <<b>> more');
    });
  });

  describe('复杂场景', () => {
    it('应该正确解析混合标签', () => {
      const result = parser.parse('Normal <b>bold</b> and <color=red>red <i>italic</i></color> text');
      expect(result.children).toHaveLength(5);
      expect(result.children![0].type).toBe(TagType.TEXT);
      expect(result.children![1].type).toBe(TagType.BOLD);
      expect(result.children![2].type).toBe(TagType.TEXT);
      expect(result.children![3].type).toBe(TagType.COLOR);
      expect(result.children![4].type).toBe(TagType.TEXT);
    });

    it('应该正确处理连续的相同标签', () => {
      const result = parser.parse('<b>Bold1</b><b>Bold2</b>');
      expect(result.children).toHaveLength(2);
      expect(result.children![0].type).toBe(TagType.BOLD);
      expect(result.children![1].type).toBe(TagType.BOLD);
    });

    it('应该正确处理带换行的复杂文本', () => {
      const result = parser.parse('Line1<br><b>Bold<br>Line2</b>');
      expect(result.children).toHaveLength(3);
      expect(result.children![0].type).toBe(TagType.TEXT);
      expect(result.children![1].type).toBe(TagType.LINE_BREAK);
      expect(result.children![2].type).toBe(TagType.BOLD);
    });
  });

  describe('边界情况', () => {
    it('应该正确处理只有标签的情况', () => {
      const result = parser.parse('<b></b>');
      expect(result.children).toHaveLength(1);
      expect(result.children![0].type).toBe(TagType.BOLD);
      expect(result.children![0].children).toHaveLength(0);
    });

    it('应该正确处理标签后的文本', () => {
      const result = parser.parse('<b>Bold</b> after');
      expect(result.children).toHaveLength(2);
      expect(result.children![0].type).toBe(TagType.BOLD);
      expect(result.children![1].type).toBe(TagType.TEXT);
      expect(result.children![1].content).toBe(' after');
    });

    it('应该正确处理标签前的文本', () => {
      const result = parser.parse('before <b>Bold</b>');
      expect(result.children).toHaveLength(2);
      expect(result.children![0].type).toBe(TagType.TEXT);
      expect(result.children![0].content).toBe('before ');
      expect(result.children![1].type).toBe(TagType.BOLD);
    });
  });
});
