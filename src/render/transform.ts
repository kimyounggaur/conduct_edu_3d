/**
 * 정규화 좌표 → 화면 좌표 (DESIGN.md 6.1)
 *
 * - 지휘자(거울) 시점: 지휘자의 오른쪽이 화면 오른쪽. 따라 하기 쉽다.
 * - 청중 시점 또는 왼손잡이: 좌우 반전. 둘 다 켜면 두 번 뒤집혀 원래대로.
 * - 가로·세로 같은 배율(등방)로 그려 화면 비율이 달라도 도형이 찌그러지지 않는다.
 */
import type { Vec } from "@/engine/types";

export type ViewMode = "conductor" | "audience";

export interface ViewTransform {
  cx: number;
  baseY: number;
  scale: number;
  mirror: boolean;
}

/** 화면에서 좌우가 뒤집히는지 */
export function isMirrored(view: ViewMode, leftHanded: boolean): boolean {
  return (view === "audience") !== leftHanded;
}

/** 가로 ±HALF_WIDTH, 세로 박점면 아래 BELOW ~ 위 1.0 이 화면 안에 들어오게 한다 */
const HALF_WIDTH = 0.8;
const BASELINE_RATIO = 0.8;
const HEIGHT_RATIO = 0.7;

export function makeTransform(width: number, height: number, mirror: boolean): ViewTransform {
  const scale = Math.min(height * HEIGHT_RATIO, width / (2 * HALF_WIDTH));
  return { cx: width / 2, baseY: height * BASELINE_RATIO, scale, mirror };
}

export function toScreen(tf: ViewTransform, p: Vec): [number, number] {
  const x = tf.mirror ? -p[0] : p[0];
  return [tf.cx + tf.scale * x, tf.baseY - tf.scale * p[1]];
}

/** 화면 → 정규화 (따라하기 입력용) */
export function fromScreen(tf: ViewTransform, px: number, py: number): [number, number] {
  const x = (px - tf.cx) / tf.scale;
  return [tf.mirror ? -x : x, (tf.baseY - py) / tf.scale];
}
