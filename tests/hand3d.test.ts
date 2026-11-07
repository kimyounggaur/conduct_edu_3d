/**
 * 입체 손 (src/render3d): 지휘봉 끝·검지 끝이 궤적 점에 정확히 놓이는지, 화면 위치가 2D와 같은지
 */
import { describe, expect, it } from "vitest";
import { Matrix4, OrthographicCamera, Vector3 } from "three";
import { buildRig } from "@/render3d/handPose";
import { HAND_CELL, handGeometry, handGeometryAsync } from "@/render3d/handGeometry";
import { FINGER_HAND_OFFSET, HAND_OFFSET, alignFrames, configureCamera, placeHand } from "@/render3d/HandRenderer";
import { polygonize, roundCone } from "@/render3d/sdf";
import { isMirrored, makeTransform, toScreen, type ViewMode } from "@/render/transform";
import type { Vec3 } from "@/engine/types";

const TIPS: Vec3[] = [
  [0, 0, 0],
  [-0.5, 0.05, 0],
  [0.5, 0.05, 0],
  [0.02, 0.95, 0],
  [-0.3, 0.4, 0.12],
];

/** 손 좌표(cm)의 점을 세계(three.js) 좌표로 */
function toWorld(place: ReturnType<typeof placeHand>, local: [number, number, number]) {
  const m = new Matrix4().compose(
    new Vector3(...place.position),
    place.quaternion,
    new Vector3(place.scale, place.scale, place.scale),
  );
  return new Vector3(...local).applyMatrix4(m);
}

describe("입체 손 위치", () => {
  const grip = buildRig("grip");
  const point = buildRig("point");

  it("지휘봉 끝이 궤적 점에 놓인다", () => {
    for (const tip of TIPS) {
      const place = placeHand(grip, tip);
      const a = grip.batonAxis;
      const c = grip.corkCenter;
      const end = toWorld(place, [c[0] + a[0] * place.shaftCm, c[1] + a[1] * place.shaftCm, c[2] + a[2] * place.shaftCm]);
      // three.js는 앞쪽이 -z
      expect(end.x).toBeCloseTo(tip[0], 9);
      expect(end.y).toBeCloseTo(tip[1], 9);
      expect(end.z).toBeCloseTo(-tip[2], 9);
    }
  });

  it("코르크 손잡이는 2D 손 자리와 같은 곳에 있다", () => {
    for (const tip of TIPS) {
      const place = placeHand(grip, tip);
      const cork = toWorld(place, grip.corkCenter);
      expect(cork.x).toBeCloseTo(tip[0] + HAND_OFFSET[0], 9);
      expect(cork.y).toBeCloseTo(tip[1] + HAND_OFFSET[1], 9);
    }
  });

  it("맨손이면 검지 끝이 궤적 점에 놓이고, 손은 2D 손 쪽에 있다", () => {
    for (const tip of TIPS) {
      const place = placeHand(point, tip);
      const end = toWorld(place, point.indexTip);
      expect(end.x).toBeCloseTo(tip[0], 9);
      expect(end.y).toBeCloseTo(tip[1], 9);
      // 검지가 2D 손 쪽(오른쪽 아래)에서 끝을 향해 뻗는다
      const knuckle = toWorld(place, [9.2, 0.3, -2.7]);
      const want = new Vector3(FINGER_HAND_OFFSET[0], FINGER_HAND_OFFSET[1], 0).normalize();
      const got = new Vector3(knuckle.x - end.x, knuckle.y - end.y, 0).normalize();
      expect(got.dot(want)).toBeGreaterThan(0.95);
    }
  });

  it("두 방향 맞추기: 첫 방향은 정확히, 둘째 방향은 수직 성분을 맞춘다", () => {
    const q = alignFrames([1, 0, 0], [0, 1, 0], [0, 0, -1], [0, 1, 1]);
    const a = new Vector3(1, 0, 0).applyQuaternion(q);
    const b = new Vector3(0, 1, 0).applyQuaternion(q);
    expect(a.x).toBeCloseTo(0, 9);
    expect(a.z).toBeCloseTo(-1, 9);
    expect(b.y).toBeCloseTo(1, 9);
  });
});

describe("입체 손 카메라 = 2D 화면 변환", () => {
  const cases: Array<[ViewMode, boolean]> = [
    ["conductor", false],
    ["audience", false],
    ["conductor", true],
    ["audience", true],
  ];
  for (const [view, left] of cases) {
    it(`${view}${left ? " · 왼손잡이" : ""}: 같은 점이 같은 픽셀에 찍힌다`, () => {
      const W = 835;
      const H = 626;
      const cam = new OrthographicCamera(-1, 1, 1, -1, 0.01, 40);
      configureCamera(cam, view, W, H);
      const tf = makeTransform(W, H, isMirrored(view, left));
      for (const p of TIPS) {
        // 왼손잡이는 모델 전체를 x로 뒤집는다 (HandRenderer의 root)
        const world = new Vector3(left ? -p[0] : p[0], p[1], -p[2]);
        const ndc = world.clone().project(cam);
        const px = ((ndc.x + 1) / 2) * W;
        const py = ((1 - ndc.y) / 2) * H;
        const [sx, sy] = toScreen(tf, p);
        expect(px).toBeCloseTo(sx, 6);
        expect(py).toBeCloseTo(sy, 6);
      }
    });
  }
});

describe("입체 손 모양 (부드러운 한 덩어리)", () => {
  it("둥근 막대 하나가 바깥을 향한 삼각형으로 닫힌 면이 된다", () => {
    const m = polygonize([roundCone([0, 0, 0], [4, 0, 0], 1, 0.6, 0)], 0.25);
    expect(m.indices.length).toBeGreaterThan(300);
    // 모든 모서리를 정확히 두 삼각형이 나눠 쓴다 = 구멍 없는 닫힌 면
    const edges = new Map<string, number>();
    for (let t = 0; t < m.indices.length; t += 3) {
      for (let e = 0; e < 3; e++) {
        const a = m.indices[t + e];
        const b = m.indices[t + ((e + 1) % 3)];
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    expect([...edges.values()].every((n) => n === 2)).toBe(true);
  });

  it("손 메시: 크기가 사람 손 정도이고 법선이 단위 길이다", () => {
    for (const pose of ["grip", "point"] as const) {
      const g = handGeometry(buildRig(pose));
      const pos = g.getAttribute("position");
      const nor = g.getAttribute("normal");
      expect(pos.count).toBeGreaterThan(3000);
      g.computeBoundingBox();
      const box = g.boundingBox!;
      // 손가락 끝 ~ 손목 (아래팔은 화면에서 흐려지는 부분까지 포함)
      expect(box.max.x).toBeGreaterThan(11);
      expect(box.max.x).toBeLessThan(22);
      for (let i = 0; i < nor.count; i += 97) {
        expect(Math.hypot(nor.getX(i), nor.getY(i), nor.getZ(i))).toBeCloseTo(1, 3);
      }
    }
  });

  it("나눠서 계산해도 한 번에 계산한 것과 같다", async () => {
    const rig = buildRig("point");
    const sync = handGeometry(rig, HAND_CELL);
    const sliced = await handGeometryAsync(rig, HAND_CELL);
    expect(sliced.getAttribute("position").count).toBe(sync.getAttribute("position").count);
    expect(sliced.getIndex()!.count).toBe(sync.getIndex()!.count);
  });
});
