# Third party software

Qijing is an independent manager for Chromix; it is not an official Chromix product.

The local startup dashboard bundles a WOFF2 subset of Noto Sans CJK SC Regular,
from notofonts/noto-cjk tag Sans2.004 (SIL Open Font License 1.1).
Original license: resources/dashboard-font-LICENSE.txt (installed in dist/).
This font is served only to the local dashboard and does not change browser
font whitelists for external sites. Noto fonts are not proprietary fonts.

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

Optional Python diagnostic components now download msvc-runtime 14.51.36231
from PyPI using pinned SHA-256 for each architecture. Its Microsoft Visual C++
DLLs are kept unmodified in the component directory and used under the Visual
Studio Distributable Code terms. The wheel's license/metadata are retained in
the component runtime-license directory. Runtime binaries are not bundled in
the Qijing installer; no system-wide runtime installation is performed.

The bundled Chromix Node GeoIP adapter is locally extended to preserve validated country/region/city/ISP metadata for proxy display; upstream response parsing and no-direct-fallback behavior remain. This local modification is covered by its BSD-3-Clause license.
