# 部署与运维说明

本文描述现有 Node.js 应用的部署方法。项目没有容器镜像、自动部署流程或静态导出配置。服务器步骤供实际部署时使用，不表示已经部署到公网或完成云端验收。

## 1. 运行环境与配置

需要 Node.js 22+、npm 和源码访问权限。在项目根目录执行 `npm ci`；首次可复制 `.env.example` 为 `.env.local`，已有配置不要覆盖。也可以通过进程管理器注入环境变量。

默认使用 `.data/workspace.json`。生产文件存储建议将 `DATA_PATH` 指向发布目录之外的绝对路径，例如 `/srv/enrollment-copilot-data/workspace.json`；部署前创建目录，只授予运行账号读写权限，并保持单 Node 进程。该目录需要持久磁盘。

采用 Supabase 时，在目标项目 SQL 编辑器执行 `supabase/schema.sql`，然后配置：

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
WORKSPACE_ID=your-organization
```

在受保护的环境中填写自己的 service-role key。SQL 禁止浏览器匿名读写，所有数据由服务端访问。切换存储不会自动搬迁 JSON 数据，新工作区首次读取会初始化模拟数据。有业务数据时需单独准备迁移与校验方案，当前没有一键导入入口。

共享访问时还需设置：

```dotenv
APP_PUBLIC=true
APP_PASSWORD=
APP_ORIGIN=https://crm.example.com
```

空密码只作为模板，运行前必须填入强密码。`APP_PUBLIC=true` 不会开放端口；缺少密码时应用拒绝业务访问。会话使用 HMAC 签名、HttpOnly、SameSite=Strict，12 小时有效；HTTPS 来源下设置 Secure。更换密码会使原有签名失效。

这是共享密码保护，不具备用户级权限。扩展多人多机构服务前需要另行实现用户身份、成员关系、组织隔离和相应数据库策略。

## 2. 构建与启动

```bash
npm ci
npm run build
npm start
```

当前 `start` 固定监听 `127.0.0.1:3210`。可用已有 systemd、PM2 或其他进程管理器在项目目录运行 `npm start`；仓库未提供这些管理器的配置。文件模式不要启用 cluster 多实例，发布时先停止旧进程，再启动新版本。

开发与生产服务不能同时占用端口 3210。构建与启动必须使用相同的 `NEXT_DIST_DIR`，常规部署保持默认 `.next`；不要将开发测试目录 `.next-e2e` 当作生产构建。

## 3. HTTPS 反向代理示例

下面的 Nginx `location` 可放入已配置域名与有效 TLS 证书的 `server` 块，需按自己的服务器调整。仓库不提供证书申请、DNS 或 Nginx 安装脚本；以下代理配置未在远程服务器验收。

```nginx
location / {
    proxy_pass http://127.0.0.1:3210;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 75s;
    client_max_body_size 350k;
}
```

`APP_ORIGIN` 应与实际 HTTPS 来源一致。模型请求可能持续至 55 秒，代理超时应留出处理时间。应用有输入限制和进程内限流；它们不替代反向代理访问策略，也不会在多个实例之间共享计数。

## 4. 启动验证

```bash
curl --fail --silent http://127.0.0.1:3210/api/status
```

共享密码开启时，未登录请求的 `authorized` 为 `false` 是正常结果。用浏览器访问实际域名，输入密码，检查工作区加载，再用模拟咨询验证分析、任务、报名和刷新持久化。

`/api/status` 仅返回配置状态，不主动探测模型或数据库。Supabase 应通过实际工作区读写验收，模型应通过一次真实请求验收；不要以 `configured: true` 当作服务成功证明。

## 5. 备份与回滚

- 设置页面可导出完整工作区 JSON；导出包含业务数据，应在仓库之外保存。
- 本地恢复时停止服务，保存当前文件副本，将符合 `workspaceSchema` 的备份放回 `DATA_PATH`，恢复权限后启动并验证。当前没有自动恢复工具。
- Supabase 使用数据库侧备份恢复机制；本项目未提供数据库运维自动化。
- 升级前备份数据并保留原代码版本；回滚时停止服务，切回已验证提交，重新 `npm ci` 和构建。数据结构变化需要对应迁移，不能仅回滚代码。
- Git 只记录源码，不替代业务数据备份；`.gitignore` 已排除本地数据和常见备份文件。

## 6. 生产使用前的已知事项

项目需要 Node.js 服务端，不能部署为 GitHub Pages 静态网站。真实模型及 Supabase 云端仍需使用自己的配置验收。已知依赖审计与本次复测范围见 [仓库检查记录](repository-check.md)。Private 状态只控制源码访问，不会保护自行公开运行的网站。
