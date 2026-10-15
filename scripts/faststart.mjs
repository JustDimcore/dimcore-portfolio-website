// Moves the MP4 index (the moov box) in front of the media data, so a browser can start playing
// a video without first fetching its end. Same as ffmpeg's `-movflags +faststart`, no re-encoding:
// the boxes are reordered and the chunk offsets in the index are shifted accordingly.
// Files that already have the index in front are left as they are.
//
// usage: node scripts/faststart.mjs <file.mp4 | folder> ...
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

// Boxes on the way from moov down to the chunk offset tables (stco / co64).
const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl']);

function* boxes(buf, start, end) {
  let pos = start;
  while (pos + 8 <= end) {
    let size = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    let header = 8;
    if (size === 1) { size = Number(buf.readBigUInt64BE(pos + 8)); header = 16; }
    else if (size === 0) size = end - pos;
    if (size < header || pos + size > end) throw new Error(`broken ${type} box at ${pos}`);
    yield { type, start: pos, size, header };
    pos += size;
  }
}

function shiftChunkOffsets(buf, start, end, delta) {
  for (const box of boxes(buf, start, end)) {
    const body = box.start + box.header;
    if (box.type === 'stco') {
      const count = buf.readUInt32BE(body + 4);
      for (let i = 0; i < count; i++) {
        const at = body + 8 + i * 4;
        const offset = buf.readUInt32BE(at) + delta;
        if (offset > 0xffffffff) throw new Error('chunk offset overflows stco; the file needs co64');
        buf.writeUInt32BE(offset, at);
      }
    } else if (box.type === 'co64') {
      const count = buf.readUInt32BE(body + 4);
      for (let i = 0; i < count; i++) {
        const at = body + 8 + i * 8;
        buf.writeBigUInt64BE(buf.readBigUInt64BE(at) + BigInt(delta), at);
      }
    } else if (CONTAINERS.has(box.type)) {
      shiftChunkOffsets(buf, body, box.start + box.size, delta);
    }
  }
}

function faststart(file) {
  const buf = readFileSync(file);
  const top = [...boxes(buf, 0, buf.length)];
  const moov = top.find((b) => b.type === 'moov');
  const mdat = top.findIndex((b) => b.type === 'mdat');
  if (!moov || mdat < 0) throw new Error(`${file}: no moov or mdat box`);
  if (moov.start < top[mdat].start) return 'already fast start';

  // Everything from mdat on moves down by the size of the index placed in front of it.
  const index = Buffer.from(buf.subarray(moov.start, moov.start + moov.size));
  shiftChunkOffsets(index, 0, index.length, moov.size);
  const before = top.slice(0, mdat).map((b) => buf.subarray(b.start, b.start + b.size));
  const after = top.slice(mdat).filter((b) => b !== moov).map((b) => buf.subarray(b.start, b.start + b.size));
  writeFileSync(file, Buffer.concat([...before, index, ...after]));
  return `index moved to the front (${(moov.size / 1024).toFixed(1)} KB)`;
}

const files = process.argv.slice(2).flatMap((path) =>
  statSync(path).isDirectory()
    ? readdirSync(path).filter((name) => extname(name).toLowerCase() === '.mp4').map((name) => join(path, name))
    : [path]);
if (!files.length) throw new Error('usage: faststart.mjs <file.mp4 | folder> ...');
for (const file of files) console.log(`${file}: ${faststart(file)}`);
