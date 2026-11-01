# 栖境 Qijing

Windows 多环境浏览器管理软件。管理界面使用 Electron / React / TypeScript，网页使用独立的 Chromix 或 Firefox / Camoufox 浏览器。支持 Windows ARM64 和 x64。

## 使用

1. 安装对应架构的 `Qijing-0.1.6-arm64-Setup.exe` 或 `Qijing-0.1.6-x64-Setup.exe`。
2. 在“内核管理”下载或导入 Chromix。候选基线为 `155.0.8059.79`，下载验证 SHA-256、PE 架构和许可证目录。
3. 点击“新建环境”，选择内核、代理及高级配置，保存后启动。登录、浏览、下载由用户自己操作。
4. 菜单中可复制配置、归档、打开下载目录、迁移加密 Cookie、检查环境。复制配置生成新种子，不复制登录数据。

软件安装包不包含 Chromix 或 Python 运行环境；首次使用时下载。没有账号、云同步、脚本任务、定时任务、流程编辑器或 AI 操作入口。

## 已实现

- SQLite 环境保存，分组、标签、备注、搜索、卡片和列表视图，批量启停，独立浏览器数据目录和进程锁。
- Windows 系统加密保存代理密码；HTTP / HTTPS / SOCKS5 代理，认证、绕过规则和出口元数据测试。
- 统一登记并校验 UA / Client Hints、WebRTC、WebGL 名称、像素策略、音频、字体、编解码、显示、输入偏好、配额、Cookie、实验参数。
- 本地扩展副本管理；加密 Cookie 导入导出；环境专属下载目录。
- 内核版本固定、更新检查、校验下载、本地内核导入及升级数据副本。
- 按需下载带固定摘要的 Python / Playwright / Pillow 诊断组件；上游设备采集与记录校验、实测模式启动。
- 环境观测及内核图形对照，结果标记已验证、受限、未验证、不支持，并可导出 JSON。

## 验证边界

“已验证”只代表具体报告中的操作或字段在该内核、运行模式和机器上通过。单次环境检查不证明所有噪声路径、代理网络出口、站点检测结果或物理设备等价性。原生 GPU 不可用时保留报告缺项，不强行绕过 GPU blocklist。

本机为 Windows ARM64。ARM64 原生浏览器启停、并发重复启动拦截、Cookie / localStorage 持久化、Cookie 加密迁移、下载保存、MV3 扩展加载、HTTP 代理认证已有真实运行测试。Canvas 的上游固定种子诊断通过；本机 WebGL / WebGPU 上下文不可用，相关验收保留未验证或受限。x64 软件可在本机仿真测试，仍需 x64 原生机器验收。

实测设备记录必须通过上游严格校验，匹配内核摘要、宿主、运行模式和时效；没有可用 GPU 等完整证据时采集可能失败。字体名单需要真实字体；Windows 不自动安装 fontsDir 的字体。Widevine 不随软件分发。Canvas Bridge 需要自备服务，并会影响相关 renderer 沙箱。SOCKS5 UDP、完整 ClientRects 噪声和跨机器原生 Cookie 数据库不属于上游已完成能力。

升级现有环境通过“创建验证副本”完成，原目录保留。删除环境把浏览器目录移至用户数据目录中的 `trash`；下载文件保留。整个浏览器 profile 跨机器复制不能保证登录可用；可使用显式加密 Cookie 迁移。

安装包未配置代码签名证书。软件设置中的在线更新从本仓库 GitHub Releases 检查版本，按 ARM64 / x64 下载并校验，点击“安装并重启”完成更新。0.1.1 及更早版本需要手动安装新版本一次；0.1.2 可以在软件内更新。更新和覆盖安装保留环境数据；内核单独管理。主动卸载会清除软件数据目录（含环境、登录、内核、代理、配置、内置下载目录和回收目录）及更新缓存；用户自选的外部下载目录不属于软件数据目录。

## 开发

需要 Windows、Node.js 和 npm：

```powershell
npm ci
node node_modules/electron/install.js
npm run build
npm run test
npm start
npm run pack
```

默认 `npm run smoke` 使用独立测试数据目录，不修改正常用户环境。设置 `QIJING_SMOKE_BROWSER=1` 执行真实浏览器测试；`QIJING_SMOKE_FLOWS=1` 验证会话、Cookie、扩展、下载和代理认证；`QIJING_SMOKE_COMPONENTS=1` 验证组件下载和上游图形诊断。报告与截图位于 `.verification/`。

上游源码固定提交与依赖摘要分别保存在 `resources/upstream.json` 和 `resources/components.json`。`scripts/lock-components.mjs` 是维护者更新下载清单的工具，不在用户安装时运行。许可证保留于安装资源及 `dist/licenses/`。

## 默认指纹与创建

在软件设置中配置高级指纹与实验预设并保存，新建环境自动继承，已有环境不改变。新建支持 1–100 个环境，自动添加名称序号并生成独立种子与目录。一键随机会组合兼容的所选电脑系统硬件、屏幕、浏览器展示参数，并保留代理、语言、时区和实验选择；批量时可勾选每个环境分别随机。

网络代理支持选择已保存节点、手动填写，或粘贴 `主机:端口:用户名:密码` 等五种格式（也支持 HTTP/HTTPS/SOCKS5 URL）。存在歧义时选择具体格式再解析。保存后凭据使用 Windows 加密保管。

## 目录与发布

项目目录：`C:\Users\adminuser\Downloads\xijingzhiwen`。`npm run pack` 将版本产物写入相邻的 `xijing发行版本/<版本号>/`，并生成 `latest.yml`（x64）、`latest-arm64.yml`（ARM64）与 SHA256SUMS。

测试后执行 `node scripts/publish.mjs`，提交需已经推送到 main。该脚本先上传完整草稿 Release，确认附件后再公开。软件只读取公开 Releases，不需要用户配置 GitHub 凭据。

## 在线更新与后续发布

0.1.3 默认在启动后检查 GitHub 并后台下载新版，SHA-512 校验完成后提示“安装并重启”。可在软件设置中关闭自动检查下载，仍可手动检查。安装前保存并正常关闭浏览器环境；不在工作中突然重启。

源码和 Releases 固定使用 https://github.com/a06342637/xijingzhiwen 。更新不会自动替换 Chromix 内核。

后续版本：修改 `package.json` / `package-lock.json` 版本与 `scripts/release-notes.md`，提交并推送 main，再推送相同版本标签 `vX.Y.Z`（或手动运行 Build and publish Windows release）。GitHub Actions 在两种架构运行测试、构建、打包检查；附件完整且 SHA-256/SHA-512 正确后公开 Release。已公开版本不覆盖，修复使用新版本号。

## 0.1.4 引擎和设备环境

- Firefox 使用 Camoufox 158.0.1-beta.41（测试版），Windows 仅提供 x64 内核；ARM64 电脑通过 x64 兼容运行。内核按需下载，发行包约 1.32 GB，不进入软件安装包。支持原生 UA、系统展示、CPU、屏幕、语言、时区、WebRTC 地址及 WebGL 名称接入，实际能力见环境诊断。
- Windows、macOS、Linux 是当前 Windows 软件中的电脑身份预设，不提供 macOS/Linux 安装包。
- iPhone、iPad、Android 手机和平板为 Chromium 布局模拟，包含 CSS 屏幕尺寸、DPR、方向、视口、触摸和 UA；不是 Safari/WebKit 或真实移动系统，不能承诺真机指纹。
- 电脑屏幕包含 1366×768 至 5120×2880、2K、4K、5K、超宽屏；移动设备提供 13 组尺寸样本，并可在高级配置自定义。尺寸为 CSS/DIP 单位。
- 新环境默认开启代理出口匹配语言与时区；按实际出口覆盖手动值。直连不查询。关闭开关后使用手动设置；已有环境配置保留，旧软件默认预设的代理匹配开关迁移为开启。轮换代理会在不同连接换城市，启动时匹配无法保证后续时区一致，建议供应商提供固定会话。
- 代理粘贴默认自动识别 hostname:port:username:password，密码用 Windows 加密保存。代理启用时限制非代理 UDP，禁用 QUIC，并限制 Chromium 本地目的域名解析；火狐启用远端 SOCKS DNS、禁用预取和直连回退。本地诊断地址走回环。绕过规则和主动选择原生 WebRTC 策略会放宽路由限制。
- Firefox 不接入 Chromium 的固定种子 Canvas、音频隔离、实测设备和扩展目录；现版原生音频，固定配置重启保持。Cookie 加密迁移支持同引擎，含 Chromium 专属元数据的文件不能直接导入火狐。
- QIJING_SMOKE_DEVICES=1 检查移动端视口/DPR/触摸与三种 Firefox 电脑身份、重启稳定性。

## 0.1.5 维护检查

更新日志保存到数据目录 logs/software-update.log，不再依赖终端。更新验证脚本日志保存于 .verification/github-update/updater.log。关闭终端后验证脚本不会因 EPIPE 弹窗。

安卓型号在 UA 和 Client Hints 中一致，横屏/竖屏通过原生屏幕方向参数配置，编辑已有预设使用保存的方向。QIJING_SMOKE_DEVICE_MATRIX=1 与 QIJING_SMOKE_DEVICES=1 组合执行全部 13 组移动设备的横竖屏实测；QIJING_SMOKE_DEVICE_UI=1 检查预设显示与禁用控件。

## 0.1.6 硬件组合

新建环境和软件默认设置提供 CPU/显卡组合选择、搜索和品牌筛选。库含 50 个 CPU、63 个 GPU 型号、49 套搭配建议，按 Windows/macOS/Linux 筛选。NVIDIA GTX/RTX 20–50、AMD Radeon RX 500/6000/7000/9000、Intel UHD/Iris/Arc A/B、AMD 集显、Apple M 均有常见样本。不是市场全部型号清单，也不是采集的完整原生设备记录。

CPU 标签仅软件内记录，hardwareConcurrency 按型号的逻辑线程设置；deviceMemory 是限幅/离散浏览器值（常见为 8），组合 16/32/64GB 等为配置记录。火狐无 deviceMemory API。WebGL 名称格式按引擎和系统变化；图形能力、字体、指令和 WebGPU 仍受真实机器限制。软件渲染或受限 GPU 上下文可能不覆盖名称，不能据此保证真实电脑等价性。

硬件随机默认开启，一键或批量随机从当前系统组合选取；关闭后随机保留已选 CPU/内存/GPU。移动模拟不会混入电脑组合。配置保存后重启生效，查看环境诊断核对真实返回值。核数标签已改为逻辑线程数。

型号参考：NVIDIA/AMD/Intel/Apple 官方产品资料；WebGL 字符串是平台格式模板，不是型号设备 ID、驱动或完整 GPU 参数库。QIJING_SMOKE_HARDWARE=1 检查选择联动、两种内核的硬件启动及实际返回限制。
