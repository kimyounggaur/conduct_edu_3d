/**
 * 모든 패턴의 궤적을 SVG로 저장한다: docs/pattern-previews/
 *   npm run demo:trajectory
 *
 * 그림 읽는 법
 * - 굵은 선: 지휘봉 끝이 지나가는 길 (한 마디)
 * - 색 동그라미 + 숫자: 박점 (진한 파랑 = 강박, 중간 = 중강박, 연한 = 약박)
 * - 작은 회색 점: 같은 시간 간격으로 찍은 위치. 촘촘하면 느리게, 듬성하면 빠르게 움직이는 곳
 * - 속이 빈 동그라미: 반동 정점(가장 느려지는 곳)
 * - 점선: 박점면
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PATTERNS, PATTERN_GROUPS, getPattern } from "../src/engine/patterns";
import { pathPolyline, preparePattern, timingBeads } from "../src/engine/trajectory";
import type { Articulation, PatternDef, Vec3 } from "../src/engine/types";
import { palette } from "../src/lib/palette";

const OUT = join(process.cwd(), "docs", "pattern-previews");
const W = 400;
const H = 300;
const tf = { cx: W / 2, baseY: H * 0.8, scale: Math.min(H * 0.7, W / 1.6) };
const px = (p: Vec3) => `${(tf.cx + tf.scale * p[0]).toFixed(1)},${(tf.baseY - tf.scale * p[1]).toFixed(1)}`;
const xy = (p: Vec3) => [tf.cx + tf.scale * p[0], tf.baseY - tf.scale * p[1]] as const;

function panel(pattern: PatternDef, articulation: Articulation = "neutral", title?: string): string {
  const pp = preparePattern(pattern, { articulation });
  const path = pathPolyline(pp);
  const beads = timingBeads(pp, 16);
  const parts: string[] = [];
  parts.push(`<rect width="${W}" height="${H}" fill="${palette.sheet}" stroke="${palette.rule}"/>`);
  parts.push(
    `<line x1="20" y1="${tf.baseY}" x2="${W - 20}" y2="${tf.baseY}" stroke="${palette.rule}" stroke-width="1.5" stroke-dasharray="6 5"/>`,
  );
  parts.push(
    `<polyline points="${path.map(px).join(" ")}" fill="none" stroke="${palette.ink}" stroke-opacity="0.75" stroke-width="2.2" stroke-linejoin="round"/>`,
  );
  for (const b of beads) {
    const [x, y] = xy(b);
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.6" fill="${palette.graphite}" fill-opacity="0.7"/>`);
  }
  for (const beat of pp.beats) {
    const [ax, ay] = xy(beat.apex);
    parts.push(`<circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="4" fill="none" stroke="${palette.graphite}" stroke-width="1.2"/>`);
    for (const s of beat.subIctus) {
      const [sx, sy] = xy(s);
      parts.push(`<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="4" fill="${palette.weak}"/>`);
    }
    const [x, y] = xy(beat.P);
    const color = palette[beat.accent];
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="${color}"/>`);
    const [lx, ly] = xy(beat.label);
    parts.push(
      `<circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="10" fill="${color}"/>` +
        `<text x="${lx.toFixed(1)}" y="${(ly + 4.5).toFixed(1)}" font-family="Noto Sans CJK KR, sans-serif" font-size="13" font-weight="700" text-anchor="middle" fill="${beat.accent === "weak" ? palette.ink : "#fff"}">${beat.n}</text>`,
    );
  }
  const label = title ?? `${pattern.nameKo} · ${pattern.timeSignature}${pattern.weights ? ` (${pattern.weights.join("+")})` : ""}`;
  parts.push(
    `<text x="12" y="22" font-family="Noto Sans CJK KR, sans-serif" font-size="15" font-weight="700" fill="${palette.ink}">${label}</text>`,
  );
  return parts.join("\n");
}

function svg(inner: string, w = W, h = H) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n${inner}\n</svg>\n`;
}

mkdirSync(OUT, { recursive: true });

// 패턴별 파일
for (const p of PATTERNS) writeFileSync(join(OUT, `${p.id}.svg`), svg(panel(p)));

// 전체 모음 (묶음 순서대로, 한 줄에 4개)
const ordered = PATTERN_GROUPS.flatMap((g) => g.patternIds);
const cols = 4;
const rows = Math.ceil(ordered.length / cols);
const sheet = ordered
  .map((id, i) => `<g transform="translate(${(i % cols) * W},${Math.floor(i / cols) * H})">${panel(getPattern(id))}</g>`)
  .join("\n");
writeFileSync(join(OUT, "all-patterns.svg"), svg(sheet, cols * W, rows * H));

// 주법 비교 (4박자)
const arts: Articulation[] = ["legato", "neutral", "staccato", "marcato"];
const names: Record<Articulation, string> = { legato: "레가토", neutral: "보통", staccato: "스타카토", marcato: "마르카토" };
const artSheet = arts
  .map((a, i) => `<g transform="translate(${i * W},0)">${panel(getPattern("FOUR"), a, `4박자 · ${names[a]}`)}</g>`)
  .join("\n");
writeFileSync(join(OUT, "four-articulations.svg"), svg(artSheet, arts.length * W, H));

console.log(`${PATTERNS.length}개 패턴 + 모음 2장 저장: ${OUT}`);
