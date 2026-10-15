import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { createCrtScreen, type CrtScreen } from './crt-screen';
import { loadClickSound } from './knob-click';

// Direction of the Ref_half camera in 3d/CRT_TV.blend (the 3/4 reference photo),
// converted from Blender Z-up to glTF Y-up, then swung towards the TV's front by FRONT_TURN.
const FRONT_TURN = THREE.MathUtils.degToRad(15);
const VIEW_DIR = new THREE.Vector3(-0.6218, -0.2582, -0.7394)
  .normalize()
  .applyAxisAngle(THREE.Object3D.DEFAULT_UP, -FRONT_TURN);
const FOV = 9;                                   // narrow lens, close to the photo's perspective
const FILL = 0.86;                               // share of the frame the silhouette takes at rest
const MAX_YAW = THREE.MathUtils.degToRad(10);    // camera swing as the TV "looks" at the cursor, left-right
const MAX_PITCH = THREE.MathUtils.degToRad(5);   // and up-down
const DAMPING = 4;                               // how fast the view follows the cursor, 1/s

const SWITCH_SNOW = 400;                         // ms of snow between channels, at least
const KNOB_DETENT = THREE.MathUtils.degToRad(30); // channel knob: 12 positions, one per click
const KNOB_TURN = 0.18;                          // s for the knob to snap into the next position

// Fast start and a small overshoot, like a knob dropping into its detent.
function snap(x: number) {
  const c1 = 1.2, c3 = c1 + 1;
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
}

export interface CrtTvOptions {
  modelUrl: string;
  /** Videos for the channels, played muted in a loop. Without them the TV shows snow. */
  videos?: string[];
  /** Called when the TV switches to another channel (also for the first one). */
  onChannel?: (index: number) => void;
  /** Sound of the channel knob clicking into the next position. */
  clickSound?: string;
}

export interface CrtTv {
  /** Switches to the next channel. */
  next(): void;
  /** Stops rendering and frees GPU resources. */
  dispose(): void;
}

/**
 * Renders the CRT TV into the container's <canvas>. The TV slightly turns to follow the cursor,
 * its screen plays the channel videos; a click on the TV switches to the next one through snow.
 * The picture's state goes to the container as data-signal: "on", "off" (snow while the video
 * loads or waits for a click) or "lost" (the channel's video failed to load).
 */
export function mount(container: HTMLElement, { modelUrl, videos: videoUrls = [], onChannel, clickSound }: CrtTvOptions): CrtTv {
  const canvas = container.querySelector('canvas');
  if (!canvas) throw new Error('crt-tv: container has no <canvas>');
  container.dataset.signal = 'off';

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environment = envMap;

  // Soft key light from above-front: only for highlights and the floor shadow,
  // the albedo already carries the photo's lighting.
  const key = new THREE.DirectionalLight(0xfff0dc, 0.9);
  key.position.set(-0.8, 2.4, 1.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 6;
  key.shadow.normalBias = 0.01;
  Object.assign(key.shadow.camera, { left: -0.7, right: 0.7, top: 0.7, bottom: -0.7, near: 0.5, far: 6 });
  scene.add(key);

  // Shadow-catching floor under the TV.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.ShadowMaterial({ opacity: 0.55 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);
  const cameraRight = new THREE.Vector3().crossVectors(VIEW_DIR, new THREE.Vector3(0, 1, 0)).normalize();
  const view = { target: new THREE.Vector3(), dist: 5 };   // framing at rest, set by frame()
  let silhouette: THREE.Vector3[] = [];

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Channels. Video elements are created on first use; the next channel starts buffering
  // as soon as the current one plays. With reduced motion nothing plays until a click.
  let screen: CrtScreen | null = null;
  const videos: HTMLVideoElement[] = [];
  let channel = 0;
  let tuning = 0;                      // bumps on every switch, so late events of old ones are ignored
  let wantsPlay = !reducedMotion;
  // The current channel waits for a click to start: autoplay was refused or motion is reduced.
  // That click turns the channel on instead of switching to the next one.
  let waitingForClick = false;

  function videoFor(index: number) {
    let video = videos[index];
    if (!video) {
      const created = document.createElement('video');
      created.src = videoUrls[index];
      created.muted = true;
      created.loop = true;
      created.playsInline = true;
      created.preload = 'auto';
      // A video that can't load leaves its channel on snow with "NO SIGNAL" in the caption.
      created.addEventListener('error', () => {
        if (created === videos[channel]) container.dataset.signal = 'lost';
      });
      video = videos[index] = created;
    }
    return video;
  }

  function playVideo() {
    if (!videoUrls.length || !raf || !ready || document.hidden) return;
    if (!wantsPlay) {
      waitingForClick = true;
      return;
    }
    const video = videoFor(channel);
    video.play().catch((err: DOMException) => {
      // autoplay refused (power saving, browser settings): stays on snow until a click
      if (err.name === 'NotAllowedError' && video === videos[channel]) waitingForClick = true;
    });
  }

  // Snow first, then the new channel's picture once its video is actually playing.
  function tune(index: number) {
    const token = ++tuning;
    videos[channel]?.pause();
    channel = index;
    waitingForClick = false;
    onChannel?.(index);
    screen?.setSignal(false);
    container.dataset.signal = 'off';

    const video = videoFor(index);
    if (video.error) video.load();   // it failed to load before: try again
    video.currentTime = 0;
    const earliest = performance.now() + SWITCH_SNOW;
    video.addEventListener('playing', () => {
      setTimeout(() => {
        if (token !== tuning || disposed) return;
        screen?.setVideo(video);
        screen?.setSignal(true);
        container.dataset.signal = 'on';
        if (videoUrls.length > 1) videoFor((index + 1) % videoUrls.length);
      }, Math.max(0, earliest - performance.now()));
    }, { once: true });
    playVideo();
  }

  // The channel knob turns clockwise by one detent on every switch, with a click.
  const click = clickSound && videoUrls.length ? loadClickSound(clickSound) : null;
  let knob: THREE.Object3D | null = null;
  let knobFrom = 0;
  let knobTo = 0;
  let knobT = 1;

  function next() {
    if (!videoUrls.length || !ready) return;
    wantsPlay = true;
    if (waitingForClick) {
      waitingForClick = false;
      playVideo();
      return;
    }
    if (knob) {
      knobFrom = knob.rotation.z;
      knobTo -= KNOB_DETENT;
      knobT = 0;
    }
    click?.play();
    tune((channel + 1) % videoUrls.length);
  }
  if (videoUrls.length) canvas.addEventListener('click', next);

  // Open the audio output while the button is still held down, so the first click isn't clipped.
  const warmUpSound = () => click?.warmUp();
  if (click) {
    container.addEventListener('pointerdown', warmUpSound);
    container.addEventListener('keydown', warmUpSound);
  }

  function onVisibilityChange() {
    if (document.hidden) videos[channel]?.pause();
    else playVideo();
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

  const pointer = new THREE.Vector2();  // where the cursor is, -1..1 around the container center
  const tilt = new THREE.Vector2();     // damped value actually applied to the camera
  const qYaw = new THREE.Quaternion();
  const qPitch = new THREE.Quaternion();
  const orbit = new THREE.Quaternion();
  const orbitDir = new THREE.Vector3();

  let ready = false;
  let dirty = true;
  let disposed = false;
  let raf = 0;
  let last = 0;

  function frame() {
    if (!silhouette.length) return;
    const target = new THREE.Box3().setFromPoints(silhouette).getCenter(new THREE.Vector3());
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    const p = new THREE.Vector3();
    let dist = 5;
    for (let i = 0; i < 4; i++) {
      camera.position.copy(target).addScaledVector(VIEW_DIR, -dist);
      camera.lookAt(target);
      camera.updateMatrixWorld();
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const v of silhouette) {
        p.copy(v).project(camera);
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      }
      // Re-center the silhouette in the frame, then scale the distance so it fills FILL of it.
      const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      up.setFromMatrixColumn(camera.matrixWorld, 1);
      target.addScaledVector(right, ((minX + maxX) / 2) * halfH * camera.aspect)
            .addScaledVector(up, ((minY + maxY) / 2) * halfH);
      dist *= Math.max((maxX - minX) / 2, (maxY - minY) / 2) / FILL;
    }
    view.target.copy(target);
    view.dist = dist;
    placeCamera();
  }

  // The TV "looks" at the cursor, but it's the camera that moves: it orbits the framing target
  // the opposite way, so the TV, its light and its shadow stay exactly as they are.
  function placeCamera() {
    qYaw.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, -tilt.x * MAX_YAW);
    qPitch.setFromAxisAngle(cameraRight, tilt.y * MAX_PITCH);
    orbitDir.copy(VIEW_DIR).applyQuaternion(orbit.multiplyQuaternions(qPitch, qYaw));
    camera.position.copy(view.target).addScaledVector(orbitDir, -view.dist);
    camera.lookAt(view.target);
  }

  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    frame();
    dirty = true;
  }

  function tick(now: number) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min((now - (last || now)) / 1000, 0.1);
    last = now;
    const k = 1 - Math.exp(-DAMPING * dt);
    if (Math.abs(pointer.x - tilt.x) + Math.abs(pointer.y - tilt.y) > 1e-4) {
      tilt.x += (pointer.x - tilt.x) * k;
      tilt.y += (pointer.y - tilt.y) * k;
      placeCamera();
      dirty = true;
    }
    if (knob && knobT < 1) {
      knobT = Math.min(1, knobT + dt / KNOB_TURN);
      knob.rotation.z = knobFrom + (knobTo - knobFrom) * snap(knobT);
      dirty = true;
    }
    // The screen is alive every frame; with reduced motion it stays still until the video plays.
    if (screen && (!reducedMotion || videos[channel]?.paused === false)) {
      screen.update(dt);
      dirty = true;
    }
    if (ready && dirty) {
      renderer.render(scene, camera);
      dirty = false;
    }
  }

  function start() {
    if (raf || disposed) return;
    last = 0;
    raf = requestAnimationFrame(tick);
    if (ready) playVideo();
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    videos[channel]?.pause();
  }

  function onPointerMove(e: PointerEvent) {
    const r = container.getBoundingClientRect();
    pointer.set(
      THREE.MathUtils.clamp((e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2), -1, 1),
      THREE.MathUtils.clamp(-(e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2), -1, 1),
    );
  }
  function onPointerLeave() {
    pointer.set(0, 0);
  }

  if (!reducedMotion) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('blur', onPointerLeave);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  // Don't spend frames while the TV is scrolled out of view.
  const visibility = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
  visibility.observe(container);

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  loader.loadAsync(modelUrl).then((gltf) => {
    if (disposed) return;
    const model = gltf.scene;
    let glass: THREE.Mesh | undefined;
    const anisotropy = renderer.capabilities.getMaxAnisotropy();
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // sharper textures on faces seen at an angle
      for (const value of Object.values(mesh.material)) if (value instanceof THREE.Texture) value.anisotropy = anisotropy;
      // The kinescope glass is the only part with screen UVs (see scripts/split-screen.mjs).
      if (mesh.geometry.getAttribute('uv1')) glass = mesh;
    });

    // The channel knob turns around its own axis (model Z). Its node origin isn't on that axis
    // after quantization, so it hangs on a pivot placed where the model says (scripts/split-screen.mjs).
    const knobMesh = model.getObjectByName('Channel_Knob');
    const knobPivot = knobMesh?.userData.pivot as [number, number, number] | undefined;
    if (knobMesh && knobPivot) {
      knob = new THREE.Object3D();
      knob.position.fromArray(knobPivot);
      model.add(knob);
      model.updateMatrixWorld(true);
      knob.attach(knobMesh);
    } else {
      console.warn('crt-tv: no channel knob pivot in the model, run `npm run model`');
    }

    scene.add(model);
    floor.position.y = new THREE.Box3().setFromObject(model).min.y - 0.001;

    // Sample the silhouette once; framing fits it instead of the bounding box.
    model.updateMatrixWorld(true);
    silhouette = [];
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const pos = mesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 2)
        silhouette.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld));
    });

    if (glass) screen = createCrtScreen(glass);
    else console.warn('crt-tv: no screen glass in the model, run `npm run model`');

    resize();
    ready = true;
    dirty = true;
    container.classList.add('is-ready');
    if (videoUrls.length) tune(0);
  }).catch((err) => console.error('crt-tv: failed to load model', err));

  const dispose = () => {
    disposed = true;
    stop();
    resizeObserver.disconnect();
    visibility.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    window.removeEventListener('blur', onPointerLeave);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    canvas.removeEventListener('click', next);
    container.removeEventListener('pointerdown', warmUpSound);
    container.removeEventListener('keydown', warmUpSound);
    for (const video of videos) {
      if (!video) continue;
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    screen?.dispose();
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      for (const m of ([] as THREE.Material[]).concat(mesh.material)) {
        for (const value of Object.values(m)) if (value instanceof THREE.Texture) value.dispose();
        m.dispose();
      }
    });
    envMap.dispose();
    renderer.dispose();
  };

  return { next, dispose };
}
