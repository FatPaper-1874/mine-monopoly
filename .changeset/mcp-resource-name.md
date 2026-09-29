---
"@mine-monopoly/map-editor": patch
---

- MCP `add_temp_model` / `add_temp_image` 支持可选参数 `name` 指定资源名称
- 新增 MCP 工具 `update_resource`，可重命名模型或图片资源
- 修复删除资源后新建临时资源出现重名（如两个“临时图片 2”）的问题
