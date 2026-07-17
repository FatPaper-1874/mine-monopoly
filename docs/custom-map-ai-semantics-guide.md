# 自定义地图 AI 语义指南

这份指南说明如何给自定义地图补充 AI 语义，让本地机器人能够在不理解固定游戏流程的前提下，基于“当前合法候选动作 + 弱语义提示”做决策。

目标不是让地图作者给每张地图写一套机器人逻辑，而是让地图在关键交互点提供足够的结构化提示，让本地 heuristic AI 能继续玩。

## 核心原则

### 1. 只把合法候选动作推给 AI

AI 不应该自己构造动作，也不应该直接执行游戏逻辑。

正确边界是：

1. 地图 / 游戏引擎先生成“当前允许的候选动作”
2. 给每个候选动作附带 AI 语义
3. AI 只负责选择
4. 引擎继续负责校验和执行

### 2. 用弱语义，不要依赖强枚举

推荐优先提供这些字段：

- `category`
- `intent`
- `tags`
- `summary`
- `cost`
- `reward`
- `risk`
- `target`
- `effects`

其中：

- `category` 用于粗粒度分类，比如 `economy`、`combat`、`movement`、`control`
- `intent` 是辅助提示，不要把它当成唯一语义来源
- `summary` 要写成“这个动作会做什么”
- `cost/reward/risk` 尽量给粗略数值，不要求精确

### 3. AI 语义应该描述“动作含义”，不是“实现细节”

好的写法：

```ts
ai: {
  category: "economy",
  intent: "buy_property",
  summary: "买下这块高收益地皮",
  cost: 2000,
  reward: 900,
  risk: 300,
}
```

不好的写法：

```ts
ai: {
  summary: "调用 property.setOwner 后再扣钱"
}
```

### 4. 未知 `intent` 必须允许降级

本地机器人会优先结合 `category/tags/summary/cost/reward/risk` 这些字段评分。  
如果 `intent` 是自定义字符串，也不应该导致 AI 卡住。

## 当前可用入口

目前可以给 AI 语义的入口有：

- `showConfirmDialog(...)`
- `showTargetSelectDialog(...)`
- `showItemSelectDialog(...)`
- `showFormDialog(...)`
- `registerPlayerButton(...)`
- `requestAIDecision(...)`

前五个入口适合“已有 UI 交互”。  
最后一个入口适合“地图脚本主动把一组合法候选动作推给 AI”。

## 一、给确认框补 AI 语义

适合买地、升级、是否发动技能、是否接受风险事件等场景。

```ts
const result = await gameProcess.showConfirmDialog(player.id, {
  title: "购买中央商圈",
  content: "是否花费 2500 购买中央商圈？",
  confirmText: "购买",
  cancelText: "放弃",
  ai: {
    category: "economy",
    intent: "buy_property",
    tags: ["property", "buy", "high-rent"],
    summary: "买下一块高租金地皮",
    target: "中央商圈",
    cost: 2500,
    reward: 1200,
    risk: 300,
  },
});
```

建议：

- `购买` / `升级` / `发动` 这类动作尽量给 `cost/reward/risk`
- `summary` 直接写成“买下地皮”“升级建筑”“发动控制技能”
- 不要只写标题，不写语义

## 二、给目标选择补 AI 语义

适合选择攻击目标、偷取目标、治疗对象、指定地皮等场景。

```ts
const result = await gameProcess.showTargetSelectDialog(player.id, {
  type: TargetSelectType.ToOtherPlayer,
  title: "选择要打击的目标",
  content: "请选择一个其他玩家",
  ai: {
    category: "combat",
    intent: "target_enemy_player",
    tags: ["attack", "control"],
    summary: "选择一个最值得打击的对手",
  },
});
```

说明：

- 这里的 `ai` 是给“这次选择任务”本身加语义
- 真正候选目标的数据由系统生成，本地 AI 会结合玩家资产和状态进一步选目标

## 三、给物品选择补 AI 语义

适合从若干技能、事件、奖励、分支路径里选一个或多个。

### 给整个选择框补语义

```ts
const result = await gameProcess.showItemSelectDialog(player.id, {
  title: "选择一个强化方向",
  itemList: upgrades,
  ai: {
    category: "strategy",
    intent: "choose_upgrade_plan",
    summary: "从多个升级方向中选择当前最优的一项",
  },
});
```

### 给每个候选项补语义

```ts
const result = await gameProcess.showItemSelectDialog(player.id, {
  title: "选择一个强化方向",
  itemList: [
    {
      id: "income",
      display: "商业扩张",
      ai: {
        category: "economy",
        intent: "increase_income",
        summary: "提高后续经济收益",
        reward: 900,
        risk: 150,
      },
    },
    {
      id: "shield",
      display: "风险护盾",
      ai: {
        category: "defense",
        intent: "reduce_risk",
        summary: "降低接下来数回合的损失风险",
        reward: 350,
        risk: 50,
      },
    },
  ],
});
```

建议：

- 如果候选项价值差异明显，优先在 `item.ai` 上补语义
- 如果只是“同类项里选一个”，`option.ai` 可以简化

## 四、给表单字段补 AI 语义

适合数值分配、资源分配、下注、倍率选择等场景。

```ts
const result = await gameProcess.showFormDialog(player.id, {
  title: "分配本回合预算",
  confirmText: "确认",
  cancelText: "取消",
  ai: {
    category: "economy",
    intent: "budget_allocation",
    summary: "在安全与收益之间分配预算",
  },
  fields: [
    {
      key: "invest",
      label: "投资额度",
      defaultValue: 1000,
      min: 0,
      max: 3000,
      ai: {
        category: "economy",
        intent: "investment_amount",
        summary: "投入越多，潜在收益越高，但风险也会提高",
      },
    },
  ],
});
```

说明：

- 当前本地机器人对表单仍偏保守，默认以字段默认值为基础
- 所以表单场景最好先把 `defaultValue` 设计成一个可接受的保守值

## 五、给动态按钮补 AI 语义

动态按钮非常适合自定义地图里的主动技能、临时行动、阶段性操作。

```ts
const button = gameProcess.registerPlayerButton(
  player.id,
  "发动市场操控",
  async () => {
    // 技能逻辑
  },
  {
    category: "control",
    intent: "market_control",
    tags: ["skill", "economy", "control"],
    summary: "短时间压低对手收益并提高自己收益",
    reward: 800,
    risk: 200,
  },
);
```

建议：

- 动态按钮是当前最适合给自定义地图扩展 AI 的入口之一
- 如果按钮是阶段制的一部分，语义里把 `summary` 写清楚
- 如果按钮是高风险动作，务必补 `risk`

## 六、主动把候选动作推给 AI

当你的自定义地图流程非常特殊，不适合直接套用确认框 / 物品选择 / 动态按钮时，直接用：

```ts
const decision = await gameProcess.requestAIDecision(player.id, {
  operationType: "scripted-action",
  scene: "scripted-action",
  title: "选择当前阶段行动",
  summary: "当前处于夜间对抗阶段",
  options: [
    {
      id: "attack",
      label: "发动袭击",
      actionType: "select",
      semantics: {
        category: "combat",
        intent: "attack_enemy",
        summary: "打击领先玩家",
        reward: 900,
        risk: 350,
      },
    },
    {
      id: "save",
      label: "保守经营",
      actionType: "select",
      semantics: {
        category: "economy",
        intent: "save_resources",
        summary: "避免风险，保留资源",
        reward: 250,
        risk: 50,
      },
    },
  ],
});

if (decision?.optionId === "attack") {
  // 执行攻击逻辑
}
```

这个入口最适合：

- 自定义 phase
- 特殊回合制
- 多段行动窗口
- 原版流程里不存在的地图机制

## 语义设计建议

### 推荐 category

- `economy`
- `combat`
- `movement`
- `control`
- `defense`
- `strategy`
- `chance-card`

### 推荐 intent 风格

推荐写成“动作意图”而不是“实现名”：

- `buy_property`
- `upgrade_property`
- `target_enemy_player`
- `increase_income`
- `reduce_risk`
- `use_card`
- `save_resources`

不推荐：

- `call_fn_1`
- `special_logic_a`
- `phase_hook_x`

## 本地机器人推荐语义词表

本地机器人最好配合一套“推荐词表”来写 `category` 和 `intent`。  
这里的“推荐”不是强约束，不要求地图作者只能用这些值；它的作用是让本地 heuristic 更容易直接命中已有策略。

如果 `intent` 命中了熟悉词表，本地机器人通常会用更强的定向判断。  
如果 `intent` 是自定义值，也仍然可以工作，此时会回退到 `category + summary + cost/reward/risk + tags` 的通用评分。

### 推荐 category

- `economy`
- `combat`
- `movement`
- `control`
- `defense`
- `strategy`
- `chance-card`

### 推荐 intent

- `buy_property`
  用于购买地皮。本地机器人通常会更关注 `cost`、`reward` 和买完后的资金安全边际。
- `upgrade_property`
  用于升级已有资产。通常偏好“升级后有明显收益，且升级后手里还有余钱”的选项。
- `use_card`
  用于主动使用卡牌、技能卡、机会卡能力。建议同时补 `summary` 和 `tags`，说明它偏进攻还是偏防守。
- `target_enemy_player`
  用于选择对手目标。通常会更偏向资产更高、排名更靠前、当前更值得打击的玩家。
- `target_self`
  用于自我增益、治疗、自保、解控等目标选择。
- `target_property`
  用于选择地产目标。建议额外在 `summary` 或 `tags` 里说明是“高收益地皮”“危险地皮”还是“己方资产”。
- `target_map_item`
  用于选择地图格子、事件点、区域节点等地图对象。
- `increase_income`
  用于长期经济成长类动作。通常适合商业扩张、加租金、加被动收益这类选项。
- `reduce_risk`
  用于降低损失、规避惩罚、加护盾、解负面状态等保守型动作。
- `save_resources`
  用于明确表示“先不冒险，保留资源”。很适合给“放弃发动”“先攒钱”“本回合保守处理”这类候选项。
- `roll_dice`
  用于表达推进正常回合流程、继续行动。
- `cancel_action`
  用于显式取消、拒绝、跳过当前动作。适合作为高风险场景里的保守 fallback。

### 词表使用原则

1. 优先用推荐 `intent`
2. 不要把推荐词表当成硬编码枚举
3. 自定义 `intent` 时，务必补全 `summary`
4. 价值差异明显的动作，尽量补 `cost/reward/risk`

一个简单判断标准是：  
如果你把 `intent` 改成陌生名字，本地机器人还能不能靠 `summary` 和数值信息大致做对选择。  
如果不能，说明语义还不够完整。

## 本地机器人更容易理解的写法

### 好例子

```ts
ai: {
  category: "economy",
  intent: "buy_property",
  summary: "买下一块高收益地皮",
  cost: 2000,
  reward: 1000,
  risk: 200,
}
```

原因：

- 有明确动作类型
- 有收益和风险
- 有摘要

### 差例子

```ts
ai: {
  intent: "do_custom_thing_7"
}
```

问题：

- 没有收益/风险
- 没有 summary
- 本地 heuristic 无法判断动作价值

## 给自定义地图作者的最小实践

如果你只想做最小接入，优先按这个顺序补：

1. 给买地 / 升级 / 是否发动技能的确认框补 `ai`
2. 给高价值动态按钮补 `ai`
3. 给复杂物品选择中的每个 item 补 `item.ai`
4. 对完全自定义流程，用 `requestAIDecision(...)`

## 调试方式

控制台里可以看这些日志：

- `[AI Decision] request`
- `[AI Decision] ranked item options`
- `[AI Decision] selection`
- `[AI Flow] structured request`
- `[AI Flow] active-action request`
- `[AI Flow] scripted request`

每次决策都有 `decisionId`，可以直接用这个 id 在控制台里串起整段过程。

## 一句话原则

给 AI 的不是“地图脚本怎么实现”，而是“此刻有哪些合法动作，每个动作大概意味着什么”。
