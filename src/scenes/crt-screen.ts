import * as THREE from 'three';

// Picture of an old CRT on the kinescope glass. Injected into the glass' own PBR material,
// so reflections and dirt from the model's textures stay on top of the picture.
const CRT_GLSL = /* glsl */ `
uniform sampler2D uVideo;
uniform float uTime;
uniform float uSignal;       // 0 = snow, 1 = picture
uniform float uGlitch;       // burst of tearing when the channel switches
uniform float uVideoAspect;
uniform float uScreenAspect;
uniform sampler2D uOsd;      // channel number drawn on a canvas
uniform float uOsdAlpha;
uniform float uPower;        // 0 = off, 1 = on; in between the tube is warming up
varying vec2 vScreenUv;

float crtHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// The video fills the screen (cover), cropping the sides of a wide frame.
vec3 crtSample(vec2 uv) {
  vec2 fit = vec2(min(1.0, uScreenAspect / uVideoAspect), min(1.0, uVideoAspect / uScreenAspect));
  return texture2D(uVideo, (uv - 0.5) * fit + 0.5).rgb;
}

vec3 crtPicture(vec2 uv) {
  const float LINES = 240.0;
  const float TAU = 6.2831853;
  float t = uTime;

  // a little extra barrel on top of the bulged glass
  vec2 c = uv - 0.5;
  c *= 1.0 + 0.1 * dot(c, c);
  vec2 p = c + 0.5;

  // VHS: per-line jitter, a slow tracking band that tears lines, bursts on channel switch
  float line = floor(p.y * LINES);
  float jitter = (crtHash(vec2(line, floor(t * 30.0))) - 0.5) * 0.002;
  float band = smoothstep(0.04, 0.0, abs(p.y - (1.0 - fract(t * 0.05))));
  float tear = band * (crtHash(vec2(line, floor(t * 20.0))) - 0.5) * 0.025;
  float wave = sin(p.y * 40.0 + t * 2.0) * 0.0006;
  float burst = uGlitch * (crtHash(vec2(floor(p.y * 18.0), floor(t * 24.0))) - 0.5) * 0.12;
  vec2 q = vec2(p.x + jitter + tear + wave + burst, p.y);

  // chroma shift growing toward the edges, plus horizontal colour bleed
  float ca = 0.002 + 0.006 * dot(c, c);
  vec3 col = vec3(crtSample(q + vec2(ca, 0.0)).r, crtSample(q).g, crtSample(q - vec2(ca, 0.0)).b);
  col = mix(col, crtSample(q - vec2(0.005, 0.0)), 0.2);

  // old-set grade: more contrast, a bit less saturation, warm cast; the tracking band is brighter
  col = pow(col, vec3(1.25));
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, 0.8) * vec3(1.05, 1.0, 0.9) + 0.008 + band * 0.04;

  // snow without signal and through the channel switch
  float snow = crtHash(floor(p * vec2(360.0, LINES)) + fract(t * 7.13) * 431.0);
  col = mix(vec3(snow * 0.8), col, uSignal * (1.0 - uGlitch * 0.6));

  // on-screen channel number in the top left corner, green like old TVs
  vec2 o = (p - vec2(0.07, 0.75)) / vec2(0.32, 0.16);
  if (o.x > 0.0 && o.x < 1.0 && o.y > 0.0 && o.y < 1.0) {
    float osd = texture2D(uOsd, o).a * uOsdAlpha;
    col = mix(col, vec3(0.35, 1.0, 0.45) * 1.3, osd);
  }

  // grain, scanlines (faded out when they get finer than a pixel), hum bar, flicker
  col += (crtHash(p * 731.0 + fract(t) * 97.0) - 0.5) * 0.06;
  float scanFade = 1.0 - smoothstep(0.3, 0.6, fwidth(p.y * LINES * 0.5));
  col *= mix(1.0, 0.72 + 0.28 * sin(p.y * LINES * 0.5 * TAU), scanFade);
  col *= 0.94 + 0.06 * sin((p.y - t * 0.12) * TAU);
  col *= 0.97 + 0.03 * sin(t * 120.0);

  // vignette toward the dark edge of the tube
  float vignette = smoothstep(0.75, 0.3, length(c * vec2(1.0, 1.15)));
  float inside = step(abs(p.x - 0.5), 0.5) * step(abs(p.y - 0.5), 0.5);

  // switching on: a bright line spreads sideways, then opens up into the picture
  float spread = smoothstep(0.0, 0.35, uPower);
  float open = mix(0.004, 1.2, smoothstep(0.3, 1.0, uPower));
  float tube = step(abs(c.x), 0.5 * spread) * smoothstep(open, open * 0.5, abs(c.y));
  float flash = 1.0 - smoothstep(0.3, 0.9, uPower);
  col = mix(col, vec3(1.0), flash * 0.85) * (1.0 + 2.5 * flash);
  col *= mix(tube, 1.0, step(0.999, uPower));

  return max(col, 0.0) * vignette * inside * 0.95;
}
`;

const POWER_ON = 0.45;   // s for the tube to light up
const OSD_TIME = 1.5;    // s the channel number stays, fade included
const OSD_FADE = 0.2;    // s of it fading out

const BLACK = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
BLACK.needsUpdate = true;

export interface CrtScreen {
  /** Advances noise and transitions. */
  update(dt: number): void;
  /** true: switch to the video with a burst of noise; false: back to snow. */
  setSignal(on: boolean): void;
  /** Puts this video on the picture (shown once the signal is on). */
  setVideo(video: HTMLVideoElement): void;
  /** Puts a still on the picture instead (a screenshot); width / height of it. */
  setImage(texture: THREE.Texture, aspect: number): void;
  /** Switches the tube on: a line that opens into the picture, or at once. */
  powerOn(instant?: boolean): void;
  /** Shows the channel number in the corner of the screen for a moment. */
  showChannel(number: number): void;
  dispose(): void;
}

/**
 * Turns the glass mesh into a CRT screen. The mesh needs planar screen UVs in `uv1`
 * (TEXCOORD_1, written by scripts/split-screen.mjs).
 */
export function createCrtScreen(mesh: THREE.Mesh): CrtScreen {
  const geometry = mesh.geometry;
  geometry.setAttribute('screenUv', geometry.getAttribute('uv1'));
  geometry.deleteAttribute('uv1');

  const size = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
  const textures = new Map<HTMLVideoElement, THREE.VideoTexture>();

  // the channel number is drawn here and laid over the picture by the shader
  const osdCanvas = document.createElement('canvas');
  osdCanvas.width = 256;
  osdCanvas.height = 128;
  const osdCtx = osdCanvas.getContext('2d')!;
  const osd = new THREE.CanvasTexture(osdCanvas);

  const uniforms = {
    uVideo: { value: BLACK as THREE.Texture },
    uTime: { value: 0 },
    uSignal: { value: 0 },
    uGlitch: { value: 0 },
    uVideoAspect: { value: 4 / 3 },
    uScreenAspect: { value: size.x / size.y },
    uOsd: { value: osd },
    uOsdAlpha: { value: 0 },
    uPower: { value: 0 },
  };

  const original = mesh.material as THREE.MeshStandardMaterial;
  const material = original.clone();
  // Room reflections would lay a grey veil over the picture; keep only a hint of them.
  material.envMapIntensity = 0.3;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 screenUv;\nvarying vec2 vScreenUv;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvScreenUv = screenUv;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${CRT_GLSL}`)
      // the lit tube is dark glass: keep its reflections, drop most of the photo's albedo
      .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb *= 0.15;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += crtPicture(vScreenUv);');
  };
  material.customProgramCacheKey = () => 'crt-screen';
  mesh.material = material;

  let signalTarget = 0;
  let powering = false;
  let osdLeft = 0;   // s the channel number stays on screen

  return {
    update(dt) {
      uniforms.uTime.value = (uniforms.uTime.value + dt) % 1000;
      uniforms.uGlitch.value *= Math.exp(-dt * 4);
      uniforms.uSignal.value += (signalTarget - uniforms.uSignal.value) * (1 - Math.exp(-dt * 12));
      if (powering) uniforms.uPower.value = Math.min(1, uniforms.uPower.value + dt / POWER_ON);
      osdLeft = Math.max(0, osdLeft - dt);
      uniforms.uOsdAlpha.value = Math.min(1, osdLeft / OSD_FADE);
    },
    powerOn(instant = false) {
      powering = true;
      if (instant) uniforms.uPower.value = 1;
    },
    showChannel(number) {
      osdCtx.clearRect(0, 0, osdCanvas.width, osdCanvas.height);
      osdCtx.font = '700 84px "JetBrains Mono Variable", ui-monospace, monospace';
      osdCtx.textBaseline = 'middle';
      osdCtx.fillStyle = '#fff';
      osdCtx.fillText(`CH ${String(number).padStart(2, '0')}`, 4, osdCanvas.height / 2);
      osd.needsUpdate = true;
      osdLeft = OSD_TIME;
    },
    setSignal(on) {
      const target = on ? 1 : 0;
      if (target === signalTarget) return;
      signalTarget = target;
      uniforms.uGlitch.value = 1;
    },
    setVideo(video) {
      let texture = textures.get(video);
      if (!texture) {
        texture = new THREE.VideoTexture(video);
        texture.colorSpace = THREE.SRGBColorSpace;
        textures.set(video, texture);
      }
      uniforms.uVideo.value = texture;
      if (video.videoHeight) uniforms.uVideoAspect.value = video.videoWidth / video.videoHeight;
    },
    setImage(texture, aspect) {
      uniforms.uVideo.value = texture;
      uniforms.uVideoAspect.value = aspect;
      uniforms.uGlitch.value = 0.5;   // a short jolt, like the tube catching a new picture
    },
    dispose() {
      for (const texture of textures.values()) texture.dispose();
      osd.dispose();
      material.dispose();
    },
  };
}
