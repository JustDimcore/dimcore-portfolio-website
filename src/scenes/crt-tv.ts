import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { createCrtScreen, type CrtScreen } from './crt-screen';

// Direction of the Ref_half camera in 3d/CRT_TV.blend (the 3/4 reference photo),
// converted from Blender Z-up to glTF Y-up, then swung towards the TV's front by FRONT_TURN.
const FRONT_TURN = THREE.MathUtils.degToRad(15);
const VIEW_DIR = new THREE.Vector3(-0.6218, -0.2582, -0.7394)
  .normalize()
  .applyAxisAngle(THREE.Object3D.DEFAULT_UP, -FRONT_TURN);
const FOV = 9;                                   // narrow lens, close to the photo's perspective
const FILL = 0.86;                               // share of the frame the silhouette takes at rest
const MAX_YAW = THREE.MathUtils.degToRad(10);    // turn towards the cursor, left-right
const MAX_PITCH = THREE.MathUtils.degToRad(5);   // and up-down
const DAMPING = 4;                               // how fast the tilt follows the cursor, 1/s

export interface CrtTvOptions {
  modelUrl: string;
  /** Video for the screen. Without it the TV shows snow. */
  videoUrl?: string;
}

/**
 * Renders the CRT TV into the container's <canvas>. The TV slightly turns to follow the cursor,
 * its screen plays the video muted; a click on the TV toggles the sound.
 * State goes to the container as data-signal="on|off" and data-sound="on|off".
 * Returns a function that stops rendering and frees GPU resources.
 */
export function mount(container: HTMLElement, { modelUrl, videoUrl }: CrtTvOptions): () => void {
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

  // The rig pivots around the TV's center and carries the shadow-catching floor with it.
  const rig = new THREE.Group();
  scene.add(rig);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.ShadowMaterial({ opacity: 0.55 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  rig.add(floor);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);
  const cameraRight = new THREE.Vector3().crossVectors(VIEW_DIR, new THREE.Vector3(0, 1, 0)).normalize();
  let silhouette: THREE.Vector3[] = [];

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Muted autoplay is the only kind browsers allow; sound comes with a click.
  // With reduced motion the video waits for that click too.
  let screen: CrtScreen | null = null;
  let video: HTMLVideoElement | null = null;
  let wantsPlay = !reducedMotion;
  if (videoUrl) {
    video = document.createElement('video');
    video.src = videoUrl;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.volume = 0.7;
    video.addEventListener('playing', () => { screen?.setSignal(true); container.dataset.signal = 'on'; });
    container.dataset.sound = 'off';
  }

  function playVideo() {
    if (video && wantsPlay && raf && !document.hidden) video.play().catch(() => { /* autoplay refused: stays on snow */ });
  }

  function onClick() {
    if (!video) return;
    wantsPlay = true;
    if (video.paused) {
      video.muted = false;
      playVideo();
    } else {
      video.muted = !video.muted;
    }
    container.dataset.sound = video.muted ? 'off' : 'on';
  }
  if (video) canvas.addEventListener('click', onClick);

  function onVisibilityChange() {
    if (document.hidden) video?.pause();
    else playVideo();
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

  const pointer = new THREE.Vector2();  // where the cursor is, -1..1 around the container center
  const tilt = new THREE.Vector2();     // damped value actually applied to the rig
  const qYaw = new THREE.Quaternion();
  const qPitch = new THREE.Quaternion();

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
    camera.position.copy(target).addScaledVector(VIEW_DIR, -dist);
    camera.lookAt(target);
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
      // Yaw around the world vertical, pitch around the camera's horizontal axis:
      // the TV front turns towards the cursor.
      qYaw.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, tilt.x * MAX_YAW);
      qPitch.setFromAxisAngle(cameraRight, -tilt.y * MAX_PITCH);
      rig.quaternion.multiplyQuaternions(qYaw, qPitch);
      dirty = true;
    }
    // The screen is alive every frame; with reduced motion it stays still until the video plays.
    if (screen && (!reducedMotion || (video && !video.paused))) {
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
    video?.pause();
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
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // The kinescope glass is the only part with screen UVs (see scripts/split-screen.mjs).
      if (mesh.geometry.getAttribute('uv1')) glass = mesh;
    });

    // Put the pivot into the TV's center so it turns in place; the floor stays under it.
    const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
    rig.position.copy(center);
    model.position.sub(center);
    floor.position.y = -center.y - 0.001;
    rig.add(model);

    // Sample the silhouette once in the rest pose; framing fits it instead of the bounding box.
    rig.updateMatrixWorld(true);
    silhouette = [];
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const pos = mesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 2)
        silhouette.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld));
    });

    if (glass) screen = createCrtScreen(glass, video);
    else console.warn('crt-tv: no screen glass in the model, run `npm run model`');

    resize();
    ready = true;
    dirty = true;
    container.classList.add('is-ready');
    if (raf) playVideo();
  }).catch((err) => console.error('crt-tv: failed to load model', err));

  return () => {
    disposed = true;
    stop();
    resizeObserver.disconnect();
    visibility.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    window.removeEventListener('blur', onPointerLeave);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    canvas.removeEventListener('click', onClick);
    if (video) {
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
}
