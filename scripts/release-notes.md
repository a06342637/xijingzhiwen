栖境 0.1.4

- 新增 Firefox / Camoufox 测试版内核按需下载、校验、独立环境、Cookie 迁移及诊断。
- 新增 Windows / macOS / Linux 电脑身份入口，以及 iPhone / iPad / Android 布局模拟和主流屏幕尺寸。
- 新环境默认按代理出口匹配语言与时区，粘贴自动解析主机、端口和凭据；增加代理 DNS 与 UDP 路由限制。
- 修复移动触摸参数初始化、Firefox 窗口参数、Cookie 元数据和图形诊断兼容问题。
- 安装包仍为 Windows ARM64/x64，移动端属于 Chromium 模拟；Firefox 在 ARM64 上使用 x64 兼容运行。内核不包含在安装包。
- 在线更新保留环境数据。轮换代理的出口城市变化可能导致时区不一致，建议使用固定会话。
