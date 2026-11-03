栖境 0.1.17

## 先看这里：你的电脑下载哪个？

| 你的电脑 | 应下载的安装包 |
| --- | --- |
| Windows 10/11，Intel 酷睿或 AMD 锐龙等常见电脑 | **Qijing-0.1.17-x64-Setup.exe** |
| Windows 10/11 ARM 电脑，例如骁龙 Snapdragon、Surface Pro X | **Qijing-0.1.17-arm64-Setup.exe** |
| 苹果 Mac，M1/M2/M3/M4 等 Apple 芯片 | **目前没有 macOS 安装包，不能使用上面的 Windows .exe** |
| 苹果 Mac，Intel 芯片，正在运行 macOS | **目前没有 macOS 安装包** |
| Linux 电脑 | **目前没有 Linux 安装包** |

Windows 不确定架构：打开“设置 → 系统 → 关于 → 系统类型”。显示“基于 x64 的处理器”选 x64；显示“基于 ARM 的处理器”选 ARM64。

**软件中的 Windows / macOS / Linux 是浏览器身份模拟选项，不代表提供这些系统的原生软件。Apple 芯片同样使用 ARM 架构，但 Windows ARM64 安装包不能安装到 macOS。**

普通用户只下载对应的 **Setup.exe**。`.yml` 和 `.blockmap` 是软件在线更新用的文件，`SHA256SUMS` 是校验清单，都不用安装。浏览器内核在软件内按需下载。

## 本版更新

- **地址栏默认Google搜索**：输入chatgpt等普通文字使用Google搜索，完整网址仍直接访问。
- 修复Chromix原No Search设置；首次通过原生设置添加Google和搜索建议，之后保留用户自己的搜索引擎选择。
- 修复Firefox/Camoufox原None搜索策略；普通与隐私窗口使用Google，原策略文件有备份，其他更新与隐私设置保留。
- 保留0.1.16随机60书签、默认扩展、内核下载队列和10秒提示；121项测试及生产构建通过。

Google可访问性取决于当前网络或代理。软件与内核分别更新；在线升级保留环境和登录数据。未签名Windows双架构安装包，暂无macOS/Linux原生安装包。
