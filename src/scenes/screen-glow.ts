// The glow behind the TV takes the colour of the picture, like a lamp lit by the screen.
// The current frame is shrunk to a few pixels a few times a second; its average colour,
// brightened to full saturation, goes to the container as CSS variables:
//   --tv-glow: "r g b" (0..255)   --tv-glow-strength: 0.1..1.4

const AMBER = [232, 169, 75];       // no picture yet and the page set no --tv-glow-idle
const SNOW = [205, 210, 220];       // static: cold white
const SAMPLE_EVERY = 0.07;          // s
const EASE = 6;                     // how fast the glow follows the picture, 1/s

export interface ScreenGlow {
  /** Call every frame with the playing video (or null) and whether a picture is on. */
  update(dt: number, video: HTMLVideoElement | null, picture: boolean): void;
}

export function createScreenGlow(container: HTMLElement): ScreenGlow {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 12;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // the page can set its own colour for the glow before there's a picture: --tv-glow-idle: r g b
  const idle = getComputedStyle(container).getPropertyValue('--tv-glow-idle').trim().split(/\s+/).map(Number);
  const IDLE = idle.length === 3 && idle.every(Number.isFinite) ? idle : AMBER;
  const color = [...IDLE];
  const target = [...IDLE];
  let strength = 1;
  let targetStrength = 1;
  let sinceSample = SAMPLE_EVERY;
  let written = '';

  function sample(video: HTMLVideoElement | null, picture: boolean) {
    if (!picture || !video || video.readyState < 2 || !ctx) {
      target.splice(0, 3, ...(video ? SNOW : IDLE));
      targetStrength = video ? 0.55 : 1;
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
    const n = data.length / 4;
    r /= n; g /= n; b /= n;
    // keep the hue, push it to full brightness; the strength follows how bright the frame is
    const max = Math.max(r, g, b, 1);
    target.splice(0, 3, (r / max) * 255, (g / max) * 255, (b / max) * 255);
    // dark scenes nearly put the glow out, bright ones flare it up
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    targetStrength = Math.min(1.4, Math.max(0.1, (Math.max(0, luma - 20) / 110) ** 1.3));
  }

  return {
    update(dt, video, picture) {
      sinceSample += dt;
      if (sinceSample >= SAMPLE_EVERY) {
        sinceSample = 0;
        sample(video, picture);
      }
      const k = 1 - Math.exp(-EASE * dt);
      for (let i = 0; i < 3; i++) color[i] += (target[i] - color[i]) * k;
      strength += (targetStrength - strength) * k;
      if (!Number.isFinite(strength)) strength = targetStrength = 1;
      const value = `${color.map(Math.round).join(' ')}|${strength.toFixed(2)}`;
      if (value === written) return;
      written = value;
      container.style.setProperty('--tv-glow', color.map(Math.round).join(' '));
      container.style.setProperty('--tv-glow-strength', strength.toFixed(2));
    },
  };
}
