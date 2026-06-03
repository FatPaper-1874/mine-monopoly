# Contributing to MineMonopoly

感谢你对 MineMonopoly 的关注！这份指南将帮助你了解如何参与项目开发。

## 报告 Bug

在 [Issues](https://github.com/FatPaper-1874/mine-monopoly/issues) 中提交 Bug 报告时，请提供：

- 操作系统和版本（Windows/macOS）
- Node.js 版本 (`node --version`)
- 复现步骤
- 预期行为和实际行为
- 相关的控制台错误日志或截图

## 功能建议

欢迎提出功能建议！请在 [Issues](https://github.com/FatPaper-1874/mine-monopoly/issues) 中选择 Feature Request 模板，描述你的需求和场景。

## 开发环境搭建

### 前提条件

- Node.js 20+
- pnpm 10.10.0+
- MySQL 8.0+

### 初始化项目

```bash
git clone https://github.com/FatPaper-1874/mine-monopoly.git
cd mine-monopoly
pnpm install
cp .env.example .env
# 编辑 .env 配置数据库等信息
```

### 开发命令

```bash
pnpm dev-client    # 客户端 http://localhost:5173
pnpm dev-server    # 服务器
pnpm dev-editor    # 地图编辑器
pnpm dev-admin     # 管理后台
```

## 代码规范

- 全栈 TypeScript，严格类型检查
- effectCode 使用 async 箭头函数格式：`async (cmd, ctx) => { ... }`
- 修饰器使用 `modifierManager.add()`（不是已废弃的 `registerModifier`）
- 提交前运行类型检查：`pnpm check-all`

详见 [开发指南](docs/development-guide.md)。

## Pull Request 流程

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/your-feature-name`
3. 提交更改（遵循 Conventional Commit 规范）
4. 推送分支：`git push origin feature/your-feature-name`
5. 在 GitHub 上发起 Pull Request

### Commit 规范

项目使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>: <中文简要描述>

- 详细变更点（可选）
```

类型：`feat`、`fix`、`refactor`、`style`、`perf`、`chore`

## 版本管理

项目使用 [Changesets](https://github.com/changesets/changesets) 管理版本。发布流程：

1. 运行 `pnpm changeset` 创建变更记录
2. 提交变更记录随 PR 一起
3. 合并后由维护者统一发布

## 许可证

贡献的代码将基于 [GPL-3.0](LICENSE) 许可证发布。
