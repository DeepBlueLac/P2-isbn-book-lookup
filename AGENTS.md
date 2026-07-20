<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Shelfmark 产品规则

本仓库是独立产品，不把源码并入 P0。遵循 P0 的 DBL 产品获客上线规则：独立部署、任务页与 canonical/sitemap/robots、Search Console、生产统计、P0 双向链接、移动端验证、一次性人工分发和数据前冻结。

本产品的核心任务成功证据定义为：一次有结果的书籍搜索；点击合法阅读路径、保存到本机书架或导入用户自有文件是更深层结果。生产统计后台必须实际收到所采用的成功证据；仅派发 `shelfmark:event` 不算完成。

搜索状态不包含敏感信息时必须保留可分享 URL：复制后再次打开应恢复查询模式、关键词和访问筛选。不得把本地文件名、文件内容或私人书架写进 URL。

获得首批搜索数据前，不做视觉重做或无关新功能；只处理可访问性、索引、统计与核心任务故障。不建设 SEO/Factory 自动化。
