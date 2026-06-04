import { useEffect } from "react";

/**
 * Lock body scroll and hide the bottom nav while a modal sheet is
 * open, then restore both on close.
 *
 * Three things happen when `open` flips to `true`:
 *   1. `body.overflow = hidden` prevents the page underneath from
 *      scrolling — essential for iOS where the body otherwise
 *      bounces when the user drags the sheet.
 *   2. The fixed bottom navigation is hidden so it doesn't peek
 *      out from behind the sheet at the same z-index.
 *   3. The cleanup function restores both on close (or unmount).
 *
 * The nav selector targets `nav.fixed` specifically — if the nav
 * markup changes, update this selector too or the nav will stick.
 */
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
