/* ===================== REDIA P-83 · ata em PDF (D-55) ===================== */
'use strict';
/* A ata sai em PDF, gerado no próprio navegador:
   1) relatório em retrato (A4), com texto selecionável;
   2) anexo com o print de todas as telas da apresentação (5 blocos + páginas de detalhe), capturadas no momento
      do fechamento, uma por página em paisagem, com os dados de referência da REDIA usados em cada tela.
   Bibliotecas servidas junto com o app (sem CDN): modern-screenshot (captura com a renderização do próprio navegador) e jsPDF + AutoTable (PDF). */
const VENDOR_PDF = ['vendor/modern-screenshot-4.7.0.umd.js', 'vendor/jspdf-4.2.1.umd.min.js', 'vendor/jspdf-autotable-5.0.7.min.js'];
function carregarScript(src) {
  return new Promise((ok, erro) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => erro(new Error('Não foi possível carregar ' + src + '.')); document.head.appendChild(s); });
}
async function carregarLibsPdf() {
  if (!window.modernScreenshot) await carregarScript(VENDOR_PDF[0]);
  if (!window.jspdf) await carregarScript(VENDOR_PDF[1]);
  if (!window.jspdf.jsPDF.API.autoTable) { if (!window.applyPlugin) await carregarScript(VENDOR_PDF[2]); window.applyPlugin?.(window.jspdf.jsPDF); }
}

/* as fontes padrão do PDF cobrem o alfabeto latino, mas não ³, ², setas e índices: troca esses poucos símbolos (m³ → m3) */
const PDF_TROCA = { '³': '3', '²': '2', '→': '->', '←': '<-', '↔': '<->', '₂': '2', '≥': '>=', '≤': '<=', '−': '-', '✓': 'OK', ' ': ' ', ' ': ' ', ' ': ' ' };
const CP1252 = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');
const tx = s => String(s ?? '').replace(/[^\x00-\x7e\xa0-\xb1\xb4-\xff]/g, c => PDF_TROCA[c] ?? (CP1252.has(c) ? c : '?'));

/* telas da apresentação: 5 blocos, com as páginas de detalhe de cada coordenação logo após o seu bloco */
function telasDaAta() {
  const t = [];
  for (let b = 1; b <= 5; b++) {
    t.push({ b, top: null, titulo: `Bloco ${b} · ${['GEPLAT · Abertura', 'COPROD · Produção', 'COEMB · Embarcação', 'COMAN · Manutenção', 'GEPLAT · Fechamento'][b - 1]}` });
    for (const [top, rot] of TOPICOS[b] || []) t.push({ b, top, titulo: `Bloco ${b} · ${BLOCO_COORD[b]} · detalhe: ${TIT_DET[top] || rot}` });
  }
  return t;
}
/* fontes automáticas usadas no estado da tela: sistema → hora da última captura */
function fontesDoEstado(S) {
  const f = {};
  for (const v of [...Object.values(S.valores || {}), ...Object.values(S.listas || {})]) {
    if (v?.origem !== 'A') continue; const nome = String(v.fonte || '').split(' ')[0]; if (!nome) continue;
    if (!f[nome] || f[nome] < v.em) f[nome] = v.em;
  }
  return Object.entries(f).sort((a, b) => a[0].localeCompare(b[0])).map(([n, t]) => `${n} ${hhmm(t)}`);
}
function pdfProgresso(n, total, txt) {
  let o = $('.ata-prog');
  if (!o) { o = document.createElement('div'); o.className = 'ata-prog'; o.setAttribute('role', 'status'); o.setAttribute('aria-live', 'polite'); document.body.appendChild(o); }
  const pct = total ? Math.round(n / total * 100) : 0;
  o.innerHTML = `<div class="ata-prog-c"><b>Gerando a ata em PDF</b><span class="note">${esc(txt)}</span><div class="capt-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div><span class="capt-pct">${pct}%</span></div>`;
}
/* captura uma tela 1920×1080 fora da área visível e devolve a imagem JPEG (1600×900) */
async function capturarTela(html) {
  const box = document.createElement('div'); box.className = 'ata-cap'; box.innerHTML = `<div class="stage">${html}</div>`;
  document.body.appendChild(box);
  try {
    const st = $('.stage', box); encaixar(st);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return await window.modernScreenshot.domToJpeg(st, { width: 1920, height: 1080, scale: 1600 / 1920, quality: 0.86, backgroundColor: '#F3F3F3', workerNumber: 0 });
  } finally { box.remove(); }
}

async function gerarAtaPdf(d) {
  await carregarLibsPdf();
  const { jsPDF } = window.jspdf;
  const agora = Relogio.agora(), quem = USUARIO ? `${USUARIO.nome} (${USUARIO.chave})` : '(sem usuário)';
  const cong = E.congelamento, S = cong ? { ...E, ...cong.payload.snapshot } : E;
  const telas = telasDaAta(), total = telas.length + 2;
  const VERDE = [0, 133, 66], CINZA = [117, 120, 123], AMARELO = [253, 200, 47];
  const ref = cong ? `Pauta congelada às ${hhmm(cong.criadoEm)} por ${cong.autor.nome} · código de integridade ${cong.payload.hash}` : 'Pauta não congelada · telas da versão em edição no momento do fechamento';
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  doc.setProperties({ title: tx(`Ata REDIA ${CFG.uep} ${ddmmaaaa(DIA)}`), subject: 'Reunião diária bordo × base', author: tx(quem), creator: tx(`REDIA ${CFG.uep} v${APP.versao}`), keywords: 'REDIA, ata, INTERNA' });

  /* ---------- 1) relatório (retrato) ---------- */
  pdfProgresso(0, total, 'Montando o relatório');
  const M = 16, W = 210 - 2 * M; let y = M;
  const novaPg = h => { if (y + h > 297 - 18) { doc.addPage('a4', 'portrait'); y = M; } };
  const par = (t, { tam = 10.5, cor = [0, 0, 0], neg = false, esp = 1.5, rec = 0 } = {}) => {
    doc.setFont('helvetica', neg ? 'bold' : 'normal'); doc.setFontSize(tam); doc.setTextColor(...cor);
    for (const l of doc.splitTextToSize(tx(t), W - rec)) { novaPg(tam * 0.42); doc.text(l, M + rec, y + tam * 0.35); y += tam * 0.42 + 0.6; }
    y += esp;
  };
  const tit = t => { novaPg(14); y += 3; par(t, { tam: 13, neg: true, esp: 0.5 }); doc.setDrawColor(...VERDE); doc.setLineWidth(0.6); doc.line(M, y, M + W, y); y += 3; };
  const lista = (itens, vazio = '—') => { if (!itens.length) return par(vazio); for (const i of itens) { novaPg(5); doc.setFillColor(...VERDE); doc.rect(M + 1, y + 1.6, 1.4, 1.4, 'F'); par(i, { rec: 5, esp: 0.4 }); } y += 1.2; };
  const tabela = (head, body, larg) => {
    doc.autoTable({ startY: y, head: [head.map(tx)], body: body.map(r => r.map(tx)), margin: { left: M, right: M }, theme: 'plain',
      styles: { font: 'helvetica', fontSize: 9.5, cellPadding: 1.6, textColor: [0, 0, 0], lineColor: [232, 232, 232], lineWidth: { bottom: 0.2 } },
      headStyles: { fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: { bottom: 0.5 } }, columnStyles: larg || {} });
    y = doc.lastAutoTable.finalY + 4;
  };

  par(`REDIA ${CFG.uep} · Reunião diária bordo × base`, { tam: 9.5, cor: VERDE, neg: true, esp: 0.5 });
  par(`Ata de ${diaSemana(DIA).toLowerCase()}, ${ddmmaaaa(DIA)}`, { tam: 20, neg: true, esp: 0.5 });
  doc.setFillColor(...AMARELO); doc.rect(M, y, 10, 1.1, 'F'); y += 5;
  doc.setFillColor(...VERDE); doc.circle(M + 2.2, y + 1.6, 2.2, 'F'); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text('I', M + 2.2, y + 2.6, { align: 'center' });
  doc.setTextColor(...CINZA); doc.setFontSize(9); doc.text('INTERNA', M + 6, y + 2.8); y += 8;
  par(`${ref}.`);
  par(`Ata gerada em ${ddmmaaaa(DIA)} às ${hhmm(agora)} por ${quem}. Versão do sistema: REDIA ${CFG.uep} v${APP.versao}.`, { cor: CINZA, tam: 9.5 });

  tit('Participantes'); lista(d.participantes);
  tit('Situação da unidade');
  par(`[${SEM_NOME[V(S, 'geplat.situacao_sem')] || '—'}] ${V(S, 'geplat.situacao') || '—'}`);
  const linhaV = (rot, campo, dec, un) => [rot, fmtU(VN(S, campo), dec, un), `${S.valores[campo]?.origem || ''} ${S.valores[campo]?.fonte || ''}`.trim() || '—'];
  tabela(['Indicador', 'Valor', 'Origem'], [linhaV('Produção de óleo (D-1)', 'oleo.real', 0, 'm³/d'), linhaV('Potencial', 'oleo.potencial', 0, 'm³/d'), linhaV('IUGA (D-1)', 'iuga.real', 2, '%'), linhaV('Injeção de gás', 'gas.real', 0, 'Mm³/d'), linhaV('Injeção de água', 'agua.real', 0, 'm³/d'), linhaV('Estoque', 'off.estoque', 0, 'm³'), linhaV('POB', 'pob.atual', 0, '')], { 0: { cellWidth: 60 }, 1: { cellWidth: 40 } });

  tit('Blocos');
  for (const c of ['COPROD', 'COEMB', 'COMAN']) {
    par(`${c} · ${COORD_NOME[c]}`, { tam: 11, neg: true, esp: 0.8 });
    const ap = destaquesDe(S, c), am = itensDe(S, c, 'ameaca'), at = atividadesAbertura(S, c), pf = pfceoSelecao(S, c);
    if (ap.length) { par('Destaques', { neg: true, tam: 9.5, esp: 0.3 }); lista(ap.map(x => `[${SEM_NOME[x.semaforo]}] ${x.titulo}${x.pedido ? ' · pedido à base: ' + x.pedido : ''} (${x.fonte === 'PS' ? 'PS ' + x.ref.payload.passagem : 'coordenação'}${x.abertura ? ' · apresentado na abertura' : ''})`)); }
    if (pf.abertura.length) { par('PFCEO na abertura', { neg: true, tam: 9.5, esp: 0.3 }); lista(pf.abertura.map(i => `${i.funcao} · ${PF.curto(i.disponibilidade)}${i.nota ? ' · ' + i.nota : ''}`)); }
    if (am.length) { par('Ameaças', { neg: true, tam: 9.5, esp: 0.3 }); lista(am.map(i => `[${SEM_NOME[i.payload.semaforo]}] ${i.payload.texto}`)); }
    if (at.length) { par('Principais atividades', { neg: true, tam: 9.5, esp: 0.3 }); lista(at.map(s => `${s.payload.titulo} (${s.payload.origem})`)); }
    if (!ap.length && !am.length && !at.length && !pf.abertura.length) par('Sem itens registrados.', { cor: CINZA });
  }
  par('Pauta extra', { tam: 11, neg: true, esp: 0.8 });
  lista([`Tema do dia: ${CFG.pautaExtra[parseData(DIA).getDay()] || '—'}`, ...itensDe(S, 'GEPLAT', 'pauta_extra').map(i => `[${SEM_NOME[i.payload.semaforo]}] ${i.payload.texto}: ${i.payload.detalhe || ''}`)]);

  tit('Demandas registradas na reunião');
  const dem = E.demandas.filter(x => x.payload.dataRedia === DIA);
  if (dem.length) tabela(['#', 'Demanda', 'Sentido', 'Responsável', 'Prazo', 'Origem'], dem.map((x, i) => [String(i + 1), x.payload.titulo, x.payload.sentido, x.payload.responsavel || '', x.payload.prazo ? ddmmaaaa(x.payload.prazo) : '—', `${x.payload.origem} ${x.payload.coord}`]), { 0: { cellWidth: 8 }, 1: { cellWidth: 70 } });
  else par('Nenhuma.');
  tit('Decisões e observações'); par(d.observacoes || '—');
  tit('Transcrição'); par(E.anexos.filter(a => a.payload.tipo === 'transcricao').map(a => a.payload.nome + (a.payload.caminho ? ' · ' + a.payload.caminho : '')).join('\n') || 'Não anexada.');

  tit('Anexo · telas da apresentação');
  par(`As ${telas.length} telas a seguir foram capturadas em ${ddmmaaaa(DIA)} às ${hhmm(agora)}, no fechamento da ata, uma por página em paisagem. ${ref}.`);
  /* índice das telas: a página de cada uma depende de quantas páginas o próprio índice ocupa; se o índice quebrar página, redesenha */
  const p0 = doc.getNumberOfPages(), y0 = y;
  const indice = inicio => tabela(['Página', 'Tela'], telas.map((t, i) => [String(inicio + i), t.titulo]), { 0: { cellWidth: 18 } });
  indice(p0 + 1);
  const p1 = doc.getNumberOfPages();
  if (p1 !== p0) { for (let p = p1; p > p0; p--) doc.deletePage(p); doc.setPage(p0); doc.setFillColor(255, 255, 255); doc.rect(0, y0 - 1, 210, 297 - y0 + 1, 'F'); y = y0; indice(p1 + 1); }

  /* ---------- 2) telas da apresentação (paisagem) ---------- */
  const ctx = { dia: DIA, congelada: congelada(), timer: fmtTimer(CFG.timeboxMin * 60) };
  for (let i = 0; i < telas.length; i++) {
    const t = telas[i]; pdfProgresso(i + 1, total, `Capturando a tela ${i + 1} de ${telas.length}: ${t.titulo}`);
    const St = estadoApresentacao(t.b);
    const img = await capturarTela(t.top ? telaDetalhe(St, ctx, t.b, t.top) : TELAS[t.b - 1](St, ctx));
    doc.addPage('a4', 'landscape');
    const L = 297, m = 10;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(0, 0, 0);
    doc.text(tx(`REDIA ${CFG.uep} · ${diaSemana(DIA)}, ${ddmmaaaa(DIA)} · ${t.titulo}`), m, 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...CINZA);
    const fts = fontesDoEstado(St);
    doc.text(doc.splitTextToSize(tx(`Dados de referência: REDIA de ${ddmmaaaa(DIA)} · realizado D-1 = ${ddmmaaaa(addDias(DIA, -1))}, projetado D = ${ddmmaaaa(DIA)} · ${ref}${fts.length ? ' · capturas automáticas: ' + fts.join(', ') : ''}.`), L - 2 * m), m, 17.5);
    doc.setFillColor(...AMARELO); doc.rect(m, 25, 10, 0.8, 'F');
    const iw = L - 2 * m, ih = iw * 9 / 16;
    doc.addImage(img, 'JPEG', m, 28, iw, ih, undefined, 'FAST');
    doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.2); doc.rect(m, 28, iw, ih);
    doc.text(tx(`Tela ${i + 1} de ${telas.length} · capturada em ${ddmmaaaa(DIA)} às ${hhmmss(Date.now())} por ${quem} · REDIA v${APP.versao}`), m, 28 + ih + 6);
  }
  /* rodapé com paginação em todas as páginas */
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p); const w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...CINZA);
    doc.text(tx(`Ata REDIA ${CFG.uep} · ${ddmmaaaa(DIA)} · INTERNA`), 10, h - 7);
    doc.text(`${p} / ${n}`, w - 10, h - 7, { align: 'right' });
  }
  pdfProgresso(total, total, 'Concluído');
  setTimeout(() => $('.ata-prog')?.remove(), 400);
  return { blob: doc.output('blob'), paginas: n, telas: telas.length };
}
