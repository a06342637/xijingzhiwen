栖境 0.1.22

## 先看这里：你的电脑下载哪个？

| 你的电脑 | 应下载的安装包 |
| --- | --- |
| Windows 10/11，Intel 酷睿或 AMD 锐龙等常见电脑 | **Qijing-0.1.22-x64-Setup.exe** |
| Windows 10/11 ARM 电脑，例如骁龙 Snapdragon、Surface Pro X | **Qijing-0.1.22-arm64-Setup.exe** |
| 苹果 Mac，M1/M2/M3/M4 等 Apple 芯片 | **目前没有 macOS 安装包，不能使用上面的 Windows .exe** |
| 苹果 Mac，Intel 芯片，正在运行 macOS | **目前没有 macOS 安装包** |
| Linux 电脑 | **目前没有 Linux 安装包** |

Windows 不确定架构：打开“设置 → 系统 → 关于 → 系统类型”。显示“基于 x64 的处理器”选 x64；显示“基于 ARM 的处理器”选 ARM64。

**软件中的 Windows / macOS / Linux 是浏览器身份模拟选项，不代表提供这些系统的原生软件。Apple 芯片同样使用 ARM 架构，但 Windows ARM64 安装包不能安装到 macOS。**

普通用户只下载对应的 **Setup.exe**。`.yml` 和 `.blockmap` 是软件在线更新用的文件，`SHA256SUMS` 是校验清单，都不用安装。浏览器内核在软件内按需下载。

## 本版更新

- **本地标题库**：标题随软件打包，运行时不再通过代理或直连获取，启动不等待60个网站。已收集首页标题使用快照，尚未确认的标题显示域名。
- **随机组合**：macOS/Linux默认Chrome，Windows才提供其他Chromium品牌，Firefox保留自身品牌；已有不符合产品预设的品牌自动修正。
- **扩展完整显示**：修复指纹内核裁剪扩展弹窗，点击扩展图标打开原工具页面的独立可调窗口。已用google_gjx 1.6.8验证，保留原代码与本地存储。
- **视口兼容**：固定网页视口不再应用到扩展页面；普通网页继续使用原配置。
- 138项测试和实际Chromium/Firefox回归，保留永久删除、固定预设、书签、随机名称、平铺和在线更新。

未签名Windows ARM64/x64安装包，浏览器内核按需下载，在线升级保留环境和登录数据；暂无macOS/Linux原生安装包。
