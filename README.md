# 书目

一个无需登录的 ISBN 图书信息查询器。输入 ISBN-10 或 ISBN-13，从 Open Library 获取封面、作者、出版社、出版日期、页数和主题，并支持复制书目信息与下载 JSON。

## 本地运行

```bash
npm install
npm run dev
```

访问 `http://localhost:3000`。

## 验证

```bash
npm run lint
npm run build
```

## 数据与隐私

- 图书信息来自 [Open Library](https://openlibrary.org/developers/api)。
- 最近查询只保存在浏览器 `localStorage`。
- 项目不包含用户账户、数据库或服务端密钥。
- 查询结果可能不完整，请以实体书版权页为准。
