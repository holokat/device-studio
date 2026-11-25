// Phone layout: bottom tab bar that opens one sheet at a time.
// Moves and Views live in the library; Finish, Screen and Scene in the inspector.
const LIBRARY = new Set(['moves', 'views']);

export function bindMobile({ inspector, library, libraryTab, onLayout }) {
  const bar = document.getElementById('tabbar');
  const tabs = [...bar.querySelectorAll('[data-tab]')];
  const phone = matchMedia('(max-width:720px)');
  let open = '';

  function set(id) {
    open = phone.matches ? id : '';
    document.body.dataset.sheet = open;
    document.body.classList.toggle('sheet-open', !!open);
    for (const t of tabs) t.setAttribute('aria-pressed', String(t.dataset.tab === open));
    if (open && LIBRARY.has(open)) libraryTab(open);
    if (open && !LIBRARY.has(open)) { inspector.hidden = false; inspector.scrollTop = 0; }
    for (const el of [library, inspector]) el.style.transform = '';
    const sheet = open ? (LIBRARY.has(open) ? library : inspector) : null;
    document.body.style.setProperty('--open-h', sheet ? sheet.offsetHeight + 'px' : '0px');
    onLayout();
  }
  for (const t of tabs) t.addEventListener('click', () => set(open === t.dataset.tab ? '' : t.dataset.tab));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && open && !document.querySelector('dialog[open]')) set(''); });

  // Drag a sheet down from its top (or when scrolled to the top) to close it.
  for (const sheet of [library, inspector]) {
    let y0 = null, dy = 0;
    sheet.addEventListener('touchstart', e => {
      if (!open) return;
      const scroller = e.target.closest('.lib-list,.inspector');
      const top = e.touches[0].clientY - sheet.getBoundingClientRect().top;
      y0 = (top < 34 || !scroller || scroller.scrollTop <= 0) ? e.touches[0].clientY : null; dy = 0;
    }, { passive: true });
    sheet.addEventListener('touchmove', e => {
      if (y0 == null) return;
      dy = e.touches[0].clientY - y0;
      if (dy > 0) { sheet.classList.add('dragging'); sheet.style.transform = `translateY(${dy}px)`; if (e.cancelable) e.preventDefault(); }
    }, { passive: false });
    sheet.addEventListener('touchend', () => {
      if (y0 == null) return;
      sheet.classList.remove('dragging'); y0 = null;
      if (dy > 90) set(''); else sheet.style.transform = '';
    });
  }

  phone.addEventListener('change', () => {
    if (!phone.matches) { set(''); inspector.hidden = window.innerWidth < 980; }
    else inspector.hidden = false;
  });
  if (phone.matches) inspector.hidden = false;
  return { open: set, get sheet() { return open; } };
}

// Installable app: register the service worker on secure origins.
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if (location.protocol !== 'https:' && !local) return;
  if (local && !/[?&]sw=1/.test(location.search)) return; // keep local QA free of caches unless asked
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
