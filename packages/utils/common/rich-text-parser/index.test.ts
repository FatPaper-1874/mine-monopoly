import { describe, it, expect } from 'vitest';
import { RichTextParser, parseRichText } from './index';

describe('RichTextParser', () => {
  describe('parse', () => {
    it('应该解析纯文本', () => {
      const parser = new RichTextParser();
      const result = parser.parse('简单文字');

      expect(result.type).toBe('text');
      expect(result.content).toBe('简单文字');
    });

    it('应该解析粗体', () => {
      const parser = new RichTextParser();
      const result = parser.parse('<b>粗体</b>');

      expect(result.type).toBe('span');
      expect(result.style).toEqual({ 'font-weight': 'bold' });
      expect(result.children![0].content).toBe('粗体');
    });

    it('应该解析颜色', () => {
      const parser = new RichTextParser();
      const result = parser.parse('<color=red>红色</color>');

      expect(result.type).toBe('span');
      expect(result.style?.color).toBe('red');
    });

    it('应该映射主题色', () => {
      const parser = new RichTextParser();
      const result = parser.parse('<color=primary>主题色</color>');

      expect(result.style?.color).toBe('#ff8f00');
    });

    it('应该解析嵌套标签', () => {
      const parser = new RichTextParser();
      const result = parser.parse('<b><color=red>文字</color></b>');

      expect(result.type).toBe('span');
      expect(result.style?.['font-weight']).toBe('bold');
      expect(result.children![0].style?.color).toBe('red');
    });

    it('应该处理空字符串', () => {
      const parser = new RichTextParser();
      const result = parser.parse('');

      expect(result.type).toBe('text');
      expect(result.content).toBe('');
    });

    it('应该解析斜体', () => {
      const parser = new RichTextParser();
      const result = parser.parse('<i>斜体</i>');

      expect(result.type).toBe('span');
      expect(result.style).toEqual({ 'font-style': 'italic' });
      expect(result.children![0].content).toBe('斜体');
    });

    it('应该解析下划线', () => {
      const parser = new RichTextParser();
      const result = parser.parse('<u>下划线</u>');

      expect(result.type).toBe('span');
      expect(result.style).toEqual({ 'text-decoration': 'underline' });
      expect(result.children![0].content).toBe('下划线');
    });

    it('应该解析换行', () => {
      const parser = new RichTextParser();
      const result = parser.parse('第一行<br>第二行');

      expect(result.type).toBe('text');
      expect(result.content).toBe('第一行');
      expect(result.children?.[0].type).toBe('text');
      expect(result.children?.[0].content).toBe('\n');
      expect(result.children?.[1].content).toBe('第二行');
    });

    it('应该解析混合标签', () => {
      const parser = new RichTextParser();
      const result = parser.parse('<b>粗体</b>和<color=red>红色</color>');

      expect(result.type).toBe('text');
      expect(result.children?.[0].type).toBe('span');
      expect(result.children?.[0].style?.['font-weight']).toBe('bold');
      expect(result.children?.[1].content).toBe('和');
      expect(result.children?.[2].type).toBe('span');
      expect(result.children?.[2].style?.color).toBe('red');
    });

    it('应该支持冒号语法（用户案例：ccc<color:red>ss</color>）', () => {
      const parser = new RichTextParser();
      const result = parser.parse('ccc<color:red>ss</color>');

      expect(result.type).toBe('text');
      expect(result.content).toBe('ccc');
      expect(result.children?.[0].type).toBe('span');
      expect(result.children?.[0].style?.color).toBe('red');
      expect(result.children?.[0].children?.[0].content).toBe('ss');
    });
  });

  describe('parseRichText 便捷函数', () => {
    it('应该正确解析富文本', () => {
      const result = parseRichText('<b>粗体</b>');

      expect(result.type).toBe('span');
      expect(result.style?.['font-weight']).toBe('bold');
    });

    it('应该正确解析纯文本', () => {
      const result = parseRichText('纯文本');

      expect(result.type).toBe('text');
      expect(result.content).toBe('纯文本');
    });

    it('应该正确解析颜色', () => {
      const result = parseRichText('<color=second>第二主题色</color>');

      expect(result.type).toBe('span');
      expect(result.style?.color).toBe('#ffa000');
    });
  });
});
