栖境 0.1.10

## 先看这里：你的电脑下载哪个？

| 你的电脑 | 应下载的安装包 |
| --- | --- |
| Windows 10/11，Intel 酷睿或 AMD 锐龙等常见电脑 | **Qijing-0.1.10-x64-Setup.exe** |
| Windows 10/11 ARM 电脑，例如骁龙 Snapdragon、Surface Pro X | **Qijing-0.1.10-arm64-Setup.exe** |
| 苹果 Mac，M1/M2/M3/M4 等 Apple 芯片 | **目前没有 macOS 安装包，不能使用上面的 Windows .exe** |
| 苹果 Mac，Intel 芯片，正在运行 macOS | **目前没有 macOS 安装包** |
| Linux 电脑 | **目前没有 Linux 安装包** |

Windows 不确定架构：打开“设置 → 系统 → 关于 → 系统类型”。显示“基于 x64 的处理器”选 x64；显示“基于 ARM 的处理器”选 ARM64。

**软件中的 Windows / macOS / Linux 是浏览器身份模拟选项，不代表提供这些系统的原生软件。Apple 芯片同样使用 ARM 架构，但 Windows ARM64 安装包不能安装到 macOS。**

普通用户只下载对应的 **Setup.exe**。`.yml` 和 `.blockmap` 是软件在线更新用的文件，`SHA256SUMS` 是校验清单，都不用安装。浏览器内核在软件内按需下载。

## 本版更新

- 修复 Chromium 的深浅色、减少动画、对比度和强制颜色被默认媒体模拟覆盖的问题；桌面使用内核配置，移动端保留显式模拟。
- 字体设置增加“英文 Windows 字体名单”便捷预设；随机指纹保留手动选择的字体策略和名单。
- 代理出口测试连续查询三次，提示 IP 轮换及不同时区，查询失败仍不回退直连。
- 硬件设置和环境诊断说明 CPU 架构保留限制，ARM 宿主的 Intel/AMD 型号记录不等于 x86 真机。
- CA/US 实际检测、Chrome/Firefox 及桌面/移动环境回归；README 和验证报告同步。代理轮换、多时区和硬件能力限制见报告，不承诺检测满分。
- Windows ARM64/x64，在线更新保留环境数据；浏览器内核仍按需下载。
