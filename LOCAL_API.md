# 栖境本地 API

在“诊断中心”下方的“API 接口”生成 Key 并启动服务。默认地址 `http://127.0.0.1:50325`，可更换 1024–65535 端口。软件保持打开；启用状态和端口会保存，下次启动恢复。每个请求携带 `Authorization: Bearer API_KEY`。POST 使用 `Content-Type: application/json`。

Key 在 Windows 本机加密保存，普通状态不会返回 Key；重新生成立即使旧 Key 失效。仅监听 IPv4 回环，不接受网页 Origin / Fetch Metadata 来源，未提供跨域调用。CDP 地址本身没有 Key 校验，只交给可信本机进程。

响应统一为 `{"code":0,"msg":"success","data":{...}}`；失败 `code:1`，HTTP 400/401/403/404/413/415/429。批量删除返回每项 `ok` 和错误，调用方必须检查结果，重试失败项。删除前必须先停止环境。

参考 [AdsPower Local API v1](https://localapi-doc-zh.adspower.net/)，提供下列常用接口与部分字段别名。环境 ID 是本软件 UUID。未实现 AdsPower 的账号密码、分组 ID 注册、Selenium 驱动、任意启动参数、headless、V2 和云功能；未知参数返回错误。

| 方法 | 路径 | 参数或用途 |
| --- | --- | --- |
| GET | `/status` | 服务状态、软件版本 |
| GET | `/api/v1/user/list` | `user_id`、`group_id`（分组名称）、`page`、`page_size`（最多100），返回 list/total |
| POST | `/api/v1/user/create` | 创建，默认随机指纹，返回 user_id/name/seed/values 等 |
| POST | `/api/v1/user/update` | 必须 user_id，其余字段为部分更新；默认不随机 |
| POST | `/api/v1/user/random` | 必须 user_id；重新随机种子、名称和未固定字段，values 保留指定值 |
| POST | `/api/v1/fingerprint/random` | 随机预览，返回配置，不保存，不接受 user_id/代理凭据 |
| POST | `/api/v1/user/delete` | `{"user_ids":["UUID"]}`，最多100；永久清理软件管理的数据与独占代理 |
| GET | `/api/v1/browser/start` | 必须 user_id；默认仅空白页，`open_tabs=0` 使用启动页设置，`ip_tab=0/1` 为兼容参数，实际首页由软件设置决定 |
| GET | `/api/v1/browser/stop` | 必须 user_id；等待关闭并释放环境锁 |
| GET | `/api/v1/browser/active` | 必须 user_id，返回 Active/Inactive 和 phase |
| GET | `/api/v1/browser/local-active` | 返回运行/启动/关闭中的环境 ID 和状态 |
| POST | `/api/v1/browser/tabs` | user_id/action/tab/url/selector/text，见下文 |
| GET | `/api/v1/kernel/list` | 已安装 kernel_id/engine/version/arch |
| GET | `/api/v1/fingerprint/schema` | 指纹字段类型、默认值、选项、范围、功能是否开启 |

## 创建、修改与随机参数

支持 `name`（最多80字符）、`group_id`（分组名称）、`remark`、`tags`、`randomize`（布尔）、`seed`（uint64十进制字符串）、`kernel_id`、`proxy_id`、`extension_ids`、`open_urls`、`values`、`fingerprint_config`、`user_proxy_config`。不传名字时生成四位随机英文字母/数字＋本机时间，例如 `aB3x-20261106-143025`。

新环境继承软件预设与固定字段，随机后 `values` 覆盖指定值；已有环境基于自身配置随机。指定字段若被规范化改成其他值则返回冲突错误。高级或实验功能必须先在软件设置显式开启，API 不会启用关闭的功能。用 schema 获取全部有效字段。

```json
{
  "randomize": true,
  "values": {
    "engine": "chromium",
    "platform": "windows",
    "locale": "zh-CN",
    "timezone": "Asia/Shanghai"
  }
}
```

显式指定语言或时区默认关闭 geoip 自动匹配；若希望根据代理出口匹配，显式设 `geoip:true`。参数之间必须兼容。已有环境不能跨引擎，更换已绑定内核须走软件的升级验证副本。

`fingerprint_config` 可以使用本软件字段，也支持以下 AdsPower 别名；`values` 同名项优先。

| 别名 | 映射 |
| --- | --- |
| automatic_timezone | `"0"/"1"` → geoip false/true |
| language | 单项语言数组，如 `["zh-CN"]` → locale |
| ua | userAgent（需开启手动浏览器身份） |
| hardware_concurrency | cpu（需开启硬件覆盖） |
| device_memory | memory 字符串（需开启硬件覆盖） |
| screen_resolution | `"1920x1080"` → screenWidth/screenHeight |
| webrtc | `disabled` → 限制非代理UDP；`forward` → auto，并非彻底禁用WebRTC |

代理二选一：已保存的 `proxy_id`，或者下面的 `user_proxy_config`。后者创建独立代理，密码加密保存。`{"proxy_soft":"no_proxy"}` 使用直连。

```json
{
  "user_proxy_config": {
    "proxy_soft": "other",
    "proxy_type": "socks5",
    "proxy_host": "127.0.0.1",
    "proxy_port": "1080",
    "proxy_user": "",
    "proxy_password": ""
  }
}
```

## 浏览器自动化

Chromium 经 API 启动返回 `data.ws.puppeteer`（浏览器 WebSocket）和 `debug_port`。使用 `playwright.chromium.connect_over_cdp(...)` 或 Puppeteer `connect({browserWSEndpoint:...})`。由软件界面启动的现有环境可能没有 CDP 地址，可先关闭再经 API 启动；标签页接口始终可用。Firefox 不提供 Chromium CDP，使用下面的 HTTP 控制。

`/api/v1/browser/tabs` 的 action 可选 list/open/goto/close/content/click/fill。list 返回从0开始的 tab/url/title。每次操作前重新 list，标签页关闭后编号会变化。打开/跳转仅支持 HTTP/HTTPS 或 about:blank；click/fill 使用 Playwright selector。content 返回 URL、标题和页面 HTML。

```json
{"user_id":"UUID","action":"fill","tab":0,"selector":"input[name=email]","text":"example@example.com"}
```

```json
{"user_id":"UUID","action":"click","tab":0,"selector":"button[type=submit]"}
```

## 另一项目完整示例（Python）

安装 `requests` 和 `playwright` Python 包。浏览器由栖境启动，不需要另外下载 Playwright 浏览器。先在栖境准备 Chromium 内核，复制 API Key 到该项目的环境变量 `QIJING_API_KEY`。

```python
import os
import requests
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:50325"
session = requests.Session()
session.trust_env = False
session.headers.update({"Authorization": "Bearer " + os.environ["QIJING_API_KEY"]})

def call(path, data=None):
    response = (session.get(BASE + path, timeout=240) if data is None
                else session.post(BASE + path, json=data, timeout=240))
    result = response.json()
    if result["code"] != 0:
        raise RuntimeError(result["msg"])
    return result["data"]

profile = call("/api/v1/user/create", {
    "randomize": True,
    "values": {"platform": "windows", "locale": "zh-CN", "timezone": "Asia/Shanghai"},
})
uid = profile["user_id"]
try:
    started = call("/api/v1/browser/start?user_id=" + uid)
    with sync_playwright() as pw:
        browser = pw.chromium.connect_over_cdp(started["ws"]["puppeteer"])
        try:
            page = browser.contexts[0].new_page()
            page.goto("https://example.com")
            print(profile["name"], page.title())
        finally:
            browser.close()  # 断开此项目的 CDP 连接
finally:
    call("/api/v1/browser/stop?user_id=" + uid)
    results = call("/api/v1/user/delete", {"user_ids": [uid]})["results"]
    if not all(item["ok"] for item in results):
        raise RuntimeError(results)
```

如需保留登录和环境数据，完成自动化后只 stop，不调用 delete。
