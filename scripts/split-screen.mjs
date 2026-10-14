// Cuts the kinescope glass out of the TV mesh into its own primitive, so the page can
// render video on it. The glass gets a "Screen" material and a planar TEXCOORD_1 (0..1
// across the glass, v up) for the picture; everything else stays untouched.
//
// usage: node scripts/split-screen.mjs <in.glb> <out.glb>
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('usage: split-screen.mjs <in.glb> <out.glb>');

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
const root = doc.getRoot();
const buffer = root.listBuffers()[0];
const mesh = root.listMeshes()[0];
const prim = mesh.listPrimitives()[0];

const pos = prim.getAttribute('POSITION');
const nrm = prim.getAttribute('NORMAL');
const indices = prim.getIndices().getArray();

// Connected triangle groups. Vertices are already split along UV seams and hard edges,
// so the glass comes out as a group of its own.
const parent = Int32Array.from({ length: pos.getCount() }, (_, i) => i);
const find = (a) => { while (parent[a] !== a) a = parent[a] = parent[parent[a]]; return a; };
for (let t = 0; t < indices.length; t += 3) {
  const a = find(indices[t]);
  parent[find(indices[t + 1])] = a;
  parent[find(indices[t + 2])] = a;
}

const groups = new Map();
const p = [], n = [];
for (let t = 0; t < indices.length; t += 3) {
  const root = find(indices[t]);
  let g = groups.get(root);
  if (!g) groups.set(root, (g = { tris: [], min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity], n: [0, 0, 0] }));
  g.tris.push(t);
  for (let k = 0; k < 3; k++) {
    pos.getElement(indices[t + k], p);
    nrm.getElement(indices[t + k], n);
    for (let i = 0; i < 3; i++) {
      g.min[i] = Math.min(g.min[i], p[i]);
      g.max[i] = Math.max(g.max[i], p[i]);
      g.n[i] += n[i];
    }
  }
}

// The glass: a large front-facing (+Z) panel on the left of the front, not spanning the full width
// like the bezel does. Body is 0.40 m wide; the glass is about 0.26 x 0.22 m.
const glass = [...groups.values()].filter((g) => {
  const facing = g.n[2] / Math.hypot(...g.n);
  const w = g.max[0] - g.min[0];
  const h = g.max[1] - g.min[1];
  return facing > 0.95 && g.tris.length >= 100 && w > 0.2 && w < 0.3 && h > 0.15 && h < 0.25;
});
if (glass.length !== 1) throw new Error(`expected exactly one glass group, found ${glass.length}`);
const [screen] = glass;

// Rebuild index buffers: the body keeps everything except the glass triangles,
// the glass gets its own compact vertex set.
const isScreen = new Set(screen.tris);
const IndexArray = indices.constructor;
const bodyIndices = [];
const screenIndices = [];
const remap = new Map();
for (let t = 0; t < indices.length; t += 3) {
  for (let k = 0; k < 3; k++) {
    const v = indices[t + k];
    if (!isScreen.has(t)) { bodyIndices.push(v); continue; }
    if (!remap.has(v)) remap.set(v, remap.size);
    screenIndices.push(remap.get(v));
  }
}
prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(IndexArray.from(bodyIndices)).setBuffer(buffer));

const material = prim.getMaterial().clone().setName('Screen');
const screenPrim = doc.createPrimitive()
  .setMaterial(material)
  .setIndices(doc.createAccessor().setType('SCALAR').setArray(IndexArray.from(screenIndices)).setBuffer(buffer));

for (const semantic of prim.listSemantics()) {
  const src = prim.getAttribute(semantic);
  const size = src.getElementSize();
  const raw = src.getArray();
  const array = new raw.constructor(remap.size * size);
  for (const [from, to] of remap) array.set(raw.subarray(from * size, from * size + size), to * size);
  screenPrim.setAttribute(semantic, doc.createAccessor()
    .setType(src.getType()).setNormalized(src.getNormalized()).setArray(array).setBuffer(buffer));
}

// Planar UVs across the glass, front view: u to the right, v up.
const [x0, y0] = screen.min;
const [x1, y1] = screen.max;
const uv = new Float32Array(remap.size * 2);
for (const [from, to] of remap) {
  pos.getElement(from, p);
  uv[to * 2] = (p[0] - x0) / (x1 - x0);
  uv[to * 2 + 1] = (p[1] - y0) / (y1 - y0);
}
screenPrim.setAttribute('TEXCOORD_1', doc.createAccessor().setType('VEC2').setArray(uv).setBuffer(buffer));
mesh.addPrimitive(screenPrim);

mkdirSync(dirname(output), { recursive: true });
await io.write(output, doc);
console.log(`screen: ${screen.tris.length} triangles, ${remap.size} vertices, ` +
  `${((x1 - x0) * 100).toFixed(1)} x ${((y1 - y0) * 100).toFixed(1)} cm -> ${output}`);
