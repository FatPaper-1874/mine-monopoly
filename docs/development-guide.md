# 开发指南

## 关键概念

### 游戏进程

核心逻辑在 `GameProcessWorker` (Web Worker) 中运行，确保游戏逻辑不阻塞 UI 渲染。

**关键文件：**
- 实现: [apps/client/src/core/worker/GameProcessWorker.ts](../apps/client/src/core/worker/GameProcessWorker.ts)
- 按钮控制器: [apps/client/src/core/worker/ButtonController.ts](../apps/client/src/core/worker/ButtonController.ts)
- 类型定义: [packages/types/interfaces/game/game-process/](../packages/types/interfaces/game/game-process/)

**核心系统：**
- **命令模式** - 实现游戏动作的封装和执行
- **修饰器系统** - 动态扩展命令功能
- **阶段系统** - 管理游戏流程和状态转换
- **事件总线** - 处理组件间通信
- **回合状态机** - `TurnState` (WAITING_TURN / MY_TURN / ANIMATING / TIMEOUT / BANKRUPTED) 集中管理回合操作状态

### 通信协议

类型安全的 Socket 消息系统，确保前后端通信的可靠性。

**关键文件：**
- 类型定义: [packages/types/interfaces/game/socket.ts](../packages/types/interfaces/game/socket.ts)

**特性：**
- TypeScript 类型安全
- Protocol Buffers 高效序列化
- 消息类型验证

### 地图系统

基于 Protocol Buffers 的地图数据存储和加载系统。

**关键文件：**
- Proto 定义: [packages/utils/protos/game-map.proto](../packages/utils/protos/game-map.proto)

**特性：**
- 二进制序列化，体积小、加载快
- 类型安全的地图数据结构
- MySQL 数据库存储
- 支持地图版本管理和分享

### UISchema 系统

`UISchema` 是项目中用于描述 UI 元素的数据结构，由 `UiRenderer` 组件统一渲染。

**关键文件：**
- 类型定义: [packages/types/interfaces/game/game-process/ui.ts](../packages/types/interfaces/game/game-process/ui.ts)
- 渲染器: [apps/client/src/components/utils/ui-renderer/ui-renderer.vue](../apps/client/src/components/utils/ui-renderer/ui-renderer.vue)

**特性：**
- 声明式 UI 描述，支持多种组件类型
- **变量作用域** - `variable` 字段为节点和子节点提供作用域变量绑定
- **纯文本 display** - `SelectorItem.display` 支持 `UISchema | string`，UISchema 模式去除边框背景
- 组件模板按名称排序，支持复制 UI 标识

### 富文本解析器

轻量级富文本解析系统，集成到对话框和选择器组件中。

**关键文件：**
- 解析器: [packages/utils/common/rich-text-parser/index.ts](../packages/utils/common/rich-text-parser/index.ts)

**支持的标签语法：**
- `<color:颜色值>` 颜色
- `<b>` 粗体、`<i>` 斜体、`<u>` 下划线
- `<br>` 换行

### 金钱流动标签系统

通过 `MoneyTag` 标记金钱变动的来源，用于 UI 展示和追踪。

**关键文件：**
- 类型定义: [packages/types/interfaces/game/game-process/money-tag.ts](../packages/types/interfaces/game/game-process/money-tag.ts)

**标签类型：**
- `SYSTEM` - 系统操作（过起点等）
- `PLAYER` - 玩家间交易
- `CARD` - 机会卡效果
- `PROPERTY` - 地产相关

`Player.cost()` 返回 `{ money, target?, tag?, success, actualCost, remainingMoney }`，其中 `actualCost` 是实际扣除金额（钱不够时扣光所有钱，`success` 为 false）。涉及金钱转移时应用 `actualCost` 而非原始金额。`Player.gain()` 返回 `{ money, source?, tag? }`。

### MCP 服务

地图编辑器的 AI 辅助接口，通过 IPC Bridge 实现主进程与渲染进程通信。

**关键文件：**
- 服务入口: [apps/map-editor/src/mcp/server.ts](../apps/map-editor/src/mcp/server.ts)
- IPC 桥接: [apps/map-editor/src/mcp/bridge.ts](../apps/map-editor/src/mcp/bridge.ts)
- 工具定义: [apps/map-editor/src/mcp/tools/](../apps/map-editor/src/mcp/tools/)

**可用接口：**

| 分类 | 工具名 | 说明 |
|------|--------|------|
| System | check_mcp_connection | 检查连接状态 |
| Map Items | list_map_items / get_map_item | 查询地图元素 |
| Map Events | list_map_events / get_map_event / create_map_event / update_map_event / delete_map_event | 地图事件 CRUD |
| Chance Cards | list_chance_cards / get_chance_card / create_chance_card / update_chance_card / delete_chance_card | 机会卡 CRUD |
| Roles | list_roles / get_role / create_role / update_role / delete_role | 角色 CRUD |
| Properties | list_properties / get_property / create_property / update_property / delete_property | 地产 CRUD |
| Game Phases | list_game_phases / create_game_phase / update_game_phase / delete_game_phase | 游戏阶段 CRUD |
| Game Settings | get_game_settings / update_game_settings | 游戏设置读写 |
| Modifier Templates | list_modifier_templates / create_modifier_template / update_modifier_template / delete_modifier_template | 修饰器模板 CRUD |
| UI Templates | list_ui_templates / create_ui_template / update_ui_template / delete_ui_template | UI 模板 CRUD |
| Custom UIs | list_custom_uis / create_custom_ui / update_custom_ui / delete_custom_ui | 自定义 UI CRUD |
| Extra Libs | list_extra_libs / create_extra_lib / update_extra_lib / delete_extra_lib | 额外库 CRUD |
| Type Libs | list_type_libs / create_type_lib / update_type_lib / delete_type_lib | 类型库 CRUD |
| Resources | list_models / list_images / get_resource_by_id / add_temp_model / add_temp_image | 资源文件管理 |
| Validation | validate_effect_code | 校验 effectCode TypeScript 类型 |

### 游戏存档系统

基于 IndexedDB 的游戏存档系统，支持房主手动保存/读取游戏状态。

**关键文件：**
- 类型定义: [packages/types/interfaces/game/game-process/entities.ts](../packages/types/interfaces/game/game-process/entities.ts)

**特性：**
- 房主手动触发保存和读取
- 每个重要类（Player、Property、ModifierManager）通过 `getSnapshot()`/`restoreFromSnapshot()` 封装序列化职责
- Post-Init 注入模式：复用完整游戏启动流程，在所有客户端加载完毕后注入存档数据
- 修饰器函数通过 `fn.toString()` 序列化

### 修饰器模板系统

地图编辑器中的修饰器模板管理功能，支持创建、编辑、删除修饰器模板。

**关键文件：**
- MCP 工具: [apps/map-editor/src/mcp/tools/modifier-templates.ts](../apps/map-editor/src/mcp/tools/modifier-templates.ts)
- API 文档: [docs/api/modifier-system.md](modifier-system.md)

**特性：**
- 独立实例机制：每次添加修饰器生成唯一实例 ID
- 支持模板化的修饰器创建和管理
- 与 MCP 工具集成，支持 AI 辅助编写

### effectCode 类型校验

MCP ``validate_effect_code`` 工具支持对 effectCode 进行 TypeScript 类型校验。

**关键文件：**
- 校验工具: [apps/map-editor/src/mcp/tools/validate-effect-code.ts](../apps/map-editor/src/mcp/tools/validate-effect-code.ts)

**特性：**
- 校验 effectCode、initCode、initEventCode、extraLibs 等代码字段
- 动态生成 editor.d.ts 类型声明
- 返回结构化的错误信息，便于 AI 修正代码
### 3D 机会卡渲染

使用 Three.js 实现真正的 3D 机会卡展示。

**关键文件：**
- 3D 渲染: [apps/client/src/core/three/ChanceCard3D.ts](../apps/client/src/core/three/ChanceCard3D.ts)
- 纹理生成: [apps/client/src/core/three/ChanceCardTextureGenerator.ts](../apps/client/src/core/three/ChanceCardTextureGenerator.ts)

**架构：**
- Pivot 层：控制位置和朝向
- Mesh 层：3D 翻转动画
- 支持随机弧线运动和翻转效果

## API 参考

### GameProcessWorker API

在 GameProcessWorker 或游戏逻辑代码中可用的 API。

**获取所有玩家 ID：**
```typescript
const allPlayerIds = gameProcess.getAllPlayersId();
```

**下一帧执行：**
```typescript
gameProcess.nextTick((ctx, gp) => {
  // ctx: GameContext, gp: IGameProcess
});
```

**金钱操作（带标签）：**
```typescript
const result = await player.cost(100, { tag: MoneyTag.PROPERTY });
const result = await player.gain(200, { tag: MoneyTag.CARD });
```

### 动态按钮注册 API

允许在游戏过程中为指定玩家动态注册自定义按钮，显示在骰子按钮旁边。

**注册按钮：**
```typescript
const button = gameProcess.registerPlayerButton(
  playerId,
  "使用技能",
  async () => {
    // 执行技能逻辑
  }
);
```

**控制按钮状态：**
```typescript
button.setEnabled(false);   // 禁用
button.setVisible(false);   // 隐藏
button.setText("冷却中");   // 更新文案
button.remove();            // 移除
```

**注意事项：**
- 每次注册生成唯一按钮 ID
- 按钮需手动移除（玩家离线除外）
- 回调执行期间按钮自动禁用，防止重复点击
- 回调中的错误会被捕获，不影响游戏流程
- 每个玩家建议不超过 5 个按钮，超出自动切换为滚动布局

### 修饰器系统 API

修饰器用于动态扩展命令功能。

**添加修饰器：**
```typescript
const modifier = player.add("mod_name", {
  consume: 3,              // 自动消耗次数
  onComplete: () => {},    // 完成回调
  execute: async (ctx) => {
    // 修饰器逻辑
  }
});
```

**手动消耗：**
```typescript
const result = await modifier.consume();
// result 为 ConsumeResult，包含消耗是否成功等信息
```

**条件跳过：** 修饰器支持条件判断，满足条件时跳过执行。

### 回合事件（命令系统）

玩家回合事件已迁移到命令系统，通过 commandBus 触发：

- `player.round.start` - 玩家回合开始
- `player.round.end` - 玩家回合结束
- `player.round.skip` - 玩家跳过回合

## 开发规范

### 通用规范

- **使用中文**：回复、代码注释、Git 提交信息都必须使用中文
- **类型导入**：始终从 `@mine-monopoly/types` 导入类型
- **环境变量**：从 `@mine-monopoly/env` 导入，不要直接使用 `process.env`
- **工作区协议**：包间依赖使用 `workspace:*`

### Git 规范

- ❌ 禁止包含 `Co-Authored-By: Claude Sonnet` 等 AI 签名
- ✅ 使用纯用户身份提交，提交信息用中文清晰描述变更
- ✅ 完成相关任务后，使用 `git reset --soft HEAD~N` 合并小提交
- ❌ 不提交设计文档和计划，只提交代码和用户文档

### 临时文件管理

- ✅ 所有临时文件保存到 `/temp` 文件夹
- ❌ 不要在项目根目录创建临时文件

## 重要注意事项

### Monaco Editor 类型定义

所有 `editor-lib.d.ts` 文件由 Vite 插件自动生成，**不要手动编辑**。

- 修改源类型：`packages/types/interfaces/game/action-system/command.ts`
- 重启开发服务器应用更改：`pnpm dev-client` 或 `pnpm dev-editor`

Monaco 编辑器已拆分为 Composable 架构：
- [useMonacoInstance.ts](../apps/map-editor/src/components/code-editor/composables/useMonacoInstance.ts) - 实例管理
- [useMonacoTypeLibs.ts](../apps/map-editor/src/components/code-editor/composables/useMonacoTypeLibs.ts) - 类型库加载

代码模板集中管理：
- [code-templates.ts](../apps/map-editor/src/components/code-editor/code-templates.ts) - 所有 effectCode / initCode 模板文本（静态常量 + 动态生成器 + 参数替换工具）

### FontAwesome 图标

添加新图标时必须在 `apps/client/src/main.ts` 更新：

```typescript
import { faGear, faNewIcon } from "@fortawesome/free-solid-svg-icons";
library.add(faGear, faNewIcon);
```

### TypeORM 实体更新

修改 `apps/server/src/db/entities/` 后，确保启用数据库模式同步或运行迁移。

### Electron 应用

- 构建流程：`vite build` → `electron-builder`
- 入口点：`dist-electron/main.js`
- 使用 file:// 协议（需要 hash 路由）
- **跨平台支持**：Windows 和 macOS 双平台
  - macOS 签名预留：`apps/*/build/entitlements.mac.plist`
  - macOS 构建：DMG 格式输出
  - 日志/缓存/临时目录使用 `userData` 路径，兼容 macOS .app 包结构
  - 换行符配置见 `.gitattributes`

### 资源选择器

地图编辑器提供统一的资源选择器组件，用于图片和模型资源的选择：

- 组件路径: [apps/map-editor/src/components/resource-picker/](../apps/map-editor/src/components/resource-picker/)
- 支持预览模式（ImagePreview / ModelPreview）
- 支持自动保存模式和文件路径模式

### ID 格式

地图编辑器使用短 ID 格式 `prefix-xxxxxx`（由 `generateShortId()` 生成），不使用 UUID。

- 工具函数: [apps/map-editor/src/utils/short-id.ts](../apps/map-editor/src/utils/short-id.ts)

## 项目结构

```
mine-monopoly/
├── apps/
│   ├── client/         # 游戏客户端 (Vue 3 + Vite + Electron)
│   ├── server/         # 游戏服务器 (Express + TypeORM + MySQL)
│   ├── admin/          # 管理后台 (Vue 3 + Vite)
│   └── map-editor/     # 地图编辑器 (Vue 3 + Vite + Electron)
├── packages/
│   ├── types/          # TypeScript 类型定义
│   ├── env/            # 环境变量包（带类型验证）
│   ├── utils/          # 共享工具 (protobuf, three.js, rich-text-parser)
│   └── components/     # 共享 Vue 组件 (login, ui)
├── docs/               # 项目文档
└── pnpm-workspace.yaml
```

## 常用命令

```bash
pnpm install           # 安装所有依赖
pnpm dev-client        # 启动客户端 (http://localhost:5173)
pnpm dev-server        # 启动服务器
pnpm dev-editor        # 启动地图编辑器
pnpm build-client      # 构建客户端 + Electron
pnpm build-editor      # 构建地图编辑器
```

## 主要依赖

- `vue@3.5.18`, `pinia@2.0.33`, `vue-router@4.6.3`
- `three@0.179.1`, `pixi.js@8.14.0` (渲染)
- `protobufjs@7.5.3` (序列化)
- `peerjs@1.5.4` (WebRTC)
- `ant-design-vue@4.2.6` (UI)
- `monaco-editor@0.50.0` (代码编辑器)
