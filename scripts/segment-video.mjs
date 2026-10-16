// Cuts each MP4 into fragmented-MP4 chunks for streaming with Media Source Extensions:
//   <name>/init.mp4       codec setup, appended first
//   <name>/000.m4s ...    chunks of SEGMENT_SAMPLES frames, each starting on a keyframe
//   <name>/manifest.json  MIME type, duration and the chunks' times
// The page loads the chunks one by one as the video plays (src/scenes/channel-video.ts).
// The MP4 itself stays as the fallback for browsers without MSE.
//
// usage: node scripts/segment-video.mjs <file.mp4 | folder> ...
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { createFile, MP4BoxBuffer } from 'mp4box';

const SEGMENT_SAMPLES = 120;   // ~4 s at 30 fps; a chunk ends on the next keyframe after that

function segment(file) {
  const outDir = join(dirname(file), basename(file, extname(file)));
  const mp4 = createFile();
  const chunks = [];
  let movie;
  let init;

  mp4.onError = (err) => { throw new Error(`${file}: ${err}`); };
  mp4.onReady = (info) => {
    movie = info;
    const track = info.videoTracks[0];
    if (!track) throw new Error(`${file}: no video track`);
    mp4.setSegmentOptions(track.id, null, { nbSamples: SEGMENT_SAMPLES, rapAlignement: true });
    init = mp4.initializeSegmentation();
    mp4.start();
  };
  mp4.onSegment = (id, user, buffer, nextSample) => chunks.push({ buffer, nextSample });

  const data = readFileSync(file);
  mp4.appendBuffer(MP4BoxBuffer.fromArrayBuffer(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), 0), true);
  mp4.flush();
  if (!movie || !init) throw new Error(`${file}: could not read the movie`);

  // Presentation times of each chunk, from the samples it holds.
  const track = movie.videoTracks[0];
  const samples = mp4.getTrackSamplesInfo(track.id);
  const time = (s) => s.cts / s.timescale;
  let first = 0;
  const segments = chunks.map(({ buffer, nextSample }, i) => {
    const inChunk = samples.slice(first, nextSample);
    first = nextSample;
    const start = Math.min(...inChunk.map(time));
    const end = Math.max(...inChunk.map((s) => (s.cts + s.duration) / s.timescale));
    return { url: `${String(i).padStart(3, '0')}.m4s`, start: +start.toFixed(3), end: +end.toFixed(3), bytes: buffer.byteLength, buffer };
  });

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'init.mp4'), Buffer.from(init.buffer));
  for (const s of segments) writeFileSync(join(outDir, s.url), Buffer.from(s.buffer));
  const manifest = {
    mime: `video/mp4; codecs="${track.codec}"`,
    duration: +(movie.duration / movie.timescale).toFixed(3),
    init: 'init.mp4',
    segments: segments.map(({ buffer, ...s }) => s),
  };
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  const sizes = segments.map((s) => s.bytes);
  return `${segments.length} chunks, ${manifest.mime}, ` +
    `${(Math.min(...sizes) / 1024).toFixed(0)}–${(Math.max(...sizes) / 1024).toFixed(0)} KB, ` +
    `first ${segments[0].start}–${segments[0].end} s`;
}

const files = process.argv.slice(2).flatMap((path) =>
  statSync(path).isDirectory()
    ? readdirSync(path).filter((name) => extname(name).toLowerCase() === '.mp4').map((name) => join(path, name))
    : [path]);
if (!files.length) throw new Error('usage: segment-video.mjs <file.mp4 | folder> ...');
for (const file of files) console.log(`${file}: ${segment(file)}`);
