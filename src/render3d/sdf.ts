/**
 * 부드러운 입체 모양 만들기 (부호 거리 함수 + 마칭 큐브)
 *
 * 손을 여러 개의 둥근 막대·타원체로 정의하고, 이음매가 매끈하게 녹아 붙도록(smooth union) 합친 뒤
 * 격자에서 표면을 뽑아 한 덩어리 메시로 만든다. 이 파일은 three.js를 쓰지 않는 순수 계산이다
 * (마칭 큐브 표만 three.js 예제 모듈에서 빌려 온다).
 * 단위는 cm, 좌표는 손 기준 (handPose.ts 참고).
 */
import { edgeTable, triTable } from "three/examples/jsm/objects/MarchingCubes.js";

export type V3 = [number, number, number];

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V3): V3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
/** 단위축 axis를 중심으로 deg도 회전 (오른손 법칙) */
export function rotate(v: V3, axis: V3, deg: number): V3 {
  const t = (deg * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  const k = norm(axis);
  const kv = cross(k, v);
  const kd = dot(k, v) * (1 - c);
  return [v[0] * c + kv[0] * s + k[0] * kd, v[1] * c + kv[1] * s + k[1] * kd, v[2] * c + kv[2] * s + k[2] * kd];
}

export interface Primitive {
  /** 점까지의 부호 거리 (안쪽이 음수) */
  d: (x: number, y: number, z: number) => number;
  min: V3;
  max: V3;
  /** 이웃과 녹아 붙는 폭(cm). 클수록 이음매가 두툼하게 매끈해진다 */
  k: number;
  /** true면 더하지 않고 파낸다 (지휘봉 자리) */
  carve?: boolean;
}

/** 다항식 smooth min (Inigo Quilez) */
export function smin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/**
 * 양 끝 반지름이 다른 둥근 막대 (Inigo Quilez의 sdRoundCone).
 * squash가 있으면 손 좌표 y·z 방향으로 납작하게 눌러 단면을 타원으로 만든다 (손목처럼).
 */
export function roundCone(a: V3, b: V3, r1: number, r2: number, k: number, squash?: { y: number; z: number }): Primitive {
  const sy = squash?.y ?? 1;
  const sz = squash?.z ?? 1;
  const A: V3 = [a[0], a[1] / sy, a[2] / sz];
  const B: V3 = [b[0], b[1] / sy, b[2] / sz];
  const ba = sub(B, A);
  const l2 = dot(ba, ba);
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const fix = Math.min(sy, sz);
  const pad = Math.max(r1, r2);
  return {
    k,
    min: [Math.min(a[0], b[0]) - pad, Math.min(a[1], b[1]) - pad * sy, Math.min(a[2], b[2]) - pad * sz],
    max: [Math.max(a[0], b[0]) + pad, Math.max(a[1], b[1]) + pad * sy, Math.max(a[2], b[2]) + pad * sz],
    d: (x, y, z) => {
      const pax = x - A[0];
      const pay = y / sy - A[1];
      const paz = z / sz - A[2];
      const yy = pax * ba[0] + pay * ba[1] + paz * ba[2];
      const zz = yy - l2;
      const qx = pax * l2 - ba[0] * yy;
      const qy = pay * l2 - ba[1] * yy;
      const qz = paz * l2 - ba[2] * yy;
      const x2 = qx * qx + qy * qy + qz * qz;
      const y2 = yy * yy * l2;
      const z2 = zz * zz * l2;
      const kk = Math.sign(rr) * rr * rr * x2;
      let dist: number;
      if (Math.sign(zz) * a2 * z2 > kk) dist = Math.sqrt(x2 + z2) * il2 - r2;
      else if (Math.sign(yy) * a2 * y2 < kk) dist = Math.sqrt(x2 + y2) * il2 - r1;
      else dist = (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
      return dist * fix;
    },
  };
}

/** 회전된 타원체 (근사 거리). axes는 서로 수직인 단위벡터 세 개 */
export function ellipsoid(center: V3, axes: [V3, V3, V3], radii: V3, k: number): Primitive {
  const R = Math.max(radii[0], radii[1], radii[2]);
  return {
    k,
    min: [center[0] - R, center[1] - R, center[2] - R],
    max: [center[0] + R, center[1] + R, center[2] + R],
    d: (x, y, z) => {
      const px = x - center[0];
      const py = y - center[1];
      const pz = z - center[2];
      const u = (px * axes[0][0] + py * axes[0][1] + pz * axes[0][2]) / radii[0];
      const v = (px * axes[1][0] + py * axes[1][1] + pz * axes[1][2]) / radii[1];
      const w = (px * axes[2][0] + py * axes[2][1] + pz * axes[2][2]) / radii[2];
      const k0 = Math.hypot(u, v, w);
      const k1 = Math.hypot(u / radii[0], v / radii[1], w / radii[2]);
      return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(radii[0], radii[1], radii[2]);
    },
  };
}

/** 축에 나란한 둥근 상자. half는 둥글리기 전 반폭, 실제 반폭은 half + r */
export function roundBox(center: V3, half: V3, r: number, k: number): Primitive {
  return {
    k,
    min: [center[0] - half[0] - r, center[1] - half[1] - r, center[2] - half[2] - r],
    max: [center[0] + half[0] + r, center[1] + half[1] + r, center[2] + half[2] + r],
    d: (x, y, z) => {
      const qx = Math.abs(x - center[0]) - half[0];
      const qy = Math.abs(y - center[1]) - half[1];
      const qz = Math.abs(z - center[2]) - half[2];
      const out = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0));
      return out + Math.min(Math.max(qx, qy, qz), 0) - r;
    },
  };
}

/** 모든 조각을 순서대로 합친 거리 (표면 근처 법선 계산용) */
export function evaluate(prims: Primitive[], x: number, y: number, z: number): number {
  let d = 1e3;
  for (const p of prims) {
    const di = p.d(x, y, z);
    d = p.carve ? -smin(-d, di, p.k) : smin(d, di, p.k);
  }
  return d;
}

export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

/** 한 번에 끝까지 계산 (테스트·도구용) */
export function polygonize(prims: Primitive[], cell: number): MeshData {
  const gen = polygonizeSteps(prims, cell);
  for (;;) {
    const r = gen.next();
    if (r.done) return r.value;
  }
}

/**
 * 오래 걸리는 계산을 잘게 나눠 돌린다: 조각마다 budgetMs만 쓰고 브라우저에 차례를 넘긴다.
 * 그 사이에 화면 그리기와 소리 예약(25ms마다)이 돌아가므로 재생이 끊기지 않는다.
 */
export function runSliced<T>(gen: Generator<void, T>, budgetMs = 6): Promise<T> {
  return new Promise((resolve, reject) => {
    const step = () => {
      const t0 = performance.now();
      try {
        for (;;) {
          const r = gen.next();
          if (r.done) {
            resolve(r.value);
            return;
          }
          if (performance.now() - t0 > budgetMs) break;
        }
      } catch (e) {
        reject(e);
        return;
      }
      setTimeout(step, 0);
    };
    step();
  });
}

/**
 * 격자에 거리값을 채우고 마칭 큐브로 표면을 뽑는다. 중간중간 yield로 쉴 틈을 준다.
 * 조각마다 자기 상자 근처의 격자점만 계산해서 빠르다 (표면 근처 값은 전체 계산과 같다).
 */
export function* polygonizeSteps(prims: Primitive[], cell: number): Generator<void, MeshData> {
  const solids = prims.filter((p) => !p.carve);
  const lo: V3 = [Infinity, Infinity, Infinity];
  const hi: V3 = [-Infinity, -Infinity, -Infinity];
  for (const p of solids) {
    for (let a = 0; a < 3; a++) {
      lo[a] = Math.min(lo[a], p.min[a]);
      hi[a] = Math.max(hi[a], p.max[a]);
    }
  }
  const margin = 3 * cell + Math.max(...prims.map((p) => p.k));
  const origin: V3 = [lo[0] - margin, lo[1] - margin, lo[2] - margin];
  const nx = Math.ceil((hi[0] - lo[0] + 2 * margin) / cell) + 1;
  const ny = Math.ceil((hi[1] - lo[1] + 2 * margin) / cell) + 1;
  const nz = Math.ceil((hi[2] - lo[2] + 2 * margin) / cell) + 1;
  const sxy = nx * ny;
  const field = new Float32Array(nx * ny * nz).fill(1e3);

  for (const p of prims) {
    const pad = p.k + 3 * cell;
    const i0 = Math.max(0, Math.floor((p.min[0] - pad - origin[0]) / cell));
    const i1 = Math.min(nx - 1, Math.ceil((p.max[0] + pad - origin[0]) / cell));
    const j0 = Math.max(0, Math.floor((p.min[1] - pad - origin[1]) / cell));
    const j1 = Math.min(ny - 1, Math.ceil((p.max[1] + pad - origin[1]) / cell));
    const l0 = Math.max(0, Math.floor((p.min[2] - pad - origin[2]) / cell));
    const l1 = Math.min(nz - 1, Math.ceil((p.max[2] + pad - origin[2]) / cell));
    for (let l = l0; l <= l1; l++) {
      const z = origin[2] + l * cell;
      for (let j = j0; j <= j1; j++) {
        const y = origin[1] + j * cell;
        let idx = i0 + nx * j + sxy * l;
        for (let i = i0; i <= i1; i++, idx++) {
          const di = p.d(origin[0] + i * cell, y, z);
          const cur = field[idx];
          field[idx] = p.carve ? -smin(-cur, di, p.k) : smin(cur, di, p.k);
        }
      }
      yield;
    }
  }

  // 모서리 → 꼭짓점 번호 (이웃 칸끼리 꼭짓점을 함께 쓴다)
  const vid = new Int32Array(nx * ny * nz * 3).fill(-1);
  const pos: number[] = [];
  const tri: number[] = [];
  const cornerOff = [
    [0, 0, 0],
    [1, 0, 0],
    [1, 1, 0],
    [0, 1, 0],
    [0, 0, 1],
    [1, 0, 1],
    [1, 1, 1],
    [0, 1, 1],
  ];
  // 모서리: [시작 꼭짓점, 끝 꼭짓점, 축(0=x,1=y,2=z)] — 시작 쪽이 항상 작은 좌표
  const edges: [number, number, number][] = [
    [0, 1, 0],
    [1, 2, 1],
    [3, 2, 0],
    [0, 3, 1],
    [4, 5, 0],
    [5, 6, 1],
    [7, 6, 0],
    [4, 7, 1],
    [0, 4, 2],
    [1, 5, 2],
    [2, 6, 2],
    [3, 7, 2],
  ];
  const vals = new Float64Array(8);
  const cidx = new Int32Array(8);
  const evert = new Int32Array(12);
  for (let l = 0; l < nz - 1; l++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        let ci = 0;
        for (let c = 0; c < 8; c++) {
          const o = cornerOff[c];
          const id = i + o[0] + nx * (j + o[1]) + sxy * (l + o[2]);
          cidx[c] = id;
          vals[c] = field[id];
          // three.js 표와 같은 규칙: 바깥(거리 > 0)인 꼭짓점에 비트를 켠다
          if (vals[c] > 0) ci |= 1 << c;
        }
        const em = edgeTable[ci];
        if (em === 0) continue;
        for (let e = 0; e < 12; e++) {
          if (!(em & (1 << e))) continue;
          const [ca, cb, axis] = edges[e];
          const key = cidx[ca] * 3 + axis;
          let v = vid[key];
          if (v < 0) {
            const va = vals[ca];
            const vb = vals[cb];
            const t = va / (va - vb);
            const oa = cornerOff[ca];
            const ob = cornerOff[cb];
            pos.push(
              origin[0] + (i + oa[0] + t * (ob[0] - oa[0])) * cell,
              origin[1] + (j + oa[1] + t * (ob[1] - oa[1])) * cell,
              origin[2] + (l + oa[2] + t * (ob[2] - oa[2])) * cell,
            );
            v = pos.length / 3 - 1;
            vid[key] = v;
          }
          evert[e] = v;
        }
        const base = ci * 16;
        for (let n = 0; triTable[base + n] !== -1; n += 3) {
          tri.push(evert[triTable[base + n]], evert[triTable[base + n + 1]], evert[triTable[base + n + 2]]);
        }
      }
    }
    yield;
  }

  // 표면 위로 한 번 끌어당기고(뉴턴 한 걸음), 거리의 기울기로 매끈한 법선을 구한다
  const positions = new Float32Array(pos.length);
  const normals = new Float32Array(pos.length);
  const h = cell * 0.25;
  // 표면 근처에서는 상자에서 (녹는 폭 + 두 칸) 넘게 떨어진 조각은 값에 영향이 없으므로 건너뛴다
  const reach = prims.map((p) => p.k + 2 * cell);
  let near: Primitive[] = prims;
  const pick = (x: number, y: number, z: number) =>
    prims.filter((p, i) => {
      const r = reach[i];
      return (
        x > p.min[0] - r && x < p.max[0] + r && y > p.min[1] - r && y < p.max[1] + r && z > p.min[2] - r && z < p.max[2] + r
      );
    });
  for (let n = 0; n < pos.length; n += 3) {
    if (n % 768 === 0) yield;
    let x = pos[n];
    let y = pos[n + 1];
    let z = pos[n + 2];
    near = pick(x, y, z);
    for (let it = 0; it < 2; it++) {
      const gx = evaluate(near, x + h, y, z) - evaluate(near, x - h, y, z);
      const gy = evaluate(near, x, y + h, z) - evaluate(near, x, y - h, z);
      const gz = evaluate(near, x, y, z + h) - evaluate(near, x, y, z - h);
      const gl = Math.hypot(gx, gy, gz) || 1;
      const nxv = gx / gl;
      const nyv = gy / gl;
      const nzv = gz / gl;
      if (it === 0) {
        const d = evaluate(near, x, y, z);
        // 한 칸 이상은 움직이지 않는다 (얇은 틈에서 엉뚱한 곳으로 튀지 않게)
        const step = Math.max(-cell * 0.5, Math.min(cell * 0.5, d));
        x -= nxv * step;
        y -= nyv * step;
        z -= nzv * step;
      } else {
        normals[n] = nxv;
        normals[n + 1] = nyv;
        normals[n + 2] = nzv;
      }
    }
    positions[n] = x;
    positions[n + 1] = y;
    positions[n + 2] = z;
  }
  return { positions, normals, indices: Uint32Array.from(tri) };
}
