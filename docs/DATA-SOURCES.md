# Shelfmark 数据源与许可边界

## Open Library

- 用途：搜索、ISBN 元数据、封面和可借阅/可阅读/可公开下载格式的官方落地页。
- 接口：`https://openlibrary.org/search.json`，请求中包含 `availability` 字段。
- 鉴权：无。
- 约束：常用字段相对稳定，但 Search API 文档明确不保证所有字段稳定；只依赖明确请求的常用字段。
- 产品规则：当 `ebook_access=public`，或 `availability.status=open` / `is_readable=true` 且 `is_restricted` 不是 `true` 时，且存在 Archive.org identifier，展示 `View downloads` 并跳转到官方 item 格式页。这个入口让 Archive.org 自己决定当前可用格式，不伪造 EPUB/PDF 直链。
- 受限规则：`borrowable`、`is_lendable=true` 或 `is_restricted=true` 只展示 Borrow/Preview；不会显示免费下载。
- 使用规则：服务端带有 Shelfmark User-Agent；可通过 `OPEN_LIBRARY_CONTACT_EMAIL` 提供联系邮箱。搜索结果由 Route Handler 以 `s-maxage=3600` 缓存，避免重复请求。

## Google Books

- 用途：补充版本元数据、预览和购买入口。
- 接口：Google Books Volumes API。
- 鉴权：服务端可选 `GOOGLE_BOOKS_API_KEY`。
- 产品规则：只有 `publicDomain === true` 且 API 明确返回下载链接时才显示 Google 公版文件下载。
- 降级：Key 缺失、限流或失败时继续返回 Open Library 与 Gutendex 结果。

## Gutendex / Project Gutenberg

- 用途：检索 Project Gutenberg 公版目录和来源方提供的格式链接。
- 鉴权：无。
- 产品规则：展示来源和版权地区提示；首版不批量镜像文件，不把第三方下载带宽作为付费功能。
- 长期方案：流量增长后自托管 Gutendex 目录，并依据 Project Gutenberg 条款选择合法镜像或自托管文件。

## 用户本地文件

- 用途：用户导入自己拥有的 EPUB/PDF。
- 存储：浏览器 IndexedDB；不上传服务器。
- 限制：单文件 50MB；清除站点数据会删除文件；浏览器隐私模式或配额可能导致不可用。

## 禁止数据源

不接入 Z-Library、影子图书馆、破解 DRM、非官方登录抓取或版权状态不明的文件直链。
