/* REDIA Búzios · página inicial. Endereços antigos do app (…/REDIA/#/rota) seguem para o app em /app/. */
'use strict';
const irAoApp = () => { if (/^#\//.test(location.hash)) location.replace('app/' + location.hash); };
irAoApp(); addEventListener('hashchange', irAoApp);
document.addEventListener('DOMContentLoaded', () => {
  const v = document.querySelector('.hero video');
  if (v && matchMedia('(prefers-reduced-motion: reduce)').matches) { v.removeAttribute('autoplay'); v.pause(); }
});
