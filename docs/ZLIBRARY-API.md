# Z-Library 下载 API（MVP）

该实现将 KOReader 插件中的登录、搜索、下载链接获取和文件下载流程重写为 Next.js 服务端 API。代码只使用 Web `fetch` 和流式 `Response`，可在本地 Next.js 与 OpenNext Cloudflare Worker 环境运行。

## 配置

本地开发时，在 `.env.local` 增加：

```dotenv
ZLIBRARY_BASE_URL=https://your-zlibrary-domain.example
ZLIBRARY_EMAIL=your_zlibrary_email
ZLIBRARY_PASSWORD=your_zlibrary_password
ZLIBRARY_API_TOKEN=replace_with_a_long_random_server_token
ZLIBRARY_TIMEOUT_MS=30000
```

匿名搜索只需要 `ZLIBRARY_BASE_URL` 和 `ZLIBRARY_API_TOKEN`。下载必须同时配置 `ZLIBRARY_EMAIL` 与 `ZLIBRARY_PASSWORD`。

部署到 Cloudflare 时，将 `ZLIBRARY_EMAIL`、`ZLIBRARY_PASSWORD` 和 `ZLIBRARY_API_TOKEN` 配置为 Worker secrets，将 `ZLIBRARY_BASE_URL` 和 `ZLIBRARY_TIMEOUT_MS` 配置为环境变量。

## 搜索“火星救援”

```powershell
$token = 'replace_with_your_api_token'
$headers = @{ Authorization = "Bearer $token" }
$result = Invoke-RestMethod `
  -Uri 'http://localhost:3000/api/zlibrary/search?q=%E7%81%AB%E6%98%9F%E6%95%91%E6%8F%B4' `
  -Headers $headers
$result.books | Select-Object id,hash,title,author,format,size,downloadable
```

响应中的 `id` 和 `hash` 是下载调用所需的稳定标识。只有 `downloadable=true` 的候选可提交给下载接口。

## 下载选中的书籍

```powershell
$book = $result.books | Where-Object downloadable | Select-Object -First 1
$body = @{ id = $book.id; hash = $book.hash; fileName = $book.title } | ConvertTo-Json
Invoke-WebRequest `
  -Uri 'http://localhost:3000/api/zlibrary/download' `
  -Method Post `
  -Headers $headers `
  -ContentType 'application/json' `
  -Body $body `
  -OutFile ("$($book.title).$($book.format)")
```

下载接口不会把上游下载地址返回给浏览器，而是直接转发文件流，并保留上游 `Content-Type` 和 `Content-Length`。

## HTTP 接口

### 页面使用的聚合接口

页面调用现有搜索入口，不读取服务端 API Token：

```http
GET /api/books/search?q=火星救援&mode=search
```

响应同时包含 `books` 和 `downloadEditions`。每个下载版本携带一个 10 分钟有效的 `downloadIntent`，页面使用它生成下载地址：

```http
GET /api/books/download?token=<downloadIntent>
```

下载路由校验签名后获取真实下载链接并流式返回文件。Z-Library 账号、Cookie、内部书籍 hash 和真实上游下载地址不会进入页面状态。

### `GET /api/zlibrary/search`

查询参数：

- `q`：必填，搜索关键词。
- `languages`：可选，逗号分隔语言列表。
- `extensions`：可选，逗号分隔格式列表，例如 `epub,pdf`。
- `order`：可选，排序方式。
- `page`：可选，默认 `1`。

请求头：

```http
Authorization: Bearer <ZLIBRARY_API_TOKEN>
```

### `POST /api/zlibrary/download`

请求体：

```json
{
  "id": "book-id",
  "hash": "book-hash",
  "fileName": "optional-file-name"
}
```

成功时响应为书籍文件流；失败时响应为带 `error` 字段的 JSON。
