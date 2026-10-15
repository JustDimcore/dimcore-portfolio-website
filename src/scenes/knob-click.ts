// Click of the channel knob, played from an audio file through Web Audio:
// no delay on click, and quick clicks overlap instead of cutting each other off.

// A freshly opened audio output (more so Bluetooth/USB devices or a sound card waking up from
// power saving) swallows or fades in its first milliseconds. The click is one sharp hit in its
// first ~50 ms, so it never starts earlier than this after the output was opened. The browser
// reports the context as running right away, so its state can't tell a cold output apart.
const OUTPUT_WAKE_UP = 0.12;

export interface ClickSound {
  /** Opens the audio output ahead of the click. Call it on the earliest user gesture (pointerdown). */
  warmUp(): void;
  /** Plays the click. Call it from a user gesture: browsers only start audio after one. */
  play(): void;
}

export function loadClickSound(url: string, volume = 1): ClickSound {
  let ctx: AudioContext | null = null;
  let openedAt = 0;
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
    if (!ctx) {
      ctx = new AudioContext({ latencyHint: 'interactive' });
      openedAt = performance.now();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }

  function start(audio: AudioContext, lead: number) {
    if (!buffer) return;
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const gain = audio.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(audio.destination);
    source.start(audio.currentTime + lead, offset);
  }

  return {
    warmUp() {
      output();
    },
    play() {
      if (!buffer) return;
      const audio = output();
      // usually 0: warmUp() on pointerdown opened the output while the button was held
      const sinceOpened = (performance.now() - openedAt) / 1000;
      start(audio, Math.max(0, OUTPUT_WAKE_UP - sinceOpened));
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
