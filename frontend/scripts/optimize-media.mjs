/**
 * 媒体资源批量优化脚本
 * 作用：压缩 public 下的文章封面/配图 PNG，以及 GGBond 贴纸 WebP/大 JPEG。
 * 原则：保持文件名与扩展名不变（文章中的引用 URL 不受影响），仅重编码。
 * 运行：node scripts/optimize-media.mjs
 */
import { readdirSync, statSync, copyFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(scriptDir, '..');

const targets = [
  // 文章封面（截图类大图）：重采样 + 调色板 PNG 压缩
  { dir: 'public/article-covers', maxWidth: 1600, encode: 'png' },
  // 文章配图（海报/图形类）：同上
  { dir: 'public/article-assets', maxWidth: 1400, encode: 'png' },
  // GGBond 贴纸：输出格式必须与扩展名一致（jpg→jpeg，webp→webp）
  { dir: 'src/assets/ggbond', ext: /\.(webp|jpg|jpeg)$/i, maxWidth: 420, forceJpg: true }
];

let totalBefore = 0;
let totalAfter = 0;

for (const t of targets) {
  const dir = path.join(frontendDir, t.dir);
  const files = readdirSync(dir).filter((f) => {
    if (!/\.(png|webp|jpg|jpeg)$/i.test(f)) return false;
    if (t.ext && !t.ext.test(f)) return false;
    return true;
  });

  for (const file of files) {
    const input = path.join(dir, file);
    const before = statSync(input).size;
    const meta = await sharp(input).metadata();
    const outWidth = Math.min(meta.width, t.maxWidth || 99999);

    try {
      let img = sharp(input, { failOn: 'none' }).rotate();
      if (meta.width > outWidth) img = img.resize({ width: outWidth, withoutEnlargement: true });
      // 输出编码与源扩展名保持一致；jpg 强制重编码为真正的 JPEG
      const isJpg = /\.jpe?g$/i.test(file);
      const encode = isJpg ? 'jpeg' : (t.encode || 'webp');
      let out;
      if (encode === 'png') {
        // 调色板量化：对截图/图形类图片压缩率极高，兼容所有浏览器
        out = await img.png({ palette: true, quality: 88, effort: 9 }).toBuffer();
      } else if (encode === 'jpeg') {
        out = await img.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
      } else {
        out = await img.webp({ quality: 78, effort: 6 }).toBuffer();
      }
      if (!t.forceJpg && out.length >= before) {
        console.log(`${file}: 已是最优，跳过 (${(before / 1024).toFixed(0)}KB)`);
        totalBefore += before; totalAfter += before;
        continue;
      }
      // Windows 下不能写回正在读取的文件：先写临时文件再复制覆盖（带重试，避开文件监视进程的瞬时锁）
      const tmp = input + '.tmp';
      await sharp(out).toFile(tmp);
      let copied = false;
      for (let attempt = 1; attempt <= 5 && !copied; attempt++) {
        try {
          copyFileSync(tmp, input);
          unlinkSync(tmp);
          copied = true;
        } catch (err) {
          if (attempt === 5) {
            // Node 的 copyFile 在 Windows 上可能被文件监视进程锁定，回退到 PowerShell Copy-Item
            const ps = spawnSync('powershell', [
              '-NoProfile', '-Command',
              `Copy-Item -LiteralPath '${tmp}' -Destination '${input}' -Force; Remove-Item -LiteralPath '${tmp}' -Force`
            ], { encoding: 'utf8' });
            if (ps.status !== 0) throw err;
            copied = true;
          } else {
            await new Promise((r) => setTimeout(r, 400 * attempt));
          }
        }
      }
      totalBefore += before; totalAfter += out.length;
      const saved = ((before - out.length) / 1024).toFixed(0);
      const pct = ((1 - out.length / before) * 100).toFixed(0);
      console.log(`${file}: ${(before / 1024).toFixed(0)}KB → ${(out.length / 1024).toFixed(0)}KB (节省 ${saved}KB / ${pct}%)`);
    } catch (e) {
      console.log(`ERR ${file}: ${e.message}`);
    }
  }
}

console.log(`\n合计: ${(totalBefore / 1024 / 1024).toFixed(2)}MB → ${(totalAfter / 1024 / 1024).toFixed(2)}MB (节省 ${((totalBefore - totalAfter) / 1024 / 1024).toFixed(2)}MB)`);
