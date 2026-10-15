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

  // grain, scanlines (faded out when they get finer than a pixel), hum bar, flicker
  col += (crtHash(p * 731.0 + fract(t) * 97.0) - 0.5) * 0.06;
  float scanFade = 1.0 - smoothstep(0.3, 0.6, fwidth(p.y * LINES * 0.5));
  col *= mix(1.0, 0.72 + 0.28 * sin(p.y * LINES * 0.5 * TAU), scanFade);
  col *= 0.94 + 0.06 * sin((p.y - t * 0.12) * TAU);
  col *= 0.97 + 0.03 * sin(t * 120.0);

  // vignette toward the dark edge of the tube
  float vignette = smoothstep(0.75, 0.3, length(c * vec2(1.0, 1.15)));
  float inside = step(abs(p.x - 0.5), 0.5) * step(abs(p.y - 0.5), 0.5);
  return max(col, 0.0) * vignette * inside * 0.95;
}
`;

const BLACK = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
BLACK.needsUpdate = true;

export interface CrtScreen {
  /** Advances noise and transitions. */
  update(dt: number): void;
  /** true: switch to the video with a burst of noise; false: back to snow. */
  setSignal(on: boolean): void;
  /** Puts this video on the picture (shown once the signal is on). */
  setVideo(video: HTMLVideoElement): void;
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

  const uniforms = {
    uVideo: { value: BLACK as THREE.Texture },
    uTime: { value: 0 },
    uSignal: { value: 0 },
    uGlitch: { value: 0 },
    uVideoAspect: { value: 4 / 3 },
    uScreenAspect: { value: size.x / size.y },
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

  return {
    update(dt) {
      uniforms.uTime.value = (uniforms.uTime.value + dt) % 1000;
      uniforms.uGlitch.value *= Math.exp(-dt * 4);
      uniforms.uSignal.value += (signalTarget - uniforms.uSignal.value) * (1 - Math.exp(-dt * 12));
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
    dispose() {
      for (const texture of textures.values()) texture.dispose();
      material.dispose();
    },
  };
}
