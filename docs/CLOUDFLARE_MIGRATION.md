# DBL-TOOLS Cloudflare 迁移运行手册

## 迁移边界

- 保留现有 Vercel 项目、部署、环境变量和 `vercel.json`，不修改、不删除、不切换生产域名。
- Cloudflare 使用独立 Worker `dbl-tools-shelfmark` 和独立部署配置。
- 第一阶段只发布到 `workers.dev`；验证完成后再接入腾讯云域名。
- 域名切换前必须完整复制腾讯云现有 DNS 记录，尤其是 MX、TXT、CAA、DKIM、DMARC 和第三方验证记录。

## 当前部署

- Cloudflare Worker：`dbl-tools-shelfmark`
- Workers.dev：<https://dbl-tools-shelfmark.bulidoge0422.workers.dev>
- 目标产品域名：`https://books.bulidoge.site`
- 根域名 `bulidoge.site` 保留给未来的 DBL-TOOLS 产品总入口。

## 2026-07-19 上线复核

- `https://books.bulidoge.site/`：HTTPS 与首页 200。
- `https://books.bulidoge.site/api/books/search?q=Pride%20and%20Prejudice&mode=search`：200；开放版本包含 Archive.org 官方格式入口。
- `https://books.bulidoge.site/api/books/search?q=The%20Martian&mode=search`：200；受限版本只显示 Open Library 借阅/预览入口。
- `robots.txt`、`sitemap.xml`、`privacy`：200，站点基址为 `https://books.bulidoge.site`。
- Vercel 生产地址仍为 200，未修改。
- `bulidoge.site` 与 `www.bulidoge.site` 当前 DNS 已进入 Cloudflare，但旧源站返回 521。需要在根域名策略确定后处理：保留旧源站时将两个 A 记录设为 DNS only；改为 DBL-TOOLS 总入口时，将根域名也绑定到独立的入口 Worker。

## 本地命令

```powershell
npm run cf:typegen
npm run cf:build
npm run cf:preview
npm run cf:deploy
```

Cloudflare 的 OpenNext 配置单独使用 Next.js Webpack 构建命令，以规避 Windows 下 OpenNext 与 Turbopack 服务端 chunk 的兼容问题；OpenNext 仍负责注入 standalone 构建环境。普通 `npm run build` 及 Vercel 构建链保持不变。

Cloudflare 登录使用官方 OAuth：

```powershell
npx wrangler login --use-keyring
npx wrangler whoami
```

不要在聊天、Git 或配置文件中粘贴 API Token、密码、验证码、银行卡或 AdSense 收款资料。

## Cloudflare 环境变量

生产 Worker 需要在 Cloudflare 中配置：

- `GOOGLE_BOOKS_API_KEY`：Secret；不可写入 `wrangler.jsonc`。
- `OPEN_LIBRARY_CONTACT_EMAIL`：普通变量；建议使用站点运营邮箱。
- `NEXT_PUBLIC_SITE_URL`：绑定自定义域名后设置为最终 HTTPS 地址，并重新构建部署，以生成正确的 sitemap 与 robots 地址。

Secret 建议通过下列命令由站长本人输入：

```powershell
npx wrangler secret put GOOGLE_BOOKS_API_KEY
```

本地 Cloudflare 预览使用被 Git 忽略的 `.dev.vars`；不要让 Wrangler 复用 Vercel 的 `.env.local`。

## 腾讯云域名接入顺序

1. 在 Cloudflare 添加域名并选择 Free 计划。
2. 对照腾讯云 DNS 控制台，确认 Cloudflare 已导入全部现有记录；缺失项手工补齐。
3. 在腾讯云域名控制台把权威 DNS 服务器替换为 Cloudflare 提供的两条 nameserver。
4. 等待 Cloudflare Zone 状态变为 Active。
5. 为 Worker 添加根域名与 `www` 自定义域名，并确定唯一主域名；另一地址使用 301 跳转。
6. 设置 `NEXT_PUBLIC_SITE_URL`，重新部署，验证首页、API、sitemap、robots、HTTPS 和重定向。
7. Vercel 地址继续保留为回退入口，未验证前不下线。

## 迁移前 DNS 快照（2026-07-19）

| 主机 | 类型 | 当前值 | 初次导入建议 |
| --- | --- | --- | --- |
| `bulidoge.site` | A | `47.102.107.145` | 保留，先设为 DNS only |
| `www.bulidoge.site` | A | `47.102.107.145` | 保留，先设为 DNS only |
| `bulidoge.site` | MX 10 | `inbound-smtp.ap-northeast-1.amazonaws.com` | 必须保留，DNS only |
| `books.bulidoge.site` | 无 | — | 分配给 Cloudflare Worker |

腾讯云已于 2026-07-19 改用 Cloudflare 分配的权威 Nameserver：

- `chance.ns.cloudflare.com`
- `elly.ns.cloudflare.com`

腾讯云控制台中可能还有无法通过公共 DNS 枚举的子域名、验证记录或 DKIM 记录；切换 nameserver 前必须以控制台完整记录列表为准。

## AdSense 上线门槛

接入广告前至少准备：原创且可被索引的内容页、About、Contact、Privacy、Terms、Cookie/Consent（面向 EEA/英国/瑞士时使用 Google 认证 CMP）、清晰导航、无空白或误导页、稳定自定义域名、`ads.txt` 和 Google Search Console。

中国 AdSense 账户的可用收款方式以后台显示为准，官方列表为电汇或 Hyperwallet。Visa 卡号本身不是 AdSense 收款账户；选择电汇时需要本人银行账户信息及 SWIFT 等资料。
