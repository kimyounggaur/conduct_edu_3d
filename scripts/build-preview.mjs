/**
 * 한 파일짜리 미리보기 HTML 만들기: npm run build:preview → .preview/conducting-preview.html
 *
 * 실제 앱(Next.js)과 같은 화면 코드를 esbuild로 묶고, Tailwind CSS와 악보 숫자 글꼴을 한 파일에 넣는다.
 * 인터넷 연결 없이 열리고, 파일 하나로 공유할 수 있다. (Pretendard 대신 기기 기본 한글 글꼴을 쓴다)
 */
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, ".preview");
mkdirSync(outDir, { recursive: true });

// 1) CSS: 앱과 같은 globals.css를 Tailwind로 처리
const cssPath = join(root, "src/app/globals.css");
const cssResult = await postcss([tailwind({ base: root, optimize: { minify: true } })]).process(readFileSync(cssPath, "utf8"), {
  from: cssPath,
});
const font = readFileSync(join(root, "src/app/fonts/podium-numerals.woff2")).toString("base64");
const css =
  `@font-face{font-family:"Podium Numerals";src:url(data:font/woff2;base64,${font}) format("woff2");font-display:block}` +
  `:root{--font-podium-numerals:"Podium Numerals"}` +
  cssResult.css;

// 2) JS: next/link·next/navigation은 해시 주소용 대체품으로 바꿔 묶는다
const alias = {
  name: "alias",
  setup(b) {
    b.onResolve({ filter: /^next\/link$/ }, () => ({ path: join(root, "preview/shims/link.tsx") }));
    b.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: join(root, "preview/shims/navigation.ts") }));
    b.onResolve({ filter: /^@\// }, (args) => b.resolve("./" + args.path.slice(2), { kind: args.kind, resolveDir: join(root, "src") }));
  },
};
const js = await build({
  entryPoints: [join(root, "preview/entry.tsx")],
  bundle: true,
  write: false,
  format: "iife",
  minify: true,
  target: ["es2020", "safari15"],
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [alias],
  logLevel: "error",
});
const script = js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

// 3) HTML 두 가지
//  - conducting-preview.html : 그대로 열 수 있는 완전한 HTML 파일
//  - conducting-artifact.html: Claude 아티팩트용 본문 조각 (문서 틀은 아티팩트가 씌운다)
const body = `<style>${css}</style>
<div id="root"></div>
<script>${script}</script>
`;
const full = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>지휘 기초</title>
<meta name="description" content="지휘봉의 궤적을 메트로놈 박자에 맞춰 보며 배우는 지휘 입문 연습실 (미리보기)">
<link rel="icon" href="data:image/svg+xml;base64,${readFileSync(join(root, "src/app/icon.svg")).toString("base64")}">
</head>
<body>
${body}</body>
</html>
`;
const fragment = `<title>지휘 기초</title>
<script>document.documentElement.lang = "ko";</script>
${body}`;
const outFull = join(outDir, "conducting-preview.html");
const outFragment = join(outDir, "conducting-artifact.html");
writeFileSync(outFull, full);
writeFileSync(outFragment, fragment);
console.log(`미리보기 저장: ${outFull} (${(full.length / 1024).toFixed(0)} KB)`);
console.log(`아티팩트용 저장: ${outFragment}`);
