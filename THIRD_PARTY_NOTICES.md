# 第三方依赖与版权声明

本文件记录 package.json 中直接依赖的锁定版本与安装包内许可证。第三方代码属于各自权利人，项目许可证不替代或限制其原有授权。

许可证与 NOTICE 原文按字节复制到 docs/licenses/，没有改写版权人或许可条款。此清单不宣称覆盖 Next.js 等包内部所有捆绑依赖；完整传递依赖见 package-lock.json，分发包含依赖的构建产物时还需保留所分发包及其捆绑代码的许可证、NOTICE 与源文件声明。

执行 `npm ci` 后，可运行 `node scripts/sync-third-party-notices.mjs` 更新此索引。升级依赖后应复核版本、许可变化和新增声明。

| 依赖                     | 版本    | 用途     | 包声明的许可证 | 原始声明                                                                                            |
| ------------------------ | ------- | -------- | -------------- | --------------------------------------------------------------------------------------------------- |
| @playwright/test         | 1.63.0  | 开发依赖 | Apache-2.0     | [LICENSE](docs/licenses/playwright__test/LICENSE) · [NOTICE](docs/licenses/playwright__test/NOTICE) |
| @radix-ui/react-dialog   | 1.2.0   | 运行依赖 | MIT            | [LICENSE](docs/licenses/radix-ui__react-dialog/LICENSE)                                             |
| @radix-ui/react-slot     | 1.4.0   | 运行依赖 | MIT            | [LICENSE](docs/licenses/radix-ui__react-slot/LICENSE)                                               |
| @supabase/supabase-js    | 2.117.2 | 运行依赖 | MIT            | [LICENSE](docs/licenses/supabase__supabase-js/LICENSE)                                              |
| @tailwindcss/postcss     | 4.3.3   | 开发依赖 | MIT            | [LICENSE](docs/licenses/tailwindcss__postcss/LICENSE)                                               |
| @types/node              | 22.20.5 | 开发依赖 | MIT            | [LICENSE](docs/licenses/types__node/LICENSE)                                                        |
| @types/react             | 19.3.0  | 开发依赖 | MIT            | [LICENSE](docs/licenses/types__react/LICENSE)                                                       |
| @types/react-dom         | 19.3.0  | 开发依赖 | MIT            | [LICENSE](docs/licenses/types__react-dom/LICENSE)                                                   |
| class-variance-authority | 0.7.1   | 运行依赖 | Apache-2.0     | [LICENSE](docs/licenses/class-variance-authority/LICENSE)                                           |
| clsx                     | 2.1.1   | 运行依赖 | MIT            | [license](docs/licenses/clsx/license)                                                               |
| lucide-react             | 0.468.0 | 运行依赖 | ISC            | [LICENSE](docs/licenses/lucide-react/LICENSE)                                                       |
| next                     | 16.4.3  | 运行依赖 | MIT            | [license.md](docs/licenses/next/license.md)                                                         |
| prettier                 | 3.9.9   | 开发依赖 | MIT            | [LICENSE](docs/licenses/prettier/LICENSE)                                                           |
| react                    | 19.3.0  | 运行依赖 | MIT            | [LICENSE](docs/licenses/react/LICENSE)                                                              |
| react-dom                | 19.3.0  | 运行依赖 | MIT            | [LICENSE](docs/licenses/react-dom/LICENSE)                                                          |
| recharts                 | 3.10.1  | 运行依赖 | MIT            | [LICENSE](docs/licenses/recharts/LICENSE)                                                           |
| tailwind-merge           | 3.7.0   | 运行依赖 | MIT            | [LICENSE.md](docs/licenses/tailwind-merge/LICENSE.md)                                               |
| tailwindcss              | 4.3.3   | 开发依赖 | MIT            | [LICENSE](docs/licenses/tailwindcss/LICENSE)                                                        |
| tsx                      | 4.23.15 | 开发依赖 | MIT            | [LICENSE](docs/licenses/tsx/LICENSE)                                                                |
| typescript               | 5.9.3   | 开发依赖 | Apache-2.0     | [LICENSE.txt](docs/licenses/typescript/LICENSE.txt)                                                 |
| zod                      | 4.6.6   | 运行依赖 | MIT            | [LICENSE](docs/licenses/zod/LICENSE)                                                                |

Lucide 的声明同时包含 Feather 衍生部分的归属；class-variance-authority、Playwright、TypeScript 等的 Apache 声明也按原文保留。这些组件的许可不表示本项目整体已选择 Apache 2.0。
