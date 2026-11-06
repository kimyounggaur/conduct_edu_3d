import Link from "next/link";

/**
 * 위쪽 줄: 로고(누르면 홈)와, 화면마다 다른 오른쪽 버튼 한 개.
 * widthClass: 아래 본문 칸과 같은 최대 너비를 줘서, 버튼이 본문 경계 안쪽에 오도록 맞춘다.
 */
export function SiteHeader({
  actions,
  widthClass = "max-w-[1100px]",
}: {
  actions?: React.ReactNode;
  widthClass?: string;
}) {
  return (
    <header className="border-b border-rule bg-sheet px-4 sm:px-6">
      <div className={`mx-auto flex h-14 w-full items-center justify-between gap-4 ${widthClass}`}>
        <Link href="/" className="flex items-center gap-2 text-[17px] font-bold tracking-tight text-ink">
          <BatonMark />
          지휘 기초
        </Link>
        {actions}
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
