/**
 * 미리보기(한 파일 빌드)의 시작점. 실제 앱과 같은 화면 코드를 쓰고, 주소만 해시 이름(#library)으로 바꾼다.
 *   npm run build:preview → .preview/conducting-preview.html
 */
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Home from "@/app/page";
import { LibraryScreen } from "@/components/LibraryScreen";
import { TooltipProvider } from "@/components/ui/tooltip";
import { hashPath } from "./shims/navigation";

function App() {
  const [path, setPath] = useState(hashPath());
  useEffect(() => {
    const update = () => {
      const next = hashPath();
      setPath((prev) => {
        if (prev !== next) window.scrollTo(0, 0);
        return next;
      });
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  // 패턴을 바꾸며 들어오면(#library-three) 화면을 새로 만들어 그 패턴을 읽게 한다
  const key = path.startsWith("/library") ? window.location.hash : "home";
  return (
    <TooltipProvider delayDuration={400}>
      {path.startsWith("/library") ? <LibraryScreen key={key} /> : <Home />}
    </TooltipProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
