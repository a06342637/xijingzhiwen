# 栖境 0.1.12 多检测站、随机策略与默认直连

日期：2026-11-02，Windows ARM64；Chromix 155.0.8059.79 ARM64 与 Camoufox 158.0.1-beta.41 x64 兼容运行。用户 CA/US 凭据仅临时本地，未进入仓库。

- 通过应用 worker 原启动链路，把整条代理自动解析为主机/端口/认证，实际访问 BrowserLeaks IP/WebRTC/JavaScript、Sannysoft 和 CreepJS；覆盖 CA Chromium、US Firefox，并追加 US Chromium、CA Firefox 和不挂应用代理对照。证据 `.verification/multi-site-012*`。没有改网站评分或输出。
- BrowserLeaks 公网识别 CA/US；WebRTC 页面显示 No Leak，无可见本地/公共 ICE 地址。页面 IPv6 地址与本机直连地址不同；部分 IPv6 测试连接失败，不当作通过。JS/HTTP UA 和语言分别对应引擎与 en-CA/en-US，Worker 在 CreepJS 读取的语言/时区/核心数与页面一致。
- 完整 DNS：US Chromium 48 Servers / 8 ISP / 19 Locations，包含德国；CA Firefox 72 Servers / 5 ISP / 13 Locations，包含美国、日本、墨西哥、德国等。直连 Chromium 3 Servers / 1 ISP / 1 Location，仅 Oracle 新加坡，与本机公网一致。没有观察到代理报告同样的本机 DNS，仍不宣称无泄漏；多国 DNS/连接轮换是这两条代理必须解决的问题。
- TCP/IP 服务端指纹在代理连接判 Android，直连判 Windows，UA 保持 Windows。TLS/HTTP2 属于实际引擎，不能用修改 JS 属性修复代理 TCP 握手。建议供应商提供固定会话/地区 DNS/原生出口传输，未擅改认证会话格式。
- Sannysoft Chromium 的 webdriver/advanced、iframe、插件类型、屏幕和主要扫描项通过；Firefox 的 Chrome 对象项显示 missing，是引擎差异，未伪造 Chrome。该站故意空参数调用原生 API 的页面错误保留，不当成软件故障。
- CreepJS 普通组合模式可观测 Canvas rgba 扰动和真实 GPU/架构限制；增加一致性优先，保留原生 GPU/真实内核品牌，电脑触摸点 0，默认像素/音频原生，显式策略保留。最终 CA Chromium 报告不再显示 rgba noise，headless=0%；US Firefox like-headless/headless/stealth 均为 0%。部分 like-headless 特征、字体/系统栅格、软件渲染能力仍受真实宿主限制，分数不作安全保证。证据 `.verification/recommended-012-final/`。
- 默认生成不绑定代理，Chromium 显式 no-proxy-server / Firefox network.proxy.type=0。需要时创建页一次粘贴；自动解析新增密码含 @/冒号组合覆盖。推荐 CA/US 自动匹配同步使用真实英文字体名单，保留手动名单、匹配关闭与已有配置。effectiveValues 附在诊断中，不写回用户保存配置。
- 试验 Firefox DoH-only：初次代理网关无法解析；排除网关本地域名解析后可访问，DNS 测试仍返回约 70 个多国解析器。未把未解决问题的设置接入默认；没有直连回退、改系统 DNS 或关闭网络安全限制。证据 `.verification/multi-site-012-doh*`。
- 91 项测试与 TypeScript/生产构建通过；隔离 smoke 的默认直连选项/推荐策略、代理粘贴、默认预设/随机/批量、真实 Chromium 启停、Cookie/localStorage、下载、扩展、HTTP 认证代理，以及两引擎三种桌面身份、iPhone/iPad/Android 代表模式通过。证据 `.verification/random-consistent-012/smoke.json`。新字段对旧普通/实测模式兼容，旧环境不自动改为推荐模式。
- GitHub Actions Run 41455064875：ARM64/x64 原生构建、91 项测试、安装版启动、完整附件校验与发布通过。v0.1.12 已公开；真实 updater 分架构下载并通过 SHA-512（`.verification/github-update/result.json`）。测试结束无遗留浏览器/updater 进程，用户代理凭据不入仓库。本轮没有重复实际安装迁移链路，不扩展旧安装证据的版本范围。
- 软件默认策略强调一致性和兼容；无法以有限页面验收证明匿名、安全或所有网站满分。

# 栖境 0.1.11 检测站建议复查与 Firefox 主题修复

日期：2026-11-02，Windows ARM64；Chromix 155.0.8059.79 ARM64，Camoufox 158.0.1-beta.41 x64 兼容运行。

- 用相同 CA/US 代理重新启动两引擎的随机环境，先选真实英文 Windows 字体名单再随机，名单保留。四组页面综合识别均为目标国家，语言与 HTTP 请求头分别为 en-CA/en-US；已返回 DNS 位置在目标国，STUN 没有可见候选。CA Chromium 该次 C，US Chromium 与修复前两组 Firefox 为 D，差异主要包括跨城市出口对应不同时区。证据 `.verification/region-recheck-20261102/`。分数波动不作为全部修复通过。
- 新发现 Firefox 本地深色通过、真实跨站却读到浅色；网页原生 matchMedia 和即时读值均确认，不是仅页面文字缓存。临时重新设置页面深色会变真，但跳到 example.com 和返回均变假。此前 0.1.10 的同站检查不足，修正此前边界描述。
- 加入 Gecko 原生 `layout.css.prefers-color-scheme.content-override`：深色 0/浅色 1/原生 2。修复后 CA 检测页、跳到另一个站点和返回均为 dark；US 检测页也为 dark/reduced。语言/字体/DNS/WebRTC 项通过，仍有供应商多出口、额外往返延迟与固定指纹可识别的提示。证据 `.verification/firefox-theme-fixed/` 与 `.verification/firefox-theme-final/`。
- 新增真实火狐深/浅/原生 3 模式 × 初始/新页 × 往返跨站，共 18 次原生页面 CSS 读值检查通过（`.verification/firefox-appearance-011-fresh/firefox-appearance.json`）。首轮测试用 window 私有属性受隔离世界影响，改为页面原生脚本写 DOM；重复使用同一测试目录曾触发上游 startup 超时，因此验收使用每模式独立目录，不掩盖该次失败。无需新下载浏览器内核。
- 完整读取检测页 `.ck-tip` 建议与公开前端源码，保存在 `.verification/region-advice-review/`。网络延迟项以 `performance.getEntriesByName` 的 responseStart-requestStart 取多次最小值，与 `/api/me` 的 Cloudflare clientTcpRtt 对照；网页建议选择更近/更低延迟节点。
- 临时仅把 navigator.connection.rtt 改为 20ms：设备网络行显示 20ms，但实际延迟项仍为约 342ms 对 42ms，继续警告。没有修改 Resource Timing/Date.now/服务器响应或检测页分数，也没有把无效 rtt 伪装加入软件。证据 `.verification/latency-fake-property/`。
- 临时开启网页建议的 Firefox resistFingerprinting：指纹可追踪项变通过，但时区被覆盖为 Atlantic/Reykjavik（UTC）、屏幕/DPR/GPU 也改变，失去原 CA 身份一致性。测试撤销，未作为默认发布；证据 `.verification/firefox-rfp-advice/`。
- 不挂应用代理的 Chromium 对照：当前宿主公网/DNS 在新加坡，多个服务显示同一出口，HTTP/3/ECH 可用，未显示 DNS 跨国；原生 zh-CN 字体/语言仍被判断中国，与出口不符。只证明当前路径对照，不称本机网络没有其他中间层。证据 `.verification/region-direct-compare/`。
- 82 项测试、TypeScript/生产构建和隔离桌面烟测通过；设置/字体/随机/批量创建/Chromium 启停及上述火狐主题验收通过。凭据不入仓库，测试修改仅在临时 worker 生效。
- GitHub Actions Run 41449337133 的 ARM64/x64 原生构建、82 项测试、安装包启动、附件校验与完整发布通过。v0.1.11 已公开；真实 updater 分别下载两种架构并通过 SHA-512（`.verification/github-update/result.json`）。本轮未重复实际安装迁移验证；此前安装证据保持其版本范围。测试结束无遗留浏览器或 updater 进程，旧公开二进制不替换。

# 栖境 0.1.10 CA / US 代理与指纹实测

日期：2026-11-02，Windows ARM64；Chromix 155.0.8059.79 ARM64/x64（x64 为兼容运行），Camoufox 158.0.1-beta.41 x64。用户凭据仅本地临时文件，不进入报告或仓库。

- 实际使用用户给定 CA/US HTTP 认证节点启动随机环境，访问 who.1ms.dog，读取页面报告并保存截图。本机原生窗口工具初始化失败，改用应用开发验收接口读取浏览器页面和本地诊断；未声称完成原生窗口截图检查。页面结果保留在 `.verification/region-audit/`。
- 初始 Chromium CA 页：公网加拿大、en-CA、DNS 加拿大、WebRTC 无公共/本地候选；启动元数据为 America/Edmonton，网站出口为 America/Toronto。US 页：公网美国、en-US、DNS 美国、WebRTC 无候选；启动时 New_York，网站出口 Chicago。两页看到约 7 个出口，字体列表导致 US 综合启发式推断中国。此结论不是 IP 国家错误。
- 发现 Chromium 选深色/减少动画却返回浅色/无偏好。桌面取消 Playwright 默认媒体模拟后，真实内核深色、减少动画和高对比度均与配置一致；网站 CA 重测显示 dark/reduced。移动显式媒体模拟保持原配置。证据 `preferences-real.json`、`CA-chromium-fonts-dark.json`。
- 英文 Windows 字体名单实测：字体采样从 18/46 降为 10/46，中文系统提示消失；US x64 Chromix 页综合推断美国（B，DNS 该次未知），CA Chromium/Firefox 页综合推断加拿大（C）。名单只限制本机真实字体，不下载或修改系统，不证明所有文字/字体通道已隔离。再次随机保留 fontPolicy/fontWhitelist。
- Firefox US 原生字体页公网/DNS 美国、en-US、时间偏移与该次出口一致，中文字体启发式仍提示中国；CA 英文名单页公网/DNS 加拿大、en-CA、Toronto 时区一致。代表 RTX 3070/5080 名称在 WebGL 1 返回，WebGL 2/WebGPU 不标已验证。深色/减少动画在独立初始页、新页和二次导航实测一致；个别网站文本缓存不得替代实际 CSS 返回值。
- CA/US 连续三次元数据查询均得到不同 IP 和不同时区；新增代理测试结果明确提示轮换。一次临时连接错误报失败，没有直连回退；重新测试成功。证据 `proxy-samples.json`。软件未猜测或擅改供应商会话认证格式。
- STUN 实测无可见 ICE 候选；检测页已返回的 DNS 位于目标国，但一次 US DNS 查询未知。检测页偶有 IPv6 或外部服务连接失败，部分 IPv6 地址为代理出口、与本机 IPv6 不同。没有据此宣称所有 DNS/UDP/流量绝无泄漏。HTTP/3/UDP 与 ECH 限制保持原设计；代理往返延迟和出口切换不能靠身份名称消除。
- ARM 宿主的 ARM64/x64 Chromix 都实际返回 Client Hints architecture=arm；不能把 Intel/AMD 名称记录宣称 x86 真机。当前宿主 WebGL/WebGPU 不可用，保留真实限制，没有绕过 GPU blocklist 或模拟完整 GPU。诊断添加架构实际值与提示。
- 81 项测试、TypeScript/生产构建通过。隔离桌面 smoke 的设置保存、字体按钮、代理粘贴、随机/批量创建、Chromium 启停/诊断、Chrome/Firefox 三种桌面系统身份及 iPhone/iPad/Android 代表环境通过；不等于 macOS/Linux 原生软件验收。
- 最终 0.1.10 界面复验：新建环境选择英文字体名单再一键随机，名单保留，批量创建通过。真实 Browsers → worker → SDK 的 CA/US 出口测试均返回轮换/时区提示，结束后 worker 清理；证据 `region-final-smoke/smoke.json` 和 `region-audit/worker-proxy-real.json`。
- GitHub Actions Run 41445010319：ARM64/x64 原生构建、81 项测试、安装包启动、完整摘要和发布全部通过。v0.1.10 已公开；真实 NsisUpdater 分架构下载并通过 SHA-512（`.verification/github-update/result.json`）。本轮未再次执行安装迁移链路，沿用前次 0.1.9 在线安装实测证据。测试结束无遗留浏览器/updater 进程。
- v0.1.10 和截图中的 v0.1.9 公开版本简介已增加电脑/安装包对照：Windows Intel/AMD 选 x64，Windows 骁龙等 ARM 选 ARM64；Apple M/Intel Mac 与 Linux 均无原生安装包，软件内系统选择只是浏览器身份模拟。只修改简介，不替换已公开二进制。README 和后续 release-notes 模板同步。

# 栖境 0.1.9 可靠性深入检查

日期：2026-11-02，Windows ARM64；Firefox x64 Camoufox 兼容运行。

- 74 项测试通过。新增复制目标所有权、原目录/嵌套目标拒绝、非标准 RAM 映射、诊断 token/来源/格式、更新并发检查最终结果等测试。TypeScript 与生产构建通过。
- 复制目标已存在时返回错误且保留目标内容；同目录与源目录内目标拒绝。正常复制与运行锁过滤回归通过；只清理本次独占创建的目录。
- 默认设置 UI 模拟延迟保存期间 fieldset 和参数输入锁定，完成后恢复并正确显示成功。延迟仅在隔离 smoke 指定条件生效。
- 真实 Chromium 会话、Cookie、独立数据、下载、扩展、HTTP 认证代理、启动/诊断/停止竞争、硬件 UI、模式切换检查通过。
- 新诊断页在两引擎 Windows/macOS/Linux 及代表移动端通过；使用独立 token 地址和 Host/Origin/内容校验；页面脚本在浏览器原生世界读取结果。用户离开检查页后不会被清理强制回到空白。
- 真实升级副本检查使用隔离内核标识验证复制/诊断流程，原目录数据与绑定保留，副本带原数据标记；并非不同 Chromium 版本的数据兼容性证明。
- 最终 0.1.9 组合回归再次通过：默认继承、一键/批量随机、并发启停、硬件/设备 UI、预设保存锁定与升级副本流程。验收脚本等待默认设置保存完成，避免人工延迟条件下过早读值。
- GitHub Actions Run 41419787591：双架构原生构建、74 项测试、安装包启动、完整附件摘要及发布通过。v0.1.9 已公开，发布后真实 updater 分别下载 ARM64/x64 并通过 SHA-512；无遗留验证进程。README 与修复说明同步。
- 物理 GPU、WebGPU、真机等价、所有网站及供应商代理边界保持原说明，没有修改用户正常环境或系统设置。

## 2026-11-02 在线更新专项复验

- 真实 `NsisUpdater` 使用 GitHub provider 检查公开 v0.1.9，分别下载 ARM64/x64 对应安装包并通过 SHA-512；测试主动断开输出管道，下载仍完成。证据：`.verification/github-update/result.json`。
- ARM64 独立安装目录以 0.1.2 为基线，执行真实 `quitAndInstall(true,false)` 静默升级到 0.1.9；SQLite 与数据标记保留，升级后安装版隔离运行检查全部通过。为保持测试数据目录隔离，此段显式重开程序。证据：`.verification/update-install-0.1.9/result.json`。
- 自动重启另行执行真实 `quitAndInstall(true,true)`：更新适配器报告旧版本 0.1.8、实际安装版为 0.1.9，重新安装公开 0.1.9 后由 NSIS 自动启动窗口。用安装版自身接口提前保存测试环境和关闭自动更新设置；安装后数据库、浏览器目录标记保留。随后重开同一安装版，通过自身接口确认原环境 ID/名称及设置仍可读取，手动检查 GitHub 返回“当前已是最新版本”。此段验证安装与重启链路，不作为实际从 0.1.8 升级的数据迁移证明。证据：`ipc-layout-restart-result.json` 与 `post-update-data-result.json`，位于上述验收目录。
- 正常 AppData 测试仅在确认原目录不存在后使用；完成后测试程序退出，含测试标记的数据归档至 `.verification`，默认目录恢复原先不存在状态。没有使用用户环境和凭据。
- 新增回归检查确保浏览器关闭准备完成后调用 `quitAndInstall(true,true)`；75 项本地测试与 TypeScript/生产构建通过。软件运行代码未变更，公开安装包未替换。
- 本轮 x64 覆盖真实检查、下载和校验，没有执行 x64 原生在线安装、自动重启或数据迁移测试；此前双架构 CI 安装启动证据仍见上文。

以下为历史版本证据。

# 栖境 0.1.8 深入随机与保存审计

日期：2026-11-02，Windows ARM64；Firefox x64 兼容运行。

- 70 项测试通过，包括两引擎/三系统连续随机、全部移动预设重复随机、noise opt-out、原生对照、模式/内核切换、代理并发保存顺序、加密失败恢复、半成品 Cookie 防护、IPv6 scope 校验。
- 同一代理三个并发保存：延迟第一轮加密、更换密码、随后只编辑名称，最终新密码与名称保留；保存期间删除拒绝。失败首请求不会阻塞后续有效请求。
- Electron 实际 UI：人工延迟隔离随机 RPC，编辑区锁定后恢复；关闭扰动保持 native，普通/实测切换使用匹配内核。硬件单选与旧预设联动检查通过。人工延迟仅在指定 smoke 模式生效。
- 真实 Chromium 会话、Cookie/localStorage、加密迁移、下载、MV3、HTTP 认证代理、启停/诊断竞争及失败锁清理通过。
- Firefox 真实窗口重启、Cookie/localStorage 保留、加密导出和空目录导入通过；导出目标不可覆盖，临时文件清理测试通过。
- 全量设备矩阵再次通过：13 组移动设备横竖屏 26 项，两种浏览器 Windows/macOS/Linux 6 项，共 32 项；对比屏幕、视口、DPR、方向、UA、型号和触摸，火狐身份重启稳定。最终 0.1.8 组合回归通过默认继承、一键/批量随机、代理、硬件和深度 UI；测试等待锁定区恢复后才提交。
- GitHub Actions Run 41415857994：ARM64/x64 原生构建、70 项测试、安装包启动、摘要校验和完整发布全部通过。v0.1.8 已公开，真实 updater 分架构下载并通过 SHA-512，测试完成无遗留进程。README 已更新。
- GPU/WebGPU 原有硬件限制、移动布局模拟非真机、轮换代理/DNS 供应商限制不因本轮检查取消。未修改正常用户数据或系统设置。

以下为历史版本证据。

# 栖境 0.1.7 持续复查

日期：2026-11-02，Windows ARM64。

- 62 项测试通过；新增单选 CPU/GPU 保留选择、CPU 单独预设保持原生 GPU、手动参数清理型号、跨引擎 UA/版本清理、安装准备期间错误取消等回归。TypeScript 和生产构建通过。
- Electron 隔离界面：旧 Intel 集显环境选择 AMD CPU 后保留 AMD；自定义内存显示“自定义硬件”；编辑线程数清除旧 CPU 型号。横屏与禁用字段检查通过。
- 真实 Chromium Cookie/localStorage、独立目录、加密迁移、下载、MV3、HTTP 认证代理、启动/诊断/停止竞争和失败锁清理通过。
- Firefox 真实启动、Cookie/localStorage 重启保留与加密迁移再次通过。
- GitHub Actions Run 41409480717：ARM64/x64 原生构建、62 项测试、安装包启动与附件摘要发布全部通过。v0.1.7 已公开，真实 updater 分架构下载并通过 SHA-512，断开的终端管道没有中断更新。README 已按当前版本重写。
- 未操作正常用户环境或 Windows 设置。硬件真实 GPU/网站兼容和轮换代理限制不因测试通过而取消。

以下为历史版本证据。

# 栖境 0.1.6 硬件与创建复查

日期：2026-11-02，Windows ARM64。Firefox 使用 x64 Camoufox 158.0.1-beta.41。

- 57 项测试通过，覆盖 50 个 CPU、63 个 GPU 的所有已提供组合在两引擎/三系统的配置校验、线程映射、随机/批量、平台不兼容组合拒绝、引擎切换格式与关闭随机保留手选配置。生产构建通过。
- 核对 NVIDIA RTX 50 官方页、AMD Radeon 9000 官方系列页、Ryzen 9800X3D 与 Apple Mac 官方资料。预设为名称/线程配置模板，未把模型标签当作全套原生硬件采集。Intel 官方部分页面在当前网络 403，型号参数仍需逐项运行实测。
- Chromium/Firefox 的 Windows/macOS/Linux 环境创建、启动、诊断复查通过；iPhone/iPad/Android 模拟与原有设备矩阵校验通过。
- 新建/默认设置的硬件组合选择 UI 联动通过；CPU/GPU/内存记录保存到配置，启动时经共享校验，移动端排除桌面硬件预设。
- 10 个代表性真实窗口硬件检查：NVIDIA RTX 5070 Ti、AMD RX 9070 XT、Intel Arc B580、Apple M4、Linux RTX 4060，分别在两引擎启动。CPU 逻辑线程数均匹配；Chromium deviceMemory 限幅到 8。
- Firefox 的 5 个代表组合 WebGL 1 Vendor/Renderer 与设置匹配；仅名称读回通过，不证明驱动参数/像素/算力/真实设备一致。WebGL 2/WebGPU 保持实际观察与限制。
- 本机 Chromium 图形上下文不可用/受限，5 个代表组合没有标为 WebGL 已验证，没有绕过 GPU blocklist。名称配置和启动成功不能证明这个机器完成图形覆盖验收。需要可用 GPU 的 Windows x64/ARM64 机器进一步实测。
- 会话持久化、加密 Cookie、下载、MV3 扩展、HTTP 认证代理、批量 UI、默认预设继承回归通过。
- GitHub Actions Run 41326234085：ARM64/x64 原生构建、57 项测试、安装包 smoke 和完整附件校验发布均通过，v0.1.6 已公开。发布后真实 updater 分别下载 ARM64/x64 0.1.6 并通过 SHA-512；管道断开运行也正常退出。
- CPU 标签与物理内存只在软件中记录。无法伪装真实指令集、性能、驱动、GPU 算力或完整 WebGPU；不承诺真实电脑等价、全站兼容或防关联。供应商轮换代理及跨区 DNS 继续保留边界。

以下为历史版本证据。

# 栖境 0.1.5 错误修复与指纹复查

日期：2026-11-02，Windows ARM64；Firefox x64 兼容运行。

- 用户截图堆栈位于 scripts/updater-smoke.cjs 与 electron-updater 控制台日志，错误为终端管道断开后的 EPIPE。检查未发现遗留测试进程，不修改系统设置或正常用户环境数据。
- 用真实 Electron 更新验证进程、主动关闭 stdout/stderr 管道复现条件；修复后正常检查下载并退出 0，无弹窗，日志落入文件。正式软件采用文件 updater logger 与 EPIPE stream 防护；其他 stream 错误仍向上报告。
- 52 项测试、TypeScript 与生产构建通过，新增断管道、横竖屏、型号、策略重置及配置迁移检查。
- 全量设备矩阵：13 组设备各自横屏/竖屏共 26 项，加上 Chromium 与 Firefox 的 Windows/macOS/Linux 预设共 6 项，32 项真实窗口检查通过。对比屏幕、视口、DPR、触摸、orientation、UA、Client Hints 与安卓型号；火狐重启身份复查通过。
- 界面验收：横屏默认预设打开仍为横屏、选中正确尺寸；设备类型切换保留方向，切到火狐清除移动参数；不支持的目录按钮禁用。Cookie/localStorage、下载、扩展、HTTP 代理认证与 IPC 保存回归通过。
- GitHub Actions Run 41324359673 的 ARM64/x64 原生构建、52 项测试、打包启动和附件校验发布全部成功，v0.1.5 已公开。发布后真实 updater 分别下载两种架构并通过 SHA-512；故意断开 stdout/stderr 后进程退出 0，无遗留测试进程。
- 用授权 CA 代理复测 Chromium 与 Firefox 默认限制策略、Google STUN：两者未返回可见 ICE 地址，语言与时区按本次查询出口匹配。没有重新保证供应商 DNS 地理位置或轮换出口一致。
- 本轮没有重新宣称所有网站/所有 GPU 或完整真机指纹通过。移动环境仍是 Chromium 模拟；火狐不支持的种子图形/音频覆盖保留限制。代理供应商轮换与跨区 DNS 限制继续适用。

以下为历史版本证据。

# 栖境 0.1.4 引擎 / 设备 / 代理验收

日期：2026-11-01，Windows ARM64 机器；Firefox x64 兼容运行。

- 46 项测试通过，覆盖旧配置兼容、设备矩阵、随机指纹保持所选系统、火狐限制、代理路由、进程锁和在线更新。
- 生产构建、隔离 UI 保存与粘贴、移动端 iPhone / iPad / Android 实际屏幕、视口、DPR、5 点触摸、coarse/no-hover 通过。
- Firefox Windows / macOS / Linux 原生 UA 与屏幕、语言、时区、重启身份一致通过；Cookie/localStorage 重启、空目录隔离、加密同引擎迁移通过。Canvas/音频原生诊断读回通过；WebGL 2/WebGPU 在当前机器仍受限。
- 使用用户授权的 CA HTTP 认证代理进行 HTTPS、Whoer、DNSLeakTest 和 Google STUN 检查。公开资料不包含凭据、环境目录或完整 IP 明细。
- Whoer：Chromium 一次显示 100%，Firefox 一次显示 90%，原因是轮换代理跨加拿大城市改变出口，启动时匹配 Halifax，访问时变为 Vancouver。评分不代表全站兼容或防关联效果。
- 两个引擎带 STUN 的检查未返回可见 ICE 地址；此项不证明所有 TURN/UDP/所有网站没有泄露。
- DNSLeakTest：代理下返回 Cloudflare/Alibaba（加拿大、德国、日本）；直连对照返回新加坡 Oracle，代理结果没有同样的本机直连解析器。更像供应商解析链路跨区，仍需供应商确认。不能承诺 DNS 必定在 CA。
- HTTP 代理目的域名解析在代理侧；浏览器限制本地目的解析、QUIC 和非代理 UDP。系统需要解析代理网关域名，这是连接网关的必要步骤。手动绕过规则会开放对应直连。
- 软件仅发布 Windows ARM64/x64；macOS/Linux 为身份预设，手机和平板为 Chromium 布局模拟，均不是原生系统或 WebKit。
- 原生 x64 构建/UI 验收由 GitHub Windows runner 执行，浏览器 GPU 原生 x64 验收仍需对应硬件。

- GitHub Actions Run 41319442298：ARM64/x64 原生构建、46 项测试、打包启动 smoke、公开附件校验及发布全部通过，v0.1.4 已公开。
- 真实 electron-updater GitHub provider 分别下载两种架构 0.1.4 并通过 SHA-512。ARM64 独立目录从 0.1.2 静默在线更新到 0.1.4；SQLite 与数据标记保留，新版运行 smoke 通过。
- 本机 x64 安装包在 ARM64 仿真运行退出，未视为兼容运行通过；x64 程序启动采用 GitHub 原生 x64 runner 的通过证据。浏览器 x64/GPU 的原生机器全量验收仍未完成。

以下为历史版本证据。

# 栖境 0.1.3 在线更新验收

日期：2026-11-01（Asia/Shanghai）。

- 38 项回归测试通过，新增自动检查下载、并发下载复用、安装前锁定与失败恢复测试。
- TypeScript 检查与生产构建通过。
- Electron 隔离界面验收：自动检查下载开关保存正常；ARM64 浏览器启动和环境保存通过。
- 自动检查在软件启动后执行，下载使用对应架构清单与 SHA-512，安装只在用户点击后执行。
- 更新沿用当前安装目录，并保留应用标识、用户配置与浏览器环境。
- 后续发布已配置 GitHub Actions 双架构构建、测试、打包检查和完整草稿发布。
- GitHub Actions Run 41309722105 的 ARM64 / x64 原生构建、打包 smoke 和发布均成功，Release v0.1.3 已公开。
- 真实 electron-updater GitHub provider 已分别读取 0.1.3 两种架构清单，下载对应安装包并通过 SHA-512 校验。
- 本地在线更新面板、自动检查下载开关保存、ARM64 环境启停与数据保存检查通过。
- 2026-11-01 独立目录实测：真实 NsisUpdater 从 GitHub 下载 0.1.3，以 0.1.2 为基线执行静默更新；更新后程序版本为 0.1.3，SQLite 和数据标记保留，运行 smoke 通过。此次测试为保持隔离变量手动重开验收，自动重启参数由更新状态测试覆盖；此前 0.1.2 已有实际自动重启窗口验收。

以下保留此前发布与运行证据。

# 栖境 0.1.2 交付验收

日期：2026-10-30（Asia/Shanghai）。

本版已完成：

- 34 项自动化测试通过，覆盖五种代理解析、默认预设兼容迁移与校验、批量创建原子回滚、随机参数一致性、更新状态和关闭顺序。
- TypeScript 类型检查与生产构建通过。
- Electron 界面实测：保存高级与实验预设，新建环境继承；通过真实粘贴事件解析并加密保存代理；一键随机并批量创建三个不同种子、不同参数的环境。
- ARM64 Chromix 实测：Cookie / localStorage 重启保留、环境隔离、加密 Cookie 迁移、下载文件保存、MV3 扩展与 HTTP 代理认证。
- x64 打包程序及浏览器在 Windows ARM64 仿真环境运行通过；尚未在原生 x64 电脑上验收。

ARM64 安装后启动、覆盖安装保留数据已通过。使用相同 NSIS 配置和宏的隔离测试包验证：升级保留标记数据，主动卸载清除 AppData 和更新缓存。三个随机参数环境在 ARM64 Chromix 中实际启动，CPU、屏幕、语言和时区符合配置。

安装、卸载与 GitHub 下载验收结果保存在项目 `.verification/`，该目录不上传。软件默认从 GitHub Releases 下载相应架构的完整安装包，使用 SHA-512 校验；没有代码签名证书。

GitHub Release `v0.1.2` 已公开。使用真实 electron-updater GitHub provider 分别读取 ARM64、x64 清单，下载两份安装包并完成 SHA-512 校验，均通过。验收使用隔离缓存及旧版版本号适配器，没有改写发布版本或用户数据。

真实 NsisUpdater 使用 GitHub 下载的 ARM64 安装包完成静默更新和自动重启，界面版本为 0.1.2，原有保存环境仍可见。重启后的软件设置中点击“检查更新”返回“当前已是最新版本”。NSIS 经 Explorer 启动程序时不会继承测试环境变量，因此重启末段通过实际窗口验收。

随机功能选择受支持的参数组合，不保证站点不可识别、物理硬件等价或所有图形噪声路径生效。图形边界沿用下方已有验收结论。

## 0.1.1 验收记录（历史）

交付日期：2026-10-30（Asia/Shanghai）。

这是完成问题修复的环境管理软件，包含环境配置、浏览器启停、数据保存、代理、扩展、Cookie 迁移、内核下载和诊断入口。任务与自动化入口已移除。

修复清单详见 `BUGFIXES.md`。本轮新增磁盘写入失败回滚、环境锁、启动并发、取消操作、扩展导入与组件恢复检查。

## 已完成的检查

| 检查 | 结果 |
|---|---|
| TypeScript 类型检查与生产构建 | 通过 |
| 27 项回归测试 | 全部通过 |
| SQLite 保存、复制配置和独立种子 | 通过 |
| Windows 系统加密代理密码，界面不返回密码 | 通过 |
| ARM64 原生 Chromix 155.0.8059.79 启动和关闭 | 通过 |
| 并发重复启动同一环境拦截 | 通过 |
| 预加载接口及 IPC 保存环境 | 通过 |
| 本地 PE 内核导入和实际版本读取 | 通过 |
| Cookie、localStorage 重启持久化与独立目录隔离 | 通过 |
| 加密 Cookie 迁移、拒绝非空目标 | 通过 |
| 文件保存到环境下载目录 | 通过 |
| Windows MV3 本地扩展加载 | 通过 |
| HTTP 代理认证实际请求 | 通过 |
| 首次下载 Python / Playwright / Pillow 与依赖自检 | 通过 |
| 上游图形诊断运行和报告读取 | 通过执行；各图形检查见下表 |
| ARM64 安装器安装、安装后运行、再次覆盖安装保留数据 | 通过 |
| x64 打包程序和 x64 Chromix | 在 Windows ARM64 兼容层通过，未做 x64 原生机器验收 |
| 浅色、深色、新建环境、UA 和 WebGL 设置界面截图 | 已检查 |

## 图形及高级能力状态

- Canvas：上游固定种子像素诊断通过，报告涵盖该工具实际执行的路径。
- WebGL / WebGPU：当前机器的图形上下文或适配器不可用。WebGL 像素诊断返回缺失上下文，GPU 身份诊断返回 incomplete；软件不把这些结果标成通过。
- 环境观测：已实际核对 CPU、语言、时区、屏幕与部分 Client Hints / CSS 字段；原始值绑定内核摘要，报告不宣称所有跨作用域行为已验收。
- WebRTC：提供 IP 展示和网络策略配置，采集本地 ICE 候选；没有完成外网 DNS、STUN、TURN、IPv6、QUIC 等整体路由验收。
- HTTPS / SOCKS5 代理及出口 GeoIP：已接入上游入口，本轮真实认证测试覆盖 HTTP；其他协议需要相应测试节点做进一步验收。
- 音频隔离、字体限制、媒体限制、Widevine、配额、实验开关：参数与约束已接入；不能把单次字段读取当作所有实际操作的验收。
- 实测设备：已接入组件、上游采集与校验、记录副本保存以及专用启动入口；本机 GPU 证据不完整，未证明完整实测设备启动成功。
- Canvas Bridge 需要自备服务；Runtime suppression、Synthetic 等保留实验标记与副作用说明，未做全部组合运行验证。

## 分发说明

ARM64 安装包约 127 MiB，x64 约 132 MiB，双架构约 258 MiB。安装包带管理软件及相关依赖，Chromix 和 Python 组件按需下载。下载需要连接 GitHub、python.org 和 PyPI 文件服务。

安装包未签名。软件升级采用手动安装保留数据，内核更新单独管理。现有环境通过升级副本验证，不能直接回退读取被新内核修改的数据。

测试用的浏览器、设备记录及账号数据不随安装包分发。此前验收使用本地测试页面和虚构凭据。独立安装验收目录位于 `.verification/installed-arm64`，未将应用安装到常规用户程序目录。

原始证据位于 `.verification/`，包括 `browser-flows.json`、`graphics-report.json`、`installer/installer.json` 和 `packaged-x64/smoke.json`。报告时间戳使用 UTC，文件中的交付日期使用用户时区。

## 未列为实现能力

上游尚未完成的完整 ClientRects 扰动、SOCKS5 UDP ASSOCIATE、完整虚拟 GPU、跨机原生 Cookie 数据库兼容，保留“不支持”。未承诺网站检测通过率、账号不关联或虚拟身份等于一台真实设备。
