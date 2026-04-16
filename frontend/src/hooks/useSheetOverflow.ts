import { useEffect } from "react";

export function useSheetOverflow(open: boolean) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const nav = document.querySelector("nav.fixed") as HTMLElement | null;
    if (nav) nav.style.display = "none";
    return () => {
      document.body.style.overflow = "";
      if (nav) nav.style.display = "";
    };
  }, [open]);
}
