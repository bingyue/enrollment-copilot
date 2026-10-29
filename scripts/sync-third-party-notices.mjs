import { readFile, writeFile, readdir, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';

// Copy upstream texts verbatim; never substitute the project's own copyright.
const root = path.resolve(import.meta.dirname, '..');
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
const lines = [
  '# 第三方依赖与版权声明',
  '',
  '本文件记录 package.json 中直接依赖的锁定版本与安装包内许可证。第三方代码属于各自权利人，项目许可证不替代或限制其原有授权。',
  '',
  '许可证与 NOTICE 原文按字节复制到 docs/licenses/，没有改写版权人或许可条款。此清单不宣称覆盖 Next.js 等包内部所有捆绑依赖；完整传递依赖见 package-lock.json，分发包含依赖的构建产物时还需保留所分发包及其捆绑代码的许可证、NOTICE 与源文件声明。',
  '',
  '执行 `npm ci` 后，可运行 `node scripts/sync-third-party-notices.mjs` 更新此索引。升级依赖后应复核版本、许可变化和新增声明。',
  '',
  '| 依赖 | 版本 | 用途 | 包声明的许可证 | 原始声明 |',
  '| --- | --- | --- | --- | --- |',
];
for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).sort()) {
  const dir = path.join(root, 'node_modules', name);
  const metadata = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'));
  if (metadata.version !== lock.packages[`node_modules/${name}`]?.version) {
    throw new Error(`Installed version differs from lockfile: ${name}`);
  }
  const destination = `docs/licenses/${name.replaceAll('/', '__').replaceAll('@', '')}`;
  const notices = (await readdir(dir)).filter((file) =>
    /^(licen[sc]e|notice|copying)(\.|$)/i.test(file),
  );
  if (!notices.length) throw new Error(`Review missing license file: ${name}`);
  await mkdir(path.join(root, destination), { recursive: true });
  for (const file of notices)
    await copyFile(path.join(dir, file), path.join(root, destination, file));
  const links = notices.map((file) => `[${file}](${destination}/${file})`).join(' · ');
  lines.push(
    `| ${name} | ${metadata.version} | ${pkg.dependencies[name] ? '运行依赖' : '开发依赖'} | ${metadata.license || '参见原文'} | ${links} |`,
  );
}
lines.push(
  '',
  'Lucide 的声明同时包含 Feather 衍生部分的归属；class-variance-authority、Playwright、TypeScript 等的 Apache 声明也按原文保留。这些组件的许可不表示本项目整体已选择 Apache 2.0。',
  '',
);
await writeFile(path.join(root, 'THIRD_PARTY_NOTICES.md'), lines.join('\n'));
console.log(
  `Recorded ${Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).length} direct dependency notices.`,
);
