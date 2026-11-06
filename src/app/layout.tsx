import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

// 박자표·메트로놈 표기용 악보 숫자 (Bravura에서 필요한 글자만 뽑은 OFL 파생 폰트)
const podiumNumerals = localFont({
  src: "./fonts/podium-numerals.woff2",
  variable: "--font-podium-numerals",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "지휘 기초",
  description: "박자 패턴부터 예비박, 끝맺음, 진입 신호까지. 지휘봉의 궤적을 박자에 맞춰 보며 배우는 지휘 입문 연습실.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f3f5f8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={podiumNumerals.variable}>
      <body>
        <TooltipProvider delayDuration={400}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
