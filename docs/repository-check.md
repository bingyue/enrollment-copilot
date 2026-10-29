# 文档与仓库发布检查

检查日期：2026-10-30（Asia/Shanghai）。本文记录本次实际验证，早期 MVP 验收见 [verification.md](verification.md)。

## 初始状态与变更范围

- 项目根目录：`enrollment-copilot`；npm 包名：`zhiyu-enrollment-copilot`。
- 初始没有 Git 仓库、提交、分支、remote、LICENSE 或 NOTICE；本次在项目根目录初始化 `main`，没有改写已有历史或远程。
- 重写中文 README，补充部署、贡献与第三方依赖声明；保留原演示脚本、历史验收记录和真实演示截图。
- `.gitignore` 补充系统文件、日志、部署状态、密钥、私有本地配置与备份排除规则；`.env.example` 与数据库建表 SQL 继续纳入版本控制。
- 没有添加 Docker、CI、GitHub Pages 或公开部署。生产代理示例仅为部署说明，未连接远程服务器。
- 项目授权方案仍待作者确认；`license-draft.md` 仅为未生效的讨论草案，不是正式 LICENSE。

## 依赖安全修复

初次 `npm ci` / `npm audit` 报告 Next.js 与 Zod 共 2 个受影响包，Next.js 16.4.0 的生产构建也因安全提示以非零状态退出。为使文档中的构建步骤可执行，进行了补丁更新：

| 包   | 检查前 | 检查后 |
| ---- | ------ | ------ |
| next | 16.4.0 | 16.4.3 |
| zod  | 4.6.5  | 4.6.6  |

同时更新对应锁文件条目；没有使用 `npm audit fix --force` 或关闭安全检查。重新 `npm ci` 后，`npm audit --json` 返回 **0 个已知漏洞**。此结果仅代表检查时 npm advisory 数据库的匹配结果，不是不存在安全问题的保证。

参考公告：[Next.js Image Optimization](https://github.com/advisories/GHSA-2464-fhr4-w9xw)、[Next.js Server Actions](https://github.com/advisories/GHSA-p3m5-59mp-jv5r)、[Next.js use cache](https://github.com/advisories/GHSA-673q-mjm6-r5xr)、[Zod 集合校验](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)。

## 本次验证

环境：macOS、Node.js 22.23.1、npm 10.9.8、Git 2.53.0、本机 Google Chrome。

| 检查                                   | 结果                                                           |
| -------------------------------------- | -------------------------------------------------------------- |
| `npm ci`                               | 补丁更新后成功，锁文件可安装                                   |
| `npm test`                             | 16 项通过                                                      |
| `npm run build`                        | Next.js 16.4.3 生产构建通过                                    |
| `npm run typecheck`                    | 通过                                                           |
| `E2E_PRODUCTION=true npm run test:e2e` | 6 项全部通过                                                   |
| `npm run format:check`                 | 通过                                                           |
| 开发与生产启动                         | npm run dev 与 npm start 均启动成功，/api/status 返回 HTTP 200 |
| 依赖审计                               | 0 个已知漏洞                                                   |

端到端测试使用端口 3211 与独立 `.data/e2e-workspace.json`；未重置原有演示工作区。测试范围包括咨询到报名运营、课程编辑、搜索与任务、批量质检、人工画像校正、运营待办、移动端七页面和无效/跨站输入。

## 数据与许可检查

对拟提交文本进行私钥格式、GitHub / 模型 Token、AWS Key、JWT、含凭据 URL 和硬编码凭据模式扫描。初次命中仅为 `tests/auth.test.ts` 的固定测试密码 `test-password-only`，已人工核实为测试夹具，不是运行凭据。该扫描不声称覆盖所有形式的敏感信息。

已验证环境文件、`.data`、构建目录、测试报告、常见密钥和备份路径被 Git 忽略。第三方直接依赖的许可证与 NOTICE 按原文保存，并纳入 Prettier 排除，防止格式化改写。

## GitHub 与 SSH

通过已登录的 Chrome 创建 [bingyue/enrollment-copilot](https://github.com/bingyue/enrollment-copilot)，创建时明确选择 **Private**，不初始化 README、LICENSE 或 .gitignore。浏览器已显示 Private 与空仓库状态。

现有 SSH 配置成功认证为 `bingyue`。远程使用 `git@github.com:bingyue/enrollment-copilot.git`；首次 `git ls-remote origin` 成功且无分支，证明远端为空。最终提交以 Git 历史为准；可用 `git rev-parse HEAD` 与 `git ls-remote origin refs/heads/main` 对比本地、远端提交，用 `git status --short` 检查工作区。

## 未完成外部验收

没有真实模型、Supabase 云端、HTTPS 反向代理、企微消息、支付或 LMS 的本次联网测试。未新增不存在的功能或性能数据。商业授权联系渠道待作者补充，最终许可需作者明确选择。
