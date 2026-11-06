/**
 * 미리보기(한 파일 빌드)용 next/link 대체: 주소를 해시 이름으로 바꿔 한 페이지 안에서 화면을 바꾼다.
 *   "/" → #home, "/library" → #library, "/library?pattern=FOUR" → #library-four
 */
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { patternHashName } from "@/lib/requestedPattern";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | { pathname?: string };
  children?: ReactNode;
};

export function toHash(raw: string): string {
  if (!raw.startsWith("/")) return raw;
  const [path, query = ""] = raw.split("?");
  if (path.startsWith("/library")) {
    const pattern = new URLSearchParams(query).get("pattern");
    return `#${pattern ? patternHashName(pattern) : "library"}`;
  }
  return "#home";
}

export default function Link({ href, children, ...rest }: Props) {
  const raw = typeof href === "string" ? href : (href.pathname ?? "/");
  return (
    <a href={toHash(raw)} {...rest}>
      {children}
    </a>
  );
}
