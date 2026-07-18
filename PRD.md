# Shelfmark Ralph 产品交付 PRD

## 最终目标

为需要快速找到合法阅读路径的英语读者完成“找到并保存一本可读的书”：用户提供书名、作者或 ISBN，产品返回带来源、访问状态和直接行动的结果，并允许保存到当前设备的私人书架。

## 启动前合同

- 产品说明：`docs/PRODUCT-BRIEF.md`
- 设计判断：`docs/DESIGN-READ.md`
- 设计 Prompt：`docs/DESIGN-PROMPT.md`
- 验收标准：`docs/ACCEPTANCE.md`
- 项目状态：`.factory/run.json`

缺少文件、存在未替换占位符或验收项不可测试时停止，不进入实现。

## Ralph 迭代顺序

### INTAKE / DESIGN

- 校验机器合同与人工说明一致。
- 固定 Shelfmark 品牌、首屏层级、三视口和版权措辞。

### CORE

- 抽离 ISBN 校验、结果标准化、访问状态选择和去重逻辑。
- Open Library、Gutendex、Google Books 独立请求，允许部分失败。
- IndexedDB 本地文件存储与 localStorage 书架元数据具备大小和类型限制。

### EXPERIENCE

- 英语首屏、书名/作者/ISBN 搜索、示例与状态反馈。
- 结果列表直接展示最合理阅读行动。
- 详情、复制、保存/移除、私人书架和 EPUB/PDF 导入完整可用。

### POLISH

- 1440×900、768×1024、390×844 响应式。
- 焦点、触控、减少动态、错误与降级状态。
- SEO metadata、robots、sitemap、manifest、隐私与数据源页面。

### VERIFY / CANDIDATE

- lint、类型、单测、构建和 Playwright 全绿。
- 归档截图、质量 JSON、回退说明和下一轮失败项。
- 只生成候选，不自动推送或部署。

## 不允许做的事

- 不接入影子图书馆、DRM 绕过或版权不明文件。
- 不增加账户、团队、后台、订阅或 PRD 外功能。
- 不删除失败测试、降低断言或伪造截图/指标。
- 不自动合并、推送、部署、写入生产密钥或发布商店。
