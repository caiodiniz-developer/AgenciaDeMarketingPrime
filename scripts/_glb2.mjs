import fs from 'fs';
const buf = fs.readFileSync('c:/Users/Caio/Desktop/agencia de marketing prime/public/laptop.glb');
let off = 12, json = null, bin = null;
const length = buf.readUInt32LE(8);
while (off < length) {
  const clen = buf.readUInt32LE(off), ctype = buf.readUInt32LE(off + 4);
  const d = buf.subarray(off + 8, off + 8 + clen);
  if (ctype === 0x4E4F534A) json = JSON.parse(d.toString('utf8'));
  else if (ctype === 0x004E4942) bin = d;
  off = Math.ceil((off + 8 + clen) / 4) * 4;
}
const g = json;
const COMP = { 5121: [1, (dv, o) => dv.getUint8(o)], 5123: [2, (dv, o) => dv.getUint16(o, true)], 5125: [4, (dv, o) => dv.getUint32(o, true)], 5126: [4, (dv, o) => dv.getFloat32(o, true)] };
const NUMC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
function acc(i) {
  const a = g.accessors[i], nc = NUMC[a.type], c = COMP[a.componentType];
  const bv = g.bufferViews[a.bufferView];
  const base = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const stride = bv.byteStride || nc * c[0];
  const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const out = [];
  for (let e = 0; e < a.count; e++) { const r = []; for (let k = 0; k < nc; k++) r.push(c[1](dv, base + e * stride + k * c[0])); out.push(nc === 1 ? r[0] : r); }
  return out;
}
const f = x => +x.toFixed(6);

function report(mi) {
  const pr = g.meshes[mi].primitives[0];
  const P = acc(pr.attributes.POSITION), UV = acc(pr.attributes.TEXCOORD_0), IDX = acc(pr.indices);
  console.log('\n########## mesh[' + mi + '] mat=' + pr.material + ' (' + g.materials[pr.material].name + ') verts=' + P.length + ' tris=' + IDX.length / 3);
  // surface area
  let area = 0;
  for (let t = 0; t < IDX.length; t += 3) {
    const a = P[IDX[t]], b = P[IDX[t + 1]], c = P[IDX[t + 2]];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cr = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    area += 0.5 * Math.hypot(cr[0], cr[1], cr[2]);
  }
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const p of P) for (let c = 0; c < 3; c++) { if (p[c] < mn[c]) mn[c] = p[c]; if (p[c] > mx[c]) mx[c] = p[c]; }
  const bboxArea = (mx[0] - mn[0]) * (mx[2] - mn[2]); // XZ plane (local), since Y is thin
  console.log('  surface area (XZ-ish)=' + f(area) + '  bboxXZ area=' + f(bboxArea) + '  fill ratio=' + f(area / bboxArea) + '  => ' + (area / bboxArea > 0.9 ? 'SOLID FILLED QUAD' : 'FRAME / partial (hole in middle)'));
  // Is UV an affine function of (localX, localZ)? least squares on 3 samples then verify
  // pick 3 non-collinear verts
  function solve(idxA, idxB, idxC, comp) {
    const A = [[P[idxA][0], P[idxA][2], 1], [P[idxB][0], P[idxB][2], 1], [P[idxC][0], P[idxC][2], 1]];
    const y = [UV[idxA][comp], UV[idxB][comp], UV[idxC][comp]];
    // gaussian
    const M = A.map((r, i) => r.concat([y[i]]));
    for (let c = 0; c < 3; c++) {
      let piv = c; for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      if (Math.abs(M[piv][c]) < 1e-12) return null;
      [M[c], M[piv]] = [M[piv], M[c]];
      for (let r = 0; r < 3; r++) { if (r === c) continue; const k = M[r][c] / M[c][c]; for (let j = c; j < 4; j++) M[r][j] -= k * M[c][j]; }
    }
    return [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]];
  }
  let A = 0, B = 1, C = 2;
  for (let i = 2; i < P.length; i++) { const s = solve(0, 1, i, 0); if (s) { C = i; break; } }
  const cu = solve(0, 1, C, 0), cv = solve(0, 1, C, 1);
  if (cu && cv) {
    let errU = 0, errV = 0;
    for (let i = 0; i < P.length; i++) {
      errU = Math.max(errU, Math.abs(cu[0] * P[i][0] + cu[1] * P[i][2] + cu[2] - UV[i][0]));
      errV = Math.max(errV, Math.abs(cv[0] * P[i][0] + cv[1] * P[i][2] + cv[2] - UV[i][1]));
    }
    console.log('  UV affine fit:  U = ' + f(cu[0]) + '*x + ' + f(cu[1]) + '*z + ' + f(cu[2]) + '   maxErr=' + f(errU));
    console.log('                  V = ' + f(cv[0]) + '*x + ' + f(cv[1]) + '*z + ' + f(cv[2]) + '   maxErr=' + f(errV));
    console.log('  => UV is ' + (Math.max(errU, errV) < 1e-4 ? 'PERFECTLY LINEAR/PLANAR (clean rectangular projection)' : 'NOT a clean linear projection'));
  }
  // corner UVs
  const corners = [[mn[0], mn[2], 'x-min z-min'], [mx[0], mn[2], 'x-max z-min'], [mn[0], mx[2], 'x-min z-max'], [mx[0], mx[2], 'x-max z-max']];
  for (const [cx, cz, lbl] of corners) {
    let best = 0, bd = 1e9;
    for (let i = 0; i < P.length; i++) { const d = Math.hypot(P[i][0] - cx, P[i][2] - cz); if (d < bd) { bd = d; best = i; } }
    console.log('    corner ' + lbl + ' (local x=' + f(P[best][0]) + ' z=' + f(P[best][2]) + ' -> worldX=' + f(P[best][0]) + ' worldY=' + f(P[best][2]) + ')  UV=[' + f(UV[best][0]) + ',' + f(UV[best][1]) + ']');
  }
  const um = [Math.min(...UV.map(u => u[0])), Math.max(...UV.map(u => u[0]))];
  const vm = [Math.min(...UV.map(u => u[1])), Math.max(...UV.map(u => u[1]))];
  console.log('  UV span: U ' + f(um[0]) + '..' + f(um[1]) + ' (range ' + f(um[1] - um[0]) + ')  V ' + f(vm[0]) + '..' + f(vm[1]) + ' (range ' + f(vm[1] - vm[0]) + ')');
  console.log('  local bbox min=[' + mn.map(f) + '] max=[' + mx.map(f) + ']');
  console.log('  WORLD (Z-up->Y-up: wx=lx, wy=lz, wz=-ly): X ' + f(mn[0]) + '..' + f(mx[0]) + '  Y ' + f(mn[2]) + '..' + f(mx[2]) + '  Z ' + f(-mx[1]) + '..' + f(-mn[1]));
  console.log('  world size W=' + f(mx[0] - mn[0]) + ' H=' + f(mx[2] - mn[2]) + '  aspect W/H=' + f((mx[0] - mn[0]) / (mx[2] - mn[2])));
  console.log('  world center=[' + f((mn[0] + mx[0]) / 2) + ', ' + f((mn[2] + mx[2]) / 2) + ', ' + f(-(mn[1] + mx[1]) / 2) + ']');
  // distinct local Y values
  const ys = [...new Set(P.map(p => +p[1].toFixed(5)))].sort((a, b) => a - b);
  console.log('  distinct local Y (=> world -Z) values: ' + (ys.length <= 8 ? JSON.stringify(ys) : ys.length + ' values, ' + ys[0] + '..' + ys[ys.length - 1]));
}
[0, 1, 2].forEach(report);

// PNG dims
console.log('\n===== IMAGES =====');
g.images.forEach((im, i) => {
  const bv = g.bufferViews[im.bufferView];
  const d = bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
  const w = d.readUInt32BE(16), h = d.readUInt32BE(20);
  console.log('image[' + i + '] ' + im.mimeType + ' ' + w + 'x' + h + ' bytes=' + bv.byteLength);
});
console.log('\nnode->mesh->material map (three.js scene names):');
g.nodes.forEach((n, i) => { if (n.mesh !== undefined) { const pr = g.meshes[n.mesh].primitives[0]; console.log('  node "' + n.name + '" -> mesh[' + n.mesh + '] "' + g.meshes[n.mesh].name + '" -> material[' + pr.material + '] "' + g.materials[pr.material].name + '"'); } });
