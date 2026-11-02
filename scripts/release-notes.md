栖境 0.1.12

## 先看这里：你的电脑下载哪个？

| 你的电脑 | 应下载的安装包 |
| --- | --- |
| Windows 10/11，Intel 酷睿或 AMD 锐龙等常见电脑 | **Qijing-0.1.12-x64-Setup.exe** |
| Windows 10/11 ARM 电脑，例如骁龙 Snapdragon、Surface Pro X | **Qijing-0.1.12-arm64-Setup.exe** |
| 苹果 Mac，M1/M2/M3/M4 等 Apple 芯片 | **目前没有 macOS 安装包，不能使用上面的 Windows .exe** |
| 苹果 Mac，Intel 芯片，正在运行 macOS | **目前没有 macOS 安装包** |
| Linux 电脑 | **目前没有 Linux 安装包** |

Windows 不确定架构：打开“设置 → 系统 → 关于 → 系统类型”。显示“基于 x64 的处理器”选 x64；显示“基于 ARM 的处理器”选 ARM64。

**软件中的 Windows / macOS / Linux 是浏览器身份模拟选项，不代表提供这些系统的原生软件。Apple 芯片同样使用 ARM 架构，但 Windows ARM64 安装包不能安装到 macOS。**

普通用户只下载对应的 **Setup.exe**。`.yml` 和 `.blockmap` 是软件在线更新用的文件，`SHA256SUMS` 是校验清单，都不用安装。浏览器内核在软件内按需下载。

## 本版更新

- 新环境默认直连，Chromium/Firefox 启动显式关闭继承的系统代理；需要代理时在创建页粘贴整条信息即可。
- 修复 hostname:port:username:password 中密码含 @ 时自动解析失败；五种格式与 URL 继续支持，歧义不静默猜测。
- 一键/批量随机默认“一致性优先”：真实内核品牌、原生 GPU、无触摸电脑布局，默认保留原生 Canvas/音频；手选策略仍保留。硬件组合模式继续可选。
- CA/US 推荐模式启动自动匹配语言、时区及英文 Windows 字体名单；已有环境配置保留，关闭自动匹配后使用手动参数。诊断附带实际启动配置。
- BrowserLeaks、Sannysoft、CreepJS 实际测试及直连 DNS 对照。用户代理有多国 DNS、TCP 系统特征和轮换出口问题，未宣称安全或全部满分。
- 91 项测试、生产构建、环境/随机/代理/Cookie/扩展及两引擎身份回归通过。Windows ARM64/x64，内核按需下载，在线更新保留数据。
