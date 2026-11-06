/**
 * 오른손 뼈대와 자세 (단위 cm, three.js 없음)
 *
 * 손 좌표: 원점 = 손목 가운데, +X = 손가락 쪽, +Y = 손등 쪽, +Z = 새끼손가락 쪽 (엄지는 -Z).
 * 자세 두 가지:
 *  - grip : 지휘봉 쥐기. 코르크 손잡이가 손바닥에 놓이고, 엄지 끝과 검지 둘째 마디 사이로 막대가 나간다.
 *  - point: 맨손. 검지를 펴고 나머지는 가볍게 말아 쥔다.
 * 왼손은 화면에서 좌우를 뒤집어(거울) 만든다.
 */
import { add, cross, dot, ellipsoid, mul, norm, roundBox, roundCone, rotate, sub, type Primitive, type V3 } from "./sdf";

export type PoseName = "grip" | "point";

/** 아래팔 길이(cm). 이 중 손목 쪽 일부만 보이고 나머지는 흐려진다 */
export const FOREARM_LENGTH = 22;
/** 손목에서 이 거리(cm)까지는 또렷하고, FADE_END에서 완전히 사라진다 */
export const FADE_START = 3.5;
export const FADE_END = 18;

const X: V3 = [1, 0, 0];
const Y: V3 = [0, 1, 0];
const Z: V3 = [0, 0, 1];

interface FingerDef {
  mcp: V3;
  lengths: [number, number, number];
  /** MCP·PIP·DIP·끝 반지름 */
  radii: [number, number, number, number];
}

const FINGERS: Record<"index" | "middle" | "ring" | "pinky", FingerDef> = {
  index: { mcp: [9.1, 0.3, -2.7], lengths: [4.0, 2.4, 1.9], radii: [1.0, 0.86, 0.76, 0.66] },
  middle: { mcp: [9.4, 0.35, -0.88], lengths: [4.5, 2.8, 2.0], radii: [1.04, 0.9, 0.79, 0.68] },
  ring: { mcp: [9.1, 0.3, 0.9], lengths: [4.2, 2.6, 1.9], radii: [0.97, 0.84, 0.74, 0.64] },
  pinky: { mcp: [8.4, 0.18, 2.6], lengths: [3.3, 2.0, 1.7], radii: [0.86, 0.74, 0.66, 0.57] },
};

type FingerName = keyof typeof FINGERS;

interface FingerPose {
  /** 엄지 쪽으로 벌린 각도(도) */
  abd: number;
  /** MCP·PIP·DIP 굽힘(도) */
  flex: [number, number, number];
}

interface Pose {
  fingers: Record<FingerName, FingerPose>;
  /** 아래팔이 손 축에서 새끼손가락 쪽으로 꺾인 각도(도). 지휘봉이 팔의 연장선처럼 보이게 한다 */
  forearmBend: number;
}

const POSES: Record<PoseName, Pose> = {
  grip: {
    fingers: {
      index: { abd: 3, flex: [30, 55, 22] },
      middle: { abd: 0, flex: [52, 72, 30] },
      ring: { abd: -4, flex: [60, 76, 30] },
      pinky: { abd: -10, flex: [66, 74, 28] },
    },
    forearmBend: 16,
  },
  point: {
    fingers: {
      index: { abd: 2, flex: [6, 10, 6] },
      middle: { abd: 0, flex: [78, 95, 45] },
      ring: { abd: -4, flex: [84, 95, 45] },
      pinky: { abd: -10, flex: [88, 92, 42] },
    },
    forearmBend: 4,
  },
};

export interface FingerChain {
  joints: V3[]; // MCP, PIP, DIP, 끝 구 중심
  radii: number[];
  /** 마지막 마디 방향 */
  tipDir: V3;
  /** 엄지 쪽 옆면 방향 */
  side: V3;
}

function fingerChain(def: FingerDef, pose: FingerPose): FingerChain {
  const u = rotate(X, Y, pose.abd);
  const w = norm(cross(Y, u));
  const joints: V3[] = [def.mcp];
  let angle = 0;
  let p = def.mcp;
  let dir = u;
  for (let s = 0; s < 3; s++) {
    angle += pose.flex[s];
    dir = rotate(u, w, angle);
    p = add(p, mul(dir, def.lengths[s]));
    joints.push(p);
  }
  return { joints, radii: def.radii, tipDir: dir, side: w };
}

export interface HandRig {
  pose: PoseName;
  primitives: Primitive[];
  /** grip: 코르크 손잡이 가운데와 지휘봉 방향 */
  corkCenter: V3;
  batonAxis: V3;
  /** point: 검지 끝(살갗 표면)과 검지 방향 */
  indexTip: V3;
  indexDir: V3;
  /** 손목에서 팔꿈치 쪽으로 가는 방향 */
  forearmDir: V3;
}

/** 굵기 */
export const BATON = {
  /** 막대가 코르크에서 나오는 곳의 반지름 */
  shaftBase: 0.62,
  /** 끝 반지름 */
  shaftTip: 0.2,
  /** 코르크 모양: [축 위치(코르크 가운데 기준), 반지름] — 뒤쪽 끝 → 막대와 만나는 곳 */
  cork: [
    [-2.5, 0.0],
    [-2.38, 0.5],
    [-2.05, 0.86],
    [-1.5, 1.06],
    [-0.85, 1.12],
    [-0.15, 1.05],
    [0.65, 0.88],
    [1.45, 0.72],
    [2.15, 0.64],
    [2.7, 0.62],
  ] as [number, number][],
  corkFront: 2.7,
};

export function buildRig(pose: PoseName): HandRig {
  const P = POSES[pose];
  const chains = {
    index: fingerChain(FINGERS.index, P.fingers.index),
    middle: fingerChain(FINGERS.middle, P.fingers.middle),
    ring: fingerChain(FINGERS.ring, P.fingers.ring),
    pinky: fingerChain(FINGERS.pinky, P.fingers.pinky),
  };
  const forearmDir = norm(rotate(mul(X, -1), Y, P.forearmBend));

  const prims: Primitive[] = [];
  // 손바닥 몸통
  prims.push(roundBox([4.9, 0.0, -0.15], [3.5, 0.32, 2.72], 1.05, 0));
  // 손등의 완만한 둥근 면
  prims.push(ellipsoid([5.3, 0.5, -0.15], [X, Y, Z], [4.3, 0.95, 3.25], 1.0));
  // 손목과 아래팔 (아래팔 방향으로 조금 꺾여 있다). 팔꿈치 쪽은 화면에서 흐려지게 칠한다 (handGeometry.ts)
  prims.push(roundCone(mul(forearmDir, FOREARM_LENGTH), [1.0, 0, -0.1], 2.6, 2.0, 1.3, { y: 0.88, z: 1.32 }));
  // 엄지 두덩, 새끼 두덩, 손가락 뿌리 아래 살
  const thenarAxis = norm(rotate(X, Y, 38));
  prims.push(ellipsoid([3.0, -0.8, -2.15], [thenarAxis, Y, norm(cross(thenarAxis, Y))], [2.9, 1.3, 1.6], 1.1));
  prims.push(ellipsoid([3.5, -0.68, 2.45], [X, Y, Z], [3.2, 1.05, 1.25], 0.9));
  prims.push(ellipsoid([8.0, -0.72, -0.15], [X, Y, Z], [1.35, 0.78, 3.35], 0.7));

  // 네 손가락
  for (const name of ["index", "middle", "ring", "pinky"] as FingerName[]) {
    const c = chains[name];
    const k = [0.55, 0.22, 0.18];
    for (let s = 0; s < 3; s++) {
      prims.push(roundCone(c.joints[s], c.joints[s + 1], c.radii[s], c.radii[s + 1], k[s]));
    }
  }

  const idx = chains.index;
  const indexDir = idx.tipDir;
  const indexTip = add(idx.joints[3], mul(idx.tipDir, idx.radii[3]));

  // 지휘봉 축: 손바닥 가운데(코르크) → 검지 둘째 마디의 엄지 쪽 옆면
  const corkCenter: V3 = [4.6, -2.55, 1.15];
  const midPhalanx = mul(add(idx.joints[1], idx.joints[2]), 0.5);
  const contact = add(add(midPhalanx, mul(idx.side, idx.radii[2] + BATON.shaftBase + 0.05)), mul(Y, 0.15));
  const batonAxis = norm(sub(contact, corkCenter));

  // 엄지
  let thumb: { cmc: V3; mcp: V3; ip: V3; tip: V3 };
  if (pose === "grip") {
    // 엄지 끝 살이 검지보다 조금 손목 쪽에서, 막대를 반대편(엄지 쪽)에서 누른다
    const along = (t: number) => add(corkCenter, mul(batonAxis, t));
    const tContact = sub(contact, corkCenter);
    const reach = Math.hypot(tContact[0], tContact[1], tContact[2]);
    const onShaft = along(reach - 1.1);
    const awayFromIndex = norm(sub(idx.side, mul(batonAxis, dot(idx.side, batonAxis))));
    const tip = add(onShaft, mul(awayFromIndex, BATON.shaftBase + 0.8));
    const cmc: V3 = [1.7, -0.95, -2.35];
    const mcp: V3 = [5.6, -1.55, -4.55];
    const ip = add(add(mul(add(mcp, tip), 0.5), mul(Z, -0.55)), mul(Y, 0.35));
    thumb = { cmc, mcp, ip, tip };
  } else {
    // 맨손: 엄지를 말아 쥔 가운뎃손가락 둘째 마디 위에 얹는다
    const mid = chains.middle;
    const m = mul(add(mid.joints[1], mid.joints[2]), 0.5);
    const tip = add(add(m, mul(X, 1.45)), mul(Z, -0.4));
    const cmc: V3 = [1.7, -0.95, -2.35];
    const mcp: V3 = [5.4, -1.5, -4.2];
    const ip = add(add(mul(add(mcp, tip), 0.5), mul(Z, -0.7)), mul(Y, -0.1));
    thumb = { cmc, mcp, ip, tip };
  }
  prims.push(roundCone(thumb.cmc, thumb.mcp, 1.45, 1.1, 0.9));
  prims.push(roundCone(thumb.mcp, thumb.ip, 1.1, 0.95, 0.25));
  prims.push(roundCone(thumb.ip, thumb.tip, 0.95, 0.82, 0.18));

  if (pose === "grip") {
    // 지휘봉이 들어갈 자리를 살짝 파낸다 (손가락이 막대를 파고들지 않고 눌러 감싼 것처럼 보인다)
    const back = add(corkCenter, mul(batonAxis, -2.6));
    const front = add(corkCenter, mul(batonAxis, BATON.corkFront));
    const farther = add(corkCenter, mul(batonAxis, 16));
    const carve = (p: Primitive): Primitive => ({ ...p, carve: true });
    prims.push(carve(roundCone(back, front, 1.12 + 0.08, BATON.shaftBase + 0.1, 0.25)));
    prims.push(carve(roundCone(front, farther, BATON.shaftBase + 0.08, BATON.shaftBase * 0.7, 0.2)));
  }

  return { pose, primitives: prims, corkCenter, batonAxis, indexTip, indexDir, forearmDir };
}
