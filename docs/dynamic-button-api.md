# 动态按钮注册API使用文档

## 概述

动态按钮注册API允许在游戏过程中为指定玩家动态注册自定义按钮，按钮显示在骰子按钮旁边。

## 基本使用

### 注册按钮

```typescript
// 在GameProcessWorker或游戏逻辑中
const button = gameProcess.registerPlayerButton(
  playerId,
  "使用技能",
  async () => {
    console.log("玩家使用了技能");
    // 执行技能逻辑
  }
);
```

### 控制按钮状态

```typescript
// 禁用按钮
button.setEnabled(false);

// 启用按钮
button.setEnabled(true);

// 隐藏按钮
button.setVisible(false);

// 显示按钮
button.setVisible(true);

// 更新按钮文案
button.setText("使用技能 (冷却中)");

// 移除按钮
button.remove();
```

## 使用场景示例

### 场景1: 临时功能按钮

```typescript
// 注册一个30秒后自动移除的按钮
const tempButton = gameProcess.registerPlayerButton(
  playerId,
  "领取奖励",
  async () => {
    await giveReward(playerId, 100);
  }
);

setTimeout(() => {
  tempButton.remove();
}, 30000);
```

### 场景2: 回合制特殊动作

```typescript
// 在玩家回合开始时注册特殊动作按钮
function onPlayerTurnStart(playerId: string) {
  const attackButton = gameProcess.registerPlayerButton(
    playerId,
    "攻击",
    async () => {
      await performAttack(playerId);
      attackButton.setEnabled(false); // 使用后禁用
    }
  );

  const defendButton = gameProcess.registerPlayerButton(
    playerId,
    "防御",
    async () => {
      await performDefend(playerId);
      defendButton.setEnabled(false);
    }
  );

  // 回合结束时清理按钮
  setTimeout(() => {
    attackButton.remove();
    defendButton.remove();
  }, TURN_DURATION);
}
```

### 场景3: 条件控制

```typescript
const buyButton = gameProcess.registerPlayerButton(
  playerId,
  "购买道具",
  async () => {
    await buyItem(playerId, itemId);
  }
);

// 根据玩家金币状态控制按钮
function updateBuyButton(player: Player) {
  if (player.money < itemPrice) {
    buyButton.setEnabled(false);
    buyButton.setText("金币不足");
  } else {
    buyButton.setEnabled(true);
    buyButton.setText("购买道具");
  }
}
```

## 注意事项

1. **按钮唯一性**: 每次注册都会生成唯一的按钮ID
2. **生命周期**: 按钮需要手动移除，不会自动清理（玩家离线除外）
3. **异步回调**: 支持异步回调函数，执行期间按钮会自动禁用
4. **错误处理**: 回调中的错误会被捕获并记录，不会影响游戏流程
5. **UI限制**: 每个玩家最多建议显示5个按钮，超过会自动切换为滚动布局