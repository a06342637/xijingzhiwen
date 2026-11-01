# Third party software

Qijing is an independent manager for Chromix; it is not an official Chromix product.

The bundled Chromix Node/Python SDK and diagnostic sources are from
https://github.com/xiaozhou26/Chromix at bf3221bcfa08b652ff62a44f52ccce393ef1d351,
licensed under BSD-3-Clause. Original licenses are retained under vendor/ and
installed application resources. Upstream SDK automation helpers are not exposed
as Qijing product features.

Electron: MIT, https://github.com/electron/electron
React / React DOM: MIT, https://github.com/facebook/react
Playwright: Apache-2.0, https://github.com/microsoft/playwright
SQL.js / SQLite: MIT / public domain, https://github.com/sql-js/sql.js
Lucide: ISC, https://github.com/lucide-icons/lucide
Zod: MIT, https://github.com/colinhacks/zod
yauzl: MIT, https://github.com/thejoshwolfe/yauzl

The installed runtime retains node_modules package licenses. A complete locked
dependency license inventory is generated at build time into dist/licenses/.

Chromix browser downloads retain their full Chromium/third-party license files.
Python runtime downloads retain the PSF license; Python dependencies retain their
wheel license metadata. Widevine and proprietary fonts are not redistributed.

electron-updater: MIT, https://github.com/electron-userland/electron-builder

Firefox adapter uses a pinned second Playwright driver 1.62.0 (Apache-2.0).
Camoufox browser: https://github.com/daijro/camoufox (MPL-2.0 and bundled third-party notices). The native property adapter is implemented in Qijing; no Camoufox Node SDK or browser binaries are bundled. Full browser license files are retained on download.
