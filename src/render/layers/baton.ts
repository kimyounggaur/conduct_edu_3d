/**
 * 지휘봉과 손 (DESIGN.md 7.4, 부록 A 기준점)
 * - 지휘봉 끝 = 궤적 점. 손 = 끝 + (0.22, -0.16). 팔꿈치 = (0.45, -0.45) 고정.
 * - 맨손 모드: 손 모양의 검지 끝이 궤적 점.
 * 좌표는 정규화 공간에서 계산한 뒤 화면으로 옮기므로 좌우 반전이 자동으로 적용된다.
 */
import type { Vec3 } from "@/engine/types";
import { palette } from "@/lib/palette";
import { toScreen, type ViewTransform } from "../transform";

const HAND_OFFSET: Vec3 = [0.22, -0.16, 0];
const FINGER_HAND_OFFSET: Vec3 = [0.07, -0.085, 0];
const ELBOW: Vec3 = [0.45, -0.45, 0];

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

export function drawBaton(
  ctx: CanvasRenderingContext2D,
  tf: ViewTransform,
  tip: Vec3,
  withBaton: boolean,
  tipColor: string,
): void {
  const s = tf.scale;
  const hand = add(tip, withBaton ? HAND_OFFSET : FINGER_HAND_OFFSET);
  const [ex, ey] = toScreen(tf, ELBOW);
  const [hx, hy] = toScreen(tf, hand);
  const [tx, ty] = toScreen(tf, tip);

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // 아래팔: 손에서 팔꿈치 쪽으로 옅어지는 선 (손이 어디서 오는지 암시만 한다)
  const arm = ctx.createLinearGradient(hx, hy, ex, ey);
  arm.addColorStop(0, "rgba(90, 100, 120, 0.22)");
  arm.addColorStop(0.55, "rgba(90, 100, 120, 0.06)");
  arm.addColorStop(1, "rgba(90, 100, 120, 0)");
  ctx.strokeStyle = arm;
  ctx.lineWidth = s * 0.05;
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(hx, hy);
  ctx.stroke();

  if (withBaton) {
    // 지휘봉: 손잡이 쪽이 굵고 끝이 가는 막대
    const dx = tx - hx;
    const dy = ty - hy;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const w0 = Math.max(2.2, s * 0.009);
    const w1 = Math.max(0.9, s * 0.003);
    ctx.fillStyle = palette.ink;
    ctx.beginPath();
    ctx.moveTo(hx + nx * w0, hy + ny * w0);
    ctx.lineTo(tx + nx * w1, ty + ny * w1);
    ctx.lineTo(tx - nx * w1, ty - ny * w1);
    ctx.lineTo(hx - nx * w0, hy - ny * w0);
    ctx.closePath();
    ctx.fill();
    // 코르크 손잡이
    const ux = dx / len;
    const uy = dy / len;
    ctx.fillStyle = palette.cork;
    ctx.beginPath();
    ctx.ellipse(hx + ux * s * 0.012, hy + uy * s * 0.012, s * 0.032, s * 0.016, Math.atan2(uy, ux), 0, Math.PI * 2);
    ctx.fill();
    // 손 (주먹)
    ctx.fillStyle = palette.graphite;
    ctx.beginPath();
    ctx.arc(hx, hy, s * 0.04, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 맨손: 검지를 편 손
    ctx.strokeStyle = palette.graphite;
    ctx.lineWidth = Math.max(4, s * 0.022);
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.fillStyle = palette.graphite;
    ctx.beginPath();
    ctx.arc(hx, hy, s * 0.048, 0, Math.PI * 2);
    ctx.fill();
  }

  // 끝점: 잔상이 따라가는 점
  const r = Math.max(4, s * 0.012);
  ctx.fillStyle = palette.sheet;
  ctx.beginPath();
  ctx.arc(tx, ty, r + 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = tipColor;
  ctx.beginPath();
  ctx.arc(tx, ty, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
