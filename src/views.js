/* ===================== REDIA Búzios · telas de trabalho e roteamento ===================== */
'use strict';
let E = null;                      // estado atual reconstruído
const UI = { sel: {}, aba: {}, pres: { bloco: 1, restante: null, rodando: false, ult: 0, extra: 0 } };

function atualizarEstado() {
  E = construirEstado(Store.registros(DIA), Store.demandas(), DIA);
  const regs = x => Store.registros(x);
  E.mes = acumuladoMes(DIA, regs); E.tend = tendencias(DIA, regs); E.classes = acumuladoClasses(DIA, regs);   // D-43, D-61
  E.tend30 = tendencias(DIA, regs, 30); E.rec = recorrencias(DIA, regs); E.def = acumuladoDeferimento(DIA, regs); E.custo = custoIndisponibilidade(DIA, regs);   // D-63
  return E;
}
function congelada() { return !!E?.congelamento; }
function fase() {
  const m = Relogio.minutos(), h = CFG.horarios;
  if (congelada()) return m >= horaMin(h.fim) ? { id: 'ata', nome: 'Ata', desc: 'Reunião encerrada · fechar a ata' } : m >= horaMin(h.inicio) ? { id: 'reuniao', nome: 'REDIA em andamento', desc: `${h.inicio}–${h.fim}` } : { id: 'congelada', nome: 'Pauta congelada', desc: `às ${hhmm(E.congelamento.criadoEm)}` };
  if (m < horaMin(h.preenchimento)) return { id: 'preenchimento', nome: 'Preenchimento', desc: `até ${h.preenchimento}` };
  if (m < horaMin(h.congelamento)) return { id: 'pre', nome: 'Pré-REDIA', desc: `${h.preRedia}–${h.congelamento}` };
  return { id: 'congelar', nome: 'Hora de congelar', desc: `desde ${h.congelamento}` };
}
function snapshotDe(E) {
  const s = JSON.parse(JSON.stringify({ valores: E.valores, listas: E.listas, sugestoes: E.sugestoes, servicos: E.servicos, itens: E.itens, demandas: E.demandas, selecoes: E.selecoes, mes: E.mes, tend: E.tend, classes: E.classes, tend30: E.tend30, rec: E.rec, def: E.def, custo: E.custo }));
  return s;
}
function estadoApresentacao(bloco) {
  if (!E.congelamento || bloco === 5) return E;
  const s = E.congelamento.payload.snapshot;
  return { ...E, ...s };
}

/* ---------------- cabeçalho do app ---------------- */
function cabecalhoApp(rota) {
  const f = E ? fase() : { nome: '—', desc: '' };
  const item = (h, t, on) => `<a href="${h}" class="${on ? 'on' : ''}">${t}</a>`;
  const c = USUARIO?.coord || 'COPROD';
  return `<header class="apph">
    <div><span class="kick">REDIA Búzios${USUARIO?.uep ? ' · ' + esc(USUARIO.uep) : ''} · ${esc(APP.versao)}</span><div class="tit">${esc(rota.titulo)}</div><span class="dash"></span></div>
    ${USUARIO?.uep && (USUARIO.unidades.length > 1 || USUARIO.adminSistema) ? `<a class="uni-tr" href="#/unidades" title="Trocar de unidade"><b>${esc(USUARIO.uep)}</b><span>Trocar unidade</span></a>` : ''}
    ${E && USUARIO?.uep && notificacoesAbertas(E, USUARIO.coord).length ? `<a class="ntf" href="#/curadoria/${USUARIO.coord}" title="Notificação do GEPLAT">Concluir ${esc(USUARIO.coord)}</a>` : ''}
    <nav aria-label="Seções">${USUARIO?.uep
      ? `${item('#/inicio', 'Início', rota.id === 'inicio')}${item('#/curadoria/' + c, 'Curadoria', rota.id === 'curadoria')}${item('#/apresentacao/1', 'Apresentação', false)}${item('#/ata', 'Fechamento e ata', rota.id === 'ata')}${item('#/arquivo', 'Arquivo', rota.id === 'arquivo')}${item('#/config', 'Configuração', rota.id === 'config')}${USUARIO.editor ? item('#/studio', 'Studio', rota.id === 'studio') : ''}${USUARIO.adminSistema ? item('#/admin', 'Administração', rota.id === 'admin') : ''}${['inicio', 'curadoria'].includes(rota.id) || Vivo.ativo ? botaoVivo('vivo-h') : ''}`
      : `${item('#/unidades', 'Unidades', rota.id === 'unidades')}${USUARIO?.adminSistema ? item('#/admin', 'Administração', rota.id === 'admin') : ''}`}<a href="#/sair" class="sair" title="Encerrar a sessão">Sair</a></nav>
    <span class="armz">${textoArmaz()}</span>
    <div class="egp-sp"></div>
    <svg class="egp" width="420" height="80" viewBox="0 0 420 80" preserveAspectRatio="none" aria-hidden="true"><path d="M90 -20 L460 -20 L460 120 L64 120 L48 76 Q44 64 48 54 Z" fill="#008542"/><path d="M40 -20 L22 50 Q19 62 24 72 L40 120" fill="none" stroke="#FDC82F" stroke-width="3"/></svg>
    <div class="st"><div class="ph"><b>${esc(f.nome)}</b><span>${esc(f.desc)}</span><span>${diaSemana(DIA)}, ${ddmmaaaa(DIA)}</span></div><span class="clk" data-clk>${hhmm(Relogio.agora())}</span></div>
  </header>`;
}

/* linha de situação do armazenamento no cabeçalho (atualizada a cada sincronização) */
function textoArmaz() {
  const armaz = Store.modo === 'nuvem' ? `${Store.online ? 'Nuvem' : '<b>Sem conexão</b>'} · sincronizado ${Store.ultimaLeitura ? hhmmss(Store.ultimaLeitura) : '—'}${Store.tempoReal ? ' · tempo real' : ''}` : Store.modo === 'memoria' ? 'Modo demonstração' : 'Sem armazenamento';
  return `${armaz}${Relogio.simulado() ? ' · <b>horário simulado</b>' : ''}${USUARIO ? ' · ' + esc(USUARIO.nome) + ' (' + esc(USUARIO.posto) + ' · ' + esc(USUARIO.chave) + ')' : ''}`;
}

/* ---------------- roteador ---------------- */
const ROTAS = [
  { re: /^#\/inicio$/, id: 'inicio', titulo: 'Início', fn: telaInicio },
  { re: /^#\/unidades$/, id: 'unidades', titulo: 'Unidades', fn: telaUnidades },   // D-70
  { re: /^#\/admin$/, id: 'admin', titulo: 'Administração', fn: telaAdmin },   // D-72
  { re: /^#\/studio$/, id: 'studio', titulo: 'Studio', fn: telaStudio },   // D-73
  { re: /^#\/curadoria\/(GEPLAT|COPROD|COEMB|COMAN)(?:\/([\w-]+))?$/, id: 'curadoria', titulo: 'Curadoria', fn: telaCuradoria },
  { re: /^#\/apresentacao\/([1-5])$/, id: 'apresentacao', titulo: 'Apresentação', fn: telaApresentacao },
  { re: /^#\/apresentacao\/(semana)$/, id: 'apresentacao', titulo: 'Apresentação · visão semanal', fn: telaApresentacao },   // D-63 (proposta 28)
  { re: /^#\/(?:arquivo|historico)$/, id: 'arquivo', titulo: 'Arquivo', fn: telaArquivo },   // D-65
  { re: /^#\/apresentacao\/([2-4])\/(\w+)$/, id: 'apresentacao', titulo: 'Apresentação · detalhe', fn: telaApresentacao },
  { re: /^#\/ata$/, id: 'ata', titulo: 'Fechamento e ata', fn: telaAta },
  { re: /^#\/config$/, id: 'config', titulo: 'Configuração', fn: telaConfig },
  { re: /^#\/imprimir$/, id: 'imprimir', titulo: 'Imprimir pauta', fn: telaImprimir },
];
let ROTA_ATUAL = null;
function rotear() {
  if (UI.fecharModal) UI.fecharModal();
  if (location.hash === '#/sair') { sair(); location.replace('#/login'); return; }
  if (!USUARIO) { if (location.hash !== '#/login' && location.hash) UI.destino = location.hash; ROTA_ATUAL = { id: 'login', fn: telaLogin, m: [] }; $('.printroot')?.remove(); telaLogin(); return; }
  if (location.hash === '#/login') { const d = UI.destino || '#/inicio'; UI.destino = null; location.replace(d); return; }
  const semUnidade = ['#/unidades', '#/admin', '#/studio'];   // D-70: telas que não dependem da unidade ativa
  if (!USUARIO.uep && !semUnidade.some(x => (location.hash || '').startsWith(x))) { location.replace('#/unidades'); return; }
  if (USUARIO.uep && !Store.modo && !semUnidade.some(x => (location.hash || '').startsWith(x)) && location.hash !== '#/inicio') { location.hash = '#/inicio'; return; }
  const h = location.hash || '#/inicio';
  for (const r of ROTAS) {
    const m = r.re.exec(h);
    if (m) {
      if (ROTA_ATUAL?.id === 'apresentacao' && r.id !== 'apresentacao') { registrarTempoBloco(); UI.pres.rodando = false; }   // D-61: fecha o tempo do bloco ao sair
      if (r.id === 'arquivo' && ROTA_ATUAL?.id !== 'arquivo') UI.arqLido = 0;   // D-67: arquivo relido ao entrar
      Vivo.aoRotear(r.id, h);   // D-67: apresentação ao vivo (quem controla transmite; quem assiste sai ao trocar de tela)
      ROTA_ATUAL = { ...r, m };
      if (r.id !== 'imprimir') $('.printroot')?.remove();
      r.fn(m); return;
    }
  }
  location.hash = '#/inicio';
}
function render(html) { $('#app').innerHTML = html; rotularTabelas(); }
/* em telas estreitas as tabelas viram cartões: cada célula recebe o nome da coluna */
function rotularTabelas(raiz = document) {
  raiz.querySelectorAll('table.tb').forEach(t => {
    const ths = [...t.querySelectorAll('thead th')].map(th => th.textContent.trim());
    t.querySelectorAll('tbody tr').forEach(tr => [...tr.children].forEach((td, i) => { if (td.tagName === 'TD' && !td.hasAttribute('colspan')) td.dataset.l = ths[i] || ''; }));
  });
}
function rerender() { if (ROTA_ATUAL) ROTA_ATUAL.fn(ROTA_ATUAL.m); }
const telaEstreita = () => matchMedia('(max-width: 900px)').matches;
/* R-03: antes de gravar uma alteração da curadoria, sincroniza e confere se outra sessão já congelou a pauta.
   Na nuvem, o servidor também recusa (PAUTA_CONGELADA), mesmo se duas sessões gravarem ao mesmo tempo. */
const PERMITIDOS_CONGELADA = ['demanda', 'anexo', 'ata', 'reabertura', 'notificacao', 'reuniao', 'acordo'];   // reunião (D-61): decisões, aprendizados e tempos são registrados durante/após a REDIA
/* D-67: a REDIA do dia precisa ter sido iniciada ("Iniciar elaboração"); depois da ata fechada, nada mais é gravado no dia */
const LIVRES_SEM_REDIA = ['redia', 'sugestao', 'notificacao'];
const ataFechada = () => !!E?.atas?.length;
const rediaIniciada = () => !!E?.redia;
async function podeEditar(tipo, extra) {
  if (extra?.escopo === 'demandas') return true;
  if (Store.remoto()) { await Store.sincronizar(); atualizarEstado(); }
  if (ataFechada()) { aviso(`A ata da ${E.atas[0].payload.codigo || 'REDIA'} já foi fechada e arquivada: ela não pode mais ser alterada.`, 'erro'); rerender(); return false; }
  if (!rediaIniciada() && !LIVRES_SEM_REDIA.includes(tipo)) { aviso('A REDIA deste dia ainda não foi iniciada. Um coordenador ou o GEPLAT inicia em “Iniciar elaboração”.', 'erro'); rerender(); return false; }
  if (PERMITIDOS_CONGELADA.includes(tipo)) return true;
  if (!congelada()) return true;
  aviso(`A pauta foi congelada às ${hhmm(E.congelamento.criadoEm)} por ${E.congelamento.autor.nome}. A alteração não foi gravada.`, 'erro'); rerender(); return false;
}
async function salvarE(tipo, payload, extra, msg) {
  if (tipo === 'decisao' && UI.det) for (const k in UI.det) UI.det[k] = false;
  try { if (!(await podeEditar(tipo, extra))) return; await registrar(tipo, payload, extra); atualizarEstado(); if (msg) aviso(msg, 'ok'); rerender(); }
  catch (e) { await tratarErroGravacao(e); }
}
/* falha ao gravar: avisa e, se a pauta foi congelada no meio do caminho ou a sessão caiu, atualiza a tela */
async function tratarErroGravacao(e) {
  aviso('Não foi possível gravar: ' + e.message, 'erro');
  if (e.codigo === 'SESSAO') { setTimeout(() => { location.hash = '#/sair'; }, 1500); return; }
  if (['PAUTA_CONGELADA', 'ATA_FECHADA', 'REDIA_JA_INICIADA', 'ATA_SEM_ACORDO', 'PAUTA_NAO_CONGELADA'].includes(e.codigo)) { try { if (Store.remoto()) await Store.sincronizar(); atualizarEstado(); rerender(); } catch { } }
}
const semChip = s => `<span class="chip ${s}">${(s === 'nok' ? SH.nokW : SH[s] || SH.sd)(13)}${esc(SEM_NOME[s] || s)}</span>`;
const origemTxt = v => v ? `<span class="orig"><span class="tg0">${esc(v.origem)}</span>${esc(v.fonte || '')} · ${hhmm(v.em)}${v.origem !== 'A' ? ' · ' + esc(v.autor?.nome || '') : ''}</span>` : '<span class="orig">sem registro</span>';
const bloqueado = () => congelada() || ataFechada() || !rediaIniciada();
/* D-67 · iniciar a REDIA do dia: cria o objeto único (código atribuído pela base) que todos passam a editar */
async function iniciarRedia() {
  if (!podeIniciarRedia()) return aviso('Só um coordenador ou o GEPLAT inicia a REDIA do dia.', 'erro');
  if (DIA !== isoData(Relogio.agora())) return aviso('A REDIA só pode ser iniciada no próprio dia, a partir da meia-noite.', 'erro');
  if (Store.remoto()) { await Store.sincronizar(); atualizarEstado(); }
  if (rediaIniciada()) { aviso(`A ${E.redia.payload.codigo} já foi iniciada por ${E.redia.autor?.nome || 'outro usuário'}.`, 'ok'); return rerender(); }
  const cod = codigoRedia(CFG.uep, DIA);
  const r0 = await modal({ titulo: 'Iniciar a elaboração da REDIA?', html: `<p>Cria a REDIA de <b>${diaSemana(DIA).toLowerCase()}, ${ddmmaaaa(DIA)}</b> com o código <b class="mono">${cod}</b>. A partir daí, todos os usuários que entrarem editam esta REDIA, até o fechamento da ata.</p>`, botoes: [{ id: 'cancelar', txt: 'Cancelar' }, { id: 'ok', txt: 'Iniciar elaboração', cls: 'pri' }] });
  if (r0.id !== 'ok') return;
  try { await registrar('redia', { codigo: cod, coord: USUARIO.coord, iniciadaPor: USUARIO.posto }); atualizarEstado(); aviso(`${cod} iniciada. Bom trabalho!`, 'ok'); rerender(); }
  catch (e) { await tratarErroGravacao(e); }
}
const htmlIniciar = (contexto = '') => rediaIniciada() ? '' : `<div class="banner ini-redia" role="status"><b>A REDIA de ${ddmm(DIA)} ainda não foi iniciada.</b> ${DIA !== isoData(Relogio.agora()) ? 'Só é possível iniciar a REDIA no próprio dia.' : podeIniciarRedia() ? `Ao iniciar, ela recebe o código <b class="mono">${codigoRedia(CFG.uep, DIA)}</b> e todos passam a editar a mesma REDIA.${contexto}` : 'Um coordenador ou o GEPLAT inicia a elaboração.'} ${DIA === isoData(Relogio.agora()) && podeIniciarRedia() ? '<button class="btn sm pri" data-act="iniciar-redia">Iniciar elaboração</button>' : ''}</div>`;


/* ---------------- janela de confirmação (sem diálogos do navegador) ---------------- */
function modal({ titulo, html, botoes, largo = false, aoAbrir = null }) {
  return new Promise(res => {
    $('.mdl')?.remove();
    const el = document.createElement('div'); el.className = 'mdl'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'mdl-t');
    el.innerHTML = `<div class="mdl-c${largo ? ' lg' : ''}"><h2 id="mdl-t">${titulo}</h2>${html}<div class="row end mdl-b">${botoes.map(b => `<button class="btn ${b.cls || ''}" data-mdl="${b.id}">${b.txt}</button>`).join('')}</div></div>`;
    document.body.appendChild(el);
    const fechar = id => { UI.fecharModal = null; const extra = {}; el.querySelectorAll('[data-mdl-in]').forEach(i => extra[i.dataset.mdlIn] = i.type === 'checkbox' ? i.checked : i.value.trim()); el.remove(); document.removeEventListener('keydown', esc_); res({ id, ...extra }); };
    const esc_ = e => { if (e.key === 'Escape') fechar('cancelar'); };
    document.addEventListener('keydown', esc_);
    el.querySelectorAll('[data-mdl]').forEach(b => b.onclick = () => fechar(b.dataset.mdl));
    UI.fecharModal = () => fechar('cancelar');
    el.onclick = e => { if (e.target === el) fechar('cancelar'); };
    if (aoAbrir) aoAbrir(el);
    (el.querySelector('[data-mdl-in]:not([disabled])') || el.querySelector('.btn.pri') || el.querySelector('.btn'))?.focus();
  });
}

/* ---------------- congelar / descongelar a pauta ---------------- */
async function congelarPauta() {
  if (Store.remoto()) { try { await Store.sincronizar(); atualizarEstado(); } catch (e) { return aviso(e.message, 'erro'); } }
  if (congelada()) { aviso(`A pauta já foi congelada às ${hhmm(E.congelamento.criadoEm)} por ${E.congelamento.autor.nome}.`, 'info'); rerender(); return; }
  const falta = naoConcluidas(E);
  if (falta.length) {
    const linhas = falta.map(c => { const n = notificacoesAbertas(E, c); return `<tr><td><b>${c}</b><br><span class="note">${COORD_NOME[c]}</span></td><td>${pendentes(E, c).length ? `<span class="chip at">${pendentes(E, c).length} sugestão(ões) pendente(s)</span>` : '<span class="chip ne">Fila tratada</span>'}</td><td class="note">${n.length ? `Notificado às ${hhmm(n[n.length - 1].criadoEm)}` : 'Não notificado'}</td></tr>`; }).join('');
    const r = await modal({
      titulo: 'Preenchimento não concluído',
      html: `<p>${falta.length === 1 ? 'Esta coordenação ainda não sinalizou' : 'Estas coordenações ainda não sinalizaram'} a conclusão do preenchimento:</p>
        <div class="tbw"><table class="tb"><tbody>${linhas}</tbody></table></div>
        <p class="note">Congelar agora grava a versão oficial com o que já foi preenchido e bloqueia a curadoria. Notificar deixa um aviso na curadoria da coordenação e não congela.</p>`,
      botoes: [{ id: 'cancelar', txt: 'Cancelar' }, { id: 'notificar', txt: 'Notificar coordenador' + (falta.length > 1 ? 'es' : ''), cls: 'sec' }, { id: 'congelar', txt: 'Congelar mesmo assim', cls: 'pri' }],
    });
    if (r.id === 'notificar') {
      try { for (const c of falta) await registrar('notificacao', { coord: c, motivo: 'conclusao', mensagem: `O GEPLAT pede a conclusão do preenchimento da ${c} para congelar a pauta.` }); atualizarEstado(); aviso(`Notificação registrada para ${falta.join(', ')}. Ela aparece na curadoria de cada coordenação.`, 'ok'); rerender(); }
      catch (e) { await tratarErroGravacao(e); }
      return;
    }
    if (r.id !== 'congelar') return;
  }
  try {
    const snap = snapshotDe(E), s = JSON.stringify(snap), h = hash(s);
    await registrar('congelamento', { snapshot: snap, hash: h, semConclusao: falta });
    atualizarEstado(); aviso('Pauta congelada' + (falta.length ? ` (sem conclusão de ${falta.join(', ')}).` : '.'), 'ok'); rerender();
    // cópia da pauta congelada em arquivo (Storage); se falhar, o congelamento já está gravado na base
    try { await Store.gravarArquivo(DIA, 'pauta_congelada.json', JSON.stringify({ uep: CFG.uep, data: DIA, congeladoEm: Relogio.agora().toISOString(), por: USUARIO, hash: h, semConclusao: falta, pauta: snap }, null, 1), 'application/json'); }
    catch (e) { aviso('Pauta congelada, mas a cópia em arquivo falhou: ' + e.message, 'erro'); }
  } catch (e) { await tratarErroGravacao(e); }
}
async function descongelarPauta(motivo) {
  if (Store.remoto()) { try { await Store.sincronizar(); atualizarEstado(); } catch (e) { return aviso(e.message, 'erro'); } }
  if (!congelada()) { aviso('A pauta já está em edição.', 'info'); rerender(); return; }
  if (!motivo) {
    const r = await modal({ titulo: 'Descongelar a pauta', html: `<p>A curadoria volta a ficar aberta. A versão congelada às ${hhmm(E.congelamento.criadoEm)} continua registrada.</p><label class="lbl" for="mdl-mot">Motivo (obrigatório)</label><input id="mdl-mot" class="in" data-mdl-in="motivo" maxlength="120">`, botoes: [{ id: 'cancelar', txt: 'Cancelar' }, { id: 'ok', txt: 'Descongelar', cls: 'pri' }] });
    if (r.id !== 'ok') return;
    if (!r.motivo) return aviso('Informe o motivo para descongelar.', 'erro');
    motivo = r.motivo;
  }
  salvarE('reabertura', { motivo }, {}, 'Pauta descongelada para edição.');
}
async function alternarConclusao(coord) {
  const c = concluida(E, coord);
  if (!c) {
    const pend = pendentes(E, coord).length;
    if (pend) {
      const r = await modal({ titulo: `Concluir o preenchimento da ${coord}?`, html: `<p>Ainda há <b>${pend}</b> sugestão(ões) sem decisão na fila. Elas não entram na pauta.</p>`, botoes: [{ id: 'cancelar', txt: 'Voltar à fila' }, { id: 'ok', txt: 'Concluir mesmo assim', cls: 'pri' }] });
      if (r.id !== 'ok') return;
    }
    return salvarE('conclusao', { coord, concluido: true, pendentes: pend }, {}, `${coord}: preenchimento concluído.`);
  }
  salvarE('conclusao', { coord, concluido: false }, {}, `${coord}: preenchimento reaberto.`);
}

/* ======================= Acesso (login) ======================= */
let VIDEO_URL = null;
function videoIntro() {
  if (VIDEO_URL !== null) return VIDEO_URL;
  try {
    const el = document.getElementById('redia-video'); if (!el) return (VIDEO_URL = 'assets/intro.webm');   // versão web: arquivo servido
    const b = atob(el.textContent.trim()), u = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    VIDEO_URL = URL.createObjectURL(new Blob([u], { type: 'video/webm' }));
  } catch { VIDEO_URL = ''; }
  return VIDEO_URL;
}
function telaLogin() {
  pararLoginTimers();
  const poster = midiaUrl('poster', 'poster.jpg', 'image/jpeg');
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const v = reduz ? '' : videoIntro();
  const H = CFG.horarios, m = Relogio.minutos();
  const etapa = m < horaMin('06:00') ? 'Antes da passagem de turno' : m < horaMin(H.preenchimento) ? `Preenchimento até ${H.preenchimento}` : m < horaMin(H.congelamento) ? `Pré-REDIA até ${H.congelamento}` : m < horaMin(H.inicio) ? `REDIA às ${H.inicio}` : m < horaMin(H.fim) ? `REDIA em andamento até ${H.fim}` : 'Fechamento da ata';
  render(`<div class="login">
    <div class="lg-bg" style="background-image:url('${poster}')">
      ${v ? `<video class="lg-vid" src="${v}" autoplay muted loop playsinline preload="auto" aria-hidden="true" tabindex="-1"></video>` : ''}
    </div>
    <div class="lg-sh" aria-hidden="true"></div><div class="lg-fade" aria-hidden="true"></div>
    <main class="lg-main">
      <section class="lg-hero">
        <span class="kick lg-campo">Búzios</span>
        <h1>REDIA</h1>
        <p class="lg-sub">Reunião Diária bordo × base</p>
        <span class="dash"></span>
        <ol class="lg-fluxo" aria-label="Fluxo do sistema"><li>Coleta</li><li>Curadoria</li><li>Apresentação</li><li>Ata</li></ol>
      </section>
      <form class="lg-card" autocomplete="off" novalidate>
        <h2>Acesso ao sistema</h2>
        <label class="lbl" for="lg-chave">Chave</label>
        <input id="lg-chave" class="in lg-in" maxlength="4" spellcheck="false" autocapitalize="characters" value="${esc(LS.get('ultimaChave', ''))}" placeholder="ABC1" aria-describedby="lg-msg">
        <label class="lbl" for="lg-senha">Senha</label>
        <input id="lg-senha" class="in lg-in" type="password" maxlength="72" ${MODO_NUVEM ? 'autocomplete="current-password"' : 'inputmode="numeric"'} aria-describedby="lg-msg">
        <p id="lg-msg" class="lg-msg" role="alert"></p>
        <button class="btn pri lg-btn" type="submit">Entrar</button>
        <div class="lg-lks"><button class="lg-esq" type="button" data-act="esqueci">Esqueci a senha</button><button class="lg-esq lg-cad" type="button" data-act="cadastrar">Cadastrar-se</button></div>
        <p class="note">${MODO_NUVEM ? 'Senha pessoal cadastrada na base da REDIA. No primeiro acesso, troque a senha temporária. Não substitui o login corporativo.' : 'Demonstração: senha 1234. Chaves de teste por unidade (ex.: GP74, CP80, CM83; GP01 e CP01 na P-83) ou AD01 (administrador do sistema). Os registros ficam só neste navegador.'}</p>
      </form>
    </main>
    <footer class="lg-rod">
      <span><b data-lgclk>${hhmm(Relogio.agora())}</b> ${diaSemana(DIA)}, ${ddmmaaaa(DIA)}</span>
      <span class="lg-etapa">${esc(etapa)}</span>
      <span class="lg-dev">Desenvolvimento: Breno Martins e Fabricio Martini</span>
      <span class="lg-ver">v${esc(APP.versao)} · ${esc(APP.fase)}${MODO_NUVEM ? '' : ' · demonstração'}</span>
      <span class="selo">I · Interna</span>
    </footer>
  </div>`);
  const f = $('.lg-card'), ch = $('#lg-chave'), se = $('#lg-senha'), msg = $('#lg-msg');
  ch.oninput = () => { ch.value = ch.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); msg.textContent = ''; ch.classList.remove('err'); };
  se.oninput = () => { msg.textContent = ''; se.classList.remove('err'); };
  (ch.value ? se : ch).focus();
  const btn = $('.lg-btn');
  f.onsubmit = async e => {
    e.preventDefault();
    if (btn.disabled) return;
    btn.disabled = true; btn.textContent = 'Entrando…';
    let r;
    try { r = await entrar(ch.value, se.value); } catch (x) { r = { erro: x.message }; }
    if (r.erro) {
      btn.disabled = false; btn.textContent = 'Entrar';
      msg.textContent = r.erro; (/senha/i.test(r.erro) ? se : ch).classList.add('err'); f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); se.value = ''; se.focus(); return;
    }
    if (r.trocarSenha && !(await trocarSenhaObrigatoria())) { btn.disabled = false; btn.textContent = 'Entrar'; se.value = ''; return; }
    UI.avisoProto = true;   // D-71: aviso de protótipo no Início depois de cada login
    if (USUARIO.uep) {   // D-70: lotado numa só unidade → direto para ela; mais de uma (ou administrador) → tela de unidades
      try { await iniciarSessao(true); }
      catch (x) { btn.disabled = false; btn.textContent = 'Entrar'; msg.textContent = 'Não foi possível abrir a REDIA: ' + x.message; return; }
    }
    $('.login').classList.add('saindo');
    setTimeout(() => { pararLoginTimers(); aviso(`Bem-vindo, ${USUARIO.nome.split(' ')[0]} · ${USUARIO.posto}.`, 'ok'); const d = USUARIO.uep ? UI.destino || '#/inicio' : '#/unidades'; UI.destino = null; if (location.hash === d) rotear(); else location.hash = d; }, 450);
  };
  $('[data-act="esqueci"]').onclick = () => recuperarSenha(ch.value);
  $('[data-act="cadastrar"]').onclick = () => autocadastro();   // D-72
  const vid = $('.lg-vid');
  if (vid) {
    vid.play?.().catch(() => { });
    vid.addEventListener('timeupdate', () => { const fim = vid.duration && vid.currentTime > vid.duration - 0.7; $('.lg-fade')?.classList.toggle('on', !!fim); });
  }
  UI.lgClk = setInterval(() => { const c = $('[data-lgclk]'); if (c) c.textContent = hhmm(Relogio.agora()); else pararLoginTimers(); }, 1000);
}
/* D-56: "Esqueci a senha" · o pedido gera uma senha temporária enviada ao e-mail do administrador, que a repassa */
async function recuperarSenha(chave0 = '') {
  const r = await modal({
    titulo: 'Esqueci a senha',
    html: MODO_NUVEM ? `<p>Informe a sua chave. O sistema gera uma <b>nova senha temporária</b> e a envia ao <b>administrador da REDIA</b>, que a repassa a você. No próximo acesso, o app pede que você crie uma senha pessoal.</p>
      <p class="note">A senha atual deixa de valer quando a nova for enviada. Um pedido por chave a cada 15 minutos.</p>
      <label class="lbl" for="mdl-ch">Chave</label><input id="mdl-ch" class="in" data-mdl-in="chave" maxlength="4" autocapitalize="characters" spellcheck="false" value="${esc(chave0)}">`
      : '<p>No modo demonstração não há senha pessoal: entre com GP01, CP01, CE01 ou CM01 e a senha <b>1234</b>.</p>',
    botoes: MODO_NUVEM ? [{ id: 'cancelar', txt: 'Cancelar' }, { id: 'ok', txt: 'Pedir nova senha', cls: 'pri' }] : [{ id: 'cancelar', txt: 'Entendi', cls: 'pri' }],
  });
  if (r.id !== 'ok') return;
  const chave = String(r.chave || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!/^[A-Z0-9]{4}$/.test(chave)) return aviso('Informe a chave com 4 letras ou números.', 'erro');
  try { aviso(await Nuvem.recuperarSenha(chave), 'ok'); } catch (e) { aviso(e.message, 'erro'); }
}
function pararLoginTimers() { if (UI.lgClk) { clearInterval(UI.lgClk); UI.lgClk = null; } }

/* abre a sessão de trabalho: base da nuvem (ou demonstração), registros do dia e tempo real */
async function iniciarSessao(novoLogin) {
  await iniciarSessao0(novoLogin); Vivo.conectar();   // D-67
}
async function iniciarSessao0(novoLogin) {
  if (MODO_NUVEM) {
    if (novoLogin) { DIA = isoData(new Date()); LS.set('dia', DIA); }   // na nuvem, cada login abre a REDIA de hoje
    await Store.usarNuvem();
    await Store.carregar(DIA);
    await Layout.carregar(CFG.uep);   // D-73
    Nuvem.tempoReal(CFG.uep, sincronizarTela);
  } else {
    if (novoLogin) { DIA = isoData(Relogio.agora()); LS.set('dia', DIA); }   // D-68: sem calendário no Início, o login abre a REDIA de hoje
    await Store.usarMemoria();
    await Store.carregar(DIA);
    await Layout.carregar(CFG.uep);   // D-73
  }
  atualizarEstado();
}
/* registros novos de outros usuários (tempo real ou leitura periódica) */
async function sincronizarTela() {
  if (!Store.remoto() || UI.sincronizando) return;
  UI.sincronizando = true;
  try {
    const n = await Store.sincronizar();
    if (n === -1) aviso('A demonstração foi resetada pelo administrador: os registros foram apagados.', 'info');
    if (n) { atualizarEstado(); const ativo = document.activeElement; if (!$('.mdl') && (!ativo || !/INPUT|TEXTAREA|SELECT/.test(ativo.tagName))) rerender(); else aviso('Há registros novos de outros usuários. Eles aparecem ao salvar ou trocar de tela.'); }
    else { const c = $('.apph .armz'); if (c) c.innerHTML = textoArmaz(); }
  } catch (e) { Store.erros.push('sincronizar: ' + e.message); const c = $('.apph .armz'); if (c) c.innerHTML = '<b>Sem conexão com a base</b> · tentando de novo'; }
  finally { UI.sincronizando = false; }
}
/* troca de senha: obrigatória no primeiro acesso (senha temporária) e opcional pela tela Início */
async function trocarSenhaObrigatoria(opcional = false) {
  for (;;) {
    const r = await modal({
      titulo: opcional ? 'Alterar senha' : 'Troque a senha temporária',
      html: `<p>${opcional ? 'Escolha uma nova senha pessoal.' : 'Primeiro acesso: defina sua senha pessoal para continuar.'} Use ao menos 8 caracteres, com letras e números. Não use a chave.</p>
        <div class="banner erro senha-alerta" role="alert"><b>Não use a sua senha Petrobras.</b> Este é um ambiente de teste de um sistema em desenvolvimento (prova de conceito), fora dos sistemas corporativos: crie uma senha qualquer, diferente das senhas que você usa na empresa.</div>
        <label class="lbl" for="mdl-s1">Nova senha</label><input id="mdl-s1" class="in" type="password" autocomplete="new-password" maxlength="72" data-mdl-in="s1">
        <label class="lbl" for="mdl-s2">Repita a nova senha</label><input id="mdl-s2" class="in" type="password" autocomplete="new-password" maxlength="72" data-mdl-in="s2">`,
      botoes: [{ id: 'cancelar', txt: opcional ? 'Cancelar' : 'Sair' }, { id: 'ok', txt: 'Salvar senha', cls: 'pri' }],
    });
    if (r.id !== 'ok') { if (!opcional) { sair(); } return false; }
    const erro = r.s1 !== r.s2 ? 'As senhas não conferem.' : r.s1.length < 8 ? 'A senha precisa ter ao menos 8 caracteres.' : !/[A-Za-z]/.test(r.s1) || !/\d/.test(r.s1) ? 'Use letras e números.' : USUARIO && r.s1.toUpperCase().includes(USUARIO.chave) ? 'A senha não pode conter a chave.' : '';
    if (erro) { aviso(erro, 'erro'); continue; }
    try { if (MODO_NUVEM) await Nuvem.trocarSenha(r.s1); else await DiretorioDemo.trocarSenha(USUARIO.chave, r.s1); aviso('Senha alterada.', 'ok'); return true; }
    catch (e) { aviso(e.message, 'erro'); }
  }
}

/* ======================= Início ======================= */
/* D-71 · aviso de protótipo: aparece no Início depois de cada login */
async function avisoPrototipo() {
  await modal({ titulo: 'Protótipo em desenvolvimento', html: `<div class="proto"><span class="proto-ic" aria-hidden="true">${SH.info(40)}</span>
    <p>O sistema <b>REDIA Búzios</b> é um <b>protótipo em desenvolvimento</b>.</p>
    <p>Todas as informações e todos os valores apresentados são <b>fictícios</b>, gerados por modelos de inteligência artificial para preencher os campos e as informações necessários aos testes e ao desenvolvimento do sistema REDIA.</p>
    <p class="note">Não use estes dados para decisões operacionais.</p></div>`, botoes: [{ id: 'entendi', txt: 'Entendi', cls: 'pri' }] });
}
async function telaInicio() {
  if (UI.avisoProto) { UI.avisoProto = false; setTimeout(avisoPrototipo, 150); }
  const f = E ? fase() : null;
  const temDados = E && (Object.keys(E.valores).length || E.sugestoes.length);
  const nuvem = Store.remoto();
  const linhaCoord = c => {
    if (!E) return '';
    const pend = pendentes(E, c).length, apr = aprovados(E, c).length, atv = atividadesAbertura(E, c).length;
    const cc = concluida(E, c), nt = notificacoesAbertas(E, c).length;
    return `<tr><td><b>${c}</b><br><span class="note">${COORD_NOME[c]}</span></td><td>${cc ? `<span class="chip ok">Concluído ${hhmm(cc.criadoEm)}</span>` : `<span class="chip ne">Em curadoria</span>${nt ? '<br><span class="note">notificado</span>' : ''}`}</td><td>${pend ? `<span class="chip at">${pend} pendente${pend > 1 ? 's' : ''}</span>` : '<span class="chip ok">Fila tratada</span>'}</td><td>${apr}</td><td>${c === 'GEPLAT' ? '—' : atv + ' de ' + CFG.atividadesMax}</td><td><a class="btn sm sec" href="#/curadoria/${c}">Abrir</a></td></tr>`;
  };
  const ini = 6 * 60, fim = 10 * 60 + 30, pos = m => Math.max(0, Math.min(100, (m - ini) / (fim - ini) * 100));
  const H = CFG.horarios, seg = [['06:00', H.preenchimento, 'Preenchimento'], [H.preenchimento, H.congelamento, 'Pré-REDIA'], [H.congelamento, H.inicio, ''], [H.inicio, H.fim, 'REDIA'], [H.fim, '10:30', 'Ata']];
  /* D-67 · Início: sessão em barra no topo; REDIA do dia e situação das coordenações logo abaixo; funções só da versão de teste
     reunidas no canto inferior direito ("Funções da versão de teste"); administração (pedidos de senha) à esquerda. */
  const R = E?.redia, ata = E?.atas?.[0], hoje = DIA === isoData(Relogio.agora());
  const iniU = USUARIO.nome.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
  const stBase = nuvem ? `${Store.online ? '<span class="dot ok"></span>Base conectada' : '<span class="dot nok"></span><b>Sem conexão</b>'}<span class="note">${esc(Store.nomeRaiz || '')} · ${Store.online ? `sincronizado ${Store.ultimaLeitura ? hhmmss(Store.ultimaLeitura) : '—'}${Store.tempoReal ? ' · tempo real' : ''}` : 'as alterações não são gravadas até a rede voltar'}</span>` : Store.modo === 'memoria' ? '<span class="dot at"></span>Modo demonstração<span class="note">registros só neste navegador</span>' : 'Sem armazenamento';
  const testes = [];
  if (Store.modo && EXEMPLO_DISPONIVEL && podeAdministrar()) testes.push(`<div class="tf"><button class="btn sm pri" data-act="preencher" ${!R || congelada() || ata ? 'disabled' : ''}>Preencher a REDIA aberta (fictício)</button><span class="note">${!R ? 'Inicie a REDIA do dia para usar.' : ata ? 'REDIA encerrada.' : congelada() ? 'Pauta congelada: reabra para preencher.' : 'Gera valores fictícios para todos os campos vazios das 3 coordenações e do GEPLAT, aprova as sugestões pendentes e conclui o preenchimento. Não apaga o que já foi preenchido; marcado como fictício.'}</span></div>`);
  if (Store.modo && !temDados && podeAdministrar() && EXEMPLO_DISPONIVEL) testes.push(`<div class="tf"><button class="btn sm sec" data-act="exemplo">Carregar dados de exemplo</button><span class="note">Dia sem registros: carrega o exemplo completo (P-75, sem nomes de pessoas)${nuvem ? ', gravado na base marcado como exemplo' : ''}, com 15 dias de histórico.</span></div>`);
  if (Store.modo && EXEMPLO_DISPONIVEL && podeAdministrar()) testes.push(`<div class="tf"><button class="btn sm sec" data-act="historico15">Gerar histórico de 15 dias</button><span class="note">REDIAs de exemplo encerradas de ${ddmm(addDias(DIA, -15))} a ${ddmm(addDias(DIA, -1))}, para tendências, recorrência, visão semanal e Arquivo. Dias já tratados ficam como estão.</span></div>`);
  if (Store.modo && (!nuvem || USUARIO.admin || Relogio.simulado())) testes.push(`<div class="tf"><span class="row" style="gap:6px"><label class="lbl" for="sim" style="margin:0">Simular horário</label><input id="sim" type="time" class="in" style="width:auto" value="${hhmm(Relogio.agora())}"><button class="btn sm sec" data-act="simular">Aplicar</button>${Relogio.simulado() ? '<button class="btn sm" data-act="real">Voltar ao horário real</button>' : ''}</span><span class="note">Muda o relógio do app neste navegador para testar as fases do dia.</span></div>`);
  if (Store.modo) testes.push(`<div class="tf"><span class="row" style="gap:6px"><button class="btn sm sec" data-act="exportar">Exportar registros (JSON)</button>${!nuvem || podeAdministrar() ? `<label class="btn sm sec" for="imp">Importar registros</label><input id="imp" type="file" accept=".json" hidden>` : ''}</span><span class="note">Cópia e migração dos registros entre ambientes de teste.</span></div>`);
  if (Store.modo && (!nuvem || USUARIO.admin)) testes.push(`<div class="tf"><button class="btn sm perigo" data-act="resetar">Resetar demonstração</button><span class="note">Apaga os dados inseridos por usuários e testadores${nuvem ? ', para todos' : ' neste navegador'}.</span></div>`);
  render(cabecalhoApp({ id: 'inicio', titulo: 'Início' }) + `<div class="wrap ini">
    <section class="pn ses" aria-label="Sessão">
      <div class="ses-u"><span class="av" aria-hidden="true">${esc(iniU || '?')}</span><div><b class="ses-n">${esc(USUARIO.nome)}</b><span class="note">${esc(USUARIO.posto)} · ${esc(USUARIO.coord)} · chave <b>${esc(USUARIO.chave)}</b>${USUARIO.admin && nuvem ? ' · administrador' : ''}</span></div></div>
      <div class="ses-i"><span class="lbl">REDIA do dia</span>${R ? `<b class="mono">${esc(R.payload.codigo || codigoRedia(CFG.uep, DIA))}</b><span class="note">${ata ? 'encerrada · ata arquivada' : esc(f.nome)}</span>` : `<b>Não iniciada</b><span class="note">${ddmmaaaa(DIA)}</span>`}</div>
      <div class="ses-i"><span class="lbl">Armazenamento</span><span class="row-c">${stBase}</span></div>
      <div class="ses-a">${nuvem ? '<button class="btn sm sec" data-act="sincronizar">Sincronizar</button>' : ''}${nuvem && !USUARIO.compartilhado ? '<button class="btn sm sec" data-act="senha">Alterar senha</button>' : ''}<a class="btn sm" href="#/curadoria/${USUARIO.coord}">Abrir minha curadoria</a><a class="btn sm sec" href="#/sair">Sair</a></div>
    </section>
    ${Store.modo ? `<div class="grid2 g-dia">
      <section class="pn"><h2>REDIA do dia</h2>
        ${R ? `<div class="redia-id"><span class="lbl">Código</span><b class="mono">${esc(R.payload.codigo || codigoRedia(CFG.uep, DIA))}</b><span class="note">iniciada por ${esc(R.autor?.nome || '—')} às ${hhmm(R.criadoEm)}${ata ? ` · ata fechada às ${hhmm(ata.criadoEm)}` : ''}</span></div>` : htmlIniciar()}
        <div class="row"><b>${diaSemana(DIA)}, ${ddmmaaaa(DIA)}</b>
          <span class="chip ${ata ? 'ok' : f.id === 'congelada' || f.id === 'reuniao' ? 'ok' : f.id === 'congelar' ? 'at' : 'ne'}">${ata ? 'Encerrada' : esc(f.nome)}</span>${!hoje ? '<span class="note">dia anterior · só consulta</span>' : ''}</div>
        <div class="tl" role="img" aria-label="Linha do tempo do dia: agora ${hhmm(Relogio.agora())}">${seg.map(([a, b, n], i) => `<span class="sg s${i}" style="left:${pos(horaMin(a))}%;width:${pos(horaMin(b)) - pos(horaMin(a))}%">${n}</span>`).join('')}<i class="now" style="left:${pos(Relogio.minutos())}%"></i></div>
        <p class="note">06:00 passagem de turno · até ${H.preenchimento} preenchimento · ${H.preenchimento}–${H.congelamento} pré-REDIA · ${H.congelamento} congelamento · ${H.inicio}–${H.fim} REDIA · depois, de acordo e ata.</p>
        <div class="pauta-st${congelada() ? ' ok' : ''}">
          <div><b>${ata ? 'Ata fechada e arquivada' : congelada() ? 'Pauta congelada' : 'Pauta em edição'}</b><span class="note">${congelada() ? `às ${hhmm(E.congelamento.criadoEm)} por ${esc(E.congelamento.autor.nome)} · integridade ${esc(E.congelamento.payload.hash)}` : `${COORDS.length - naoConcluidas(E).length} de ${COORDS.length} coordenações concluíram o preenchimento${naoConcluidas(E).length ? ' · falta: ' + naoConcluidas(E).join(', ') : ''}`}</span></div>
          ${ata ? '' : congelada() ? '<button class="btn sec" data-act="descongelar">Descongelar pauta</button>' : `<button class="btn pri" data-act="congelar-ini" ${R ? '' : 'disabled'}>Congelar pauta</button>`}
        </div>
      </section>
      <section class="pn"><h2>Situação das coordenações</h2>
        <div class="tbw"><table class="tb"><thead><tr><th>Coordenação</th><th>Preenchimento</th><th>Sugestões</th><th>Destaques</th><th>Na abertura</th><th></th></tr></thead><tbody>${COORDS.map(linhaCoord).join('')}</tbody></table></div>
        <div class="row" style="margin-top:12px"><a class="btn pri" href="#/apresentacao/1">Abrir a apresentação</a>${botaoVivo('btn')}<a class="btn sec" href="#/ata">Fechamento e ata</a></div>
      </section>
    </div>` : ''}
    <div class="g-fim">
      ${nuvem && USUARIO.admin ? '<section class="pn adm"><h2>Administração</h2><div class="pdsenha" data-pedidos-senha><b>Pedidos de nova senha</b><p class="note">Carregando…</p></div></section>' : '<span></span>'}
      ${testes.length ? `<section class="pn tst" aria-label="Funções da versão de teste"><h2>Funções da versão de teste</h2><p class="note">Só para a fase de testes do sistema: saem da versão de operação.</p>${testes.join('')}</section>` : ''}
    </div>
  </div>`);
  const on = (a, fn) => { const b = $(`[data-act="${a}"]`); if (b) b.onclick = fn; };
  on('congelar-ini', congelarPauta);
  on('sincronizar', async () => { await sincronizarTela(); rerender(); });
  on('senha', () => trocarSenhaObrigatoria(true));
  on('resetar', resetarDemonstracao);
  on('historico15', async e => {   // D-65
    const r0 = await modal({ titulo: 'Gerar histórico de 15 dias?', html: `<p>Grava REDIAs de exemplo encerradas de ${ddmm(addDias(DIA, -15))} a ${ddmm(addDias(DIA, -1))} ${Store.remoto() ? '<b>na base de dados, visíveis para todos</b>' : 'neste navegador'}, marcadas como exemplo. Dias que já têm pauta congelada ou ata ficam como estão.</p><p class="note">Para apagar depois, use Resetar demonstração.</p>`, botoes: [{ id: 'cancelar', txt: 'Cancelar' }, { id: 'ok', txt: 'Gerar histórico', cls: 'pri' }] });
    if (r0.id !== 'ok') return;
    e.target.disabled = true;
    try { const r = await gravarHistorico(DIA, 15); if (Store.remoto()) await Store.carregar(DIA); atualizarEstado(); aviso(r.n ? `Histórico gravado: ${r.dias} dia(s), ${r.n} registros${r.pulados ? ` · ${r.pulados} dia(s) já encerrados foram mantidos` : ''}.` : 'Nada a gravar: os 15 dias anteriores já têm REDIA encerrada.', 'ok'); }
    catch (x) { aviso('Não foi possível gravar o histórico: ' + x.message, 'erro'); }
    rerender();
  });
  const ps = $('[data-pedidos-senha]');   // D-56: conferência dos pedidos de "Esqueci a senha" (só administrador)
  if (ps) Nuvem.pedidosSenha(CFG.uep).then(l => { if (!ps.isConnected) return; const SIT = { enviada: ['ok', 'senha enviada ao seu e-mail'], falha: ['nok', 'falha no envio'], ignorado: ['ne', 'ignorado (repetido)'] };
    ps.innerHTML = `<b>Pedidos de nova senha</b>${l.length ? `<table class="tb"><tbody>${l.slice(0, 6).map(p => `<tr><td><b>${esc(p.chave)}</b></td><td>${ddmm(String(p.em).slice(0, 10))} ${hhmm(p.em)}</td><td><span class="chip ${(SIT[p.situacao] || SIT.ignorado)[0]}">${esc((SIT[p.situacao] || SIT.ignorado)[1])}</span></td></tr>`).join('')}</tbody></table>` : '<p class="note">Nenhum pedido. A senha temporária pedida em “Esqueci a senha” chega ao e-mail do administrador.</p>'}`; });
  on('descongelar', () => descongelarPauta());
  on('simular', () => { Relogio.simular($('#sim').value); rerender(); });
  on('real', () => { Relogio.real(); rerender(); });
  on('preencher', async e => {   // D-67: versão de teste
    const r0 = await modal({ titulo: 'Preencher a REDIA aberta com dados fictícios?', html: `<p>Preenche ${Store.remoto() ? '<b>na base, para todos</b>,' : 'neste navegador'} os campos e listas vazios das coordenações e do GEPLAT, aprova as sugestões pendentes e conclui o preenchimento de todas as coordenações. O que já foi preenchido fica como está.</p><p class="note">Os registros ficam marcados como fictícios; para apagar, use Resetar demonstração.</p>`, botoes: [{ id: 'cancelar', txt: 'Cancelar' }, { id: 'ok', txt: 'Preencher', cls: 'pri' }] });
    if (r0.id !== 'ok') return;
    e.target.disabled = true;
    try { if (Store.remoto()) { await Store.sincronizar(); atualizarEstado(); } const r = await preencherFicticio(DIA, E); atualizarEstado(); aviso(r.n ? `REDIA preenchida: ${r.valores} valores, ${r.listas} listas, ${r.aprovadas} sugestões aprovadas e todas as coordenações concluídas.` : 'Nada a preencher: a REDIA já está completa.', 'ok'); }
    catch (x) { await tratarErroGravacao(x); }
    rerender();
  });
  on('exemplo', async e => { e.target.disabled = true; try { const n = await carregarExemplo(DIA); atualizarEstado(); aviso(`${n} registros de exemplo gravados.`, 'ok'); } catch (x) { aviso('Não foi possível gravar o exemplo: ' + x.message, 'erro'); } rerender(); });
  on('exportar', () => baixar(`REDIA_${CFG.uep}_registros_${DIA}.json`, Store.exportar()));
  const imp = $('#imp'); if (imp) imp.onchange = async () => { try { const r = await Store.importar(await imp.files[0].text()); imp.value = ''; if (r.data && r.data !== DIA) await abrirDia(r.data); atualizarEstado(); aviso(`${r.n} registros importados${r.tipo === 'pacote' ? ' do pacote de ' + ddmm(r.data) : ''}.`, 'ok'); rerender(); } catch (e) { aviso(e.message, 'erro'); } };
}

/* Reset da demonstração (D-52): recomeça os testes do zero, com aviso e confirmação digitada */
async function resetarDemonstracao() {
  const nuvem = Store.remoto();
  const r = await modal({
    titulo: 'Resetar a demonstração?',
    html: `<p>Este botão serve para recomeçar os testes do zero. Ele apaga <b>todos os registros da ${esc(CFG.uep)}</b> ${nuvem ? '<b>na base de dados, para todos os usuários</b>' : 'guardados neste navegador'}:</p>
      <ul class="alerta"><li>sugestões dos supervisores, aprovações e destaques de todas as curadorias;</li><li>dados automáticos, capturas e correções manuais, de todos os dias;</li><li>serviços, PFCEO, Canal Base x Bordo e demandas;</li><li>conclusões, notificações, congelamentos, transcrições e atas registradas.</li></ul>
      <p>Continuam como estão: ${nuvem ? 'usuários e senhas, perfis, configuração da UEP e os arquivos já enviados ao Storage' : 'a configuração da UEP e a sua sessão'}.</p>
      <p><b>Não dá para desfazer.</b> Para guardar uma cópia, cancele e use “Exportar registros (JSON)” antes.</p>
      <label class="lbl" for="mdl-conf">Para confirmar, digite RESETAR</label><input id="mdl-conf" class="in" data-mdl-in="conf" autocomplete="off" maxlength="10">`,
    botoes: [{ id: 'cancelar', txt: 'Cancelar' }, { id: 'ok', txt: 'Apagar tudo e resetar', cls: 'perigo' }],
  });
  if (r.id !== 'ok') return;
  if ((r.conf || '').toUpperCase() !== 'RESETAR') return aviso('Reset cancelado: digite RESETAR para confirmar.', 'erro');
  try {
    const n = await Store.resetar();
    UI.captura = {}; UI.sel = {}; UI.det = {};
    atualizarEstado(); aviso(`Demonstração resetada: ${n} registro(s) apagado(s).`, 'ok'); rerender();
  } catch (e) { aviso('Não foi possível resetar: ' + e.message, 'erro'); }
}
async function abrirDia(iso) {
  DIA = iso; LS.set('dia', DIA);
  await Store.carregar(DIA); atualizarEstado(); rerender();
}

/* ======================= Curadoria ======================= */
const CATEGORIAS = ['Falha / degradação', 'Operação', 'Segurança', 'Saúde', 'Meio ambiente', 'Integridade', 'Logística', 'Outro'];
const STATUS_EQ = ['Indisponível', 'Limitado', 'Atenção', 'Em manutenção', 'Disponível', 'Normalizado'];
const IMPACTOS = ['Produção', 'Queima', 'Injeção', 'Escoamento', 'Integridade', 'Segurança', 'Saúde', 'Habitabilidade', 'Utilidades', 'Meio ambiente', 'Logística', 'Sem impacto'];
function telaCuradoria(m) {
  const coord = m[1], aba = m[2] || 'dados';
  const pend = pendentes(E, coord).length, ap = destaquesDe(E, coord).length, nDA = destaquesAbertura(E, coord).length;
  const nAb = atividadesAbertura(E, coord).length;
  const nav = (id, t, n) => `<a href="#/curadoria/${coord}/${id}" class="${aba === id ? 'on' : ''}">${t}${n !== undefined ? `<span class="n">${n}</span>` : ''}</a>`;
  const outras = COORDS.filter(c => c !== coord).map(c => `<a href="#/curadoria/${c}/${aba}">${c}</a>`).join('');
  const fontes = [...Object.values(E.valores), ...Object.values(E.listas)].filter(v => v.origem === 'A').reduce((acc, v) => { const f = (v.fonte || '').split(' ')[0]; if (f && (!acc[f] || acc[f] < v.em)) acc[f] = v.em; return acc; }, {});
  const lado = `<nav class="side" aria-label="Seções da curadoria">
      ${nav('dados', 'Dados automáticos')}${nav('sugestoes', 'Sugestões', pend)}${nav('destaques', 'Destaques da coordenação', ap)}${coord !== 'GEPLAT' ? nav('pfceo', 'Equipamentos e Sistemas · PFCEO', pfceoSelecao(E, coord).itens.length) : ''}${coord !== 'GEPLAT' ? nav('servicos', 'Serviços do dia', nAb + ' de ' + CFG.atividadesMax) : ''}${nav('itens', coord === 'GEPLAT' ? 'Pauta extra' : 'Ameaças e oportunidades')}${nav('demandas', 'Canal Base x Bordo', E.demandas.filter(d => d.payload.coord === coord && d.payload.status !== 'encerrada').length)}${coord === 'GEPLAT' ? nav('aceite', 'Aceite da pauta') : ''}
      <h4>Preenchimento manual</h4>${(MANUAIS[coord] || []).map(([id, rot]) => nav(id, rot)).join('')}
      <div class="concl${concluida(E, coord) ? ' ok' : ''}">${concluida(E, coord) ? `<b>Preenchimento concluído</b><span class="note">às ${hhmm(concluida(E, coord).criadoEm)} por ${esc(concluida(E, coord).autor.nome)}</span><button class="btn sm" data-act="concluir" ${bloqueado() ? 'disabled' : ''}>Reabrir preenchimento</button>` : `<b>Preenchimento em andamento</b><span class="note">Sinalize ao GEPLAT quando os dados da ${coord} estiverem prontos.</span><button class="btn pri" data-act="concluir" ${bloqueado() ? 'disabled' : ''}>Concluir preenchimento</button>`}</div>
      <h4>Outras coordenações</h4>${outras}
      <h4>Captura automática</h4><div class="cap">${Object.entries(fontes).map(([f, t]) => `${esc(f)} · ${hhmm(t)}`).join('<br>') || 'Nenhuma captura registrada'}</div>
      <h4>Bloco ${coord} na pauta</h4><div class="cap"><b style="font-size:24px;color:#000">${Math.min(ap, CFG.destaquesPorBloco)}</b> de ${CFG.destaquesPorBloco} destaques no bloco${coord === 'GEPLAT' ? ' (abertura)' : ` · <b>${nDA}</b> na abertura`}.${bloqueado() ? '<br><b>Pauta congelada:</b> alterações bloqueadas.' : ` O GEPLAT pode devolver ou vetar até ${CFG.horarios.congelamento}.`}</div>
    </nav>`;
  const man = (MANUAIS[coord] || []).find(x => x[0] === aba);
  const corpo = man ? (c => abaDados(c, man)) : { sugestoes: abaSugestoes, destaques: abaDestaques, pfceo: abaPfceo, dados: abaDados, servicos: abaServicos, itens: abaItens, demandas: abaDemandas, aceite: abaAceite }[aba] || abaDados;
  const r = corpo(coord);
  const nts = notificacoesAbertas(E, coord), cc = concluida(E, coord);
  const aviso_ = ataFechada() ? `<div class="banner ok"><b>${esc(E.atas[0].payload.codigo || 'REDIA')} encerrada:</b> ata fechada às ${hhmm(E.atas[0].criadoEm)} e arquivada. Os dados ficam só para consulta.</div>` : !rediaIniciada() ? htmlIniciar() : nts.length ? `<div class="banner nt"><b>Notificação do GEPLAT · ${hhmm(nts[nts.length - 1].criadoEm)}</b> ${esc(nts[nts.length - 1].payload.mensagem)} <button class="btn sm pri" data-act="concluir2">Concluir preenchimento</button></div>` : cc && !bloqueado() ? `<div class="banner ok">Preenchimento da ${coord} concluído às ${hhmm(cc.criadoEm)}. Alterações continuam possíveis até o congelamento.</div>` : '';
  // telas estreitas (tablet em pé, smartphone): seletor de coordenação + abas roláveis no topo e barra de conclusão fixa embaixo
  const abas = [['dados', 'Dados'], ['sugestoes', 'Sugestões', pend], ['destaques', 'Destaques', ap], ...(coord !== 'GEPLAT' ? [['pfceo', 'PFCEO'], ['servicos', 'Serviços']] : []), ['itens', coord === 'GEPLAT' ? 'Pauta extra' : 'Ameaças'], ['demandas', 'Canal'], ...(coord === 'GEPLAT' ? [['aceite', 'Aceite']] : []), ...(MANUAIS[coord] || []).map(([id, rot]) => [id, rot])];
  const mtop = `<div class="mtop">
      <label class="msel"><span class="lbl">Coordenação</span><select id="m-coord" class="in">${COORDS.map(c => `<option value="${c}" ${c === coord ? 'selected' : ''}>${c} · ${COORD_NOME[c]}</option>`).join('')}</select></label>
      <nav class="mtabs" aria-label="Seções da curadoria">${abas.map(([id, t, n]) => `<a href="#/curadoria/${coord}/${id}" class="${aba === id ? 'on' : ''}">${t}${n ? `<span class="n">${n}</span>` : ''}</a>`).join('')}</nav>
    </div>`;
  const mbar = `<div class="mbar${cc ? ' ok' : ''}"><span><b>${cc ? 'Concluído' : 'Em andamento'}</b><span class="note">${cc ? 'às ' + hhmm(cc.criadoEm) : pend ? pend + ' sugestão(ões) pendente(s)' : 'fila tratada'}</span></span><button class="btn ${cc ? '' : 'pri'}" data-act="concluir-m" ${bloqueado() ? 'disabled' : ''}>${cc ? 'Reabrir' : 'Concluir preenchimento'}</button></div>`;
  const det = aba === 'sugestoes' && UI.det?.[coord] ? ' m-det' : ' m-lista';
  render(cabecalhoApp({ id: 'curadoria', titulo: `Curadoria · ${coord}` }) + `<div class="cur${r.dois ? ' dois' : ''}${det}">${lado}${mtop}${aviso_ ? `<div class="cur-aviso">${aviso_}</div>` : ''}${r.html}${mbar}</div>`);
  r.bind && r.bind();
  [$('[data-act="concluir"]'), $('[data-act="concluir2"]'), $('[data-act="concluir-m"]')].forEach(b => { if (b) b.onclick = () => alternarConclusao(coord); });
  $('#m-coord').onchange = e => { location.hash = `#/curadoria/${e.target.value}/${aba}`; };
  const t = $('.mtabs a.on'); if (t) t.scrollIntoView({ block: 'nearest', inline: 'center' });
}

function abaSugestoes(coord) {
  const lista = E.sugestoes.filter(s => s.payload.coord === coord);
  const grupos = [['06:00', 'Passagem das 06:00 · hoje', 'Turno noturno'], ['18:00', 'Passagem das 18:00 · ontem', 'Turno diurno']];
  const estado = s => !s.decisao || s.decisao.payload.acao === 'reabrir' ? (s.payload.somenteLeitura ? '<span class="chip ne">Info</span>' : '') : { aprovar: s.decisao.payload.abertura && coord !== 'GEPLAT' ? '<span class="chip ok">Aprovado</span><span class="chip ab">Abertura</span>' : '<span class="chip ok">Aprovado</span>', recusar: '<span class="chip sd">Recusado</span>', adiar: '<span class="chip ne">Adiado</span>', mesclar: '<span class="chip ne">Mesclado</span>' }[s.decisao.payload.acao] || '';
  const prio = p => ({ alta: '<span class="chip la">Alta</span>', media: '<span class="chip at">Média</span>', info: '<span class="chip ne">Info</span>' }[p] || '');
  let sel = lista.find(s => s.id === UI.sel[coord]) || lista.find(s => !s.decisao && !s.payload.somenteLeitura) || lista[0];
  if (sel) UI.sel[coord] = sel.id;
  const filaHtml = grupos.map(([h, t, sub]) => {
    const it = lista.filter(s => s.payload.passagem === h);
    return `<div class="lh">${t}<span>${sub}</span></div>` + (it.map(s => `<button type="button" class="it${sel && s.id === sel.id ? ' on' : ''}" data-sel="${s.id}">
      <span class="m">${prio(s.payload.prioridade)}<span>${esc(s.payload.origem || '')}</span>${s.payload.abertoDias ? `<span class="chip ne">Aberto há ${s.payload.abertoDias} dias</span>` : ''}${recorrenteDe(E, s.payload.tag) ? `<span class="chip rec" title="${esc(recorrenteDe(E, s.payload.tag).rot)} em ${recorrenteDe(E, s.payload.tag).n} REDIAs nos últimos ${(CFG.recorrencia || {}).dias || 30} dias">Recorrente ×${recorrenteDe(E, s.payload.tag).n}</span>` : ''}${estado(s)}</span>
      <span class="t">${esc(s.decisao?.payload.titulo || s.payload.titulo)}</span><span class="m">${esc(s.payload.tag || '')}${(E.comentarios[s.id] || []).length ? ` · ${E.comentarios[s.id].length} comentário(s) da base` : ''}</span></button>`).join('') || '<div class="it" style="cursor:default"><span class="note">Nenhum item nesta passagem.</span></div>');
  }).join('');
  const fila = `<section class="fila" aria-label="Fila de sugestões"><div class="row" style="padding:14px 16px 10px;justify-content:space-between"><b style="font-size:17px">Fila</b><span class="note">duas passagens · por urgência</span></div>${filaHtml}
    <div class="row" style="padding:12px 16px;border-top:1px solid var(--claro);justify-content:space-between"><span class="note">Aprovados: ${aprovados(E, coord).length} · Recusados: ${lista.filter(s => s.decisao?.payload.acao === 'recusar').length}</span><button class="btn sm sec" data-act="nova" ${bloqueado() ? 'disabled' : ''}>Simular sugestão</button></div></section>`;
  if (!sel) return { html: fila + `<section class="ed"><div class="banner">Nenhuma sugestão na fila desta coordenação.</div>${formNovaSugestao(coord)}</section>`, bind: () => bindSugestoes(coord, null) };
  const p = sel.payload, d = sel.decisao?.payload.acao && sel.decisao.payload.acao !== 'reabrir' ? sel.decisao.payload : null;
  const v = d && d.acao === 'aprovar' ? d : p, dis = (bloqueado() || p.somenteLeitura || (d && d.acao !== 'aprovar')) ? 'disabled' : '';
  const sem = d?.semaforo || (semDeStatus(p.status) === 'sd' ? 'at' : semDeStatus(p.status));
  const opt = (arr, val) => arr.map(o => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('');
  const coms = E.comentarios[sel.id] || [];
  const outrosAprov = aprovados(E, coord).filter(s => s.id !== sel.id);
  const ed = `<section class="ed" aria-label="Editor do item">
    <button type="button" class="btn mback" data-act="voltar-fila">‹ Fila${pendentes(E, coord).length ? ` · ${pendentes(E, coord).length} pendente(s)` : ''}</button>
    <div class="row">${prio(p.prioridade)}<span class="tg0">PS</span><span class="note">Passagem de turno ${esc(p.origem || '')} · ${p.dataPassagem ? ddmm(p.dataPassagem) : ''} ${esc(p.passagem)} · turno ${esc(p.turno)}</span><span style="flex:1"></span>${estado(sel)}</div>
    ${d ? `<div class="banner ok">Decisão: <b>${esc({ aprovar: 'aprovado', recusar: 'recusado', adiar: 'adiado', mesclar: 'mesclado' }[d.acao])}</b> por ${esc(sel.decisao.autor.nome)} às ${hhmm(sel.decisao.criadoEm)}${d.motivo ? ' · motivo: ' + esc(d.motivo) : ''}. ${!bloqueado() ? '<button class="btn sm sec" data-act="reabrir">Reabrir decisão</button>' : ''}</div>` : ''}
    <div class="grid2" style="gap:14px">
      <div><p class="gh2">Texto original do supervisor</p><div class="orig-box">${esc(p.textoOriginal || '')}</div>
        <p class="gh2" style="margin-top:12px">Comentários da base</p><div class="orig-box">${coms.map(c => `<p style="margin:0 0 6px"><b>${esc(c.autor.papel || c.autor.nome)}:</b> ${esc(c.payload.texto)} <span class="note">${hhmm(c.criadoEm)}</span></p>`).join('') || '<span class="note">Nenhum comentário.</span>'}
          <label class="lbl" for="com">Novo comentário</label><textarea id="com" class="in" rows="2" ${bloqueado() ? 'disabled' : ''}></textarea><div class="row end" style="margin-top:6px"><button class="btn sm sec" data-act="comentar" ${bloqueado() ? 'disabled' : ''}>Comentar</button></div></div></div>
      <div class="col">
        <p class="gh2"><label for="f-tit">Título na apresentação · <span data-cont>${(v.titulo || '').length}</span> de 80 caracteres</label></p>
        <div class="grp"><textarea id="f-tit" class="in" rows="2" maxlength="80" ${dis}>${esc(v.titulo || '')}</textarea></div>
        <div class="fgrid" style="margin-top:8px">
          <div><label class="lbl" for="f-cat">Categoria</label><select id="f-cat" class="in" ${dis}>${opt(CATEGORIAS, v.categoria)}</select></div>
          <div><label class="lbl" for="f-tag">Sistema / TAG</label><input id="f-tag" class="in" value="${esc(v.tag || '')}" ${dis}></div>
          <div><label class="lbl" for="f-st">Status do equipamento</label><select id="f-st" class="in" ${dis}>${opt(STATUS_EQ, v.status)}</select></div>
          <div><label class="lbl" for="f-imp">Impacto</label><select id="f-imp" class="in" ${dis}>${opt(IMPACTOS, v.impacto)}</select></div>
        </div>
        <fieldset style="border:0;margin:10px 0 0;padding:0"><legend class="gh2" style="padding:0">Semáforo na apresentação</legend>
          <div class="seg">${['ok', 'at', 'nok'].map(s => `<label><input type="radio" name="f-sem" value="${s}" ${s === sem ? 'checked' : ''} ${dis}>${glyph(s, 14)}${SEM_NOME[s]}</label>`).join('')}</div></fieldset>
        <label class="lbl" for="f-ped">Pedido à base</label><textarea id="f-ped" class="in" rows="2" ${dis}>${esc(v.pedido || '')}</textarea>
        ${chkAbertura(coord, !!(d && d.abertura), dis)}${chkEscalar(!!(d && d.escalar), dis)}
      </div>
    </div>
    ${!p.somenteLeitura && !bloqueado() && !d ? `<div class="row" style="padding-top:8px;border-top:1px solid #fff">
      <button class="btn sec" data-act="recusar">Recusar</button><input id="f-mot" class="in" style="width:240px" placeholder="Motivo da recusa">
      <span style="flex:1"></span><button class="btn" data-act="adiar">Adiar</button>
      <select id="f-merge" class="in" style="width:220px" ${outrosAprov.length ? '' : 'disabled'}><option value="">Mesclar com…</option>${outrosAprov.map(s => `<option value="${s.id}">${esc(s.decisao.payload.titulo)}</option>`).join('')}</select><button class="btn" data-act="mesclar" ${outrosAprov.length ? '' : 'disabled'}>Mesclar</button>
      <button class="btn pri" data-act="aprovar">Aprovar e incluir na pauta</button></div>` : ''}
    ${d && d.acao === 'aprovar' && !bloqueado() ? '<div class="row end"><button class="btn pri" data-act="salvar-ed">Salvar alterações do destaque</button></div>' : ''}
    <p class="note">Aprovado, o item entra na apresentação ${coord === 'GEPLAT' ? 'da abertura' : 'do bloco ' + coord}. O supervisor vê apenas “aprovado” ou “recusado” na próxima passagem. O texto original fica preservado.</p>
    ${formNovaSugestao(coord)}
  </section>`;
  return { html: fila + ed, bind: () => bindSugestoes(coord, sel) };
}
function chkAbertura(coord, marcado, dis = '') {
  if (coord === 'GEPLAT') return '<p class="note" style="margin-top:10px">Destaques do GEPLAT são apresentados na tela de abertura.</p>';
  return `<label class="chk-ab"><input type="checkbox" id="f-ab" ${marcado ? 'checked' : ''} ${dis}><span><b>Muito importante · apresentar na abertura</b><span class="note">O GEPLAT apresenta o item na tela de abertura, além do bloco ${coord}. Recomendado: até ${CFG.destaquesAberturaMax} por coordenação.</span></span></label>`;
}
/* D-61 (proposta 7): item que precisa de decisão do GEOP ou da gerência leva o selo "Escalar" e vai para o topo nos primeiros minutos */
const chkEscalar = (marcado, dis = '', id = 'f-esc') => `<label class="chk-ab esc"><input type="checkbox" id="${id}" ${marcado ? 'checked' : ''} ${dis}><span><b>Escalar · precisa de decisão do GEOP ou da gerência</b><span class="note">O item ganha o selo “Escalar”, sobe para o topo do bloco e da abertura e aparece no Fechamento como pendente de decisão.</span></span></label>`;

/* ---- destaques criados pelo coordenador (além das sugestões dos supervisores) ---- */
function abaDestaques(coord) {
  const ds = destaquesDe(E, coord), dis = bloqueado() ? 'disabled' : '';
  const own = ds.filter(d => d.fonte === 'C'), edit = own.find(d => d.id === UI.edDst);
  const nAb = destaquesAbertura(E, coord).length, geplat = coord === 'GEPLAT';
  const opt = (arr, val) => arr.map(o => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('');
  const v = edit || { titulo: '', tag: '', status: 'Atenção', semaforo: 'at', impacto: 'Produção', pedido: '', abertura: false, escalar: false, ref: { payload: { categoria: 'Operação' } } };
  const linha = d => `<tr${edit && d.id === edit.id ? ' class="sel"' : ''}><td>${semChip(d.semaforo)}</td><td>${d.escalar ? '<span class="chip esc">Escalar</span> ' : ''}<b>${esc(d.titulo)}</b><br><span class="note">${esc(d.tag)}${d.tag ? ' · ' : ''}${esc(d.status || '')}${d.pedido ? ' · pedido à base: ' + esc(d.pedido) : ''}</span></td>
    <td><span class="tg0">${d.fonte}</span> <span class="note">${d.fonte === 'PS' ? esc(d.ref.payload.origem || '') + ' · ' + esc(d.meta) : 'coordenação'}</span></td>
    <td>${geplat ? '<span class="chip ab">Abertura</span>' : `<label class="sw"><input type="checkbox" data-ab="${d.id}" ${d.abertura ? 'checked' : ''} ${dis}><span>Abertura</span></label>`}</td>
    <td class="note">${esc(d.por?.nome || '')} · ${hhmm(d.em)}</td>
    <td class="nw">${d.fonte === 'C' ? `<button class="btn sm lnk" data-edt="${d.id}" ${dis}>Editar</button><button class="btn sm lnk" data-rmd="${d.id}" ${dis}>Remover</button>` : `<a class="btn sm lnk" href="#/curadoria/${coord}/sugestoes" data-vsug="${d.id}">Ver sugestão</a>`}</td></tr>`;
  const html = `<section class="ed" style="grid-column:2 / -1">
    ${bloqueado() ? '<div class="banner">Pauta congelada: os destaques estão bloqueados para edição.</div>' : ''}
    <div class="pn"><h2>Destaques do ${geplat ? 'GEPLAT (tela de abertura)' : 'bloco ' + coord}</h2>
      <p class="note">${geplat ? 'Itens aprovados das sugestões e itens criados aqui aparecem na tela de abertura.' : `Sugestões aprovadas (PS) e itens criados pela coordenação (C) formam o bloco ${coord}. Marque “Abertura” nos muito importantes: o GEPLAT os apresenta na tela de abertura. Na abertura: <b>${nAb}</b> (recomendado até ${CFG.destaquesAberturaMax}).`}</p>
      ${geplat ? '' : `<p class="note">Destaque não é ameaça: a linha <b>Ameaça</b> do card “Destaques e ameaças” da abertura vem da aba <a href="#/curadoria/${coord}/itens">Ameaças e oportunidades</a> (ou da caixa “Registrar também como ameaça” abaixo).</p>`}
      ${!geplat && nAb > CFG.destaquesAberturaMax ? `<div class="banner">${nAb} destaques marcados para a abertura. Na tela de abertura cabem ${CFG.destaquesAberturaMax} por coordenação; os demais ficam só no bloco ${coord}.</div>` : ''}
      <div class="tbw"><table class="tb"><thead><tr><th>Semáforo</th><th>Destaque</th><th>Origem</th><th>Abertura</th><th>Por</th><th></th></tr></thead><tbody>
      ${ds.map(linha).join('') || '<tr><td colspan="6" class="note">Nenhum destaque. Aprove sugestões dos supervisores ou crie um item abaixo.</td></tr>'}
      </tbody></table></div></div>
    <div class="pn" id="dst-form"><h2>${edit ? 'Editar destaque da coordenação' : 'Novo destaque da coordenação'}</h2>
      <p class="gh2"><label for="d-tit">Título na apresentação · <span data-cont>${v.titulo.length}</span> de 80 caracteres</label></p>
      <textarea id="d-tit" class="in" rows="2" maxlength="80" ${dis}>${esc(v.titulo)}</textarea>
      <div class="fgrid" style="margin-top:8px">
        <div><label class="lbl" for="d-cat">Categoria</label><select id="d-cat" class="in" ${dis}>${opt(CATEGORIAS, v.ref.payload.categoria)}</select></div>
        <div><label class="lbl" for="d-tag">Sistema / TAG</label><input id="d-tag" class="in" value="${esc(v.tag)}" ${dis}></div>
        <div><label class="lbl" for="d-st">Status do equipamento</label><select id="d-st" class="in" ${dis}>${opt(STATUS_EQ, v.status)}</select></div>
        <div><label class="lbl" for="d-imp">Impacto</label><select id="d-imp" class="in" ${dis}>${opt(IMPACTOS, v.impacto)}</select></div>
      </div>
      <fieldset style="border:0;margin:10px 0 0;padding:0"><legend class="gh2" style="padding:0">Semáforo na apresentação</legend>
        <div class="seg">${['ok', 'at', 'nok'].map(s => `<label><input type="radio" name="d-sem" value="${s}" ${s === v.semaforo ? 'checked' : ''} ${dis}>${glyph(s, 14)}${SEM_NOME[s]}</label>`).join('')}</div></fieldset>
      <label class="lbl" for="d-ped">Pedido à base</label><textarea id="d-ped" class="in" rows="2" ${dis}>${esc(v.pedido || '')}</textarea>
      ${chkAbertura(coord, v.abertura, dis).replace('id="f-ab"', 'id="d-ab"')}${chkEscalar(v.escalar, dis, 'd-esc')}
      ${!edit && !geplat ? `<label class="chk-ab am"><input type="checkbox" id="d-am" ${dis}><span><b>Registrar também como ameaça da ${coord}</b><span class="note">Cria a ameaça com o mesmo texto e semáforo: ela entra na linha “Ameaça” do card Destaques e ameaças da abertura e no bloco ${coord} (aba Ameaças e oportunidades).</span></span></label>` : ''}
      <div class="row end" style="margin-top:10px">${edit ? '<button class="btn" data-act="cancelar-dst">Cancelar</button>' : ''}<button class="btn pri" data-act="salvar-dst" ${dis}>${edit ? 'Salvar alterações' : 'Incluir na pauta'}</button></div>
    </div>
  </section>`;
  return {
    html, dois: true, bind: () => {
      const tit = $('#d-tit'); tit.oninput = () => { $('[data-cont]').textContent = tit.value.length; };
      $$('[data-ab]').forEach(b => b.onchange = () => alternarAbertura(coord, b.dataset.ab, b.checked));
      $$('[data-edt]').forEach(b => b.onclick = () => { UI.edDst = b.dataset.edt; rerender(); $('#dst-form')?.scrollIntoView({ behavior: 'smooth' }); });
      $$('[data-rmd]').forEach(b => b.onclick = () => { if (UI.edDst === b.dataset.rmd) UI.edDst = null; salvarE('remove', { alvo: b.dataset.rmd }, {}, 'Destaque removido.'); });
      $$('[data-vsug]').forEach(a => a.onclick = () => { UI.sel[coord] = a.dataset.vsug; });
      const can = $('[data-act="cancelar-dst"]'); if (can) can.onclick = () => { UI.edDst = null; rerender(); };
      $('[data-act="salvar-dst"]').onclick = () => {
        const c = { texto: tit.value.trim(), categoria: $('#d-cat').value, tag: $('#d-tag').value.trim(), status: $('#d-st').value, impacto: $('#d-imp').value, semaforo: ($('input[name="d-sem"]:checked') || {}).value || 'at', pedido: $('#d-ped').value.trim(), abertura: !!$('#d-ab')?.checked, escalar: !!$('#d-esc')?.checked };
        if (!c.texto) { aviso('Informe o título.', 'erro'); tit.focus(); return; }
        const dest = c.abertura ? `no bloco ${coord} e na tela de abertura` : geplat ? 'na tela de abertura' : `no bloco ${coord}`;
        if (edit) { UI.edDst = null; salvarE('atualiza', { alvo: edit.id, campos: c }, {}, `Destaque atualizado (${dest}).`); }
        else if ($('#d-am')?.checked) (async () => { try { if (!(await podeEditar('item'))) return; await registrar('item', { coord, tipo: 'destaque', ordem: own.length + 1, ...c }); await registrar('item', { coord, tipo: 'ameaca', texto: c.texto, detalhe: '', semaforo: c.semaforo === 'ok' ? 'at' : c.semaforo, ordem: itensDe(E, coord, 'ameaca').length + 1 }); atualizarEstado(); aviso(`Destaque incluído ${dest} e ameaça registrada (aparece em Destaques e ameaças da abertura).`, 'ok'); rerender(); } catch (e) { await tratarErroGravacao(e); } })();
        else salvarE('item', { coord, tipo: 'destaque', ordem: own.length + 1, ...c }, {}, `Destaque incluído ${dest}.`);
      };
    },
  };
}
function alternarAbertura(coord, id, valor) {
  const d = destaquesDe(E, coord).find(x => x.id === id); if (!d) return;
  const msg = valor ? 'Indicado para a tela de abertura.' : `Retirado da abertura; continua no bloco ${coord}.`;
  if (d.tipo === 'item') return salvarE('atualiza', { alvo: id, campos: { abertura: valor } }, {}, msg);
  const p = d.ref.decisao.payload;
  salvarE('decisao', { ...p, alvo: id, acao: 'aprovar', abertura: valor, exemplo: undefined }, {}, msg);
}

function formNovaSugestao(coord) {
  return `<details class="pn" id="nova-sug"><summary style="cursor:pointer;font-weight:700">Simular uma sugestão de supervisor (até a integração com a passagem de serviço)</summary>
    <div class="fgrid"><div><label class="lbl" for="n-pas">Passagem</label><select id="n-pas" class="in"><option>06:00</option><option>18:00</option></select></div>
      <div><label class="lbl" for="n-pri">Prioridade</label><select id="n-pri" class="in"><option value="alta">Alta</option><option value="media" selected>Média</option><option value="info">Info</option></select></div>
      <div><label class="lbl" for="n-tag">Sistema / TAG</label><input id="n-tag" class="in"></div></div>
    <label class="lbl" for="n-tit">Título</label><input id="n-tit" class="in" maxlength="80">
    <label class="lbl" for="n-txt">Texto do supervisor</label><textarea id="n-txt" class="in" rows="2"></textarea>
    <div class="row end" style="margin-top:8px"><button class="btn sec" data-act="criar-sug">Incluir na fila de ${coord}</button></div></details>`;
}
function bindSugestoes(coord, sel) {
  $$('[data-sel]').forEach(b => b.onclick = () => { UI.sel[coord] = b.dataset.sel; (UI.det ||= {})[coord] = true; rerender(); if (telaEstreita()) window.scrollTo(0, 0); });
  const vf = $('[data-act="voltar-fila"]'); if (vf) vf.onclick = () => { (UI.det ||= {})[coord] = false; rerender(); const it = $(`[data-sel="${UI.sel[coord]}"]`); if (it) it.scrollIntoView({ block: 'center' }); };
  const tit = $('#f-tit'); if (tit) tit.oninput = () => { $('[data-cont]').textContent = tit.value.length; };
  const campos = () => ({ titulo: $('#f-tit').value.trim(), categoria: $('#f-cat').value, tag: $('#f-tag').value.trim(), status: $('#f-st').value, impacto: $('#f-imp').value, semaforo: ($('input[name="f-sem"]:checked') || {}).value || 'at', pedido: $('#f-ped').value.trim(), abertura: !!$('#f-ab')?.checked, escalar: !!$('#f-esc')?.checked });
  const on = (a, fn) => { const b = $(`[data-act="${a}"]`); if (b) b.onclick = fn; };
  on('aprovar', () => { const c = campos(); if (!c.titulo) return aviso('Informe o título.', 'erro'); salvarE('decisao', { alvo: sel.id, acao: 'aprovar', ...c }, {}, c.abertura ? `Aprovado: entra no bloco ${coord} e na tela de abertura.` : coord === 'GEPLAT' ? 'Aprovado: entra na tela de abertura.' : `Aprovado: entra no bloco ${coord}.`); });
  on('salvar-ed', () => salvarE('decisao', { alvo: sel.id, acao: 'aprovar', ...campos() }, {}, 'Destaque atualizado.'));
  on('recusar', () => { const mot = $('#f-mot').value.trim(); if (!mot) { aviso('Informe o motivo da recusa.', 'erro'); $('#f-mot').focus(); return; } salvarE('decisao', { alvo: sel.id, acao: 'recusar', motivo: mot }, {}, 'Sugestão recusada.'); });
  on('adiar', () => salvarE('decisao', { alvo: sel.id, acao: 'adiar' }, {}, 'Sugestão adiada.'));
  on('mesclar', () => { const alvo = $('#f-merge').value; if (!alvo) return aviso('Escolha o destaque para mesclar.', 'erro'); salvarE('decisao', { alvo: sel.id, acao: 'mesclar', mesclarCom: alvo }, {}, 'Sugestão mesclada.'); });
  on('reabrir', () => salvarE('decisao', { alvo: sel.id, acao: 'reabrir' }, {}, 'Decisão reaberta.'));
  on('comentar', () => { const t = $('#com').value.trim(); if (!t) return; salvarE('comentario', { alvo: sel.id, texto: t }, {}, 'Comentário registrado.'); });
  on('nova', () => { const d = $('#nova-sug'); d.open = true; d.scrollIntoView({ behavior: 'smooth' }); $('#n-tit').focus(); });
  on('criar-sug', () => {
    const tit = $('#n-tit').value.trim(); if (!tit) return aviso('Informe o título.', 'erro');
    const pas = $('#n-pas').value;
    salvarE('sugestao', { coord, passagem: pas, turno: pas === '06:00' ? 'noturno' : 'diurno', dataPassagem: pas === '06:00' ? DIA : addDias(DIA, -1), prioridade: $('#n-pri').value, origem: 'Simulação', titulo: tit, textoOriginal: $('#n-txt').value.trim(), tag: $('#n-tag').value.trim(), categoria: 'Falha / degradação', status: 'Atenção', impacto: 'Produção', simulado: true }, {}, 'Sugestão incluída na fila.');
  });
}

/* ---- Equipamentos e Sistemas · PFCEO (D-42, D-54) ----
   Capturar dados importa o PFCEO; a lista de entrada vem do pior estado ao normal (operando ou parado).
   Com desvio = já aprovado para a tela PFCEO da coordenação; normal = fora, salvo se o coordenador incluir.
   Até 2 por coordenação vão para a abertura do GEPLAT. */
function abaPfceo(coord) {
  if (coord === 'GEPLAT') return abaDados(coord);
  const s = pfceoSelecao(E, coord), dis = bloqueado() ? 'disabled' : '', v = E.listas['pfceo.' + coord], max = CFG.pfceoMax || 6;
  const chave = coord + '|lista:pfceo.' + coord, abSet = new Set(s.abertura.map(PF.chave));
  const nDesv = s.todos.filter(PF.desvio).length, nNorm = s.todos.length - nDesv;
  const card = (i, pos) => { const sd = PF.semDisp(i.disponibilidade), k = PF.chave(i), desv = PF.desvio(i), tela = s.naTela(i), ab = abSet.has(k);
    const u = +i.unidades > 0 && i.disponiveis !== '' && i.disponiveis != null ? `${i.disponiveis}/${i.unidades} disponíveis` : '';
    return `<div class="pfk s-${sd}${tela ? ' tela' : ''}" data-pfk="${esc(k)}"><div class="row" style="justify-content:space-between;gap:8px"><span class="row" style="gap:8px"><span class="pfn">${pos}</span>${PF.seguranca(i) ? '<span class="chip ok" title="Sistema de segurança: sempre na primeira linha da tela (D-61)">Segurança</span>' : ''}<b>${esc(i.funcao)}</b></span><span class="row" style="gap:6px">${i.condicao ? `<span class="chip ${PF.semCond(i.condicao)}">${esc(i.condicao)}</span>` : ''}<span class="chip ${sd}">${esc(PF.curto(i.disponibilidade))}</span></span></div>
      <span class="note">${[i.tag, i.redundancia, u, i.condicao ? 'Condição ' + i.condicao : '', i.situacao === 'Desligado' ? 'Parado' : i.situacao === 'Ligado' ? 'Operando' : i.situacao].filter(Boolean).map(esc).join(' · ')}</span>
      ${i.nota ? `<span>${esc(i.nota)}</span>` : ''}${i.nm ? `<span class="note">NM ${esc(i.nm)}</span>` : ''}
      <div class="row pfa"><span class="tg0">${desv ? 'Com desvio' : 'Normal'}</span><span class="note">${PF.seguranca(i) ? 'Sistema de segurança: fica sempre na tela, no topo' : tela ? (desv ? `Aprovado para a tela da ${coord} (automático)` : `Incluído na tela da ${coord}`) : (desv ? 'Retirado da tela pelo coordenador' : 'Fora da tela da ' + coord)}</span><span style="flex:1"></span>
        <label class="row ab" style="gap:6px"><input type="checkbox" data-pfab="${esc(k)}" ${ab ? 'checked' : ''} ${dis}> Abertura do GEPLAT</label>
        ${PF.seguranca(i) ? '' : `<button class="btn sm ${tela ? '' : 'pri'}" data-pft="${esc(k)}" data-v="${tela ? 0 : 1}" ${dis}>${tela ? 'Retirar da tela' : 'Incluir na tela'}</button>`}</div></div>`; };
  const html = `<section class="ed" style="grid-column:2 / -1">
    ${bloqueado() ? '<div class="banner">Pauta congelada: a seleção está bloqueada.</div>' : ''}
    <div class="pn" data-lista-pf="pfceo.${coord}"><div class="pn-h"><h2>Equipamentos e Sistemas – PFCEO · ${coord}</h2><span class="note">Origem: PFCEO</span><span style="flex:1"></span><button class="btn sm pri" data-capturar="${esc(chave)}" ${dis}>Capturar dados</button></div>
      <div class="capt" data-capt="${esc(chave)}">${resultadoCaptura(chave)}</div>
      <p class="note">Status e disponibilidade das funções críticas importados do PFCEO. ${v ? `Dados: ${esc(v.fonte || '')} · ${v.origem} · ${hhmm(v.em)}.` : 'Sem dados do PFCEO: clique em Capturar dados.'}</p>
      <div class="pf-resumo">${[['Sistemas importados', s.todos.length], ['Com desvio', nDesv], ['Normais', nNorm], [`Na tela da ${coord}`, s.itens.length], ['Na abertura do GEPLAT', `${s.abertura.length}/${PF_ABERTURA_MAX}`]].map(([r, n]) => `<div><b>${n}</b><span class="note">${r}</span></div>`).join('')}</div>
      <p class="note">Os sistemas <b>com desvio</b> (indisponível, com restrição, condição crítica, atenção ou pré-atenção) já ficam aprovados para a tela PFCEO da ${coord}. Os <b>normais</b> (disponível e condição normal, operando ou parado) só entram se você incluir. Marque <b>Abertura do GEPLAT</b> nos que merecem mais destaque: até ${PF_ABERTURA_MAX} por coordenação.</p>
      ${s.reg ? `<p class="note">Última alteração da seleção: ${esc(s.reg.autor.nome)} às ${hhmm(s.reg.criadoEm)}.</p>` : ''}
      ${s.itens.length > max ? `<div class="banner">${s.itens.length} sistemas na tela. No card cabem cerca de ${max}; os demais aparecem no detalhe.</div>` : ''}
    </div>
    <div class="pn"><h3>Lista de entrada · do pior estado ao normal (${s.todos.length})</h3>${s.todos.map((i, n) => card(i, n + 1)).join('') || '<p class="note">Nenhum sistema importado.</p>'}</div>
    <details class="pn"><summary style="cursor:pointer;font-weight:700">Corrigir dados do PFCEO à mão (se a importação falhar)</summary>${editorLista(LISTA['pfceo.' + coord])}</details>
  </section>`;
  return {
    html, dois: true, bind: () => {
      const gravar = (sel, msg) => salvarE('selecao', { coord, campo: 'pfceo', fora: s.fora, extra: s.extra, abertura: s.ab, ...sel }, {}, msg);
      $$('[data-pft]').forEach(b => b.onclick = () => {
        const k = b.dataset.pft, i = s.todos.find(x => PF.chave(x) === k), entra = b.dataset.v === '1';
        if (PF.desvio(i)) gravar({ fora: entra ? s.fora.filter(x => x !== k) : [...s.fora, k] }, entra ? 'Sistema de volta à tela.' : 'Sistema retirado da tela.');
        else gravar({ extra: entra ? [...s.extra, k] : s.extra.filter(x => x !== k) }, entra ? 'Sistema incluído na tela.' : 'Sistema retirado da tela.');
      });
      $$('[data-pfab]').forEach(c => c.onchange = () => {
        const k = c.dataset.pfab, atuais = s.abertura.map(PF.chave);
        if (c.checked && atuais.length >= PF_ABERTURA_MAX) { c.checked = false; return aviso(`Máximo de ${PF_ABERTURA_MAX} sistemas por coordenação na abertura do GEPLAT.`, 'erro'); }
        gravar({ abertura: c.checked ? [...atuais, k] : atuais.filter(x => x !== k) }, c.checked ? 'Sistema destacado na abertura do GEPLAT.' : 'Sistema retirado da abertura.');
      });
      bindDados(coord);
    },
  };
}

function notaAcumulado() {
  const M = E.mes || { n: 0, faltam: [] }, r = reservaQueima(E, DIA);
  return `<div class="banner${M.faltam.length ? '' : ' ok'}"><span><b>Acumulado do mês (soma diária do SITOP):</b> gás produzido ${M.gas != null ? fmtN(M.gas) + ' m³' : 'sem dado'} · queima ${M.queima != null ? fmtN(M.queima) + ' m³' : 'sem dado'} · ${M.n} dia${M.n === 1 ? '' : 's'}${M.n ? ` (${ddmm(M.dias[0].ref)} a ${ddmm(M.dias[M.n - 1].ref)})` : ''}${M.faltam.length ? ` · <b>sem dado em ${M.faltam.map(ddmm).join(', ')}</b> (abra o dia seguinte e informe o valor)` : ''}.${r.fonteP === 'manual' || r.fonteQ === 'manual' ? ' <b>Correção manual em uso</b>: apague o campo de correção para voltar à soma.' : ''}</span></div>`;
}
function abaDados(coord, manual = null) {
  UI.coordDados = coord;
  labLista(coord);   // D-65: registra os campos das análises incluídas na Configuração
  const campos = manual ? CAMPOS.filter(c => manual[2].includes(c.id)) : CAMPOS.filter(c => c.coord === coord && !MANUAL_IDS.has(c.id) && !(c.lab && !labAtiva(c.id.replace(/\.data$/, ''))));
  const listas = manual ? manual[3].map(id => LISTA[id]) : LISTAS.filter(l => l.coord === coord && !l.aba && !MANUAL_IDS.has(l.id));
  const grupos = [...new Set(campos.map(c => c.grupo))];
  const dis = bloqueado() ? 'disabled' : '';
  const inp = c => {
    const v = E.valores[c.id], val = v ? v.valor : '';
    if (c.tipo === 'semaforo') return `<select class="in" data-campo="${c.id}" ${dis}>${['', 'ok', 'at', 'nok'].map(s => `<option value="${s}" ${s === (val || '') ? 'selected' : ''}>${s ? SEM_NOME[s] : '(automático)'}</option>`).join('')}</select>`;
    if (c.tipo === 'opcao') return `<select class="in" data-campo="${c.id}" ${dis}><option value=""></option>${c.opcoes.map(o => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    if (c.tipo === 'num') return `<input class="in" type="number" step="any" data-campo="${c.id}" value="${val ?? ''}" ${dis}>`;
    if (c.tipo === 'data') return `<input class="in" type="date" data-campo="${c.id}" value="${esc(val ?? '')}" ${dis}>`;
    return `<input class="in" data-campo="${c.id}" value="${esc(val ?? '')}" ${c.max ? `maxlength="${c.max}"` : ''} ${dis}>`;
  };
  const html = `<section class="ed" style="grid-column:2 / -1">
    ${bloqueado() ? '<div class="banner">Pauta congelada: os dados estão bloqueados para edição.</div>' : ''}
    ${manual ? `<div class="pn"><h2>${esc(manual[1])} · ${coord}</h2><p class="note">Preenchimento manual: este item não tem captura automática. Cada gravação fica registrada com autor e horário.</p><p class="note">Aparece em: <b>${esc(manual[4][1])}</b> · <a href="${manual[4][0]}">Ver na apresentação ›</a></p></div>` : `<p class="note">Clique em <b>Capturar dados</b> em cada bloco: o que a captura encontra já entra confirmado (origem A). Se não concordar com um valor, ou se a captura não o encontrou, digite no campo: ao sair dele, o valor fica gravado e confirmado como origem M, com seu nome e horário; o valor automático continua no histórico. Itens sem captura automática ficam em “Preenchimento manual”, no menu.</p>
    ${coord === 'COPROD' ? notaAcumulado() : ''}
    ${grupos.some(g => campos.some(c => c.grupo === g && capturavel(c.id))) ? `<div class="pn capt-all"><div class="pn-h"><h2>Captura de todos os blocos</h2><span class="note">Roda a captura de cada bloco desta página, em sequência; os botões de cada bloco continuam valendo para capturar um só</span><span style="flex:1"></span><button class="btn pri" data-act="capturar-todos" ${dis}>Capturar todos os dados</button></div><div class="capt" data-capt="todos">${resultadoTodos()}</div></div>` : ''}`}
    ${grupos.map(g => {
      const cs = campos.filter(c => c.grupo === g), ids = cs.map(c => c.id).filter(capturavel), chave = coord + '|' + g;
      const falta = new Set((UI.captura?.[chave]?.faltando || []).map(f => f.id));
      const fontes = [...new Set(ids.map(fonteDoCampo))].map(f => FONTES_CAPTURA[f].nome);
      const linha = c => `<tr class="${falta.has(c.id) ? 'falta' : ''}"><td><label for="cp-${c.id}">${esc(c.rot)}</label></td><td>${inp(c).replace('data-campo=', `id="cp-${c.id}" data-campo=`)}</td><td>${esc(c.un || '')}</td><td data-orig="${c.id}">${origemTxt(E.valores[c.id])}</td><td data-restc="${c.id}">${botaoRestaurar(c.id)}</td></tr>`;
      const linhaLab = c => { const d = CAMPO[c.id + '.data'], a = labDe(E, coord).find(x => x.id === c.id); const f = falta.has(c.id) || falta.has(d.id);
        return `<tr class="${f ? 'falta' : ''}"><td><label for="cp-${c.id}">${esc(c.rot)}</label></td><td>${inp(c).replace('data-campo=', `id="cp-${c.id}" data-campo=`)}</td><td>${esc(c.un || '')}</td><td>${inp(d).replace('data-campo=', `id="cp-${d.id}" aria-label="Data do resultado · ${esc(c.rot)}" data-campo=`)}${a.atrasada ? `<span class="chip at"${dTip('at', [`${c.rot}: último resultado em ${ddmm(a.data)}, há ${a.dias} dias`, `Periodicidade: a cada ${c.lab.per} dia(s)`])}>Atrasada · ${a.dias} dias</span>` : ''}</td><td>a cada ${c.lab.per} ${c.lab.per === 1 ? 'dia' : 'dias'}</td><td data-orig="${c.id}">${origemTxt(E.valores[c.id])}</td></tr>`; };
      const lab = g === LAB_GRUPO, eqp = cs.some(c => c.equip);
      return `<div class="pn" data-bloco="${esc(chave)}"><div class="pn-h"><h2>${esc(g)}</h2><span class="note">Origem: ${esc(fontes.join(', ') || 'manual')}</span><span style="flex:1"></span>${ids.length ? `<button class="btn sm pri" data-capturar="${esc(chave)}" ${dis}>Capturar dados</button>` : ''}</div>
      <div class="capt" data-capt="${esc(chave)}">${resultadoCaptura(chave)}</div>
      <div class="tbw"><table class="tb dd${lab ? ' lab' : ''}"><thead><tr>${lab ? '<th>Análise</th><th>Resultado</th><th>Unidade</th><th>Data do resultado</th><th>Periodicidade</th><th>Origem</th>' : (eqp ? '<th>Equipamento</th><th style="width:34%">Status</th>' : '<th>Campo</th><th style="width:34%">Valor</th>') + '<th>Unidade</th><th>Origem</th><th></th>'}</tr></thead><tbody>
      ${lab ? cs.filter(c => !c.labData).map(linhaLab).join('') : cs.map(linha).join('')}
    </tbody></table></div>${manual ? `<div class="row end" style="margin-top:8px"><button class="btn sec" data-grupo="${esc(g)}" ${dis}>Salvar ${esc(g.toLowerCase())}</button></div>` : ''}</div>`; }).join('')}
    ${listas.map(l => editorLista(l, !manual, !manual)).join('')}
  </section>`;
  return { html, dois: true, bind: () => bindDados(coord, !manual) };
}
/* auto (D-53, aba Dados automáticos): sem botões Salvar/Adicionar linha; cada alteração grava ao sair do campo e há sempre uma linha em branco no fim para incluir */
function editorLista(l, capturar = false, auto = false) {
  const it = L(E, l.id), dis = bloqueado() ? 'disabled' : '', chave = l.coord + '|lista:' + l.id;
  const falta = (UI.captura?.[chave]?.faltando || []).length > 0;
  const cel = (c, val) => c.tipo === 'opcao' ? `<select class="in" data-k="${c.k}" ${dis}>${c.opcoes.map(o => `<option value="${esc(o)}" ${o === val ? 'selected' : ''}>${esc(c.nomes?.[o] || o)}</option>`).join('')}</select>` : `<input class="in" data-k="${c.k}" ${c.tipo === 'num' ? 'type="number" step="any"' : c.tipo === 'data' ? 'type="date"' : ''} value="${esc(val ?? '')}" ${dis}>`;
  const linha = r => `<tr>${l.cols.map(c => `<td>${cel(c, r[c.k])}</td>`).join('')}<td><button class="btn sm lnk" data-del ${dis}>Remover</button></td></tr>`;
  return `<div class="pn${falta ? ' falta' : ''}" data-lista="${l.id}"><div class="pn-h"><h2>${esc(l.rot)}</h2>${capturar ? `<span class="note">Origem: ${esc(FONTES_CAPTURA[fonteDoCampo(l.id)].nome)}</span><span style="flex:1"></span><button class="btn sm pri" data-capturar="${esc(chave)}" ${dis}>Capturar dados</button>` : ''}</div><p class="note">${origemTxt(E.listas[l.id])}</p>
    ${capturar ? `<div class="capt" data-capt="${esc(chave)}">${resultadoCaptura(chave)}</div>` : ''}
    <div class="tbw"><table class="tb"><thead><tr>${l.cols.map(c => `<th>${esc(c.rot)}</th>`).join('')}<th></th></tr></thead><tbody>${it.map(linha).join('')}${auto && !(l.max && it.length >= l.max) ? linha({}) : ''}</tbody>
    <template>${linha({})}</template></table></div>
    ${auto ? '<p class="note">Altere direto na tabela: ao sair do campo, a lista fica gravada (origem M). Para incluir, preencha a linha em branco do fim.</p>' : `<div class="row" style="margin-top:8px"><button class="btn sm" data-add ${dis}>Adicionar linha</button><span style="flex:1"></span><button class="btn sec" data-salvar ${dis}>Salvar lista</button></div>`}</div>`;
}
/* resultado da última captura do bloco: resumo, origem simulada e o que não foi encontrado */
function resultadoCaptura(chave) {
  const r = UI.captura?.[chave]; if (!r) return '';
  const nome = id => CAMPO[id]?.rot || LISTA[id]?.rot || (id.startsWith('servicos.') ? 'PTs planejadas para hoje (APLAT)' : id);
  const pedido = /\|lista:servicos\./.test(chave) ? 'Inclua os serviços do dia manualmente, em “Incluir serviço ou atividade”:' : /\|lista:pfceo\./.test(chave) ? 'Corrija os dados do PFCEO à mão, no fim desta página:' : 'Digite o valor nos campos destacados; ao sair do campo, ele fica gravado e confirmado:';
  const erro = r.passos.find(p => p.st === 'erro');
  return `${erro ? `<div class="banner erro"><b>Captura interrompida:</b> ${esc(erro.txt)} · ${esc(erro.nota || '')}</div>` : `<div class="banner ok"><b>Captura concluída às ${hhmm(r.em)}</b> · ${r.gravados} valor(es) gravado(s)${r.iguais ? `, ${r.iguais} sem alteração` : ''}${r.mantidosOcultos ? `, ${r.mantidosOcultos} ocultado(s) pelo coordenador e mantido(s) fora da lista` : ''}${r.substituidos.length ? `, ${r.substituidos.length} correção(ões) manual(is) substituída(s)` : ''}${r.mantidos?.length ? `, ${r.mantidos.length} sem valor na origem mantido(s) com o valor manual atual (${r.mantidos.map(m => esc(nome(m.id))).join(', ')})` : ''}.${r.simulado ? ' <span class="note">Integração ainda não liberada: valores de demonstração (modo simulado).</span>' : ''}</div>`}
    ${r.faltando.length ? `<div class="banner at falta-al" role="alert"><b>${r.faltando.length} dado(s) não encontrado(s) nas origens.</b> ${pedido}
      <ul>${r.faltando.map(f => `<li>${esc(nome(f.id))} <span class="note">· ${esc(f.fonte)}</span></li>`).join('')}</ul></div>` : ''}`;
}
function progressoCaptura(box, { pct, passos, titulo }) {
  const ic = { ok: SH.ok(16), erro: SH.nok(16), exec: '<i class="spin" aria-hidden="true"></i>', fila: '<i class="dot0" aria-hidden="true"></i>' };
  box.innerHTML = `<div class="capt-on" role="status" aria-live="polite"><div class="capt-h"><b>${titulo ? esc(titulo) : 'Capturando dados nos sistemas de origem'}</b><span class="capt-pct">${Math.round(pct)}%</span></div>
    <div class="capt-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><i style="width:${pct}%"></i></div>
    <ol class="capt-l">${passos.map(p => `<li class="${p.st}">${ic[p.st]}<span>${esc(p.txt)}</span>${p.nota ? `<span class="note">${esc(p.nota)}</span>` : ''}</li>`).join('')}</ol></div>`;
}
function alvoCaptura(coord, chave) {
  const [, alvoTxt] = chave.split('|');
  return alvoTxt.startsWith('lista:') ? { listas: [alvoTxt.slice(6)] } : { campos: CAMPOS.filter(c => c.coord === coord && c.grupo === alvoTxt).map(c => c.id) };
}
/* D-66: captura de todos os blocos da página, um depois do outro, com o progresso geral no topo e o resultado em cada bloco */
async function capturarTodos(coord, botao) {
  if (UI.capturando) return;
  if (!(await podeEditar('valor'))) return;
  const chaves = [...new Set($$('[data-capturar]').map(b => b.dataset.capturar))], box = $('[data-capt="todos"]'), n = chaves.length;
  const res = { em: Relogio.agora().toISOString(), blocos: n, feitos: 0, gravados: 0, faltando: 0, erros: [] };
  UI.capturando = true; $$('[data-capturar], [data-act="capturar-todos"]').forEach(b => b.disabled = true); botao.textContent = 'Capturando…';
  try {
    for (let i = 0; i < n; i++) {
      const chave = chaves[i], nome = chave.split('|')[1].replace(/^lista:/, '');
      const r = await Captura.executar(alvoCaptura(coord, chave), est => box && progressoCaptura(box, { pct: (i * 100 + est.pct) / n, passos: est.passos, titulo: `Bloco ${i + 1} de ${n} · ${LISTA[nome]?.rot || nome}` }));
      (UI.captura ||= {})[chave] = r; res.feitos++; res.gravados += r.gravados || 0; res.faltando += r.faltando.length;
      const er = r.passos.find(p => p.st === 'erro'); if (er) res.erros.push(`${LISTA[nome]?.rot || nome}: ${er.txt}`);
      atualizarEstado();
    }
    aviso(res.faltando ? `Captura de todos os blocos concluída: ${res.faltando} dado(s) não encontrado(s). Preencha os campos destacados.` : 'Captura de todos os blocos concluída.', res.faltando || res.erros.length ? 'erro' : 'ok');
  } catch (e) { await tratarErroGravacao(e); }
  finally { (UI.capturaTodos ||= {})[coord] = res; UI.capturando = false; rerender(); document.querySelector('tr.falta input, tr.falta select')?.focus({ preventScroll: true }); }
}
function resultadoTodos() {
  const r = UI.capturaTodos?.[UI.coordDados]; if (!r) return '';
  return `<div class="banner ${r.erros.length ? 'erro' : r.faltando ? 'at' : 'ok'}"><b>Captura de todos os blocos às ${hhmm(r.em)}</b> · ${r.feitos} de ${r.blocos} bloco(s) · ${r.gravados} valor(es) gravado(s)${r.faltando ? ` · <b>${r.faltando} não encontrado(s)</b>: veja os blocos destacados abaixo` : ''}${r.erros.length ? ` · interrompida em ${r.erros.map(esc).join('; ')}` : ''}.</div>`;
}
async function capturarBloco(coord, chave, botao) {
  if (UI.capturando) return;
  if (!(await podeEditar('valor'))) return;
  const alvo = alvoCaptura(coord, chave);
  const box = [...document.querySelectorAll('[data-capt]')].find(b => b.dataset.capt === chave);
  UI.capturando = true; $$('[data-capturar]').forEach(b => b.disabled = true); botao.textContent = 'Capturando…';
  try {
    const r = await Captura.executar(alvo, est => box && progressoCaptura(box, est));
    (UI.captura ||= {})[chave] = r;
    atualizarEstado();
    aviso(r.faltando.length ? `Captura concluída: ${r.faltando.length} dado(s) não encontrado(s). Preencha manualmente.` : 'Captura concluída.', r.faltando.length ? 'erro' : 'ok');
  } catch (e) { await tratarErroGravacao(e); }
  finally { UI.capturando = false; rerender(); const al = [...document.querySelectorAll('[data-capt]')].find(b => b.dataset.capt === chave); al?.scrollIntoView({ block: 'nearest' }); document.querySelector('tr.falta input, tr.falta select')?.focus({ preventScroll: true }); }
}
const temA = id => (E.hist[id] || []).some(r => r.payload.origem === 'A');
const botaoRestaurar = id => E.valores[id]?.origem === 'M' && temA(id) && !bloqueado() ? `<button class="btn sm lnk" data-rest="${id}">Restaurar automático</button>` : '';
const vazio = v => v === null || v === undefined || v === '';
/* D-53: grava um campo ao sair dele (evento change). Valor diferente do atual vira origem M (C no GEPLAT), com autor e horário */
async function gravarCampoDados(el) {
  const c = CAMPO[el.dataset.campo]; if (!c) return;
  let val = el.value.trim(); if (c.tipo === 'num') val = val === '' ? null : +val;
  const atual = E.valores[c.id]?.valor ?? (c.tipo === 'num' ? null : '');
  if (String(val ?? '') === String(atual ?? '')) return;
  try {
    if (!(await podeEditar('valor'))) return;
    await registrar('valor', { campo: c.id, valor: val, origem: c.coord === 'GEPLAT' && /geplat\./.test(c.id) ? 'C' : 'M', fonte: 'Manual' });
    atualizarEstado();
    if (!vazio(val)) for (const r of Object.values(UI.captura || {})) r.faltando = r.faltando.filter(f => f.id !== c.id);
    if (!el.isConnected) return rerender();
    atualizarLinhaDados(el);
    aviso(`${c.rot}: gravado (manual).`, 'ok');
  } catch (e) { await tratarErroGravacao(e); }
}
/* atualiza só a linha e o alerta do bloco, sem redesenhar a tela (o foco segue no campo clicado) */
function atualizarLinhaDados(el) {
  const tr = el.closest('tr'), pn = el.closest('[data-bloco]');
  for (const td of $$('[data-orig]', tr)) td.innerHTML = origemTxt(E.valores[td.dataset.orig]);
  for (const td of $$('[data-restc]', tr)) { td.innerHTML = botaoRestaurar(td.dataset.restc); bindRestaurar(td); }
  if (!pn) return;
  const r = UI.captura?.[pn.dataset.bloco], falta = new Set((r?.faltando || []).map(f => f.id));
  tr.classList.toggle('falta', $$('[data-campo]', tr).some(i => falta.has(i.dataset.campo)));
  const box = $('[data-capt]', pn); if (box) box.innerHTML = resultadoCaptura(pn.dataset.bloco);
}
function bindRestaurar(raiz = document) {
  $$('[data-rest]', raiz).forEach(b => b.onclick = () => {
    const id = b.dataset.rest, a = [...E.hist[id]].reverse().find(r => r.payload.origem === 'A');
    salvarE('valor', { campo: id, valor: a.payload.valor, origem: 'A', fonte: (a.payload.fonte || '') + ' (restaurado)' }, {}, 'Valor automático restaurado.');
  });
}
/* lista em modo automático: grava a tabela inteira a cada alteração e mantém uma linha em branco no fim */
async function gravarListaDados(box, l) {
  const tb = $('tbody', box), tpl = $('template', box);
  const itens = [...tb.rows].map(tr => Object.fromEntries(l.cols.map(c => { const el = $(`[data-k="${c.k}"]`, tr); let v = el.value.trim(); if (c.tipo === 'num') v = v === '' ? null : +v; return [c.k, v]; })));
  const preenchido = o => l.cols.some(c => c.tipo !== 'opcao' && !vazio(o[c.k]));
  const validos = itens.filter(preenchido);
  if (l.max && validos.length > l.max) return aviso(`Máximo de ${l.max} linhas.`, 'erro');
  const erro = l.validar ? l.validar(validos) : null; if (erro) return aviso(erro, 'erro');
  if (JSON.stringify(validos) === JSON.stringify(L(E, l.id))) return;
  try {
    if (!(await podeEditar('lista'))) return;
    await registrar('lista', { campo: l.id, itens: validos, origem: 'M', fonte: 'Manual' });
    atualizarEstado();
    if (!box.isConnected) return rerender();
    const chave = l.coord + '|lista:' + l.id;
    if (UI.captura && validos.length) { delete UI.captura[chave]; box.classList.remove('falta'); const cb = $('[data-capt]', box); if (cb) cb.innerHTML = ''; }
    $('p.note', box).innerHTML = origemTxt(E.listas[l.id]);
    const ult = tb.rows[tb.rows.length - 1];
    if ((!ult || preenchido(Object.fromEntries(l.cols.map(c => [c.k, $(`[data-k="${c.k}"]`, ult).value.trim()])))) && !(l.max && validos.length >= l.max)) { tb.appendChild(tpl.content.firstElementChild.cloneNode(true)); rotularTabelas(box); bindListaAuto(box, l); }
    aviso(`${l.rot}: lista gravada (manual).`, 'ok');
  } catch (e) { await tratarErroGravacao(e); }
}
function bindListaAuto(box, l) {
  $$('[data-k]', box).forEach(el => el.onchange = () => gravarListaDados(box, l));
  $$('[data-del]', box).forEach(d => d.onclick = () => { const tr = d.closest('tr'), tb = tr.parentNode; tr.remove(); if (!tb.rows.length) tb.appendChild($('template', box).content.firstElementChild.cloneNode(true)); gravarListaDados(box, l); });
}
function bindDados(coord, auto = false) {
  $$('[data-capturar]').forEach(b => b.onclick = () => capturarBloco(coord, b.dataset.capturar, b));
  const ct = $('[data-act="capturar-todos"]'); if (ct) ct.onclick = () => capturarTodos(coord, ct);
  if (auto) $$('[data-bloco] [data-campo]').forEach(el => el.onchange = () => gravarCampoDados(el));
  $$('[data-grupo]').forEach(b => b.onclick = async () => {
    const g = b.dataset.grupo; let n = 0;
    try {
      if (!(await podeEditar('valor'))) return;
      for (const c of CAMPOS.filter(c => c.coord === coord && c.grupo === g)) {
        const el = $(`[data-campo="${c.id}"]`); if (!el) continue; let val = el.value.trim();
        if (c.tipo === 'num') val = val === '' ? null : +val;
        const atual = E.valores[c.id]?.valor ?? (c.tipo === 'num' ? null : '');
        if (String(val ?? '') === String(atual ?? '')) continue;
        await registrar('valor', { campo: c.id, valor: val, origem: c.coord === 'GEPLAT' && /geplat\./.test(c.id) ? 'C' : 'M', fonte: 'Manual' }); n++;
      }
      atualizarEstado(); aviso(n ? `${n} valor(es) gravado(s).` : 'Nada mudou.', n ? 'ok' : 'info');
      if (n && UI.captura) { const r = UI.captura[coord + '|' + g]; if (r) r.faltando = r.faltando.filter(f => { const v = E.valores[f.id]?.valor; return v === null || v === undefined || v === ''; }); }
      rerender();
    } catch (e) { aviso(e.message, 'erro'); }
  });
  bindRestaurar();
  $$('[data-lista]').forEach(box => {
    const l = LISTA[box.dataset.lista], tb = $('tbody', box), tpl = $('template', box);
    if (auto && !$('[data-salvar]', box)) return bindListaAuto(box, l);
    const bindDel = () => $$('[data-del]', tb).forEach(d => d.onclick = () => d.closest('tr').remove());
    bindDel();
    $('[data-add]', box).onclick = () => { if (l.max && tb.rows.length >= l.max) return aviso(`Máximo de ${l.max} linhas.`, 'erro'); tb.appendChild(tpl.content.firstElementChild.cloneNode(true)); rotularTabelas(box); bindDel(); };
    $('[data-salvar]', box).onclick = () => {
      const itens = [...tb.rows].map(tr => Object.fromEntries(l.cols.map(c => { const el = $(`[data-k="${c.k}"]`, tr); let v = el.value.trim(); if (c.tipo === 'num') v = v === '' ? null : +v; return [c.k, v]; }))).filter(o => Object.values(o).some(v => v !== '' && v !== null));
      const erro = l.validar ? l.validar(itens) : null; if (erro) return aviso(erro, 'erro');
      if (UI.captura && itens.length) delete UI.captura[l.coord + '|lista:' + l.id];
      salvarE('lista', { campo: l.id, itens, origem: 'M', fonte: 'Manual' }, {}, 'Lista gravada.');
    };
  });
}

function abaServicos(coord) {
  const sv = E.servicos.filter(s => s.payload.coord === coord), nAb = sv.filter(s => s.payload.abertura).length, dis = bloqueado() ? 'disabled' : '';
  const html = `<section class="ed" style="grid-column:2 / -1">
    <div class="pn"><div class="pn-h"><h2>Serviços planejados hoje · ${coord}</h2><span class="note">Origem: APLAT</span><span style="flex:1"></span><button class="btn sm pri" data-capturar="${esc(coord + '|lista:servicos.' + coord)}" ${dis}>Capturar dados</button></div>
      <div class="capt" data-capt="${esc(coord + '|lista:servicos.' + coord)}">${resultadoCaptura(coord + '|lista:servicos.' + coord)}</div>
      <p class="note">Capturar dados traz do APLAT as permissões de trabalho planejadas para hoje na ${coord} (origem PT); as que já estão na lista ou que você ocultou não se repetem. Origem M = incluído pelo coordenador. Marque “Abertura” para levar o serviço às Principais atividades do GEPLAT: até ${CFG.atividadesMax}, recomendado ${CFG.atividadesRecomendado}.</p>
      ${nAb > CFG.atividadesRecomendado ? `<div class="banner">${nAb} atividades marcadas para a abertura. O recomendado é ${CFG.atividadesRecomendado}.</div>` : ''}
      <div class="tbw"><table class="tb"><thead><tr><th>Ordem</th><th>Serviço</th><th>Detalhe</th><th>Origem</th><th>Abertura</th><th></th></tr></thead><tbody>
      ${sv.map((s, i) => `<tr><td class="nw"><button class="btn sm" data-up="${s.id}" ${i === 0 || dis ? 'disabled' : ''} aria-label="Subir">↑</button><button class="btn sm" data-down="${s.id}" ${i === sv.length - 1 || dis ? 'disabled' : ''} aria-label="Descer">↓</button></td>
        <td><b>${esc(s.payload.titulo)}</b></td><td>${esc(s.payload.detalhe || '')}</td><td><span class="tg0">${esc(s.payload.origem)}</span></td>
        <td><label class="row" style="gap:6px"><input type="checkbox" data-ab="${s.id}" ${s.payload.abertura ? 'checked' : ''} ${dis}> Abertura</label></td>
        <td><button class="btn sm lnk" data-rm="${s.id}" ${dis}>${s.payload.origem === 'PT' ? 'Ocultar' : 'Remover'}</button></td></tr>`).join('') || '<tr><td colspan="6" class="note">Nenhum serviço.</td></tr>'}
      </tbody></table></div></div>
    <div class="pn"><h2>Incluir serviço ou atividade</h2>
      <div class="fgrid"><div><label class="lbl" for="s-tit">Serviço / atividade</label><input id="s-tit" class="in" maxlength="70" ${dis}></div>
        <div><label class="lbl" for="s-det">Local / TAG · PT nº · horário</label><input id="s-det" class="in" ${dis}></div></div>
      <label class="row" style="margin-top:8px;gap:6px"><input type="checkbox" id="s-ab" ${dis}> Levar para a abertura (Principais atividades)</label>
      <div class="row end" style="margin-top:8px"><button class="btn pri" data-act="add-srv" ${dis}>Incluir</button></div></div>
  </section>`;
  return {
    html, dois: true, bind: () => {
      $$('[data-capturar]').forEach(b => b.onclick = () => capturarBloco(coord, b.dataset.capturar, b));
      $$('[data-ab]').forEach(c => c.onchange = () => {
        if (c.checked && nAb >= CFG.atividadesMax) { c.checked = false; return aviso(`Máximo de ${CFG.atividadesMax} atividades por coordenação na abertura.`, 'erro'); }
        salvarE('atualiza', { alvo: c.dataset.ab, campos: { abertura: c.checked } }, {}, c.checked ? 'Levado para a abertura.' : 'Retirado da abertura.');
      });
      $$('[data-rm]').forEach(b => b.onclick = () => salvarE('remove', { alvo: b.dataset.rm }, {}, 'Serviço retirado da lista.'));
      const mover = async (id, dir) => {
        if (!(await podeEditar('atualiza'))) return;
        const ids = sv.map(s => s.id), i = ids.indexOf(id), j = i + dir; [ids[i], ids[j]] = [ids[j], ids[i]];
        for (let k = 0; k < ids.length; k++) if ((sv.find(s => s.id === ids[k]).payload.ordem ?? -1) !== k + 1) await registrar('atualiza', { alvo: ids[k], campos: { ordem: k + 1 } });
        atualizarEstado(); rerender();
      };
      $$('[data-up]').forEach(b => b.onclick = () => mover(b.dataset.up, -1));
      $$('[data-down]').forEach(b => b.onclick = () => mover(b.dataset.down, 1));
      const add = $('[data-act="add-srv"]'); if (add) add.onclick = () => {
        const t = $('#s-tit').value.trim(); if (!t) return aviso('Informe o serviço.', 'erro');
        const ab = $('#s-ab').checked; if (ab && nAb >= CFG.atividadesMax) return aviso(`Máximo de ${CFG.atividadesMax} atividades na abertura.`, 'erro');
        salvarE('servico', { coord, titulo: t, detalhe: $('#s-det').value.trim(), origem: 'M', abertura: ab, ordem: sv.length + 1 }, {}, 'Serviço incluído.');
      };
    },
  };
}

function abaItens(coord) {
  const geplat = coord === 'GEPLAT', tipos = geplat ? [['pauta_extra', 'Tema da plataforma']] : [['ameaca', 'Ameaça'], ['oportunidade', 'Oportunidade']];
  const it = E.itens.filter(i => i.payload.coord === coord), dis = bloqueado() ? 'disabled' : '';
  const html = `<section class="ed" style="grid-column:2 / -1">
    <div class="pn"><h2>${geplat ? 'Pauta extra' : 'Ameaças e oportunidades'} · ${coord}</h2>
      <p class="note">${geplat ? `O tema do dia vem do calendário (Configuração). Os temas da plataforma com registro aparecem com semáforo; os demais ficam numa linha de rodapé.` : 'A ameaça mais grave (e, em empate, a primeira da lista) vai para as Principais ameaças da abertura.'}</p>
      <div class="tbw"><table class="tb"><thead><tr><th>Tipo</th><th>${geplat ? 'Tema' : 'Texto'}</th>${geplat ? '<th>Nota curta</th><th>Dono · prazo</th>' : ''}<th>Semáforo</th><th>Por</th><th></th></tr></thead><tbody>
      ${it.map(i => `<tr><td>${esc({ ameaca: 'Ameaça', oportunidade: 'Oportunidade', pauta_extra: 'Pauta extra' }[i.payload.tipo])}</td><td>${i.payload.escalar ? '<span class="chip esc">Escalar</span> ' : ''}<b>${esc(i.payload.texto)}</b></td>${geplat ? `<td>${esc(i.payload.detalhe || '')}</td><td class="nw">${esc(i.payload.dono || '—')}${i.payload.prazo ? ' · até ' + ddmm(i.payload.prazo) : ''}${i.payload.demandaId ? ' <span class="tg0" title="Ação registrada no Canal Base x Bordo">Canal</span>' : ''}</td>` : ''}<td>${semChip(i.payload.semaforo)}</td><td class="note">${esc(i.autor.nome)} · ${hhmm(i.criadoEm)}</td><td><button class="btn sm lnk" data-rm="${i.id}" ${dis}>Remover</button></td></tr>`).join('') || `<tr><td colspan="7" class="note">Nenhum item.</td></tr>`}
      </tbody></table></div></div>
    <div class="pn"><h2>Incluir</h2><div class="fgrid pe-form">
      <div><label class="lbl" for="i-tipo">Tipo</label><select id="i-tipo" class="in" ${dis}>${tipos.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></div>
      ${geplat ? `<div><label class="lbl" for="i-txt">Tema</label><select id="i-txt" class="in" ${dis}>${CFG.temasPlataforma.map(t => `<option>${esc(t)}</option>`).join('')}</select></div><div><label class="lbl" for="i-det">Nota curta</label><input id="i-det" class="in" maxlength="60" ${dis}></div>` : `<div style="grid-column:span 2"><label class="lbl" for="i-txt">Texto (até 90 caracteres)</label><input id="i-txt" class="in" maxlength="90" ${dis}></div>`}
      <div><label class="lbl" for="i-sem">Semáforo</label><select id="i-sem" class="in" ${dis}><option value="at">Atenção</option><option value="nok">Não OK</option><option value="ok">OK</option></select></div>
      ${geplat ? `<div><label class="lbl" for="i-dono">Dono (função)</label><input id="i-dono" class="in" placeholder="ex.: 4º GEPLAT" ${dis}></div><div><label class="lbl" for="i-prazo">Prazo</label><input id="i-prazo" type="date" class="in" ${dis}></div>
      <div style="grid-column:span 2"><label class="lbl" for="i-acao">Ação que sai da reunião (opcional · vira item do Canal Base x Bordo)</label><input id="i-acao" class="in" maxlength="100" placeholder="ex.: Enviar plano de remanejamento dos camarotes do M22" ${dis}></div>
      <div><label class="lbl" for="i-sent">Sentido da ação</label><select id="i-sent" class="in" ${dis}><option>bordo → base</option><option>base → bordo</option></select></div>` : ''}</div>
      ${geplat ? `<p class="note">D-61: o tema com dono e prazo aparece assim na abertura. Com uma ação preenchida, o sistema registra também uma demanda no Canal Base x Bordo (coordenação GEPLAT, origem C), com o mesmo dono e prazo.</p>${chkEscalar(false, dis, 'i-esc')}` : ''}
      <div class="row end" style="margin-top:8px"><button class="btn pri" data-act="add-item" ${dis}>Incluir</button></div></div>
  </section>`;
  return {
    html, dois: true, bind: () => {
      $$('[data-rm]').forEach(b => b.onclick = () => salvarE('remove', { alvo: b.dataset.rm }, {}, 'Item removido.'));
      const add = $('[data-act="add-item"]'); if (add) add.onclick = async () => {
        const t = $('#i-txt').value.trim(); if (!t) return aviso('Informe o texto.', 'erro');
        const p = { coord, tipo: $('#i-tipo').value, texto: t, detalhe: geplat ? $('#i-det').value.trim() : '', semaforo: $('#i-sem').value, ordem: it.length + 1 };
        if (!geplat) return salvarE('item', p, {}, 'Item incluído.');
        Object.assign(p, { dono: $('#i-dono').value.trim(), prazo: $('#i-prazo').value, escalar: !!$('#i-esc')?.checked });
        const acao = $('#i-acao').value.trim();
        try {
          if (!(await podeEditar('item'))) return;
          if (acao) { const d = await registrar('demanda', { titulo: acao, sentido: $('#i-sent').value, responsavel: p.dono || '[responsável]', prazo: p.prazo || addDias(DIA, 3), origem: 'C', coord: 'GEPLAT', dataRedia: DIA, status: 'aberta', pautaExtra: t }, { escopo: 'demandas' }); p.demandaId = d.id; }
          await registrar('item', p); atualizarEstado(); aviso(acao ? 'Tema incluído e ação registrada no Canal Base x Bordo.' : 'Item incluído.', 'ok'); rerender();
        } catch (e) { await tratarErroGravacao(e); }
      };
    },
  };
}

const SIT_DEM = { vencida: '<span class="chip nok">Vencida</span>', vence24: '<span class="chip at">Vence hoje</span>', prazo: '<span class="chip ok">No prazo</span>', ok: '<span class="chip ok">No prazo</span>', enc: '<span class="chip ne">Encerrada</span>' };
function tabelaDemandas(lista, comAcoes = true) {
  return `<div class="tbw"><table class="tb"><thead><tr><th>Demanda</th><th>Sentido</th><th>Responsável</th><th>Prazo</th><th>Situação</th><th>Origem</th><th>REDIA</th>${comAcoes ? '<th></th>' : ''}</tr></thead><tbody>
  ${lista.map(d => `<tr><td><b>${esc(d.payload.titulo)}</b></td><td class="nw">${esc(d.payload.sentido)}</td><td>${esc(d.payload.responsavel)}</td><td class="nw">${d.payload.prazo ? ddmmaaaa(d.payload.prazo) : '—'}</td><td>${SIT_DEM[d.situacao] || ''}</td><td><span class="tg0">${esc(d.payload.origem)}</span> ${esc(d.payload.coord)}</td><td class="nw">${ddmm(d.payload.dataRedia)}</td>
    ${comAcoes ? `<td class="nw">${d.payload.status === 'encerrada' ? `<button class="btn sm lnk" data-dst="${d.id}" data-v="aberta">Reabrir</button>` : `<button class="btn sm sec" data-dst="${d.id}" data-v="encerrada">Encerrar</button>`}</td>` : ''}</tr>`).join('') || `<tr><td colspan="8" class="note">Nenhuma demanda.</td></tr>`}
  </tbody></table></div>`;
}
function formDemanda(coordFixa) {
  return `<div class="fgrid">
    <div style="grid-column:span 2"><label class="lbl" for="d-tit">Demanda</label><input id="d-tit" class="in" maxlength="100"></div>
    <div><label class="lbl" for="d-sen">Sentido</label><select id="d-sen" class="in"><option>bordo → base</option><option>base → bordo</option></select></div>
    <div><label class="lbl" for="d-resp">Responsável (função)</label><input id="d-resp" class="in" placeholder="ex.: 4º COPROD"></div>
    <div><label class="lbl" for="d-pz">Prazo</label><input id="d-pz" type="date" class="in" value="${addDias(DIA, 3)}"></div>
    ${coordFixa ? `<input type="hidden" id="d-coord" value="${coordFixa}">` : `<div><label class="lbl" for="d-coord">Coordenação</label><select id="d-coord" class="in">${['COPROD', 'COEMB', 'COMAN', 'GEPLAT'].map(c => `<option>${c}</option>`).join('')}</select></div>`}
    <div><label class="lbl" for="d-ori">Origem</label><select id="d-ori" class="in"><option value="C">C · curadoria/reunião</option><option value="PS">PS · passagem de serviço</option></select></div>
  </div><div class="row end" style="margin-top:8px"><button class="btn pri" data-act="add-dem">Registrar demanda</button></div>`;
}
function bindDemandas() {
  $$('[data-dst]').forEach(b => b.onclick = () => salvarE('atualiza', { alvo: b.dataset.dst, campos: { status: b.dataset.v, statusEm: Relogio.agora().toISOString() } }, { escopo: 'demandas' }, b.dataset.v === 'encerrada' ? 'Demanda encerrada.' : 'Demanda reaberta.'));
  const add = $('[data-act="add-dem"]'); if (add) add.onclick = () => {
    const t = $('#d-tit').value.trim(); if (!t) return aviso('Descreva a demanda.', 'erro');
    salvarE('demanda', { titulo: t, sentido: $('#d-sen').value, responsavel: $('#d-resp').value.trim() || '[responsável]', prazo: $('#d-pz').value, origem: $('#d-ori').value, coord: $('#d-coord').value, dataRedia: DIA, status: 'aberta' }, { escopo: 'demandas' }, 'Demanda registrada.');
  };
}
function abaDemandas(coord) {
  const lista = E.demandas.filter(d => d.payload.coord === coord).sort((a, b) => (a.payload.status === 'encerrada') - (b.payload.status === 'encerrada'));
  return { html: `<section class="ed" style="grid-column:2 / -1"><div class="pn"><h2>Canal Base x Bordo · ${coord}</h2><p class="note">Tópicos e demandas tratados entre a base e a ${coord}. Os principais em aberto aparecem no card Canal Base x Bordo da tela da coordenação.</p>${tabelaDemandas(lista)}</div><div class="pn"><h2>Nova demanda</h2>${formDemanda(coord)}</div></section>`, dois: true, bind: bindDemandas };
}
function abaAceite() {
  const ult = E.aceites[E.aceites.length - 1];
  const html = `<section class="ed" style="grid-column:2 / -1"><div class="pn"><h2>Aceite da pauta consolidada</h2>
    <p>O GEPLAT revisa a pauta e pode devolver ou vetar itens até ${CFG.horarios.congelamento}. Sem ação, a pauta aprovada é publicada (aceite tácito, D-22). Registrar o aceite deixa a decisão explícita na ata.</p>
    <div class="tbw"><table class="tb"><thead><tr><th>Coordenação</th><th>Destaques</th><th>Destaques na abertura</th><th>Atividades na abertura</th><th>Ameaça principal</th><th>Pendentes</th></tr></thead><tbody>
    ${['COPROD', 'COEMB', 'COMAN'].map(c => `<tr><td><b>${c}</b></td><td>${destaquesDe(E, c).length}</td><td>${destaquesAbertura(E, c).length}</td><td>${atividadesAbertura(E, c).length}</td><td>${esc(principalAmeaca(E, c)?.payload.texto || '—')}</td><td>${pendentes(E, c).length}</td></tr>`).join('')}
    </tbody></table></div>
    ${ult ? `<div class="banner ok" style="margin-top:12px">Aceite registrado por ${esc(ult.autor.nome)} às ${hhmm(ult.criadoEm)}${ult.payload.nota ? ' · ' + esc(ult.payload.nota) : ''}.</div>` : ''}
    <label class="lbl" for="ac-nota">Observação (opcional)</label><input id="ac-nota" class="in" ${bloqueado() ? 'disabled' : ''}>
    <div class="row end" style="margin-top:8px"><button class="btn pri" data-act="aceite" ${bloqueado() ? 'disabled' : ''}>Registrar aceite</button></div></div></section>`;
  return { html, dois: true, bind: () => { const b = $('[data-act="aceite"]'); if (b) b.onclick = () => salvarE('aceite', { nota: $('#ac-nota').value.trim() }, {}, 'Aceite registrado.'); } };
}

/* D-68 · virada do dia: o Início não tem mais calendário; quem está na REDIA de hoje passa ao novo dia às 00:00 */
let HOJE_VISTO = null;
async function viradaDoDia() {
  const h = isoData(Relogio.agora()); if (HOJE_VISTO === null) { HOJE_VISTO = h; return; }
  if (h === HOJE_VISTO) return;
  const ontem = HOJE_VISTO; HOJE_VISTO = h;
  if (!USUARIO || !Store.modo || DIA !== ontem) return;
  try { await abrirDia(h); aviso(`Novo dia: ${ddmmaaaa(h)}. A REDIA de hoje pode ser iniciada em “Iniciar elaboração”.`, 'ok'); } catch (e) { Store.erros.push('virada do dia: ' + e.message); }
}
/* ======================= Unidades (D-70) =======================
   Usuário lotado em mais de uma unidade (ou administrador do sistema) escolhe a unidade da REDIA; o administrador também vê a Administração. */
function telaUnidades() {
  const us = USUARIO.unidades, ed = us.filter(u => u.editor);
  render(cabecalhoApp({ id: 'unidades', titulo: 'Unidades' }) + `<div class="wrap uni">
    <section class="uni-h"><span class="kick">REDIA Búzios</span><h2>Olá, ${esc(USUARIO.nome.split(' ')[0])}. Qual unidade você quer acessar?</h2>
      <p class="note">${USUARIO.adminSistema ? 'Como administrador do sistema, você acessa todas as unidades do campo de Búzios.' : `Você está lotado em ${us.length} unidade${us.length === 1 ? '' : 's'}. A REDIA, os dados e o histórico são de cada unidade.`}</p></section>
    <div class="uni-g">${us.map(u => `<button class="uni-c${u.uep === USUARIO.uep ? ' on' : ''}" data-uep="${esc(u.uep)}">
        <span class="uni-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28"><path d="M3 15h18l-2.5 5h-13z" fill="currentColor"/><path d="M7 15V9h10v6M10 9V5h4v4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></span>
        <b>${esc(u.uep)}</b><span class="note">${esc(u.nome || nomeUnidade(u.uep))}</span>
        <span class="uni-t">${u.situacao === 'comissionamento' ? '<span class="chip at">Em comissionamento</span>' : ''}${u.lotado === false ? '<span class="chip ne">acesso de administrador</span>' : '<span class="chip ok">lotado</span>'}${u.editor ? '<span class="chip ne">editor</span>' : ''}</span></button>`).join('')}</div>
    ${USUARIO.adminSistema || ed.length ? `<div class="uni-x">${ed.length ? `<a class="uni-c sto-c0" href="#/studio"><span class="uni-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28"><rect x="3" y="4" width="18" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 21h10M9 8h6M9 12h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span><b>Studio de telas</b><span class="note">Editor de ${ed.map(u => esc(u.uep)).join(', ')}: ajuste os cards e rótulos das telas da unidade</span></a>` : ''}${USUARIO.adminSistema ? `<a class="uni-c adm" href="#/admin"><span class="uni-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5z" fill="currentColor"/><path d="M8.5 12l2.5 2.5 4.5-5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><b>Administração do sistema</b><span class="note">Usuários, lotações, papéis, unidades, autocadastro e auditoria</span></a>` : ''}</div>` : ''}
  </div>`);
  $$('[data-uep]').forEach(b => b.onclick = () => selecionarUnidade(b.dataset.uep));
}
async function selecionarUnidade(uep) {
  if (Vivo.souCtrl) Vivo.encerrar();
  Vivo.ativo = false; Vivo.seguindo = false; Vivo.ctrl = null;
  aplicarUnidade(uep);
  try { await iniciarSessao(true); } catch (e) { return aviso('Não foi possível abrir a REDIA da ' + uep + ': ' + e.message, 'erro'); }
  UI.arqLista = null; UI.arqRes = null;
  location.hash = '#/inicio';
  aviso(`REDIA ${uep} aberta.`, 'ok');
}

/* ======================= Apresentação ao vivo (D-67) =======================
   Quem aciona passa a controlar: os demais usuários logados (Início, Curadoria ou Apresentação) vão para a apresentação e acompanham
   a tela e o cronômetro de quem controla. Quem assiste só tem "Sair" na barra; os demais comandos ficam visíveis e desabilitados.
   Transmissão por canal (Supabase Realtime na nuvem; BroadcastChannel entre abas do mesmo navegador), sem gravar na base.
   Quem controla repete o estado a cada 3 s; sem sinal por 15 s, a apresentação ao vivo é dada como encerrada. */
const SESSAO_ID = uid();
const Vivo = {
  ativo: false, ctrl: null, inicio: 0, souCtrl: false, seguindo: false, ult: null, visto: 0, bc: null, hb: null, navegando: false,
  conectar() {
    try { this.bc?.close(); this.bc = new BroadcastChannel('redia-vivo-' + CFG.uep); this.bc.onmessage = e => this.receber(e.data); } catch { this.bc = null; }
    if (Store.remoto()) Nuvem.vivoCanal(CFG.uep, m => this.receber(m));
    setTimeout(() => this.enviar({ t: 'quem', de: SESSAO_ID }), 300);
  },
  eu() { return { id: SESSAO_ID, nome: USUARIO?.nome || '', chave: USUARIO?.chave || '', posto: USUARIO?.posto || '' }; },
  enviar(m) { try { this.bc?.postMessage(m); } catch { } if (Store.remoto()) Nuvem.vivoEnviar(m); },
  estado() { const P = UI.pres; return { t: 'estado', ctrl: this.eu(), inicio: this.inicio, dia: DIA, hash: location.hash, pres: { bloco: P.bloco, restante: P.restante, rodando: P.rodando, extra: P.extra || 0, ts: Date.now() } }; },
  transmitir() { if (this.souCtrl) this.enviar(this.estado()); },
  async comecar() {
    if (this.ativo && !this.souCtrl && this.ctrl) {
      const r0 = await modal({ titulo: 'Apresentação ao vivo em andamento', html: `<p>${esc(this.ctrl.nome)} está conduzindo a apresentação ao vivo. Você pode assistir ou assumir o controle da reunião.</p>`, botoes: [{ id: 'cancelar', txt: 'Cancelar' }, { id: 'assistir', txt: 'Assistir' }, { id: 'assumir', txt: 'Assumir o controle', cls: 'pri' }] });
      if (r0.id === 'assistir') return this.assistir();
      if (r0.id !== 'assumir') return;
    } else {
      /* D-71: explica o que vai acontecer e pede confirmação; depois, contagem regressiva de 5 s para todos da unidade */
      const r1 = await modal({ titulo: 'Iniciar a apresentação ao vivo?', html: `<div class="vivo-exp"><p>Você vai <b>conduzir a REDIA ${esc(CFG.uep)}</b> para todos:</p>
        <ul><li>Os usuários logados na ${esc(CFG.uep)} que estiverem no Início, na Curadoria ou na Apresentação passam a ver <b>a sua tela</b>.</li>
        <li>A troca de telas e o cronômetro seguem o seu comando; quem assiste só tem o botão <b>Sair</b>.</li>
        <li>Antes de começar, todos veem uma <b>contagem regressiva de 5 segundos</b>.</li>
        <li>Para terminar, use <b>Ao vivo · encerrar</b> na barra da apresentação (ou saia da apresentação).</li></ul></div>`, botoes: [{ id: 'cancelar', txt: 'Cancelar' }, { id: 'ok', txt: 'Iniciar apresentação ao vivo', cls: 'pri' }] });
      if (r1.id !== 'ok') return;
      const ate = Date.now() + 5000;
      this.enviar({ t: 'contagem', ctrl: this.eu(), ate, uep: CFG.uep });
      const ok = await mostrarContagem({ nome: USUARIO.nome, souCtrl: true, ate });
      if (!ok) { this.enviar({ t: 'contagem-cancelada', ctrl: this.eu() }); return aviso('Apresentação ao vivo cancelada.', 'ok'); }
    }
    this.souCtrl = true; this.ativo = true; this.seguindo = false; this.inicio = Date.now(); this.ctrl = this.eu();
    clearInterval(this.hb); this.hb = setInterval(() => this.transmitir(), 3000);
    if (ROTA_ATUAL?.id !== 'apresentacao') location.hash = '#/apresentacao/' + (UI.pres.bloco || 1); else { this.transmitir(); rerender(); }
    aviso('Apresentação ao vivo: os demais usuários acompanham a sua tela.', 'ok');
  },
  encerrar() {
    if (!this.souCtrl) return;
    this.enviar({ t: 'fim', ctrl: this.eu() }); clearInterval(this.hb); this.hb = null;
    this.souCtrl = false; this.ativo = false; this.ctrl = null;
    if (ROTA_ATUAL?.id === 'apresentacao') rerender();
    aviso('Apresentação ao vivo encerrada.', 'ok');
  },
  assistir() { if (!this.ativo || this.souCtrl || !this.ult) return aviso('Nenhuma apresentação ao vivo em andamento.', 'erro'); this.seguindo = true; this.aplicar(this.ult, true); },
  podeSeguirAgora() { return ['inicio', 'curadoria', 'apresentacao'].includes(ROTA_ATUAL?.id) && !$('.mdl'); },
  receber(m) {
    if (!m || m.ctrl?.id === SESSAO_ID || m.de === SESSAO_ID) return;
    if (m.t === 'quem') { this.transmitir(); return; }
    if (m.t === 'contagem') { if (USUARIO?.uep && (!m.uep || m.uep === CFG.uep)) mostrarContagem({ nome: m.ctrl.nome, souCtrl: false, ate: m.ate, id: m.ctrl.id }); return; }
    if (m.t === 'contagem-cancelada') { fecharContagem(m.ctrl?.id); aviso(`${m.ctrl.nome} cancelou a apresentação ao vivo.`, 'ok'); return; }
    if (m.t === 'fim') {
      if (this.ctrl?.id !== m.ctrl?.id) return;
      const seguia = this.seguindo; this.ativo = false; this.seguindo = false; this.ctrl = null; this.ult = null;
      aviso(`${m.ctrl.nome} encerrou a apresentação ao vivo.`, 'ok'); if (seguia || ROTA_ATUAL) rerender(); return;
    }
    if (m.t !== 'estado' || !USUARIO) return;
    if (this.souCtrl) { if (m.inicio <= this.inicio) return; clearInterval(this.hb); this.hb = null; this.souCtrl = false; aviso(`${m.ctrl.nome} assumiu o controle da apresentação ao vivo.`, 'ok'); }
    const novo = !this.ctrl || this.ctrl.id !== m.ctrl.id || this.inicio !== m.inicio;
    this.ativo = true; this.ctrl = m.ctrl; this.inicio = m.inicio; this.visto = Date.now(); this.ult = m;
    if (novo) { if (this.podeSeguirAgora()) { this.seguindo = true; aviso(`${m.ctrl.nome} iniciou a apresentação ao vivo.`, 'ok'); this.aplicar(m, true); } else { this.seguindo = false; aviso(`${m.ctrl.nome} iniciou a apresentação ao vivo. Use “Assistir ao vivo” para acompanhar.`, 'ok'); this.atualizarBotoes(); } return; }
    if (this.seguindo) this.aplicar(m, false);
  },
  async aplicar(m, forcar) {
    if (m.dia && m.dia !== DIA) { try { await abrirDia(m.dia); } catch { } }
    const P = UI.pres, alvo = /^#\/apresentacao\/(semana|[1-5])/.exec(m.hash || '')?.[1];
    if (alvo && alvo !== 'semana') P.bloco = +alvo;
    P.restante = m.pres.restante - (m.pres.rodando ? Math.floor((Date.now() - m.pres.ts) / 1000) : 0); P.rodando = m.pres.rodando; P.extra = m.pres.extra || 0; P.ult = Date.now(); P.inicio = null;
    if (m.hash && location.hash !== m.hash && /^#\/apresentacao\//.test(m.hash)) { document.activeElement?.blur?.(); this.navegando = true; location.hash = m.hash; }
    else if (forcar || ROTA_ATUAL?.id !== 'apresentacao') rerender(); else atualizarTimer();
  },
  aoRotear(id, h) {
    if (this.navegando) { this.navegando = false; return; }
    if (this.souCtrl) { if (id !== 'apresentacao') this.encerrar(); else setTimeout(() => this.transmitir(), 0); return; }
    if (this.seguindo && h !== this.ult?.hash) this.seguindo = false;   // quem assiste saiu da apresentação ao vivo
  },
  vigiar() { if (this.ativo && !this.souCtrl && Date.now() - this.visto > 15000) { const seguia = this.seguindo; this.ativo = false; this.seguindo = false; this.ctrl = null; aviso('A apresentação ao vivo foi encerrada (sem sinal de quem controlava).', 'erro'); if (seguia) rerender(); else this.atualizarBotoes(); } },
  atualizarBotoes() { $$('[data-vivo-b]').forEach(b => { const n = document.createElement('div'); n.innerHTML = botaoVivo(b.dataset.vivoB); b.replaceWith(n.firstElementChild); }); },
};
/* D-71 · contagem regressiva animada (5 s) antes do modo ao vivo, para quem aciona e para todos da unidade */
let CONTAGEM = null;
function mostrarContagem({ nome, souCtrl, ate, id = SESSAO_ID }) {
  fecharContagem();
  return new Promise(res => {
    const el = document.createElement('div'); el.className = 'ctg'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-labelledby', 'ctg-t'); el.dataset.ctrl = id;
    const C = 2 * Math.PI * 88;
    el.innerHTML = `<div class="ctg-c"><span class="ctg-eye"><i class="vv" aria-hidden="true"></i>Apresentação ao vivo · REDIA ${esc(CFG.uep)}</span>
      <h2 id="ctg-t">${souCtrl ? 'Você vai conduzir a reunião' : `${esc(nome)} vai conduzir a reunião`}</h2>
      <p>${souCtrl ? 'Os demais usuários passam a acompanhar a sua tela em' : 'Sua tela passa a acompanhar a dele em'}</p>
      <div class="ctg-r"><svg viewBox="0 0 200 200" width="200" height="200" aria-hidden="true"><circle cx="100" cy="100" r="88" class="ctg-bg"/><circle cx="100" cy="100" r="88" class="ctg-fg" style="stroke-dasharray:${C};stroke-dashoffset:0"/></svg><b class="ctg-n" aria-live="assertive">5</b></div>
      ${souCtrl ? '<button class="btn" data-ctg="cancelar">Cancelar</button>' : '<span class="note">Para não acompanhar, use “Sair” depois que a apresentação começar.</span>'}</div>`;
    document.body.appendChild(el);
    const fg = $('.ctg-fg', el), n = $('.ctg-n', el);
    const fim = ok => { clearInterval(t); el.classList.add('saindo'); setTimeout(() => el.remove(), 250); if (CONTAGEM?.el === el) CONTAGEM = null; res(ok); };
    const passo = () => { const rest = Math.max(0, ate - Date.now()), seg = Math.ceil(rest / 1000); if (n.textContent !== String(seg || 0) && seg > 0) { n.textContent = seg; n.classList.remove('pulsa'); void n.offsetWidth; n.classList.add('pulsa'); } fg.style.strokeDashoffset = (C * (1 - rest / 5000)).toFixed(1); if (rest <= 0) fim(true); };
    const t = setInterval(passo, 50); passo();
    CONTAGEM = { el, fim };
    $('[data-ctg="cancelar"]', el)?.addEventListener('click', () => fim(false));
  });
}
function fecharContagem(id) { if (CONTAGEM && (!id || CONTAGEM.el.dataset.ctrl === id)) CONTAGEM.fim(false); }
/* botão da apresentação ao vivo (Início, Curadoria e barra da apresentação): iniciar, assistir ou indicar que você controla */
function botaoVivo(cls = 'btn') {
  if (Vivo.souCtrl) return `<button class="${cls} vivo on" data-vivo-b="${cls}" data-act="vivo-ir" title="Você controla a apresentação ao vivo"><i class="vv" aria-hidden="true"></i>Ao vivo · você controla</button>`;
  if (Vivo.ativo) return `<button class="${cls} vivo" data-vivo-b="${cls}" data-act="vivo-assistir" title="Acompanhar a tela de ${esc(Vivo.ctrl?.nome || '')}"><i class="vv" aria-hidden="true"></i>Apresentação ao vivo · assistir</button>`;
  return `<button class="${cls} vivo" data-vivo-b="${cls}" data-act="vivo-iniciar" title="Leva todos os usuários para a apresentação, acompanhando a sua tela"><i class="vv" aria-hidden="true"></i>Apresentação ao vivo</button>`;
}
const DICA_VIVO = () => ` aria-disabled="true" data-tip="${esc(`Controle da reunião\nA apresentação ao vivo é conduzida por ${Vivo.ctrl?.nome || 'outro usuário'}${Vivo.ctrl?.posto ? ' (' + Vivo.ctrl.posto + ')' : ''}, que acionou o modo ao vivo. A troca de telas e o cronômetro seguem o controle dele.\nPara sair, use “Sair”; para voltar a assistir, “Apresentação ao vivo”.`)}" data-tip-sem="info" tabindex="0"`;

/* ======================= Apresentação ======================= */
let tickPres = null, ocultarCtrl = null;
/* D-61 (proposta 27): ao sair de um bloco com o cronômetro usado, grava o tempo medido (início, fim, segundos × timebox) como registro da reunião */
function registrarTempoBloco() {
  const P = UI.pres; if (!P.inicio || !USUARIO) return;
  const fim = Relogio.agora().toISOString(), segundos = Math.max(0, Math.round((Date.now() - P.inicioMs) / 1000) - Math.round((P.pausado || 0) / 1000));
  const payload = { tipo: 'tempo', bloco: P.bloco, inicio: P.inicio, fim, segundos, timebox: CFG.timeboxMin * 60, extras: P.extra || 0 };
  P.inicio = null; P.inicioMs = 0; P.pausado = 0; P.pausaEm = 0;
  if (segundos < 5) return;   // passagem relâmpago (navegação), não é apresentação
  registrar('reuniao', payload).then(() => { atualizarEstado(); }).catch(e => aviso('Tempo do bloco não registrado: ' + e.message, 'erro'));
}
function telaApresentacao(m) {
  const P = UI.pres, semana = m[1] === 'semana', b = semana ? P.bloco || 1 : +m[1];
  if (!semana && (P.bloco !== b || P.restante === null)) { if (P.bloco !== b) registrarTempoBloco(); P.bloco = b; P.restante = CFG.timeboxMin * 60; P.extra = 0; P.rodando = P.rodando && P.restante > 0; if (P.rodando) { P.inicio = Relogio.agora().toISOString(); P.inicioMs = Date.now(); P.pausado = 0; } }
  if (P.restante === null) P.restante = CFG.timeboxMin * 60;
  const ctx = { dia: DIA, congelada: congelada(), timer: fmtTimer(P.restante), extra: P.extra || 0 };
  const top = !semana && m[2] && topicoValido(b, m[2]) ? m[2] : null;
  const diaSem = parseData(DIA).getDay() === (CFG.diaVisaoSemanal ?? 5);
  const tela = semana ? telaSemana(E, ctx) : top ? telaDetalhe(estadoApresentacao(b), ctx, b, top) : TELAS[b - 1](estadoApresentacao(b), ctx);
  render(`<div class="pres" role="region" aria-label="Apresentação da REDIA"><div class="stw"><div class="stage">${tela}</div></div>${telaTempoEsgotado(b, semana)}</div>
    ${ctrlApresentacao(b, semana, diaSem)}`);
  ajustarPalco(); aplicarLayout($('.stage'), top ? null : telaIdDoBloco(semana ? 'semana' : b)); encaixar($('.stage')); atualizarTimer();   // D-73: layout publicado no Studio
  if (Vivo.seguindo) {   // D-67: quem assiste não navega nem mexe no cronômetro; os links dos cards também ficam travados
    $('.stage').addEventListener('click', e => { if (e.target.closest('a')) { e.preventDefault(); e.stopPropagation(); } }, true);
    $$('#esg [data-act]').forEach(x => { x.disabled = true; x.setAttribute('aria-disabled', 'true'); });
  } else {
    $('[data-act="tmr"]').onclick = alternarTimer;
    $$('[data-act="zera"]').forEach(x => x.onclick = zerarTimer); $$('[data-act="mais1"]').forEach(x => x.onclick = maisUmMinuto);
    $('[data-act="tela"]').onclick = telaCheia;
  }
  mostrarCtrl();
  if (Vivo.souCtrl) Vivo.transmitir();
}
/* barra de comandos da apresentação · D-67: quem assiste ao vivo vê os comandos desabilitados (com a dica de quem controla) e só "Sair" ativo */
function ctrlApresentacao(b, semana, diaSem) {
  const P = UI.pres;
  if (Vivo.seguindo) {
    const off = t => `<span class="btn sm off"${DICA_VIVO()}>${t}</span>`;
    return `<div class="ctrl vivo-seg" id="ctrl"><span class="vivo-tag"><i class="vv" aria-hidden="true"></i>Ao vivo · ${esc(Vivo.ctrl?.nome || '')}</span>${off('◀')}${[1, 2, 3, 4, 5].map(i => off(i).replace('btn sm off', `btn sm off${i === b && !semana ? ' on' : ''}`)).join('')}${off('▶')}${off('Semana')}${off((P.rodando ? 'Pausar' : 'Iniciar') + ' cronômetro')}${off('Zerar')}${off('+1 min')}${off('Tela cheia')}<a class="btn sm" href="#/inicio" data-act="vivo-sair">Sair</a></div>`;
  }
  return `<div class="ctrl" id="ctrl"><a class="btn sm" href="#/apresentacao/${Math.max(1, b - 1)}" aria-label="Bloco anterior">◀</a>
    ${[1, 2, 3, 4, 5].map(i => `<a class="btn sm${i === b && !semana ? ' on' : ''}" href="#/apresentacao/${i}">${i}</a>`).join('')}
    <a class="btn sm" href="#/apresentacao/${Math.min(5, b + 1)}" aria-label="Próximo bloco">▶</a><a class="btn sm${semana ? ' on' : ''}${diaSem && !semana ? ' hoje' : ''}" href="#/apresentacao/semana" title="Visão semanal: tendências de 7 e 30 dias, ações vencidas e recorrências${diaSem ? ' · hoje é o dia da visão semanal' : ''}">Semana${diaSem ? ' ●' : ''}</a>
    <button class="btn sm" data-act="tmr">${P.rodando ? 'Pausar' : 'Iniciar'} cronômetro</button><button class="btn sm" data-act="zera">Zerar</button><button class="btn sm" data-act="mais1" ${(P.extra || 0) >= EXTRA_MAX ? 'disabled' : ''} title="Acrescenta 1 minuto ao cronômetro deste bloco (até ${EXTRA_MAX} vezes por tela)">+1 min</button>
    <button class="btn sm" data-act="tela">Tela cheia</button>${Vivo.souCtrl ? '<button class="btn sm vivo on" data-act="vivo-fim" title="Encerra a apresentação ao vivo para todos"><i class="vv" aria-hidden="true"></i>Ao vivo · encerrar</button>' : botaoVivo('btn sm')}<a class="btn sm" href="#/inicio">Sair</a>
    <span class="cl">← → blocos · espaço cronômetro · + 1 min · F tela cheia</span></div>`;
}
function fmtTimer(s) { const neg = s < 0, a = Math.abs(s); return `${neg ? '+' : ''}${pad(Math.floor(a / 60))}:${pad(a % 60)}`; }
/* D-66: passou 1 minuto do tempo do bloco → cronômetro pulsa em vermelho (1 s entre o forte e o fraco); passou 2 minutos → tela de tempo esgotado */
const ESTOURO_PULSO = 60, ESTOURO_TELA = 120;
function atualizarTimer() {
  const r = UI.pres.restante, el = $('[data-tmr]');
  if (el) { el.textContent = fmtTimer(r); el.classList.toggle('alerta', r <= 60 && r >= -ESTOURO_PULSO); el.classList.toggle('pulso', r < -ESTOURO_PULSO); }
  const tx = $('[data-tx]'); if (tx) { tx.innerHTML = iconesExtra(UI.pres.extra || 0); tx.setAttribute('aria-label', `${UI.pres.extra || 0} de ${EXTRA_MAX} acréscimos de 1 minuto usados`); }
  const esg = $('#esg'); if (esg) { const on = r < -ESTOURO_TELA; if (esg.hidden === on) { esg.hidden = !on; if (on) $('[data-act="zera"]', esg)?.focus({ preventScroll: true }); } const c = $('[data-esg-t]', esg); if (c) c.textContent = fmtTimer(r); }
  $$('[data-act="mais1"]').forEach(x => x.disabled = (UI.pres.extra || 0) >= EXTRA_MAX);
}
function zerarTimer() { if (Vivo.seguindo) return; const P = UI.pres; P.restante = CFG.timeboxMin * 60; P.rodando = false; P.inicio = null; P.inicioMs = 0; P.pausado = 0; P.pausaEm = 0; P.extra = 0; rerender(); }
function maisUmMinuto() { if (Vivo.seguindo) return; const P = UI.pres; if ((P.extra || 0) >= EXTRA_MAX) return aviso(`Limite de ${EXTRA_MAX} acréscimos de 1 minuto nesta tela.`, 'erro'); P.extra = (P.extra || 0) + 1; P.restante += 60; atualizarTimer(); mostrarCtrl(); Vivo.transmitir(); }
/* D-66 · tempo esgotado: tela branca sobre a apresentação, com o aviso, o estouro correndo e as saídas (zerar, +1 min, próximo bloco) */
function telaTempoEsgotado(b, semana) {
  const nome = semana ? 'Visão semanal' : ['Abertura · GEPLAT', 'COPROD', 'COEMB', 'COMAN', 'Fechamento'][b - 1];
  return `<div class="esg" id="esg" role="alertdialog" aria-modal="true" aria-labelledby="esg-h" aria-describedby="esg-d" hidden>
    <div class="esg-c"><span class="esg-ic" aria-hidden="true"><svg viewBox="0 0 48 48" width="100%" height="100%"><path d="M14 6h20M14 42h20M16 6c0 9 8 12 8 18s-8 9-8 18M32 6c0 9-8 12-8 18s8 9 8 18" fill="none" stroke="#DA291C" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.5 38.5c1.5-3 3-4.2 4.5-4.2s3 1.2 4.5 4.2z" fill="#DA291C"/></svg></span>
      <span class="esg-eye">REDIA ${esc(CFG.uep)} · ${semana ? 'visão semanal' : `bloco ${b} de 5`} · ${esc(nome)}</span>
      <h1 id="esg-h">Tempo esgotado</h1>
      <p id="esg-d" class="esg-sub">Vamos fechar este assunto e seguir a pauta.</p>
      <div class="esg-t"><b data-esg-t>${fmtTimer(UI.pres.restante)}</b><span>além dos ${CFG.timeboxMin} minutos do bloco</span></div>
      <ol class="esg-p"><li><b>1</b>Registre a decisão tomada</li><li><b>2</b>Pendência vira demanda do Canal Base x Bordo</li><li><b>3</b>Avance para o próximo bloco</li></ol>
      <div class="esg-b"><button class="btn pri" data-act="zera">Zerar e voltar à apresentação</button><button class="btn" data-act="mais1" ${(UI.pres.extra || 0) >= EXTRA_MAX ? 'disabled' : ''}>+1 min</button>${!semana && b < 5 ? `<a class="btn" href="#/apresentacao/${b + 1}">Próximo bloco ▶</a>` : ''}</div></div></div>`;
}
function alternarTimer() {
  if (Vivo.seguindo) return;
  const P = UI.pres; P.rodando = !P.rodando; P.ult = Date.now();
  if (P.rodando) { if (!P.inicio) { P.inicio = Relogio.agora().toISOString(); P.inicioMs = Date.now(); P.pausado = 0; } else if (P.pausaEm) { P.pausado = (P.pausado || 0) + (Date.now() - P.pausaEm); P.pausaEm = 0; } }
  else P.pausaEm = Date.now();
  const b = $('[data-act="tmr"]'); if (b) b.textContent = (P.rodando ? 'Pausar' : 'Iniciar') + ' cronômetro';
  Vivo.transmitir();
}
function ajustarPalco() {
  const w = $('.stw'); if (!w) return;
  const s = Math.min(innerWidth / 1920, innerHeight / 1080);
  w.style.transform = `scale(${s})`; w.style.left = ((innerWidth - 1920 * s) / 2) + 'px'; w.style.top = ((innerHeight - 1080 * s) / 2) + 'px';
}
function telaCheia() { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => { }); else document.exitFullscreen?.(); }
/* D-66 · dica dos semáforos diferentes de OK: aparece ao parar o mouse (ou focar) sobre o semáforo; texto em data-tip (estado + linhas).
   Sem data-tip, um semáforo marcado com data-sem usa o contexto da linha em que está. */
function textoDica(el) {
  if (el.dataset.tip) { const [t, ...l] = el.dataset.tip.split('\n'); return { sem: el.dataset.tipSem || el.dataset.sem || 'at', t, l }; }
  const sem = el.dataset.sem, ctx = el.closest('.li, .row2, .tgc, .dq, .dqx, .th2, .dl, .td, .w, tr, .hd') || el.parentElement;
  const card = el.closest('.card, .pn')?.querySelector('.hd .t, h2, h3')?.textContent.trim().replace(/\s*›$/, '') || '';
  const txt = (ctx?.textContent || '').replace(/\s+/g, ' ').trim();
  return { sem, t: TIP_TIT[sem] || 'Atenção', l: [card ? `${card}: ${txt}` : txt].filter(Boolean) };
}
function iniciarDicas() {
  const box = document.createElement('div'); box.className = 'dica'; box.id = 'dica'; box.setAttribute('role', 'tooltip'); box.hidden = true; document.body.appendChild(box);
  let alvo = null;
  const esconder = () => { alvo = null; box.hidden = true; };
  const mostrar = el => {
    alvo = el; if (el.title) { el.dataset.tituloOrig = el.title; el.removeAttribute('title'); }
    const d = textoDica(el);
    box.className = 'dica s-' + (d.sem || 'at');
    box.innerHTML = `<b class="dica-t">${(SH[d.sem] || SH.at)(16)}${esc(d.t)}</b>${d.l.map(x => `<span>${esc(x)}</span>`).join('')}`;
    box.hidden = false;
    const r = el.getBoundingClientRect(), w = box.offsetWidth, h = box.offsetHeight, m = 10;
    let x = r.left + r.width / 2 - w / 2, y = r.bottom + m;
    if (y + h > innerHeight - 6) y = r.top - h - m;
    box.style.left = Math.max(6, Math.min(innerWidth - w - 6, x)) + 'px'; box.style.top = Math.max(6, y) + 'px';
  };
  const alvoDe = t => t?.closest?.('[data-tip], [data-sem]');
  document.addEventListener('mouseover', e => { const el = alvoDe(e.target); if (el === alvo) return; el ? mostrar(el) : esconder(); });
  document.addEventListener('focusin', e => { const el = alvoDe(e.target); el ? mostrar(el) : esconder(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') esconder(); });
  addEventListener('scroll', esconder, true); addEventListener('hashchange', esconder); addEventListener('resize', esconder);
}
function mostrarCtrl() { const c = $('#ctrl'); if (!c) return; c.classList.remove('hide'); clearTimeout(ocultarCtrl); ocultarCtrl = setTimeout(() => c.classList.add('hide'), 3000); }

/* ======================= Fechamento e ata ======================= */
/* D-67 · "de acordo" de cada responsável (coordenadores e GEPLAT que participaram; supervisor que cobriu o coordenador) antes de fechar a ata */
const regsDoDia = () => [...Store.cache.values()].filter(r => r.data === DIA && r.escopo !== 'demandas');
function situacaoAcordos() {
  const regs = regsDoDia(), falta = faltaAcordo(regs), resp = responsaveisDe(regs), ord = regs.slice().sort(ordem);
  const pauta = ord.filter(x => x.tipo === 'congelamento' || x.tipo === 'reabertura'), cong = pauta[pauta.length - 1], valeDesde = cong?.tipo === 'congelamento' ? ord.indexOf(cong) : Infinity;
  return resp.map(rp => ({ ...rp, acordo: ord.slice(valeDesde + 1).filter(a => a.tipo === 'acordo' && a.payload.coord === rp.coord && (!rp.chave || a.autor?.chave === rp.chave)).pop() || null, pendente: falta.some(f => f.coord === rp.coord) }));
}
const souResponsavel = rp => rp.chave ? rp.chave === USUARIO?.chave : (USUARIO?.coord === rp.coord || (MODO_NUVEM && USUARIO?.admin));
const podeFecharAta = () => !ataFechada() && rediaIniciada() && congelada() && situacaoAcordos().every(x => !x.pendente);
function motivoAtaFechamento() {
  if (ataFechada()) return 'Ata fechada.';
  if (!rediaIniciada()) return 'A REDIA do dia ainda não foi iniciada.';
  if (!congelada()) return 'Congele a pauta para colher o de acordo dos responsáveis e fechar a ata.';
  const f = situacaoAcordos().filter(x => x.pendente);
  return f.length ? `Aguardando o de acordo de: ${f.map(x => `${x.coord}${x.nome ? ' (' + x.nome + ')' : ''}`).join(', ')}.` : 'Todos deram o de acordo: a ata pode ser fechada.';
}
function acordoHtml() {
  const sa = situacaoAcordos(), cong = congelada();
  return `<div class="acd"><h3>De acordo para o fechamento</h3>
    <p class="note">Cada coordenador e o GEPLAT que participaram do preenchimento (ou o supervisor que cobriu o coordenador) confirma que a REDIA pode ser encerrada. Só então o fechamento da ata é liberado; depois de fechada, a ata vai para a base e não pode mais ser alterada.</p>
    <div class="tbw"><table class="tb acd-t"><thead><tr><th>Coordenação</th><th>Responsável</th><th>Situação</th><th></th></tr></thead><tbody>
    ${sa.map(x => `<tr data-acd="${x.coord}"><td><b>${x.coord}</b></td><td>${x.chave ? esc(x.nome) + ` <span class="note">${esc(x.chave)}</span>` : '<span class="note">qualquer usuário do ' + x.coord + '</span>'}</td><td>${x.acordo ? `<span class="chip ok">${SH.ok(13)}De acordo · ${hhmm(x.acordo.criadoEm)}</span>` : '<span class="chip at">Pendente</span>'}</td><td>${!x.acordo && souResponsavel(x) ? `<button class="btn sm pri" data-acordo="${x.coord}" ${cong ? '' : 'disabled title="Congele a pauta primeiro"'}>Dar de acordo</button>` : ''}</td></tr>`).join('')}
    </tbody></table></div>${cong ? '' : '<p class="note"><b>A pauta não está congelada:</b> o de acordo é colhido depois do congelamento (uma reabertura invalida os de acordo anteriores).</p>'}</div>`;
}
function telaAta() {
  const f = fase(), cong = E.congelamento;
  const hoje = E.demandas.filter(d => d.payload.dataRedia === DIA), ant = E.demandas.filter(d => d.payload.dataRedia !== DIA && d.payload.status !== 'encerrada');
  const trans = E.anexos.filter(a => a.payload.tipo === 'transcricao');
  const ata = E.atas[E.atas.length - 1];
  const apr = E.sugestoes.filter(s => s.decisao?.payload.acao === 'aprovar').length, rec = E.sugestoes.filter(s => s.decisao?.payload.acao === 'recusar').length;
  const dec = reuniaoDe(E, 'decisao'), apz = reuniaoDe(E, 'aprendizado'), tb = temposBlocos(E), tx = taxaPrazo(E, DIA), escl = escalados(E), mmss = seg => seg == null ? '—' : `${Math.floor(seg / 60)}:${pad(Math.round(seg % 60))}`;   // D-61
  render(cabecalhoApp({ id: 'ata', titulo: 'Fechamento e ata' }) + `<div class="wrap"><div class="grid2">
    <section class="pn"><h2>Pauta do dia</h2>
      ${cong ? `<div class="banner ok">Pauta congelada às <b>${hhmm(cong.criadoEm)}</b> por ${esc(cong.autor.nome)} · código de integridade <b>${esc(cong.payload.hash)}</b>.</div>` : `<div class="banner">${f.id === 'congelar' ? 'Já passou das ' + CFG.horarios.congelamento + '. ' : ''}A pauta ainda não foi congelada. Congelar grava a versão oficial e bloqueia a curadoria.</div>`}
      <div class="row">${cong ? `<button class="btn sec" data-act="reabrir-pauta">Reabrir pauta</button><input id="mot-re" class="in" style="width:260px" placeholder="Motivo da reabertura">` : '<button class="btn pri" data-act="congelar">Congelar pauta agora</button>'}
        <a class="btn sec" href="#/imprimir">Imprimir / salvar PDF da pauta</a><a class="btn sec" href="#/apresentacao/1">Apresentar</a></div>
      <p class="note">O PDF sai pela impressão do navegador (“Salvar como PDF”), uma página 16:9 por bloco. ${Store.remoto() ? 'O congelamento também guarda uma cópia (pauta_congelada.json) nos arquivos da REDIA na base.' : ''}</p>
    </section>
    <section class="pn"><h2>Retorno às passagens de serviço</h2>
      <div class="row" style="gap:28px"><div class="kpi"><b>${apr}</b><span class="note">itens aprovados</span></div><div class="kpi"><b>${rec}</b><span class="note">recusados</span></div></div>
      <p class="note">Quando a integração com o app de passagem estiver liberada (T-05), o status volta ao supervisor na troca de turno seguinte. Nesta versão ele fica registrado na base.</p>
    </section></div>
    <div class="grid2" style="margin-top:16px">
      <section class="pn"><h2>Decisões tomadas na reunião</h2>
        <p class="note">D-61: decisões separadas das demandas, com quem decidiu. Podem ser registradas com a pauta congelada (durante e após a REDIA) e entram na ata e na tela Fechamento.${escl.length ? ` <b>${escl.length} item(ns) marcado(s) “Escalar”</b> aguardam decisão do GEOP ou da gerência: ${escl.map(d => esc(d.coord + ': ' + d.titulo)).join('; ')}.` : ''}</p>
        <div class="tbw"><table class="tb"><thead><tr><th>Decisão</th><th>Decidido por</th><th>Coordenação</th><th>Hora</th><th></th></tr></thead><tbody>
        ${dec.map(d => `<tr><td><b>${esc(d.payload.texto)}</b></td><td>${esc(d.payload.por || d.autor.nome)}</td><td>${esc(d.payload.coord || '—')}</td><td class="nw">${hhmm(d.criadoEm)}</td><td>${cong ? '' : `<button class="btn sm lnk" data-rm-reu="${d.id}">Remover</button>`}</td></tr>`).join('') || '<tr><td colspan="5" class="note">Nenhuma decisão registrada.</td></tr>'}
        </tbody></table></div>
        <div class="fgrid" style="margin-top:8px"><div style="grid-column:span 2"><label class="lbl" for="dc-txt">Decisão</label><input id="dc-txt" class="in" maxlength="160"></div>
          <div><label class="lbl" for="dc-por">Decidido por (função)</label><input id="dc-por" class="in" placeholder="ex.: GEOP" value="${esc(USUARIO?.posto || '')}"></div>
          <div><label class="lbl" for="dc-coord">Coordenação</label><select id="dc-coord" class="in">${['GEPLAT', 'COPROD', 'COEMB', 'COMAN'].map(c => `<option>${c}</option>`).join('')}</select></div></div>
        <div class="row end" style="margin-top:8px"><button class="btn pri" data-act="add-decisao">Registrar decisão</button></div></section>
      <section class="pn"><h2>Aprendizados do dia</h2>
        <p class="note">O que a reunião aprendeu e vale repetir ou evitar (huddles). Entram na ata e na tela Fechamento.</p>
        <ul class="lst">${apz.map(a => `<li>${esc(a.payload.texto)} <span class="note">· ${esc(a.autor.nome)} · ${hhmm(a.criadoEm)}</span>${cong ? '' : ` <button class="btn sm lnk" data-rm-reu="${a.id}">Remover</button>`}</li>`).join('') || '<li class="note">Nenhum aprendizado registrado.</li>'}</ul>
        <label class="lbl" for="ap-txt">Aprendizado</label><input id="ap-txt" class="in" maxlength="200">
        <div class="row end" style="margin-top:8px"><button class="btn pri" data-act="add-aprendizado">Registrar aprendizado</button></div>
        <h3>Tempo por bloco · medido pelo cronômetro da apresentação</h3>
        <div class="tbw"><table class="tb"><thead><tr><th>Bloco</th><th>Previsto</th><th>Medido</th><th>Estouro</th><th>Início · fim</th></tr></thead><tbody>
        ${tb.linhas.map(l => `<tr><td>${esc(l.nome)}</td><td>${mmss(l.timebox)}</td><td><b>${mmss(l.segundos)}</b></td><td>${l.segundos == null ? '—' : l.estouro > 0 ? '<span class="chip at">+' + mmss(l.estouro) + '</span>' : '<span class="chip ok">0:00</span>'}</td><td class="nw note">${l.inicio ? hhmm(l.inicio) + ' · ' + hhmm(l.fim) : '—'}</td></tr>`).join('')}
        </tbody></table></div>
        <p class="note">${tb.medidos ? `${tb.medidos} de 5 blocos medidos · ${mmss(tb.total)} de ${mmss(tb.previsto)} previstos · estouro total ${mmss(tb.estouro)}.` : 'Inicie o cronômetro na apresentação: ao trocar de bloco o tempo é registrado aqui e na ata.'}</p></section>
    </div>
    <section class="pn" style="margin-top:16px"><h2>Demandas registradas nesta REDIA</h2>${tabelaDemandas(hoje)}<h3>Nova demanda</h3>${formDemanda(null)}</section>
    <section class="pn" style="margin-top:16px"><h2>Demandas de reuniões anteriores em aberto</h2>
      <p class="note">Fechadas no prazo no mês (D-61): <b>${tx.pct != null ? fmtN(tx.pct, 0) + '%' : '—'}</b>${tx.n ? ` · ${tx.ok} de ${tx.n} decididas` : ' · nenhuma demanda do mês decidida ainda'}${tx.porCoord.length ? ' · por coordenação: ' + tx.porCoord.map(g => `${esc(g.k)} ${fmtN(g.pct, 0)}% (${g.ok}/${g.n})`).join(', ') : ''}${tx.porSentido.length ? ' · por sentido: ' + tx.porSentido.map(g => `${esc(g.k)} ${fmtN(g.pct, 0)}%`).join(', ') : ''}.</p>
      ${tabelaDemandas(ant)}</section>
    <div class="grid2" style="margin-top:16px">
      <section class="pn"><h2>Transcrição do Teams</h2>
        ${trans.length ? trans.map(t => `<p>Anexada: <b>${esc(t.payload.nome)}</b> (${fmtN(t.payload.tamanho / 1024, 0)} kB) por ${esc(t.autor.nome)} às ${hhmm(t.criadoEm)}${t.payload.caminho ? ` <button class="btn sm sec" data-arq="${esc(t.payload.caminho)}">Baixar</button>` : ''}</p>`).join('') : '<p class="note">Baixe a transcrição da reunião no Teams (.docx ou .vtt) e anexe aqui.</p>'}
        <label class="btn sec" for="trans">Anexar transcrição</label><input id="trans" type="file" accept=".docx,.vtt,.txt,.pdf" hidden>
        ${!Store.remoto() ? '<p class="note">No modo demonstração só o nome do arquivo é registrado.</p>' : '<p class="note">Limite de 25 MB por arquivo.</p>'}
      </section>
      <section class="pn"><h2>Ata ${E.redia ? `<span class="mono note">${esc(E.redia.payload.codigo || '')}</span>` : ''}</h2>
        ${ata ? `<div class="banner ok"><b>Ata fechada e arquivada</b> por ${esc(ata.autor.nome)} às ${hhmm(ata.criadoEm)} · ${esc(ata.payload.codigo || '')}${ata.payload.paginas ? ` · PDF com ${ata.payload.paginas} páginas (${ata.payload.telas} telas)` : ''}. O documento é final: não pode mais ser alterado. ${ata.payload.caminho ? `<button class="btn sm sec" data-arq="${esc(ata.payload.caminho)}">Baixar PDF da ata</button>` : ''}</div>` : acordoHtml()}
        <label class="lbl" for="at-part">Participantes (um por linha)</label><textarea id="at-part" class="in" rows="4" ${ata ? 'readonly' : ''}>${esc((ata?.payload.participantes || []).join('\n'))}</textarea>
        <label class="lbl" for="at-obs">Decisões e observações</label><textarea id="at-obs" class="in" rows="4" ${ata ? 'readonly' : ''}>${esc(ata?.payload.observacoes || '')}</textarea>
        <p class="note">A ata sai em <b>PDF</b>: o relatório e, em seguida, o print de todas as telas da apresentação (blocos e detalhes), capturadas no momento do fechamento, uma por página em paisagem, com os dados de referência da REDIA. ${E.congelamento ? 'As telas vêm da pauta congelada.' : 'A pauta não está congelada: as telas vêm da versão em edição.'}</p>
        ${ata ? '' : `<div class="row end" style="margin-top:8px"><button class="btn sec" data-act="ver-ata">Baixar prévia em PDF</button><button class="btn pri" data-act="fechar-ata" ${podeFecharAta() ? '' : 'disabled'} title="${esc(podeFecharAta() ? 'Gera o PDF final, grava na base e encerra a REDIA' : motivoAtaFechamento())}">Fechar ata e gerar PDF</button></div><p class="note">${esc(motivoAtaFechamento())}</p>`}
      </section></div>
  </div><iframe id="ifr-ata" title="Ata para impressão" style="position:absolute;width:0;height:0;border:0"></iframe>`);
  bindDemandas();
  const on = (a, fn) => { const b = $(`[data-act="${a}"]`); if (b) b.onclick = fn; };
  $$('[data-acordo]').forEach(b => b.onclick = () => salvarE('acordo', { coord: b.dataset.acordo, codigo: E.redia?.payload.codigo || codigoRedia(CFG.uep, DIA) }, {}, `De acordo registrado (${b.dataset.acordo}).`));
  on('add-decisao', () => { const t = $('#dc-txt').value.trim(); if (!t) return aviso('Descreva a decisão.', 'erro'); salvarE('reuniao', { tipo: 'decisao', texto: t, por: $('#dc-por').value.trim() || USUARIO?.nome || '', coord: $('#dc-coord').value }, {}, 'Decisão registrada.'); });
  on('add-aprendizado', () => { const t = $('#ap-txt').value.trim(); if (!t) return aviso('Descreva o aprendizado.', 'erro'); salvarE('reuniao', { tipo: 'aprendizado', texto: t }, {}, 'Aprendizado registrado.'); });
  $$('[data-rm-reu]').forEach(b => b.onclick = () => salvarE('remove', { alvo: b.dataset.rmReu }, {}, 'Registro removido.'));
  on('congelar', congelarPauta);
  on('reabrir-pauta', () => { const m = $('#mot-re').value.trim(); if (!m) return aviso('Informe o motivo da reabertura.', 'erro'); descongelarPauta(m); });
  $$('[data-arq]').forEach(b => b.onclick = async () => {
    const c = b.dataset.arq; b.disabled = true;
    try { baixar(c.split('/').pop(), await Nuvem.baixarArquivo(c), 'application/octet-stream'); } catch (e) { aviso(e.message, 'erro'); }
    b.disabled = false;
  });
  const tr = $('#trans'); tr.onchange = async () => {
    const f = tr.files[0]; if (!f) return;
    try {
      const nome = 'transcricao_' + f.name.replace(/[^\w.\-]+/g, '_');
      if (f.size > 25 * 1024 * 1024) return aviso('Arquivo acima de 25 MB.', 'erro');
      const caminho = await Store.gravarArquivo(DIA, nome, f, f.type || 'application/octet-stream');
      await salvarE('anexo', { tipo: 'transcricao', nome: f.name, tamanho: f.size, caminho }, {}, 'Transcrição anexada.');
    } catch (e) { aviso(e.message, 'erro'); }
  };
  const dadosAta = () => ({ participantes: $('#at-part').value.split('\n').map(s => s.trim()).filter(Boolean), observacoes: $('#at-obs').value.trim() });
  /* D-55: ata em PDF = relatório + print de todas as telas da apresentação, capturadas agora */
  const gerando = ativo => $$('[data-act="ver-ata"],[data-act="fechar-ata"]').forEach(b => b.disabled = ativo);
  on('ver-ata', async () => {
    gerando(true);
    try { const r = await gerarAtaPdf(dadosAta()); baixar(`ata_REDIA_${CFG.uep}_${DIA}_previa.pdf`, r.blob, 'application/pdf'); aviso(`Prévia da ata baixada (${r.paginas} páginas). Nada foi registrado.`, 'ok'); }
    catch (e) { $('.ata-prog')?.remove(); aviso('Não foi possível gerar o PDF: ' + e.message, 'erro'); }
    gerando(false);
  });
  on('fechar-ata', async () => {
    gerando(true);
    try {
      if (Store.remoto()) { await Store.sincronizar(); atualizarEstado(); }
      if (!podeFecharAta()) { gerando(false); aviso(motivoAtaFechamento(), 'erro'); return rerender(); }
      const d = dadosAta(), cod = E.redia?.payload.codigo || codigoRedia(CFG.uep, DIA), r = await gerarAtaPdf({ ...d, codigo: cod }), nome = `ata_${cod}.pdf`;
      const caminho = await Store.gravarArquivo(DIA, nome, r.blob, 'application/pdf');
      await registrar('ata', { ...d, codigo: cod, caminho, formato: 'pdf', paginas: r.paginas, telas: r.telas, acordos: situacaoAcordos().map(x => ({ coord: x.coord, nome: x.acordo?.autor?.nome || '', chave: x.acordo?.autor?.chave || '', em: x.acordo?.criadoEm || null })) });
      if (!caminho) baixar(nome, r.blob, 'application/pdf');
      atualizarEstado(); aviso(caminho ? `Ata em PDF gravada nos arquivos da REDIA (${r.paginas} páginas).` : `Ata em PDF gerada e baixada (${r.paginas} páginas).`, 'ok'); rerender();
    } catch (e) { $('.ata-prog')?.remove(); gerando(false); await tratarErroGravacao(e); }
  });
}
function gerarAtaHtml(d) {
  const S = E.congelamento ? { ...E, ...E.congelamento.payload.snapshot } : E;
  const linhaV = (rot, campo, dec, un) => `<tr><td>${esc(rot)}</td><td>${fmtU(VN(S, campo), dec, un)}</td><td>${esc(S.valores[campo]?.origem || '')} ${esc(S.valores[campo]?.fonte || '')}</td></tr>`;
  const dem = E.demandas.filter(x => x.payload.dataRedia === DIA);
  const blocoC = c => {
    const ap = destaquesDe(S, c), am = itensDe(S, c, 'ameaca'), at = atividadesAbertura(S, c);
    return `<h3>${c} · ${COORD_NOME[c]}</h3>
      ${ap.length ? `<p><b>Destaques</b></p><ul>${ap.map(d => `<li>[${SEM_NOME[d.semaforo]}] ${esc(d.titulo)}${d.pedido ? ' · pedido à base: ' + esc(d.pedido) : ''} <i>(${d.fonte === 'PS' ? 'PS ' + esc(d.ref.payload.passagem) : 'coordenação'}${d.abertura && c !== 'GEPLAT' ? ' · apresentado na abertura' : ''})</i></li>`).join('')}</ul>` : ''}
      ${am.length ? `<p><b>Ameaças</b></p><ul>${am.map(i => `<li>[${SEM_NOME[i.payload.semaforo]}] ${esc(i.payload.texto)}</li>`).join('')}</ul>` : ''}
      ${at.length ? `<p><b>Principais atividades</b></p><ul>${at.map(s => `<li>${esc(s.payload.titulo)} (${esc(s.payload.origem)})</li>`).join('')}</ul>` : ''}`;
  };
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Ata REDIA ${esc(CFG.uep)} ${ddmmaaaa(DIA)}</title>
  <style>body{font-family:'Petrobras Sans',Arial,sans-serif;color:#000;margin:32px 40px;font-size:12pt;line-height:1.4}h1{font-size:22pt;margin:0}h2{font-size:14pt;margin:22px 0 6px;border-bottom:2px solid #008542;padding-bottom:3px}h3{font-size:12pt;margin:14px 0 4px}
  .k{color:#008542;font-weight:700;font-size:10pt}.dash{width:30px;height:3px;background:#FDC82F;margin:6px 0 14px}table{border-collapse:collapse;width:100%;font-size:10.5pt}td,th{border-bottom:1px solid #E8E8E8;padding:4px 6px;text-align:left;vertical-align:top}th{border-bottom:2px solid #000}
  .selo{display:inline-flex;align-items:center;gap:6px;font-size:10pt;color:#75787B}.selo i{display:inline-flex;width:18px;height:18px;border-radius:50%;background:#008542;color:#fff;font-style:normal;font-weight:800;align-items:center;justify-content:center;font-size:10pt}
  @page{size:A4;margin:16mm}</style></head><body>
  <div class="k">REDIA ${esc(CFG.uep)} · Reunião diária bordo × base</div><h1>Ata de ${diaSemana(DIA).toLowerCase()}, ${ddmmaaaa(DIA)}</h1><div class="dash"></div>
  <p><span class="selo"><i>I</i>INTERNA</span></p>
  <p>Pauta ${E.congelamento ? `congelada às ${hhmm(E.congelamento.criadoEm)} por ${esc(E.congelamento.autor.nome)} · código de integridade ${esc(E.congelamento.payload.hash)}` : '<b>não congelada</b> (ata gerada a partir da versão em edição)'}. Ata gerada em ${hhmm(Relogio.agora())} por ${esc(USUARIO?.nome || '(sem nome)')}.</p>
  <h2>Participantes</h2>${d.participantes.length ? `<ul>${d.participantes.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : '<p>—</p>'}
  <h2>Situação da unidade</h2><p>[${SEM_NOME[V(S, 'geplat.situacao_sem')] || '—'}] ${esc(V(S, 'geplat.situacao') || '—')}</p>
  <table><tr><th>Indicador</th><th>Valor</th><th>Origem</th></tr>${linhaV('Produção de óleo (D-1)', 'oleo.real', 0, 'm³/d')}${linhaV('Potencial', 'oleo.potencial', 0, 'm³/d')}${linhaV('IUGA (D-1)', 'iuga.real', 2, '%')}${linhaV('Injeção de gás', 'gas.real', 0, 'Mm³/d')}${linhaV('Injeção de água', 'agua.real', 0, 'm³/d')}${linhaV('Estoque', 'off.estoque', 0, 'm³')}${linhaV('POB', 'pob.atual', 0, '')}</table>
  <h2>Blocos</h2>${['COPROD', 'COEMB', 'COMAN'].map(blocoC).join('')}
  <h3>Pauta extra</h3><ul><li>Tema do dia: ${esc(CFG.pautaExtra[parseData(DIA).getDay()] || '—')}</li>${itensDe(S, 'GEPLAT', 'pauta_extra').map(i => `<li>[${SEM_NOME[i.payload.semaforo]}] ${esc(i.payload.texto)}: ${esc(i.payload.detalhe || '')}</li>`).join('')}</ul>
  <h2>Demandas registradas na reunião</h2>${dem.length ? `<table><tr><th>#</th><th>Demanda</th><th>Sentido</th><th>Responsável</th><th>Prazo</th><th>Origem</th></tr>${dem.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.payload.titulo)}</td><td>${esc(x.payload.sentido)}</td><td>${esc(x.payload.responsavel)}</td><td>${x.payload.prazo ? ddmmaaaa(x.payload.prazo) : '—'}</td><td>${esc(x.payload.origem)} ${esc(x.payload.coord)}</td></tr>`).join('')}</table>` : '<p>Nenhuma.</p>'}
  <h2>Decisões e observações</h2><p>${esc(d.observacoes || '—').replace(/\n/g, '<br>')}</p>
  <h2>Transcrição</h2><p>${E.anexos.filter(a => a.payload.tipo === 'transcricao').map(a => esc(a.payload.nome) + (a.payload.caminho ? ' · ' + esc(a.payload.caminho) : '')).join('<br>') || 'Não anexada.'}</p>
  </body></html>`;
}

/* ======================= Imprimir pauta ======================= */
function telaImprimir() {
  const ctx = { dia: DIA, congelada: congelada(), timer: fmtTimer(CFG.timeboxMin * 60) };
  render(cabecalhoApp({ id: 'imprimir', titulo: 'Imprimir pauta' }) + `<div class="wrap"><div class="banner">A janela de impressão abre em seguida. Escolha “Salvar como PDF”. <a class="btn sm sec" href="#/ata">Voltar</a></div></div>`);
  let pr = $('.printroot'); if (pr) pr.remove();
  pr = document.createElement('div'); pr.className = 'printroot';
  pr.innerHTML = TELAS.map((t, i) => `<div class="stage">${t(estadoApresentacao(i + 1), ctx)}</div>`).join('');
  document.body.appendChild(pr);
  pr.style.display = 'block'; pr.style.position = 'absolute'; pr.style.left = '-99999px';
  $$('.stage', pr).forEach(encaixar);
  pr.style.cssText = '';
  setTimeout(() => { window.print(); }, 300);
}

/* ======================= Arquivo das REDIAs (D-65) =======================
   Uma linha por REDIA com pauta congelada ou ata: quem congelou e quando (código de integridade), reaberturas,
   ata (quem fechou, páginas) e o PDF — o arquivado nos arquivos da REDIA (Storage) ou gerado na hora a partir da pauta congelada daquele dia. */
/* ======================= Arquivo das atas + busca (D-65, D-67; substitui a tela Histórico da D-63) ======================= */
const TIPO_NOME = { sugestao: 'Sugestão (passagem)', item: 'Item da coordenação', demanda: 'Demanda · Canal Base x Bordo', servico: 'Serviço do dia', reuniao: 'Reunião', decisao: 'Decisão da curadoria', valor: 'Dado', lista: 'Lista' };
function textoRegistro(r) {
  const p = r.payload || {};
  if (r.tipo === 'valor') return `${CAMPO[p.campo]?.rot || p.campo}: ${p.valor}`;
  if (r.tipo === 'lista') return `${LISTA[p.campo]?.rot || p.campo} · ${(p.itens || []).length} linha(s)`;
  if (r.tipo === 'reuniao') return `${{ decisao: 'Decisão', aprendizado: 'Aprendizado', tempo: 'Tempo do bloco' }[p.tipo] || p.tipo}: ${p.texto || (p.bloco ? 'bloco ' + p.bloco : '')}`;
  if (r.tipo === 'decisao') return `${{ aprovar: 'Aprovada', recusar: 'Recusada', adiar: 'Adiada', mesclar: 'Mesclada', reabrir: 'Reaberta' }[p.acao] || p.acao}: ${p.titulo || p.motivo || ''}`;
  return p.titulo || p.texto || '';
}
const ARQ_TIPOS = { '': ['Todo o conteúdo', null], dados: ['Dados e listas', ['valor', 'lista']], destaques: ['Sugestões e destaques', ['sugestao', 'decisao']], itens: ['Ameaças, oportunidades e pauta extra', ['item']], canal: ['Canal Base x Bordo', ['demanda']], servicos: ['Serviços do dia', ['servico']], reuniao: ['Decisões e aprendizados da reunião', ['reuniao']] };
const filtrosArq = () => UI.arq || (UI.arq = { q: '', de: '', ate: '', coord: '', tipo: '' });
const arqAtivo = f => !!(f.q.trim().length >= 2 || f.de || f.ate || f.coord || f.tipo);
/* o PDF da ata: o arquivo gravado no fechamento ou, sem ele (histórico de exemplo, demonstração), o mesmo relatório montado da REDIA arquivada */
async function baixarPdfAta(ata, botao) {
  const p = ata.payload || {}, dia = ata.data, cod = p.codigo || codigoRedia(CFG.uep, dia);
  $$('[data-arq-pdf]').forEach(x => x.disabled = true);
  try {
    if (p.caminho && Store.remoto()) { baixar(`ata_${cod}.pdf`, await Nuvem.baixarArquivo(p.caminho), 'application/pdf'); return; }
    const atual = DIA;
    try { DIA = dia; await Store.carregar(dia); atualizarEstado(); const r = await gerarAtaPdf({ participantes: p.participantes || [], observacoes: p.observacoes || '', codigo: cod, acordos: p.acordos }); baixar(`ata_${cod}.pdf`, r.blob, 'application/pdf'); aviso(`PDF da ata ${cod} (${r.paginas} páginas).`, 'ok'); }
    finally { DIA = atual; try { await Store.carregar(atual); } catch { } atualizarEstado(); }
  } catch (e) { $('.ata-prog')?.remove(); aviso('Não foi possível obter o PDF: ' + e.message, 'erro'); }
  finally { $$('[data-arq-pdf]').forEach(x => x.disabled = false); }
}
async function telaArquivo() {
  const f = filtrosArq(), ativo = arqAtivo(f);
  if (!UI.arqLista || !UI.arqLido || Date.now() - UI.arqLido > 15000) {
    render(cabecalhoApp({ id: 'arquivo', titulo: 'Arquivo das atas' }) + `<div class="wrap"><section class="pn"><h2>Atas arquivadas</h2><p class="note">Carregando o arquivo…</p></section></div>`);
    try { UI.arqLista = await Store.arquivo(); UI.arqLido = Date.now(); } catch (e) { UI.arqLista = []; aviso('Não foi possível ler o arquivo: ' + e.message, 'erro'); }
    if (ROTA_ATUAL?.id !== 'arquivo') return;
  }
  const atas = UI.arqLista.filter(r => r.tipo === 'ata').sort((a, b) => b.data.localeCompare(a.data)), ataDe = Object.fromEntries(atas.map(a => [a.data, a]));
  const codDe = Object.fromEntries(UI.arqLista.filter(r => r.tipo === 'redia').map(r => [r.data, r.payload.codigo]));
  const res = ativo ? (UI.arqRes || []) : null;
  const grupos = res ? Object.entries(res.reduce((g, r) => ((g[r.data] ||= []).push(r), g), {})).sort((a, b) => b[0].localeCompare(a[0])) : [];
  const btnPdf = a => `<button class="btn sm pri" data-arq-pdf="${a.data}">Baixar PDF da ata</button>`;
  const opt = (v, t, sel) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${esc(t)}</option>`;
  render(cabecalhoApp({ id: 'arquivo', titulo: 'Arquivo das atas' }) + `<div class="wrap arqw">
    <section class="pn arq-b" role="search"><h2>Buscar no arquivo</h2>
      <div class="arq-f">
        <label class="arq-q"><span class="lbl">Texto</span><input id="aq-q" class="in" placeholder="TAG, poço, equipamento ou tema · ex.: FGRU A, BUZ-112" value="${esc(f.q)}" autocomplete="off"></label>
        <label><span class="lbl">De</span><input id="aq-de" type="date" class="in" value="${f.de}"></label>
        <label><span class="lbl">Até</span><input id="aq-ate" type="date" class="in" value="${f.ate}"></label>
        <label><span class="lbl">Coordenação</span><select id="aq-c" class="in">${opt('', 'Todas', f.coord)}${COORDS.map(c => opt(c, c, f.coord)).join('')}</select></label>
        <label><span class="lbl">Conteúdo</span><select id="aq-t" class="in">${Object.entries(ARQ_TIPOS).map(([k, [t]]) => opt(k, t, f.tipo)).join('')}</select></label>
        <div class="arq-bt"><button class="btn pri" data-act="aq-buscar">Buscar</button><button class="btn sec" data-act="aq-limpar" ${ativo ? '' : 'disabled'}>Limpar filtros</button></div>
      </div>
      <p class="note">Procura no conteúdo de todas as REDIAs da ${esc(CFG.uep)} (sugestões, destaques, ameaças, demandas, serviços, decisões e dados). Com busca ou filtro, a lista de atas dá lugar aos resultados; <b>Limpar filtros</b> volta à lista.</p>
    </section>
    ${res ? `<section class="pn arq-r"><div class="pn-h"><h2>Resultados</h2><span class="note">${res.length} registro${res.length === 1 ? '' : 's'} em ${grupos.length} REDIA${grupos.length === 1 ? '' : 's'}${res.length >= 300 ? ' · limite de 300: refine a busca' : ''}</span></div>
      ${grupos.map(([dia, rs]) => `<div class="arq-g"><div class="arq-gh"><b class="mono">${esc(ataDe[dia]?.payload.codigo || codDe[dia] || codigoRedia(CFG.uep, dia))}</b><span>${diaSemana(dia)}, ${ddmmaaaa(dia)}</span><span style="flex:1"></span>${ataDe[dia] ? btnPdf(ataDe[dia]) : '<span class="chip ne">Sem ata arquivada</span>'}</div>
        <div class="tbw"><table class="tb"><thead><tr><th>Conteúdo</th><th>Tipo</th><th>Coordenação</th><th>Por</th></tr></thead><tbody>
        ${rs.map(r => `<tr><td><b>${esc(textoRegistro(r))}</b>${r.payload.tag ? `<br><span class="note">${esc(r.payload.tag)}</span>` : ''}${r.payload.textoOriginal ? `<br><span class="note">${esc(String(r.payload.textoOriginal).slice(0, 160))}</span>` : ''}</td><td class="nw">${esc(TIPO_NOME[r.tipo] || r.tipo)}</td><td>${esc(r.payload.coord || CAMPO[r.payload.campo]?.coord || LISTA[r.payload.campo]?.coord || '—')}</td><td class="note nw">${esc(r.autor?.nome || '')}</td></tr>`).join('')}
        </tbody></table></div></div>`).join('') || '<p class="note">Nada encontrado com estes filtros.</p>'}</section>`
    : `<section class="pn arq-l"><div class="pn-h"><h2>Atas arquivadas · ${esc(CFG.uep)}</h2><span class="note">${atas.length} ata${atas.length === 1 ? '' : 's'}</span></div>
      <p class="note">Só entram no arquivo as atas fechadas: o documento final da REDIA, gerado depois do de acordo de todos os responsáveis e que não pode mais ser alterado. ${Store.remoto() ? 'Lidas da base de dados da UEP.' : 'Modo demonstração: atas deste navegador.'}</p>
      <div class="tbw"><table class="tb arq"><thead><tr><th>Ata</th><th>REDIA</th><th>Fechada</th><th>De acordo</th><th>Participantes</th><th></th></tr></thead><tbody>
      ${atas.map(a => { const p = a.payload || {}; return `<tr><td class="nw"><span class="pdf-ic" aria-hidden="true">PDF</span><b class="mono">${esc(p.codigo || codDe[a.data] || codigoRedia(CFG.uep, a.data))}</b>${p.paginas ? `<br><span class="note">${p.paginas} páginas · ${p.telas} telas</span>` : ''}</td>
        <td class="nw"><b>${ddmmaaaa(a.data)}</b><br><span class="note">${diaSemana(a.data)}</span></td>
        <td class="nw">${hhmm(a.criadoEm)}<br><span class="note">${esc(a.autor?.nome || '')}</span></td>
        <td>${(p.acordos || []).length ? p.acordos.map(x => `<span class="chip ok">${esc(x.coord)}</span>`).join(' ') : '<span class="note">—</span>'}</td>
        <td class="note">${(p.participantes || []).length ? esc(p.participantes.slice(0, 4).join(', ')) + (p.participantes.length > 4 ? ` +${p.participantes.length - 4}` : '') : '—'}</td>
        <td class="nw">${btnPdf(a)}</td></tr>`; }).join('') || '<tr><td colspan="6" class="note">Nenhuma ata arquivada ainda. Depois da REDIA, com a pauta congelada e o de acordo dos responsáveis, a ata é fechada e entra aqui.</td></tr>'}
      </tbody></table></div></section>`}
  </div>`);
  const ler = () => ({ q: $('#aq-q').value, de: $('#aq-de').value, ate: $('#aq-ate').value, coord: $('#aq-c').value, tipo: $('#aq-t').value });
  const buscar = async () => {
    const nf = ler(); UI.arq = nf;
    if (nf.q.trim().length === 1 && !(nf.de || nf.ate || nf.coord || nf.tipo)) return aviso('Digite ao menos 2 caracteres.', 'erro');
    if (!arqAtivo(nf)) { UI.arqRes = null; return telaArquivo(); }
    try { UI.arqRes = await Store.buscar(nf.q, 300, { de: nf.de || null, ate: nf.ate || null, coord: nf.coord || null, tipos: ARQ_TIPOS[nf.tipo]?.[1] || null }); } catch (e) { aviso('Não foi possível buscar: ' + e.message, 'erro'); UI.arqRes = []; }
    await telaArquivo(); const q = $('#aq-q'); if (document.activeElement !== q && UI.arqFocoQ) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  };
  $('[data-act="aq-buscar"]').onclick = buscar;
  $('[data-act="aq-limpar"]').onclick = () => { UI.arq = { q: '', de: '', ate: '', coord: '', tipo: '' }; UI.arqRes = null; telaArquivo(); };
  $('#aq-q').onkeydown = e => { if (e.key === 'Enter') { UI.arqFocoQ = true; buscar(); } };
  let tq = null; $('#aq-q').oninput = () => { clearTimeout(tq); const v = $('#aq-q').value.trim(); if (v.length === 1) return; tq = setTimeout(() => { UI.arqFocoQ = true; buscar(); }, 450); };
  ['#aq-de', '#aq-ate', '#aq-c', '#aq-t'].forEach(id => $(id).onchange = () => { UI.arqFocoQ = false; buscar(); });
  $$('[data-arq-pdf]').forEach(b => b.onclick = () => baixarPdfAta(ataDe[b.dataset.arqPdf], b));
}

/* ======================= Configuração ======================= */
function telaConfig() {
  const C = CFG, L = C.limiares;
  const num = (id, rot, val, step = 'any') => `<div><label class="lbl" for="${id}">${rot}</label><input id="${id}" type="number" step="${step}" class="in" value="${val}"></div>`;
  render(cabecalhoApp({ id: 'config', titulo: 'Configuração da UEP' }) + `<div class="wrap">
    <div class="banner">${Store.remoto() ? `As regras ficam na base (tabela uep_config da ${esc(C.uep)}) e valem para todos os usuários da UEP.${podeAdministrar() ? '' : ' <b>Somente leitura:</b> só o GEPLAT ou o administrador alteram.'}` : 'No modo demonstração, as regras ficam neste navegador.'} Os limiares são o ponto de partida v0 (D-09), não norma Petrobras.</div>
    <div class="grid2">
      <section class="pn"><h2>Unidade</h2><div class="fgrid">
        <div><label class="lbl" for="c-uep">UEP</label><input id="c-uep" class="in" value="${esc(C.uep)}" ${Store.remoto() ? 'disabled title="A UEP vem do perfil do usuário"' : ''}></div>
        <div><label class="lbl" for="c-campo">Campo</label><input id="c-campo" class="in" value="${esc(C.campo)}"></div>
        <div><label class="lbl" for="c-ativo">Ativo</label><input id="c-ativo" class="in" value="${esc(C.ativo)}"></div>
        <div><label class="lbl" for="c-modo">Modo</label><select id="c-modo" class="in"><option value="operacao" selected>Operação</option><option value="preoperacao" disabled>Pré-operação (próxima versão)</option></select></div></div>
        <h3>Horários</h3><div class="fgrid">${Object.entries({ preenchimento: 'Fim do preenchimento', congelamento: 'Congelamento', inicio: 'Início da REDIA', fim: 'Fim da REDIA' }).map(([k, r]) => `<div><label class="lbl" for="h-${k}">${r}</label><input id="h-${k}" type="time" class="in" value="${C.horarios[k]}"></div>`).join('')}</div>
        <h3>Pauta</h3><div class="fgrid">${num('c-tb', 'Tempo por bloco (min)', C.timeboxMin, 1)}${num('c-dq', 'Destaques por bloco', C.destaquesPorBloco, 1)}${num('c-am', 'Atividades na abertura (máx.)', C.atividadesMax, 1)}${num('c-ar', 'Atividades recomendadas', C.atividadesRecomendado, 1)}</div>
        <h3>Limites do offloading e estabilidade (D-63)</h3><div class="fgrid">${num('c-hs', 'Offloading · Hs máxima (m)', C.limitesOffloading?.hs ?? '')}${num('c-vt', 'Offloading · vento máximo (nós)', C.limitesOffloading?.vento ?? '')}${num('c-cr', 'Offloading · corrente máxima (nós)', C.limitesOffloading?.corrente ?? '')}${num('c-tr', 'Estabilidade · trim máximo (± m)', C.limitesEstabilidade?.trim ?? '')}${num('c-bd', 'Estabilidade · banda máxima (± °)', C.limitesEstabilidade?.banda ?? '')}${num('c-cm', 'Estabilidade · calado máximo (m)', C.limitesEstabilidade?.caladoMax ?? '')}</div>
        <h3>Poços, recorrência e visão semanal (D-63)</h3><div class="fgrid">${num('c-pd', 'Poço abaixo do potencial a partir de (% abaixo)', C.pocoDesvioPct, 1)}${num('c-rv', 'Recorrente a partir de (REDIAs)', C.recorrencia?.vezes ?? 3, 1)}${num('c-rd', 'Recorrência · janela (dias)', C.recorrencia?.dias ?? 30, 1)}<div><label class="lbl" for="c-ds">Dia da visão semanal</label><select id="c-ds" class="in">${[1, 2, 3, 4, 5, 6, 0].map(d => `<option value="${d}" ${d === (C.diaVisaoSemanal ?? 5) ? 'selected' : ''}>${DIAS[d]}</option>`).join('')}</select></div></div>
        <h3>Vencimentos (D-62)</h3><div class="fgrid">${num('c-tv', 'Teste de vazão · periodicidade por poço (dias)', C.testeVazaoDias, 1)}${num('l-ib-at', 'Inibição/bypass · Atenção a partir de (dias)', L.inibicaoDias?.at ?? 1, 1)}${num('l-ib-nok', 'Inibição/bypass · Não OK a partir de (dias)', L.inibicaoDias?.nok ?? 3, 1)}${num('l-ins', 'Inspeção de integridade · atenção se vence em (dias)', L.inspecaoJanelaDias ?? 30, 1)}</div></section>
      <section class="pn"><h2>Semáforos v0</h2><div class="fgrid">
        ${num('l-ef-ok', 'EFOP · OK a partir de (%)', L.efop.ok)}${num('l-ef-at', 'EFOP · Atenção a partir de (%)', L.efop.at)}
        ${num('l-in-ok', 'Injeção · OK a partir de (% da meta)', L.injecao.ok)}${num('l-in-at', 'Injeção · Atenção a partir de (%)', L.injecao.at)}
        ${num('l-iu', 'IUGA · faixa de atenção (p.p. abaixo da meta)', L.iugaFaixaAtencao)}${num('l-ma', 'Manutenção · faixa de atenção (p.p.)', L.manutencaoFaixaAtencao)}
        ${num('l-ut-ok', 'Utilidades · OK acima de (% do mínimo)', L.utilidades.ok)}${num('l-ut-d', 'Utilidades · atenção se chega ao mínimo em (dias)', L.utilidades.diasAtencao)}</div></section>
      <section class="pn"><h2>Calendário da pauta extra</h2><div class="fgrid">${[1, 2, 3, 4, 5, 6, 0].map(d => `<div><label class="lbl" for="pe-${d}">${DIAS[d]}</label><input id="pe-${d}" class="in" value="${esc(C.pautaExtra[d] || '')}"></div>`).join('')}</div></section>
      <section class="pn"><h2>Metas dos indicadores de manutenção</h2><p class="note">D-61: linha de base da UEP (I-05), usada quando a linha do indicador não traz meta própria. Indicador = nome exato usado na lista da COMAN.</p>
        <div class="tbw"><table class="tb" id="mm-tab"><thead><tr><th>Indicador</th><th>Meta (%)</th><th></th></tr></thead><tbody>
        ${Object.entries(C.metasManutencao || {}).map(([k, v], i) => `<tr><td><input class="in" data-mm-k value="${esc(k)}"></td><td><input class="in" type="number" step="any" data-mm-v value="${esc(v)}"></td><td><button class="btn sm lnk" data-mm-rm="${i}">Remover</button></td></tr>`).join('')}
        </tbody></table></div><div class="row" style="margin-top:6px"><button class="btn sm sec" data-act="mm-add">Adicionar indicador</button></div></section>
    </div>
    <section class="pn" style="margin-top:16px" id="cfg-lab"><h2>Análises (eplab) · limites, tela e enquadramento</h2>
      <p class="note">D-61/D-65: com limite informado, o resultado ganha semáforo (fora do limite = Não OK; a menos de 10% da faixa = Atenção). <b>Na tela</b>: a análise aparece no card “Resultados de Análises” da coordenação. <b>Enquadramento</b>: a análise entra no semáforo da corrente na tela inicial — uma análise fora da especificação deixa a corrente <b>Desenquadrada</b>; perto do limite, sem resultado ou com resultado atrasado, em <b>Atenção</b>. Limites iniciais são referências públicas a confirmar (PREMISSA).</p>
      <div class="tbw"><table class="tb" id="lab-tab"><thead><tr><th>Coordenação</th><th>Análise</th><th>Unidade</th><th>Mínimo</th><th>Máximo</th><th>Na tela</th><th>Enquadramento</th><th></th></tr></thead><tbody>
      ${['COPROD', 'COEMB', 'COMAN'].flatMap(coord => labLista(coord).map(a => { const id = `lab.${coord}.${a.k}`, l = (C.limitesLab || {})[id] || {}, o = labOpc(id), txt = a.tipo === 'texto', nova = (C.labNovas || []).some(n => n.coord === coord && n.k === a.k);
        return `<tr data-lab="${id}"><td>${coord}</td><td>${esc(a.rot)}${nova ? ' <span class="chip ne">incluída</span>' : ''}<br><span class="note">a cada ${a.per} dia${a.per === 1 ? '' : 's'}</span></td><td>${esc(a.un || '—')}</td>
          <td>${txt ? '<span class="note">texto</span>' : `<input class="in" type="number" step="any" style="width:100px" data-ll="${id}" data-ll-k="min" value="${l.min ?? ''}">`}</td><td>${txt ? '' : `<input class="in" type="number" step="any" style="width:100px" data-ll="${id}" data-ll-k="max" value="${l.max ?? ''}">`}</td>
          <td><label class="sw"><input type="checkbox" data-lt="${id}" ${o.tela !== false ? 'checked' : ''}><span>Na tela</span></label></td>
          <td>${txt ? '<span class="note">—</span>' : `<select class="in" data-lc="${id}"><option value="">Não entra</option>${Object.entries(CORRENTES).map(([k, n]) => `<option value="${k}" ${o.corrente === k ? 'selected' : ''}>${n}</option>`).join('')}</select>`}</td>
          <td><button class="btn sm lnk" data-lab-rm="${id}">Excluir</button></td></tr>`; })).join('')}
      </tbody></table></div>
      ${(C.labRemovidas || []).length ? `<p class="note" style="margin-top:8px">Excluídas da lista-base: ${(C.labRemovidas || []).map(id => { const [, c, k] = id.split('.'), a = (LAB[c] || []).find(x => x.k === k); return `<span class="chip ne">${esc(c)} · ${esc(a?.rot || k)} <button class="btn sm lnk" data-lab-re="${id}">Reincluir</button></span>`; }).join(' ')}</p>` : ''}
      <h3>Incluir análise</h3>
      <div class="fgrid">
        <div><label class="lbl" for="na-coord">Coordenação</label><select id="na-coord" class="in"><option>COPROD</option><option>COEMB</option><option>COMAN</option></select></div>
        <div style="grid-column:span 2"><label class="lbl" for="na-rot">Análise</label><input id="na-rot" class="in" maxlength="70" placeholder="ex.: Oxigênio dissolvido após a desaeradora"></div>
        <div><label class="lbl" for="na-un">Unidade</label><input id="na-un" class="in" maxlength="12" placeholder="ex.: ppb"></div>
        <div><label class="lbl" for="na-dec">Casas decimais</label><input id="na-dec" class="in" type="number" min="0" max="3" value="0"></div>
        <div><label class="lbl" for="na-per">Periodicidade (dias)</label><input id="na-per" class="in" type="number" min="1" value="1"></div>
        <div><label class="lbl" for="na-min">Mínimo</label><input id="na-min" class="in" type="number" step="any"></div>
        <div><label class="lbl" for="na-max">Máximo</label><input id="na-max" class="in" type="number" step="any"></div>
        <div><label class="lbl" for="na-cor">Enquadramento</label><select id="na-cor" class="in"><option value="">Não entra</option>${Object.entries(CORRENTES).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></div>
        <div><label class="sw" style="margin-top:28px"><input type="checkbox" id="na-tela" checked><span>Na tela da coordenação</span></label></div>
      </div>
      <div class="row end" style="margin-top:8px"><button class="btn sec" data-act="lab-add">Incluir análise</button></div>
      <p class="note">A análise incluída ganha campo na aba Dados automáticos da coordenação (resultado e data). A captura do eplab a reconhece quando o sistema estiver integrado (I-51); até lá, preenchimento manual. Incluir, excluir e as caixas valem ao clicar em <b>Salvar configuração</b>.</p></section>
    <div class="row end" style="margin-top:16px"><button class="btn sec" data-act="padrao" ${podeAdministrar() ? '' : 'disabled'}>Restaurar padrão</button><button class="btn pri" data-act="salvar-cfg" ${podeAdministrar() ? '' : 'disabled'}>Salvar configuração</button></div>
  </div>`);
  $('[data-act="salvar-cfg"]').onclick = async () => {
    const n = id => +$('#' + id).value;
    if (!Store.remoto()) CFG.uep = USUARIO?.uep || CFG.uep;   // D-70: a unidade vem da escolha na tela de unidades
    CFG.campo = $('#c-campo').value.trim(); CFG.ativo = $('#c-ativo').value.trim();
    for (const k of ['preenchimento', 'congelamento', 'inicio', 'fim']) CFG.horarios[k] = $('#h-' + k).value;
    CFG.horarios.preRedia = CFG.horarios.preenchimento;
    CFG.timeboxMin = n('c-tb'); CFG.destaquesPorBloco = n('c-dq'); CFG.atividadesMax = n('c-am'); CFG.atividadesRecomendado = n('c-ar');
    Object.assign(CFG.limiares.efop, { ok: n('l-ef-ok'), at: n('l-ef-at') }); Object.assign(CFG.limiares.injecao, { ok: n('l-in-ok'), at: n('l-in-at') });
    const nn = id => { const v = $('#' + id).value; return v === '' ? null : +v; };
    CFG.limitesOffloading = { hs: nn('c-hs'), vento: nn('c-vt'), corrente: nn('c-cr') }; CFG.limitesEstabilidade = { trim: nn('c-tr'), banda: nn('c-bd'), caladoMax: nn('c-cm') };
    CFG.pocoDesvioPct = n('c-pd'); CFG.recorrencia = { vezes: n('c-rv'), dias: n('c-rd') }; CFG.diaVisaoSemanal = +$('#c-ds').value;
    CFG.testeVazaoDias = n('c-tv'); CFG.limiares.inibicaoDias = { at: n('l-ib-at'), nok: n('l-ib-nok') }; CFG.limiares.inspecaoJanelaDias = n('l-ins');
    CFG.limiares.iugaFaixaAtencao = n('l-iu'); CFG.limiares.manutencaoFaixaAtencao = n('l-ma'); CFG.limiares.utilidades.ok = n('l-ut-ok'); CFG.limiares.utilidades.diasAtencao = n('l-ut-d');
    for (const d of [0, 1, 2, 3, 4, 5, 6]) CFG.pautaExtra[d] = $('#pe-' + d).value.trim();
    const mm = {}; $$('#mm-tab tbody tr').forEach(tr => { const k = $('[data-mm-k]', tr).value.trim(), v = $('[data-mm-v]', tr).value; if (k && v !== '' && !isNaN(+v)) mm[k] = +v; }); CFG.metasManutencao = mm;
    const ll = {}; $$('[data-ll]').forEach(i => { const v = i.value; (ll[i.dataset.ll] ||= { min: '', max: '' })[i.dataset.llK] = v === '' ? '' : +v; }); CFG.limitesLab = ll;
    const lc = {}; $$('[data-lab]').forEach(tr => { const id = tr.dataset.lab; lc[id] = { tela: !!$('[data-lt]', tr)?.checked, corrente: $('[data-lc]', tr)?.value || '' }; }); CFG.labCfg = lc;   // D-65
    CFG.labNovas = UI.labNovas ?? CFG.labNovas; CFG.labRemovidas = UI.labRemovidas ?? CFG.labRemovidas; UI.labNovas = UI.labRemovidas = undefined;
    try { await Store.salvarConfig(); atualizarEstado(); aviso('Configuração salva.', 'ok'); rerender(); } catch (e) { aviso(e.message, 'erro'); }
  };
  /* D-65: incluir / excluir / reincluir análises (aplica na tela na hora; grava em "Salvar configuração") */
  const guardaLab = () => { const tmp = {}; $$('[data-lab]').forEach(tr => { const id = tr.dataset.lab; tmp[id] = { tela: !!$('[data-lt]', tr)?.checked, corrente: $('[data-lc]', tr)?.value || '' }; }); CFG.labCfg = { ...CFG.labCfg, ...tmp }; const ll = { ...CFG.limitesLab }; $$('[data-ll]').forEach(i => { (ll[i.dataset.ll] ||= {})[i.dataset.llK] = i.value === '' ? '' : +i.value; }); CFG.limitesLab = ll; };
  const reabrirLab = () => { const y = $('#cfg-lab')?.getBoundingClientRect().top + scrollY; rerender(); setTimeout(() => window.scrollTo(0, y - 80), 0); aviso('Alteração aplicada na tela. Clique em Salvar configuração para gravar.', 'info'); };
  $$('[data-lab-rm]').forEach(b => b.onclick = () => { guardaLab(); const id = b.dataset.labRm, [, c, k] = id.split('.');
    if ((CFG.labNovas || []).some(n => n.coord === c && n.k === k)) CFG.labNovas = CFG.labNovas.filter(n => !(n.coord === c && n.k === k)); else CFG.labRemovidas = [...new Set([...(CFG.labRemovidas || []), id])];
    UI.labNovas = CFG.labNovas; UI.labRemovidas = CFG.labRemovidas; reabrirLab(); });
  $$('[data-lab-re]').forEach(b => b.onclick = () => { guardaLab(); CFG.labRemovidas = (CFG.labRemovidas || []).filter(x => x !== b.dataset.labRe); UI.labRemovidas = CFG.labRemovidas; UI.labNovas = CFG.labNovas; reabrirLab(); });
  $('[data-act="lab-add"]').onclick = () => {
    const rot = $('#na-rot').value.trim(); if (rot.length < 3) return aviso('Informe o nome da análise.', 'erro');
    guardaLab(); const coord = $('#na-coord').value, base = rot.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 20) || 'analise';
    let k = 'u_' + base, n = 2; while (labLista(coord).some(a => a.k === k) || (LAB[coord] || []).some(a => a.k === k)) k = 'u_' + base + '_' + n++;
    const id = `lab.${coord}.${k}`, mn = $('#na-min').value, mx = $('#na-max').value;
    CFG.labNovas = [...(CFG.labNovas || []), { coord, k, rot, un: $('#na-un').value.trim(), dec: Math.max(0, Math.min(3, +$('#na-dec').value || 0)), per: Math.max(1, +$('#na-per').value || 1) }];
    CFG.limitesLab = { ...CFG.limitesLab, [id]: { min: mn === '' ? '' : +mn, max: mx === '' ? '' : +mx } };
    CFG.labCfg = { ...CFG.labCfg, [id]: { tela: $('#na-tela').checked, corrente: $('#na-cor').value } };
    UI.labNovas = CFG.labNovas; UI.labRemovidas = CFG.labRemovidas; reabrirLab();
  };
  $('[data-act="mm-add"]').onclick = () => { const tb = $('#mm-tab tbody'); const tr = document.createElement('tr'); tr.innerHTML = '<td><input class="in" data-mm-k placeholder="ex.: ICPMe"></td><td><input class="in" type="number" step="any" data-mm-v></td><td><button class="btn sm lnk" data-mm-rm>Remover</button></td>'; tb.appendChild(tr); $('[data-mm-rm]', tr).onclick = () => tr.remove(); $('[data-mm-k]', tr).focus(); };
  $$('[data-mm-rm]').forEach(b => b.onclick = () => b.closest('tr').remove());
  $('[data-act="padrao"]').onclick = async () => { const uep = CFG.uep; CFG = mesclarCfg({}); if (Store.remoto()) CFG.uep = uep; try { await Store.salvarConfig(); aviso('Padrão restaurado.', 'ok'); } catch (e) { aviso(e.message, 'erro'); } rerender(); };
}

/* ======================= inicialização ======================= */
async function iniciar() {
  window.addEventListener('hashchange', rotear);
  window.addEventListener('resize', ajustarPalco);
  matchMedia('(max-width: 900px)').addEventListener?.('change', () => { if (ROTA_ATUAL && ROTA_ATUAL.id !== 'apresentacao' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) rerender(); });
  document.addEventListener('mousemove', () => { if (ROTA_ATUAL?.id === 'apresentacao') mostrarCtrl(); });
  iniciarDicas();
  document.addEventListener('click', e => {   // D-67
    const t = e.target.closest?.('[data-act]'); if (!t) return;
    const a = t.dataset.act;
    if (a === 'iniciar-redia') { e.preventDefault(); iniciarRedia(); }
    else if (a === 'vivo-iniciar') { e.preventDefault(); Vivo.comecar(); }
    else if (a === 'vivo-assistir') { e.preventDefault(); Vivo.assistir(); }
    else if (a === 'vivo-ir') { e.preventDefault(); if (ROTA_ATUAL?.id !== 'apresentacao') location.hash = '#/apresentacao/' + (UI.pres.bloco || 1); }
    else if (a === 'vivo-fim') { e.preventDefault(); Vivo.encerrar(); }
  });
  setInterval(() => Vivo.vigiar(), 5000);
  addEventListener('beforeunload', () => { if (Vivo.souCtrl) Vivo.enviar({ t: 'fim', ctrl: Vivo.eu() }); });
  document.addEventListener('keydown', e => {
    if (ROTA_ATUAL?.id !== 'apresentacao' || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || (e.key === ' ' && /BUTTON|A/.test(e.target.tagName))) return;
    if (Vivo.seguindo && !['Escape', 'f', 'F'].includes(e.key)) { e.preventDefault(); return; }   // D-67: quem assiste ao vivo não comanda
    const b = UI.pres.bloco, det = !!ROTA_ATUAL.m?.[2];
    if (det && ['ArrowLeft', 'PageUp', 'Escape', 'Backspace'].includes(e.key) && !(e.key === 'Escape' && document.fullscreenElement)) { e.preventDefault(); location.hash = '#/apresentacao/' + b; return; }
    if (['ArrowRight', 'PageDown'].includes(e.key)) { e.preventDefault(); location.hash = '#/apresentacao/' + Math.min(5, b + 1); }
    else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); location.hash = '#/apresentacao/' + Math.max(1, b - 1); }
    else if (/^[1-5]$/.test(e.key)) location.hash = '#/apresentacao/' + e.key;
    else if (e.key === ' ') { e.preventDefault(); alternarTimer(); }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); maisUmMinuto(); }
    else if (e.key.toLowerCase() === 'f') telaCheia();
    else if (e.key === 'Escape' && !document.fullscreenElement) location.hash = '#/inicio';
  });
  setInterval(() => {
    const P = UI.pres;
    if (P.rodando) { const agora = Date.now(); if (agora - P.ult >= 1000) { P.restante -= Math.floor((agora - P.ult) / 1000); P.ult = agora - ((agora - P.ult) % 1000); atualizarTimer(); } }
    viradaDoDia();   // D-68: à meia-noite, quem estava na REDIA de hoje passa para o novo dia (com "Iniciar elaboração")
    $$('[data-clk]').forEach(c => { const t = hhmm(Relogio.agora()); if (c.textContent !== t) c.textContent = t; });
  }, 250);
  // leitura periódica da base: a cada 15 s sem tempo real; a cada 60 s com tempo real (rede de segurança)
  let tique = 0;
  setInterval(() => { tique++; if (Store.remoto() && (!Store.tempoReal || tique % 4 === 0)) sincronizarTela(); }, 15000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sincronizarTela(); });
  window.addEventListener('online', () => sincronizarTela());
  // sessão: na nuvem, vale a sessão do Supabase nesta aba; na demonstração, a sessão local
  if (MODO_NUVEM) {
    const perfil = await Nuvem.restaurar(), uepAnt = USUARIO?.uep || null;
    if (perfil && !perfil.trocarSenha) { definirUsuario(perfil, uepAnt); if (USUARIO.uep) { try { await iniciarSessao(false); } catch (e) { aviso('Não foi possível abrir a REDIA: ' + e.message, 'erro'); } } }
    else { USUARIO = null; SS.del('sessao'); if (perfil) await Nuvem.sair(); }
  } else if (USUARIO) {
    const a = acessoDemo(USUARIO.chave);   // D-70: sessão de versão anterior (sem unidades) é refeita pelo cadastro de teste
    if (!a) { USUARIO = null; SS.del('sessao'); } else { if (!USUARIO.unidades) definirUsuario(a, USUARIO.uep); else aplicarUnidade(USUARIO.uep); if (USUARIO.uep) await iniciarSessao(false); }
  }
  rotear();
}
document.addEventListener('DOMContentLoaded', iniciar);
