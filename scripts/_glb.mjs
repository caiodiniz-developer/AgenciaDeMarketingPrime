import fs from 'fs';

const p = 'c:/Users/Caio/Desktop/agencia de marketing prime/public/laptop.glb';
const buf = fs.readFileSync(p);
const magic = buf.toString('utf8', 0, 4);
const version = buf.readUInt32LE(4);
const length = buf.readUInt32LE(8);
console.log('HEADER', magic, 'v' + version, 'len', length, 'filesize', buf.length);

let off = 12;
let json = null;
let bin = null;
while (off < length) {
  const clen = buf.readUInt32LE(off);
  const ctype = buf.readUInt32LE(off + 4);
  const data = buf.subarray(off + 8, off + 8 + clen);
  if (ctype === 0x4E4F534A) json = JSON.parse(data.toString('utf8'));
  else if (ctype === 0x004E4942) bin = data;
  off += 8 + clen;
  off = Math.ceil(off / 4) * 4;
}
const g = json;
console.log('CHUNKS json=' + !!json, 'bin=' + (bin ? bin.length : 0));
console.log('ASSET', JSON.stringify(g.asset));
console.log('TOP counts:', Object.keys(g).map(k => k + '=' + (Array.isArray(g[k]) ? g[k].length : typeof g[k])).join(' '));

const COMP = {
  5120: { n: 'BYTE', size: 1, get: (dv, o) => dv.getInt8(o) },
  5121: { n: 'UBYTE', size: 1, get: (dv, o) => dv.getUint8(o) },
  5122: { n: 'SHORT', size: 2, get: (dv, o) => dv.getInt16(o, true) },
  5123: { n: 'USHORT', size: 2, get: (dv, o) => dv.getUint16(o, true) },
  5125: { n: 'UINT', size: 4, get: (dv, o) => dv.getUint32(o, true) },
  5126: { n: 'FLOAT', size: 4, get: (dv, o) => dv.getFloat32(o, true) },
};
const NUMC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function readAccessor(i) {
  const a = g.accessors[i];
  const nc = NUMC[a.type];
  const comp = COMP[a.componentType];
  const out = [];
  if (a.bufferView === undefined) return { acc: a, nc, comp, data: null };
  const bv = g.bufferViews[a.bufferView];
  const base = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const stride = bv.byteStride || nc * comp.size;
  const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  for (let e = 0; e < a.count; e++) {
    const row = [];
    for (let c = 0; c < nc; c++) row.push(comp.get(dv, base + e * stride + c * comp.size));
    out.push(row);
  }
  return { acc: a, nc, comp, data: out };
}
function minmax(rows, nc) {
  const mn = new Array(nc).fill(Infinity), mx = new Array(nc).fill(-Infinity);
  for (const r of rows) for (let c = 0; c < nc; c++) { if (r[c] < mn[c]) mn[c] = r[c]; if (r[c] > mx[c]) mx[c] = r[c]; }
  return { mn, mx };
}
const f = (x) => (typeof x === 'number' ? +x.toFixed(6) : x);

console.log('\n===== 1. NODES (' + (g.nodes || []).length + ') =====');
(g.nodes || []).forEach((n, i) => {
  const parts = ['[' + i + '] name=' + JSON.stringify(n.name), 'mesh=' + (n.mesh !== undefined ? n.mesh : '-')];
  if (n.camera !== undefined) parts.push('camera=' + n.camera);
  if (n.skin !== undefined) parts.push('skin=' + n.skin);
  if (n.matrix) parts.push('matrix=[' + n.matrix.map(f).join(',') + ']');
  if (n.translation) parts.push('T=[' + n.translation.map(f).join(',') + ']');
  if (n.rotation) parts.push('R=[' + n.rotation.map(f).join(',') + ']');
  if (n.scale) parts.push('S=[' + n.scale.map(f).join(',') + ']');
  if (!n.matrix && !n.translation && !n.rotation && !n.scale) parts.push('(identity/no TRS)');
  if (n.children) parts.push('children=[' + n.children.join(',') + ']');
  console.log(parts.join(' '));
});
console.log('SCENES:', JSON.stringify(g.scenes));

function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; }
  return o;
}
function trs(n) {
  if (n.matrix) return n.matrix.slice();
  const t = n.translation || [0, 0, 0], q = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1];
  const x = q[0], y = q[1], z = q[2], w = q[3];
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
  return [
    (1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
    (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
    (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
    t[0], t[1], t[2], 1];
}
const world = {};
function walk(i, parent) {
  const n = g.nodes[i];
  const m = mul(parent, trs(n));
  world[i] = m;
  (n.children || []).forEach(c => walk(c, m));
}
const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
(g.scenes[g.scene || 0].nodes).forEach(r => walk(r, I));
function xform(m, v) {
  return [m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
          m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
          m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]];
}

console.log('\n===== 2. MESHES (' + (g.meshes || []).length + ') =====');
const meshInfo = [];
(g.meshes || []).forEach((m, i) => {
  console.log('[' + i + '] name=' + JSON.stringify(m.name) + ' primitives=' + m.primitives.length);
  m.primitives.forEach((pr, j) => {
    const pa = g.accessors[pr.attributes.POSITION];
    const idx = pr.indices !== undefined ? g.accessors[pr.indices].count : null;
    const matName = pr.material !== undefined ? (g.materials[pr.material].name || '') : '';
    console.log('    prim[' + j + '] material=' + (pr.material !== undefined ? pr.material : '-') + ' (' + matName + ') POSITION.count=' + pa.count + ' indices=' + idx + ' tris=' + (idx ? idx / 3 : pa.count / 3) + ' attrs=' + Object.keys(pr.attributes).join(',') + ' mode=' + (pr.mode === undefined ? 4 : pr.mode));
    console.log('        POSITION accessor.min=' + JSON.stringify(pa.min) + ' max=' + JSON.stringify(pa.max));
    meshInfo.push({ mesh: i, prim: j, pr, pa });
  });
});

console.log('\n===== 3. MATERIALS (' + (g.materials || []).length + ') =====');
(g.materials || []).forEach((m, i) => {
  const pbr = m.pbrMetallicRoughness || {};
  console.log('[' + i + '] name=' + JSON.stringify(m.name));
  console.log('    baseColorFactor=' + JSON.stringify(pbr.baseColorFactor || '(default [1,1,1,1])') + ' baseColorTexture=' + (pbr.baseColorTexture ? pbr.baseColorTexture.index : 'none'));
  console.log('    metallic=' + (pbr.metallicFactor !== undefined ? pbr.metallicFactor : '(default 1)') + ' roughness=' + (pbr.roughnessFactor !== undefined ? pbr.roughnessFactor : '(default 1)') + ' mrTexture=' + (pbr.metallicRoughnessTexture ? pbr.metallicRoughnessTexture.index : 'none'));
  console.log('    emissiveFactor=' + JSON.stringify(m.emissiveFactor || '(default [0,0,0])') + ' emissiveTexture=' + (m.emissiveTexture ? m.emissiveTexture.index : 'none') + ' normalTexture=' + (m.normalTexture ? m.normalTexture.index : 'none'));
  console.log('    alphaMode=' + (m.alphaMode || 'OPAQUE') + ' doubleSided=' + !!m.doubleSided + ' ext=' + JSON.stringify(Object.keys(m.extensions || {})));
});
console.log('TEXTURES:', JSON.stringify((g.textures || []).map((t, i) => ({ i, source: t.source, sampler: t.sampler }))));
console.log('IMAGES:', JSON.stringify((g.images || []).map((im, i) => ({ i, name: im.name, mime: im.mimeType, bv: im.bufferView }))));
console.log('SAMPLERS:', JSON.stringify(g.samplers || []));

console.log('\n===== 5/6. PER-PRIMITIVE GEOMETRY + UV =====');
const gmn = [Infinity, Infinity, Infinity], gmx = [-Infinity, -Infinity, -Infinity];
const nodeOfMesh = {};
(g.nodes || []).forEach((n, i) => { if (n.mesh !== undefined) (nodeOfMesh[n.mesh] = nodeOfMesh[n.mesh] || []).push(i); });

for (const mi of meshInfo) {
  const m = g.meshes[mi.mesh];
  const pr = mi.pr;
  const pos = readAccessor(pr.attributes.POSITION);
  const r0 = minmax(pos.data, 3);
  const mn = r0.mn, mx = r0.mx;
  const size = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
  const sorted = size.map((v, i) => [v, 'XYZ'[i]]).sort((a, b) => a[0] - b[0]);
  const thin = sorted[0];
  const ratio = sorted[2][0] > 0 ? thin[0] / sorted[2][0] : 0;
  console.log('\n-- mesh[' + mi.mesh + '] ' + JSON.stringify(m.name) + ' prim[' + mi.prim + '] mat=' + pr.material + ' (' + (pr.material !== undefined ? g.materials[pr.material].name : '-') + ')');
  console.log('   LOCAL bbox min=[' + mn.map(f) + '] max=[' + mx.map(f) + '] size=[' + size.map(f) + ']');
  console.log('   thinnest axis=' + thin[1] + ' (' + f(thin[0]) + ') thin/longest ratio=' + f(ratio) + ' planar=' + (ratio < 0.02 ? 'YES (very flat)' : ratio < 0.1 ? 'somewhat flat' : 'NO'));
  const nids = nodeOfMesh[mi.mesh] || [];
  for (const nid of nids) {
    const W = world[nid];
    const wmn = [Infinity, Infinity, Infinity], wmx = [-Infinity, -Infinity, -Infinity];
    for (const v of pos.data) { const w = xform(W, v); for (let c = 0; c < 3; c++) { if (w[c] < wmn[c]) wmn[c] = w[c]; if (w[c] > wmx[c]) wmx[c] = w[c]; } }
    console.log('   WORLD (node ' + nid + ' "' + g.nodes[nid].name + '") bbox min=[' + wmn.map(f) + '] max=[' + wmx.map(f) + '] size=[' + wmx.map((v, i) => f(v - wmn[i])) + ']');
    for (let c = 0; c < 3; c++) { if (wmn[c] < gmn[c]) gmn[c] = wmn[c]; if (wmx[c] > gmx[c]) gmx[c] = wmx[c]; }
  }
  for (const key of ['TEXCOORD_0', 'TEXCOORD_1']) {
    if (pr.attributes[key] === undefined) continue;
    const uv = readAccessor(pr.attributes[key]);
    const r = minmax(uv.data, 2);
    console.log('   ' + key + ' count=' + uv.acc.count + ' type=' + uv.comp.n + ' normalized=' + !!uv.acc.normalized + ' U[' + f(r.mn[0]) + ' .. ' + f(r.mx[0]) + '] V[' + f(r.mn[1]) + ' .. ' + f(r.mx[1]) + ']');
  }
  if (pr.attributes.NORMAL !== undefined) {
    const nrm = readAccessor(pr.attributes.NORMAL);
    const s = [0, 0, 0];
    for (const v of nrm.data) { s[0] += v[0]; s[1] += v[1]; s[2] += v[2]; }
    const L = Math.hypot(s[0], s[1], s[2]) || 1;
    const avg = s.map(v => v / L);
    console.log('   avg NORMAL (local) = [' + avg.map(f) + ']');
    for (const nid of nids) {
      const W = world[nid];
      const o = xform(W, [0, 0, 0]);
      const w = xform(W, avg);
      const d = [w[0] - o[0], w[1] - o[1], w[2] - o[2]];
      const dl = Math.hypot(d[0], d[1], d[2]) || 1;
      console.log('   avg NORMAL (world via node ' + nid + ') = [' + d.map(v => f(v / dl)) + ']');
    }
  }
}
console.log('\n===== 7. WHOLE-MODEL WORLD BBOX ===== min=[' + gmn.map(f) + '] max=[' + gmx.map(f) + '] size=[' + gmx.map((v, i) => f(v - gmn[i])) + ']');

console.log('\n===== 8. ANIMATIONS / SKINS =====');
console.log('animations:', (g.animations || []).length, JSON.stringify((g.animations || []).map(a => ({ name: a.name, channels: a.channels.length }))));
console.log('skins:', (g.skins || []).length, JSON.stringify((g.skins || []).map(s => ({ name: s.name, joints: s.joints.length }))));
console.log('cameras:', (g.cameras || []).length);
console.log('extensionsUsed:', JSON.stringify(g.extensionsUsed || []));
console.log('extensionsRequired:', JSON.stringify(g.extensionsRequired || []));
