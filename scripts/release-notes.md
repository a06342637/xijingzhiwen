栖境 0.1.11

## 先看这里：你的电脑下载哪个？

| 你的电脑 | 应下载的安装包 |
| --- | --- |
| Windows 10/11，Intel 酷睿或 AMD 锐龙等常见电脑 | **Qijing-0.1.11-x64-Setup.exe** |
| Windows 10/11 ARM 电脑，例如骁龙 Snapdragon、Surface Pro X | **Qijing-0.1.11-arm64-Setup.exe** |
| 苹果 Mac，M1/M2/M3/M4 等 Apple 芯片 | **目前没有 macOS 安装包，不能使用上面的 Windows .exe** |
| 苹果 Mac，Intel 芯片，正在运行 macOS | **目前没有 macOS 安装包** |
| Linux 电脑 | **目前没有 Linux 安装包** |

Windows 不确定架构：打开“设置 → 系统 → 关于 → 系统类型”。显示“基于 x64 的处理器”选 x64；显示“基于 ARM 的处理器”选 ARM64。

**软件中的 Windows / macOS / Linux 是浏览器身份模拟选项，不代表提供这些系统的原生软件。Apple 芯片同样使用 ARM 架构，但 Windows ARM64 安装包不能安装到 macOS。**

普通用户只下载对应的 **Setup.exe**。`.yml` 和 `.blockmap` 是软件在线更新用的文件，`SHA256SUMS` 是校验清单，都不用安装。浏览器内核在软件内按需下载。

## 本版更新

- 修复 Firefox 跨站导航后深浅色配置丢失：使用内核原生内容主题，覆盖新页面和导航替换的浏览上下文。
- 深色、浅色、原生重置，新页面与跨站导航共 18 次检查通过；CA/US 网站复测通过。
- 保留 0.1.10 的 Chromium 显示偏好、英文 Windows 字体名单、随机保留名单和代理轮换检查。
- 完整阅读检测页修复建议，并作不挂应用代理、临时 RTT 属性及 Firefox resistFingerprinting 对照。真实网络延迟、供应商出口轮换和硬件限制不能以改页面数字解决，详见验证报告。
- Windows ARM64/x64；82 项测试及生产构建通过，在线更新保留环境数据。浏览器内核按需下载。
