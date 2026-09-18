/**
 * 机场客户端下载与教程 README 生成器
 * - 内容来源:机场探客户端库 https://jichangtan.com/clients/(按平台入口、客户端总表、图文教程)
 *   与客户端快讯 https://jichangtan.com/articles/category/news/
 * - GitHub Actions 每日运行(.github/workflows/daily-update.yml),有变化才提交
 * 用法:node scripts/update.mjs
 */
import { writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://jichangtan.com';
const CLIENTS = `${SITE}/clients/`;
const NEWS = `${SITE}/articles/category/news/`;
const today = new Date().toISOString().slice(0, 10);
const UA = { 'user-agent': 'jichangx-kehuduan' };

const decode = (s) =>
  String(s)
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

async function getText(url) {
  try {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(String(r.status));
    return await r.text();
  } catch (e) {
    console.log('抓取失败(忽略):', url, e.message);
    return null;
  }
}
const linksOf = (html) => [...html.matchAll(/<a[^>]+href="(\/[^"#?]+\/)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ path: m[1], title: decode(m[2]) }));

/* ---------- 客户端库 ---------- */
const html = await getText(CLIENTS);
if (!html) {
  if (existsSync(join(ROOT, 'README.md'))) {
    console.log('客户端库抓取失败,保留现有 README');
    process.exit(0);
  }
  throw new Error('首次生成失败');
}
const all = linksOf(html);

const platforms = [];
const clients = new Map();
const tutorials = new Map();
for (const { path, title } of all) {
  if (path.startsWith('/clients/platform/')) {
    const m = title.match(/^(.*?)(\d+)$/);
    platforms.push({ path, name: m ? m[1].trim() : title, count: m ? Number(m[2]) : null });
  } else if (path.startsWith('/clients/') && path !== '/clients/') {
    if (!clients.has(path)) clients.set(path, title);
  } else if (path.startsWith('/tutorials/')) {
    const prev = tutorials.get(path);
    if (!prev || title.length > prev.length) tutorials.set(path, title);
  }
}
if (clients.size < 20) {
  if (existsSync(join(ROOT, 'README.md'))) {
    console.log('客户端数量异常,保留现有 README');
    process.exit(0);
  }
  throw new Error('客户端数量异常');
}

/* 教程按平台分组 */
const PLATFORM_ORDER = ['Windows', 'macOS', 'Linux', 'Android', 'iOS', 'OpenWrt', 'HarmonyOS', 'Merlin', 'Steam OS', '其他'];
const platformOf = (path, title) => {
  const m = title.match(/^(Windows|macOS|Linux|安卓|iOS|iPadOS|OpenWrt|HarmonyOS|鸿蒙|Merlin|Steam ?OS) ?版/i);
  let p = m ? m[1] : '';
  if (!p) {
    if (/-windows\/$/.test(path)) p = 'Windows';
    else if (/-macos\/$/.test(path)) p = 'macOS';
    else if (/-linux\/$/.test(path)) p = 'Linux';
    else if (/-android\/$/.test(path)) p = 'Android';
    else if (/-ios\/$/.test(path)) p = 'iOS';
    else if (/-openwrt\/$/.test(path)) p = 'OpenWrt';
    else if (/harmony/.test(path)) p = 'HarmonyOS';
    else if (/merlin/.test(path)) p = 'Merlin';
    else if (/steam/.test(path)) p = 'Steam OS';
  }
  if (/^安卓$/.test(p)) p = 'Android';
  if (/^(iPadOS)$/.test(p)) p = 'iOS';
  if (/^鸿蒙$/.test(p)) p = 'HarmonyOS';
  if (/^Steam ?OS$/i.test(p)) p = 'Steam OS';
  return PLATFORM_ORDER.includes(p) ? p : '其他';
};
const shortTitle = (t) => t.replace(/使用教程[:：].*$/, '').replace(/^图文教程[:：]\s*/, '').trim();
const byPlatform = {};
for (const [path, title] of tutorials) {
  const p = platformOf(path, title);
  (byPlatform[p] ??= []).push({ path, title: shortTitle(title) || title });
}
const tutorialSections = PLATFORM_ORDER.filter((p) => byPlatform[p]?.length)
  .map((p) => `**${p}**\n\n${byPlatform[p].map((t) => `- [${t.title}](${SITE}${t.path})`).join('\n')}`)
  .join('\n\n');

/* ---------- 客户端快讯 ---------- */
const newsHtml = await getText(NEWS);
const news = newsHtml
  ? linksOf(newsHtml)
      .filter((l) => l.path.startsWith('/articles/') && !l.path.startsWith('/articles/category/') && l.path !== '/articles/' && l.title.length > 10)
      .filter((l, i, arr) => arr.findIndex((x) => x.path === l.path) === i)
      .slice(0, 10)
  : [];

/* ---------- 组装 ---------- */
const platformLine = platforms.map((p) => `[${p.name}${p.count ? ` ${p.count}` : ''}](${SITE}${p.path})`).join(' · ');
const clientList = [...clients].map(([path, name]) => `[${name}](${SITE}${path})`).join(' · ');

const readme = `# 全网最全的机场客户端收集 / 下载 / 图文教程 / 客户端科普与快讯(每日同步)

![更新](https://img.shields.io/badge/更新-${today.replace(/-/g, '--')}-00e676) ![客户端](https://img.shields.io/badge/收录客户端-${clients.size}%20款-00b0ff) ![教程](https://img.shields.io/badge/图文教程-${tutorials.size}%20篇-fbbf24) [![来源](https://img.shields.io/badge/内容来源-机场探-f87171)](${CLIENTS}) [![Telegram](https://img.shields.io/badge/Telegram-%40jichangcha-26A5E4?logo=telegram&logoColor=white)](https://t.me/jichangcha)

这里按平台整理 [机场探客户端库](${CLIENTS}) 的公开目录,方便在 GitHub 上检索,下载与教程页面都在机场探原站:先按电脑、手机 / 平板、路由器、掌机等设备类型,再按 Windows、macOS、Linux、Android、iOS、OpenWrt、Merlin、HarmonyOS NEXT、Steam OS 等平台查找机场客户端。下载指向官方来源,附原创安装教程与维护状态;客户端版本快讯来自机场探科普与快讯栏目。目录每天自动同步。

> 🔗 相关仓库:[2026 机场推荐清单](https://github.com/jichangx/2026-jichangcha-tuijian) · [每日免费节点](https://github.com/jichangx/free-nodes) · [每日共享 Apple ID](https://github.com/jichangx/share-apple-id) · [翻墙科普攻略](https://github.com/jichangx/fanqiang-kepu) · [机场科普与快讯](https://github.com/jichangx/jichang-kepu-kuaixun) · [机场查精品聚合](https://github.com/jichangx)

## 🖥️ 按平台找客户端

${platformLine}

## 📦 客户端总表(${clients.size} 款,每款一页:官方下载、维护状态、适用平台)

${clientList}

## 📖 图文教程(${tutorials.size} 篇,导入机场订阅、选择节点与开启代理)

${tutorialSections}

## 📰 客户端快讯(版本更新与服务动态)

${news.length ? news.map((n) => `- [${n.title}](${SITE}${n.path})`).join('\n') : `- 暂时拉取失败,直接看 [机场探快讯](${NEWS})`}

更多:[全部科普与快讯](${SITE}/articles/) · [协议科普](${SITE}/articles/category/protocol/) · [内核科普](${SITE}/articles/category/core/)

## 🧩 其他站点的客户端资料

- [机场帮:全平台客户端下载与配置总表](https://www.jichanghelp.com/clients/) · [找不到添加订阅的地方](https://www.jichanghelp.com/articles/where-to-add-subscription/) · [软件不走代理怎么办](https://www.jichanghelp.com/articles/app-not-using-proxy/)
- [机场中文网:客户端安装与配置教程](https://jichangcnweb.com/tutorials/) · [客户端怎么选](https://jichangcnweb.com/guides/how-to-choose-client/)
- [机场查:鸿蒙装 Google Play](https://www.jichangcha.com/blog/hongmeng-anzhuang-google-play/) · [安卓装 Google Play](https://www.jichangcha.com/blog/anzhuo-anzhuang-google-play/)

## 📌 声明

- 客户端资料与教程版权归机场探,本仓库只做目录镜像与导航,每天自动同步;下载请认准各客户端官方来源,内容仅供学习交流,请遵守当地法律法规
- 机场探的收录与更正口径见 [编辑、推荐与更正政策](${SITE}/editorial-policy/)
- 反馈:[Issues](../../issues) · Telegram [@jichangcha_chat](https://t.me/jichangcha_chat)

⭐ 觉得有用请点个 Star,新客户端和教程会自动出现在这里。
`;

writeFileSync(join(ROOT, 'README.md'), readme);
console.log(`README 已生成:${today} · 客户端 ${clients.size} · 教程 ${tutorials.size} · 平台 ${platforms.length} · 快讯 ${news.length}`);
