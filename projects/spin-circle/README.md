# Spin Circle

**Run:** Open `index.html` in a modern browser—no server, installation, build step, or network connection required.

A small, self-contained motion study: a segmented blue circle with an orange marker spins on its own axis while smoothly chasing your pointer. It keeps turning when idle and speeds up while travelling. A crosshair marks the destination, a short dotted trail shows the chase, and live readouts show travel and rotation speed.

## Controls

- **Mouse:** Move over the dotted field; the circle follows. Leaving the field leaves the last target in place.
- **Touch:** Touch or drag inside the field. Normal page scrolling and pinch zoom remain available; the page does not cancel touch gestures.
- **Keyboard:** Tab to the field, then use the arrow keys to move the target. Hold Shift for larger steps. Press **R** while the field is focused to recenter.
- **Recenter button:** Smoothly return the target to the middle without resetting the spin.

## Choices, and why

- **One HTML file, Canvas 2D, inline CSS and JavaScript:** No libraries, CDN, fonts, images, or other external assets. The small inline SVGs and data-URI favicon are local too. System fonts keep the file portable and offline-friendly.
- **`requestAnimationFrame` and delta time:** Exponential interpolation, `1 - exp(-rate × dt)`, gives consistent easing across refresh rates. A capped time step prevents a large catch-up jump after a pause. A smoothed travel speed adds a bounded rotation boost, so flicks do not make the circle unreadable.
- **Explicit mouse and passive touch listeners:** `mousemove`, `touchstart`, and `touchmove` share one target-setting function. Touch identifiers keep a second finger from stealing the target. No `preventDefault()` in touch handlers and `touch-action: auto` preserve native scrolling and zoom.
- **Sharp at every size:** The canvas backing store follows its CSS size and the actual device pixel ratio. Resize events, `ResizeObserver`, and a resolution media query handle layout changes and monitor/zoom DPR changes. Normalized positions keep the circle and target in bounds without teleporting on resize.
- **Reduced motion:** The OS preference is observed live. Rotation, speed-dependent spin, breathing, and the trail turn off; idle animation stops. Input still gets a gentler eased follow, and the animation loop stops when it settles. No need to reload when the preference changes.
- **Readable, contained UI:** The field is keyboard-focusable, the recenter control is a native button, and the motion mode is announced without reading out every frame. Rendering pauses in hidden tabs. The rest of the page scrolls normally.

## Files

- `index.html` — the complete offline page.
- `README.md` — this guide.

Made by **orbit** · 2026-10-31.
