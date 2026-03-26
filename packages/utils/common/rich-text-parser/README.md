# 富文本解析器 (Rich Text Parser)

## 概述

富文本解析器是一个轻量级的文本标记解析系统，用于将简单的标记语法转换为 Vue UI Schema。它允许在对话框、消息卡片等 UI 组件中使用富文本格式，而无需编写复杂的 UI Schema。

## 核心特性

- **轻量级语法**：支持常见的文本格式标记（加粗、颜色、图标等）
- **类型安全**：完整的 TypeScript 类型支持
- **安全性**：严格的输入验证和转义，防止 XSS 攻击
- **可扩展**：易于添加新的标记类型
- **向后兼容**：纯文本自动转义，不影响现有代码

## 安装和使用

### 基本使用

```typescript
import { parseRichText } from '@mine-monopoly/utils';

// 解析富文本
const schema = parseRichText('欢迎来到 {color:#FF5722}大富翁{/color} 游戏！');

// schema 是一个 UISchema 对象，可以直接在组件中使用
```

### 在 Vue 组件中使用

```vue
<template>
  <UiRenderer :schema="parsedContent" :context="gameData" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { parseRichText } from '@mine-monopoly/utils';

const props = defineProps<{
  content: string;
}>();

const parsedContent = computed(() => {
  return parseRichText(props.content);
});
</script>
```

## 支持的标记

### 1. 文本样式标记

#### 加粗文本
```
{b}加粗文本{/b}
```

#### 斜体文本
```
{i}斜体文本{/i}
```

#### 下划线文本
```
{u}下划线文本{/u}
```

#### 删除线文本
```
{s}删除线文本{/s}
```

### 2. 颜色标记

#### 十六进制颜色
```
{color:#FF5722}红色文字{/color}
```

#### RGB/RGBA 颜色
```
{color:rgb(255, 87, 34)}红色文字{/color}
{color:rgba(255, 87, 34, 0.5)}半透明红色{/color}
```

#### 命名颜色
```
{color:red}红色文字{/color}
{color:blue}蓝色文字{/color}
{color:green}绿色文字{/color}
```

### 3. 图标标记

#### FontAwesome 图标
```
{icon:fa-home} 房子
{icon:fa-gear} 设置
```

**支持的图标名称**：
- 游戏相关：`fa-dice`, `fa-chess`, `fa-puzzle-piece`, `fa-flag`
- 界面相关：`fa-home`, `fa-gear`, `fa-bell`, `fa-question`, `fa-exclamation`
- 箭头：`fa-arrow-right`, `fa-arrow-left`, `fa-arrow-up`, `fa-arrow-down`
- 状态：`fa-check`, `fa-times`, `fa-info`, `fa-warning`

### 4. 链接标记

#### 普通链接
```
{link:https://example.com}点击这里{/link}
```

#### 带样式的链接
```
{link:https://example.com,color:#FF5722}红色链接{/link}
```

### 5. 间距标记

#### 水平间距
```
文本1{space:16}px}文本2  // 16px 间距
```

#### 换行
```
第一行{br}第二行
```

### 6. 组合使用

标记可以嵌套使用：

```
{b}{color:#FF5722}重要提示：{/color}{/b}
{icon:fa-info} 请{u}仔细阅读{/u}游戏规则
```

## 安全性说明

### HTML 转义

解析器会自动转义所有文本内容中的 HTML 特殊字符：

- `<` → `&lt;`
- `>` → `&gt;`
- `&` → `&amp;`
- `"` → `&quot;`
- `'` → `&#39;`

### 颜色验证

只有符合以下格式的颜色值才会被接受：

- 十六进制：`#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA`
- RGB/RGBA：`rgb(r, g, b)`, `rgba(r, g, b, a)`
- 命名颜色：CSS 标准颜色名称（如 `red`, `blue`, `green` 等）

无效的颜色值会被忽略，标记会被移除。

### 错误处理

- 未闭合的标记会被忽略
- 无效的标记语法会被视为纯文本
- 嵌套错误会导致外层标记被忽略

## 高级用法

### 自定义扩展

可以通过继承 `RichTextParser` 类来添加自定义标记：

```typescript
import { RichTextParser } from '@mine-monopoly/utils';

class CustomParser extends RichTextParser {
  protected getTokenSpecs() {
    return [
      ...super.getTokenSpecs(),
      {
        name: 'mytoken',
        pattern: /\{mytoken\}([\s\S]*?)\{\/mytoken\}/g,
        isSelfClosing: false,
        handler: (content) => ({
          type: 'my-component',
          props: { content }
        })
      }
    ];
  }
}
```

### 与表单结合

富文本解析器可以与表单系统结合使用：

```typescript
const schema = parseRichText(
  '{icon:fa-user} 请输入您的{b}用户名{/b}：'
);

// 在表单中使用
const formSchema = [
  {
    type: 'text',
    label: schema,
    field: 'username'
  }
];
```

## 性能考虑

- 解析器使用正则表达式和状态机，性能开销很小
- 解析结果可以缓存，避免重复解析
- 建议在 `computed` 属性中使用解析器

## 限制

1. **不支持 JavaScript 执行**：解析器仅生成 UI Schema，不执行任何 JavaScript 代码
2. **不支持动态内容**：标记内容在解析时确定，不能包含动态表达式
3. **有限的样式支持**：仅支持预定义的样式标记，不支持自定义 CSS

## 示例

### 游戏对话框

```typescript
const message = parseRichText(
  '{icon:fa-dice} 你掷出了 {b}{color:#FF5722}6{/color}{/b} 点！' +
  '{br}前进到 {color:#4CAF50}北京{/color}，{icon:fa-home} 购买价格：{b}¥1000{/b}'
);
```

### 机会卡

```typescript
const cardText = parseRichText(
  '{color:#FFD700}{icon:fa-star} 恭喜！{/color}' +
  '{br}你获得了一个{b}幸运 Bonus{/b}！' +
  '{br}{color:#4CAF50}+{icon:fa-coins} 500{/color}'
);
```

### 警告信息

```typescript
const warning = parseRichText(
  '{color:#FF5722}{icon:fa-warning} 警告：{/color}' +
  '{br}你的资金不足！' +
  '{br}当前：{color:#FF5722}{b}¥500{/b}{/color}，需要：¥1000'
);
```

## 调试

启用调试模式以查看解析过程：

```typescript
import { RichTextParser } from '@mine-monopoly/utils';

const parser = new RichTextParser(true); // 启用调试
const result = parser.parse('测试文本');
```

## 相关文档

- [UI Schema 规范](../../../types/interfaces/game/ui-schema/)
- [对话框组件](../../../../client/src/components/utils/fp-message-box/)
- [表单系统](../../../types/interfaces/game/action-system/)

## 更新日志

### v1.0.0 (2025-01-XX)
- 初始版本
- 支持基本文本样式标记
- 支持颜色标记
- 支持图标标记
- 支持链接标记
- 支持间距标记
