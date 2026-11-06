/**
 * 잔상: 최근 trailMs 동안 지휘봉 끝이 지나간 자취. 시간으로 되짚어 계산하므로 프레임 속도와 무관하다.
 * 겹쳐 그린 여러 겹의 선(띠)으로 오래된 쪽은 가늘고 옅게, 지금 쪽은 굵고 진하게 만든다.
 * (선분마다 따로 그리면 이음매가 구슬처럼 진해지는 문제를 피한다)
 */
import type { Vec3 } from "@/engine/types";
import { toScreen, type ViewTransform } from "../transform";

const BANDS = 8;

export function drawTrail(
  ctx: CanvasRenderingContext2D,
  tf: ViewTransform,
  tau: number,
  trailSec: number,
  positionAt: (tau: number) => Vec3,
  color: string,
): void {
  if (trailSec <= 0.01) return;
  const start = Math.max(0, tau - trailSec);
  const span = tau - start;
  if (span <= 1e-4) return;
  const n = Math.max(16, Math.round(span * 90));
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= n; i++) pts.push(toScreen(tf, positionAt(start + (span * i) / n)));

  const maxW = Math.min(8, Math.max(3, tf.scale * 0.016));
  const minW = 1;
  // 겹이 모두 겹친 머리 쪽 불투명도 ≈ 0.95
  const alpha = 1 - Math.pow(0.05, 1 / BANDS);
  // 재생 직후처럼 잔상이 짧으면 오래된 쪽 겹을 생략한다
  const fill = span / trailSec;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = alpha;
  for (let b = 0; b < BANDS; b++) {
    const from = (b / BANDS - (1 - fill)) / fill; // 이 겹이 시작하는 위치(0~1, 잔상 전체 길이 기준)
    const i0 = Math.max(0, Math.floor(from * n));
    if (i0 >= n) continue;
    ctx.lineWidth = minW + ((maxW - minW) * (b + 1)) / BANDS;
    ctx.beginPath();
    ctx.moveTo(pts[i0][0], pts[i0][1]);
    for (let i = i0 + 1; i <= n; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  ctx.restore();
}
