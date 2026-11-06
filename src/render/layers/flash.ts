/** 박점 플래시: 박점을 지나는 순간 그 자리에 링이 0.5→1.2배로 150ms 동안 퍼진다 */
import { FLASH_SEC, type IctusInfo } from "@/engine/playback";
import { accentColor } from "@/lib/palette";
import { toScreen, type ViewTransform } from "../transform";
import { numberRadius } from "./ghost";

export function drawFlash(ctx: CanvasRenderingContext2D, tf: ViewTransform, tau: number, ictus: IctusInfo | null): void {
  if (!ictus) return;
  const age = tau - ictus.t;
  if (age < 0 || age > FLASH_SEC) return;
  const p = age / FLASH_SEC;
  const [x, y] = toScreen(tf, ictus.point);
  const base = numberRadius(tf) * (ictus.sub ? 1.0 : 1.6);
  const color = accentColor(ictus.accent);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 1 - p;
  ctx.lineWidth = Math.max(2, tf.scale * 0.008) * (1 - p * 0.5);
  ctx.beginPath();
  ctx.arc(x, y, base * (0.5 + 0.7 * p), 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.35 * (1 - p);
  ctx.beginPath();
  ctx.arc(x, y, base * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
