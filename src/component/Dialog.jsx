import { useId, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";

/** Native top-layer modal: background inertness, focus containment and Escape. */
export default function Dialog({ children, onClose, className = "wl-modal", overlayClassName = "wl-overlay", labelledBy, describedBy, role = "dialog" }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  const titleId = useId();
  useLayoutEffect(() => { closeRef.current = onClose; });

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    const title = dialog.querySelector("h2");
    if (!labelledBy && title) {
      title.id ||= titleId;
      dialog.setAttribute("aria-labelledby", title.id);
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    // Focus the title first so the purpose is announced before its controls.
    if (title) { title.tabIndex = -1; title.focus({ preventScroll: true }); }
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      queueMicrotask(() => {
        if (document.querySelector("dialog[open]")) return;
        if (trigger?.isConnected && trigger !== document.body) trigger.focus({ preventScroll: true });
        else {
          const fallback = document.querySelector("main h1, main");
          if (fallback) { fallback.tabIndex = -1; fallback.focus({ preventScroll: true }); }
        }
      });
    };
  }, [labelledBy, titleId]);

  return createPortal(
    <dialog ref={dialogRef} className={`pf-dialog ${overlayClassName}`} role={role}
      aria-modal="true" aria-labelledby={labelledBy} aria-describedby={describedBy}
      onCancel={(event) => { event.preventDefault(); closeRef.current?.(); }}
      onClick={(event) => { if (event.target === event.currentTarget) closeRef.current?.(); }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const focusable = [...event.currentTarget.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')]
          .filter((node) => node.getClientRects().length > 0);
        const first = focusable[0], last = focusable.at(-1);
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === first || !focusable.includes(document.activeElement))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !focusable.includes(document.activeElement))) { event.preventDefault(); first.focus(); }
      }}>
      <div className={className}>{children}</div>
    </dialog>, document.body
  );
}
