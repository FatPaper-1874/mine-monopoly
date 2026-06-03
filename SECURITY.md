# Security Policy

## 报告安全漏洞

如果你发现安全漏洞，请**不要**通过公开的 Issue 报告。

请发送邮件至维护者邮箱，我们将在 48 小时内回复。确认漏洞后，我们会尽快发布修复版本，并在 CHANGELOG 中致谢报告者。

## 自建部署安全注意事项

- 修改 `.env` 中所有默认密码和密钥（`MYSQL_PASSWORD`、`TURN_SECRET`、`MAP_ENCRYPT_KEY`）
- 生产环境设置 `NODE_ENV=production`
- 使用防火墙限制 MySQL 端口的外部访问
- 定期更新 coturn TURN 服务器配置中的 `TURN_SECRET`
- 如需暴露到公网，建议配置 HTTPS 和 nginx 反向代理

## 支持的版本

| 版本 | 支持状态 |
|---|---|
| 2.0.x | 活跃开发中 |
| 1.0.x | 安全更新 |
