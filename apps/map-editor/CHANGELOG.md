# @mine-monopoly/map-editor

## 1.1.3

### Patch Changes

- - **游戏设置**：新增回合倒计时配置项，内置非法参数保护与旧地图兼容逻辑

## 1.1.2

### Patch Changes

- - 修饰器系统支持实例级上下文数据传递，effectCode 可通过 `ctx.modifierData` 读取实例数据
  - 同步客户端修饰器系统类型定义更新（packages/types），消除编译警告

## 1.1.1

### Patch Changes

- - 修复顶部栏窗口控制按钮（最小化/最大化/关闭）失效的问题

## 1.1.0

### Minor Changes

- - 添加 Capacitor OTA 更新功能及 Android 自动构建流程
  - 移动端关闭抗锯齿、EffectComposer 和模型动画省 GPU
  - 移动端横屏使用 16:9 容器比例并动态计算基准字号
  - 添加 Capacitor Android 构建支持
  - 将 electronAPI 改造为通用 platform 平台接口，移除地图缓存
  - 地图说明支持 Markdown 渲染
  - 修复登录页 CSS transition 与 GSAP 入场动画冲突，优化更新弹窗
  - 修复 Docker 部署时 admin 环境变量缺失及 .mmmap 解密失败

## 1.0.0

### Patch Changes

- 第一个正式版本
