# 项目维护约定

- 当前项目目录为 `C:\Users\adminuser\Downloads\xijingzhiwen`。不要恢复旧的 `Documents\ChatGPT\杂3\qijing` 项目目录。
- 发行产物放在 `C:\Users\adminuser\Downloads\xijing发行版本\<版本号>`；路径由 `package.json` 和 `scripts/release-path.mjs` 管理。
- GitHub 仓库为 `a06342637/xijingzhiwen`。发布使用 `scripts/publish.mjs`，先完整上传草稿附件再公开，不能替换已公开版本的二进制文件。
- Windows ARM64 与 x64 更新分别使用 `latest-arm64.yml` 和 `latest.yml`。发布前核对各自安装包及 SHA-512。
- 主动卸载清除软件数据及更新缓存；在线更新、覆盖安装保留环境数据。保持应用标识和数据目录兼容。
- 不提交用户环境、密码、Cookie、内核二进制、测试数据、安装包、`node_modules` 或 `.verification`。
- 高级与实验设置使用共享字段登记；新建环境继承预设，已有环境保留自己的配置。
- 核心改动运行 `npm test` 与 `npm run build`；影响界面/浏览器时运行对应隔离 smoke。不要操作用户数据进行测试。
