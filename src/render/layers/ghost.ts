/** 정적 레이어: 박점면, 전체 도형(고스트), 박점, 번호 — 패턴·옵션·크기가 바뀔 때만 다시 그린다 */
import type { PreparedPattern } from "@/engine/trajectory";
import { pathPolyline } from "@/engine/trajectory";
import { accentColor, accentTextColor, palette } from "@/lib/palette";
import { toScreen, type ViewTransform } from "../transform";

export interface StaticOptions {
  showGhost: boolean;
  showNumbers: boolean;
  showPlane: boolean;
}

export const NUMBER_FONT = '"Pretendard Variable", Pretendard, system-ui, -apple-system, sans-serif';

export function numberRadius(tf: ViewTransform): number {
  return Math.min(15, Math.max(9, tf.scale * 0.034));
}

export function drawStatic(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tf: ViewTransform,
  pp: PreparedPattern,
  opts: StaticOptions,
): void {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = palette.sheet;
  ctx.fillRect(0, 0, w, h);

  // 박점면: 모든 박이 찍히는 가로선
  if (opts.showPlane) {
    const [, y] = toScreen(tf, [0, 0]);
    ctx.save();
    ctx.strokeStyle = palette.rule;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.moveTo(w * 0.04, y);
    ctx.lineTo(w * 0.96, y);
    ctx.stroke();
    ctx.restore();
  }

  // 전체 도형
  if (opts.showGhost) {
    const line = pathPolyline(pp);
    ctx.save();
    ctx.strokeStyle = palette.ink;
    ctx.globalAlpha = 0.16;
    ctx.lineWidth = Math.max(1.5, tf.scale * 0.006);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    line.forEach((p, i) => {
      const [x, y] = toScreen(tf, p);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
  }

  // 박점과 보조 박점
  const dotR = Math.max(3.5, tf.scale * 0.011);
  for (const beat of pp.beats) {
    for (const s of beat.subIctus) {
      const [x, y] = toScreen(tf, s);
      ctx.fillStyle = palette.weak;
      ctx.beginPath();
      ctx.arc(x, y, dotR * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    const [x, y] = toScreen(tf, beat.P);
    ctx.fillStyle = accentColor(beat.accent);
    ctx.beginPath();
    ctx.arc(x, y, dotR, 0, Math.PI * 2);
    ctx.fill();
  }

  // 번호: 박점면 아래 한 줄
  if (opts.showNumbers) {
    const r = numberRadius(tf);
    ctx.font = `700 ${Math.round(r * 1.15)}px ${NUMBER_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const beat of pp.beats) {
      const [lx, ly] = toScreen(tf, beat.label);
      const [px] = toScreen(tf, beat.P);
      // 번호가 박점에서 옆으로 밀렸으면 가는 선으로 이어 준다
      if (Math.abs(lx - px) > r * 0.6) {
        const [, py] = toScreen(tf, beat.P);
        ctx.strokeStyle = palette.rule;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, py + dotR + 2);
        ctx.lineTo(lx, ly - r);
        ctx.stroke();
      }
      ctx.fillStyle = accentColor(beat.accent);
      ctx.beginPath();
      ctx.arc(lx, ly, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = accentTextColor(beat.accent);
      ctx.fillText(String(beat.n), lx, ly + r * 0.06);
    }
  }
}
