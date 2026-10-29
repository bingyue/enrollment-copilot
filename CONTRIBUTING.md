# 贡献指南

本项目当前为私有仓库，协作需要仓库访问权限。授权模式确认前，不应假定代码已经允许对外分发或商业使用；后续以根目录正式 LICENSE 为准。第三方依赖继续保留原许可证。

## 本地开发

按 [README](README.md) 安装 Node.js 22+，运行 `npm ci`，首次复制 `.env.example` 为 `.env.local`，再运行 `npm run dev`。使用模拟数据开发，不得把密钥和真实学员资料加入测试或提交。

先阅读 [AGENTS.md](AGENTS.md) 和需要修改的模块。Next.js 版本约定以安装包内 `node_modules/next/dist/docs/` 为准。代码使用 TypeScript、2 空格缩进、单引号，格式由 `.prettierrc.json` 管理。

## 提交变更

1. 从 `main` 创建主题分支，保持修改聚焦，不重写他人历史。
2. 修改数据模型时同步校验规则；修改 AI 输出时同步 Prompt、Provider 和相关契约测试。
3. 业务行为变化运行对应测试；UI 变化验证桌面和移动端。
4. 提交前执行项目现有检查：

```bash
npm run format:check
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Playwright 使用本机 Google Chrome、端口 `3211` 和独立测试数据。报告写入 `playwright-report/` 与 `test-results/`，不提交生成文件。`npm run format` 会修改文件，运行后请检查差异。

5. Pull Request 说明修改原因、可观察到的行为变化、实际运行的检查与未验证项。保留第三方声明，不顺带提交环境文件、数据备份或无关格式变化。

当前没有自动 CI，提交者需要如实记录本地验证，不要声明未执行的检查。

## 报告问题

有访问权限的协作者可在仓库 Issue 中提交复现步骤、预期/实际行为、Node.js 版本和脱敏日志。不要包含密码、Token、真实咨询内容或可直接利用的漏洞细节。专用安全反馈与商业授权联系方式：待作者补充。
