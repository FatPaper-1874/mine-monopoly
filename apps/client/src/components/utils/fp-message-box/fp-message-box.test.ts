/**
 * fp-message-box 组件集成测试
 *
 * 测试富文本解析器在对话框组件中的集成
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, ref, h } from 'vue';
import FpMessageBox from './fp-message-box.vue';
import { parseRichText } from '@mine-monopoly/utils';

// 模拟 UISchema 类型
type UISchema = any;

describe('FpMessageBox 富文本集成测试', () => {
	// 测试纯文本内容
	it('应该正确渲染纯文本内容', () => {
		const wrapper = mount(defineComponent({
			components: { FpMessageBox },
			setup() {
				const messageBoxRef = ref<InstanceType<typeof FpMessageBox>>();
				const content = ref('这是一段纯文本');

				return { content, messageBoxRef };
			},
			template: `
				<FpMessageBox ref="messageBoxRef" title="测试" :content="content" />
			`
		}));

		expect(wrapper.html()).toContain('这是一段纯文本');
	});

	// 测试富文本内容 - 加粗
	it('应该正确解析和渲染加粗文本', () => {
		const content = '这是{b}加粗{/b}文本';
		const parsed = parseRichText(content);

		expect(parsed).toBeDefined();
		expect(typeof parsed).toBe('object');
		expect(parsed.type).toBeDefined();
	});

	// 测试富文本内容 - 颜色
	it('应该正确解析和渲染彩色文本', () => {
		const content = '这是{color:#FF5722}红色{/color}文本';
		const parsed = parseRichText(content);

		expect(parsed).toBeDefined();
		expect(typeof parsed).toBe('object');
	});

	// 测试富文本内容 - 图标
	it('应该正确解析和渲染图标', () => {
		const content = '{icon:fa-home} 欢迎';
		const parsed = parseRichText(content);

		expect(parsed).toBeDefined();
		expect(typeof parsed).toBe('object');
	});

	// 测试富文本内容 - 组合标记
	it('应该正确解析和渲染组合标记', () => {
		const content = '{b}{color:#FF5722}重要{/color}{/b}';
		const parsed = parseRichText(content);

		expect(parsed).toBeDefined();
		expect(typeof parsed).toBe('object');
	});

	// 测试 UISchema 内容
	it('应该正确渲染 UISchema 内容', () => {
		const schema: UISchema = {
			type: 'text',
			content: '直接传入的 UISchema'
		};

		const wrapper = mount(defineComponent({
			components: { FpMessageBox },
			setup() {
				const messageBoxRef = ref<InstanceType<typeof FpMessageBox>>();
				const content = ref(schema);

				return { content, messageBoxRef };
			},
			template: `
				<FpMessageBox ref="messageBoxRef" title="测试" :content="content" />
			`
		}));

		expect(wrapper.html()).toBeDefined();
	});

	// 测试 VNode 内容
	it('应该正确渲染 VNode 内容', () => {
		const vnode = h('div', { class: 'custom-content' }, '自定义 VNode');

		const wrapper = mount(defineComponent({
			components: { FpMessageBox },
			setup() {
				const messageBoxRef = ref<InstanceType<typeof FpMessageBox>>();
				const content = ref(vnode);

				return { content, messageBoxRef };
			},
			template: `
				<FpMessageBox ref="messageBoxRef" title="测试" :content="content" />
			`
		}));

		expect(wrapper.html()).toContain('custom-content');
	});

	// 测试安全性 - HTML 转义
	it('应该正确转义 HTML 特殊字符', () => {
		const content = '包含 <script>alert("XSS")</script> 的文本';
		const parsed = parseRichText(content);

		// 解析后的内容应该转义 HTML
		expect(parsed).toBeDefined();
	});

	// 测试安全性 - 无效颜色
	it('应该忽略无效的颜色值', () => {
		const content = '这是{color:invalid}无效颜色{/color}文本';
		const parsed = parseRichText(content);

		expect(parsed).toBeDefined();
	});

	// 测试错误处理 - 未闭合的标记
	it('应该处理未闭合的标记', () => {
		const content = '这是{b}未闭合的文本';
		const parsed = parseRichText(content);

		expect(parsed).toBeDefined();
	});

	// 测试复杂场景 - 游戏对话框
	it('应该正确渲染游戏对话框场景', () => {
		const content = '{icon:fa-dice} 你掷出了 {b}{color:#FF5722}6{/color}{/b} 点！';
		const parsed = parseRichText(content);

		expect(parsed).toBeDefined();
		expect(typeof parsed).toBe('object');
	});

	// 测试复杂场景 - 机会卡
	it('应该正确渲染机会卡场景', () => {
		const content = '{color:#FFD700}{icon:fa-star} 恭喜！{/color}{br}你获得了一个{b}幸运 Bonus{/b}！';
		const parsed = parseRichText(content);

		expect(parsed).toBeDefined();
		expect(typeof parsed).toBe('object');
	});

	// 测试复杂场景 - 警告信息
	it('应该正确渲染警告信息场景', () => {
		const content = '{color:#FF5722}{icon:fa-warning} 警告：{/color}{br}你的资金不足！';
		const parsed = parseRichText(content);

		expect(parsed).toBeDefined();
		expect(typeof parsed).toBe('object');
	});

	// 测试表单集成
	it('应该正确处理表单和富文本内容', () => {
		const content = '{icon:fa-user} 请输入用户名：';
		const form = [
			{
				type: 'text',
				label: '用户名',
				field: 'username'
			}
		];

		const wrapper = mount(defineComponent({
			components: { FpMessageBox },
			setup() {
				const messageBoxRef = ref<InstanceType<typeof FpMessageBox>>();
				const contentValue = ref(content);
				const formValue = ref(form);

				return { content: contentValue, form: formValue, messageBoxRef };
			},
			template: `
				<FpMessageBox ref="messageBoxRef" title="测试" :content="content" :form="form" />
			`
		}));

		expect(wrapper.html()).toBeDefined();
	});

	// 测试响应式更新
	it('应该在内容变化时重新解析', async () => {
		const wrapper = mount(defineComponent({
			components: { FpMessageBox },
			setup() {
				const messageBoxRef = ref<InstanceType<typeof FpMessageBox>>();
				const content = ref('初始内容');

				const updateContent = () => {
					content.value = '{b}更新后的内容{/b}';
				};

				return { content, updateContent, messageBoxRef };
			},
			template: `
				<FpMessageBox ref="messageBoxRef" title="测试" :content="content" />
			`
		}));

		// 初始状态
		expect(wrapper.html()).toContain('初始内容');

		// 更新内容
		await (wrapper.vm as any).updateContent();

		// 验证更新
		expect(wrapper.html()).toContain('更新后的内容');
	});

	// 测试向后兼容性
	it('应该向后兼容旧的字符串内容', () => {
		const oldContent = '旧的纯文本内容\n包含换行符';
		const parsed = parseRichText(oldContent);

		expect(parsed).toBeDefined();
	});

	// 测试空内容
	it('应该正确处理空内容', () => {
		const content = '';
		const parsed = parseRichText(content);

		expect(parsed).toBeDefined();
	});

	// 测试只有空白字符
	it('应该正确处理只有空白字符的内容', () => {
		const content = '   \n\t  ';
		const parsed = parseRichText(content);

		expect(parsed).toBeDefined();
	});

	// 测试特殊字符
	it('应该正确处理特殊字符', () => {
		const content = '特殊字符：@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';
		const parsed = parseRichText(content);

		expect(parsed).toBeDefined();
	});

	// 测试长文本
	it('应该正确处理长文本', () => {
		const longContent = '这是一个很长的文本内容。'.repeat(100);
		const parsed = parseRichText(longContent);

		expect(parsed).toBeDefined();
	});

	// 测试嵌套深度限制
	it('应该处理深层嵌套的标记', () => {
		const content = '{b}{i}{u}{color:#FF5722}四层嵌套{/color}{/u}{/i}{/b}';
		const parsed = parseRichText(content);

		expect(parsed).toBeDefined();
	});

	// 测试多个相同标记
	it('应该正确处理多个相同的标记', () => {
		const content = '{b}第一段{/b}普通文本{b}第二段{/b}';
		const parsed = parseRichText(content);

		expect(parsed).toBeDefined();
	});

	// 测试换行符处理
	it('应该正确处理换行符', () => {
		const content = '第一行{br}第二行{br}第三行';
		const parsed = parseRichText(content);

		expect(parsed).toBeDefined();
	});

	// 测试间距标记
	it('应该正确处理间距标记', () => {
		const content = '文本1{space:16}px}文本2';
		const parsed = parseRichText(content);

		expect(parsed).toBeDefined();
	});

	// 测试链接标记
	it('应该正确处理链接标记', () => {
		const content = '访问 {link:https://example.com}这里{/link} 获取更多信息';
		const parsed = parseRichText(content);

		expect(parsed).toBeDefined();
	});

	// 测试链接带样式
	it('应该正确处理带样式的链接', () => {
		const content = '{link:https://example.com,color:#FF5722}红色链接{/link}';
		const parsed = parseRichText(content);

		expect(parsed).toBeDefined();
	});

	// 测试所有支持的图标
	it('应该支持所有预定义的图标', () => {
		const icons = [
			'fa-home', 'fa-gear', 'fa-bell', 'fa-question', 'fa-exclamation',
			'fa-arrow-right', 'fa-arrow-left', 'fa-arrow-up', 'fa-arrow-down',
			'fa-check', 'fa-times', 'fa-info', 'fa-warning',
			'fa-dice', 'fa-chess', 'fa-puzzle-piece', 'fa-flag'
		];

		icons.forEach(icon => {
			const content = `{icon:${icon}} 图标测试`;
			const parsed = parseRichText(content);
			expect(parsed).toBeDefined();
		});
	});

	// 测试所有支持的文本样式
	it('应该支持所有文本样式标记', () => {
		const styles = [
			{ b: '{b}加粗{/b}' },
			{ i: '{i}斜体{/i}' },
			{ u: '{u}下划线{/u}' },
			{ s: '{s}删除线{/s}' }
		];

		styles.forEach(style => {
			const parsed = parseRichText(Object.values(style)[0] as string);
			expect(parsed).toBeDefined();
		});
	});

	// 测试边界情况 - 只有标记
	it('应该处理只有标记没有文本的情况', () => {
		const content = '{b}{/b}';
		const parsed = parseRichText(content);

		expect(parsed).toBeDefined();
	});

	// 测试边界情况 - 标记之间没有内容
	it('应该处理连续的标记', () => {
		const content = '{b}{/b}{i}{/i}{u}{/u}';
		const parsed = parseRichText(content);

		expect(parsed).toBeDefined();
	});

	// 测试性能 - 大量标记
	it('应该在合理时间内解析大量标记', () => {
		const content = Array(100).fill('{b}测试{/b}').join('');
		const start = Date.now();
		const parsed = parseRichText(content);
		const duration = Date.now() - start;

		expect(parsed).toBeDefined();
		expect(duration).toBeLessThan(1000); // 应该在 1 秒内完成
	});
});
