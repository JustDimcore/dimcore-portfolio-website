// Prepares the game screenshots for the site with ImageMagick:
//   screenshots/<game>/<anything>.{png,jpg,jpeg,webp}   originals, in the order of their names
//   screenshots/<game>/cover.*                          still for the trailer's tile (optional)
// becomes
//   public/shots/<game>/01.webp       full size, long side at most FULL px, loaded only when opened
//   public/shots/<game>/01-thumb.webp small preview, short side THUMB px, a few KB: shown at once
//   src/data/shots.json               what's there, with sizes, for src/data/projects.ts
// The output folder is rebuilt from scratch on every run.
//
// usage: node scripts/shots.mjs   (needs `magick` on PATH, or MAGICK=<path to magick.exe>)
import { execFileSync } from 'node:child_process';
import { readdirSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const SRC = 'screenshots';
const OUT = 'public/shots';
const FULL = 1600;    // px, long side: the viewer rarely shows more
const THUMB = 216;    // px, short side: sharp in a 132 px phone tile at 2x density
const MAGICK = process.env.MAGICK ?? findMagick();

function findMagick() {
  try {
    execFileSync('magick', ['-version'], { stdio: 'ignore' });
    return 'magick';
  } catch {
    // Windows installs it under Program Files without always touching PATH
    const base = 'C:/Program Files';
    const dir = existsSync(base) && readdirSync(base).find((d) => d.startsWith('ImageMagick'));
    if (dir) return join(base, dir, 'magick.exe');
    throw new Error('ImageMagick not found: install it or set MAGICK=<path to magick>');
  }
}

const magick = (...args) => execFileSync(MAGICK, args, { stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();
const IMAGE = /\.(png|jpe?g|webp)$/i;

// sharpened after scaling down; metadata (EXIF, colour profiles) stripped, colours kept as sRGB
function convert(src, out, resize, quality) {
  magick(src, '-auto-orient', '-colorspace', 'sRGB', '-resize', resize, '-unsharp', '0x0.6+0.6+0.01', '-strip', '-quality', String(quality), out);
  const [w, h] = magick('identify', '-format', '%w %h', out).split(' ').map(Number);
  return { w, h };
}

const manifest = {};
rmSync(OUT, { recursive: true, force: true });
for (const game of readdirSync(SRC, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
  const files = readdirSync(join(SRC, game)).filter((f) => IMAGE.test(f)).sort();
  mkdirSync(join(OUT, game), { recursive: true });
  const entry = { cover: null, shots: [] };
  let n = 0;
  for (const file of files) {
    const src = join(SRC, game, file);
    const isCover = basename(file, extname(file)).toLowerCase() === 'cover';
    const name = isCover ? 'cover' : String(++n).padStart(2, '0');
    const thumb = `${name}-thumb.webp`;
    const t = convert(src, join(OUT, game, thumb), `${THUMB}x${THUMB}^`, 60);
    if (isCover) {
      entry.cover = { thumb: `/shots/${game}/${thumb}`, w: t.w, h: t.h };
      continue;
    }
    const full = `${name}.webp`;
    const f = convert(src, join(OUT, game, full), `${FULL}x${FULL}>`, 78);
    entry.shots.push({ src: `/shots/${game}/${full}`, thumb: `/shots/${game}/${thumb}`, w: f.w, h: f.h });
  }
  manifest[game] = entry;
  console.log(`${game}: ${entry.shots.length} screenshots${entry.cover ? ' + cover' : ''}`);
}
writeFileSync('src/data/shots.json', JSON.stringify(manifest, null, 2) + '\n');
