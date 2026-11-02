# 栖境 Qijing

Windows 多环境浏览器管理软件。管理界面使用 Electron / React / TypeScript，网页在独立的 Chromix（Chromium）或 Camoufox（Firefox）中打开。本地单用户使用，不包含网站自动化、脚本任务、定时任务或 AI 操作。

[下载最新版本](https://github.com/a06342637/xijingzhiwen/releases/latest) · [验证报告](VERIFICATION.md) · [修复记录](BUGFIXES.md) · [第三方许可证](THIRD_PARTY_NOTICES.md)

## 安装与开始使用

1. 下载对应电脑架构的安装包：Windows ARM64 使用 `Qijing-0.1.7-arm64-Setup.exe`，常见 Intel/AMD 电脑使用 `Qijing-0.1.7-x64-Setup.exe`。未配置代码签名证书。
2. 在“内核管理”下载 Chromix 或 Firefox / Camoufox，或导入完整本地内核目录中的可执行文件。软件安装包不包含浏览器内核；诊断 Python 组件也按需下载。
3. 新建环境，选择引擎、系统/设备、内核、硬件参数与代理，保存后点击“启动环境”。网页由用户自己操作。
4. 每个环境有独立数据目录和登录数据。配置修改关闭后保存，重新启动生效。复制只复制配置，生成新种子，不复制 Cookie 或本地存储。

Chromix 候选基线 `155.0.8059.79`；Firefox 候选 `158.0.1-beta.41`（Camoufox 测试版）。下载核对 SHA-256、Windows PE 架构和许可证文件；没有校验信息不启用。软件与内核分开更新，环境固定绑定具体内核版本。

## 功能

| 模块 | 当前范围 |
| --- | --- |
| 环境 | 新建、编辑、复制、分组、标签、备注、搜索、归档；卡片/列表、批量创建与启停、重复启动拦截 |
| 浏览器 | 独立进程与数据目录，启动/关闭/进入，多个启动页面、环境下载目录 |
| 登录数据 | Cookie/localStorage 持久化，加密 Cookie 导入导出；同引擎迁移优先，不能复制数据库保证跨机登录 |
| 代理 | HTTP、HTTPS、SOCKS5，认证、绕过、出口测试、粘贴自动解析；密码用 Windows 系统加密保存 |
| 配置 | UA、系统、WebRTC、WebGL 名称、CPU 逻辑线程数、屏幕/DPR、语言/时区、输入偏好、字体/媒体/存储及实验参数；按内核限制启用 |
| 硬件 | 50 个 CPU、63 个 GPU 型号、49 套组合；搜索、显卡品牌筛选、单选、内存记录，一键/批量随机 |
| 内核/诊断 | 校验下载、本地导入、绑定版本、升级验证副本、上游设备记录、环境观察和 JSON 报告 |
| 软件更新 | GitHub Releases 双架构清单，自动检查下载、手动安装并重启，升级保留数据 |

## 引擎、系统与设备边界

| 环境 | 支持方式与限制 |
| --- | --- |
| Windows 软件 | 提供 ARM64/x64 安装包；无 macOS/Linux 原生安装包 |
| Windows/macOS/Linux 电脑身份 | 两种引擎中的展示预设，不替换真实宿主系统、字体栅格器或硬件 |
| Firefox | Camoufox Windows 仅 x64，ARM64 电脑使用兼容运行；不接入 Chromix 实测设备、Canvas 固定种子、音频隔离或 Chromium 扩展目录 |
| iPhone/iPad/Android | Chromium 的布局、屏幕、方向、DPR、触摸、UA/Client Hints 模拟；不是真实 Safari/WebKit 或移动系统 |
| 屏幕 | 13 组移动尺寸样本和 1366×768 至 5120×2880 电脑尺寸，包含 2K/4K/5K/超宽屏；CSS/DIP 单位，可自定义 |

只有部分特性在特定内核与硬件实测通过，不承诺所有网站识别、真机等价或防关联效果。诊断页只用于核对固定配置，不提供用户脚本执行入口。

## CPU / 显卡与一键随机

硬件选择在“新建环境”和“软件设置 → 新建环境的默认指纹”中。支持 NVIDIA GTX/RTX 20–50、AMD Radeon RX 500/6000/7000/9000、Intel UHD/Iris/Arc A/B、Ryzen、Core/Core Ultra、AMD 集显与 Apple M 的常见样本。不是全部市场型号清单，也不是完整原生设备采集。

- CPU 名称仅在软件中记录；网页主要读取 `navigator.hardwareConcurrency` 的逻辑处理器数，不是物理核心数，也不改变指令集和真实性能。
- 组合内存 16/32/64GB 等为记录，`deviceMemory` 为离散/限幅浏览器值（常见为 8）；火狐没有该 API。
- 显卡配置修改 WebGL Vendor/Renderer 名称，不能替换真实显卡、驱动、算力、GL 扩展、像素或 WebGPU。原生软件渲染/不可用上下文可能不覆盖名称。
- 组合按系统筛选，不随机现代 RTX 到 macOS，Intel/AMD 集显不跨 CPU 平台。单选 CPU/GPU 会保留本次选择，只调整不兼容的另一侧。
- 硬件随机默认开启；一键/批量随机从当前系统组合中选择。关闭后保留手选硬件，移动模拟保持自身配置。
- 手动修改线程数或 WebGL 参数会清除旧型号记录；自定义组合明确显示，不误标为原生 GPU。

手动 UA 可能与 Client Hints 不一致。切换引擎会清除上一引擎的手动 UA 和版本；已有环境不能直接跨引擎改写登录目录，请新建。

## 代理与语言时区

默认自动识别 `hostname:port:username:password`，也支持 `用户名:密码@主机:端口` 等五种格式及 HTTP/HTTPS/SOCKS5 URL。歧义格式需要选定格式后解析；协议不随凭据猜测，未带协议使用当前选定协议。

新环境默认打开“按代理出口匹配语言与时区”：有代理时在启动前查询实际出口，覆盖手动语言和时区；关闭开关后使用手动值。直连不查询，查询失败中止启动；已有环境保留自己的配置。多时区国家依据启动时的出口城市，轮换代理后续 IP 变化可能导致不一致，建议供应商提供固定会话。

代理默认限制非代理 UDP；Chromium 禁用 QUIC 并限制目的域名本地解析；Firefox 启用远端 SOCKS DNS、关闭预取和直连回退。本地诊断走回环。手动绕过和放宽 WebRTC 策略会改变路由限制。网关域名仍需由本机解析以建立连接。

此前 CA 代理测试未出现同样的本机直连 DNS，STUN 检查未返回可见 ICE 地址；供应商 DNS 跨地区、出口轮换，不能保证加拿大 DNS、所有流量走代理或所有网站无泄露。WebRTC 地址展示也不等于通信路由。

## 默认设置、更新与数据

默认指纹只用于新建，已有环境保留自己的参数。每次批量最多 100 个环境，独立种子和目录；多个环境应留空下载路径使用各自目录。

启动后默认检查 GitHub 并下载对应架构新版，SHA-512 通过后提示“安装并重启”。可关闭自动检查，手动点击“检查更新”。安装前正常关闭环境，准备期间出错取消此次安装；不会在用户工作中直接重启。0.1.1 及更早版本需手动安装一次。

在线更新/覆盖安装保留配置与环境；主动卸载清除软件数据目录和更新缓存，用户自选外部下载目录不清除。删除单个环境会把浏览器目录移到数据目录 `trash`，下载文件保留。内核升级通过数据副本检查，原环境保留。

日志位于数据目录 `logs/software-update.log`，不依赖终端。不要公开代理密码、Cookie、完整环境目录或个人诊断数据。

## 验证与已知限制

0.1.7 本轮：62 项测试、TypeScript/生产构建、硬件 UI、启动/停止/诊断竞争、会话、Cookie、下载、扩展和代理认证回归通过；具体证据与发布状态见 [VERIFICATION.md](VERIFICATION.md)。

本机 Windows ARM64 的 Chromium 图形上下文受限，相关 WebGL/WebGPU 不标“已验证”，没有绕过 GPU blocklist。火狐代表组合 WebGL 1 名称曾实测匹配，但不证明完整 GPU 或像素能力一致。原生 x64 GPU 全量检查仍需对应硬件，不能用构建通过代替。

实测设备记录遵守上游摘要、宿主、模式及时效校验。字体、媒体、Widevine、实验项受平台/内核限制；Widevine 不分发。Canvas Bridge 需要自备服务并可能影响沙箱。SOCKS5 UDP、完整 ClientRects 扰动、完整虚拟 GPU、跨机器原生 Cookie 数据库不属于当前交付能力。

## 开发和发布

```powershell
npm ci
node node_modules/electron/install.js
npm test
npm run build
npm run smoke
npm run pack
```

`npm run smoke` 使用隔离测试数据。可设置 `QIJING_SMOKE_BROWSER=1`、`QIJING_SMOKE_FLOWS=1`、`QIJING_SMOKE_RACES=1`、`QIJING_SMOKE_HARDWARE_UI=1`、`QIJING_SMOKE_HARDWARE=1`、`QIJING_SMOKE_DEVICE_UI=1`；`QIJING_SMOKE_DEVICES=1` 配合 `QIJING_SMOKE_DEVICE_MATRIX=1` 验证 13 组设备横竖屏。报告/截图在 `.verification/`，不上传用户数据。

源码目录 `C:\Users\adminuser\Downloads\xijingzhiwen`；产物目录相邻 `xijing发行版本/<版本号>`。上游固定提交与诊断组件摘要位于 `resources/upstream.json`、`resources/components.json`，第三方许可证保留在安装资源及 `dist/licenses/`。

后续更新修改版本号、release notes、README 和验证报告，提交 main 并推送 `vX.Y.Z`。GitHub Actions 分别构建/检查 ARM64 与 x64，生成独立 `latest-arm64.yml` / `latest.yml`；`scripts/publish.mjs` 完整上传校验草稿后公开，不覆盖已发布二进制。
