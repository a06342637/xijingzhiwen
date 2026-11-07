# 0.1.26 验证（2026-11-08）

- ARM64/x64最终安装包各15项管理回归通过，本地覆盖安装0.1.26，app.asar与ARM64发行包SHA-256一致。x64打包中遇到构建写入竞争导致未完成脚本，串行构建重打后包内语法与运行检查通过，损坏包未发布。

- 最终15项管理界面隔离回归通过，真实两引擎启动/书签/平铺和独立代理切换复核通过。批量编号、回收站和API管理保持。

- 157项测试与构建通过，覆盖内核校验复用/变化/并发、批量启动有界并发、扩展适配共享处理、新Firefox单次启动书签及未首次启动时关闭清理。
- 本机Windows ARM64隔离基线：Chromium首次4520ms/再次1563ms，Firefox首次57368ms/再次5389ms；窗口首次3446ms/重复1737ms，平铺2896ms/2874ms。最终实测：Chromium3033ms/1544ms，Firefox9275ms/5688ms，重复窗口151ms，平铺373ms/245ms。重复启动改善有限，其他硬件和代理条件可能不同。
- 真实Chromium/Firefox书签首次恢复、位置、用户数据保留、重启不重复、随机更新/关闭与选中窗口平铺/未选不动/关闭跳过通过。窗口管理预热和复用减少重复进程/编译/全量查询。

# 0.1.25 验证（2026-11-06）

- ARM64/x64最终安装版各13项管理回归全部通过；本地现有安装覆盖更新到0.1.25，app.asar与ARM64发行包SHA-256一致。

- 152项测试与构建通过；隔离管理界面13项检查覆盖按创建顺序的编号后缀、单环境无编号、回收站点击清空无二次确认、代理批量映射及原文保留。
- LOCAL_API.md扩充至454行，覆盖启用、全部接口、参数、请求/响应、两引擎控制、Python/Node.js完整流程、批量创建和失败重试；示例语法已检查。

# 0.1.24 验证（2026-11-06）

- v0.1.24已公开，8个完整发行附件通过发布脚本SHA-256核验；源代码main提交e077973，本地安装app.asar与最终ARM64发行包SHA-256一致。

- 152项测试与TypeScript/esbuild构建通过，覆盖API鉴权、加密/重置Key、随机和指定指纹、生命周期、端口冲突恢复、代理原文加密及多行映射、回收站失败重试。
- 隔离管理界面13项检查通过，覆盖普通/批量删除到回收站、恢复/彻底清理、清空取消/确认、随机时间名称、三行代理框、粘贴不检测、多行代理映射、重开编辑原文。
- 真实Chromium与Firefox API创建、指定语言时区、启动、标签页打开/填写/点击、关闭和永久删除通过；Chromium真实CDP连接通过。
- 真实Chromium与Firefox运行中代理修改通过：用本地两台代理核对请求走新端口，保存自动重启，localStorage保留，其他共用旧代理的环境不变。不使用用户数据或外部真实账号进行测试。
- ARM64/x64最终安装包各13项管理回归全部通过；两引擎API生命周期和代理切换分别隔离验收。两架构更新清单SHA-512、安装包路径和大小校验通过。本地已有安装覆盖更新到0.1.24。

# 0.1.23 验证（2026-11-04）

- 默认关闭9组受控功能，旧配置/默认预设/单次随机/批量/启动前及代理匹配后统一执行权限。普通设置保存接口不能开启权限；设置中原生弹窗二次确认，取消不保存，关闭无需确认。运行环境时禁止改开关。
- 144项单元/回归测试、生产构建与22项完整隔离管理界面回归通过，保留固定预设、永久删除及独占代理、书签、扩展、随机名称、时间列与窗口平铺。
- Chromix ARM64与Firefox x64本地9组检查通过：旧移动环境默认恢复桌面、旧扰动/手动UA关闭，Windows/macOS/Linux桌面、iPhone/Android布局、原生对照、Firefox。主页面/Worker/同源iframe/跨站iframe的UA、platform、线程数和时区一致，未发现所检查的常见自动化全局变量。默认桌面与Firefox主页面及iframe webdriver=false；主动开启的布局/原生对照仍为true，界面明确提示。
- 移动测试使用真实Chromium身份，仅模拟尺寸/触摸；不宣称iOS、Android或原生Safari。关闭硬件/输入覆盖后不传默认假定线程数、内存与输入参数。
- 修复界面状态查询重复校验全部组件文件造成的延迟：30秒短缓存合并并发检查，真正使用组件时强制重新校验；修改原生文件能被重新验证发现。
- 本轮没有重新执行Apple结账或取得用户RDP/ADS对照数据，不把本地公开标记检查当作远程404全部解决的证明。
- 本地证据：.verification/controlled-audit-026/result.json 与 .verification/release-023-ui4/smoke.json；测试数据不提交，不操作用户环境。

- GitHub Actions 41676835095通过：Windows x64/ARM64原生构建、各144项测试及安装版完整回归，受控设置二次确认测试随包执行。
- v0.1.23正式公开，8个附件完整。公开安装包ARM64 147,922,097字节、x64 153,849,335字节；SHA-256、两架构更新清单SHA-512及大小校验通过。
- Electron真实GitHub更新器分别取得0.1.23 ARM64/x64正确安装包并校验下载；没有安装或操作用户环境。本地附件位于Downloads/xijing发行版本/0.1.23。

# 0.1.22 验证（2026-11-03）

- 138项测试通过。全15,000个域名有本地条目，其中847个取得真实标题，其他以域名回退；运行时无标题网络请求。
- Chromium本机隔离启动3.4秒/2.1秒，本地书签9毫秒；Firefox x64在ARM64兼容层本机仍约24秒，首次初始化更久，不宣称两引擎同速。
- 合成640×500扩展复现seeded内核仅25×25绘制，off完整；独立工具窗口完整显示。
- google_gjx 1.6.8实际导入/启动原页面，无页面错误；指纹环境固定网页视口不用于扩展。
- 完整隔离界面及两引擎书签回归通过，固定预设、永久删除、代理、时间、扩展默认加载、队列、随机名和平铺保持。
- GitHub Actions 41650552692全部通过：Windows x64/ARM64原生构建、138项测试、安装版完整回归。
- v0.1.22公开，8个发行附件完整，安装包SHA-256和两架构更新SHA-512/大小校验通过。
- Electron真实GitHub更新器分别取得0.1.22 ARM64/x64安装包，校验下载通过；未安装或操作用户环境。
- google_gjx实际软件worker路径独立工具窗口564×641内容区域，页面完整，固定网页视口不干扰；截图已检查。
- 本地发行附件位于Downloads/xijing发行版本/0.1.22。

# 0.1.21 验证（2026-11-03）

- 138项测试通过：永久删除/共享代理/密码清理、失败重试、真实标题解析/缓存/认证代理、随机颜色修正。
- 实际Chromix ARM64：Windows/macOS/Linux复现forced-colors改变网页背景；修复后样式和媒体查询正常。
- Firefox x64、Chromium直连和本地HTTP CONNECT代理均已检查；Whoer实际页面直连/代理加载正常。使用隔离数据，没有操作用户环境。
- 真实网络标题读取获得GitHub/Wikipedia/Chess.com当前标题；随机60站中不可达或受阻者回退域名，未编造标题。
- 完整隔离界面回归通过：单个/批量永久删除、独占/共用代理、时间列、回收站遗留界面、扩展、内核队列、预设固定和窗口平铺。
- 真实两引擎60书签散排、重启、重新随机、关闭及手动书签保留通过；标题缓存更新测试通过。
- GitHub Actions 41640912084全部通过：Windows x64/ARM64原生构建、138项测试、安装版完整界面/永久删除/预设回归。
- v0.1.21公开且8个附件完整，发行包SHA-256、两架构更新SHA-512/大小校验通过。
- Electron实际GitHub更新器分别取得0.1.21 ARM64/x64安装包并校验下载，未安装或操作用户环境。
- 本地发行附件保存在Downloads/xijing发行版本/0.1.21。

# 0.1.20 验证（2026-11-03）

- 132 项测试通过；TypeScript/生产构建通过。
- 实际设置编辑自动勾选固定、单次随机按钮保留3070/东八区、批量IPC保留及独立种子通过。
- 真实 Chromix ARM64 / Firefox x64：60书签散排、重启不重复、重新随机更新、关闭保留用户书签通过。
- 本地文字页面复现旧英文字体名单CJK方框；原生字体与新版多语言名单均显示正常，已目视检查两引擎截图。没有在Oracle注册网站提交表单。
- 完整隔离界面回归通过：环境列表、代理、时间列、扩展、内核排队、回收站、随机名称和窗口平铺。
- GitHub Actions 41635522789 全部通过：Windows x64 / ARM64 原生构建、132项测试、安装版完整界面与固定预设回归。
- v0.1.20正式公开，8个附件完整。下载发行包核对SHA-256、两架构更新清单SHA-512和文件大小通过。
- Electron真实GitHub更新器分别取得0.1.20的ARM64/x64安装包，校验下载通过；只下载隔离缓存，没有安装或操作用户环境。
- 本地发行文件位于Downloads/xijing发行版本/0.1.20。

# 栖境0.1.19 随机名称与窗口平铺验证

日期：2026-11-03。

- 126项测试及生产构建通过。随机名称300样本合法唯一，100环境批量名称独立；空模板随机可创建，单个手动名保留。1–50窗口布局覆盖、无重叠、工作区边界、负坐标与列数/间距检查通过。
- 本地隔离UI测试随机后直接创建、再次随机改名、三环境随机批量，代理保持；平铺入口顺序、选择、列表/表格、网格列数、预览、执行反馈通过。测试中用固定窗口响应检查界面，不当作真实桌面证据。证据 .verification/layout-ui/smoke.json，完整旧功能组合 .verification/layout-ui-all/smoke.json。
- Windows ARM64本机原生窗口实测：Chromix ARM64和Firefox x64两个独立窗口各占工作区一半，结果位置/尺寸正确。证据 .verification/native-tiling-1793700250286/result.json。6个Chromix测试窗口，分别测试2/3/4均分、6自动网格、最小化恢复及关闭后不再匹配，均通过。证据 .verification/tiling-many-1793700396233/result.json；不操作用户环境。
- 窗口数量过多、浏览器最小尺寸、固定页面视口和不同虚拟桌面有实际限制；未做移动设备视口随窗口自动改写。多显示器负坐标用布局测试验证，本机真实测试为单显示器；按目标架构安装版验证后续补记。
- 实际主进程接入：按三个栖境隔离环境匹配真实Chromium/Firefox窗口，选择其中两个平铺，第三个位置不变；关闭一个再执行会跳过已关闭窗口，证据 .verification/layout-real-main/smoke.json 和 native-window-layout.json。0.1.19完整19项管理界面smoke通过，含原回收、代理、时间、扩展和书签设置，证据 .verification/layout-final/smoke.json。安装版检查额外运行真实Windows显示器枚举验证随包辅助脚本。
- GitHub Actions 41617115645 两个原生架构runner的126项测试、生产安装包及完整安装版回归通过（含真实Windows工作区枚举与随包脚本）。scripts/publish.mjs完整校验后公开0.1.19，ARM64安装包147,626,155字节、x64安装包153,553,595字节，更新清单独立。真实GitHub updater各自检查并下载正确架构0.1.19安装包，SHA-512校验通过，证据 .verification/github-update/result.json 和 updater.log。未在用户数据上执行测试安装。

# 栖境0.1.18 环境时间列验证

日期：2026-11-03。

- 123项测试及生产构建通过。SQLite启动历史持久化、旧版空记录、复制/批量清空记录、回收恢复保留记录检查通过；隔离进程检查启动成功记录、重复事件不覆盖、focus不变、失败不记录、下次成功更新。
- 管理界面隔离smoke：状态后依次创建时间/启动时间/操作，无记录显示从未、ISO真实值关联、日期时分秒展示；旧编辑内容保存不覆盖服务器的创建和启动时间。1280与860宽度截图检查通过，证据 .verification/profile-times/smoke.json。
- 时间按本机时区显示。旧版没有记录的启动历史无法推断，不根据网站日志或文件时间编造；原创建时间保留。
- 真实Chromix ARM64与Firefox x64（ARM64宿主兼容运行）启动回归通过：两引擎成功记录时间，Chromix进入不更新、再次启动更新；原默认扩展、Google搜索及60书签仍正常，证据 .verification/profile-times-browser/smoke.json。0.1.18管理界面最终复测通过，证据 .verification/profile-times-final/smoke.json。
- GitHub Actions 41611768528 两架构原生runner的123项测试、生产打包及完整安装版检查通过，0.1.18全部草稿附件经scripts/publish.mjs校验后公开；ARM64安装包147,612,881字节，x64安装包153,540,253字节。真实GitHub updater检查并下载各自0.1.18安装包，SHA-512通过，证据 .verification/github-update/result.json；未对用户数据执行测试安装。
- 首次发行CI在新增界面测试读取目标行时失败，未公开安装包；补充等待目标行刷新及完整错误信息后，本地完整组合smoke通过，证据 .verification/profile-times-all-output2/smoke.json，重新进行双架构发行检查。

# 栖境 0.1.17 Google默认搜索验证

日期：2026-11-03。

- 121项测试及生产构建通过。Chromix内核原默认为No Search / http://%s，Google不在原生列表；通过原生设置页添加Google及搜索建议并设为默认，不直接篡改受保护的搜索偏好。核对真实原生列表Google为default且URL正确，证据 .verification/search-native2-1793695805211/chromium-result.json。
- Camoufox内核原策略删除常用搜索引擎并指定None；只替换SearchEngines策略，原文件备份保存，其他更新/隐私策略保留。真实Firefox保存的search.json.mozlz4解码确认appDefaultEngineId为policy-Google，prefs记载普通/隐私默认Google。该内核about:preferences导航未达到完成事件，没有把此页面截屏/手动地址栏输入称为通过。
- Computer-use工具本机初始化报os error 3，未执行桌面键盘实测；浏览器原生配置和本地启动检查作为本次证据。Google网站可达性受网络/代理影响，未承诺直连中国网络可访问。
- Chromium首次初始化标记只有成功后写入，失败提示但保留可用浏览器，重试初始化；后续用户更换搜索引擎不被覆盖。Firefox策略按内核共享，兼容原上游策略限制。实测设备模式不插入临时设置页。
- 本地ARM64和x64两个Chromix内核分别启动、设置、关闭和重启，原生默认搜索仍为Google；没有搜索偏好重置提示记录，证据 .verification/search-restart/arm64.json 和 x64.json（x64在ARM64宿主兼容运行）。默认扩展与随机书签在接入搜索初始化后仍通过真实两引擎启动回归，证据 .verification/search-browser-final/smoke.json。
- GitHub Actions 41606806625 两个原生架构runner的121项测试、生产打包和安装版检查通过；通过scripts/publish.mjs完整草稿附件校验后公开0.1.17。ARM64安装包147,610,843字节、x64安装包153,538,369字节，各有独立更新清单及blockmap。真实GitHub updater分别检查并下载0.1.17正确架构安装包，SHA-512校验通过，证据 .verification/github-update/result.json 和 updater.log；未在用户数据上执行测试安装。

# 栖境 0.1.16 发布验证

日期：2026-11-03。默认扩展、随机书签、内核下载队列和10秒提示。

- 119项测试及生产构建通过；域名池15,000个合法唯一域名，按环境ID/种子抽取60个独立且重启稳定的书签。Chromium文件保留用户节点，复制副本替换原软件文件夹；Firefox原生Places更新保留用户节点、URL索引、引用计数。禁用不覆盖用户书签。
- 本地15项管理界面smoke通过：默认扩展导入/开关/设置/批量/新建选择；随机书签设置保存、队列按钮防重入、失败反馈以及重复相同提示重置10秒。队列测试采用延迟替身，无批量下载全部历史内核。证据 .verification/ui-016b/smoke.json，最终版本复测 .verification/release-016-final/。
- 真实Chromix ARM64基线155.0.8059.79与Firefox x64候选158.0.1-beta.41（本机Windows ARM64兼容运行）：默认继承扩展发送本地请求、60书签实际加载；重启不重复、更换种子更新、关闭删除专用文件夹且保留用户书签。证据 .verification/resources-016c/smoke.json。首次火狐原生数据初始化无可见窗口，随后只启动一个供用户操作的窗口；不使用会替换用户书签的启动HTML导入。
- GitHub两个原生架构runner将在发行时验证119项测试、安装包和管理界面；真实GPU图形和检测站评分未在本次修改中重新验证，书签不保证防关联或网站评分。
- GitHub Actions 41604946322 两个原生架构构建、119项测试及安装版检查通过。0.1.16公开附件完整；真实GitHub updater分别下载ARM64/x64安装包并通过SHA-512校验，证据 .verification/github-update/result.json。软件与内核仍分开，更新保留环境数据。

# 栖境 0.1.15 发布验证

日期：2026-11-03。发布紧凑代理输入、弹窗顶部与广泛随机；双架构安装包和在线更新已通过。

- 新版本112项测试及生产构建通过；本地18项完整smoke通过，含真实Chromium启停、Cookie/localStorage、下载、扩展、HTTP认证代理，回收/独立编辑、并行内核和紧凑弹窗随机/批量/认证保留。证据 `.verification/release-015-final/smoke.json`。增加安装版紧凑编辑回归，与既有环境/回收站/并行下载/代理/组件自检共同执行。
- 软件保持原应用标识和环境目录。单个已保存环境的参数不自动随机，批量新建默认各自独立生成，代理关联和网络限制沿用。

- GitHub Actions 41600734207 两架构原生 runner 构建与安装版检查通过；0.1.15 真实 GitHub updater 两架构分别检查并下载对应安装包，SHA-512 校验通过，证据 `.verification/github-update/result.json`（发布后0.1.16复测会覆盖此本地证据）。

# 紧凑代理与广泛随机检查（尚未发行）

日期：2026-11-03。基于0.1.14源码修改，未生成新安装包。

- 112 项测试、TypeScript/生产构建通过。广泛随机两引擎各300组桌面样本、iPhone/iPad/Android各100组均通过参数合法性；系统/硬件/屏幕/偏好等产生多种组合，保持代理关联网络项和所选引擎。批量30个在旧randomize=false时仍独立随机和生成独立种子，单条普通保存保持原值。代理匹配会覆盖广泛随机的语言/时区及对应Windows字体，保存值不被启动改写。
- UI隔离检查：打开/滚动关闭/复开scrollTop=0，随机→代理→数量→引擎顺序正确；代理只有文本及测试按钮，粘贴后原文保留、自动查询，随机不改变代理文本；无效输入阻止提交且重新粘贴恢复有效。3条批量独立种子/参数、代理相同；已保存代理不显示密码，修改主机保留原认证。证据 `.verification/compact-editor-all-final/` 与 `.verification/compact-final-auth/`。网络UI用维护者替身，不冒充真实代理测试。
- 完整启动/Cookie/localStorage/下载/扩展/HTTP代理认证、环境回收恢复及独立代理操作回归通过，证据 `.verification/compact-editor-all-final/smoke.json`。
- 广泛随机Chromium ARM64与Camoufox x64兼容环境实际启动并采集网页原生API通过，证据 `.verification/broad-chromium/`、`.verification/broad-firefox/`。图形和CPU型号仍只是展示与参数；不扩大成真实硬件、原生macOS/Linux或所有检测站通过。
- 全字段“随机”遵守数据有效性和内核范围：绑定引擎/设备类型、实际网络IP、外部目录/服务、扩展等不凭空生成，沙箱相关实验不随机开启，网络路由策略保留。手动UA/版本清空以使用所绑内核自动身份。火狐与移动参数按当前支持范围随机。更大差异可能增加可识别特征，不承诺防关联。

# 栖境 0.1.14 发布前复查

日期：2026-11-03。合并此前只同步源码的修复，v0.1.14 Windows ARM64/x64 已完整公开发行。

- 108 项测试、TypeScript 与生产构建通过；从独立测试目录重新运行环境全选/批量删除/回收恢复及彻底删除、代理粘贴自动/手动测试、列表国家与平台字段、共用代理另存、内核并行、首页设置开关及 Chromium Cookie/localStorage/下载/扩展/HTTP 认证代理回归，全部通过。最终 0.1.14 再测 16 项全部通过，证据 `.verification/release-014-final/smoke.json`（前次 `.verification/release-014-regression/smoke.json`）。
- Chromium 与 Firefox 首页再次验证：自动请求只为 Who 出口 JSON，详细站点仅手动图标，中文信息、入口关闭、刷新及 Whoer 打开通过。证据 `.verification/homepage-audit/chromium-1793673969410/`、`.verification/homepage-audit/firefox-1793673969183/`。固定响应用于 UI 行为验证，真实代理网络证据见下文各专项记录。
- 发布流程增加两种原生 runner 的安装版新界面回归，以及按需 Python/C++ DLL/greenlet/Playwright/Pillow和工具导入自检。当前真实 GPU 验收仍受本机环境限制，不提前把 CI 当作所有指纹通过。
- 首次 ARM64 CI 安装版回收站 UI 检查失败：标题先更新而 tbody 记录仍未更新；修复维护者等待条件为目标记录出现，保持所有断言。x64 原安装版通过；本机相同组件/UI 检查再次通过，证据 `.verification/release-014-ci-repair/smoke.json`，发行流程重新运行，不跳过测试。
- 最终 GitHub Actions Run 41569342738 双架构 108 项测试、生产构建/打包、安装版本地中文资源、按需 Python/C++ DLL/原生扩展与工具导入、新界面全选/回收/独立代理/并行下载/设置开关检查全部通过。v0.1.14 草稿完整附件 SHA-256/SHA-512 校验后公开，双更新清单分别指向正确架构包。
- 真实 Electron updater 从 GitHub 检查到 0.1.14，ARM64/x64 安装包均实际下载并通过 SHA-512，进程退出 0。证据 `.verification/github-update/result.json`。本轮执行安装版进程/功能 smoke 和真实更新下载，不重复 NSIS 覆盖安装迁移；历史迁移验证边界不扩大。
- 新发行保留环境、SQLite 数据、固定身份和内核绑定；旧版缺配置记录的保留目录不自动删除。回收过期清理有真实生效语义（运行时/下次打开），手动彻底删除不可恢复。

# 环境回收、代理列表与网关对照（尚未发行）

日期 2026-11-03，Windows ARM64。本轮同步源码，不创建发行标签，安装版仍需后续新发行才能应用。

- 最终 108 项测试和 TypeScript/生产构建通过；完整启动、Cookie/localStorage、下载、扩展、HTTP 代理认证及环境界面 smoke 通过，证据 `.verification/environment-release-source-final/smoke.json`。
- 回收站单元/隔离测试覆盖原始种子与完整配置、浏览器/下载目录、删除时间和三天到期、重启后恢复、现存目录拒绝覆盖、数据库失败回滚、到期禁止恢复、独立报告数据清理、SQLite 删除记录及外部目录保留。运行中环境和共用依赖受保护。
- UI smoke 通过默认代理粘贴、一次粘贴解析后自动查询与手动重测、空启动网址、实测泰国/IP展示、平台/浏览器列、独立编辑弹窗、全选批量删除、无确认窗、回收恢复/彻底删除；共用代理另存保持另一环境路由和原固定种子。代理网络测试 UI 使用维护者替身，另有真实查询证据。证据 `.verification/environment-ui-all-final/` 和 `.verification/environment-ui-painted/`，后者实际可见窗口截图复核表格/回收站。
- 实际经 as 网关 TH2 代理连续三次返回泰国 Bangkok、True Internet、同一 IPv4及 Asia/Bangkok，country/region/city/isp由 GeoIP原始响应传递，未根据域名推测；报告无密码。证据 `.verification/gateway-country-metadata.json`。
- 相同 TH2 与 JP3 认证会话，逐个对比 us/as/hk/global/eu 网关，两轮 Who /api/me与 ipify、另查随机域名 DNS：TH2 us轮换，as/hk/global/eu在该短组中IPv4一致；出口都仍泰国。JP3 us/global出现IPv6与IPv4，as/hk/eu IPv4同组一致；as连接美国 SJC/LAX且DNS新加坡，hk连日本NRT但DNS仍新加坡，eu连NRT但DNS美国。网关选择影响路径，不能保证sessTime或解决全部DNS。证据 `.verification/gateway-comparison.json`，凭据不入仓库。
- TH2 使用as网关的真实随机Chromium实测Who A（该次），时区/语言/DNS/分流/WebRTC及延迟项通过，只有稳定指纹可追踪项提示；浏览器66ms与Cloudflare146ms是站点原始测量，没有伪造。后续与普通请求可分配不同IP，不以单次A保证安全。证据 `.verification/gateway-as-th2-browser/`。
- 这不是修改网页成绩或全新UDP代理实现；同一环境保持固定身份仍可能被识别。软件关闭期间无后台定时删除服务，三天过期在下一次启动清理。

# 内核并行、Python 组件与手动首页验收（尚未发行）

日期 2026-11-03，Windows ARM64 本机；软件源码仍为 0.1.13，当前发行安装包不包含本节修复。源码与验证记录同步 GitHub，不创建新发行标签。

- 103 项测试及 TypeScript/生产构建通过。UI 隔离 smoke 用主进程仅测试替身延迟下载响应，验证两个架构同时提交、当前项防重复、检测入口开关保存与状态中文说明；没有把替身作为真实下载证据。后台原有独立 staging/摘要校验不变。证据 `.verification/maintenance-ui-final3/`。
- x64/ARM64 嵌入 Python 重新下载全套校验组件，greenlet 原生切换、Playwright、Pillow 导入及组件 ready 均通过。独立组件运行 collect_device.py 后两种架构都生成完整 record.json；图形检查均生成 summary.json，Canvas 通过，本机 WebGL unavailable，GPU 身份不完整，按真实条件显示受限。证据 `.verification/components-repair/*-result.json`、`.verification/components-tool-test/`；没有把原生 GPU 不可用标为通过。
- 中文首页两引擎隔离回归：自动 HTTPS 请求只有 Who /api/me JSON，不访问完整 Who/其他详细检测站；固定数据下中文日本/神奈川/横滨/运营商/时区显示，375/1280 布局，手动 Whoer 打开、检测入口隐藏均通过。证据 `.verification/homepage-audit/`；固定响应与实际代理测试分开。
- 用户提供的 JP1–JP5、TH1–TH5、US1–US5 各连续三次代理 GeoIP 查询均为目标地区、对应语言/时区，单次组内稳定。随后普通 curl 经同一代理跨站查询，TH2/TH3/TH5 在一组中出现不同 IPv4；多个其他节点与早先采样也换出口，JP1 有 IPv6 与 IPv4差异。它们不能保证 sessTime=5 内所有目的网站同出口。证据 `.verification/current-proxy-samples.json`、`.verification/current-cross-sites/cross-site.json`。
- 浏览器详测 JP1 Chromium、TH1 Firefox、US1 Chromium：语言/时区对应地区，UA 与系统及篡改一致性项通过，WebRTC 均 No Leak。JP1 Who D、DNS 标美国；BrowserLeaks 65 解析器/4 ISP/1 地点，日本。TH1 Who C/出口分流，BrowserLeaks 104 解析器/5 ISP/4 地点含泰国/印度。US1 Who C、DNS 美国，BrowserLeaks 15 解析器/1 ISP/2 地点；TCP 系统推断 Android，浏览器 UA Windows。证据 `.verification/current-jp1/`、`.verification/current-th1/`、`.verification/current-us1/`。
- 普通 curl 通过 JP3 代理访问与 Who 相同随机域名 DNS 接口，连续两次仍为美国 Rackdog 121.91.240.47，ECS 日本；TH2 返回泰国，US3 美国，直连两次为 Oracle 新加坡。该美国解析链不依赖浏览器指纹 JS，与本机直连解析器不同；不据此声称所有 DNS 流量均已验证。证据 `.verification/current-dns-transport.json`。直连浏览器 DNS 为 Oracle 新加坡，证据 `.verification/current-direct/`。
- JP3 Chromium/TH3 Firefox 启用地区字体名单后，Who 系统语言项不再显示额外中文字体，地域/语言/时区/DNS/WebRTC/分流在该次通过，均 C；剩余额外 RTT 与稳定指纹。JP3 浏览器网络路径为代理，TH3 RTT 320ms 对服务器 12ms，软件不会伪造延迟或改原站等级。稳定环境可追踪是固定配置用途的边界。证据 `.verification/current-jp3-fonts/`、`.verification/current-th3-fonts/`。
- 真实新首页已用 JP3 Chromium / TH3 Firefox 验证目标国家与出口信息显示，详细网站只有图标、默认不运行检测，证据 `.verification/real-home/`。Chromium 155.0.8059.79 对应源码 startup/infobar_utils.cc 确认 test-type 分支跳过启动参数提示；本次窗口截图工具启动失败，仅核对源码和实际 launch 参数，不声称原生浏览器顶部截图已通过。
- 最终管理软件启动/Cookie/下载/扩展/代理认证及新界面检查通过，证据 `.verification/maintenance-final-all/smoke.json`。
- HTTP 代理使用 CONNECT/TCP，不提供完整 UDP；为防直连 UDP 保持禁用 QUIC，HTTP/3 不使用属当前约束，ECH 依赖 DNS/内核支持，未打开有直连风险的替代路由。字体名单不等于语言包、语音或真实系统变更。未做 macOS/Linux 真机及原生 x64 机器的浏览器/GPU验收。

# 启动总览复查（源码同步，尚未发行）

日期：2026-11-03。沿用 0.1.13 版本号，按用户本轮要求同步修复源码和文档到 GitHub；不生成新发行包、不推送发行标签。已安装软件仍需后续发行才能收到这些修复。

- 98 项测试、TypeScript 与生产构建通过。新增旧/迟到采样隔离、WebRTC 两行泄漏结论、无结论状态、异常分值和打开原站失败返回覆盖。
- Chromium CA、Firefox US 真实代理汇总四站，Who 分别 D/58、C/66；出口与时区继续按实测显示，未改变代理供应商路由或原站成绩。证据 `.verification/dashboard-local-ca-chromium/`、`.verification/dashboard-013/firefox-real-US/`。WebRTC 附加行修复后的 Chromium CA 再测四站完成、No Leak 实测通过，证据 `.verification/dashboard-local-final-ca/`。
- Chromium 与 Firefox 隔离维护者响应回归均通过：三次重载、真实浏览器 JSON 下载、375/768/1280 布局、12 秒卡住采样、离开/返回、两行公网泄漏、原站 HTTP 503 失败提示、关闭服务。证据 `.verification/dashboard-audit-local/chromium-1793643400626/`、`.verification/dashboard-audit-local/firefox-1793643572250/`。维护者固定响应与真实网站证据分开，不提供用户脚本入口。
- 管理软件 smoke 覆盖设置开关、字体资源、Chromium 启停、Cookie/localStorage、独立下载、扩展及认证 HTTP 代理请求，全部通过；证据 `.verification/dashboard-manager-local-check/`。
- 一次 Chromium CA 总览启动失败，独立新目录重试通过；本地页改为只等 DOM 就绪，高级观测不阻塞启动。Firefox 压力测试较慢，多项原定固定等待过短；等待实际状态后核对，不把等待失败等同于软件通过。
- 推送前最终复查：98 项测试与生产构建通过，Chromium/Firefox 三次重载、下载报告、布局、超时采样、两行 WebRTC 泄漏、离开/返回、原站错误和关闭服务均通过，证据 `.verification/dashboard-audit-local/chromium-1793643926307/`、`.verification/dashboard-audit-local/firefox-1793643925693/`。
- 并行浏览器检查期间，下载 smoke 的四秒固定等待出现一次失败；改为最长十五秒核对实际文件保存，复测全部通过。实际下载、Cookie/localStorage、扩展、认证代理、设置开关及资源验收见 `.verification/dashboard-final-push-recheck/smoke.json`。此改动属于维护者验证等待，未改产品下载行为。
- 当前为 Windows ARM64 本机 Chromium ARM64 / Camoufox x64 兼容测试；没有重新执行 GitHub 原生 x64 构建或安装迁移。网页变更、挑战与代理轮换边界仍适用。

# 栖境 0.1.13 启动环境检测总览验收

日期：2026-11-03，Windows ARM64；Chromix 155.0.8059.79 ARM64、Camoufox 158.0.1-beta.41 x64 兼容运行。

- 95 项单元/回归测试、TypeScript 与生产构建通过。新增真实等级解析、A+ 与多语言成绩、无分站点原始指标、来源/路径校验、重复刷新、报告导出、本地服务关闭及设置迁移覆盖。
- CA 两引擎、US 两引擎均从同一真实环境采集四站结果。初次 CA Chromium Who D/58、Firefox C/66；最后 US 两引擎 Who D/58，Sannysoft Chromium 8/8、Firefox 7/8 明确项目通过；CreepJS 分别 19%/6% like-headless、0% headless、0% stealth。分数仅该次实测，Firefox Chrome 对象差异保留，未改站点成绩。
- 页面顶部的 Who 出口与原启动查询分开。US 实测 Chromium 浏览器 America/Chicago、后续 IP America/Denver；Firefox America/New_York、后续 IP America/Chicago，出口轮换在页面展示。不能据此保证代理地区、DNS 与后续连接固定；本任务没有修改代理供应商路由或伪造 RTT。
- Chromium/Firefox 刷新回归用维护者专用固定 DOM 响应验证结果替换、旧 IP 清除和 BrowserLeaks 出口后备来源；HTTP 503 的站点仅显示自身错误，其他结果保留。刷新中关闭汇总页取消临时检测标签和服务，保留用户标签。固定响应仅测试脚本，软件使用真实站点。
- 四站采集后只剩原总览标签；配置 example.com 为启动页后保留额外标签。Chromium 和 Firefox 全局关闭只开原 about:blank；内部 blank 诊断不启动站点采集。
- iPhone 375×667/DPR2 代表模拟通过本地观测与响应布局；不是真实 Safari/WebKit。英文 Windows 字体限制曾导致总览中文方框，补本地开源 OFL 字体后截图复查显示正常；外站字体配置不变。
- 隔离软件 smoke 通过设置默认开启、关闭/恢复、第三方访问说明以及 Chromium 启停、Cookie/localStorage 持久、下载、扩展和认证 HTTP 代理实际请求。证据 `.verification/dashboard-manager-013/`、`.verification/dashboard-manager-final-013/`、`.verification/dashboard-013/`。
- US Firefox 首次启动出现 GeoIP 网络失败，按原有不直连回退策略中止；重试成功。站点超时、结构变化或挑战页使用未完成/受限/错误，不自动绕过。
- GitHub Actions Run 41495041705 双架构原生 runner 的 95 项测试、构建/打包、安装版汇总页/字体及设置开关 smoke、完整附件摘要核对与公开发布均通过。v0.1.13 已公开，真实 Electron updater 分别从 GitHub 下载 ARM64/x64 安装包并通过 SHA-512 校验；证据 `.verification/github-update/result.json`。本轮不重复实际覆盖安装迁移链路。
- x64 原生宿主浏览器指纹、真实移动设备和 macOS/Linux 原生安装仍未在本轮验收。ARM64 本机运行的两种浏览器与双架构安装版检查范围分别记录，不作扩大。

# 2026-11-02 日本固定会话代理专项测试

软件 0.1.12，Windows ARM64；Chromix ARM64 / Camoufox x64 兼容运行。用户提供 6 条 JP session 节点，按顺序记 JP1–JP6。仅测试，无运行代码改动；凭据不入仓库。

- 21:51、21:58 和 22:02（Asia/Shanghai）分别连续查询三次。每轮内部各节点 IP 都一致，均为 ja-JP / Asia/Tokyo；约 11 分钟前后对比 JP1/JP2/JP3/JP6 的 IPv4 改变，JP4/JP5 未变。未执行完整 90 分钟测试，不证明 sessTime 参数实际持续时长。
- 对 6 节点额外使用同一认证路由查询 who.1ms.dog/api/me 与 api.ipify.org，各两轮。JP2/JP4/JP5/JP6 在该组请求中同一 IPv4；JP1/JP3 出现稳定 IPv6 与另一 IPv4。JP5 的日本地址连至 Cloudflare SJC/LAX，美国路由迹象及 RTT 120–127ms 仅该次观察；其余已返回 colo 为 NRT/KIX。
- 浏览器详细覆盖 JP1 Chromium、JP2 Chromium、JP3 Firefox、JP6 Chromium，访问 Who、BrowserLeaks IP、运行 DNS Leak Test、WebRTC。均识别日本、ja-JP、Asia/Tokyo；Who 分流项为同一出口、WebRTC 无公共地址；BrowserLeaks WebRTC 均为 No Leak。该页面的同出口结果不能反证后续重连的 IP 变化。
- Who 四组都把 DNS 121.91.240.47（Rackdog）标为美国，并显示中国系统字体提示、额外网络往返延迟，评分 D；浏览器 RTT 约 614–653ms，对服务器 TCP RTT 19–47ms。公网日本与语言/时区匹配项通过，不宣称全部绿色或安全。
- BrowserLeaks DNS 结果与 Who 有部分差异：JP1 91 个解析器/2 地点、JP2 62 个/1 地点，列出的均在日本；JP3 5 个/2 地点，含 Who 所示的美国解析器和日本；JP6 71 个/2 地点，含日本与新加坡。地域数据库/测试域名解析链路可不同，不仅凭某一个页面判定真实本地 DNS 泄漏；本机原先 Oracle DNS 未在这些列表中出现。
- 检测站使用的浏览器仍保留本机字体、真实图形/架构能力，JP 目前不套 CA/US 英文字体池；中文字体推断属于当前未覆盖边界。原生 GPU 不可用/软件渲染保留实测结果，未改页面评分或伪造网络延迟。
- 证据 `.verification/jp-session-audit/initial-samples.json`、`eight-minute-samples.json`、`samples.json`、`cross-site.json`、各节点页面及 `summary.json`。测试完成浏览器已退出，未修改用户环境。JP4 仅稳定性抽样，尚无完整浏览器/DNS 验收，不把它推荐为已验证安全节点。

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
