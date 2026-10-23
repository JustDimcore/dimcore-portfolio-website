// Click of the channel knob, played from an audio file through Web Audio:
// no delay on click, and quick clicks overlap instead of cutting each other off.

// The file is mastered loud: the click plays this many dB quieter than it is.
const VOLUME_DB = -10;

export interface ClickSound {
  /** Plays the click. Call it from a user gesture: browsers only start audio after one. */
  play(): void;
}

export function loadClickSound(url: string, volume = 10 ** (VOLUME_DB / 20)): ClickSound {
  let ctx: AudioContext | null = null;
  let buffer: AudioBuffer | null = null;
  let offset = 0;

  // Decoding doesn't need a running AudioContext, so the sound is ready before the first click.
  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return res.arrayBuffer();
    })
    .then((data) => new OfflineAudioContext(1, 1, 48000).decodeAudioData(data))
    .then((decoded) => {
      buffer = decoded;
      offset = soundStart(decoded);
    })
    .catch((err) => console.warn('crt-tv: click sound failed to load', err));

  // Audio may only start inside a user gesture, so the context is created on the first one.
  function output() {
    ctx ??= new AudioContext({ latencyHint: 'interactive' });
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }

  function start(audio: AudioContext) {
    if (!buffer) return;
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const gain = audio.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(audio.destination);
    source.start(audio.currentTime, offset);
  }

  return {
    play() {
      if (buffer) start(output());
    },
  };
}

// Where the sound actually begins: mp3 files start with a few ms of encoder padding,
// which would make the click lag behind the knob.
function soundStart(buffer: AudioBuffer, threshold = 0.02) {
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    if (Math.abs(data[i]) > threshold) return Math.max(0, i / buffer.sampleRate - 0.003);
  }
  return 0;
}
