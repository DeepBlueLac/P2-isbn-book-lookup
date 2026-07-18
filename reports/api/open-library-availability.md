# Open Library availability canary

验证目的：确认 Shelfmark 能把 Open Library 的公开可用性映射成合法下载格式入口，同时不把受限借阅版伪装成免费下载。

## 官方接口证据

- Search API 请求增加 `fields=availability`。
- 官方文档说明该字段读取 Archive.org 对 `ia` 第一项的可用性数据：<https://openlibrary.org/dev/docs/api/search>。
- Open Library 要求低频请求、缓存响应，并使用带应用名称和联系信息的 User-Agent：<https://openlibrary.org/developers/api>。

## 实时样本

### The Martian / Andy Weir

Open Library 返回：`ebook_access=borrowable`、`status=borrow_available`、`is_readable=false`、`is_lendable=true`、`is_restricted=true`。

Shelfmark 结果：

- `downloadPage = null`
- `borrow = https://openlibrary.org/books/OL47698466M`
- `preview = https://archive.org/details/marsjanin0000andy`
- 主行动：`Check availability`

### Pride and Prejudice / Jane Austen

Open Library 返回：`ebook_access=public`、`status=open`、`is_readable=true`、`is_restricted=false`，并给出 Archive.org identifier。

Shelfmark 结果：

- `downloadPage = https://archive.org/details/bwb_KS-179-237`
- 主行动：`View downloads`
- 详情行动：`View download formats`

Archive.org item metadata 实际列出了 EPUB 与 PDF 文件，因此格式选择与下载由官方 item 页完成；Shelfmark 不代理、不镜像、不构造受限文件直链。

## 浏览器验收

- 1440×900：开放版结果列表出现 `View downloads`，来源为 `archive.org`，无横向溢出。
- 390×844：开放版结果列表保留 `View downloads`，无横向溢出。
- The Martian / Andy Weir：结果显示 `Check availability`，没有下载入口。
- 详情页：开放版出现 `View download formats`；The Martian 受限版不会出现该操作。

## 本机网络说明

当前 Windows 会话存在 `HTTPS_PROXY`。Node 24 的开发服务需要使用 `NODE_OPTIONS=--use-env-proxy` 才能与 PowerShell 一样访问 Open Library；这是本地网络设置，不是产品运行时依赖。
