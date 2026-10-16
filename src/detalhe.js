/* ===================== REDIA P-83 · páginas de detalhe dos blocos de coordenação (D-42) =====================
   Na tela da coordenação, o título de cada card leva à página do assunto (#/apresentacao/N/assunto).
   Cada página tem: voltar à tela da coordenação · atalhos para os outros assuntos · avançar para o próximo bloco. */
'use strict';
const TOPICOS = {
  2: [['indicadores', 'Indicadores'], ['queima', 'Queima projetada'], ['pocos', 'Poços'], ['pfceo', 'Equipamentos e Sistemas – PFCEO'], ['ultimas24', 'Últimas 24h'], ['servicos', 'Serviços e canal'], ['analises', 'Análises']],
  3: [['indicadores', 'Indicadores'], ['utilidades', 'Utilidades'], ['tanques', 'Tanques em atenção'], ['pfceo', 'Equipamentos e Sistemas – PFCEO'], ['ultimas24', 'Últimas 24h'], ['servicos', 'Serviços e canal'], ['analises', 'Análises']],
  4: [['indicadores', 'Indicadores'], ['geracao', 'Geração principal'], ['legais', 'Órgãos legais e suprimentos'], ['pfceo', 'Equipamentos e Sistemas – PFCEO'], ['ultimas24', 'Últimas 24h'], ['servicos', 'Serviços e canal'], ['analises', 'Análises']],
};
const TIT_DET = { servicos: 'Serviços e Canal Base x Bordo', pocos: 'Poços · últimas 24 h', utilidades: 'Utilidades · estoque × mínimo' };
const PROX_NOME = { 2: 'COEMB', 3: 'COMAN', 4: 'Fechamento' };
const topicoValido = (b, t) => !!(TOPICOS[b] || []).find(x => x[0] === t);

function telaDetalhe(E, ctx, b, topico) {
  const coord = BLOCO_COORD[b], tp = TOPICOS[b].find(x => x[0] === topico);
  const titulo = TIT_DET[topico] || tp[1];
  const nav = `<nav class="dn" aria-label="Navegação do detalhe">
    <a class="dbtn" href="#/apresentacao/${b}">‹ Tela ${coord}</a>
    <div class="dtabs">${TOPICOS[b].map(([k, n]) => `<a class="${k === topico ? 'on' : ''}" href="${lk(b, k)}">${n}</a>`).join('')}</div>
    <a class="dbtn pri" href="#/apresentacao/${b + 1}">Próximo: ${PROX_NOME[b]} ›</a></nav>`;
  const corpo = (DETALHES[topico + ':' + coord] || DETALHES[topico])(E, ctx, b, coord);
  return `<div class="scr det">${cabecalho({ ...ctx, subData: 'Detalhe para discussão' }, b, { eye: coord + ' · ' + COORD_NOME[coord] + ' · detalhe', t: titulo }, '')}${nav}${corpo}${rodapeSelo()}</div>`;
}
/* Operações em poços (D-44): manobras, procedimentos e operações realizadas, em curso ou previstas, muitas com embarcação e ROV */
function cardOperacoes(E, ctx) {
  const ops = operacoesPocos(E), cont = s => ops.filter(o => o.situacao === s).length, todos = L(E, 'pocos');
  const chipP = nome => { const p = todos.find(x => x.poco === nome); return chip(nome || '—', p ? p.status : null); };
  return `<div class="card col fill">${hd('Operações', `<span class="cap nw">${cont('Em curso')} em curso · ${cont('Prevista')} prevista${cont('Prevista') === 1 ? '' : 's'} · ${cont('Realizada')} realizada${cont('Realizada') === 1 ? '' : 's'}</span>`)}
    <div class="tbl ops"><span class="th l">Situação</span><span class="th l">Poço</span><span class="th l">Manobra, procedimento ou operação</span><span class="th l">Apoio</span><span class="th l">Data</span>
    ${ops.map(o => `<div class="opr"><span class="td l">${opTag(o.situacao)}</span><span class="td l">${chipP(o.poco)}</span><span class="td l"><b>${T(o.operacao || '')}</b><span class="un">${[o.tipo, o.demandante, o.obs].filter(Boolean).map(T).join(' · ')}</span></span><span class="td l nw">${esc(o.apoio && o.apoio !== '—' ? o.apoio : '—')}</span><span class="td l nw">${o.data ? ddmm(o.data) + (o.data === ctx.dia ? ' · hoje' : '') : '—'}</span></div>`).join('') || '<span class="td l"></span><span class="td l"></span><span class="td l sec">Nenhuma operação registrada</span><span class="td"></span><span class="td"></span>'}
    </div></div>`;
}
const tile = (rot, val, un = '', sem = '', cap = '') => `<div class="dtile${sem ? ' s-' + sem : ''}"><span class="gh">${rot}</span><span class="nw"><b class="big b48">${val}</b>${un ? `<span class="unit">${un}</span>` : ''}</span>${cap ? `<span class="cap">${cap}</span>` : ''}</div>`;
const diasDesde = (iso, ref) => iso ? diffDias(ref, iso) : null;

const DETALHES = {
  /* ---------- Últimas 24h (todas as coordenações) ---------- */
  ultimas24(E, ctx, b, coord) {
    const ds = destaquesDe(E, coord), am = itensDe(E, coord, 'ameaca'), op = itensDe(E, coord, 'oportunidade');
    const sug = E.sugestoes.filter(s => s.payload.coord === coord);
    const nAp = sug.filter(s => s.decisao?.payload.acao === 'aprovar').length, nRe = sug.filter(s => s.decisao?.payload.acao === 'recusar').length, nPe = pendentes(E, coord).length;
    const bloco = d => {
      const p = d.ref.payload, coms = d.tipo === 'sugestao' ? (E.comentarios?.[d.id] || []) : [];
      return `<div class="dqx s-${d.semaforo}"><div class="dq-m">${pill(d.semaforo, d.status || semNome(d.semaforo))}${tag(d.fonte)}${d.abertura ? tagAb : ''}<span class="cap">${T(d.tag)}${d.tag ? ' · ' : ''}${esc(d.meta)}</span></div>
        <span class="dqx-t">${T(d.titulo)}</span>
        ${d.impacto ? `<span class="dq-i">Impacto: <b>${T(d.impacto)}</b></span>` : ''}
        ${d.pedido ? `<span class="dq-i ped"><b>Pedido à base:</b> ${T(d.pedido)}</span>` : ''}
        ${d.tipo === 'sugestao' && p.textoOriginal ? `<span class="orig2"><span class="gh">Passagem ${esc(p.origem || '')}</span><span class="cl3">${T(p.textoOriginal)}</span></span>` : ''}
        ${coms.length ? `<span class="cap">${coms.length} comentário${coms.length > 1 ? 's' : ''} da base · último: “${T(coms[coms.length - 1].payload.texto)}”</span>` : ''}</div>`;
    };
    return `<main class="m3 det" style="grid-template-columns:minmax(0,2.1fr) minmax(0,1fr)">
      <div class="card col">${hd('Destaques', `<span class="cap nw">${ds.length} destaque${ds.length === 1 ? '' : 's'} · ${ds.filter(d => d.abertura).length} na abertura</span>`)}
        <div class="dqg">${ds.map(bloco).join('') || `<span class="sec f20">Nenhum destaque aprovado pela ${coord}.</span>`}</div></div>
      <div class="colg">
        <div class="card col">${hd('Ameaças')}${am.map(i => `<div class="th2">${glyph(i.payload.semaforo, 18)}<span>${T(i.payload.texto)}</span></div>`).join('') || '<div class="th2"><span></span><span class="sec">Nenhuma ameaça registrada</span></div>'}</div>
        <div class="card col">${hd('Oportunidades')}${op.map(i => `<div class="th2">${glyph('ok', 18)}<span>${T(i.payload.texto)}</span></div>`).join('') || '<div class="th2"><span></span><span class="sec">Nenhuma oportunidade registrada</span></div>'}</div>
        <div class="card col fill">${hd('Curadoria das passagens')}
          <div class="nums"><span><b class="big b40">${nAp}</b><span class="cap">aprovadas</span></span><span><b class="big b40">${nRe}</b><span class="cap">recusadas</span></span><span><b class="big b40">${nPe}</b><span class="cap">pendentes</span></span></div>
          ${li('Criados pela coordenação', ds.filter(d => d.fonte === 'C').length)}${li('Indicados para a abertura', ds.filter(d => d.abertura).length)}
          <span class="cap mt-auto">${tag('PS')} passagem de serviço · ${tag('C')} criado pelo coordenador</span></div>
      </div></main>`;
  },

  /* ---------- Equipamentos e Sistemas – PFCEO ---------- */
  pfceo(E, ctx, b, coord) {
    const s = pfceoSelecao(E, coord), v = E.listas['pfceo.' + coord];
    const sel = new Set(s.itens.map(PF.chave)), outros = s.todos.filter(i => !sel.has(PF.chave(i)));
    const nInd = s.itens.filter(i => i.disponibilidade === 'Indisponível').length, nRes = s.itens.filter(i => i.disponibilidade === 'Disponível com Restrição').length;
    const comMargem = s.itens.filter(i => +i.unidades > 0 && i.disponiveis !== '' && i.disponiveis != null), menor = comMargem.slice().sort((x, y) => PF.margem(x) - PF.margem(y))[0];
    return `<main class="m3 det" style="grid-template-columns:minmax(0,2.4fr) minmax(0,1fr)">
      <div class="colg">
        <div class="dtiles">${tile('Na tela da ' + coord, s.itens.length, '', '', s.sugerida ? 'seleção automática' : 'selecionadas pelo coordenador')}${tile('Indisponíveis', nInd, '', nInd ? 'nok' : 'ok')}${tile('Com restrição', nRes, '', nRes ? 'at' : 'ok')}${tile('Menor margem', menor ? `${menor.disponiveis}/${menor.unidades}` : '—', '', menor ? (PF.margem(menor) < 1 ? 'at' : 'ok') : '', menor ? T(menor.funcao) : 'sem redundância informada')}</div>
        <div class="card col fill">${hd('Funções críticas selecionadas · piores primeiro', v ? `<span class="cap nw">${tag(v.origem)} ${esc(v.fonte || '')} · ${hhmm(v.em)}</span>` : '')}
          <div class="tbl pft"><span class="th l">Função crítica · TAG</span><span class="th l">Redundância</span><span class="th l">Unidades</span><span class="th l">Disponibilidade</span><span class="th l">Condição</span><span class="th l">Situação</span><span class="th l">Nota · NM SAP</span>
          ${s.itens.map(i => `<span class="td l"><b>${T(i.funcao)}</b><span class="un">${T(i.tag || '')}</span></span><span class="td l">${esc(i.redundancia || '—')}</span><span class="td l">${unidadesHtml(i) || '—'}</span><span class="td l">${pill(PF.semDisp(i.disponibilidade), PF.curto(i.disponibilidade))}</span><span class="td l"><span class="row-c">${glyph(PF.semCond(i.condicao), 16)}${esc(i.condicao || '—')}</span></span><span class="td l">${esc(i.situacao || '—')}</span><span class="td l">${T(i.nota || '')}${i.nm ? ` <span class="sec">· NM ${esc(i.nm)}</span>` : ''}</span>`).join('') || '<span class="td l sec">Nenhuma função selecionada</span><span class="td"></span><span class="td"></span><span class="td"></span><span class="td"></span><span class="td"></span><span class="td"></span>'}
          </div></div></div>
      <div class="card col">${hd('Demais funções no PFCEO', `<span class="cap">${outros.length}</span>`)}
        ${outros.map(i => `<div class="li"><span class="row-c">${glyph(PF.semDisp(i.disponibilidade), 16)}${T(i.funcao)}</span><span class="s">${esc(PF.curto(i.disponibilidade))}</span></div>`).join('') || '<div class="li n0"><span class="sec">Todas estão na tela</span></div>'}
        <span class="cap mt-auto">Disponibilidade, condição e situação seguem as dimensões do Portal de Integridade (PFCEO). A seleção é feita na curadoria.</span></div>
    </main>`;
  },

  /* ---------- Serviços planejados hoje e Canal Base x Bordo (D-52) ---------- */
  servicos(E, ctx, b, coord) {
    const sv = E.servicos.filter(s => s.payload.coord === coord), tp = topicosCanal(E, coord);
    return `<main class="m3 det" style="grid-template-columns:minmax(0,1fr) minmax(0,1.15fr)">
      <div class="card col">${hd('Serviços planejados hoje', `<span class="cap nw">${sv.length} serviço${sv.length === 1 ? '' : 's'} · ${sv.filter(s => s.payload.abertura).length} na abertura</span>`)}
        ${sv.map((s, k) => `<div class="row2 srv"><span class="nr">${k + 1}</span><div class="col"><span class="t1">${T(s.payload.titulo)}</span><span class="t2">${T(s.payload.detalhe || '')}</span></div><span class="tg">${s.payload.abertura ? tagAb : ''}${tag(s.payload.origem)}</span></div>`).join('') || '<div class="row2"><span class="sec">Nenhum serviço registrado</span></div>'}
        <span class="cap mt-auto">${tag('PT')} planejamento diário de PTs (APLAT) · ${tag('M')} incluído pelo coordenador</span></div>
      <div class="card col fill">${hd('Canal Base x Bordo · principais tópicos')}
        <div class="tbl cnl"><span class="th l">Tópico</span><span class="th l">Sentido</span><span class="th l">Com</span><span class="th l">Desde</span>
        ${tp.map(d => `<span class="td l fb">${T(d.payload.titulo)}</span><span class="td l nw">${esc(d.payload.sentido)}</span><span class="td l">${T(d.payload.responsavel)}</span><span class="td l nw">${ddmm(d.payload.dataRedia)}</span>`).join('') || '<span class="td l sec">Nenhum tópico em pauta com a base</span><span class="td"></span><span class="td"></span><span class="td"></span>'}
        </div>
        <span class="cap mt-auto">Tópicos registrados no Fechamento · a situação de cada demanda fica na tela Fechamento e ata</span></div>
    </main>`;
  },

  /* ---------- Resultados de Análises (eplab) · D-52 ---------- */
  analises(E, ctx, b, coord) {
    const an = labDe(E, coord, ctx.dia), atr = an.filter(a => a.atrasada).length, sem = an.filter(a => a.valor === null).length;
    return `<main class="m3 det" style="grid-template-columns:minmax(0,1fr)">
      <div class="colg">
        <div class="dtiles">${tile('Análises', an.length)}${tile('Em dia', an.filter(a => a.data && !a.atrasada).length, '', 'ok')}${tile('Atrasadas', atr, '', atr ? 'at' : 'ok')}${tile('Sem resultado', sem, '', sem ? 'at' : 'ok')}</div>
        <div class="card col fill">${hd('Resultados de Análises · ' + COORD_NOME[coord], `<span class="cap nw">${tag('A')} eplab · captura em Dados automáticos</span>`)}
          <div class="tbl lab"><span class="th l">Análise</span><span class="th">Resultado</span><span class="th l">Data do resultado</span><span class="th l">Periodicidade</span><span class="th l">Situação</span><span class="th l">Origem</span>
          ${an.map(a => `<span class="td l fb">${esc(a.rot)}</span><span class="td">${a.valor === null ? '<span class="sec">Sem dado</span>' : `<b>${a.tipo === 'texto' ? esc(a.valor) : fmtN(a.valor, a.dec)}</b>${a.un ? `<span class="u">${NBSP}${esc(a.un)}</span>` : ''}`}</span><span class="td l nw">${a.data ? (a.atrasada ? `<span class="o at dt">${SH.at(15)}${ddmmaaaa(a.data)}</span>` : ddmmaaaa(a.data)) : '—'}</span><span class="td l nw">a cada ${a.per} ${a.per === 1 ? 'dia' : 'dias'}</span><span class="td l">${a.valor === null ? pill('sd', 'Sem resultado') : a.atrasada ? pill('at', `Atrasada · ${a.dias} dias`) : a.data ? pill('ok', 'Em dia') : pill('sd', 'Sem data')}</span><span class="td l cap">${esc(a.fonte || '—')}</span>`).join('')}
          </div>
          <span class="cap mt-auto">Parâmetros e periodicidades iniciais, a ajustar com cada coordenação (D-52). Resultado atrasado: intervalo desde a última amostra maior que a periodicidade.</span></div>
      </div></main>`;
  },

  /* ---------- COPROD ---------- */
  'indicadores:COPROD'(E, ctx) {
    const r = reservaQueima(E, ctx.dia);
    const urs = VN(E, 'agua.urs') || 0, pr = VN(E, 'agua.prod_reinj') || 0, tot = urs + pr, pct = x => tot ? fmtN(x / tot * 100, 1) + '%' : '—';
    const flare = (n, v) => v === 'Aberto' ? chip('Aberto', 'reaberto', n) : chip(v || 'Sem dado', null, n);
    return `<main class="m3 det" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)">
      <div class="colg">
        <div class="card">${hd('Indicadores · meta × realizado × projetado')}<div class="tbl big2">${linhasIndicadoresCoprod(E)}</div></div>
        <div class="card col fill">${hd('IUGA · contexto do campo')}
          ${li('P-83 · D-1', VN(E, 'iuga.real') != null ? fmtN(VN(E, 'iuga.real'), 2) + '%' : 'Sem dado')}${li('P-83 · parcial do mês', r.iugaMes != null ? fmtN(r.iugaMes, 2) + '%' : 'Sem dado')}
          ${li(esc(CFG.ativo), VN(E, 'iuga.atp') != null ? fmtN(VN(E, 'iuga.atp'), 2) + '%' : 'Sem dado', 1)}${li(esc(CFG.campo), VN(E, 'iuga.buzios') != null ? fmtN(VN(E, 'iuga.buzios'), 2) + '%' : 'Sem dado', 1)}
          ${li('Meta de IUGA da P-83', VN(E, 'iuga.meta') != null ? fmtN(VN(E, 'iuga.meta'), 2) + '%' : 'Sem dado')}
          <span class="cap mt-auto">A cota de queima é do campo inteiro: a P-83 é lida junto com o ${esc(CFG.ativo)} e ${esc(CFG.campo)}.</span></div>
      </div>
      <div class="colg">
        <div class="card col">${hd('Equipamentos · status')}
          ${EQUIP.map(e => `<span class="gh">${esc(e.rot)}</span><div class="cps">${chipsEq(E, e.id)}</div>`).join('')}
          <span class="gh">Modo do flare</span><div class="cps">${flare('HP', V(E, 'flare.hp'))}${flare('LP', V(E, 'flare.lp'))}</div>
          <span class="mt4">${legendaEq()}</span></div>
        <div class="card col fill">${hd('Composição da água injetada', V(E, 'agua.ref') ? tag(V(E, 'agua.ref')) : '')}
          <div class="bar b16"><div style="width:${tot ? urs / tot * 100 : 0}%;background:#00B2A9"></div><div style="width:${tot ? pr / tot * 100 : 0}%;min-width:${pr ? 4 : 0}px;background:#75787B"></div></div>
          <div class="comp"><span class="lg"><i style="background:#00B2A9"></i>Dessulfatada (URS)</span><b>${fmtU(urs, 0, 'm³')}</b><span class="sec">${pct(urs)}</span>
            <span class="lg"><i style="background:#75787B"></i>Produzida reinjetada</span><b>${fmtU(pr, 0, 'm³')}</b><span class="sec">${pct(pr)}</span></div>
          ${li('Produzida descartada no mar', fmtU(VN(E, 'agua.prod_desc'), 0, 'm³'))}</div>
      </div></main>`;
  },
  'queima:COPROD'(E, ctx) {
    const r = reservaQueima(E, ctx.dia), iuS = Regras.iuga(r.iugaMes, r.meta);
    const causas = L(E, 'queima.causas'), totQ = causas.reduce((a, c) => a + (+c.valor || 0), 0) || 1, ev = L(E, 'queima.eventos');
    const m3 = v => v != null ? fmtN(v) + NBSP + 'm³' : 'Sem dado';
    return `<main class="m3 det" style="grid-template-columns:minmax(0,1.25fr) minmax(0,1fr)">
      <div class="colg">
        <div class="dtiles">${tile('Queima projetada D', fmtN(VN(E, 'queima.proj')), 'Mm³/d')}${tile('Acumulado no mês', fmtN(r.Qacc), 'm³', r.faltam.length ? 'at' : '', r.faltam.length ? `até D-1 · falta${r.faltam.length > 1 ? 'm' : ''} ${r.faltam.length} dia${r.faltam.length > 1 ? 's' : ''}` : `até D-1 · ${r.dias} dia${r.dias === 1 ? '' : 's'}`)}${tile('IUGA parcial do mês', r.iugaMes != null ? fmtN(r.iugaMes, 2) : '—', '%', iuS.sem, 'meta ' + (r.meta != null ? fmtN(r.meta, 2) + '%' : '—'))}</div>
        <div class="card col">${hd('Queima projetada D · por causa')}
          <div class="bars">${causas.map(c => `<span>${T(c.causa)}</span><div class="track"><div style="width:${(+c.valor || 0) / totQ * 100}%;background:${c.evitavel === 'sim' ? '#ED8B00' : '#75787B'}"></div></div><b>${fmtN(c.valor)}</b>`).join('') || '<span class="sec">Sem causas registradas</span>'}</div>
          <span class="cap lg2"><span><i style="background:#ED8B00"></i>Evitável · falha de equipamento</span><span><i style="background:#75787B"></i>Rotina</span><span>valores em Mm³/d</span></span></div>
        <div class="card col fill">${hd('Últimas 24 h · maiores queimas', V(E, 'queima.ref') ? tag(V(E, 'queima.ref')) : '')}
          ${ev.map(e => `<div class="li"><span>${T(e.evento)} <span class="sec n">· flare ${esc(e.flare)}</span></span><span class="v">${fmtU(e.volume, 1, 'Mm³')}</span></div>`).join('') || '<div class="li n0"><span class="sec">Sem evento relevante</span></div>'}
          ${li('Flare HP agora', esc(V(E, 'flare.hp') || 'Sem dado'))}${li('Flare LP agora', esc(V(E, 'flare.lp') || 'Sem dado'))}</div>
      </div>
      <div class="card col qcalc s-${r.sem}">${hd('Reserva de queima no mês', pill(r.sem, r.sem === 'nok' ? 'Sem reserva' : r.sem === 'at' ? 'Abaixo do projetado' : r.sem === 'ok' ? 'Folga' : 'Sem dado'))}
        <div class="nw"><b class="big b64">${r.reserva != null ? fmtN(Math.max(0, r.reserva)) : '—'}</b><span class="unit">m³</span></div>
        <span class="cap">${r.porDia != null ? `≈ <b class="k">${fmtN(Math.max(0, r.porDia))}${NBSP}m³/d</b> nos ${r.restantes} dias restantes · queima projetada D ${r.projDia != null ? fmtN(r.projDia) + NBSP + 'm³/d' : '—'}` : 'Faltam dados para o cálculo'}</span>
        <span class="gh mt6">Como é calculada</span>
        ${li('Meta de IUGA (editável na curadoria)', r.meta != null ? fmtN(r.meta, 2) + '%' : 'Sem dado')}
        ${li(`Gás produzido no mês (até D-1) · ${r.fonteP === 'manual' ? 'correção manual' : 'soma de ' + r.dias + ' dia' + (r.dias === 1 ? '' : 's') + ' do SITOP'}`, m3(r.Pacc))}
        ${li(`Gás projetado × ${r.restantes} dias restantes`, r.Pproj != null ? `${fmtN(r.Pproj)} × ${r.restantes}` : 'Sem dado', 1)}
        ${li('Produção de gás prevista no mês', m3(r.Ptot))}
        ${li(`Limite de queima = ${r.meta != null ? fmtN(100 - r.meta, 2) : '—'}% da produção prevista`, m3(r.limite))}
        ${li(`Queima no mês (até D-1) · ${r.fonteQ === 'manual' ? 'correção manual' : 'soma diária do SITOP'}`, m3(r.Qacc))}
        ${li('<b>Reserva = limite − acumulado</b>', m3(r.reserva))}
        ${li('Sem contar a produção futura', m3(r.conservadora), 1)}
        <span class="cap mt-auto">${r.faltam.length ? `<b class="k">Dias sem dado na soma: ${r.faltam.map(ddmm).join(', ')}.</b> ` : ''}Acumulados = soma diária do gás produzido D-1 e da queima D-1 do SITOP; projeção do SITOP. Reserva negativa significa que a meta mensal já não é alcançável.</span></div>
    </main>`;
  },
  'pocos:COPROD'(E, ctx) {
    const prod = pocos(E, 'produtor'), prox = V(E, 'teste.proximo'), pProx = prod.find(p => p.poco === prox);
    const linhaPoco = p => `<div class="li pw">${chip(p.poco, p.status)}<span class="s">${p.ultimo_teste ? `último teste ${ddmm(p.ultimo_teste)} · ${diasDesde(p.ultimo_teste, ctx.dia)} d` : 'sem teste registrado'}</span></div>`;
    const trem = ([k, nome, max]) => { const ps = prod.filter(p => p.trem === k); return `<div class="trem"><div class="row-sb"><b class="f24">${nome}</b><span class="cap">${ps.length}/${max}</span></div>${ps.map(linhaPoco).join('')}${Array.from({ length: Math.max(0, max - ps.length) }, () => '<div class="li pw vz"><span class="sec">livre</span></div>').join('')}</div>`; };
    const cil = L(E, 'cilindros'), tipoNome = { gas: 'Amostra de gás pressurizado', pvt: 'PVT · petróleo pressurizado' };
    const blocoCil = t => {
      const disp = cil.filter(c => c.tipo === t && c.situacao !== 'Coletado').sort((a, b) => String(a.chegada).localeCompare(String(b.chegada)));
      const col = cil.filter(c => c.tipo === t && c.situacao === 'Coletado');
      return `<div class="cil"><div class="row-sb"><span class="gh">${tipoNome[t]}</span><span class="nw"><b class="big b36">${disp.length}</b><span class="unit u18">disponíveis a bordo</span></span></div>
        <div class="tbl cilt"><span class="th l">Nº de série</span><span class="th l">Chegada</span><span class="th">Dias a bordo</span><span class="th l"></span>
        ${disp.map((c, k) => `<span class="td l fb">${esc(c.serie)}</span><span class="td l">${c.chegada ? ddmm(c.chegada) + '/' + c.chegada.slice(0, 4) : '—'}</span><span class="td">${c.chegada ? diasDesde(c.chegada, ctx.dia) : '—'}</span><span class="td l">${k === 0 ? '<span class="o ab">Usar primeiro</span>' : ''}</span>`).join('') || '<span class="td l sec">Nenhum disponível</span><span class="td"></span><span class="td"></span><span class="td"></span>'}
        </div>${col.length ? `<span class="cap">Coletados aguardando envio: ${col.map(c => esc(c.serie)).join(', ')}</span>` : ''}</div>`;
    };
    return `<main class="m3 det" style="grid-template-columns:minmax(0,1.35fr) minmax(0,1fr)">
      <div class="colg">
        <div class="card col">${hd('Produtores por trem', '<span class="cap">Trem A até 5 · Trem B até 5 · teste 1</span>')}
          <div class="trens">${TRENS.map(trem).join('')}</div>
          ${prod.some(p => !p.trem) ? `<div class="li"><span>Sem trem</span><span class="cps">${prod.filter(p => !p.trem).map(p => chip(p.poco, p.status)).join('')}</span></div>` : ''}
          ${legendaPocos()}</div>
        ${cardOperacoes(E, ctx)}
      </div>
      <div class="colg">
        <div class="g2d cp">
          <div class="card col prx2">${hd('Próximo teste de vazão')}<b class="big b52">${prox ? T(prox) : '—'}</b>
            ${li('Previsão', esc(V(E, 'teste.previsao') || '—'))}${li('Último teste', pProx?.ultimo_teste ? `${ddmm(pProx.ultimo_teste)} · ${diasDesde(pProx.ultimo_teste, ctx.dia)} dias` : '—')}${li('Trem atual', pProx?.trem ? (pProx.trem === 'Teste' ? 'Teste' : 'Trem ' + pProx.trem) : '—')}</div>
          <div class="card col">${hd('Injetores')}<span class="gh">Água</span><div class="cps">${chipsPoco(E, 'inj_agua') || '<span class="cap">—</span>'}</div><span class="gh">Gás</span><div class="cps">${chipsPoco(E, 'inj_gas') || '<span class="cap">—</span>'}</div></div>
        </div>
      <div class="card col fill">${hd('Cilindros de coleta a bordo', '<span class="cap">mais antigos primeiro</span>')}${blocoCil('gas')}${blocoCil('pvt')}
        <span class="cap mt-auto">Prioridade de uso pela data de chegada a bordo (mais antigo primeiro).</span></div>
      </div>
    </main>`;
  },

  /* ---------- COEMB ---------- */
  'indicadores:COEMB'(E) {
    const est = VN(E, 'off.estoque'), cap = VN(E, 'off.capacidade'), p = est && cap ? est / cap * 100 : 0;
    const ate = VN(E, 'off.ate_top'), prod = VN(E, 'off.prod24'), dias = ate != null && prod ? ate / prod : null;
    const top = String(V(E, 'off.top') || '').split(' ');
    return `<main class="m3 det" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr)">
      <div class="card col">${hd('Tancagem e offloading', V(E, 'off.navio_ok') === 'Sim' ? pill('ok', 'Navio confirmado') : pill('at', 'Navio não confirmado'), 'navio')}
        <div class="nw"><span class="big b64">${fmtN(est)}</span><span class="unit">m³ em estoque</span></div>
        <div class="track t20"><div style="width:${p}%;background:#008542"></div></div>
        <span class="cap">${p ? fmtN(p, 0) + '% da capacidade de ' + fmtN(cap) + NBSP + 'm³' : 'Capacidade sem dado'}</span>
        <div class="dtiles dt-in">${tile('Até o TOP', fmtN(ate), 'm³')}${tile('Produção 24 h', fmtN(prod), 'm³')}${tile('Previsão de TOP', esc(top[0] || '—'), esc(top[1] || ''), '', dias != null ? `≈ ${fmtN(dias, 1)} dias no ritmo atual` : '')}</div></div>
      <div class="card col">${hd('Navio e qualidade')}
        ${li('Navio aliviador', T(V(E, 'off.navio') || 'Sem dado'))}${li('Navio confirmado', esc(V(E, 'off.navio_ok') || 'Sem dado'))}${li('Qualidade do estoque', T(V(E, 'off.qualidade') || 'Sem dado'))}${li('Estações de offloading', T(V(E, 'off.estacoes') || 'Sem dado'))}
        <span class="cap mt-auto">Fonte: SITOP (offloading) e curadoria da COEMB.</span></div>
    </main>`;
  },
  'utilidades:COEMB'(E) {
    const util = L(E, 'util');
    return `<main class="m3 det" style="grid-template-columns:minmax(0,1fr)">
      <div class="card col">${hd('Utilidades · estoque × mínimo')}
        <div class="tbl utt"><span class="th l">Utilidade</span><span class="th">Estoque</span><span class="th">Mínimo</span><span class="th">Consumo</span><span class="th">Produção</span><span class="th">Saldo/dia</span><span class="th">Dias até o mínimo</span><span class="th l">Situação</span>
        ${util.map(u => { const r = Regras.utilidade(u), saldo = (+u.producao || 0) - (+u.consumo || 0); return `<span class="td l fb">${T(u.nome)}<span class="un"><span class="track mini"><div style="width:${u.minimo ? Math.min(100, u.estoque / (u.minimo * 2) * 100) : 0}%;background:${COR[r.sem]}"></div></span></span></span><span class="td k">${fmtU(u.estoque, 0, 'm³')}</span><span class="td">${fmtN(u.minimo)}</span><span class="td">${fmtN(u.consumo)}</span><span class="td">${fmtN(u.producao)}</span><span class="td${saldo < 0 ? ' fb' : ''}">${saldo > 0 ? '+' : saldo < 0 ? '−' : ''}${fmtN(Math.abs(saldo))}</span><span class="td">${r.dias != null ? fmtN(r.dias, 1) : '—'}</span><span class="td l">${pill(r.sem, semNome(r.sem))}</span>`; }).join('')}
        </div><span class="cap mt-auto">Volumes em m³ e m³/d. Atenção quando o estoque chega ao mínimo em até ${CFG.limiares.utilidades.diasAtencao} dias. A barra compara o estoque com o dobro do mínimo.</span></div></main>`;
  },
  'tanques:COEMB'(E) {
    const tq = L(E, 'tq.atencao');
    return `<main class="m3 det" style="grid-template-columns:minmax(0,1fr)"><div class="card col">${hd('Tanques em atenção', `<span class="cap">${tq.length}</span>`)}
      ${tq.map(t => `<div class="row2 big3"><div class="col"><span class="t1">${T(t.tanque)}</span><span class="t2">${T(t.nota || '')}</span></div><span class="tg">${pill(semDeStatus(t.status), t.status || 'Sem dado')}</span></div>`).join('') || '<div class="row2"><span class="sec">Nenhum tanque em atenção</span></div>'}</div></main>`;
  },

  /* ---------- COMAN ---------- */
  'indicadores:COMAN'(E) {
    const ind = L(E, 'man.ind');
    return `<main class="m3 det" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)">
      <div class="card col">${hd('Indicadores de manutenção', V(E, 'man.ref') ? tag(V(E, 'man.ref')) : '')}
        <div class="dtiles dt-in">${ind.map(i => { const s = Regras.manutencao(+i.valor, +i.meta), d = +i.valor - +i.meta; return tile(T(i.ind), fmtN(i.valor, i.valor % 1 ? 1 : 0), '%', s, `meta ${fmtN(i.meta, i.meta % 1 ? 1 : 0)}% · ${d >= 0 ? '+' : '−'}${fmtN(Math.abs(d), 1)} p.p.`); }).join('')}</div>
        <span class="cap mt-auto">Atenção até ${CFG.limiares.manutencaoFaixaAtencao} p.p. abaixo da meta. Fonte dos indicadores a definir (I-06).</span></div>
      <div class="card col">${hd('Segurança operacional')}
        <div class="nums"><span><b class="big b52">${fmtN(VN(E, 'man.notas_if6'))}</b><span class="cap">notas IF6/6 abertas</span></span><span><b class="big b52">${fmtN(VN(E, 'man.sensores'))}</b><span class="cap">sensores em falha</span></span></div></div>
    </main>`;
  },
  'geracao:COMAN'(E) {
    const tgs = L(E, 'ger.tgs');
    return `<main class="m3 det" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr)">
      <div class="card col">${hd('Geração principal · 4 × 33%', pill(V(E, 'ger.reserva') === 'Sem reserva' ? 'nok' : 'ok', V(E, 'ger.reserva') || 'Sem dado'), 'raio')}
        <div class="tgs g4">${tgs.map(t => `<div class="tgc"><div class="row-sb"><b class="f32">${T(t.tg)}</b>${pill(semDeStatus(t.status) === 'sd' ? 'sd' : semDeStatus(t.status), t.status)}</div><span class="t2 k f20">${T(t.linha1)}</span><span class="t2 f20${t.alerta === 'sim' ? ' k fb' : ''}">${T(t.linha2)}</span></div>`).join('')}</div></div>
      <div class="card col">${hd('Emergência e auxiliares')}${L(E, 'ger.aux').map(a => `<div class="li"><span>${T(a.nome)}</span><span class="s row-c">${glyph(semDeStatus(a.status), 14)}${esc(String(a.status).toLowerCase())}</span></div>`).join('')}</div>
    </main>`;
  },
  'legais:COMAN'(E) {
    return `<main class="m3 det" style="grid-template-columns:minmax(0,1fr)"><div class="card col">${hd('Órgãos legais e suprimentos')}
      ${L(E, 'legais').map(l => `<div class="row2 big3"><span class="t1">${T(l.item)}</span><span class="tg">${pill(semDeStatus(l.status), l.status)}</span></div>`).join('') || '<div class="row2"><span class="sec">Nenhum item</span></div>'}</div></main>`;
  },
};
