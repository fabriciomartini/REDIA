/* ===================== REDIA P-83 · telas de trabalho e roteamento ===================== */
'use strict';
let E = null;                      // estado atual reconstruído
const UI = { sel: {}, aba: {}, pres: { bloco: 1, restante: null, rodando: false, ult: 0 } };

function atualizarEstado() { E = construirEstado(Store.registros(DIA), Store.demandas(), DIA); E.mes = acumuladoMes(DIA, x => Store.registros(x)); return E; }
function congelada() { return !!E?.congelamento; }
function fase() {
  const m = Relogio.minutos(), h = CFG.horarios;
  if (congelada()) return m >= horaMin(h.fim) ? { id: 'ata', nome: 'Ata', desc: 'Reunião encerrada · fechar a ata' } : m >= horaMin(h.inicio) ? { id: 'reuniao', nome: 'REDIA em andamento', desc: `${h.inicio}–${h.fim}` } : { id: 'congelada', nome: 'Pauta congelada', desc: `às ${hhmm(E.congelamento.criadoEm)}` };
  if (m < horaMin(h.preenchimento)) return { id: 'preenchimento', nome: 'Preenchimento', desc: `até ${h.preenchimento}` };
  if (m < horaMin(h.congelamento)) return { id: 'pre', nome: 'Pré-REDIA', desc: `${h.preRedia}–${h.congelamento}` };
  return { id: 'congelar', nome: 'Hora de congelar', desc: `desde ${h.congelamento}` };
}
function snapshotDe(E) {
  const s = JSON.parse(JSON.stringify({ valores: E.valores, listas: E.listas, sugestoes: E.sugestoes, servicos: E.servicos, itens: E.itens, demandas: E.demandas, selecoes: E.selecoes, mes: E.mes }));
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
    <div><span class="kick">REDIA ${esc(CFG.uep)} · ${esc(APP.versao)}</span><div class="tit">${esc(rota.titulo)}</div><span class="dash"></span></div>
    ${E && USUARIO && notificacoesAbertas(E, USUARIO.coord).length ? `<a class="ntf" href="#/curadoria/${USUARIO.coord}" title="Notificação do GEPLAT">Concluir ${esc(USUARIO.coord)}</a>` : ''}
    <nav aria-label="Seções">${item('#/inicio', 'Início', rota.id === 'inicio')}${item('#/curadoria/' + c, 'Curadoria', rota.id === 'curadoria')}${item('#/apresentacao/1', 'Apresentação', false)}${item('#/ata', 'Fechamento e ata', rota.id === 'ata')}${item('#/config', 'Configuração', rota.id === 'config')}<a href="#/sair" class="sair" title="Encerrar a sessão">Sair</a></nav>
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
  { re: /^#\/curadoria\/(GEPLAT|COPROD|COEMB|COMAN)(?:\/([\w-]+))?$/, id: 'curadoria', titulo: 'Curadoria', fn: telaCuradoria },
  { re: /^#\/apresentacao\/([1-5])$/, id: 'apresentacao', titulo: 'Apresentação', fn: telaApresentacao },
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
  if (!Store.modo && location.hash !== '#/inicio') { location.hash = '#/inicio'; return; }
  const h = location.hash || '#/inicio';
  for (const r of ROTAS) {
    const m = r.re.exec(h);
    if (m) {
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
const PERMITIDOS_CONGELADA = ['demanda', 'anexo', 'ata', 'reabertura', 'notificacao'];
async function podeEditar(tipo, extra) {
  if (PERMITIDOS_CONGELADA.includes(tipo) || extra?.escopo === 'demandas') return true;
  if (Store.remoto()) { await Store.sincronizar(); atualizarEstado(); }
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
  if (e.codigo === 'PAUTA_CONGELADA') { try { await Store.sincronizar(); atualizarEstado(); rerender(); } catch { } }
}
const semChip = s => `<span class="chip ${s}">${(s === 'nok' ? SH.nokW : SH[s] || SH.sd)(13)}${esc(SEM_NOME[s] || s)}</span>`;
const origemTxt = v => v ? `<span class="orig"><span class="tg0">${esc(v.origem)}</span>${esc(v.fonte || '')} · ${hhmm(v.em)}${v.origem !== 'A' ? ' · ' + esc(v.autor?.nome || '') : ''}</span>` : '<span class="orig">sem registro</span>';
const bloqueado = () => congelada();


/* ---------------- janela de confirmação (sem diálogos do navegador) ---------------- */
function modal({ titulo, html, botoes }) {
  return new Promise(res => {
    $('.mdl')?.remove();
    const el = document.createElement('div'); el.className = 'mdl'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'mdl-t');
    el.innerHTML = `<div class="mdl-c"><h2 id="mdl-t">${titulo}</h2>${html}<div class="row end mdl-b">${botoes.map(b => `<button class="btn ${b.cls || ''}" data-mdl="${b.id}">${b.txt}</button>`).join('')}</div></div>`;
    document.body.appendChild(el);
    const fechar = id => { UI.fecharModal = null; const extra = {}; el.querySelectorAll('[data-mdl-in]').forEach(i => extra[i.dataset.mdlIn] = i.value.trim()); el.remove(); document.removeEventListener('keydown', esc_); res({ id, ...extra }); };
    const esc_ = e => { if (e.key === 'Escape') fechar('cancelar'); };
    document.addEventListener('keydown', esc_);
    el.querySelectorAll('[data-mdl]').forEach(b => b.onclick = () => fechar(b.dataset.mdl));
    UI.fecharModal = () => fechar('cancelar');
    el.onclick = e => { if (e.target === el) fechar('cancelar'); };
    (el.querySelector('[data-mdl-in]') || el.querySelector('.btn.pri') || el.querySelector('.btn'))?.focus();
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
        <span class="kick">${esc(CFG.uep)} · ${esc(CFG.campo || 'Búzios')} · Ativo III</span>
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
        <p class="note">${MODO_NUVEM ? 'Senha pessoal cadastrada na base da REDIA. No primeiro acesso, troque a senha temporária. Não substitui o login corporativo.' : 'Demonstração: use GP01, CP01, CE01 ou CM01 e a senha 1234. Os registros ficam só neste navegador.'}</p>
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
    try { await iniciarSessao(true); }
    catch (x) { btn.disabled = false; btn.textContent = 'Entrar'; msg.textContent = 'Não foi possível abrir a REDIA: ' + x.message; return; }
    $('.login').classList.add('saindo');
    setTimeout(() => { pararLoginTimers(); aviso(`Bem-vindo, ${USUARIO.nome.split(' ')[0]} · ${USUARIO.posto}.`, 'ok'); const d = UI.destino || '#/inicio'; UI.destino = null; if (location.hash === d) rotear(); else location.hash = d; }, 450);
  };
  const vid = $('.lg-vid');
  if (vid) {
    vid.play?.().catch(() => { });
    vid.addEventListener('timeupdate', () => { const fim = vid.duration && vid.currentTime > vid.duration - 0.7; $('.lg-fade')?.classList.toggle('on', !!fim); });
  }
  UI.lgClk = setInterval(() => { const c = $('[data-lgclk]'); if (c) c.textContent = hhmm(Relogio.agora()); else pararLoginTimers(); }, 1000);
}
function pararLoginTimers() { if (UI.lgClk) { clearInterval(UI.lgClk); UI.lgClk = null; } }

/* abre a sessão de trabalho: base da nuvem (ou demonstração), registros do dia e tempo real */
async function iniciarSessao(novoLogin) {
  if (MODO_NUVEM) {
    if (novoLogin) { DIA = isoData(new Date()); LS.set('dia', DIA); }   // na nuvem, cada login abre a REDIA de hoje
    await Store.usarNuvem();
    await Store.carregar(DIA);
    Nuvem.tempoReal(CFG.uep, sincronizarTela);
  } else {
    await Store.usarMemoria();
    await Store.carregar(DIA);
  }
  atualizarEstado();
}
/* registros novos de outros usuários (tempo real ou leitura periódica) */
async function sincronizarTela() {
  if (!Store.remoto() || UI.sincronizando) return;
  UI.sincronizando = true;
  try {
    const n = await Store.sincronizar();
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
        <label class="lbl" for="mdl-s1">Nova senha</label><input id="mdl-s1" class="in" type="password" autocomplete="new-password" maxlength="72" data-mdl-in="s1">
        <label class="lbl" for="mdl-s2">Repita a nova senha</label><input id="mdl-s2" class="in" type="password" autocomplete="new-password" maxlength="72" data-mdl-in="s2">`,
      botoes: [{ id: 'cancelar', txt: opcional ? 'Cancelar' : 'Sair' }, { id: 'ok', txt: 'Salvar senha', cls: 'pri' }],
    });
    if (r.id !== 'ok') { if (!opcional) { sair(); } return false; }
    const erro = r.s1 !== r.s2 ? 'As senhas não conferem.' : r.s1.length < 8 ? 'A senha precisa ter ao menos 8 caracteres.' : !/[A-Za-z]/.test(r.s1) || !/\d/.test(r.s1) ? 'Use letras e números.' : USUARIO && r.s1.toUpperCase().includes(USUARIO.chave) ? 'A senha não pode conter a chave.' : '';
    if (erro) { aviso(erro, 'erro'); continue; }
    try { await Nuvem.trocarSenha(r.s1); aviso('Senha alterada.', 'ok'); return true; }
    catch (e) { aviso(e.message, 'erro'); }
  }
}

/* ======================= Início ======================= */
async function telaInicio() {
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
  render(cabecalhoApp({ id: 'inicio', titulo: 'Início' }) + `<div class="wrap">
    <div class="grid2 g-setup">
      <section class="pn"><h2>${nuvem ? 'Base de dados' : 'Armazenamento'}</h2>
        <p>${nuvem ? `Gravando na base <b>${esc(Store.nomeRaiz)}</b>. Cada ação vira um registro só de acréscimo, com autoria e hora oficial carimbadas pelo servidor; os demais usuários recebem a atualização ${Store.tempoReal ? 'em tempo real' : 'em até 15 s'}.` : Store.modo === 'memoria' ? 'Modo demonstração: os registros ficam só neste navegador. Use para conhecer o fluxo.' : 'Nenhum armazenamento ativo.'}</p>
        ${nuvem ? `<p class="note">${Store.online ? `Última sincronização às ${Store.ultimaLeitura ? hhmmss(Store.ultimaLeitura) : '—'} · ${Store.tempoReal ? 'tempo real conectado' : 'leitura periódica'}.` : '<b>Sem conexão com a base.</b> As alterações não são gravadas até a rede voltar.'}</p>` : ''}
        ${Store.modo ? `<div class="row" style="margin-top:8px">${nuvem ? '<button class="btn sm sec" data-act="sincronizar">Sincronizar agora</button>' : ''}<button class="btn sm" data-act="exportar">Exportar registros (JSON)</button>${!nuvem || podeAdministrar() ? `<label class="btn sm" for="imp">${nuvem ? 'Importar registros (migração)' : 'Importar registros'}</label><input id="imp" type="file" accept=".json" hidden>` : ''}</div>` : ''}
      </section>
      <section class="pn"><h2>Sessão</h2>
        <div class="fgrid">
          <div style="grid-column:1/-1"><span class="lbl">Nome</span><div class="ro">${esc(USUARIO.nome)}</div></div>
          <div><span class="lbl">Chave</span><div class="ro">${esc(USUARIO.chave)}</div></div>
          <div><span class="lbl">Posto · coordenação</span><div class="ro">${esc(USUARIO.posto)} · ${esc(USUARIO.coord)}</div></div>
        </div>
        <p class="note">${nuvem ? `Nome, chave e posto vêm do perfil cadastrado na base (${esc(CFG.uep)})${USUARIO.admin ? ' · administrador' : ''} e vão em cada registro como autor.` : 'Usuário fictício da demonstração.'} A sessão termina ao fechar o navegador ou em “Sair”.</p>
        <div class="row end">${nuvem ? '<button class="btn sec" data-act="senha">Alterar senha</button>' : ''}<a class="btn sec" href="#/curadoria/${USUARIO.coord}">Abrir minha curadoria</a><a class="btn" href="#/sair">Sair</a></div>
      </section>
    </div>
    ${Store.modo ? `<div class="grid2 g-dia" style="margin-top:16px">
      <section class="pn"><h2>REDIA do dia</h2>
        <div class="row"><label class="lbl" for="dia" style="margin:0">Data</label><input id="dia" type="date" class="in" style="width:auto" value="${DIA}"><button class="btn sm sec" data-act="dia">Abrir</button>
          <span class="chip ${f.id === 'congelada' || f.id === 'reuniao' ? 'ok' : f.id === 'congelar' ? 'at' : 'ne'}">${esc(f.nome)}</span></div>
        <div class="tl" role="img" aria-label="Linha do tempo do dia: agora ${hhmm(Relogio.agora())}">${seg.map(([a, b, n], i) => `<span class="sg s${i}" style="left:${pos(horaMin(a))}%;width:${pos(horaMin(b)) - pos(horaMin(a))}%">${n}</span>`).join('')}<i class="now" style="left:${pos(Relogio.minutos())}%"></i></div>
        <p class="note">06:00 passagem de turno · até ${H.preenchimento} preenchimento · ${H.preenchimento}–${H.congelamento} pré-REDIA · ${H.congelamento} congelamento · ${H.inicio}–${H.fim} REDIA · depois, ata.</p>
        ${!nuvem || USUARIO.admin || Relogio.simulado() ? `<div class="row"><label class="lbl" for="sim" style="margin:0">Simular horário</label><input id="sim" type="time" class="in" style="width:auto" value="${hhmm(Relogio.agora())}"><button class="btn sm sec" data-act="simular">Aplicar</button>${Relogio.simulado() ? '<button class="btn sm" data-act="real">Voltar ao horário real</button>' : ''}</div>` : ''}
        <div class="pauta-st${congelada() ? ' ok' : ''}">
          <div><b>${congelada() ? 'Pauta congelada' : 'Pauta em edição'}</b><span class="note">${congelada() ? `às ${hhmm(E.congelamento.criadoEm)} por ${esc(E.congelamento.autor.nome)} · código ${esc(E.congelamento.payload.hash)}` : `${COORDS.length - naoConcluidas(E).length} de ${COORDS.length} coordenações concluíram o preenchimento${naoConcluidas(E).length ? ' · falta: ' + naoConcluidas(E).join(', ') : ''}`}</span></div>
          ${congelada() ? '<button class="btn sec" data-act="descongelar">Descongelar pauta</button>' : '<button class="btn pri" data-act="congelar-ini">Congelar pauta</button>'}
        </div>
        ${!temDados ? `<div class="banner" style="margin-top:12px">Este dia ainda não tem registros. ${podeAdministrar() && EXEMPLO_DISPONIVEL ? `<button class="btn sm pri" data-act="exemplo">Carregar dados de exemplo</button><span class="note">Operação · dados de exemplo da P-75, sem nomes de pessoas${nuvem ? ' · ficam gravados na base marcados como exemplo' : ''}.</span>` : '<span class="note">Os dados chegam com o preenchimento das coordenações.</span>'}</div>` : ''}
      </section>
      <section class="pn"><h2>Situação das coordenações</h2>
        <div class="tbw"><table class="tb"><thead><tr><th>Coordenação</th><th>Preenchimento</th><th>Sugestões</th><th>Destaques</th><th>Na abertura</th><th></th></tr></thead><tbody>${COORDS.map(linhaCoord).join('')}</tbody></table></div>
        <div class="row" style="margin-top:12px"><a class="btn pri" href="#/apresentacao/1">Abrir a apresentação</a><a class="btn sec" href="#/ata">Fechamento e ata</a></div>
      </section>
    </div>` : ''}
  </div>`);
  const on = (a, fn) => { const b = $(`[data-act="${a}"]`); if (b) b.onclick = fn; };
  on('dia', async () => { try { await abrirDia($('#dia').value); } catch (e) { aviso(e.message, 'erro'); } });
  on('congelar-ini', congelarPauta);
  on('sincronizar', async () => { await sincronizarTela(); rerender(); });
  on('senha', () => trocarSenhaObrigatoria(true));
  on('descongelar', () => descongelarPauta());
  on('simular', () => { Relogio.simular($('#sim').value); rerender(); });
  on('real', () => { Relogio.real(); rerender(); });
  on('exemplo', async e => { e.target.disabled = true; try { const n = await carregarExemplo(DIA); atualizarEstado(); aviso(`${n} registros de exemplo gravados.`, 'ok'); } catch (x) { aviso('Não foi possível gravar o exemplo: ' + x.message, 'erro'); } rerender(); });
  on('exportar', () => baixar(`REDIA_${CFG.uep}_registros_${DIA}.json`, Store.exportar()));
  const imp = $('#imp'); if (imp) imp.onchange = async () => { try { const r = await Store.importar(await imp.files[0].text()); imp.value = ''; if (r.data && r.data !== DIA) await abrirDia(r.data); atualizarEstado(); aviso(`${r.n} registros importados${r.tipo === 'pacote' ? ' do pacote de ' + ddmm(r.data) : ''}.`, 'ok'); rerender(); } catch (e) { aviso(e.message, 'erro'); } };
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
  const fontes = Object.values(E.valores).filter(v => v.origem === 'A').reduce((acc, v) => { const f = (v.fonte || '').split(' ')[0]; if (f && (!acc[f] || acc[f] < v.em)) acc[f] = v.em; return acc; }, {});
  const lado = `<nav class="side" aria-label="Seções da curadoria">
      ${nav('dados', 'Dados automáticos')}${nav('sugestoes', 'Sugestões', pend)}${nav('destaques', 'Destaques da coordenação', ap)}${coord !== 'GEPLAT' ? nav('pfceo', 'Equipamentos e Sistemas · PFCEO', pfceoSelecao(E, coord).itens.length) : ''}${coord !== 'GEPLAT' ? nav('servicos', 'Serviços do dia', nAb + ' de ' + CFG.atividadesMax) : ''}${nav('itens', coord === 'GEPLAT' ? 'Pauta extra' : 'Ameaças e oportunidades')}${nav('demandas', 'Demandas', E.demandas.filter(d => d.payload.coord === coord && d.payload.status !== 'encerrada').length)}${coord === 'GEPLAT' ? nav('aceite', 'Aceite da pauta') : ''}
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
  const aviso_ = nts.length ? `<div class="banner nt"><b>Notificação do GEPLAT · ${hhmm(nts[nts.length - 1].criadoEm)}</b> ${esc(nts[nts.length - 1].payload.mensagem)} <button class="btn sm pri" data-act="concluir2">Concluir preenchimento</button></div>` : cc && !bloqueado() ? `<div class="banner ok">Preenchimento da ${coord} concluído às ${hhmm(cc.criadoEm)}. Alterações continuam possíveis até o congelamento.</div>` : '';
  // telas estreitas (tablet em pé, smartphone): seletor de coordenação + abas roláveis no topo e barra de conclusão fixa embaixo
  const abas = [['dados', 'Dados'], ['sugestoes', 'Sugestões', pend], ['destaques', 'Destaques', ap], ...(coord !== 'GEPLAT' ? [['pfceo', 'PFCEO'], ['servicos', 'Serviços']] : []), ['itens', coord === 'GEPLAT' ? 'Pauta extra' : 'Ameaças'], ['demandas', 'Demandas'], ...(coord === 'GEPLAT' ? [['aceite', 'Aceite']] : []), ...(MANUAIS[coord] || []).map(([id, rot]) => [id, rot])];
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
      <span class="m">${prio(s.payload.prioridade)}<span>${esc(s.payload.origem || '')}</span>${s.payload.abertoDias ? `<span class="chip ne">Aberto há ${s.payload.abertoDias} dias</span>` : ''}${estado(s)}</span>
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
        ${chkAbertura(coord, !!(d && d.abertura), dis)}
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

/* ---- destaques criados pelo coordenador (além das sugestões dos supervisores) ---- */
function abaDestaques(coord) {
  const ds = destaquesDe(E, coord), dis = bloqueado() ? 'disabled' : '';
  const own = ds.filter(d => d.fonte === 'C'), edit = own.find(d => d.id === UI.edDst);
  const nAb = destaquesAbertura(E, coord).length, geplat = coord === 'GEPLAT';
  const opt = (arr, val) => arr.map(o => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('');
  const v = edit || { titulo: '', tag: '', status: 'Atenção', semaforo: 'at', impacto: 'Produção', pedido: '', abertura: false, ref: { payload: { categoria: 'Operação' } } };
  const linha = d => `<tr${edit && d.id === edit.id ? ' class="sel"' : ''}><td>${semChip(d.semaforo)}</td><td><b>${esc(d.titulo)}</b><br><span class="note">${esc(d.tag)}${d.tag ? ' · ' : ''}${esc(d.status || '')}${d.pedido ? ' · pedido à base: ' + esc(d.pedido) : ''}</span></td>
    <td><span class="tg0">${d.fonte}</span> <span class="note">${d.fonte === 'PS' ? esc(d.ref.payload.origem || '') + ' · ' + esc(d.meta) : 'coordenação'}</span></td>
    <td>${geplat ? '<span class="chip ab">Abertura</span>' : `<label class="sw"><input type="checkbox" data-ab="${d.id}" ${d.abertura ? 'checked' : ''} ${dis}><span>Abertura</span></label>`}</td>
    <td class="note">${esc(d.por?.nome || '')} · ${hhmm(d.em)}</td>
    <td class="nw">${d.fonte === 'C' ? `<button class="btn sm lnk" data-edt="${d.id}" ${dis}>Editar</button><button class="btn sm lnk" data-rmd="${d.id}" ${dis}>Remover</button>` : `<a class="btn sm lnk" href="#/curadoria/${coord}/sugestoes" data-vsug="${d.id}">Ver sugestão</a>`}</td></tr>`;
  const html = `<section class="ed" style="grid-column:2 / -1">
    ${bloqueado() ? '<div class="banner">Pauta congelada: os destaques estão bloqueados para edição.</div>' : ''}
    <div class="pn"><h2>Destaques do ${geplat ? 'GEPLAT (tela de abertura)' : 'bloco ' + coord}</h2>
      <p class="note">${geplat ? 'Itens aprovados das sugestões e itens criados aqui aparecem na tela de abertura.' : `Sugestões aprovadas (PS) e itens criados pela coordenação (C) formam o bloco ${coord}. Marque “Abertura” nos muito importantes: o GEPLAT os apresenta na tela de abertura. Na abertura: <b>${nAb}</b> (recomendado até ${CFG.destaquesAberturaMax}).`}</p>
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
      ${chkAbertura(coord, v.abertura, dis).replace('id="f-ab"', 'id="d-ab"')}
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
        const c = { texto: tit.value.trim(), categoria: $('#d-cat').value, tag: $('#d-tag').value.trim(), status: $('#d-st').value, impacto: $('#d-imp').value, semaforo: ($('input[name="d-sem"]:checked') || {}).value || 'at', pedido: $('#d-ped').value.trim(), abertura: !!$('#d-ab')?.checked };
        if (!c.texto) { aviso('Informe o título.', 'erro'); tit.focus(); return; }
        const dest = c.abertura ? `no bloco ${coord} e na tela de abertura` : geplat ? 'na tela de abertura' : `no bloco ${coord}`;
        if (edit) { UI.edDst = null; salvarE('atualiza', { alvo: edit.id, campos: c }, {}, `Destaque atualizado (${dest}).`); }
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
  const campos = () => ({ titulo: $('#f-tit').value.trim(), categoria: $('#f-cat').value, tag: $('#f-tag').value.trim(), status: $('#f-st').value, impacto: $('#f-imp').value, semaforo: ($('input[name="f-sem"]:checked') || {}).value || 'at', pedido: $('#f-ped').value.trim(), abertura: !!$('#f-ab')?.checked });
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

/* ---- Equipamentos e Sistemas · PFCEO (D-42): o coordenador escolhe o que vai para a tela da coordenação ---- */
function abaPfceo(coord) {
  if (coord === 'GEPLAT') return abaDados(coord);
  const s = pfceoSelecao(E, coord), selSet = new Set(s.itens.map(PF.chave)), dis = bloqueado() ? 'disabled' : '';
  const fora = s.todos.filter(i => !selSet.has(PF.chave(i))), v = E.listas['pfceo.' + coord], max = CFG.pfceoMax || 6;
  const card = (i, dentro) => { const sd = PF.semDisp(i.disponibilidade), u = +i.unidades > 0 && i.disponiveis !== '' && i.disponiveis != null ? `${i.disponiveis}/${i.unidades} disponíveis` : '';
    return `<div class="pfk s-${sd}"><div class="row" style="justify-content:space-between;gap:8px"><b>${esc(i.funcao)}</b><span class="chip ${sd}">${esc(PF.curto(i.disponibilidade))}</span></div>
      <span class="note">${[i.tag, i.redundancia, u, i.condicao ? 'Condição ' + i.condicao : '', i.situacao].filter(Boolean).map(esc).join(' · ')}</span>
      ${i.nota ? `<span>${esc(i.nota)}</span>` : ''}${i.nm ? `<span class="note">NM ${esc(i.nm)}</span>` : ''}
      <button class="btn sm ${dentro ? '' : 'pri'}" data-pf="${esc(PF.chave(i))}" data-v="${dentro ? 0 : 1}" ${dis}>${dentro ? '‹ Retirar da tela' : 'Levar para a tela ›'}</button></div>`; };
  const html = `<section class="ed" style="grid-column:2 / -1">
    ${bloqueado() ? '<div class="banner">Pauta congelada: a seleção está bloqueada.</div>' : ''}
    <div class="pn"><h2>Equipamentos e Sistemas – PFCEO · ${coord}</h2>
      <p class="note">Status e disponibilidade das funções críticas do PFCEO (Portal de Integridade). A lista está em ordem de disponibilidade, piores primeiro. Leve para a tela os sistemas que a ${coord} vai apresentar; eles aparecem no card “Equipamentos e Sistemas – PFCEO” do bloco e no detalhe. ${v ? `Dados: ${esc(v.fonte || '')} · ${v.origem} · ${hhmm(v.em)}.` : 'Sem dados do PFCEO.'}</p>
      ${s.sugerida ? `<div class="banner">Seleção automática em uso (indisponíveis e com restrição). <button class="btn sm pri" data-act="pf-confirmar" ${dis}>Confirmar esta seleção</button></div>` : `<p class="note">Seleção feita por ${esc(s.reg.autor.nome)} às ${hhmm(s.reg.criadoEm)}.</p>`}
      ${s.itens.length > max ? `<div class="banner">${s.itens.length} sistemas na tela. No card cabem cerca de ${max}; os demais aparecem no detalhe.</div>` : ''}
    </div>
    <div class="pfgrid">
      <div class="pn"><h3>No PFCEO · piores primeiro (${fora.length})</h3>${fora.map(i => card(i, false)).join('') || '<p class="note">Todos os sistemas estão na tela.</p>'}</div>
      <div class="pn pfsel"><h3>Na tela da ${coord} (${s.itens.length})</h3>${s.itens.map(i => card(i, true)).join('') || '<p class="note">Nenhum sistema selecionado.</p>'}</div>
    </div>
    <details class="pn"><summary style="cursor:pointer;font-weight:700">Editar dados do PFCEO (entrada manual enquanto não há integração, I-03)</summary>${editorLista(LISTA['pfceo.' + coord])}</details>
  </section>`;
  return {
    html, dois: true, bind: () => {
      const gravar = ids => salvarE('selecao', { coord, campo: 'pfceo', ids }, {}, 'Seleção do PFCEO gravada.');
      $$('[data-pf]').forEach(b => b.onclick = () => {
        const ids = s.itens.map(PF.chave).filter(k => k !== b.dataset.pf);
        if (b.dataset.v === '1') ids.push(b.dataset.pf);
        gravar(ids);
      });
      const c = $('[data-act="pf-confirmar"]'); if (c) c.onclick = () => gravar(s.itens.map(PF.chave));
      bindDados(coord);
    },
  };
}

function notaAcumulado() {
  const M = E.mes || { n: 0, faltam: [] }, r = reservaQueima(E, DIA);
  return `<div class="banner${M.faltam.length ? '' : ' ok'}"><span><b>Acumulado do mês (soma diária do SITOP):</b> gás produzido ${M.gas != null ? fmtN(M.gas) + ' m³' : 'sem dado'} · queima ${M.queima != null ? fmtN(M.queima) + ' m³' : 'sem dado'} · ${M.n} dia${M.n === 1 ? '' : 's'}${M.n ? ` (${ddmm(M.dias[0].ref)} a ${ddmm(M.dias[M.n - 1].ref)})` : ''}${M.faltam.length ? ` · <b>sem dado em ${M.faltam.map(ddmm).join(', ')}</b> (abra o dia seguinte e informe o valor)` : ''}.${r.fonteP === 'manual' || r.fonteQ === 'manual' ? ' <b>Correção manual em uso</b>: apague o campo de correção para voltar à soma.' : ''}</span></div>`;
}
function abaDados(coord, manual = null) {
  const campos = manual ? CAMPOS.filter(c => manual[2].includes(c.id)) : CAMPOS.filter(c => c.coord === coord && !MANUAL_IDS.has(c.id));
  const listas = manual ? manual[3].map(id => LISTA[id]) : LISTAS.filter(l => l.coord === coord && !l.aba && !MANUAL_IDS.has(l.id));
  const grupos = [...new Set(campos.map(c => c.grupo))];
  const dis = bloqueado() ? 'disabled' : '';
  const inp = c => {
    const v = E.valores[c.id], val = v ? v.valor : '';
    if (c.tipo === 'semaforo') return `<select class="in" data-campo="${c.id}" ${dis}>${['', 'ok', 'at', 'nok'].map(s => `<option value="${s}" ${s === (val || '') ? 'selected' : ''}>${s ? SEM_NOME[s] : '(automático)'}</option>`).join('')}</select>`;
    if (c.tipo === 'opcao') return `<select class="in" data-campo="${c.id}" ${dis}><option value=""></option>${c.opcoes.map(o => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    if (c.tipo === 'num') return `<input class="in" type="number" step="any" data-campo="${c.id}" value="${val ?? ''}" ${dis}>`;
    return `<input class="in" data-campo="${c.id}" value="${esc(val ?? '')}" ${c.max ? `maxlength="${c.max}"` : ''} ${dis}>`;
  };
  const temA = id => (E.hist[id] || []).some(r => r.payload.origem === 'A');
  const html = `<section class="ed" style="grid-column:2 / -1">
    ${bloqueado() ? '<div class="banner">Pauta congelada: os dados estão bloqueados para edição.</div>' : ''}
    ${manual ? `<div class="pn"><h2>${esc(manual[1])} · ${coord}</h2><p class="note">Preenchimento manual: este item não tem captura automática. Cada gravação fica registrada com autor e horário.</p><p class="note">Aparece em: <b>${esc(manual[4][1])}</b> · <a href="${manual[4][0]}">Ver na apresentação ›</a></p></div>` : `<p class="note">Valores capturados automaticamente (origem A) podem ser corrigidos à mão: a correção vira origem M, com autor e horário, e o valor automático continua no histórico. Itens sem captura automática ficam em “Preenchimento manual”, no menu.</p>
    ${coord === 'COPROD' ? notaAcumulado() : ''}`}
    ${grupos.map(g => `<div class="pn"><h2>${esc(g)}</h2><div class="tbw"><table class="tb dd"><thead><tr><th>Campo</th><th style="width:34%">Valor</th><th>Unidade</th><th>Origem</th><th></th></tr></thead><tbody>
      ${campos.filter(c => c.grupo === g).map(c => `<tr><td><label for="cp-${c.id}">${esc(c.rot)}</label></td><td>${inp(c).replace('data-campo=', `id="cp-${c.id}" data-campo=`)}</td><td>${esc(c.un || '')}</td><td>${origemTxt(E.valores[c.id])}</td><td>${E.valores[c.id]?.origem === 'M' && temA(c.id) && !bloqueado() ? `<button class="btn sm lnk" data-rest="${c.id}">Restaurar automático</button>` : ''}</td></tr>`).join('')}
    </tbody></table></div><div class="row end" style="margin-top:8px"><button class="btn sec" data-grupo="${esc(g)}" ${dis}>Salvar ${esc(g.toLowerCase())}</button></div></div>`).join('')}
    ${listas.map(l => editorLista(l)).join('')}
  </section>`;
  return { html, dois: true, bind: () => bindDados(coord) };
}
function editorLista(l) {
  const it = L(E, l.id), dis = bloqueado() ? 'disabled' : '';
  const cel = (c, val) => c.tipo === 'opcao' ? `<select class="in" data-k="${c.k}" ${dis}>${c.opcoes.map(o => `<option value="${esc(o)}" ${o === val ? 'selected' : ''}>${esc(c.nomes?.[o] || o)}</option>`).join('')}</select>` : `<input class="in" data-k="${c.k}" ${c.tipo === 'num' ? 'type="number" step="any"' : c.tipo === 'data' ? 'type="date"' : ''} value="${esc(val ?? '')}" ${dis}>`;
  const linha = r => `<tr>${l.cols.map(c => `<td>${cel(c, r[c.k])}</td>`).join('')}<td><button class="btn sm lnk" data-del ${dis}>Remover</button></td></tr>`;
  return `<div class="pn" data-lista="${l.id}"><h2>${esc(l.rot)}</h2><p class="note">${origemTxt(E.listas[l.id])}</p>
    <div class="tbw"><table class="tb"><thead><tr>${l.cols.map(c => `<th>${esc(c.rot)}</th>`).join('')}<th></th></tr></thead><tbody>${it.map(linha).join('')}</tbody>
    <template>${linha({})}</template></table></div>
    <div class="row" style="margin-top:8px"><button class="btn sm" data-add ${dis}>Adicionar linha</button><span style="flex:1"></span><button class="btn sec" data-salvar ${dis}>Salvar lista</button></div></div>`;
}
function bindDados(coord) {
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
      atualizarEstado(); aviso(n ? `${n} valor(es) gravado(s).` : 'Nada mudou.', n ? 'ok' : 'info'); rerender();
    } catch (e) { aviso(e.message, 'erro'); }
  });
  $$('[data-rest]').forEach(b => b.onclick = () => {
    const id = b.dataset.rest, a = [...E.hist[id]].reverse().find(r => r.payload.origem === 'A');
    salvarE('valor', { campo: id, valor: a.payload.valor, origem: 'A', fonte: (a.payload.fonte || '') + ' (restaurado)' }, {}, 'Valor automático restaurado.');
  });
  $$('[data-lista]').forEach(box => {
    const l = LISTA[box.dataset.lista], tb = $('tbody', box), tpl = $('template', box);
    const bindDel = () => $$('[data-del]', tb).forEach(d => d.onclick = () => d.closest('tr').remove());
    bindDel();
    $('[data-add]', box).onclick = () => { if (l.max && tb.rows.length >= l.max) return aviso(`Máximo de ${l.max} linhas.`, 'erro'); tb.appendChild(tpl.content.firstElementChild.cloneNode(true)); rotularTabelas(box); bindDel(); };
    $('[data-salvar]', box).onclick = () => {
      const itens = [...tb.rows].map(tr => Object.fromEntries(l.cols.map(c => { const el = $(`[data-k="${c.k}"]`, tr); let v = el.value.trim(); if (c.tipo === 'num') v = v === '' ? null : +v; return [c.k, v]; }))).filter(o => Object.values(o).some(v => v !== '' && v !== null));
      const erro = l.validar ? l.validar(itens) : null; if (erro) return aviso(erro, 'erro');
      salvarE('lista', { campo: l.id, itens, origem: 'M', fonte: 'Manual' }, {}, 'Lista gravada.');
    };
  });
}

function abaServicos(coord) {
  const sv = E.servicos.filter(s => s.payload.coord === coord), nAb = sv.filter(s => s.payload.abertura).length, dis = bloqueado() ? 'disabled' : '';
  const html = `<section class="ed" style="grid-column:2 / -1">
    <div class="pn"><h2>Serviços planejados hoje · ${coord}</h2>
      <p class="note">Origem PT = planejamento diário de PTs do APLAT (automático, quando a integração existir: I-24). Origem M = incluído pelo coordenador. Marque “Abertura” para levar o serviço às Principais atividades do GEPLAT: até ${CFG.atividadesMax}, recomendado ${CFG.atividadesRecomendado}.</p>
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
      <div class="tbw"><table class="tb"><thead><tr><th>Tipo</th><th>${geplat ? 'Tema' : 'Texto'}</th>${geplat ? '<th>Nota curta</th>' : ''}<th>Semáforo</th><th>Por</th><th></th></tr></thead><tbody>
      ${it.map(i => `<tr><td>${esc({ ameaca: 'Ameaça', oportunidade: 'Oportunidade', pauta_extra: 'Pauta extra' }[i.payload.tipo])}</td><td><b>${esc(i.payload.texto)}</b></td>${geplat ? `<td>${esc(i.payload.detalhe || '')}</td>` : ''}<td>${semChip(i.payload.semaforo)}</td><td class="note">${esc(i.autor.nome)} · ${hhmm(i.criadoEm)}</td><td><button class="btn sm lnk" data-rm="${i.id}" ${dis}>Remover</button></td></tr>`).join('') || `<tr><td colspan="6" class="note">Nenhum item.</td></tr>`}
      </tbody></table></div></div>
    <div class="pn"><h2>Incluir</h2><div class="fgrid">
      <div><label class="lbl" for="i-tipo">Tipo</label><select id="i-tipo" class="in" ${dis}>${tipos.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></div>
      ${geplat ? `<div><label class="lbl" for="i-txt">Tema</label><select id="i-txt" class="in" ${dis}>${CFG.temasPlataforma.map(t => `<option>${esc(t)}</option>`).join('')}</select></div><div><label class="lbl" for="i-det">Nota curta</label><input id="i-det" class="in" maxlength="60" ${dis}></div>` : `<div style="grid-column:span 2"><label class="lbl" for="i-txt">Texto (até 90 caracteres)</label><input id="i-txt" class="in" maxlength="90" ${dis}></div>`}
      <div><label class="lbl" for="i-sem">Semáforo</label><select id="i-sem" class="in" ${dis}><option value="at">Atenção</option><option value="nok">Não OK</option><option value="ok">OK</option></select></div></div>
      <div class="row end" style="margin-top:8px"><button class="btn pri" data-act="add-item" ${dis}>Incluir</button></div></div>
  </section>`;
  return {
    html, dois: true, bind: () => {
      $$('[data-rm]').forEach(b => b.onclick = () => salvarE('remove', { alvo: b.dataset.rm }, {}, 'Item removido.'));
      const add = $('[data-act="add-item"]'); if (add) add.onclick = () => {
        const t = $('#i-txt').value.trim(); if (!t) return aviso('Informe o texto.', 'erro');
        salvarE('item', { coord, tipo: $('#i-tipo').value, texto: t, detalhe: geplat ? $('#i-det').value.trim() : '', semaforo: $('#i-sem').value, ordem: it.length + 1 }, {}, 'Item incluído.');
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
  return { html: `<section class="ed" style="grid-column:2 / -1"><div class="pn"><h2>Demandas base ↔ bordo · ${coord}</h2>${tabelaDemandas(lista)}</div><div class="pn"><h2>Nova demanda</h2>${formDemanda(coord)}</div></section>`, dois: true, bind: bindDemandas };
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

/* ======================= Apresentação ======================= */
let tickPres = null, ocultarCtrl = null;
function telaApresentacao(m) {
  const P = UI.pres, b = +m[1];
  if (P.bloco !== b || P.restante === null) { P.bloco = b; P.restante = CFG.timeboxMin * 60; P.rodando = P.rodando && P.restante > 0; }
  const ctx = { dia: DIA, congelada: congelada(), timer: fmtTimer(P.restante) };
  const top = m[2] && topicoValido(b, m[2]) ? m[2] : null;
  const tela = top ? telaDetalhe(estadoApresentacao(b), ctx, b, top) : TELAS[b - 1](estadoApresentacao(b), ctx);
  render(`<div class="pres" role="region" aria-label="Apresentação da REDIA"><div class="stw"><div class="stage">${tela}</div></div></div>
    <div class="ctrl" id="ctrl"><a class="btn sm" href="#/apresentacao/${Math.max(1, b - 1)}" aria-label="Bloco anterior">◀</a>
    ${[1, 2, 3, 4, 5].map(i => `<a class="btn sm${i === b ? ' on' : ''}" href="#/apresentacao/${i}">${i}</a>`).join('')}
    <a class="btn sm" href="#/apresentacao/${Math.min(5, b + 1)}" aria-label="Próximo bloco">▶</a>
    <button class="btn sm" data-act="tmr">${P.rodando ? 'Pausar' : 'Iniciar'} cronômetro</button><button class="btn sm" data-act="zera">Zerar</button>
    <button class="btn sm" data-act="tela">Tela cheia</button><a class="btn sm" href="#/inicio">Sair</a>
    <span class="cl">← → blocos · espaço cronômetro · F tela cheia</span></div>`);
  ajustarPalco(); encaixar($('.stage')); atualizarTimer();
  $('[data-act="tmr"]').onclick = alternarTimer; $('[data-act="zera"]').onclick = () => { P.restante = CFG.timeboxMin * 60; P.rodando = false; rerender(); };
  $('[data-act="tela"]').onclick = telaCheia;
  mostrarCtrl();
}
function fmtTimer(s) { const neg = s < 0, a = Math.abs(s); return `${neg ? '+' : ''}${pad(Math.floor(a / 60))}:${pad(a % 60)}`; }
function atualizarTimer() { const el = $('[data-tmr]'); if (el) { el.textContent = fmtTimer(UI.pres.restante); el.classList.toggle('alerta', UI.pres.restante <= 60); } }
function alternarTimer() { UI.pres.rodando = !UI.pres.rodando; UI.pres.ult = Date.now(); const b = $('[data-act="tmr"]'); if (b) b.textContent = (UI.pres.rodando ? 'Pausar' : 'Iniciar') + ' cronômetro'; }
function ajustarPalco() {
  const w = $('.stw'); if (!w) return;
  const s = Math.min(innerWidth / 1920, innerHeight / 1080);
  w.style.transform = `scale(${s})`; w.style.left = ((innerWidth - 1920 * s) / 2) + 'px'; w.style.top = ((innerHeight - 1080 * s) / 2) + 'px';
}
function telaCheia() { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => { }); else document.exitFullscreen?.(); }
function mostrarCtrl() { const c = $('#ctrl'); if (!c) return; c.classList.remove('hide'); clearTimeout(ocultarCtrl); ocultarCtrl = setTimeout(() => c.classList.add('hide'), 3000); }

/* ======================= Fechamento e ata ======================= */
function telaAta() {
  const f = fase(), cong = E.congelamento;
  const hoje = E.demandas.filter(d => d.payload.dataRedia === DIA), ant = E.demandas.filter(d => d.payload.dataRedia !== DIA && d.payload.status !== 'encerrada');
  const trans = E.anexos.filter(a => a.payload.tipo === 'transcricao');
  const ata = E.atas[E.atas.length - 1];
  const apr = E.sugestoes.filter(s => s.decisao?.payload.acao === 'aprovar').length, rec = E.sugestoes.filter(s => s.decisao?.payload.acao === 'recusar').length;
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
    <section class="pn" style="margin-top:16px"><h2>Demandas registradas nesta REDIA</h2>${tabelaDemandas(hoje)}<h3>Nova demanda</h3>${formDemanda(null)}</section>
    <section class="pn" style="margin-top:16px"><h2>Demandas de reuniões anteriores em aberto</h2>${tabelaDemandas(ant)}</section>
    <div class="grid2" style="margin-top:16px">
      <section class="pn"><h2>Transcrição do Teams</h2>
        ${trans.length ? trans.map(t => `<p>Anexada: <b>${esc(t.payload.nome)}</b> (${fmtN(t.payload.tamanho / 1024, 0)} kB) por ${esc(t.autor.nome)} às ${hhmm(t.criadoEm)}${t.payload.caminho ? ` <button class="btn sm sec" data-arq="${esc(t.payload.caminho)}">Baixar</button>` : ''}</p>`).join('') : '<p class="note">Baixe a transcrição da reunião no Teams (.docx ou .vtt) e anexe aqui.</p>'}
        <label class="btn sec" for="trans">Anexar transcrição</label><input id="trans" type="file" accept=".docx,.vtt,.txt,.pdf" hidden>
        ${!Store.remoto() ? '<p class="note">No modo demonstração só o nome do arquivo é registrado.</p>' : '<p class="note">Limite de 25 MB por arquivo.</p>'}
      </section>
      <section class="pn"><h2>Ata</h2>
        ${ata ? `<div class="banner ok">Ata fechada por ${esc(ata.autor.nome)} às ${hhmm(ata.criadoEm)}.${ata.payload.caminho ? ` <button class="btn sm sec" data-arq="${esc(ata.payload.caminho)}">Baixar arquivo da ata</button>` : ''}</div>` : ''}
        <label class="lbl" for="at-part">Participantes (um por linha)</label><textarea id="at-part" class="in" rows="4">${esc((ata?.payload.participantes || []).join('\n'))}</textarea>
        <label class="lbl" for="at-obs">Decisões e observações</label><textarea id="at-obs" class="in" rows="4">${esc(ata?.payload.observacoes || '')}</textarea>
        <div class="row end" style="margin-top:8px"><button class="btn sec" data-act="ver-ata">Imprimir ata</button><button class="btn pri" data-act="fechar-ata">${ata ? 'Atualizar ata' : 'Fechar ata e gerar arquivo'}</button></div>
      </section></div>
  </div><iframe id="ifr-ata" title="Ata para impressão" style="position:absolute;width:0;height:0;border:0"></iframe>`);
  bindDemandas();
  const on = (a, fn) => { const b = $(`[data-act="${a}"]`); if (b) b.onclick = fn; };
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
  on('ver-ata', () => { const ifr = $('#ifr-ata'); ifr.srcdoc = gerarAtaHtml(dadosAta()); ifr.onload = () => ifr.contentWindow.print(); });
  on('fechar-ata', async () => {
    try {
      const d = dadosAta(), html = gerarAtaHtml(d), nome = `ata_REDIA_${CFG.uep}_${DIA}.html`;
      const caminho = await Store.gravarArquivo(DIA, nome, html, 'text/html');
      await registrar('ata', { ...d, caminho });
      if (!caminho) baixar(nome, html, 'text/html');
      atualizarEstado(); aviso(caminho ? 'Ata gravada nos arquivos da REDIA.' : 'Ata gerada e baixada.', 'ok'); rerender();
    } catch (e) { await tratarErroGravacao(e); }
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
        <h3>Pauta</h3><div class="fgrid">${num('c-tb', 'Tempo por bloco (min)', C.timeboxMin, 1)}${num('c-dq', 'Destaques por bloco', C.destaquesPorBloco, 1)}${num('c-am', 'Atividades na abertura (máx.)', C.atividadesMax, 1)}${num('c-ar', 'Atividades recomendadas', C.atividadesRecomendado, 1)}</div></section>
      <section class="pn"><h2>Semáforos v0</h2><div class="fgrid">
        ${num('l-ef-ok', 'EFOP · OK a partir de (%)', L.efop.ok)}${num('l-ef-at', 'EFOP · Atenção a partir de (%)', L.efop.at)}
        ${num('l-in-ok', 'Injeção · OK a partir de (% da meta)', L.injecao.ok)}${num('l-in-at', 'Injeção · Atenção a partir de (%)', L.injecao.at)}
        ${num('l-iu', 'IUGA · faixa de atenção (p.p. abaixo da meta)', L.iugaFaixaAtencao)}${num('l-ma', 'Manutenção · faixa de atenção (p.p.)', L.manutencaoFaixaAtencao)}
        ${num('l-ut-ok', 'Utilidades · OK acima de (% do mínimo)', L.utilidades.ok)}${num('l-ut-d', 'Utilidades · atenção se chega ao mínimo em (dias)', L.utilidades.diasAtencao)}</div></section>
      <section class="pn"><h2>Calendário da pauta extra</h2><div class="fgrid">${[1, 2, 3, 4, 5, 6, 0].map(d => `<div><label class="lbl" for="pe-${d}">${DIAS[d]}</label><input id="pe-${d}" class="in" value="${esc(C.pautaExtra[d] || '')}"></div>`).join('')}</div></section>
    </div>
    <div class="row end" style="margin-top:16px"><button class="btn sec" data-act="padrao" ${podeAdministrar() ? '' : 'disabled'}>Restaurar padrão</button><button class="btn pri" data-act="salvar-cfg" ${podeAdministrar() ? '' : 'disabled'}>Salvar configuração</button></div>
  </div>`);
  $('[data-act="salvar-cfg"]').onclick = async () => {
    const n = id => +$('#' + id).value;
    if (!Store.remoto()) CFG.uep = $('#c-uep').value.trim() || 'P-83';
    CFG.campo = $('#c-campo').value.trim(); CFG.ativo = $('#c-ativo').value.trim();
    for (const k of ['preenchimento', 'congelamento', 'inicio', 'fim']) CFG.horarios[k] = $('#h-' + k).value;
    CFG.horarios.preRedia = CFG.horarios.preenchimento;
    CFG.timeboxMin = n('c-tb'); CFG.destaquesPorBloco = n('c-dq'); CFG.atividadesMax = n('c-am'); CFG.atividadesRecomendado = n('c-ar');
    Object.assign(CFG.limiares.efop, { ok: n('l-ef-ok'), at: n('l-ef-at') }); Object.assign(CFG.limiares.injecao, { ok: n('l-in-ok'), at: n('l-in-at') });
    CFG.limiares.iugaFaixaAtencao = n('l-iu'); CFG.limiares.manutencaoFaixaAtencao = n('l-ma'); CFG.limiares.utilidades.ok = n('l-ut-ok'); CFG.limiares.utilidades.diasAtencao = n('l-ut-d');
    for (const d of [0, 1, 2, 3, 4, 5, 6]) CFG.pautaExtra[d] = $('#pe-' + d).value.trim();
    try { await Store.salvarConfig(); atualizarEstado(); aviso('Configuração salva.', 'ok'); rerender(); } catch (e) { aviso(e.message, 'erro'); }
  };
  $('[data-act="padrao"]').onclick = async () => { const uep = CFG.uep; CFG = mesclarCfg({}); if (Store.remoto()) CFG.uep = uep; try { await Store.salvarConfig(); aviso('Padrão restaurado.', 'ok'); } catch (e) { aviso(e.message, 'erro'); } rerender(); };
}

/* ======================= inicialização ======================= */
async function iniciar() {
  window.addEventListener('hashchange', rotear);
  window.addEventListener('resize', ajustarPalco);
  matchMedia('(max-width: 900px)').addEventListener?.('change', () => { if (ROTA_ATUAL && ROTA_ATUAL.id !== 'apresentacao' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) rerender(); });
  document.addEventListener('mousemove', () => { if (ROTA_ATUAL?.id === 'apresentacao') mostrarCtrl(); });
  document.addEventListener('keydown', e => {
    if (ROTA_ATUAL?.id !== 'apresentacao' || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const b = UI.pres.bloco, det = !!ROTA_ATUAL.m?.[2];
    if (det && ['ArrowLeft', 'PageUp', 'Escape', 'Backspace'].includes(e.key) && !(e.key === 'Escape' && document.fullscreenElement)) { e.preventDefault(); location.hash = '#/apresentacao/' + b; return; }
    if (['ArrowRight', 'PageDown'].includes(e.key)) { e.preventDefault(); location.hash = '#/apresentacao/' + Math.min(5, b + 1); }
    else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); location.hash = '#/apresentacao/' + Math.max(1, b - 1); }
    else if (/^[1-5]$/.test(e.key)) location.hash = '#/apresentacao/' + e.key;
    else if (e.key === ' ') { e.preventDefault(); alternarTimer(); }
    else if (e.key.toLowerCase() === 'f') telaCheia();
    else if (e.key === 'Escape' && !document.fullscreenElement) location.hash = '#/inicio';
  });
  setInterval(() => {
    const P = UI.pres;
    if (P.rodando) { const agora = Date.now(); if (agora - P.ult >= 1000) { P.restante -= Math.floor((agora - P.ult) / 1000); P.ult = agora - ((agora - P.ult) % 1000); atualizarTimer(); } }
    const c = $('[data-clk]'); if (c) c.textContent = hhmm(Relogio.agora());
  }, 250);
  // leitura periódica da base: a cada 15 s sem tempo real; a cada 60 s com tempo real (rede de segurança)
  let tique = 0;
  setInterval(() => { tique++; if (Store.remoto() && (!Store.tempoReal || tique % 4 === 0)) sincronizarTela(); }, 15000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sincronizarTela(); });
  window.addEventListener('online', () => sincronizarTela());
  // sessão: na nuvem, vale a sessão do Supabase nesta aba; na demonstração, a sessão local
  if (MODO_NUVEM) {
    const perfil = await Nuvem.restaurar();
    if (perfil && !perfil.trocarSenha) { definirUsuario(perfil); try { await iniciarSessao(false); } catch (e) { aviso('Não foi possível abrir a REDIA: ' + e.message, 'erro'); } }
    else { USUARIO = null; SS.del('sessao'); if (perfil) await Nuvem.sair(); }
  } else if (USUARIO) await iniciarSessao(false);
  rotear();
}
document.addEventListener('DOMContentLoaded', iniciar);
