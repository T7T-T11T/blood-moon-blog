import { access, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const assetDir = path.resolve(scriptDir, '../src/assets/ggbond');
const files = (await readdir(assetDir)).filter((file) => file.endsWith('.gif'));

for (const file of files) {
  const input = path.join(assetDir, file);
  const output = path.join(assetDir, file.replace(/\.gif$/i, '.webp'));
  try {
    await access(output);
    continue;
  } catch {}

  await sharp(input, { animated: true, pages: -1 })
    .webp({ quality: 76, effort: 6, loop: 0 })
    .toFile(output);

  const [before, after] = await Promise.all([stat(input), stat(output)]);
  const saved = Math.max(0, before.size - after.size);
  console.log(`${file}: ${(before.size / 1024).toFixed(0)}KB → ${(after.size / 1024).toFixed(0)}KB (节省 ${(saved / 1024).toFixed(0)}KB)`);
}
