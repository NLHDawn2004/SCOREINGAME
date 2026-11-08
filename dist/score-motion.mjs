const rendered = new WeakMap();
const eliminationDuration = 3400;
const enterEnd = 280 / eliminationDuration;
const holdEnd = 3050 / eliminationDuration;

function playElimination(tag, elapsed, reducedMotion) {
 const start = { opacity: reducedMotion ? 1 : 0, transform: reducedMotion ? 'none' : 'scaleX(.04)' };
 const full = { opacity: 1, transform: 'scaleX(1)' };
 const animation = tag.animate([
  { ...start, offset: 0, easing: 'cubic-bezier(.19,1,.34,1)' },
  { ...full, offset: enterEnd },
  { ...full, offset: holdEnd, easing: 'ease-in-out' },
  { ...full, opacity: 0, offset: 1 },
 ], { duration: eliminationDuration });
 animation.currentTime = elapsed;
}

export function paintRows(container, html, scope) {
 const previous = rendered.get(container);
 if (previous?.html === html && previous.scope === scope && container.firstElementChild) return;
 const animate = previous?.scope === scope;
 const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const oldRows = new Map();
 if (animate) {
  for (const row of container.children) {
   const tag = row.querySelector('.eliminated-tag');
   oldRows.set(row.dataset.rowKey, {
    top: row.getBoundingClientRect().top,
    eliminated: row.classList.contains('out'),
    tagTime: tag?.getAnimations()[0]?.currentTime,
   });
  }
 }
 container.innerHTML = html;
 rendered.set(container, { html, scope });
 if (!animate) return;
 for (const row of container.children) {
  const old = oldRows.get(row.dataset.rowKey);
  if (!old) continue;
  const movement = old.top - row.getBoundingClientRect().top;
  if (!reducedMotion && Math.abs(movement) >= 1) {
   row.animate([{transform:`translateY(${movement}px)`},{transform:'translateY(0)'}],
    {duration:340,easing:'cubic-bezier(.2,.75,.25,1)'});
  }
  const tag = row.querySelector('.eliminated-tag');
  const elapsed = old.eliminated ? old.tagTime : 0;
  if (tag && typeof elapsed === 'number' && elapsed < eliminationDuration) {
   playElimination(tag, elapsed, reducedMotion);
  }
 }
}
