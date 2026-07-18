# Google Play 发布资料

## 应用信息

- 应用名称：书目
- 简短说明：扫描或输入 ISBN，快速查询图书信息。
- 完整说明：书目是一款无需登录的 ISBN 图书信息查询工具。输入 ISBN-10 或 ISBN-13，或使用摄像头扫描书籍条码，即可查看 Open Library 提供的书名、封面、作者、出版社、出版日期、页数和主题。最近查询仅保存在当前设备中；查询结果可复制或导出为 JSON。
- 应用类别：图书与参考资料
- 应用 ID：`com.deepbluelac.isbnlookup`

## 数据安全

- 不收集或共享个人数据。
- 相机仅在用户点击“扫描 ISBN”并授权后使用，用于读取书籍条码；不会上传或存储相机画面。
- 查询时会向 Open Library 发送 ISBN，用于获得图书资料。
- 最近查询记录仅保存在设备的应用本地存储中。

## 上架素材清单

- 512 x 512 PNG 应用图标。
- 1024 x 500 PNG 功能图。
- 至少两张手机截图：查询首页、扫描 ISBN、查询结果。
- 隐私政策公开 URL。发布前应将上述数据安全说明发布到可公开访问的网页。

## 发布步骤

1. 在 Play Console 创建应用，选择免费应用并启用 Play App Signing。
2. 生成并妥善保存上传密钥；不要提交到代码仓库。
3. 上传 `android/app/build/outputs/bundle/release/app-release.aab` 到内部测试轨道。
4. 完成数据安全、内容分级、应用访问权限和目标受众问卷。
5. 使用内部测试安装包验证扫描、网络请求、复制和 JSON 分享后，再提交正式审核。

## 本地构建

安装 JDK 17 和 Android SDK 后，设置 `JAVA_HOME`、`ANDROID_HOME`，并在项目根目录执行：

```powershell
npm run android:apk
npm run android:aab
```

构建产物分别位于 `android/app/build/outputs/apk/release/app-release.apk` 和 `android/app/build/outputs/bundle/release/app-release.aab`。首次构建前，必须把 `android/keystore.properties.template` 复制为 `android/keystore.properties`，并填写本机上传密钥信息。
