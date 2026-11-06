import type { Metadata } from "next";
import { LibraryScreen } from "@/components/LibraryScreen";

export const metadata: Metadata = {
  title: "패턴 연습 · 지휘 기초",
  description: "모든 박자 패턴을 골라 메트로놈과 함께 지휘봉의 궤적을 따라 연습합니다.",
};

export default function LibraryPage() {
  return <LibraryScreen />;
}
