"use client";

import { useEffect } from "react";

const MESSAGE = "You have unsaved changes. Leave without saving them?";

// While `active`, asks before anything throws away unsaved work: closing or reloading the tab,
// following a link inside the app (client-side navigation never fires beforeunload), or a form
// that leaves the page, such as Sign out (marked data-leaves-page).
export function useUnsavedChanges(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let confirmed = false;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (confirmed) return;
      event.preventDefault();
      // Safari and older Chromium still need returnValue set.
      event.returnValue = "";
    };

    const ask = (event: Event) => {
      if (window.confirm(MESSAGE)) {
        confirmed = true;
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    // Capture on window runs before React's own handlers, so a cancelled click never reaches next/link.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return; // a full page load: beforeunload covers it
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      ask(event);
    };

    const onSubmit = (event: SubmitEvent) => {
      if (event.target instanceof HTMLFormElement && event.target.hasAttribute("data-leaves-page")) ask(event);
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("click", onClick, true);
    window.addEventListener("submit", onSubmit, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("submit", onSubmit, true);
    };
  }, [active]);
}
