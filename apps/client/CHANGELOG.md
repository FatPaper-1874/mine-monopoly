# @mine-monopoly/client

## 1.1.3

### Patch Changes

- 修复安卓端更新检查失败时无提示的问题

## 1.1.2

### Patch Changes

- - 丰富系统接口，角色技能效果更精准
  - 调整主题色和装饰边框颜色引用，主题表现更统一

## 1.1.1

### Patch Changes

- - 修复 Android 端检查更新时因 update.json 包含换行符导致 JSON 解析失败的问题

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

## 1.0.1

### Patch Changes

- - 修复登录凭证过期时提示网络错误的问题，改为正确提示并跳转登录页

## 1.0.0

### Patch Changes

- 第一个正式版本
