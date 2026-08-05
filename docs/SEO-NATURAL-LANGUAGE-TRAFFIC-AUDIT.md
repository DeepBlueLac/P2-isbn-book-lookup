# Shelfmark 自然搜索与自然语言查询流量审计

审计日期：2026-08-06
唯一正式域名：`https://books.bulidoge.site/`

## 结论

Shelfmark 已具备被 Google 和 Bing 抓取的基本技术条件，但当前仍处于“已发现、尚未建立索引与排名信号”的阶段。现阶段的主要限制不是缺少关键词，而是：

1. 5 个公开 URL 尚无可验证的搜索索引结果。
2. 站内搜索结果只存在于 `/?q=...` 的客户端交互中，统一 canonical 到首页，没有独立、稳定、服务端可读的书籍页面，因此无法承接“书名 + EPUB/PDF/ISBN”等长尾查询。
3. 目前只有首页、3 个任务页和隐私页，能覆盖的搜索意图过窄。
4. 首页 metadata、Manifest 和隐私说明仍包含旧产品文案，与当前 Z-Library 下载、Supabase 登录和 PostHog 统计实现不一致。
5. 外部发现信号目前主要来自 P0 Hub 与 GitHub；Show HN 已从本轮收录流程中移除。

## 已验证状态

- 首页、3 个任务页、隐私页均返回 HTTP 200。
- Googlebot 桌面、Googlebot Smartphone 和 Bingbot 均可读取任务页，返回 HTTP 200。
- `robots.txt` 允许公开页面抓取，仅禁止 `/api/`。
- `sitemap.xml` 返回 `application/xml`，包含 5 个 canonical URL。
- 5 个页面均有 self-referencing canonical；没有 `noindex`。
- P0 Hub 的 Shelfmark 页面存在指向正式域名的普通可抓取链接。
- `http://books.bulidoge.site/` 当前直接返回 200，尚未永久重定向到 HTTPS。
- 首页实际 `<title>` 为 `Find a book`，过于笼统且未包含品牌和核心任务。
- `/?q=9780553418026&mode=isbn` 返回首页壳层，canonical 为首页，首屏 HTML 不包含下载结果。
- 外部 `site:` 与品牌精确查询暂未发现 Shelfmark 的搜索结果；Search Console 最近状态为“已发现 - 尚未编入索引”。

## P0：首次收录前完成

### 代码与站点信号

1. 将首页标题改为明确且简洁的任务标题，例如：
   `Search Book Files by ISBN, Title or Author | Shelfmark`
2. 统一首页 description、Manifest、Header/Footer 和隐私页，使其准确反映：
   - Open Library / Google Books 用于书籍元数据；
   - Z-Library 用于可下载版本；
   - Supabase 用于邮箱 OTP 与账户；
   - PostHog 用于产品事件；
   - 本地书架使用浏览器存储。
3. 把 HTTP 永久重定向到 HTTPS；canonical、sitemap、内部链接继续只使用 HTTPS。
4. 让 sitemap 的 `lastmod` 对应每页最后一次重要内容更新。Google 忽略 `priority` 和 `changefreq`，不应把它们当作排名信号。
5. 在页面被正式收录前处理 `/public-domain-book-finder` 的 URL 与内容不匹配问题。推荐新建语义一致的 `/downloadable-book-files`，旧 URL 做永久重定向，并在 sitemap、内链和 canonical 中只保留新 URL。

### 站长平台操作

Google Search Console：

1. 选择 `https://books.bulidoge.site/` 资源。
2. 对 5 个 canonical URL 逐个执行“网址检查 → 测试实际网址 → 请求编入索引”。
3. 每个 URL 请求一次即可；重复请求不会加快抓取。
4. 保留唯一 sitemap：`https://books.bulidoge.site/sitemap.xml`。

Bing Webmaster Tools：

1. 确认导入后的站点是 `https://books.bulidoge.site/`。
2. 确认 sitemap 已成功处理。
3. 在 URL Submission 中一次提交 5 个 canonical URL。
4. 在 Cloudflare 启用 Crawler Hints，让内容更新通过 IndexNow 通知 Bing 等参与方。

Cloudflare：

1. 启用 Always Use HTTPS 或等价永久重定向规则。
2. 启用 Crawler Hints。
3. 保留 Googlebot、Bingbot 对公开页面的访问权限。

## P1：获得自然语言与长尾查询流量

### 不索引任意搜索参数

继续把任意 `?q=` 搜索状态视为产品交互，而不是 SEO 页面。任意搜索词会形成近乎无限的参数 URL，容易产生重复、空结果和抓取浪费。

### 建立稳定的可索引页面

新增两类 URL：

1. 任务/指南页：一个页面解决一个真实问题，不为每个关键词变体复制页面。
   - `/guides/find-a-book-by-isbn`
   - `/guides/find-an-ebook-by-title-or-author`
   - `/guides/epub-vs-pdf-vs-mobi-vs-azw3`
   - `/guides/why-books-have-multiple-isbns`
2. 精选书籍实体页：
   - 形如 `/books/{isbn}-{slug}`；
   - 服务端输出书名、作者、ISBN、版本、语言、出版信息和最近检查到的格式；
   - 使用唯一 title、description、canonical 和可见正文；
   - 没有足够数据或没有实际价值的实体页不进入 sitemap；
   - 初期只从真实搜索数据中选 20–50 本，不批量生成数千个薄页面。

每个页面应包含：直接回答、实际搜索工具入口、示例、版本/格式解释、数据更新时间、相关任务页或书籍页内链。Google 的语言匹配系统能理解同义词和长尾表达，不需要机械重复所有关键词。

### 结构化数据

- 现有 `WebSite` / `WebApplication` 可以保留，但不是收录保证。
- 普通工具站的 `FAQPage` 通常不会获得 FAQ 富结果，不列为优先事项。
- 等稳定书籍实体页上线后，再添加与可见正文一致的 `Book`、`WebPage` 和 `BreadcrumbList`。
- Google Book Actions 是面向符合条件的大型图书提供方的独立 feed/申请流程，不应把它当作当前收录捷径。

## P2：外部发现与权威信号

1. 在 P0 Hub、GitHub README 保持唯一正式域名，当前已完成。
2. Show HN 暂不执行；后续外链建设只在有合适内容和社区上下文时单独推进。
3. 后续优先获得少量真实、相关的产品/开发者社区提及，而不是批量目录链接。
4. 外部发布页面必须链接到具体、最相关的 canonical 页面；不要全部只链首页。

## 语言策略

当前 HTML 默认 `lang=en`，且没有独立中文 URL，因此第一阶段只能主动争取英文索引和英文查询流量。客户端语言切换不会形成稳定中文索引。若要争取中文自然搜索，后续必须建立 `/zh/` 页面、自引用 canonical 与中英文 `hreflang`，而不是仅翻译客户端文案。

## 监控方式

首次提交后，抓取和收录可能需要数天到数周。每周检查：

- Search Console：已编入索引页数、非品牌查询 impressions、clicks、CTR、页面维度表现；
- Bing Webmaster Tools：URL Inspection、IndexNow、Search Performance、AI Performance；
- PostHog：`search_submitted → zlib_results_loaded → download_started` 漏斗；
- 将 Search Console 中“有展示但 CTR 低”的查询用于改标题和摘要，将 PostHog 中“站内高频但没有入口页”的需求用于规划下一篇指南或精选书籍页。

Google Ads 的“搜索主题（最多 50 个）”只影响 Performance Max 广告投放，不会让页面获得自然收录或自然排名。Google 也不使用 `<meta name="keywords">` 参与网页排名。

## 官方资料

- Google Search Essentials: https://developers.google.com/search/docs/essentials
- SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Ask Google to recrawl URLs: https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
- JavaScript SEO basics: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- Canonical URL guidance: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Crawlable links: https://developers.google.com/search/docs/crawling-indexing/links-crawlable
- Sitemap guidance: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Generative AI search optimization: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Book structured data: https://developers.google.com/search/docs/appearance/structured-data/book
- Bing Webmaster Guidelines: https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a
- Bing URL Submission: https://www.bing.com/webmasters/help/URL-Submission-62f2860b
- Bing IndexNow: https://www.bing.com/webmasters/help/indexnow-0z209wby
- Cloudflare Crawler Hints: https://developers.cloudflare.com/cache/advanced-configuration/crawler-hints/
