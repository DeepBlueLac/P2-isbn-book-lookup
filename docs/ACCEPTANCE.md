# Shelfmark 验收标准

## 合同与范围

- [ ] Factory DryRun 验证四个 JSON 合同、Markdown、分支和密钥检查。
- [ ] 页面没有 Z-Library、盗版下载、虚假用户数或虚假收入声明。
- [ ] Google Books Key 缺失或失败时，Open Library/Gutendex 仍可返回可理解结果。

## 核心路径

- [ ] 用户可按书名、作者或有效 ISBN 搜索。
- [ ] 每条结果无需打开详情即可识别公版下载、借阅、预览、购买或仅元数据。
- [ ] 下载入口只来自上游明确提供的文件或官方格式落地页；Open Library 受限/借阅状态不出现免费下载。
- [ ] Open Library `availability` 映射通过单元测试：开放版出现 `View downloads`，The Martian 这类受限版只出现 Borrow/Preview。
- [ ] 用户可保存/移除搜索结果，刷新后书架仍存在。
- [ ] 用户可导入不超过 50MB 的 EPUB/PDF，在当前设备重新打开或导出。
- [ ] 无效 ISBN、空查询、超长查询、不支持文件和存储失败都有可恢复错误。

## 视觉与无障碍

- [ ] 1440×900 首屏在 5 秒内说明输入、结果和主操作。
- [ ] 768×1024 与 390×844 没有横向溢出、遮挡或小于 44px 的主要触控目标。
- [ ] 所有按钮有 hover、focus-visible、active 和 disabled 状态。
- [ ] 结果、详情、书架、空态、加载、成功和错误状态均通过截图审查。
- [ ] `prefers-reduced-motion` 下不依赖动画理解内容。

## 工程与发布候选

- [ ] `npm run check`、`npm test`、`npm run build` 全部返回 0。
- [ ] Playwright 覆盖搜索、详情、保存、本地文件和错误降级。
- [ ] 不提交 `.env`、API Key、用户文件、签名或真实个人数据。
- [ ] 数据源、隐私、运行、回退和验证报告完整。
