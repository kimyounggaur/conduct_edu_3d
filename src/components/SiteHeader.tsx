"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "배우는 순서" },
  { href: "/library", label: "패턴 연습" },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="border-b border-rule bg-sheet">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-[17px] font-bold tracking-tight text-ink">
          <BatonMark />
          지휘 기초
        </Link>
        <nav className="flex items-center gap-1" aria-label="주요 메뉴">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[15px] text-graphite transition-colors hover:bg-wash hover:text-ink",
                  active && "bg-wash font-semibold text-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

/** 작은 지휘봉 표시 */
function BatonMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <line x1="4" y1="18" x2="19" y2="3" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="5.6" cy="16.4" rx="3" ry="1.7" transform="rotate(-45 5.6 16.4)" fill="#C9A47E" />
      <circle cx="19" cy="3" r="2.2" fill="var(--beat-strong)" />
    </svg>
  );
}
