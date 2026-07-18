# 书目

一个无需登录的图书搜索和公版电子书下载工具。支持书名、作者、Google Books 查询语法及 ISBN 精确查询。

## 功能

- 书名、作者和 ISBN 搜索
- 聚合 Google Books 与 Project Gutenberg 搜索结果
- 只显示可直接下载的公版书
- Google Books 和 Project Gutenberg 官方 EPUB/PDF 下载链接
- 非公版图书的在线预览和购买入口
- 封面、作者、出版社、日期、页数和简介
- 复制书目信息

网站不会把受限预览伪装成免费下载。只有 Google Books 将条目标记为 `publicDomain` 且提供 `downloadLink`，或 Project Gutenberg 明确提供公版文件时，界面才显示下载按钮。

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

在 `.env.local` 中配置：

```text
GOOGLE_BOOKS_API_KEY=...
```

密钥仅由 Next.js Route Handler 使用，不会下发到浏览器。

## 验证

```bash
npm run lint
npm run build
```

## 数据与隐私

- 元数据、预览、购买和部分公版下载链接来自 [Google Books API](https://developers.google.com/books/docs/v1/using)。
- 公版书直链还来自 [Project Gutenberg](https://www.gutenberg.org/) 的 [Gutendex API](https://gutendex.com/)。
- 项目不包含用户账户或数据库。
- 查询结果和下载权限会受国家/地区、Google Books 收录情况及版权状态影响。
- 请以图书版权页和 Google Books 的访问标记为准。

## Z-Library 路径

本项目没有在网站中集成 Z-Library。相关技术验证见 [ZLIBRARY-FEASIBILITY.md](./docs/ZLIBRARY-FEASIBILITY.md)。
