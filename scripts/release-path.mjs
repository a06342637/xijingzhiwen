import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const pkg=JSON.parse(await fs.readFile(new URL('../package.json',import.meta.url),'utf8'));
export const releaseDir=path.resolve(fileURLToPath(new URL('..',import.meta.url)),pkg.build.directories.output.replace('${version}',pkg.version));
