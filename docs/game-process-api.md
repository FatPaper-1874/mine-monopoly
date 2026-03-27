# MineMonopoly 游戏进程 API 参考

> 版本：1.0.0
> 更新时间：2026-03-01

本文档描述游戏进程的公开接口，供地图编辑器编写自定义逻辑时参考。

---

## 目录

- [MoneyTag - 金钱流动标签](#moneytag)
- [GameProcess - 游戏进程](#gameprocess)
- [Player - 玩家](#player)
- [Property - 地产](#property)
- [ChanceCard - 机会卡](#chancecard)
- [CommandBus - 命令总线](#commandbus)
- [ModifierManager - 修饰器管理器](#modifiermanager)

---

## MoneyTag

金钱流动标签类型，用于标识金钱流动的途径，供修饰器系统识别和处理。

### 类型定义

```typescript
type MoneyTag = typeof MoneyTag[keyof typeof MoneyTag] | string;
```

### 预定义标签

```typescript
const MoneyTag = {
  SYSTEM: 'system',  // 系统默认操作
} as const;
```

### 使用说明

`MoneyTag` 用于标识金钱流动的途径，使修饰器能够根据不同的标签实现特殊效果。

**特点：**
- 支持使用预定义标签（类型安全）
- 支持使用自定义字符串（灵活性）
- 可选参数，完全向后兼容

**使用示例：**

```typescript
// 使用预定义标签
await player.cost(100, MoneyTag.SYSTEM);
await player.gain(200, MoneyTag.SYSTEM);

// 使用自定义标签
await player.cost(100, 'property_purchase');
await player.gain(200, 'pass_go_bonus');

// 在修饰器中使用
modifier: {
  condition: (context) => {
    // 只对特定标签的金钱流动生效
    return context.payload.tag === 'toll';
  },
  execute: (context) => {
    // 修改金额
    context.payload.money = Math.floor(context.payload.money * 0.5);
    return context;
  }
}
```

### 扩展预定义标签

可以在 `MoneyTag` 常量对象中添加更多预定义标签：

```typescript
const MoneyTag = {
  SYSTEM: 'system',
  PROPERTY_PURCHASE: 'property_purchase',
  PROPERTY_UPGRADE: 'property_upgrade',
  PROPERTY_RENT: 'property_rent',
  CHANCE_CARD: 'chance_card',
  PASS_GO: 'pass_go',
  TAX: 'tax',
  // ... 添加更多
} as const;
```

---

## GameProcess

游戏进程核心类，管理整个游戏的状态和逻辑。

### 属性

| 属性 | 类型 | 描述 |
|------|------|------|
| `eventBus` | `Emitter<GameRuntimeEvent>` | 事件总线 |
| `mapData` | `GameMap` | 地图数据 |
| `gameSetting` | `GameSetting` | 游戏设置 |
| `players` | `Map<string, Player>` | 玩家映射表 |
| `properties` | `Map<string, Property>` | 地产映射表 |
| `chanceCardInfos` | `Map<string, ChanceCardInfo>` | 机会卡信息映射表 |
| `mapItems` | `Map<string, MapItem>` | 地图项映射表 |
| `mapEvents` | `Map<string, RuntimeMapEvent>` | 地图事件映射表 |
| `currentRoundPlayer` | `Player \| null` | 当前回合玩家 |
| `currentRound` | `number` | 当前回合数 |
| `currentMultiplier` | `number` | 当前倍率 |
| `gameRuntimeStack` | `GameRuntimeStack` | 游戏运行时栈 |
| `roundTimeTimer` | `RoundTimeTimer` | 回合倒计时定时器 |
| `exportData` | `Record<string, any>` | 导出数据 |
| `customData` | `Record<string, any>` | 自定义数据 |

---

### 地产相关

#### handlePlayerBuyProperty

处理玩家购买地产。

```typescript
handlePlayerBuyProperty(player: IPlayer, property: IProperty): Promise<void>
```

**参数:**
- `player`: 购买地产的玩家
- `property`: 要购买的地产

**示例:**
```typescript
await gameProcess.handlePlayerBuyProperty(player, property);
```

---

#### handlePlayerBuildUp

处理玩家升级地产。

```typescript
handlePlayerBuildUp(player: IPlayer, property: IProperty): Promise<void>
```

**参数:**
- `player`: 升级地产的玩家
- `property`: 要升级的地产

**示例:**
```typescript
await gameProcess.handlePlayerBuildUp(player, property);
```

---

#### handleArriveEvent

处理玩家到达事件。

```typescript
handleArriveEvent(arrivedPlayer: IPlayer): Promise<void>
```

**参数:**
- `arrivedPlayer`: 到达的玩家

**示例:**
```typescript
await gameProcess.handleArriveEvent(player);
```

---

### 机会卡相关

#### createNewChanceCard

创建新的机会卡实例。

```typescript
createNewChanceCard(sourceId: string): IChanceCard
```

**参数:**
- `sourceId`: 机会卡源 ID

**返回:**
- `IChanceCard`: 机会卡对象

**示例:**
```typescript
const card = gameProcess.createNewChanceCard('card-001');
```

---

#### handleUseChanceCard

处理使用机会卡。

```typescript
handleUseChanceCard(sourcePlayer: IPlayer, chanceCardId: string, targetIdList: string[]): Promise<boolean>
```

**参数:**
- `sourcePlayer`: 使用机会卡的玩家
- `chanceCardId`: 机会卡 ID
- `targetIdList`: 目标 ID 列表

**返回:**
- `boolean`: 是否成功使用

**示例:**
```typescript
const success = await gameProcess.handleUseChanceCard(player, 'card-001', ['target-id']);
```

---

### 玩家操作监听

#### oncePlayerOperationAsync

异步等待单次玩家操作。

```typescript
oncePlayerOperationAsync<T extends OperateType>(playerId: string, operationType: T): Promise<PlayerOperationResult[T]>
```

**参数:**
- `playerId`: 玩家 ID
- `operationType`: 操作类型

**返回:**
- `Promise<PlayerOperationResult[T]>`: 操作结果

**示例:**
```typescript
const result = await gameProcess.oncePlayerOperationAsync(player.id, 'ConfirmDialogResult');
```

---

#### onPlayerOperationAsync

持续监听玩家操作。

```typescript
onPlayerOperationAsync<T extends OperateType>(playerId: string, operationType: T): Promise<PlayerOperationResult[T]>
```

**参数:**
- `playerId`: 玩家 ID
- `operationType`: 操作类型

**返回:**
- `Promise<PlayerOperationResult[T]>`: 操作结果

---

#### oncePlayerOperation

订阅玩家操作（回调方式，单次）。

```typescript
oncePlayerOperation<T extends OperateType>(playerId: string, operationType: T, callback: (res: PlayerOperationResult[T]) => void): void
```

**参数:**
- `playerId`: 玩家 ID
- `operationType`: 操作类型
- `callback`: 回调函数

**示例:**
```typescript
gameProcess.oncePlayerOperation(player.id, 'ConfirmDialogResult', (result) => {
  console.log('玩家选择:', result.confirm);
});
```

---

#### onPlayerOperation

持续订阅玩家操作。

```typescript
onPlayerOperation<T extends OperateType>(playerId: string, operationType: T, callback: (res: PlayerOperationResult[T]) => void): void
```

---

#### removePlayerOperationListener

取消订阅玩家操作。

```typescript
removePlayerOperationListener<T extends OperateType>(playerId: string, operationType: T, listener: (...args: any[]) => PlayerOperationResult[T]): void
```

---

#### removePlayerAllOperationListener

取消玩家的所有操作监听器。

```typescript
removePlayerAllOperationListener<T extends OperateType>(playerId: string, operationType?: T): void
```

---

#### emitPlayerOperation

发送玩家操作事件。

```typescript
emitPlayerOperation<T extends OperateType>(playerId: string, operationType: T, data: PlayerOperationResult[T]): void
```

**示例:**
```typescript
gameProcess.emitPlayerOperation(player.id, 'ConfirmDialogResult', { confirm: true, data: {} });
```

---

### 事件栈管理

#### pushEventToStack

将事件推入栈。

```typescript
pushEventToStack(...gameEvents: GameEvent<GameContext>[]): void
```

**参数:**
- `gameEvents`: 游戏事件列表

**示例:**
```typescript
gameProcess.pushEventToStack({
  fn: async (ctx, gp) => {
    console.log('自定义事件');
  }
});
```

---

### 对话框交互

#### showConfirmDialog

显示确认对话框。

```typescript
showConfirmDialog<I extends InputOptionItem<string, any>[]>(playerId: string, option: ConfirmDialogOption<I>): Promise<ConfirmDialogResult<I>>
```

**参数:**
- `playerId`: 玩家 ID
- `option`: 对话框选项

**返回:**
- `Promise<ConfirmDialogResult<I>>`: 对话框结果

**示例:**
```typescript
const result = await gameProcess.showConfirmDialog(player.id, {
  title: '确认购买',
  content: '是否购买此地产？',
  confirmText: '购买',
  cancelText: '取消'
});
```

---

#### showTargetSelectDialog

显示目标选择对话框。

```typescript
showTargetSelectDialog<I extends TargetSelectType>(playerId: string, option: TargetSelectDialogOption<I>): Promise<TargetSelectDialogResult<I>>
```

**参数:**
- `playerId`: 玩家 ID
- `option`: 对话框选项

**返回:**
- `Promise<TargetSelectDialogResult<I>>`: 对话框结果

**示例:**
```typescript
const result = await gameProcess.showTargetSelectDialog(player.id, {
  type: 'player',
  title: '选择目标',
  description: '请选择一个玩家',
  min: 1,
  max: 1
});
```

---

#### showItemSelectDialog

显示物品选择对话框。

```typescript
showItemSelectDialog(playerId: string, option: ItemSelectDialogOption): Promise<ItemSelectDialogResult>
```

**参数:**
- `playerId`: 玩家 ID
- `option`: 对话框选项
  - `itemList`: 物品列表
  - `keyName`: 作为显示名称的键名（可选，默认为 "id"）
  - `multiple`: 多选数量限制（可选）
    - `undefined` 或不传：单选
    - `0` 或 `1`：单选
    - `>=2`：最多选择指定数量的物品
    - `true`：多选（向后兼容，等同于物品总数）
    - `false`：单选（向后兼容）
  - `column`: 列表列数（可选）
  - `selectedKey`: 已选中的键列表（可选）

**返回:**
- `Promise<ItemSelectDialogResult>`: 对话框结果
  - `selected`: 选中的物品 ID 列表

**示例:**
```typescript
// 单选模式
const result1 = await gameProcess.showItemSelectDialog(player.id, {
  title: '选择一个物品',
  itemList: items
});

// 最多选择3个
const result2 = await gameProcess.showItemSelectDialog(player.id, {
  title: '选择最多3个物品',
  itemList: items,
  multiple: 3
});

// 无限制多选
const result3 = await gameProcess.showItemSelectDialog(player.id, {
  title: '选择任意数量的物品',
  itemList: items,
  multiple: true
});
```

---

#### showMessageCard

显示消息卡片。

```typescript
showMessageCard(playerIds: string[], option: MessageCardOption): Promise<void>
```

**参数:**
- `playerIds`: 玩家 ID 列表
- `option`: 消息卡片选项

**示例:**
```typescript
await gameProcess.showMessageCard([player.id], {
  title: '恭喜！',
  description: '你获得了奖励！',
  type: 'success',
  duration: 3000
});
```

---

### 消息发送

#### sendToPlayer

发送消息给指定玩家。

```typescript
sendToPlayer(id: string, msg: ServerSocketMessage): void
```

**参数:**
- `id`: 玩家 ID
- `msg`: 服务器消息

---

#### gameBroadcast

广播消息给所有玩家。

```typescript
gameBroadcast(msg: ServerSocketMessage): void
```

**参数:**
- `msg`: 服务器消息

---

#### gameDataBroadcast

广播游戏数据给所有玩家。

```typescript
gameDataBroadcast(): void
```

---

#### msgNotifyBroadcast

广播游戏消息通知。

```typescript
msgNotifyBroadcast(type: "success" | "warning" | "error" | "info", msg: string): void
```

**参数:**
- `type`: 消息类型
- `msg`: 消息内容

**示例:**
```typescript
gameProcess.msgNotifyBroadcast('success', '玩家获得 100 金钱！');
```

---

#### gameLogBroadcast

广播游戏日志。

```typescript
gameLogBroadcast(log: string): void
```

**参数:**
- `log`: 日志内容

---

#### messageNotify

发送消息通知给指定玩家列表。

```typescript
messageNotify(playerIdList: string[], msg: { type: "info" | "success" | "warning" | "error"; content: string }): void
```

**参数:**
- `playerIdList`: 玩家 ID 列表
- `msg`: 消息对象

**示例:**
```typescript
gameProcess.messageNotify([player.id], {
  type: 'info',
  content: '你的回合开始了'
});
```

---

### 游戏控制

#### runGamePhase

运行游戏阶段。

```typescript
runGamePhase(phase: IGamePhase<GameContext>, context?: GameContext): Promise<void>
```

**参数:**
- `phase`: 游戏阶段
- `context`: 游戏上下文（可选）

---

#### checkGameOver

检查游戏是否结束。

```typescript
checkGameOver(): Promise<void>
```

---

### 回合管理

#### roundTurnNotify

回合轮换通知。

```typescript
roundTurnNotify(playerId: string): void
```

**参数:**
- `playerId`: 轮到的玩家 ID

---

### 数据获取

#### getGameData

获取游戏数据。

```typescript
getGameData(): GameData
```

**返回:**
- `GameData`: 游戏数据对象

---

#### createGameLinkItem

创建游戏链接项。

```typescript
createGameLinkItem(type: GameLinkItem, id: string): string
```

**参数:**
- `type`: 链接项类型
- `id`: ID

**返回:**
- `string`: 链接项字符串

---

### 玩家状态管理

#### handlePlayerOffline

处理玩家离线。

```typescript
handlePlayerOffline(userId: string): void
```

**参数:**
- `userId`: 玩家 ID

---

#### handlePlayerReconnect

处理玩家重连。

```typescript
handlePlayerReconnect(userId: string): void
```

**参数:**
- `userId`: 玩家 ID

---

## Player

玩家类，表示游戏中的玩家实体。

### 属性

| 属性 | 类型 | 描述 |
|------|------|------|
| `id` | `string` | 玩家 ID |
| `name` | `string` | 玩家名称 |
| `roleId` | `string` | 角色 ID |
| `money` | `number` | 金钱 |
| `properties` | `IProperty[]` | 拥有的地产列表 |
| `chanceCards` | `IChanceCard[]` | 拥有的机会卡列表 |
| `positionIndex` | `number` | 当前位置索引 |
| `stop` | `number` | 停止回合数 |
| `isStop` | `number` | 是否停止回合（废弃） |
| `isBankrupted` | `boolean` | 是否破产 |
| `isOffline` | `boolean` | 是否离线 |
| `isAI` | `boolean` | 是否为 AI 托管 |
| `dices` | `IDice[]` | 骰子列表 |
| `roundPhases` | `IGamePhase<GameContext>[]` | 玩家回合阶段列表 |
| `infoDisplay` | `UISchema` | 玩家信息展示 UI |
| `exportData` | `Record<string, any>` | 导出数据 |
| `commandBus` | `ICommandBus<PlayerCommandMap>` | 命令总线 |
| `modifierManager` | `IModifierManager<PlayerCommandMap>` | 修饰器管理器 |

---

### 金钱相关

#### gain

获得金钱。

```typescript
gain(money: number, tag?: MoneyTag, source?: IPlayer): Promise<void>
```

**参数:**
- `money`: 金钱数量
- `tag`: 金钱流动标签（可选，用于标识收入途径）
- `source`: 金钱来源玩家（可选）

**示例:**
```typescript
// 基础用法
await player.gain(100);
await player.gain(50, otherPlayer);

// 使用标签
await player.gain(200, MoneyTag.SYSTEM);
await player.gain(200, 'pass_go_bonus');

// 组合使用
await player.gain(200, MoneyTag.SYSTEM, otherPlayer);
```

---

#### cost

花费金钱。

```typescript
cost(money: number, tag?: MoneyTag, target?: IPlayer): Promise<void>
```

**参数:**
- `money`: 金钱数量
- `tag`: 金钱流动标签（可选，用于标识花费途径）
- `target`: 收取金钱的目标玩家（可选）

**示例:**
```typescript
// 基础用法
await player.cost(100);
await player.cost(50, otherPlayer);

// 使用标签
await player.cost(100, MoneyTag.SYSTEM);
await player.cost(100, 'property_purchase');

// 组合使用
await player.cost(100, MoneyTag.SYSTEM, otherPlayer);
```

---

#### setMoney

设置金钱。

```typescript
setMoney(money: number): Promise<void>
```

**参数:**
- `money`: 新的金钱数量

---

### 地产相关

#### gainProperty

获得地产。

```typescript
gainProperty(property: IProperty): Promise<void>
```

**参数:**
- `property`: 要获得的地产

---

#### loseProperty

失去地产。

```typescript
loseProperty(property: IProperty): Promise<void>
```

**参数:**
- `property`: 要失去的地产

---

#### setPropertiesList

设置地产列表。

```typescript
setPropertiesList(newPropertiesList: IProperty[]): void
```

**参数:**
- `newPropertiesList`: 新的地产列表

---

### 机会卡相关

#### gainCard

获得机会卡。

```typescript
gainCard(card: IChanceCard): Promise<void>
```

**参数:**
- `card`: 要获得的机会卡

---

#### loseCard

失去机会卡。

```typescript
loseCard(cardId: string): Promise<void>
```

**参数:**
- `cardId`: 要失去的机会卡 ID

---

#### getCardById

根据 ID 获取机会卡。

```typescript
getCardById(cardId: string): IChanceCard | undefined
```

**参数:**
- `cardId`: 机会卡 ID

**返回:**
- `IChanceCard | undefined`: 机会卡对象

---

#### setCardsList

设置机会卡列表。

```typescript
setCardsList(newChanceCardList: IChanceCard[]): Promise<void>
```

**参数:**
- `newChanceCardList`: 新的机会卡列表

---

### 移动相关

#### walk

行走指定步数。

```typescript
walk(steps: number): Promise<void>
```

**参数:**
- `steps`: 步数

**示例:**
```typescript
await player.walk(3);
```

---

#### tp

传送到指定位置。

```typescript
tp(positionIndex: number): Promise<void>
```

**参数:**
- `positionIndex`: 目标位置索引

**示例:**
```typescript
await player.tp(5);
```

---

#### setPositionIndex

设置位置索引。

```typescript
setPositionIndex(newPositionIndex: number): void
```

**参数:**
- `newPositionIndex`: 新的位置索引

---

### 骰子相关

#### rollDices

掷骰子。

```typescript
rollDices(): Promise<DiceResult[]>
```

**返回:**
- `Promise<DiceResult[]>`: 骰子结果数组

---

#### addDice

添加骰子。

```typescript
addDice(diceValue?: number[]): Promise<IDice>
```

**参数:**
- `diceValue`: 骰子初始值（可选）

**返回:**
- `Promise<IDice>`: 新添加的骰子

---

#### removeDice

移除骰子。

```typescript
removeDice(id: string): Promise<IDice | undefined>
```

**参数:**
- `id`: 骰子 ID

**返回:**
- `Promise<IDice | undefined>`: 被移除的骰子

---

### 状态设置

#### setStop

设置停止回合数。

```typescript
setStop(stop: number): Promise<void>
```

**参数:**
- `stop`: 停止回合数

---

#### setBankrupted

设置破产状态。

```typescript
setBankrupted(isBankrupted: boolean): void
```

**参数:**
- `isBankrupted`: 是否破产

---

#### setIsOffline

设置离线状态。

```typescript
setIsOffline(isOffline: boolean): void
```

**参数:**
- `isOffline`: 是否离线

---

### 信息获取

#### getPlayerInfo

获取玩家信息。

```typescript
getPlayerInfo(): PlayerInfo
```

**返回:**
- `PlayerInfo`: 玩家信息对象

---

#### getUser

获取用户信息。

```typescript
getUser(): UserInRoomInfo
```

**返回:**
- `UserInRoomInfo`: 用户信息对象

---

#### getBuff

获取 Buff 列表。

```typescript
getBuff(): Buff[]
```

**返回:**
- `Buff[]`: Buff 数组

---

#### getRoundPhases

获取回合阶段列表。

```typescript
getRoundPhases(): IGamePhase<GameContext>[]
```

**返回:**
- `IGamePhase<GameContext>[]`: 回合阶段列表

---

## Property

地产类，表示游戏中的地产实体。

### 属性

| 属性 | 类型 | 描述 |
|------|------|------|
| `id` | `string` | 地产 ID |
| `name` | `string` | 地产名称 |
| `level` | `number` | 当前等级 |
| `maxLevel` | `number` | 最大等级 |
| `buildCost` | `number` | 建造/升级费用 |
| `sellCost` | `number` | 出售价格 |
| `costList` | `number[]` | 各等级过路费列表 |
| `buildingModelIdList` | `string[] \| undefined` | 建筑模型 ID 列表 |
| `custom` | `PropertyCustom \| undefined` | 自定义效果配置 |
| `customUI` | `string \| undefined` | 自定义 UI |
| `owner` | `IPlayer \| undefined` | 地产所有者 |
| `exportData` | `Record<string, any>` | 导出数据 |
| `commandBus` | `ICommandBus<PropertyCommandMap>` | 命令总线 |
| `modifierManager` | `IModifierManager<PropertyCommandMap>` | 修饰器管理器 |

---

### 等级管理

#### levelUp

升级地产。

```typescript
levelUp(): Promise<void>
```

**示例:**
```typescript
await property.levelUp();
```

---

#### levelDown

降级地产。

```typescript
levelDown(): Promise<void>
```

---

#### setLevel

设置地产等级。

```typescript
setLevel(level: number): Promise<void>
```

**参数:**
- `level`: 新的等级

---

### 所有权管理

#### setOwner

设置地产所有者。

```typescript
setOwner(player: IPlayer | undefined): Promise<void>
```

**参数:**
- `player`: 新的所有者（undefined 表示无主）

**示例:**
```typescript
await property.setOwner(player);
await property.setOwner(undefined);
```

---

### 到达事件

#### arrived

处理玩家到达地产。

```typescript
arrived(player: IPlayer): Promise<void>
```

**参数:**
- `player`: 到达的玩家

**示例:**
```typescript
await property.arrived(player);
```

---

### 信息获取

#### getPropertyInfo

获取地产信息。

```typescript
getPropertyInfo(): PropertyInfo
```

**返回:**
- `PropertyInfo`: 地产信息对象

---

#### getOriginalData

获取原始数据。

```typescript
getOriginalData(): PropertyInfo
```

**返回:**
- `PropertyInfo`: 地产信息对象

---

### 修饰器

#### registerModifier

注册修饰器。

```typescript
registerModifier<K extends keyof PropertyCommandMap>(modifier: IModifier<PropertyCommandMap, K>): void
```

**参数:**
- `modifier`: 要注册的修饰器

**示例:**
```typescript
property.registerModifier({
  descriptor: {
    id: 'mod-001',
    timing: 'after',
    commandType: 'property.arrived',
    remainingTriggers: -1,
    meta: {
      name: '过路费减免',
      timingName: '到达后',
      description: '过路费减半',
      source: '地产特性'
    }
  },
  fn: async (cmd, ctx) => {
    if (ctx.result?.toll) {
      ctx.result.toll = Math.floor(ctx.result.toll / 2);
    }
  }
});
```

---

## ChanceCard

机会卡类，表示游戏中的机会卡。

### getId

获取机会卡 ID。

```typescript
getId(): string
```

---

### getSourceId

获取源 ID。

```typescript
getSourceId(): string
```

---

### getName

获取机会卡名称。

```typescript
getName(): string
```

---

### getDescribe

获取机会卡描述。

```typescript
getDescribe(): string
```

---

### getIcon

获取机会卡图标。

```typescript
getIcon(): string
```

---

### getType

获取机会卡类型。

```typescript
getType(): TargetSelectType
```

---

### getColor

获取机会卡颜色。

```typescript
getColor(): string
```

---

### getEffectCode

获取效果代码。

```typescript
getEffectCode(): string
```

---

### use

使用机会卡。

```typescript
use(sourcePlayer: IPlayer, target: IPlayer | IProperty | IPlayer[] | IProperty[], gameProcess: IGameProcess): Promise<void>
```

**参数:**
- `sourcePlayer`: 使用机会卡的玩家
- `target`: 目标（玩家、地产或它们的数组）
- `gameProcess`: 游戏进程

**示例:**
```typescript
await card.use(player, targetPlayer, gameProcess);
await card.use(player, [property1, property2], gameProcess);
await card.use(player, allPlayers, gameProcess);
```

---

### getChanceCardInfo

获取机会卡信息。

```typescript
getChanceCardInfo(): ChanceCardClientInfo
```

**返回:**
- `ChanceCardClientInfo`: 机会卡信息对象

---

## CommandBus

命令总线类，用于执行命令。

### execute

执行命令。

```typescript
execute<K extends keyof C>(command: ICommand<C, K>): Promise<C[K]["result"]>
```

**参数:**
- `command`: 要执行的命令

**返回:**
- `Promise<C[K]["result"]>`: 命令执行结果

**示例:**
```typescript
const result = await player.commandBus.execute({
  type: 'player.money.gain',
  payload: { money: 100 }
});
```

---

### setHandler

设置命令处理器。

```typescript
setHandler<K extends keyof C>(type: K, handler: (payload: C[K]["payload"]) => C[K]["result"] | Promise<C[K]["result"]>): void
```

**参数:**
- `type`: 命令类型
- `handler`: 命令处理函数

**示例:**
```typescript
player.commandBus.setHandler('player.money.gain', async (payload) => {
  console.log('玩家获得', payload.money);
  return { money: payload.money };
});
```

---

## ModifierManager

修饰器管理器类，用于管理修饰器。

### add

添加修饰器。

```typescript
add<KK extends keyof C>(mod: IModifier<C, KK>): string
```

**参数:**
- `mod`: 要添加的修饰器

**返回:**
- `string`: 修饰器 ID

**示例:**
```typescript
player.modifierManager.add({
  descriptor: {
    id: 'buff-001',
    timing: 'before',
    commandType: 'player.money.gain',
    remainingTriggers: 3,
    priority: 10,
    meta: {
      name: '双倍收入',
      timingName: '获得金钱前',
      description: '接下来 3 次获得金钱翻倍',
      source: '特殊事件',
      tags: ['income', 'buff']
    }
  },
  fn: async (cmd, ctx) => {
    ctx.setResult({ money: cmd.payload.money * 2 });
  }
});
```

---

### removeById

根据 ID 移除修饰器。

```typescript
removeById(id: string): boolean
```

**参数:**
- `id`: 修饰器 ID

**返回:**
- `boolean`: 是否成功移除

---

### clear

清空所有修饰器。

```typescript
clear(): void
```

---

### removeByTag

按标签移除修饰器。

```typescript
removeByTag(tag: string): void
```

**参数:**
- `tag`: 要移除的标签

**示例:**
```typescript
player.modifierManager.removeByTag('debuff');
```

---

### hasBuffWithTag

检查是否存在指定标签的 Buff。

```typescript
hasBuffWithTag(tag: string): boolean
```

**参数:**
- `tag`: 标签

**返回:**
- `boolean`: 是否存在

---

### getBuffs

获取可序列化的 Buff 列表。

```typescript
getBuffs(): Buff[]
```

**返回:**
- `Buff[]`: Buff 数组

---

### getModifiersList

获取所有修饰器列表。

```typescript
getModifiersList(): IModifier<C, K>[]
```

**返回:**
- `IModifier<C, K>[]`: 修饰器数组

---

### getFor

获取指定命令和时机的修饰器。

```typescript
getFor(cmd: ICommand<C, K>, timing: ModifierTiming): IModifier<C, K>[]
```

**参数:**
- `cmd`: 命令对象
- `timing`: 触发时机

**返回:**
- `IModifier<C, K>[]`: 匹配的修饰器数组

---

### decayAfterExecution

在修饰器执行后衰减触发次数。

```typescript
decayAfterExecution(ids: string[]): void
```

**参数:**
- `ids`: 已执行的修饰器 ID 列表

---

## 附录

### A. 命令类型

#### 玩家命令 (PlayerCommandMap)

| 命令类型 | 负载 | 结果 |
|---------|------|------|
| `player.property.gain` | `{ property: IProperty }` | `{ property: IProperty }` |
| `player.property.lose` | `{ property: IProperty }` | `{ property: IProperty }` |
| `player.card.gain` | `{ card: IChanceCard }` | `{ card: IChanceCard }` |
| `player.card.lose` | `{ cardId: string }` | `{ cardId: string }` |
| `player.money.gain` | `{ money: number; source?: IPlayer }` | `{ money: number; source?: IPlayer }` |
| `player.money.lose` | `{ money: number; target?: IPlayer }` | `{ money: number; target?: IPlayer }` |
| `player.stop` | `{ stop: number }` | `{ stop: number }` |
| `player.walk` | `{ steps: number }` | `{ steps: number }` |
| `player.tp` | `{ positionIndex: number }` | `{ positionIndex: number }` |
| `player.bankrupted.set` | `{ bankrupted: boolean }` | `{ bankrupted: boolean }` |
| `player.dice.roll` | `{ dices: IDice[] }` | `{ diceResult: DiceResult[] }` |
| `player.dice.add` | `{ newDice: IDice }` | `{ newDice: IDice }` |
| `player.dice.remove` | `{ diceId: string }` | `{ removeDice: IDice \| undefined }` |

#### 地产命令 (PropertyCommandMap)

| 命令类型 | 负载 | 结果 |
|---------|------|------|
| `property.owner.change` | `{ oldOwner: IPlayer \| undefined; newOwner: IPlayer \| undefined }` | `{ oldOwner: IPlayer \| undefined; newOwner: IPlayer \| undefined }` |
| `property.level.up` | `{}` | `{}` |
| `property.level.down` | `{}` | `{}` |
| `property.level.set` | `{ oldLevel: number; newLevel: number }` | `{ oldLevel: number; newLevel: number }` |
| `property.arrived` | `{ owner: IPlayer \| undefined; arrivedPlayer: IPlayer; toll?: number }` | `{ owner: IPlayer \| undefined; arrivedPlayer: IPlayer; toll?: number }` |

---

### B. 操作类型 (OperateType)

- `ConfirmDialogResult` - 确认对话框结果
- `TargetSelectDialogResult` - 目标选择对话框结果
- `ItemSelectDialogResult` - 物品选择对话框结果
- `Animation` - 动画完成
- `GameInitFinished` - 游戏初始化完成
- `PauseGame` - 暂停游戏
- `ResumeGame` - 恢复游戏

---

### C. 事件类型 (GameRuntimeEvent)

| 事件类型 | 数据 | 描述 |
|---------|------|------|
| `game.round.start` | `void` | 游戏回合开始 |
| `game.round.end` | `void` | 游戏回合结束 |
| `player.round.start` | `{ player: IPlayer }` | 玩家回合开始 |
| `player.round.end` | `{ player: IPlayer }` | 玩家回合结束 |
| `player.arrived` | `{ positionIndex: number; player: IPlayer }` | 玩家到达某位置 |
| `player.passed` | `{ passedMapItemsId: string[]; player: IPlayer }` | 玩家经过某位置 |

---