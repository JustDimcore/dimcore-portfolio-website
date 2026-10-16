// A muted looping video for a TV channel that downloads in chunks as it plays, through
// Media Source Extensions: only a few seconds ahead of the playhead are fetched, so a channel
// watched for a moment costs a chunk or two instead of the whole file.
// The chunks come from scripts/segment-video.mjs (<name>/manifest.json next to <name>.mp4).
// Without MSE or without the manifest the plain MP4 plays instead.

const AHEAD = 8;         // seconds of video kept loaded ahead of the playhead
const RETRIES = 3;       // a chunk that fails to download is tried again this many times,
const RETRY_DELAY = 1;   // after 1 s, 2 s, 3 s

interface Manifest {
  mime: string;
  duration: number;
  init: string;
  segments: { url: string; start: number; end: number }[];
}

export interface ChannelVideo {
  readonly video: HTMLVideoElement;
  /** Starts loading over, after the previous attempt failed. */
  reload(): void;
  dispose(): void;
}

// Safari on iOS 17.1+ has MSE only as ManagedMediaSource.
function mediaSourceClass(): typeof MediaSource | undefined {
  const w = window as unknown as { ManagedMediaSource?: typeof MediaSource; MediaSource?: typeof MediaSource };
  return w.ManagedMediaSource ?? w.MediaSource;
}

async function fetchOk(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res;
}

export function createChannelVideo(url: string): ChannelVideo {
  const video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';

  let stopStream = () => {};

  function playFile() {
    // switching the source cancels a play() already asked for: ask again
    const resume = !video.paused;
    video.src = url;
    if (resume) video.play().catch(() => { /* the caller sees it through the video's events */ });
  }

  function stream(MS: typeof MediaSource) {
    const base = url.replace(/\.mp4$/i, '/');
    const source = new MS();
    const objectUrl = URL.createObjectURL(source);
    let alive = true;
    let buffer: SourceBuffer | null = null;
    let manifest: Manifest | null = null;
    let next = 0;          // index of the next chunk to fetch
    let fetching = false;
    let failures = 0;      // failed attempts at the current chunk
    let retryTimer = 0;    // set while waiting to try a failed chunk again
    let failed = false;    // gave up: the stream ended with an error

    stopStream = () => {
      alive = false;
      clearTimeout(retryTimer);
      video.removeEventListener('timeupdate', pump);
      video.removeEventListener('seeking', pump);
      video.removeEventListener('waiting', pump);
      URL.revokeObjectURL(objectUrl);
    };

    // A chunk that can't be fetched ends the stream with an error: the video fires "error".
    function fail(err: unknown) {
      if (!alive || failed) return;
      failed = true;
      console.warn('channel video:', err);
      if (source.readyState === 'open') source.endOfStream('network');
    }

    // How far the loaded data reaches past the playhead.
    function loadedAhead() {
      const t = video.currentTime;
      const ranges = video.buffered;
      for (let i = 0; i < ranges.length; i++) {
        if (ranges.start(i) <= t + 0.25 && ranges.end(i) > t) return ranges.end(i) - t;
      }
      return 0;
    }

    function pump() {
      if (!alive || failed || retryTimer || fetching) return;
      if (!manifest || !buffer || buffer.updating || source.readyState === 'closed') return;
      if (next >= manifest.segments.length) {
        // everything is in: lets the video reach its end and loop
        if (source.readyState === 'open') source.endOfStream();
        return;
      }
      if (loadedAhead() >= AHEAD) return;
      const chunk = manifest.segments[next];
      fetching = true;
      fetchOk(base + chunk.url)
        .then((res) => res.arrayBuffer())
        .then((data) => {
          fetching = false;
          if (!alive || !buffer) return;
          next++;
          failures = 0;
          buffer.appendBuffer(data);   // "updateend" pumps again
        })
        .catch((err) => {
          fetching = false;
          // a network hiccup shouldn't kill the channel while seconds of video are still loaded
          if (++failures > RETRIES) fail(err);
          else retryTimer = window.setTimeout(() => { retryTimer = 0; pump(); }, RETRY_DELAY * failures * 1000);
        });
    }

    if (MS !== window.MediaSource) video.disableRemotePlayback = true;   // required by ManagedMediaSource
    video.src = objectUrl;
    source.addEventListener('sourceopen', async () => {
      try {
        manifest = (await (await fetchOk(base + 'manifest.json')).json()) as Manifest;
        if (!MS.isTypeSupported(manifest.mime)) throw new Error(`unsupported ${manifest.mime}`);
      } catch {
        // no chunks for this video (or a codec MSE can't take): play the file as it is
        if (!alive) return;
        stopStream();
        playFile();
        return;
      }
      try {
        const init = await (await fetchOk(base + manifest.init)).arrayBuffer();
        if (!alive) return;
        buffer = source.addSourceBuffer(manifest.mime);
        source.duration = manifest.duration;
        buffer.addEventListener('updateend', pump);
        buffer.appendBuffer(init);
        video.addEventListener('timeupdate', pump);
        video.addEventListener('seeking', pump);
        video.addEventListener('waiting', pump);
      } catch (err) {
        fail(err);
      }
    }, { once: true });
  }

  function load() {
    const MS = mediaSourceClass();
    if (MS) stream(MS);
    else playFile();
  }

  function detach() {
    stopStream();
    stopStream = () => {};
    video.pause();
    video.removeAttribute('src');
    video.load();
  }

  load();

  return {
    video,
    reload() {
      detach();
      load();
    },
    dispose: detach,
  };
}
