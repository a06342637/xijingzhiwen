# 栖境本地 API 详细使用说明

适用版本：0.1.25；API 从 0.1.24 起提供。

本文位于 `C:\Users\adminuser\Downloads\xijingzhiwen\LOCAL_API.md`；发行副本位于 `C:\Users\adminuser\Downloads\xijing发行版本\0.1.25\LOCAL_API.md`。

## 启用服务与第一次请求

1. 在“内核管理”准备 Chromium 或 Firefox 内核。
2. 点击左侧“诊断中心”下方的“API 接口”。
3. 生成 API Key 并复制；已有 Key 可以直接复制，重新生成使旧 Key 立即失效。
4. 点击“启动服务”，确认“运行中”。默认端口50325，更换端口前先停止服务。
5. 软件保持打开，另一项目在同一台电脑上调用。

PowerShell 第一次测试：

```powershell
$qijingKey = '替换为复制的API Key'
$qijingBase = 'http://127.0.0.1:50325'
$qijingHeaders = @{ Authorization = "Bearer $qijingKey" }
Invoke-RestMethod -Uri "$qijingBase/status" -Headers $qijingHeaders
```

成功返回 `code:0`，`data.status:"success"`，`data.version` 为当前版本。本文中的 Key、UUID、地址和密码均为占位示例，使用时换成实际值。

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

| 参数 | JSON 类型 / 限制 | 行为 |
| --- | --- | --- |
| user_id | UUID字符串 | update/random必填，create不接受 |
| name | 字符串，最多80字符 | 新建不填自动命名；update默认保留，random不填重新命名 |
| group_id | 字符串，最多80字符 | 实际为分组名称，新建默认“未分组” |
| remark | 字符串，最多4000字符 | 备注 |
| tags | 字符串数组，最多20项，每项40字符 | 整体替换标签数组 |
| randomize | 布尔true/false | create默认true；update默认false；random始终随机 |
| seed | 非零uint64十进制字符串 | 1到18446744073709551615，勿传JSON数字以免丢精度 |
| kernel_id | 字符串，最多120字符 | 从kernel/list取ID；不传优先匹配引擎与宿主架构的内核 |
| proxy_id | UUID或空字符串 | 空字符串直连；新建不传直连，修改不传保留 |
| extension_ids | UUID数组，最多50项 | 新建不传继承默认扩展，修改不传保留；Firefox不支持此扩展管理 |
| open_urls | 字符串数组，最多20项，每项2048字符 | 整体替换启动页，只支持HTTP/HTTPS或about:blank |
| values | 对象，值为字符串/数值/布尔 | 本软件指纹字段，以schema为准 |
| fingerprint_config | 对象 | 本软件字段或下表别名，与values合并，values优先 |
| user_proxy_config | 对象 | 创建独立代理，不能同时传proxy_id |

数组字段整体替换：`tags:[]` 清空标签，`open_urls:[]` 清空启动页。未知字段报错，不能直接照搬其他平台完整参数。API 每次 create 一个环境，不接受 count；批量需由调用方循环并在 name 后加 -1/-2。软件界面批量创建在0.1.25起自动追加编号。

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

## 逐接口请求与返回示例

所有请求携带 `Authorization: Bearer YOUR_API_KEY`。GET参数放查询字符串，POST使用JSON body和 `Content-Type: application/json`。以下UUID换成create返回的user_id。

### 状态、内核与指纹字段

```http
GET /status
GET /api/v1/kernel/list
GET /api/v1/fingerprint/schema
```

```json
{"code":0,"msg":"success","data":{"status":"success","version":"0.1.25"}}
```

kernel/list返回 `data.list`，每项为 kernel_id/engine/version/arch：

```json
{"code":0,"msg":"success","data":{"list":[{"kernel_id":"155.0.8059.79-arm64","engine":"chromium","version":"155.0.8059.79","arch":"arm64"}]}}
```

schema返回 `data.fields`，每项包含key/label/kind/default/enabled，部分字段有options/min/max。select取options，number用JSON数字，toggle用布尔；enabled=false说明对应功能关闭，指定非默认值需先在软件设置开启。

### 创建随机环境，保留指定值

```http
POST /api/v1/user/create
Content-Type: application/json

{
  "name":"自动化环境-1",
  "randomize":true,
  "group_id":"自动化",
  "tags":["测试"],
  "remark":"由本机项目创建",
  "values":{"engine":"chromium","brand":"Chrome","platform":"windows","locale":"zh-CN","timezone":"Asia/Shanghai"},
  "open_urls":["https://example.com"]
}
```

返回的data包含 user_id/name/group_id/remark/tags/seed/kernel_id/proxy_id/extension_ids/open_urls/values/createdAt/updatedAt/archived。例如以下结构（values只展示部分字段，实际返回完整配置）：

```json
{"code":0,"msg":"success","data":{"user_id":"00000000-0000-4000-8000-000000000001","name":"自动化环境-1","seed":"123456789","proxy_id":"","values":{"engine":"chromium","platform":"windows","locale":"zh-CN","timezone":"Asia/Shanghai","geoip":false}}}
```

`randomize:false` 沿用软件预设而不广泛随机；Firefox使用 `values:{"engine":"firefox","brand":"Firefox","platform":"windows"}`。配置可以先创建，但启动前必须有可用内核。

### 分页查询

```http
GET /api/v1/user/list?page=1&page_size=50
GET /api/v1/user/list?user_id=00000000-0000-4000-8000-000000000001
GET /api/v1/user/list?group_id=自动化
```

代码应URL编码中文分组，可用requests.params或URLSearchParams。返回data.list/total/page/page_size。回收站环境不在此列表，不存在ID返回空列表。

### 修改与重新随机

```http
POST /api/v1/user/update
Content-Type: application/json

{"user_id":"00000000-0000-4000-8000-000000000001","name":"改名后","values":{"locale":"en-GB","timezone":"Europe/London"},"tags":["英国"]}
```

默认只修改指定字段，保留种子和其他配置，返回更新后完整环境。需先stop，update后再start。

```http
POST /api/v1/user/random
Content-Type: application/json

{"user_id":"00000000-0000-4000-8000-000000000001","values":{"platform":"windows","locale":"zh-CN","timezone":"Asia/Shanghai"}}
```

random重新生成种子、名称和未固定指纹字段，values指定值保留；name不填重新命名。需关闭环境。重新随机不会清空登录数据，全新环境使用create。

```http
POST /api/v1/fingerprint/random
Content-Type: application/json

{"values":{"platform":"windows","locale":"zh-CN","timezone":"Asia/Shanghai"}}
```

预览不会保存，临时user_id不能直接启动。要使用预览结果，create时选择性传入values/seed/name，不把整个预览对象直接传入。

### 启动、状态与关闭

```http
GET /api/v1/browser/start?user_id=00000000-0000-4000-8000-000000000001
GET /api/v1/browser/active?user_id=00000000-0000-4000-8000-000000000001
GET /api/v1/browser/local-active
GET /api/v1/browser/stop?user_id=00000000-0000-4000-8000-000000000001
```

start默认空白页，传 `&open_tabs=0` 使用启动页和软件首页设置。ip_tab=0/1只是兼容参数，首页由软件设置决定。启动完成后可连接自动化；对已运行环境再次start返回现有信息。

```json
{"code":0,"msg":"success","data":{"ws":{"puppeteer":"ws://127.0.0.1:12345/devtools/browser/示例标识"},"debug_port":"12345","engine":"chromium","automation":"cdp-or-tabs"}}
```

Firefox的ws.puppeteer/debug_port为空字符串、automation为tabs，使用HTTP标签页接口。界面启动的Chromium可能无CDP，先stop再API start。重启后CDP地址可能变化，必须重新获取连接。

active返回data.status=Active/Inactive，phase=running/starting/stopping/closed，只有running为Active；运行中还返回连接信息。local-active返回data.list，每项user_id/status，status是内部阶段。stop等待关闭和释放环境锁，返回 `{"status":"Inactive"}`；已关闭环境重复stop仍成功。

### 标签页控制：Chromium与Firefox共用

```http
POST /api/v1/browser/tabs
Content-Type: application/json

{"user_id":"00000000-0000-4000-8000-000000000001","action":"list"}
```

返回data.list，每项tab/url/title，可能还有dashboard标记（软件首页）。按最新tab编号操作，关页后编号可能变化。

| action | 参数 | 返回data |
| --- | --- | --- |
| list | user_id | list数组 |
| open | user_id、url可选，默认about:blank | 新页url/title |
| goto | user_id、tab默认0、url默认about:blank | url/title |
| content | user_id、tab默认0 | url/title/html |
| click | user_id、selector、tab默认0 | 点击后url/title |
| fill | user_id、selector、text、tab默认0 | 填写后url/title |
| close | user_id、tab默认0 | {"closed":true} |

```json
{"user_id":"00000000-0000-4000-8000-000000000001","action":"open","url":"https://example.com"}
```

```json
{"user_id":"00000000-0000-4000-8000-000000000001","action":"content","tab":0}
```

tab为JSON整数0–1000；url/selector最长2048字符，text最长100000字符。HTTP tabs不提供任意JavaScript执行；Chromium复杂操作用CDP连接Playwright/Puppeteer。

### 永久删除与逐项结果

```http
POST /api/v1/user/delete
Content-Type: application/json

{"user_ids":["00000000-0000-4000-8000-000000000001","00000000-0000-4000-8000-000000000002"]}
```

```json
{"code":0,"msg":"success","data":{"results":[{"user_id":"00000000-0000-4000-8000-000000000001","ok":true},{"user_id":"00000000-0000-4000-8000-000000000002","ok":false,"error":"请先关闭环境并等待数据操作完成"}]}}
```

外层code=0不代表每项成功，必须检查每项ok。不存在ID返回该项失败。刚关闭后文件若被Windows占用，稍等并只重试失败ID。API delete永久清理，不进入可恢复回收站。

软件普通删除进回收站保留三天；0.1.25起“一键清空回收站”点击直接永久清理，不弹二次确认。API目前没有回收站恢复/清空接口。仍被其他环境使用的共用代理和外部自定义下载目录保留。

## Node.js完整自动化示例

Node.js20以上，安装playwright-core。另一个项目保存为automate.mjs：

```powershell
npm install playwright-core
$env:QIJING_API_KEY = '替换为你的Key'
node automate.mjs
```

```javascript
import { chromium } from 'playwright-core';
const base = 'http://127.0.0.1:50325';
const key = process.env.QIJING_API_KEY;
if (!key) throw new Error('请设置QIJING_API_KEY');
async function call(path, data) {
  const response = await fetch(base + path, {
    method: data === undefined ? 'GET' : 'POST',
    headers: { Authorization: 'Bearer ' + key,
      ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: data === undefined ? undefined : JSON.stringify(data),
    signal: AbortSignal.timeout(240000),
  });
  const result = await response.json();
  if (!response.ok || result.code !== 0) throw new Error(result.msg);
  return result.data;
}
const p = await call('/api/v1/user/create', {
  randomize: true,
  values: { engine: 'chromium', brand: 'Chrome', platform: 'windows',
            locale: 'zh-CN', timezone: 'Asia/Shanghai' },
});
try {
  const started = await call('/api/v1/browser/start?user_id=' + p.user_id);
  if (!started.ws.puppeteer) throw new Error('没有CDP地址');
  const browser = await chromium.connectOverCDP(started.ws.puppeteer);
  try {
    const page = await browser.contexts()[0].newPage();
    await page.goto('https://example.com');
    console.log(p.name, await page.title());
  } finally { await browser.close(); }
} finally {
  await call('/api/v1/browser/stop?user_id=' + p.user_id);
  const { results } = await call('/api/v1/user/delete', { user_ids: [p.user_id] });
  if (results.some(item => !item.ok)) throw new Error(JSON.stringify(results));
}
```

Firefox直接使用HTTP tabs的open/list/fill/click/content，无需CDP。

## 另一项目批量创建与代理对应

API create每次创建1个，不接受count或多行原文；调用方循环并在name追加-1/-2。下例沿用前面Python的call函数，第3个复用第2行代理地址。每次user_proxy_config都会创建独立代理记录。

```python
from datetime import datetime
import secrets
import string
import time

def delete_with_retry(ids, attempts=4):
    pending = list(ids)
    failed = []
    for attempt in range(attempts):
        if not pending:
            return
        results = call('/api/v1/user/delete', {'user_ids': pending})['results']
        failed = [item for item in results if not item['ok']]
        pending = [item['user_id'] for item in failed]
        if pending and attempt + 1 < attempts:
            time.sleep(attempt + 1)
    raise RuntimeError(failed)

proxy_rows = [
    {'proxy_soft': 'other', 'proxy_type': 'http', 'proxy_host': 'proxy-one.example',
     'proxy_port': '1000', 'proxy_user': 'user', 'proxy_password': 'password'},
    {'proxy_soft': 'other', 'proxy_type': 'socks5', 'proxy_host': 'proxy-two.example',
     'proxy_port': '2000', 'proxy_user': 'user', 'proxy_password': 'password'},
]
prefix = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(4))
batch_name = prefix + '-' + datetime.now().strftime('%Y%m%d-%H%M%S')
created = []
try:
    for i in range(3):
        payload = {'name': f'{batch_name}-{i + 1}', 'randomize': True,
                   'values': {'engine': 'chromium', 'brand': 'Chrome', 'platform': 'windows'}}
        if proxy_rows:
            payload['user_proxy_config'] = proxy_rows[min(i, len(proxy_rows) - 1)]
        p = call('/api/v1/user/create', payload)
        created.append(p['user_id'])
        print(p['name'], p['user_id'])
    # 这里按软件并发上限启动并自动化环境
finally:
    for uid in created:
        call('/api/v1/browser/stop?user_id=' + uid)
    if created:
        delete_with_retry(created)
```

共用相同代理记录：先创建一个环境获取proxy_id，后续create传该proxy_id，不传user_proxy_config。100个以上环境分组删除，每次最多100个ID。

## 常见问题与调用限制

| 现象 | 原因与处理 |
| --- | --- |
| 连接拒绝 | 软件未打开、服务未启动或端口错误，检查API页面 |
| 401 / Key无效 | Authorization: Bearer KEY，检查Key是否重新生成 |
| 403 | 从本机脚本调用127.0.0.1，不发送网页Origin/Sec-Fetch-Site，不让代理改写Host |
| 404 | 方法或路径不支持，只提供本文接口 |
| 415 | POST缺少Content-Type: application/json |
| 400 / 字段值不支持 | 查询schema检查类型/选项；未知字段或组合冲突报错 |
| 功能未开启 | 先在软件设置明确开启对应功能，API不会绕过开关 |
| 无法启动 | 检查内核引擎匹配、环境未归档、并发数未超上限 |
| ws.puppeteer为空 | Firefox用tabs；界面启动Chromium先stop再API start |
| 修改/删除失败 | 环境仍运行或正在诊断/操作数据，等待后重试 |
| EPERM/EBUSY | 文件被Windows占用，先stop，再只重试失败ID |
| 429 | 同时处理请求达到16个，降低并发并等待 |

POST body上限1MiB，客户端建议240秒超时；跳转最长30秒，click/fill最长15秒。浏览器并发上限由软件设置控制，最多50个。出口IP由代理服务决定，随机指纹不会自己生成新IP。

创建超时可能已保存成功，目前无幂等键。使用唯一name和user/list确认是否存在，再决定是否重试，避免重复环境。软件运行中切换代理会自动重启并使旧CDP失效；API update仍需先关闭。停止软件或重启环境后重新取得连接。

代码入口为src/main/local-api.ts与src/shared/local-api.ts；全部动态指纹字段以/api/v1/fingerprint/schema为准。
