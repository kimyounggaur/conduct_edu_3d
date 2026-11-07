/**
 * 손·지휘봉·아래팔 메시 (three.js). 단위는 손 좌표 cm 그대로 — 화면에 놓을 때 한 번에 줄인다.
 */
import {
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  LatheGeometry,
  Matrix4,
  Quaternion,
  Vector2,
  Vector3,
} from "three";
import { BATON, FADE_END, FADE_START, type HandRig } from "./handPose";
import { polygonizeSteps, runSliced, type MeshData, type V3 } from "./sdf";

/** 표면 격자 간격(cm). 화면에서 손은 수십 픽셀이라 0.3cm면 충분히 매끈하다 */
export const HAND_CELL = 0.3;

const cache = new Map<string, Promise<BufferGeometry>>();

/** 손 메시 만들기. 계산을 잘게 나눠 돌리므로 재생 중에 불러도 화면·소리가 끊기지 않는다 */
export function handGeometryAsync(rig: HandRig, cell = HAND_CELL): Promise<BufferGeometry> {
  const key = `${rig.pose}|${cell}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = runSliced(polygonizeSteps(rig.primitives, cell)).then((mesh) => toGeometry(rig, mesh));
    cache.set(key, hit);
    hit.catch(() => cache.delete(key));
  }
  return hit;
}

/** 한 번에 만들기 (테스트·도구용) */
export function handGeometry(rig: HandRig, cell = HAND_CELL): BufferGeometry {
  const gen = polygonizeSteps(rig.primitives, cell);
  for (;;) {
    const r = gen.next();
    if (r.done) return toGeometry(rig, r.value);
  }
}

function toGeometry(rig: HandRig, mesh: MeshData): BufferGeometry {
  // 아래팔은 손목에서 멀어질수록 투명하게 (2D 화면의 옅은 팔 선과 같은 역할)
  const n = mesh.positions.length / 3;
  const color = new Float32Array(n * 4);
  const f = rig.forearmDir;
  for (let i = 0; i < n; i++) {
    const s = mesh.positions[i * 3] * f[0] + mesh.positions[i * 3 + 1] * f[1] + mesh.positions[i * 3 + 2] * f[2];
    const t = Math.min(1, Math.max(0, (s - FADE_START) / (FADE_END - FADE_START)));
    const fade = 1 - t * t * (3 - 2 * t);
    color.set([1, 1, 1, fade], i * 4);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(mesh.positions, 3));
  g.setAttribute("normal", new BufferAttribute(mesh.normals, 3));
  g.setAttribute("color", new BufferAttribute(color, 4));
  g.setIndex(new BufferAttribute(mesh.indices, 1));
  g.computeBoundingSphere();
  return g;
}

/** +Y를 axis 쪽으로 돌리는 회전 */
function alignY(axis: V3): Quaternion {
  return new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(...axis).normalize());
}

/** 코르크 손잡이: 코르크 가운데가 원점, 막대 쪽이 +Y */
export function corkGeometry(): BufferGeometry {
  const pts = BATON.cork.map(([u, r]) => new Vector2(r, u));
  const g = new LatheGeometry(pts, 28);
  g.computeVertexNormals();
  return g;
}

/** 막대: 코르크 앞에서 끝까지. length는 코르크 가운데에서 끝까지 길이(cm) */
export function shaftGeometry(length: number): BufferGeometry {
  const start = BATON.corkFront - 0.3;
  const h = Math.max(1, length - start);
  const g = new CylinderGeometry(BATON.shaftTip, BATON.shaftBase, h, 20, 1, false);
  g.translate(0, start + h / 2, 0);
  return g;
}

/** 지휘봉 부품을 손 좌표에 놓는 행렬 (코르크 가운데 위치 + 지휘봉 방향) */
export function batonMatrix(rig: HandRig): Matrix4 {
  return new Matrix4().compose(new Vector3(...rig.corkCenter), alignY(rig.batonAxis), new Vector3(1, 1, 1));
}
