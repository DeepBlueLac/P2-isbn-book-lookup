# Z-Library API 技术路径验证

验证日期：2026-07-11

## 验证对象

- 参考文章：[Z-Library + Calibre：打造全自动电子书管理流水线](https://www.manatsuk.net/archives/zlibrary-calibre-automation)
- 代码仓库：[bipinkrish/Zlibrary-API](https://github.com/bipinkrish/Zlibrary-API)
- 本地路径：`D:\Ai-Project\FromGithub\Zlibrary-API`
- 本地提交：`6f9f14a1b6bdd92e276207486b1e0b0277d58fa6`

## 实测结果

| 项目 | 结果 |
|---|---|
| Git 仓库 | 本地仓库存在，`main` 与 `origin/main` 一致 |
| Python 导入 | 成功，唯一第三方依赖为 `requests` |
| API 域名 | 代码硬编码为 `1lib.sk` |
| 公共连通性 | `GET https://1lib.sk/eapi/info` 返回 HTTP 200 和 JSON |
| 登录 | 需要邮箱/密码或 `remix_userid` + `remix_userkey` |
| 搜索/下载 | 未提供个人 Z-Library 凭据，因此没有执行账户搜索或文件下载 |

## 文章路径是否仍可行

从网络和代码层面看，基础路径目前仍然连通，但不适合直接部署到公开或半公开 Vercel 网站：

1. 它不是公开文档化的官方 API，接口和域名随时可能改变。
2. 网站需要保存一个人的 Z-Library Cookie 令牌，所有朋友会共享该账户及每日额度。
3. 当前库没有请求超时、重试、流式下载或文件大小上限。
4. `downloadBook` 会把整个电子书读入 Python 内存，不适合 Vercel Serverless 的时间和内存模型。
5. 下载来源和具体书籍的版权状态无法通过该接口可靠判定。
6. 文章中的 SSH 密码与 `StrictHostKeyChecking=no` 方案不应照搬到联网服务。

## 可接受的本地实验方式

如只验证个人账户和自有/已获授权内容，可在本地单机运行：

- 凭据仅放在本机环境变量，不提交到 Git。
- 先调用 `getProfile()` 和 `getDownloadsLeft()`，再进行搜索。
- 只下载已确认属于公版、个人购买或已获授权的内容。
- 给所有请求增加超时、文件大小限制和异常处理。
- 不把 Cookie 令牌提供给浏览器，也不共享给朋友。

## 网站采用的替代方案

网站采用 Google Books API：

- 书名、作者和 ISBN 搜索稳定可用。
- `accessInfo.publicDomain` 可以作为公版下载门槛。
- EPUB/PDF 使用 Google 返回的官方 `downloadLink`。
- 非公版书只提供 `webReaderLink`、预览或 `buyLink`。
- API Key 保存在 Vercel 环境变量中，不进入客户端或 GitHub。
