/* ===================== REDIA Búzios · Studio de telas por unidade (D-73) ===================== */
'use strict';
/* Cada unidade ajusta as próprias telas da apresentação sem mudar o código: mostrar/ocultar cards, renomear títulos,
   reordenar cards dentro da mesma coluna, destacar cards com uma cor e renomear rótulos de campos. Só quem tem o perfil
   de EDITOR da unidade (atribuído pelo administrador do sistema) abre o Studio. Fluxo: rascunho → publicar (versão nova,
   com histórico e auditoria) → todos da unidade passam a ver o layout publicado na apresentação e na ata em PDF.
   O layout só muda a apresentação: dados, regras dos semáforos e permissões continuam no código e na configuração. */

const TELAS_STUDIO = [['abertura', 'Abertura · GEPLAT', 1], ['coprod', 'COPROD', 2], ['coemb', 'COEMB', 3], ['coman', 'COMAN', 4], ['fechamento', 'Fechamento', 5], ['semana', 'Visão semanal', 'semana']];
const CORES_LAYOUT = [['', 'Sem destaque'], ['verde', 'Verde'], ['amarelo', 'Amarelo'], ['laranja', 'Laranja'], ['vermelho', 'Vermelho'], ['azul', 'Azul']];
const telaIdDoBloco = b => b === 'semana' ? 'semana' : (TELAS_STUDIO.find(t => t[2] === +b) || [])[0];
let LAYOUT = { publicado: {}, versao: 0 };   // layout publicado da unidade ativa (carregado ao abrir a sessão)

const Layout = {
  chave: uep => 'layout.' + uep,
  async ler(uep) {
    if (MODO_NUVEM) return Nuvem.layoutLer(uep);
    const o = LS.get(this.chave(uep), {});
    return { publicado: o.publicado || {}, versao: o.versao || 0, publicadoEm: o.publicadoEm || null, publicadoPor: o.publicadoPor || null, editor: !!unidadeAtiva()?.editor, rascunho: o.rascunho || null, rascunhoEm: o.rascunhoEm || null, rascunhoPor: o.rascunhoPor || null, hist: (o.hist || []).map(h => ({ versao: h.versao, em: h.em, por: h.por, acao: h.acao })) };
  },
  async salvar(uep, lay, publicar) {
    if (MODO_NUVEM) return Nuvem.layoutSalvar(uep, lay, publicar);
    if (!USUARIO?.unidades?.find(u => u.uep === uep)?.editor) throw erroAdm('SEM_PERMISSAO_EDITOR');
    const o = LS.get(this.chave(uep), {}), agora = new Date().toISOString();
    if (publicar) { o.versao = (o.versao || 0) + 1; o.publicado = lay || {}; o.publicadoEm = agora; o.publicadoPor = USUARIO.chave; o.rascunho = null; o.rascunhoEm = null; o.rascunhoPor = null; o.hist = [{ versao: o.versao, em: agora, por: USUARIO.chave, acao: Object.keys(lay || {}).length ? 'publicar' : 'padrao', layout: lay || {} }, ...(o.hist || [])].slice(0, 30); DiretorioDemo.auditar('layout.publicar', uep, { versao: o.versao }); }
    else { o.rascunho = lay; o.rascunhoEm = lay ? agora : null; o.rascunhoPor = lay ? USUARIO.chave : null; }
    LS.set(this.chave(uep), o); return this.ler(uep);
  },
  async restaurar(uep, v) {
    if (MODO_NUVEM) return Nuvem.layoutRestaurar(uep, v);
    const h = (LS.get(this.chave(uep), {}).hist || []).find(x => x.versao === v); if (!h) throw new Error('Versão não encontrada.');
    await this.salvar(uep, h.layout, true); const o = LS.get(this.chave(uep), {}); o.hist[0].acao = 'restaurar v' + v; LS.set(this.chave(uep), o);
    DiretorioDemo.auditar('layout.restaurar', uep, { de: v }); return this.ler(uep);
  },
  /* carregado ao abrir a sessão da unidade; sem layout (ou sem a função na base), as telas ficam no padrão */
  async carregar(uep) { try { const r = await this.ler(uep); LAYOUT = { publicado: r.publicado || {}, versao: r.versao || 0 }; } catch { LAYOUT = { publicado: {}, versao: 0 }; } },
};

/* ---------- aplicação do layout numa tela renderizada (antes do encaixe automático) ---------- */
const slugLay = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\d+/g, '').replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '') || 'card';
const partesTitulo = t => [...t.childNodes].filter(n => !(n.classList && n.classList.contains('chev')));
const textoTitulo = t => partesTitulo(t).map(n => n.textContent).join('').trim();
const SEL_ROTULOS = '.li > span:first-child, .gh, .k2, .hig-h > span, .tile > span';
function marcarCards(raiz) {
  const vistos = {};
  return [...raiz.querySelectorAll('.card')].map(c => {
    const t = c.querySelector(':scope > .hd .t, :scope > .hd a.t');
    if (t && t.dataset.orig === undefined) t.dataset.orig = textoTitulo(t);
    // card sem título no cabeçalho (ex.: POB, offloading): usa o primeiro rótulo visível para identificá-lo
    if (!t && c.dataset.rot === undefined) { const x = c.querySelector('.hd, .gh, .eye, .k, b, span'); const y = x && x.classList.contains('hd') ? [...x.childNodes].find(n => n.textContent.trim()) : x; c.dataset.rot = y ? y.textContent.trim().replace(/\s+/g, ' ').slice(0, 40) : ''; }
    const rot = t ? t.dataset.orig : c.dataset.rot;
    const base = t ? slugLay(rot) : 'x-' + slugLay(rot); vistos[base] = (vistos[base] || 0) + 1;
    c.dataset.lay = vistos[base] > 1 ? `${base}-${vistos[base]}` : base;
    return { el: c, chave: c.dataset.lay, titulo: rot || '(card sem título)', t };
  });
}
function aplicarLayout(raiz, telaId, lay = LAYOUT.publicado) {
  if (!raiz || !telaId) return;
  const cards = marcarCards(raiz), T = lay?.telas?.[telaId];
  if (!T) return;
  for (const c of cards) {
    const o = T.cards?.[c.chave]; if (!o) continue;
    if (o.titulo && c.t) { partesTitulo(c.t).forEach(n => n.remove()); c.t.insertBefore(document.createTextNode(o.titulo), c.t.firstChild); }
    if (Number.isFinite(o.ordem)) c.el.style.order = o.ordem;
    if (o.destaque) c.el.classList.add('lay-' + o.destaque);
    if (o.oculto) { const p = c.el.parentElement && getComputedStyle(c.el.parentElement).display; if (p && p.includes('grid')) c.el.style.visibility = 'hidden'; else c.el.style.display = 'none'; }
  }
  const R = T.rotulos || {};
  if (Object.keys(R).length) raiz.querySelectorAll(SEL_ROTULOS).forEach(e => { if (e.children.length) return; const k = e.textContent.trim(); if (R[k]) e.textContent = R[k]; });
}
function rotulosDaTela(raiz) {
  const s = new Set();
  raiz.querySelectorAll(SEL_ROTULOS).forEach(e => { if (e.children.length) return; const k = e.textContent.trim(); if (k && k.length <= 60 && /[A-Za-zÀ-ú]/.test(k)) s.add(k); });
  return [...s];
}

/* ---------- tela do Studio ---------- */
const estadoStudio = () => UI.sto || (UI.sto = { tela: 'abertura', lay: null, srv: null, sujo: false });
async function telaStudio() {
  const eds = (USUARIO?.unidades || []).filter(u => u.editor);
  if (!eds.length) { render(cabecalhoApp({ id: 'studio', titulo: 'Studio' }) + '<div class="wrap"><div class="banner erro"><b>Acesso restrito.</b> O Studio é só para quem tem o perfil de editor de uma unidade. O administrador do sistema atribui esse perfil.</div></div>'); return; }
  if (!USUARIO.uep || !unidadeAtiva()?.editor) {   // abre a primeira unidade em que o usuário é editor
    aplicarUnidade(eds[0].uep);
    try { await iniciarSessao(true); } catch (e) { return aviso('Não foi possível abrir a unidade: ' + e.message, 'erro'); }
    UI.sto = null;
  }
  const S = estadoStudio(), uep = USUARIO.uep;
  if (!S.srv || S.uep !== uep) {
    try { S.srv = await Layout.ler(uep); } catch (e) { S.srv = { publicado: {}, versao: 0, hist: [], erro: e.message }; }
    S.uep = uep; S.lay = JSON.parse(JSON.stringify(S.srv.rascunho || S.srv.publicado || {})); S.sujo = false;
  }
  const srv = S.srv, temRasc = !!srv.rascunho;
  render(cabecalhoApp({ id: 'studio', titulo: 'Studio' }) + `<div class="sto">
    <aside class="sto-l">
      <div class="sto-h"><span class="kick">Studio de telas · editor</span><h2>REDIA ${esc(uep)}</h2>
        ${eds.length > 1 ? `<label class="lbl" for="sto-un">Unidade</label><select id="sto-un" class="in">${eds.map(u => `<option value="${esc(u.uep)}"${u.uep === uep ? ' selected' : ''}>${esc(u.uep)} · ${esc(u.nome || nomeUnidade(u.uep))}</option>`).join('')}</select>` : ''}
        <p class="note sto-st">${srv.erro ? `<b>Sem acesso ao layout na base:</b> ${esc(srv.erro)}` : srv.versao ? `Publicado: <b>versão ${srv.versao}</b> em ${dataCurta(srv.publicadoEm)} por ${esc(srv.publicadoPor || '—')}` : 'Telas no padrão do sistema (nada publicado).'}${temRasc ? `<br>Rascunho salvo em ${dataCurta(srv.rascunhoEm)} por ${esc(srv.rascunhoPor || '—')}` : ''}<span data-sujo>${S.sujo ? '<br><b>Alterações não salvas</b>' : ''}</span></p></div>
      <label class="lbl" for="sto-tl">Tela</label><select id="sto-tl" class="in">${TELAS_STUDIO.map(([id, rot]) => `<option value="${id}"${id === S.tela ? ' selected' : ''}>${esc(rot)}</option>`).join('')}</select>
      <h3 class="sto-s">Cards</h3><p class="note">Mostrar ou ocultar, renomear o título, mudar a posição na mesma coluna e destacar com uma cor.</p><div id="sto-cards" class="sto-cards"></div>
      <h3 class="sto-s">Rótulos dos campos</h3><p class="note">Troque o nome exibido de um campo (o dado e a regra não mudam).</p><div id="sto-rot" class="sto-rot"></div>
      <div class="sto-acts">
        <button class="btn sm" data-s="rascunho">Salvar rascunho</button>
        <button class="btn sm pri" data-s="publicar">Publicar para a ${esc(uep)}</button>
        <button class="btn sm" data-s="descartar"${temRasc || S.sujo ? '' : ' disabled'}>Descartar alterações</button>
        <button class="btn sm" data-s="padraoTela">Tela no padrão</button>
        <button class="btn sm" data-s="padrao">Tudo no padrão</button></div>
      <h3 class="sto-s">Versões publicadas</h3><div class="sto-hist">${(srv.hist || []).length ? `<table class="tb"><tbody>${srv.hist.slice(0, 12).map(h => `<tr><td><b>v${h.versao}</b></td><td>${dataCurta(h.em)}</td><td class="mono">${esc(h.por || '')}</td><td class="note">${esc(h.acao === 'padrao' ? 'padrão' : h.acao)}</td><td>${h.versao !== srv.versao ? `<button class="btn sm lnk" data-rv="${h.versao}">Restaurar</button>` : '<span class="chip ok">atual</span>'}</td></tr>`).join('')}</tbody></table>` : '<p class="note">Nenhuma versão publicada.</p>'}</div>
    </aside>
    <section class="sto-r"><div class="sto-pvh"><b>Prévia</b><span class="note">Dados da REDIA de ${ddmmaaaa(DIA)} · como ficará na apresentação e na ata da ${esc(uep)}</span></div>
      <div class="sto-pv" id="sto-pv"><div class="sto-sc"><div class="stage" id="sto-stage"></div></div></div></section></div>`);
  $('#sto-un') && ($('#sto-un').onchange = async e => { if (S.sujo && (await modal({ titulo: 'Trocar de unidade?', html: '<p>As alterações não salvas desta unidade serão perdidas.</p>', botoes: [{ id: 'cancelar', txt: 'Cancelar' }, { id: 'ok', txt: 'Trocar', cls: 'pri' }] })).id !== 'ok') { e.target.value = uep; return; } aplicarUnidade(e.target.value); try { await iniciarSessao(true); } catch (x) { aviso(x.message, 'erro'); } UI.sto = null; telaStudio(); });
  $('#sto-tl').onchange = e => { S.tela = e.target.value; desenharStudio(); };
  $$('[data-s]').forEach(b => b.onclick = () => acaoStudio(b.dataset.s));
  $$('[data-rv]').forEach(b => b.onclick = async () => { if ((await modal({ titulo: `Restaurar a versão ${b.dataset.rv}?`, html: '<p>Ela é publicada de novo como uma versão nova, para todos da unidade.</p>', botoes: [{ id: 'cancelar', txt: 'Cancelar' }, { id: 'ok', txt: 'Restaurar e publicar', cls: 'pri' }] })).id !== 'ok') return; try { S.srv = await Layout.restaurar(uep, +b.dataset.rv); S.lay = JSON.parse(JSON.stringify(S.srv.publicado || {})); S.sujo = false; LAYOUT = { publicado: S.srv.publicado || {}, versao: S.srv.versao }; aviso(`Versão ${b.dataset.rv} restaurada e publicada.`, 'ok'); telaStudio(); } catch (e) { aviso(e.message, 'erro'); } });
  if (!UI.stoRz) { UI.stoRz = true; addEventListener('resize', escalarPrevia); }
  desenharStudio();
}
function escalarPrevia() { const pv = $('#sto-pv'), sc = $('.sto-sc'); if (!pv || !sc) return; const s = pv.clientWidth / 1920; sc.style.transform = `scale(${s})`; pv.style.height = (1080 * s) + 'px'; }
function telaPrevia(id) {
  const P = UI.pres, ctx = { dia: DIA, congelada: congelada(), timer: fmtTimer(timeboxSeg(TELAS_STUDIO.find(x => x[0] === id)?.[2] === 'semana' ? P.bloco || 1 : TELAS_STUDIO.find(x => x[0] === id)?.[2])), extra: 0 }, t = TELAS_STUDIO.find(x => x[0] === id);
  return t[2] === 'semana' ? telaSemana(E, ctx) : TELAS[t[2] - 1](estadoApresentacao(t[2]), ctx);
}
function marcarSujo(S) { S.sujo = true; const x = $('[data-sujo]'); if (x) x.innerHTML = '<br><b>Alterações não salvas</b>'; const d = $('[data-s="descartar"]'); if (d) d.disabled = false; }
function desenharStudio() {
  const S = estadoStudio(), st = $('#sto-stage'); if (!st) return;
  let html; try { html = telaPrevia(S.tela); } catch (e) { html = `<div class="sto-erro">Não foi possível montar a prévia: ${esc(e.message)}</div>`; }
  st.innerHTML = html; escalarPrevia();
  const T = ((S.lay.telas ||= {})[S.tela] ||= { cards: {}, rotulos: {} }); T.cards ||= {}; T.rotulos ||= {};
  aplicarLayout(st, S.tela, S.lay); encaixar(st);
  // lista de cards agrupada pela coluna (os cards só trocam de posição dentro da mesma coluna)
  const cards = marcarCards(st), grupos = new Map();
  cards.forEach((c, i) => { const p = c.el.parentElement; if (!grupos.has(p)) grupos.set(p, []); grupos.get(p).push({ ...c, i }); });
  let gi = 0;
  $('#sto-cards').innerHTML = [...grupos.values()].map(g => {
    gi++; g.sort((a, b) => (T.cards[a.chave]?.ordem ?? a.i) - (T.cards[b.chave]?.ordem ?? b.i));
    return `<div class="sto-g"><span class="sto-gt">${grupos.size > 1 ? `Região ${gi}` : 'Cards'}</span>${g.map((c, k) => { const o = T.cards[c.chave] || {}; return `<div class="sto-c${o.oculto ? ' off' : ''}" data-ck="${esc(c.chave)}" data-g="${gi}">
      <label class="sto-v" title="Mostrar na tela"><input type="checkbox" data-f="vis" ${o.oculto ? '' : 'checked'} aria-label="Mostrar ${esc(c.titulo)}"></label>
      <input class="in" data-f="tit" value="${esc(o.titulo || '')}" placeholder="${esc(c.titulo)}" aria-label="Título do card ${esc(c.titulo)}" maxlength="60">
      <select class="in sto-cor" data-f="cor" aria-label="Destaque">${CORES_LAYOUT.map(([v, t]) => `<option value="${v}"${(o.destaque || '') === v ? ' selected' : ''}>${t}</option>`).join('')}</select>
      <span class="sto-mv"><button class="btn sm" data-f="sobe" ${k === 0 ? 'disabled' : ''} aria-label="Subir">↑</button><button class="btn sm" data-f="desce" ${k === g.length - 1 ? 'disabled' : ''} aria-label="Descer">↓</button></span></div>`; }).join('')}</div>`;
  }).join('') || '<p class="note">Esta tela não tem cards configuráveis.</p>';
  const grupoDe = ck => [...$$(`#sto-cards [data-g="${$(`#sto-cards [data-ck="${CSS.escape(ck)}"]`).dataset.g}"]`)].map(x => x.dataset.ck);
  const reaplicar = () => { marcarSujo(S); desenharStudio(); };
  $$('#sto-cards .sto-c').forEach(row => {
    const ck = row.dataset.ck, o = () => (T.cards[ck] ||= {});
    $('[data-f="vis"]', row).onchange = e => { o().oculto = !e.target.checked || undefined; limparCard(T, ck); reaplicar(); };
    $('[data-f="tit"]', row).onchange = e => { o().titulo = e.target.value.trim() || undefined; limparCard(T, ck); reaplicar(); };
    $('[data-f="cor"]', row).onchange = e => { o().destaque = e.target.value || undefined; limparCard(T, ck); reaplicar(); };
    const mover = d => { const g = grupoDe(ck), i = g.indexOf(ck), j = i + d; if (j < 0 || j >= g.length) return; [g[i], g[j]] = [g[j], g[i]]; g.forEach((k, n) => { (T.cards[k] ||= {}).ordem = n; }); reaplicar(); };
    $('[data-f="sobe"]', row).onclick = () => mover(-1); $('[data-f="desce"]', row).onclick = () => mover(1);
  });
  // rótulos: os detectados na tela (com o nome original) + os já renomeados
  const orig = new Set(rotulosDaTela(st)); Object.keys(T.rotulos).forEach(k => orig.add(k));
  Object.values(T.rotulos).forEach(v => orig.delete(v));
  const lista = [...orig].sort((a, b) => (T.rotulos[b] ? 1 : 0) - (T.rotulos[a] ? 1 : 0) || a.localeCompare(b, 'pt-BR'));
  $('#sto-rot').innerHTML = lista.length ? `<input class="in" id="sto-rq" type="search" placeholder="Filtrar rótulos (${lista.length})" aria-label="Filtrar rótulos"><div class="sto-rl">${lista.map(k => `<label class="sto-r1${T.rotulos[k] ? ' on' : ''}" data-rk="${esc(k)}"><span title="${esc(k)}">${esc(k)}</span><input class="in" value="${esc(T.rotulos[k] || '')}" placeholder="manter" maxlength="60" aria-label="Novo nome para ${esc(k)}"></label>`).join('')}</div>` : '<p class="note">Nenhum rótulo de campo nesta tela.</p>';
  $$('#sto-rot [data-rk] input').forEach(i => i.onchange = () => { const k = i.closest('[data-rk]').dataset.rk, v = i.value.trim(); if (v && v !== k) T.rotulos[k] = v; else delete T.rotulos[k]; reaplicar(); });
  const rq = $('#sto-rq'); if (rq) { rq.value = S.rq || ''; const f = () => { S.rq = rq.value; const q = rq.value.trim().toLowerCase(); $$('#sto-rot [data-rk]').forEach(l => { l.style.display = !q || l.dataset.rk.toLowerCase().includes(q) ? '' : 'none'; }); }; rq.oninput = f; f(); }
}
function limparCard(T, ck) { const o = T.cards[ck]; if (o && !Object.values(o).some(v => v !== undefined)) delete T.cards[ck]; }
/* remove telas e cards vazios antes de gravar */
function compactarLayout(lay) {
  const out = { v: 1, telas: {} };
  for (const [id, T] of Object.entries(lay.telas || {})) {
    const cards = Object.fromEntries(Object.entries(T.cards || {}).map(([k, o]) => [k, Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''))]).filter(([, o]) => Object.keys(o).length));
    const rot = Object.fromEntries(Object.entries(T.rotulos || {}).filter(([k, v]) => v && v !== k));
    if (Object.keys(cards).length || Object.keys(rot).length) out.telas[id] = { ...(Object.keys(cards).length ? { cards } : {}), ...(Object.keys(rot).length ? { rotulos: rot } : {}) };
  }
  return Object.keys(out.telas).length ? out : {};
}
async function acaoStudio(a) {
  const S = estadoStudio(), uep = USUARIO.uep;
  try {
    if (a === 'rascunho') { S.srv = await Layout.salvar(uep, compactarLayout(S.lay), false); S.sujo = false; aviso('Rascunho salvo. Ele só aparece no Studio até ser publicado.', 'ok'); return telaStudio(); }
    if (a === 'publicar') {
      const n = Object.keys(compactarLayout(S.lay).telas || {}).length;
      if ((await modal({ titulo: `Publicar o layout da ${esc(uep)}?`, html: `<p>${n ? `Ajustes em ${n} tela${n === 1 ? '' : 's'}.` : 'Sem ajustes: as telas voltam ao padrão do sistema.'} Depois de publicado, todos da ${esc(uep)} passam a ver este layout na apresentação e na ata em PDF.</p><p class="note">Cada publicação vira uma versão no histórico e pode ser restaurada.</p>`, botoes: [{ id: 'cancelar', txt: 'Cancelar' }, { id: 'ok', txt: 'Publicar', cls: 'pri' }] })).id !== 'ok') return;
      S.srv = await Layout.salvar(uep, compactarLayout(S.lay), true); S.sujo = false; LAYOUT = { publicado: S.srv.publicado || {}, versao: S.srv.versao };
      aviso(`Layout publicado (versão ${S.srv.versao}).`, 'ok'); return telaStudio();
    }
    if (a === 'descartar') { if (S.srv.rascunho) S.srv = await Layout.salvar(uep, null, false); S.lay = JSON.parse(JSON.stringify(S.srv.publicado || {})); S.sujo = false; aviso('Alterações descartadas: voltou ao layout publicado.', 'ok'); return telaStudio(); }
    if (a === 'padraoTela') { if (S.lay.telas) delete S.lay.telas[S.tela]; marcarSujo(S); desenharStudio(); return aviso('Esta tela voltou ao padrão no rascunho. Salve ou publique para valer.', 'ok'); }
    if (a === 'padrao') { S.lay = {}; marcarSujo(S); desenharStudio(); return aviso('Todas as telas voltaram ao padrão no rascunho. Publique para valer para a unidade.', 'ok'); }
  } catch (e) { aviso(e.message, 'erro'); }
}
