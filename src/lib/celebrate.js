import confetti from 'canvas-confetti';

/** A bounded, decorative burst. Mount inside a dialog to remain in its top layer. */
export function celebrate({ subtle = false } = {}) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.createElement("canvas");
  canvas.className = "pf-celebration";
  canvas.setAttribute("aria-hidden", "true");
  (document.querySelector("dialog[open]") || document.body).append(canvas);
  const burst = confetti.create(canvas, { resize: true });
  burst({ particleCount: subtle ? 18 : 42, spread: subtle ? 40 : 64,
    startVelocity: subtle ? 16 : 24, gravity: 1.1, ticks: 100,
    origin: { x: .5, y: .55 }, scalar: .7,
    colors: ["#c2410c", "#f97316", "#15803d", "#1e3a8a"],
    disableForReducedMotion: true });
  window.setTimeout(() => { burst.reset(); canvas.remove(); }, 2200);
}
