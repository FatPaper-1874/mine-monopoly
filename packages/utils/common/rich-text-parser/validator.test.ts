// packages/utils/common/rich-text-parser/validator.test.ts
import { describe, it, expect } from 'vitest';
import { validateColor, getColorValue } from './validator';

describe('颜色验证器', () => {
  describe('validateColor', () => {
    it('应该接受标准颜色名称', () => {
      expect(validateColor('red')).toBe(true);
      expect(validateColor('blue')).toBe(true);
      expect(validateColor('green')).toBe(true);
    });

    it('应该接受游戏主题色', () => {
      expect(validateColor('primary')).toBe(true);
      expect(validateColor('second')).toBe(true);
      expect(validateColor('third')).toBe(true);
    });

    it('应该接受十六进制颜色', () => {
      expect(validateColor('#ff0000')).toBe(true);
      expect(validateColor('#00ff00')).toBe(true);
      expect(validateColor('#0000ff')).toBe(true);
    });

    it('应该接受 RGB 颜色', () => {
      expect(validateColor('rgb(255, 0, 0)')).toBe(true);
      expect(validateColor('rgb(0, 255, 0)')).toBe(true);
      expect(validateColor('rgb(  100  ,  200  ,  50  )')).toBe(true);
      expect(validateColor('rgb(255, 255, 255)')).toBe(true); // RGB 边界值
      expect(validateColor('rgb(0, 0, 0)')).toBe(true); // RGB 边界值
    });

    it('应该拒绝非法颜色值', () => {
      expect(validateColor('javascript:alert(1)')).toBe(false);
      expect(validateColor('invalid')).toBe(false);
      expect(validateColor('#gggggg')).toBe(false);
      expect(validateColor('rgb(300, 0, 0)')).toBe(false); // RGB 超出范围
      expect(validateColor('rgb(-1, 0, 0)')).toBe(false); // RGB 负值
      expect(validateColor('rgb(256, 0, 0)')).toBe(false); // RGB 超出范围
      expect(validateColor('')).toBe(false);
    });
  });

  describe('getColorValue', () => {
    it('应该映射主题色到十六进制值', () => {
      expect(getColorValue('primary')).toBe('#ff8f00');
      expect(getColorValue('second')).toBe('#ffa000');
      expect(getColorValue('third')).toBe('#ffc10f');
    });

    it('应该直接返回其他颜色值', () => {
      expect(getColorValue('red')).toBe('red');
      expect(getColorValue('#ff0000')).toBe('#ff0000');
      expect(getColorValue('rgb(255, 0, 0)')).toBe('rgb(255, 0, 0)');
    });
  });
});
