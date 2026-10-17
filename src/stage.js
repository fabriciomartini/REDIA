/* ===================== REDIA P-83 · telas da apresentação (1920×1080) ===================== */
'use strict';
/* Vocabulário de status (D-45, HIG Apple atual): símbolos no estilo SF Symbols, sempre forma + cor + texto.
   OK = checkmark.circle.fill · Atenção = exclamationmark.triangle.fill · Não OK = xmark.octagon.fill · Sem dado = minus.circle.fill */
const SVG = (s, corpo) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 20 20" aria-hidden="true">${corpo}</svg>`;
const TRI = 'M10 1.6c.62 0 1.18.33 1.48.86l7.36 12.9c.62 1.1-.17 2.44-1.44 2.44H2.6c-1.27 0-2.06-1.34-1.44-2.44l7.36-12.9c.3-.53.86-.86 1.48-.86z';
const OCT = 'M6.6 1.2h6.8a1.6 1.6 0 0 1 1.13.47l4.8 4.8a1.6 1.6 0 0 1 .47 1.13v6.8a1.6 1.6 0 0 1-.47 1.13l-4.8 4.8a1.6 1.6 0 0 1-1.13.47H6.6a1.6 1.6 0 0 1-1.13-.47l-4.8-4.8a1.6 1.6 0 0 1-.47-1.13V7.6a1.6 1.6 0 0 1 .47-1.13l4.8-4.8A1.6 1.6 0 0 1 6.6 1.2z';
const SH = {
  ok: s => SVG(s, '<circle cx="10" cy="10" r="9" fill="#008542"/><path d="M5.7 10.4l2.9 2.9 5.7-6.2" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  at: s => SVG(s, `<path d="${TRI}" fill="#FDC82F" stroke="rgba(0,0,0,.45)" stroke-width=".9"/><rect x="9" y="6.3" width="2" height="6.2" rx="1" fill="#000"/><circle cx="10" cy="14.8" r="1.2" fill="#000"/>`),
  nok: s => SVG(s, `<path d="${OCT}" fill="#DA291C"/><path d="M7.1 7.1l5.8 5.8M12.9 7.1l-5.8 5.8" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`),
  nokW: s => SVG(s, `<path d="${OCT}" fill="#fff"/><path d="M7.1 7.1l5.8 5.8M12.9 7.1l-5.8 5.8" stroke="#DA291C" stroke-width="2.2" stroke-linecap="round"/>`),
  sd: s => SVG(s, '<circle cx="10" cy="10" r="9" fill="#75787B"/><path d="M6 10h8" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>'),
};
SH.atF = SH.at;
const COR = { ok: '#008542', at: '#FDC82F', nok: '#DA291C', sd: '#75787B' };
const pill = (sem, txt, sm = true) => `<span class="b ${SH[sem] ? sem : 'sd'}${sm ? ' sm' : ''}">${(sem === 'nok' ? SH.nokW : SH[sem] || SH.sd)(sm ? 17 : 19)}${esc(txt)}</span>`;
const glyph = (sem, s = 16) => `<span class="gl">${(SH[sem] || SH.sd)(s + 2)}</span>`;
/* poços (D-30): forma + cor mantidas, agora como marcador de cápsula */
const DOTS = {
  aberto: '<svg class="ic" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5.2" fill="#008542"/></svg>',
  reaberto: '<svg class="ic" width="13" height="12" viewBox="0 0 13 12" aria-hidden="true"><path d="M6.5.8c.4 0 .75.2.95.55l4.9 8.6c.4.7-.1 1.55-.9 1.55H1.55c-.8 0-1.3-.85-.9-1.55l4.9-8.6c.2-.35.55-.55.95-.55z" fill="#000"/></svg>',
  fechado: '<svg class="ic" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><rect x="1" y="1" width="10" height="10" rx="2.4" fill="#75787B"/></svg>',
};
DOTS.legRe = DOTS.reaberto;
const chip = (txt, st = 'aberto', q = '') => `<span class="w${st === 'reaberto' ? ' ra' : st === 'fechado' ? ' fe' : st ? '' : ' nt'}">${st ? DOTS[st] : ''}${q ? `<span class="q">${esc(q)}</span>` : ''}${esc(txt)}</span>`;
/* status dos equipamentos (D-53): forma + cor + letra da unidade; o nome do status fica na legenda e no texto acessível */
const DOT_EQ = {
  'eq-op': '<svg class="ic" width="13" height="13" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5.2" fill="#008542"/></svg>',
  'eq-sb': '<svg class="ic" width="13" height="13" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.4" fill="none" stroke="#008542" stroke-width="2"/></svg>',
  'eq-lm': '<svg class="ic" width="14" height="13" viewBox="0 0 13 12" aria-hidden="true"><path d="M6.5.8c.4 0 .75.2.95.55l4.9 8.6c.4.7-.1 1.55-.9 1.55H1.55c-.8 0-1.3-.85-.9-1.55l4.9-8.6c.2-.35.55-.55.95-.55z" fill="#FDC82F" stroke="rgba(0,0,0,.55)" stroke-width=".9"/></svg>',
  'eq-mn': '<svg class="ic" width="13" height="13" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 .6l5.4 5.4L6 11.4.6 6z" fill="#75787B"/></svg>',
  'eq-in': '<svg class="ic" width="13" height="13" viewBox="0 0 12 12" aria-hidden="true"><rect x=".8" y=".8" width="10.4" height="10.4" rx="2.4" fill="#DA291C"/><path d="M3.9 3.9l4.2 4.2M8.1 3.9L3.9 8.1" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>',
  'eq-sd': '<svg class="ic" width="13" height="13" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5.2" fill="none" stroke="#75787B" stroke-width="1.4" stroke-dasharray="2 1.6"/></svg>',
};
const eqBullet = (i) => { const k = ST_EQ_CLS[i.status] || 'eq-sd'; return `<span class="eb ${k}" role="img" aria-label="${esc(i.nome)}: ${esc(i.status || 'sem dado')}" title="${esc(i.nome)}: ${esc(i.status || 'sem dado')}">${DOT_EQ[k]}${esc(i.un)}</span>`; };
const chipsEq = (E, conj) => equipDe(E, conj).map(g => `<span class="w eqg"><span class="q">${esc(g.grupo)}</span>${g.itens.map(eqBullet).join('')}</span>`).join('');
const legendaEq = () => `<span class="lge">${ST_EQ.map(s => `<span class="eb ${ST_EQ_CLS[s]}">${DOT_EQ[ST_EQ_CLS[s]]}${esc(s)}</span>`).join('')}</span>`;
const legendaPocos = (aberto = 'aberto 24 h') => `<span class="lgp">${chip(aberto, 'aberto')}${chip('reaberto', 'reaberto')}${chip('fechado agora', 'fechado')}</span>`;
const tag = t => `<span class="o">${esc(t)}</span>`;
const tagAb = '<span class="o ab">Abertura</span>';
/* situação das operações em poços: play.circle.fill / calendar / checkmark */
const OP_SIM = {
  'Em curso': '<svg class="ic" width="15" height="15" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="#008542"/><path d="M8 6.2v7.6l6-3.8z" fill="#fff"/></svg>',
  'Prevista': '<svg class="ic" width="15" height="15" viewBox="0 0 20 20" aria-hidden="true"><rect x="2" y="3.5" width="16" height="14.5" rx="3" fill="none" stroke="#000" stroke-width="1.8"/><path d="M2 8h16M6.5 1.8v3.4M13.5 1.8v3.4" stroke="#000" stroke-width="1.8" stroke-linecap="round"/></svg>',
  'Realizada': '<svg class="ic" width="15" height="15" viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 10.5l3.6 3.6 7.4-8" fill="none" stroke="#75787B" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
const opTag = s => `<span class="o op ${{ 'Em curso': 'op-cur', 'Prevista': 'op-prv', 'Realizada': 'op-rlz' }[s] || ''}">${OP_SIM[s] || ''}${esc(s || '—')}</span>`;
const li = (l, v, sec) => `<div class="li"><span>${l}</span><span class="${sec ? 's' : 'v'}">${v}</span></div>`;
const semNome = s => SEM_NOME[s] || 'Sem dado';
const ICON = {
  oleo: '<path d="M12 2.5C12 2.5 5 10.6 5 15.2a7 7 0 0 0 14 0C19 10.6 12 2.5 12 2.5z" fill="currentColor"/>',
  iuga: '<path d="M12.6 2c.6 3.6 5.9 6.2 5.9 12a6.5 6.5 0 0 1-13 0c0-3 1.6-5 3-6.3.1 2 1 3.3 2.3 3.6-.5-3.6.3-6.8 1.8-9.3z" fill="currentColor"/>',
  gas: '<path d="M12 3v13M7 11.5l5 5 5-5M4 21h16" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  agua: '<path d="M3 9c3-3 6-3 9 0s6 3 9 0M3 15.5c3-3 6-3 9 0s6 3 9 0" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  navio: '<path d="M3 14h18l-3 6H6z" fill="currentColor"/><path d="M7 14V8h10v6M12 8V4" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  raio: '<path d="M13.5 2L5 13.5h6L9.5 22 19 9.5h-6.2z" fill="currentColor"/>',
};
const ic = k => `<svg class="ic" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
const hd = (titulo, dir = '', icone = '', href = '') => `<div class="hd">${icone ? ic(icone) : ''}${href ? `<a class="t lk" href="${href}">${titulo}<span class="chev" aria-hidden="true">›</span></a>` : `<span class="t">${titulo}</span>`}${dir}</div>`;
const nwTags = s => String(s).replace(/(^|[^\w-])([A-Z][A-Z0-9]{0,6}-[A-Z0-9][A-Z0-9/-]*[A-Z0-9])/g, '$1<span class="nw">$2</span>');
const T = s => nwTags(esc(s));   // texto do usuário: escapa e mantém TAGs inteiras

let MARCA_SRC = null;
function marcaImg() {
  if (MARCA_SRC === null) MARCA_SRC = midiaUrl('marca', 'petrobras.png', 'image/png');   // embutida (arquivo único) ou assets/ (web)
  return `<img class="marca-img" src="${MARCA_SRC}" alt="Petrobras">`;
}
function cabecalho(ctx, bloco, titulo, subtitulo) {
  const dots = [1, 2, 3, 4, 5].map(i => `<span class="pd${i === bloco ? ' on' : ''}"></span>`).join('');
  const marca = ctx.congelada ? '' : `<span class="o prev">${SH.at(18)}Prévia · pauta não congelada</span>`;
  return `<header class="sh">
    <div class="sh-tit"><span class="eye">REDIA ${esc(CFG.uep)} · ${titulo.eye} · Bloco ${bloco} de 5</span>
      <div class="ttl"><span class="h1">${titulo.t}</span><span class="sub">${subtitulo}</span></div><span class="dash" aria-hidden="true"></span></div>
    <div class="sp"></div>${marca}
    ${marcaImg()}
    <div style="width:540px;flex:none"></div>
    <svg class="egp" width="630" height="104" viewBox="0 0 630 104" aria-hidden="true"><path d="M118 -20 L670 -20 L670 130 L96 130 L74 96 Q66 84 70 70 Z" fill="#008542"/><path d="M62 -20 L40 62 Q36 76 44 88 L72 130" fill="none" stroke="#FDC82F" stroke-width="4"/></svg>
    <div class="sh-dir"><div class="dt"><b>${diaSemana(ctx.dia)}, ${ddmmaaaa(ctx.dia)}</b><span>${esc(ctx.subData || '')}</span></div>
      <div class="tm"><span class="tmr" data-tmr>${ctx.timer || '05:00'}</span><span class="pds" aria-label="Bloco ${bloco} de 5">${dots}</span></div></div>
  </header>`;
}
function faixa(E) {
  const ef = Regras.efop(VN(E, 'oleo.real'), VN(E, 'oleo.potencial'));
  const iu = Regras.iuga(VN(E, 'iuga.real'), VN(E, 'iuga.meta'));
  const ga = Regras.injecao(VN(E, 'gas.real'), VN(E, 'gas.meta'));
  const ag = Regras.injecao(VN(E, 'agua.real'), VN(E, 'agua.meta'));
  return `<div class="sb">
    <span>Óleo <b>${fmtU(VN(E, 'oleo.real'), 0, 'm³/d')}</b> <span class="sec">${ef.pct != null ? fmtN(ef.pct, 1) + '%' : ''}</span></span>
    <span>IUGA <b>${VN(E, 'iuga.real') != null ? fmtN(VN(E, 'iuga.real'), 2) + '%' : 'Sem dado'}</b> ${pill(iu.sem, semNome(iu.sem))}</span>
    <span>Injeção de gás <b>${fmtU(VN(E, 'gas.real'), 0, 'Mm³/d')}</b> ${pill(ga.sem, semNome(ga.sem))}</span>
    <span>Injeção de água <b>${fmtU(VN(E, 'agua.real'), 0, 'm³/d')}</b> ${pill(ag.sem, semNome(ag.sem))}</span>
    <span>TOP <b>${esc(V(E, 'off.top') || 'Sem dado')}</b></span>
    <span>POB <b>${VN(E, 'pob.atual') ?? '—'}/${VN(E, 'pob.max') ?? '—'}</b></span>
  </div>`;
}
const SELO = '<span class="selo"><span class="seal" aria-hidden="true">I</span>Interna</span>';
const rodapeSelo = () => `<div class="rod">${SELO}</div>`;
const ordemPoco = { reaberto: 0, fechado: 1, aberto: 2 };
const pocos = (E, tipo) => L(E, 'pocos').filter(p => p.tipo === tipo).sort((a, b) => ordemPoco[a.status] - ordemPoco[b.status]);
const chipsPoco = (E, tipo) => pocos(E, tipo).map(p => chip(p.poco, p.status)).join('');
function piorSem(...s) { return ['nok', 'at', 'ok'].find(x => s.includes(x)) || 'sd'; }

/* D-57 · reserva tática (IUGA do mês na meta) ou recuperação (abaixo da meta), em duas linhas */
function linhasTaticas(E, iso) {
  const t = iugaTatico(E, iso);
  if (!t.modo) return li('Reserva tática', 'Sem dado', 1);
  const mil = (v, u = 'mil m³') => fmtN(v / 1000, Math.abs(v) < 100000 ? 1 : 0) + NBSP + u;   // leitura à distância na TV
  if (t.modo === 'reserva') return `<div class="li tat"><span>Reserva tática</span><span class="v">${t.tatica > 0 ? mil(t.tatica) : 'Esgotada'}</span></div>${li('Por dia', t.taticaDia > 0 ? mil(t.taticaDia, 'mil m³/d') : '—', 1).replace('class="li"', 'class="li tat2"')}`;
  return `<div class="li tat rec"><span>Máx./dia</span><span class="v">${t.alcancavel ? mil(t.maxDia, 'mil m³/d') : 'Meta perdida'}</span></div>${li('IUGA diário mín.', t.alcancavel ? fmtN(t.iugaDiaNec, 2) + '%' : `até ${fmtN(t.iugaMaxPossivel, 2)}%`, 1).replace('class="li"', 'class="li tat2"')}`;
}
/* Offloading na abertura (D-47): previsão de TOP, navio designado para o próximo offloading e tancagem ocupada × livre */
function cardOffloadingAbertura(E, top, navioOk) {
  const est = VN(E, 'off.estoque'), cap = VN(E, 'off.capacidade'), livre = est != null && cap ? Math.max(0, cap - est) : null, p = est != null && cap ? Math.min(100, est / cap * 100) : null;
  const nome = String(V(E, 'off.navio') || '').split(' · ')[0].trim();
  return `<div class="card col4 offa"><span class="gh">Offloading · Previsão de TOP</span>
    <div class="row-sb"><span class="nw"><span class="big b44">${esc(top[0] || '—')}</span><span class="unit">${esc(top[1] || '')}</span></span>${nome ? pill(navioOk ? 'ok' : 'at', nome) : pill('at', 'Sem navio')}</div>
    <div class="tq2" role="img" aria-label="Tancagem: ${p != null ? fmtN(p, 0) + '% ocupada' : 'sem dado'}"><div style="width:${p ?? 0}%"></div></div>
    <span class="cap nw">Ocupado <b class="k">${fmtN(est)}</b> · livre <b class="k">${fmtU(livre, 0, 'm³')}</b>${p != null ? ` · ${fmtN(p, 0)}%` : ''}</span></div>`;
}
/* ---------------- Bloco 1 · Abertura (GEPLAT) ---------------- */
function telaAbertura(E, ctx) {
  const real = VN(E, 'oleo.real'), pot = VN(E, 'oleo.potencial'), ef = Regras.efop(real, pot);
  const iuR = VN(E, 'iuga.real'), iuM = VN(E, 'iuga.meta'), iu = Regras.iuga(iuR, iuM);
  const gR = VN(E, 'gas.real'), gM = VN(E, 'gas.meta'), ga = Regras.injecao(gR, gM);
  const aR = VN(E, 'agua.real'), aM = VN(E, 'agua.meta'), ag = Regras.injecao(aR, aM);
  const sit = V(E, 'geplat.situacao_sem') || piorSem(ef.sem, iu.sem, ga.sem, ag.sem);
  const top = String(V(E, 'off.top') || '').split(' ');
  const navioOk = V(E, 'off.navio_ok') === 'Sim';
  const urs = VN(E, 'agua.urs') || 0, pr = VN(E, 'agua.prod_reinj') || 0, tot = urs + pr;
  const pct = x => tot ? fmtN(x / tot * 100, 1) + '%' : '—';
  const ev = L(E, 'queima.eventos').slice(0, 2);
  const flare = (n, v) => v === 'Aberto' ? chip('Aberto', 'reaberto', n) : chip(v || 'Sem dado', null, n);
  const ameacas = ['GEPLAT', 'COPROD', 'COEMB', 'COMAN'].map(c => {
    const ds = destaquesAbertura(E, c).slice(0, CFG.destaquesAberturaMax || 2), a = c === 'GEPLAT' ? null : principalAmeaca(E, c);
    if (c === 'GEPLAT' && !ds.length) return '';
    const linhas = ds.map(d => `<span class="dl">${glyph(d.semaforo, 18)}<span>${T(d.titulo)}</span></span>`);
    if (c !== 'GEPLAT') for (const i of pfceoSelecao(E, c).abertura) linhas.push(`<span class="dl pfa">${glyph(PF.semDisp(i.disponibilidade), 18)}<span><span class="k2">PFCEO</span> ${T(i.funcao)} · ${esc(PF.curto(i.disponibilidade))}${i.nota ? ` <span class="sec">· ${T(i.nota)}</span>` : ''}</span></span>`);   // D-54: até 2 por coordenação
    if (c !== 'GEPLAT') linhas.push(a ? `<span class="dl am">${glyph(a.payload.semaforo, 18)}<span><span class="k2">Ameaça</span> ${T(a.payload.texto)}</span></span>` : `<span class="dl am">${glyph('sd', 18)}<span class="sec">Sem ameaça registrada</span></span>`);
    return `<div class="li thr2"><b>${c}</b><div class="dls">${linhas.join('')}</div></div>`;
  }).join('');
  const atividades = ['COPROD', 'COEMB', 'COMAN'].map(c => {
    const at = atividadesAbertura(E, c);
    const rows = at.length ? at.map(s => `<span class="ar">${tag(s.payload.origem)}<span>${T(s.payload.titulo)}</span></span>`).join('') : '<span class="ar sec">Nenhuma indicada</span>';
    return `<div class="li act"><b>${c}</b><div class="acts">${rows}</div></div>`;
  }).join('');
  const pe = itensDe(E, 'GEPLAT', 'pauta_extra');
  const semReg = CFG.temasPlataforma.filter(t => !pe.some(i => i.payload.texto.toLowerCase() === t.toLowerCase()));
  const tema = CFG.pautaExtra[parseData(ctx.dia).getDay()] || '[tema do dia]';
  const counter = (rot, n, cap, pad) => `<div class="ctr" style="${pad}"><span class="gh">${rot}</span><span><span class="big b52">${n ?? '—'}</span><span class="unit">dias</span></span><span class="cap">${cap}</span></div>`;
  return `<div class="scr">${cabecalho({ ...ctx, subData: ctx.subData || 'Realizado D-1 · SITOP' }, 1, { eye: 'GEPLAT', t: 'Abertura' }, 'Destaques das últimas 24 h')}
  <main class="m1">
    <section class="g r1">
      <div class="card col">${hd('Situação da unidade', pill(sit, semNome(sit)))}<p class="sit">${T(V(E, 'geplat.situacao') || 'Frase-resumo ainda não preenchida pelo GEPLAT.')}</p></div>
      <div class="card g3">
        ${counter('Sem parada não programada', VN(E, 'sms.dias_parada'), `Recorde ${VN(E, 'sms.recorde_parada') ?? '—'}`, 'padding-right:18px')}
        ${counter('Sem ocorrência registrável', VN(E, 'sms.dias_ocorrencia'), `Desde ${esc(V(E, 'sms.desde_ocorrencia') || '—')}`, 'padding:0 18px;border-left:1px solid #E8E8E8')}
        ${counter('Sem princípio de incêndio', VN(E, 'sms.dias_incendio'), `Recorde ${VN(E, 'sms.recorde_incendio') ?? '—'}`, 'padding-left:18px;border-left:1px solid #E8E8E8')}
      </div>
      <div class="card col4"><span class="gh">POB</span><span><span class="big b52">${VN(E, 'pob.atual') ?? '—'}</span><span class="unit">/${VN(E, 'pob.max') ?? '—'}</span></span><span class="cap">${VN(E, 'pob.max') != null && VN(E, 'pob.atual') != null ? (VN(E, 'pob.max') - VN(E, 'pob.atual')) + ' vagas' : ''}</span></div>
      ${cardOffloadingAbertura(E, top, navioOk)}
    </section>
    <section class="g r2">
      <div class="card col6">${hd('Produção', pill(ef.sem, semNome(ef.sem)), 'oleo')}
        <div><span class="big">${fmtN(real)}</span><span class="unit">m³/d</span></div><span class="cap">${real != null ? fmtN(real * 6.2898) + NBSP + 'bbl/d' : 'Sem dado'}</span>
        <div>${li('Potencial', fmtN(pot))}${li('Eficiência (EFOP)', ef.pct != null ? fmtN(ef.pct, 1) + '%' : '—')}${li('Projetado D', fmtN(VN(E, 'oleo.proj')), 1)}</div>
        <span class="gh">Produtores · ${pocos(E, 'produtor').length}</span><div class="cps">${chipsPoco(E, 'produtor') || '<span class="cap">Sem dado</span>'}</div></div>
      <div class="card iuga">
        <div class="col6">${hd('IUGA', pill(iu.sem, semNome(iu.sem)), 'iuga')}
          <div><span class="big">${iuR != null ? fmtN(iuR, 2) : '—'}</span><span class="unit">%</span></div><span class="cap">Meta ${iuM != null ? fmtN(iuM, 0) + '%' : '—'} · ${iu.desvio != null ? (iu.desvio >= 0 ? '+' : '−') + fmtN(Math.abs(iu.desvio), 2) + NBSP + 'p.p.' : ''}</span>
          <div>${li(esc(CFG.ativo), VN(E, 'iuga.atp') != null ? fmtN(VN(E, 'iuga.atp'), 2) + '%' : 'Sem dado', 1)}${li(esc(CFG.campo), VN(E, 'iuga.buzios') != null ? fmtN(VN(E, 'iuga.buzios'), 2) + '%' : 'Sem dado', 1)}${li('Projetado D', VN(E, 'iuga.proj') != null ? fmtN(VN(E, 'iuga.proj'), 2) + '%' : '—', 1)}${linhasTaticas(E, ctx.dia)}</div></div>
        <div class="col6 sep">
          <div class="row-sb"><span class="gh">Últimas 24 h</span>${V(E, 'queima.ref') ? tag(V(E, 'queima.ref')) : ''}</div>
          ${ev.length ? ev.map(e => `<div class="li ev"><span>${T(e.evento)}</span><div class="row-sb"><span class="cap">Flare ${esc(e.flare)}</span><span class="v">${fmtU(e.volume, 1, 'Mm³')}</span></div></div>`).join('') : '<div class="li"><span class="sec">Sem evento relevante</span></div>'}
          <span class="gh">Modo do flare</span><div class="cps">${flare('HP', V(E, 'flare.hp'))}${flare('LP', V(E, 'flare.lp'))}</div>
          <span class="gh">Recuperação de gás</span><div class="cps">${chipsEq(E, 'recuperacao')}</div></div></div>
      <div class="card col6">${hd('Injeção de gás', pill(ga.sem, semNome(ga.sem)), 'gas')}
        <div><span class="big">${fmtN(gR)}</span><span class="unit">Mm³/d</span></div>
        <span class="cap row-w">${ga.pct != null ? fmtN(ga.pct, 1) + '% da meta' : 'Sem dado'} · sem exportação ${V(E, 'gas.ref') ? tag(V(E, 'gas.ref')) : ''}</span>
        <div>${li('Meta', fmtN(gM))}${li('Projetado D', fmtN(VN(E, 'gas.proj')), 1)}</div>
        <span class="gh">Compressores e injetores</span><div class="cps">${chipsEq(E, 'gas')}${chipsPoco(E, 'inj_gas')}</div></div>
      <div class="card col6">${hd('Injeção de água', pill(ag.sem, semNome(ag.sem)), 'agua')}
        <div><span class="big">${fmtN(aR)}</span><span class="unit">m³/d</span></div><span class="cap">${ag.pct != null ? fmtN(ag.pct, 1) + '% da meta' : 'Sem dado'} · projetado D ${fmtN(VN(E, 'agua.proj'))}</span>
        <div class="row-sb mt4"><span class="gh">Composição da água injetada</span>${V(E, 'agua.ref') ? tag(V(E, 'agua.ref')) : ''}</div>
        <div class="bar" role="img" aria-label="Composição da água injetada"><div style="width:${tot ? urs / tot * 100 : 0}%;background:#00B2A9"></div><div style="width:${tot ? pr / tot * 100 : 0}%;min-width:${pr ? 4 : 0}px;background:#75787B"></div></div>
        <div class="comp"><span class="lg"><i style="background:#00B2A9"></i>Dessulfatada (URS)</span><b>${fmtU(urs, 0, 'm³')}</b><span class="sec">${pct(urs)}</span>
          <span class="lg"><i style="background:#75787B"></i>Produzida reinjetada</span><b>${fmtU(pr, 0, 'm³')}</b><span class="sec">${pct(pr)}</span></div>
        <span class="cap">Produzida descartada no mar: ${fmtU(VN(E, 'agua.prod_desc'), 0, 'm³')}</span>
        <span class="gh">Bombas e injetores</span><div class="cps">${chipsEq(E, 'bombas')}${chipsPoco(E, 'inj_agua')}</div></div>
    </section>
    <section class="g r3">
      <div class="card col0">${hd('Destaques e ameaças', '<span class="cap">indicados pelas coordenações</span>')}${ameacas}</div>
      <div class="card col0">${hd('Principais atividades do dia', '<span class="cap">indicadas pelas coordenações</span>')}${atividades}</div>
      <div class="card col2">${hd('Pauta extra')}<div class="tema"><span class="cap">Tema do dia</span><b>${T(tema)}</b></div>
        ${pe.slice(0, 3).map((i, k) => `<div class="li pe${k ? '' : ' n0'}"><span class="col"><b>${T(i.payload.texto)}</b><span class="cap">${T(i.payload.detalhe || '')}</span></span>${pill(i.payload.semaforo, semNome(i.payload.semaforo))}</div>`).join('')}</div>
    </section>
    <footer class="ft">
      <span>${tag('A')} automático</span><span>${tag('M')} manual</span><span>${tag('PT')} APLAT</span>
      <span>${legendaPocos('poço aberto 24 h')}</span><span>${legendaEq()}</span>
      <span class="ell">Sem registro hoje: ${esc(semReg.join(', ') || '—')}</span><span class="sp"></span>${SELO}
    </footer>
  </main></div>`;
}

/* ---------------- blocos de coordenação: peças comuns (D-42) ----------------
   Padrão das três coordenações, colunas de mesma largura:
   esquerda = Indicadores (+ cards da coordenação) · centro = Equipamentos e Sistemas – PFCEO + Últimas 24h ·
   direita = Serviços planejados hoje + Canal Base x Bordo + Resultados de Análises (D-52). O título de cada card leva à página de detalhe. */
const BLOCO_COORD = { 2: 'COPROD', 3: 'COEMB', 4: 'COMAN' };
const COORD_BLOCO = { COPROD: 2, COEMB: 3, COMAN: 4 };
const lk = (b, t) => `#/apresentacao/${b}/${t}`;
function cardServicos(E, coord, href = '', max = 5) {
  const sv = E.servicos.filter(s => s.payload.coord === coord).slice(0, max);
  return `<div class="card col">${hd('Serviços planejados hoje', '', '', href)}
    ${sv.length ? sv.map(s => `<div class="row2"><div class="col"><span class="t1">${T(s.payload.titulo)}</span><span class="t2">${T(s.payload.detalhe || '')}</span></div><span class="tg">${s.payload.abertura ? tagAb : ''}${tag(s.payload.origem)}</span></div>`).join('') : '<div class="row2"><span class="sec">Nenhum serviço registrado</span></div>'}
  </div>`;
}
function destaqueHtml(d, compacto = false) {
  return `<div class="dq${compacto ? ' c' : ''}"><div class="dq-m">${pill(d.semaforo, d.status || semNome(d.semaforo))}${tag(d.fonte)}${d.abertura ? tagAb : ''}<span class="cap">${T(d.tag)}${d.tag ? ' · ' : ''}${esc(d.meta)}</span></div>
    <span class="dq-t">${T(d.titulo)}</span>${d.impacto ? `<span class="dq-i">Impacto: ${T(d.impacto)}</span>` : ''}${d.pedido ? `<span class="dq-i"><b>Pedido à base:</b> ${T(d.pedido)}</span>` : ''}</div>`;
}
/* Últimas 24h (antes "Destaques das 24 h"): destaques aprovados e criados + ameaças e oportunidades */
function cardUltimas24(E, coord, b) {
  const ds = destaquesDe(E, coord), N = CFG.destaquesPorBloco;
  const am = itensDe(E, coord, 'ameaca'), op = itensDe(E, coord, 'oportunidade');
  return `<div class="card col fill">${hd('Últimas 24h', `<span class="cap nw">${tag('PS')} passagens · ${tag('C')} coordenação</span>`, '', lk(b, 'ultimas24'))}
    ${am.slice(0, 2).map(i => `<div class="th2 prio">${glyph(i.payload.semaforo, 18)}<span><span class="k2">Ameaça</span> ${T(i.payload.texto)}</span></div>`).join('')}
    ${op.slice(0, 1).map(i => `<div class="th2 prio">${glyph('ok', 18)}<span><span class="k2">Oportunidade</span> ${T(i.payload.texto)}</span></div>`).join('')}
    ${ds.slice(0, N).map(d => destaqueHtml(d, true)).join('') || `<div class="dq c"><span class="sec">Nenhum destaque aprovado pela ${coord}.</span></div>`}
    <div class="cap mt-auto ft2">${Math.min(ds.length, N)} de ${N} destaques · ${am.length} ameaça${am.length === 1 ? '' : 's'} · ${op.length} oportunidade${op.length === 1 ? '' : 's'}</div></div>`;
}
/* Equipamentos e Sistemas – PFCEO: só os selecionados pelo coordenador, piores primeiro */
const unidadesHtml = i => {
  const u = +i.unidades, d = +i.disponiveis;
  if (!(u > 0) || i.disponiveis === '' || i.disponiveis == null || isNaN(d)) return '';
  return `<span class="un2" aria-label="${d} de ${u} disponíveis">${Array.from({ length: u }, (_, k) => `<i class="${k < d ? 'on' : ''}"></i>`).join('')}<b>${d}/${u}</b></span>`;
};
function pfLinha(i) {
  return `<div class="row2 pf"><div class="col"><span class="t1">${T(i.funcao)}${i.redundancia ? ` <span class="sec n">· ${esc(i.redundancia)}</span>` : ''}</span><span class="t2">${T(i.nota || '')}</span></div><span class="tg">${unidadesHtml(i)}${pill(PF.semDisp(i.disponibilidade), PF.curto(i.disponibilidade))}</span></div>`;
}
function cardPfceo(E, coord, b) {
  const s = pfceoSelecao(E, coord), v = E.listas['pfceo.' + coord];
  return `<div class="card col pfc">${hd('Equipamentos e Sistemas – PFCEO', v ? tag(v.origem === 'A' ? 'PFCEO ' + hhmm(v.em) : 'M') : '', '', lk(b, 'pfceo'))}
    ${s.itens.map(pfLinha).join('') || '<div class="row2"><span class="sec">Nenhum sistema selecionado na curadoria</span></div>'}
    ${s.sugerida && s.itens.length ? '<span class="cap mt-auto">Aprovação automática: sistemas com desvio</span>' : ''}</div>`;
}
const SIT_SEM = { vencida: ['nok', 'Vencida'], vence24: ['at', 'Vence hoje'], prazo: ['ok', 'No prazo'], ok: ['ok', 'No prazo'], enc: ['sd', 'Encerrada'] };
const ORD_SIT = { vencida: 0, vence24: 1, prazo: 2, ok: 2, enc: 3 };
const demandasAbertas = (E, coord) => E.demandas.filter(d => d.payload.coord === coord && d.payload.status !== 'encerrada').sort((a, b) => ORD_SIT[a.situacao] - ORD_SIT[b.situacao] || String(a.payload.prazo).localeCompare(String(b.payload.prazo)));
/* Canal Base x Bordo (D-52): só os principais tópicos tratados entre a base e a coordenação, sem placar de tarefas */
const topicosCanal = (E, coord) => E.demandas.filter(d => d.payload.coord === coord && d.payload.status !== 'encerrada')
  .sort((a, b) => String(b.payload.dataRedia).localeCompare(String(a.payload.dataRedia)) || ordem(b, a));
function cardCanal(E, coord, b) {
  const tp = topicosCanal(E, coord);
  return `<div class="card col">${hd('Canal Base x Bordo', '', '', lk(b, 'servicos'))}
    ${tp.length ? tp.slice(0, 2).map(d => `<div class="row2"><div class="col"><span class="t1">${T(d.payload.titulo)}</span><span class="t2">${esc(d.payload.sentido)} · desde ${ddmm(d.payload.dataRedia)}</span></div></div>`).join('') : '<div class="row2"><span class="sec">Nenhum tópico em pauta com a base</span></div>'}</div>`;
}
/* Resultados de Análises (D-52): últimos resultados do eplab; a data fica em destaque quando passa da periodicidade */
function cardAnalises(E, coord, b, ctx) {
  const an = labDe(E, coord, ctx.dia), v = an.find(a => a.origem);
  return `<div class="card col fill">${hd('Resultados de Análises', v ? tag(v.origem === 'A' ? 'eplab' : 'M') : '', '', lk(b, 'analises'))}
    ${an.map(a => `<div class="row2 an"><div class="col"><span class="t1">${esc(a.curto || a.rot)}</span></div><span class="tg"><b class="anv">${a.valor === null ? '<span class="sec">Sem dado</span>' : (a.tipo === 'texto' ? esc(a.valor) : fmtN(a.valor, a.dec)) + (a.un && a.valor !== null ? `<span class="u">${NBSP}${esc(a.un)}</span>` : '')}</b>${a.data ? (a.atrasada ? `<span class="o at dt">${SH.at(15)}${ddmm(a.data)}</span>` : `<span class="dt0">${ddmm(a.data)}</span>`) : ''}</span></div>`).join('')}
    </div>`;
}
function linhaSistema(titulo, nota, status) {
  const s = semDeStatus(status);
  return `<div class="row2"><div class="col"><span class="t1">${T(titulo)}</span><span class="t2">${T(nota || '')}</span></div><span class="tg">${pill(s, status || 'Sem dado')}</span></div>`;
}
const telaCoord = (ctx, b, cab, faixaHtml, esq, E, coord) => `<div class="scr">${cab}${faixaHtml}
  <main class="m3 eq">
    <div class="colg">${esq}</div>
    <div class="colg">${cardPfceo(E, coord, b)}${cardUltimas24(E, coord, b)}</div>
    <div class="colg">${cardServicos(E, coord, lk(b, 'servicos'), 3)}${cardCanal(E, coord, b)}${cardAnalises(E, coord, b, ctx)}</div>
  </main>${rodapeSelo()}</div>`;

/* ---------------- Bloco 2 · COPROD (operação) ---------------- */
function linhasIndicadoresCoprod(E, compacto = false) {
  const ef = Regras.efop(VN(E, 'oleo.real'), VN(E, 'oleo.potencial'));
  const iu = Regras.iuga(VN(E, 'iuga.real'), VN(E, 'iuga.meta'));
  const ga = Regras.injecao(VN(E, 'gas.real'), VN(E, 'gas.meta'));
  const ag = Regras.injecao(VN(E, 'agua.real'), VN(E, 'agua.meta'));
  const ind = (n, u, meta, real, pctTxt, sem, proj, dec = 0, ref = '') =>
    `<span class="td l">${compacto ? `<span class="nm nw">${n} <span class="u0">${u}</span></span>${ref ? `<span class="un">${tag(ref)}</span>` : ''}` : `<span class="nm">${n}</span><span class="un">${u}${ref ? ' ' + tag(ref) : ''}</span>`}</span><span class="td">${fmtN(meta, dec)}</span><span class="td k">${fmtN(real, dec)}</span><span class="td pc">${pctTxt} ${glyph(sem, 16)}</span><span class="td">${fmtN(proj, dec)}</span>`;
  return `<span class="th l">Indicador</span><span class="th">Meta</span><span class="th">Real. D-1</span><span class="th">${compacto ? '%' : '% da meta'}</span><span class="th">Proj. D</span>
    ${ind('Óleo', 'm³/d', VN(E, 'oleo.potencial'), VN(E, 'oleo.real'), ef.pct != null ? fmtN(ef.pct, 1) : '—', ef.sem, VN(E, 'oleo.proj'))}
    ${ind('IUGA', '%', VN(E, 'iuga.meta'), VN(E, 'iuga.real'), iu.desvio != null ? (iu.desvio >= 0 ? '+' : '−') + fmtN(Math.abs(iu.desvio), 2) + NBSP + 'p.p.' : '—', iu.sem, VN(E, 'iuga.proj'), 2)}
    ${ind(compacto ? 'Inj. água' : 'Injeção de água', 'm³/d', VN(E, 'agua.meta'), VN(E, 'agua.real'), ag.pct != null ? fmtN(ag.pct, 1) : '—', ag.sem, VN(E, 'agua.proj'))}
    ${ind(compacto ? 'Inj. gás' : 'Injeção de gás', 'Mm³/d', VN(E, 'gas.meta'), VN(E, 'gas.real'), ga.pct != null ? fmtN(ga.pct, 1) : '—', ga.sem, VN(E, 'gas.proj'), 0, V(E, 'gas.ref') || '')}`;
}
function cardQueima(E, b, ctx) {
  /* D-47: comparação principal na mesma unidade (m³/d): queima projetada D × reserva por dia restante; abaixo, o mês.
     D-57: o terceiro indicador do mês é a reserva tática (IUGA do mês na meta) ou a queima máxima diária para recuperar a meta;
     abaixo da meta, a linha sob as barras indica as origens evitáveis a trabalhar. ("Reserva no mês" segue no detalhe.) */
  const r = reservaQueima(E, ctx.dia), iuS = Regras.iuga(r.iugaMes, r.meta), t = iugaTatico(E, ctx.dia), rec = t.modo === 'recuperar';
  const proj = r.projDia, dia = r.porDia != null ? Math.max(0, r.porDia) : null;
  const esc_ = Math.max(proj || 0, dia || 0) * 1.08 || 1, corP = r.sem === 'nok' ? COR.nok : r.sem === 'at' ? COR.at : COR.ok;
  const dif = proj != null && dia ? (proj / dia - 1) * 100 : null;
  const barra = (rot, v, cor) => `<span class="qb-r">${rot}</span><div class="qb-t"><div style="width:${v != null ? v / esc_ * 100 : 0}%;background:${cor}"></div></div><b class="qb-v">${v != null ? fmtN(v) : '—'}</b>`;
  const org = t.origens.slice(0, 2).map(o => `${esc(o.causa)} ${fmtN(o.m3d / 1000)}`).join(' · ');
  const legenda = rec && org ? `<b class="k">Trabalhar:</b> ${org} <span class="sec n">Mm³/d evitáveis</span>` : `m³/d · ${dif != null ? `projetada ${dif >= 0 ? fmtN(dif, 0) + '% acima' : fmtN(-dif, 0) + '% abaixo'} da reserva diária nos ${r.restantes} dias restantes` : 'faltam dados'}`;
  const terceiro = !t.modo ? `<div class="col"><span class="cap">Reserva tática</span><span class="nw"><b class="big b28">—</b></span></div>`
    : !rec ? `<div class="col qtat"><span class="cap">Reserva tática</span><span class="nw"><b class="big b28">${t.tatica > 0 ? fmtN(t.tatica) : '0'}</b><span class="unit u16">m³</span></span><span class="cap f16">${t.taticaDia > 0 ? fmtN(t.taticaDia) + NBSP + 'm³/d · ' : ''}≥ ${fmtN(t.metaT, 2)}%</span></div>`
      : `<div class="col qtat rec"><span class="cap">${glyph('nok', 14)} Máx. p/ recuperar</span><span class="nw"><b class="big b28">${t.alcancavel ? fmtN(t.maxDia) : '0'}</b><span class="unit u16">m³/d</span></span><span class="cap f16">${t.alcancavel ? 'IUGA diário ≥ ' + fmtN(t.iugaDiaNec, 2) + '%' : 'meta perdida no mês'}</span></div>`;
  return `<div class="card col">${hd('Queima projetada', pill(r.sem, r.sem === 'nok' ? 'Sem reserva' : r.sem === 'at' ? 'Acima da reserva diária' : r.sem === 'ok' ? 'Dentro da reserva' : 'Sem dado'), '', lk(b, 'queima'))}
    <div class="qb">${barra('Projetada D', proj, corP)}${barra(rec ? 'Máx. p/ meta' : 'Reserva por dia', dia, '#75787B')}<span></span><span class="cap">${legenda}</span><span></span></div>
    <div class="qk">
      <div class="col"><span class="cap">Acumulado no mês</span><span class="nw"><b class="big b28">${fmtN(r.Qacc)}</b><span class="unit u16">m³</span></span></div>
      <div class="col"><span class="cap">IUGA parcial do mês</span><span class="row-c nw"><b class="big b28">${r.iugaMes != null ? fmtN(r.iugaMes, 2) : '—'}</b><span class="unit u16">%</span>${glyph(iuS.sem, 16)}</span><span class="cap f16">meta ${r.meta != null ? fmtN(r.meta, 0) + '%' : '—'}</span></div>
      ${terceiro}
    </div></div>`;
}
function cardPocos(E, b) {
  const prod = pocos(E, 'produtor'), semTrem = prod.filter(p => !p.trem);
  const linhaTrem = ([k, nome, max]) => { const ps = prod.filter(p => p.trem === k); return `<span>${nome === 'Trem de teste' ? 'Teste' : nome} <span class="sec n">${ps.length}/${max}</span></span><div class="cps">${ps.map(p => chip(p.poco, p.status)).join('') || '<span class="cap">—</span>'}</div>`; };
  const prox = V(E, 'teste.proximo');
  return `<div class="card col fill">${hd('Poços · últimas 24 h', '', '', lk(b, 'pocos'))}
    <div class="pg">${TRENS.map(linhaTrem).join('')}${semTrem.length ? `<span>Sem trem</span><div class="cps">${semTrem.map(p => chip(p.poco, p.status)).join('')}</div>` : ''}<span>Inj. água</span><div class="cps">${chipsPoco(E, 'inj_agua')}</div><span>Inj. gás</span><div class="cps">${chipsPoco(E, 'inj_gas')}</div></div>
    <div class="li prx"><span>Próximo teste de vazão</span><span class="v">${prox ? T(prox) : '—'}${V(E, 'teste.previsao') ? ` <span class="sec n">· ${esc(V(E, 'teste.previsao'))}</span>` : ''}</span></div>
    <span class="mt-auto">${legendaPocos()}</span></div>`;
}
function telaCoprod(E, ctx) {
  const b = 2;
  const esq = `<div class="card">${hd('Indicadores', '', '', lk(b, 'indicadores'))}<div class="tbl cp">${linhasIndicadoresCoprod(E, true)}</div></div>${cardQueima(E, b, ctx)}${cardPocos(E, b)}`;
  return telaCoord(ctx, b, cabecalho({ ...ctx, subData: 'Realizado D-1 · Projetado D' }, b, { eye: 'COPROD', t: 'Produção' }, 'Topside, poços e processamento'), faixa(E), esq, E, 'COPROD');
}

/* ---------------- Bloco 3 · COEMB ---------------- */
function cardUtilidades(E, b) {
  const util = L(E, 'util'), u0 = util[0], r0 = Regras.utilidade(u0);
  return `<div class="card col">${hd('Utilidades · estoque × mínimo', '', '', lk(b, 'utilidades'))}
    ${u0 ? `<div class="ut"><div class="row-sb"><span class="t1">${T(u0.nome)}</span>${pill(r0.sem, semNome(r0.sem))}</div><span class="t2">${fmtN(u0.estoque)}${NBSP}m³ · mín. ${fmtN(u0.minimo)} · consumo ${fmtN(u0.consumo)} × produção ${fmtN(u0.producao)}${NBSP}m³/d</span>${r0.queda > 0 ? `<b class="f19">Cai ${fmtN(r0.queda)}${NBSP}m³/d · cerca de ${fmtN(r0.dias)} dias até o mínimo</b>` : ''}</div>` : ''}
    ${util.slice(1, 3).map(u => li(T(u.nome), `${fmtN(u.estoque)}${NBSP}m³ <span class="sec n">· mín. ${fmtN(u.minimo)}</span>`)).join('')}</div>`;
}
function telaCoemb(E, ctx) {
  const b = 3;
  const est = VN(E, 'off.estoque'), cap = VN(E, 'off.capacidade'), p = est && cap ? est / cap * 100 : 0;
  const top = String(V(E, 'off.top') || '').split(' ');
  const esq = `<div class="card col">${hd('Indicadores', V(E, 'off.navio_ok') === 'Sim' ? pill('ok', 'Navio confirmado') : pill('at', 'Navio não confirmado'), 'navio', lk(b, 'indicadores'))}
        <span class="gh">Tancagem e offloading</span>
        <div><span class="big">${fmtN(est)}</span><span class="unit">m³</span><span class="cap ml10">${p ? fmtN(p, 0) + '% de ' + fmtN(cap) : ''}</span></div>
        <div class="track t12"><div style="width:${p}%;background:#008542"></div></div>
        <div class="g3b"><div class="col"><span class="nw"><b class="big b34">${fmtN(VN(E, 'off.ate_top'))}</b><span class="unit u18">m³</span></span><span class="cap">até o TOP</span></div>
          <div class="col"><span class="nw"><b class="big b34">${fmtN(VN(E, 'off.prod24'))}</b><span class="unit u18">m³</span></span><span class="cap">produção 24 h</span></div>
          <div class="col"><span class="nw"><b class="big b34">${esc(top[0] || '—')}</b><span class="unit u18">${esc(top[1] || '')}</span></span><span class="cap">previsão de TOP</span></div></div>
        <div>${li('Navio', T(V(E, 'off.navio') || 'Sem dado'))}${li('Qualidade do estoque', T(V(E, 'off.qualidade') || 'Sem dado'))}${li('Estações de offloading', T(V(E, 'off.estacoes') || 'Sem dado'))}</div></div>
      ${cardUtilidades(E, b)}
      <div class="card col fill">${hd('Tanques em atenção', '', '', lk(b, 'tanques'))}
        ${L(E, 'tq.atencao').slice(0, 4).map(t => linhaSistema(t.tanque, t.nota, t.status)).join('') || '<div class="row2"><span class="sec">Nenhum tanque em atenção</span></div>'}</div>`;
  return telaCoord(ctx, b, cabecalho({ ...ctx, subData: 'Boletim SITOP' }, b, { eye: 'COEMB', t: 'Embarcação' }, 'Estocagem, transferência e estabilidade'), faixa(E), esq, E, 'COEMB');
}

/* ---------------- Bloco 4 · COMAN ---------------- */
function telaComan(E, ctx) {
  const b = 4, tgs = L(E, 'ger.tgs').slice(0, 4), ind = L(E, 'man.ind').slice(0, 3);
  const esq = `<div class="card col">${hd('Indicadores', V(E, 'man.ref') ? tag(V(E, 'man.ref')) : '', '', lk(b, 'indicadores'))}
        <span class="gh">Manutenção</span>
        <div class="g3c">${ind.map(i => { const s = Regras.manutencao(+i.valor, +i.meta); return `<div class="col"><span class="row-c f20 fb">${T(i.ind)} ${glyph(s, 16)}</span><span class="big b44">${fmtN(i.valor, i.valor % 1 ? 1 : 0)}%</span><span class="cap">meta ${fmtN(i.meta, i.meta % 1 ? 1 : 0)}%</span></div>`; }).join('')}</div>
        <div class="mt6">${li('Notas IF6/6 abertas', fmtN(VN(E, 'man.notas_if6')))}${li('Sensores em falha', fmtN(VN(E, 'man.sensores')))}</div></div>
      <div class="card col">${hd('Geração principal', pill(V(E, 'ger.reserva') === 'Sem reserva' ? 'nok' : 'ok', V(E, 'ger.reserva') || 'Sem dado'), 'raio', lk(b, 'geracao'))}
        <span class="gh">4 × 33%</span>
        <div class="tgs cp">${tgs.map(t => `<div class="tgc"><div class="row-sb"><b class="f24">${T(t.tg)}</b>${pill(semDeStatus(t.status) === 'sd' ? 'sd' : semDeStatus(t.status), t.status)}</div><span class="t2 k">${T(t.linha1)}</span><span class="t2${t.alerta === 'sim' ? ' k fb' : ''}">${T(t.linha2)}</span></div>`).join('')}</div>
        <div class="cps cp mt6">${L(E, 'ger.aux').map(a => `<span class="w">${glyph(semDeStatus(a.status), 13)}${T(a.nome)}</span>`).join('')}</div></div>
      <div class="card col fill">${hd('Órgãos legais e suprimentos', '', '', lk(b, 'legais'))}${L(E, 'legais').map(l => `<div class="li"><span>${T(l.item)}</span>${pill(semDeStatus(l.status), l.status)}</div>`).join('')}</div>`;
  return telaCoord(ctx, b, cabecalho({ ...ctx, subData: 'Boletim SITOP' }, b, { eye: 'COMAN', t: 'Manutenção' }, 'Elétrica, instrumentação, automação e mecânica'), faixa(E), esq, E, 'COMAN');
}

/* ---------------- Bloco 5 · Fechamento ---------------- */
function telaFechamento(E, ctx) {
  const hoje = E.demandas.filter(d => d.payload.dataRedia === ctx.dia);
  const ant = E.demandas.filter(d => d.payload.dataRedia !== ctx.dia && d.payload.status !== 'encerrada');
  const n = s => ant.filter(d => d.situacao === s).length;
  const venc = ant.filter(d => d.situacao === 'vencida').slice(0, 4);
  const sugHoje = E.sugestoes.filter(s => s.decisao);
  const apr = sugHoje.filter(s => s.decisao.payload.acao === 'aprovar').length, rec = sugHoje.filter(s => s.decisao.payload.acao === 'recusar').length;
  const ata = E.atas[E.atas.length - 1];
  const trans = E.anexos.find(a => a.payload.tipo === 'transcricao');
  const dias = [1, 2, 3].map(k => addDias(ctx.dia, k));
  const prox = addDias(ctx.dia, 1);
  return `<div class="scr">${cabecalho({ ...ctx, subData: `Pauta congelada às ${CFG.horarios.congelamento}` }, 5, { eye: 'GEPLAT', t: 'Fechamento' }, 'Demandas e ata')}
  <main class="m3" style="grid-template-columns:minmax(0,1.75fr) minmax(0,1fr)">
    <div class="colg">
      <div class="card">${hd('Demandas registradas nesta REDIA', `<span><b class="big b32">${hoje.length}</b><span class="unit u20">nova${hoje.length === 1 ? '' : 's'}</span></span>`)}
        <div class="tbl dm"><span class="th l">#</span><span class="th l">Demanda</span><span class="th l">Sentido</span><span class="th l">Responsável</span><span class="th l">Prazo</span><span class="th l">Origem</span>
        ${hoje.slice(0, 6).map((d, i) => `<span class="td l fb">${i + 1}</span><span class="td l fb">${T(d.payload.titulo)}</span><span class="td l nw">${esc(d.payload.sentido)}</span><span class="td l nw">${T(d.payload.responsavel)}</span><span class="td l">${d.payload.prazo ? ddmm(d.payload.prazo) : '—'}</span><span class="td l nw">${tag(d.payload.origem)} ${esc(d.payload.coord)}</span>`).join('') || '<span class="td l"></span><span class="td l sec">Nenhuma demanda registrada ainda</span><span class="td"></span><span class="td"></span><span class="td"></span><span class="td"></span>'}
        </div></div>
      <div class="card col fill">${hd('Demandas de reuniões anteriores')}
        <div class="tiles"><div class="tile v1"><b class="big b48">${n('vencida')}</b><span>vencidas</span></div><div class="tile v2"><b class="big b48">${n('vence24')}</b><span>vencem hoje</span></div><div class="tile v3"><b class="big b48">${n('prazo') + n('ok')}</b><span>no prazo</span></div></div>
        <div class="row-sb mt4"><span class="gh">Vencidas · lidas hoje</span><span class="cap">As demais ficam na área de cada coordenação</span></div>
        <div class="tbl vc"><span class="th l">Demanda</span><span class="th l">Responsável</span><span class="th l">Prazo</span><span class="th">Atraso</span>
        ${venc.map(d => `<span class="td l">${T(d.payload.titulo)}</span><span class="td l nw">${T(d.payload.responsavel)}</span><span class="td l">${ddmm(d.payload.prazo)}</span><span class="td fb">${-diffDias(d.payload.prazo, ctx.dia)}${NBSP}d</span>`).join('') || '<span class="td l sec">Nenhuma demanda vencida</span><span class="td"></span><span class="td"></span><span class="td"></span>'}
        </div></div>
    </div>
    <div class="colg">
      <div class="card col">${hd('Ata do dia')}
        <div class="li n0"><span>PDF da pauta congelada</span>${E.congelamento ? pill('ok', 'Gerado ' + hhmm(E.congelamento.criadoEm)) : pill('at', 'Pendente')}</div>
        <div class="li"><span>Demandas registradas</span>${pill(hoje.length ? 'ok' : 'sd', hoje.length + ' nova' + (hoje.length === 1 ? '' : 's'))}</div>
        <div class="li"><span>Transcrição do Teams</span>${trans ? pill('ok', 'Anexada') : pill('at', 'A anexar')}</div>
        <div class="li"><span>Fechamento da ata</span><span class="s">${ata ? 'Fechada ' + hhmm(ata.criadoEm) : 'Base · 4º GEPLAT'}</span></div>
        <div class="li"><span>Arquivo</span><span class="s">REDIA/${ctx.dia.replace(/-/g, '/')}</span></div></div>
      <div class="card col">${hd('Retorno às passagens de serviço')}
        <div class="nums"><span><b class="big b44">${apr}</b><span class="cap">itens aprovados</span></span><span><b class="big b44">${rec}</b><span class="cap">recusado${rec === 1 ? '' : 's'}</span></span></div>
        <span class="cap">O status aparece para o supervisor na próxima troca de turno</span></div>
      <div class="card col fill">${hd('Pauta extra · calendário')}
        <div class="tema"><span class="cap">Próxima REDIA · ${diaSemana(prox).toLowerCase()}, ${ddmm(prox)}</span><b>${T(CFG.pautaExtra[parseData(prox).getDay()] || '[tema]')}</b><span class="cap">Confirmar responsável</span></div>
        ${dias.slice(1).map(d => li(`${diaSemana(d)}, ${ddmm(d)}`, T(CFG.pautaExtra[parseData(d).getDay()] || '[tema]'), 1)).join('')}
        <span class="cap mt-auto">Calendário configurável por UEP</span></div>
    </div>
  </main>${rodapeSelo()}</div>`;
}

const TELAS = [telaAbertura, telaCoprod, telaCoemb, telaComan, telaFechamento];

/* ---------- encaixe automático: conteúdo variável sem estourar a tela ----------
   1) reduz o conteúdo do card (exceto o título) até 80%; 2) se ainda não couber,
   oculta os últimos itens e informa quantos ficaram de fora. */
function encaixar(raiz) {
  const cards = [...raiz.querySelectorAll('.card')];
  const estoura = c => c.scrollHeight > c.clientHeight + 1 || c.scrollWidth > c.clientWidth + 1;
  for (const c of cards) {
    if (!estoura(c)) continue;
    const filhos = [...c.children].filter(x => !x.classList.contains('hd'));
    for (const z of [0.94, 0.88, 0.82]) { filhos.forEach(f => { f.style.zoom = z; }); if (!estoura(c)) break; }
    if (!estoura(c)) continue;
    const todos = [...c.querySelectorAll('.li, .dl, .row2, .th2, .dq, .dqx, .opr, .ar, .comp, .pg, .w')].filter(e => !e.closest('.hd') && !e.classList.contains('mt-auto') && !(e.classList.contains('w') && e.closest('.tbl')));
    const itens = [...todos.filter(e => e.classList.contains('prio')), ...todos.filter(e => !e.classList.contains('prio'))];   // .prio sai por último
    const temDetalhe = !!c.querySelector('.hd a.lk');
    let ocultos = 0;
    const nota = document.createElement('span'); nota.className = 'mais';
    while (estoura(c) && itens.length) { const e = itens.pop(); e.style.display = 'none'; ocultos++; nota.textContent = `+${ocultos} não exibido${ocultos > 1 ? 's' : ''} · ${temDetalhe ? 'ver no detalhe (clique no título)' : 'ver na área do coordenador'}`; if (!nota.isConnected) c.appendChild(nota); }
  }
}
