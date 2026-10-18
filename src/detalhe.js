/* ===================== REDIA P-83 · páginas de detalhe dos blocos de coordenação (D-42) =====================
   Na tela da coordenação, o título de cada card leva à página do assunto (#/apresentacao/N/assunto).
   Cada página tem: voltar à tela da coordenação · atalhos para os outros assuntos · avançar para o próximo bloco. */
'use strict';
const TOPICOS = {
  2: [['indicadores', 'Indicadores'], ['queima', 'Queima projetada'], ['pocos', 'Poços'], ['pfceo', 'PFCEO'], ['ultimas24', 'Últimas 24h'], ['servicos', 'Serviços e canal'], ['analises', 'Análises']],
  3: [['indicadores', 'Indicadores'], ['utilidades', 'Utilidades'], ['tanques', 'Tanques em atenção'], ['integridade', 'Integridade'], ['pfceo', 'PFCEO'], ['ultimas24', 'Últimas 24h'], ['servicos', 'Serviços e canal'], ['analises', 'Análises']],
  4: [['indicadores', 'Indicadores'], ['geracao', 'Geração principal'], ['criticos', 'Críticos e peças'], ['legais', 'Órgãos legais e suprimentos'], ['pfceo', 'PFCEO'], ['ultimas24', 'Últimas 24h'], ['servicos', 'Serviços e canal'], ['analises', 'Análises']],
};
/* D-57 · detalhe da queima: reserva tática (na meta) ou plano de recuperação do IUGA (abaixo da meta) */
function cardTatico(E, iso) {
  const t = iugaTatico(E, iso), m3 = v => v != null ? fmtU(v, 0, 'm³') : 'Sem dado', m3d = v => v != null ? fmtU(v, 0, 'm³/d') : 'Sem dado';
  if (!t.modo) return `<div class="card col">${hd('Reserva tática')}<span class="sec">Faltam meta, acumulados ou projeção de produção para o cálculo.</span></div>`;
  const base = `<span class="cap">Produção do mês projetada ${m3(t.PtotT)} (${esc(t.fonteProj)}: ${m3d(t.prodDia)}) · IUGA do mês ${fmtN(t.iugaMes, 2)}% · meta ${fmtN(t.meta, 2)}% + margem ${fmtN(t.margem, 2)} p.p.</span>`;
  const mn = manobrasDe(E, iso);   // D-63 (proposta 11)
  const manobras = mn.itens.length ? `<div class="row-sb mt6"><span class="gh">Manobras previstas × reserva tática</span>${pill(mn.cabe === null ? 'sd' : mn.cabe ? 'ok' : 'nok', mn.cabe === null ? 'Sem reserva calculada' : mn.cabe ? `Cabem · saldo ${fmtN(mn.saldo / 1000)} mil m³` : mn.modo === 'recuperar' ? 'Sem reserva · meta abaixo' : `Não cabem · faltam ${fmtN(-mn.saldo / 1000)} mil m³`, true, [`Queima estimada das manobras: ${fmtN(mn.total)} m³`, mn.modo === 'recuperar' ? 'IUGA do mês abaixo da meta: não há reserva tática para manobras' : `Reserva tática: ${fmtN(t.tatica)} m³ · saldo ${fmtN(mn.saldo)} m³`])}</div>
    <span class="cap">${mn.itens.slice(0, 3).map(m => `${T(m.manobra)}${m.data ? ' (' + ddmm(m.data) + ')' : ''} <b class="k">${fmtN(+m.queima)}</b>`).join(' · ')}${mn.itens.length > 3 ? ` · +${mn.itens.length - 3}` : ''} <span class="n">mil m³ · soma <b class="k">${fmtN(mn.total / 1000)} mil m³</b></span></span>` : '';
  if (t.modo === 'reserva') return `<div class="card col tatc">${hd('Reserva tática · IUGA do mês ≥ ' + fmtN(t.metaT, 2) + '%', pill(t.tatica > 0 ? 'ok' : 'at', t.tatica > 0 ? 'Com reserva' : 'Esgotada', true, [`IUGA do mês ${fmtN(t.iugaMes, 2)}% · meta + margem ${fmtN(t.metaT, 2)}%`, 'Sem volume para queimar além do ritmo atual fechando o mês na meta']))}
    <div class="row-sb"><span class="nw"><b class="big b44">${t.tatica > 0 ? fmtN(t.tatica) : '0'}</b><span class="unit">m³ até o fim do mês</span></span><span class="nw"><b class="big b28">${t.taticaDia > 0 ? fmtN(t.taticaDia) : '0'}</b><span class="unit u16">m³/d</span></span></div>
    <span class="cap">Volume que ainda pode ser queimado <b class="k">além do ritmo atual</b> (manobras com queima inevitável) fechando o mês com IUGA ≥ ${fmtN(t.metaT, 2)}%. = (IUGA do mês − meta − margem) × produção projetada.</span>${manobras}${base}</div>`;
  const rows = t.origens.slice(0, 4).map(o => `<div class="li"><span>${glyph('at', 14, [`Origem evitável da queima: ${o.causa}`, `${fmtN(o.m3d)} m³/d${o.cobre != null ? ` · cobre ${fmtN(o.cobre, 0)}% da redução necessária` : ''}`])} ${T(o.causa)}</span><span class="v">${fmtN(o.m3d)}${NBSP}m³/d${o.cobre != null ? ` <span class="sec n">· ${fmtN(o.cobre, 0)}% da redução</span>` : ''}</span></div>`).join('');
  return `<div class="card col tatc rec">${hd('Recuperação do IUGA · meta ' + fmtN(t.meta, 2) + '%', pill(t.alcancavel ? 'at' : 'nok', t.alcancavel ? 'Recuperável' : 'Meta inalcançável no mês', true, [`IUGA do mês ${fmtN(t.iugaMes, 2)}% abaixo da meta de ${fmtN(t.meta, 2)}%`, t.alcancavel ? `Recupera com queima até ${fmtN(t.maxDia)} m³/d nos dias restantes (IUGA diário ≥ ${fmtN(t.iugaDiaNec, 2)}%)` : `Mesmo sem queima, o mês fecha em até ${fmtN(t.iugaMaxPossivel, 2)}%`]))}
    <div class="row-sb"><span class="nw"><span class="cap">Queima máxima por dia</span> <b class="big b44">${t.alcancavel ? fmtN(t.maxDia) : '0'}</b><span class="unit">m³/d</span></span><span class="nw"><span class="cap">IUGA diário ≥</span> <b class="big b28">${t.alcancavel ? fmtN(t.iugaDiaNec, 2) : '—'}</b><span class="unit u16">%</span></span></div>
    <span class="cap">${t.alcancavel ? `Nos ${t.restantes} dias restantes. Hoje: ${m3d(t.queimaDia)} (${esc(t.fonteQueima)}) → reduzir ${m3d(t.reducao)}.` : `Mesmo sem queima até o fim do mês, o IUGA fecha em ${fmtN(t.iugaMaxPossivel, 2)}%. Reduzir a queima ainda melhora o resultado do ${esc(CFG.ativo)} e de ${esc(CFG.campo)}.`}</span>
    <span class="gh mt6">Origens evitáveis a trabalhar · maiores primeiro</span>${rows || '<div class="li n0"><span class="sec">Nenhuma causa evitável registrada na queima projetada</span></div>'}${manobras}${base}</div>`;
}
const COR_SIS = { 'Planta de processo': '#ED8B00', 'Poços e subsea': '#008542', 'Escoamento / offloading': '#00B2A9', 'Restrição externa / mercado': '#75787B', 'Manutenção programada': '#FDC82F', 'Utilidades': '#9a9c9e', 'Outros': '#c4c6c8' };   // D-63 (proposta 8)
const TIT_DET = { pfceo: 'Equipamentos e Sistemas – PFCEO', servicos: 'Serviços e Canal Base x Bordo', pocos: 'Poços · últimas 24 h', utilidades: 'Utilidades · estoque × mínimo', integridade: 'Inspeções de integridade', criticos: 'Críticos de segurança e peças em falta' };
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
const tile = (rot, val, un = '', sem = '', cap = '', tip = null) => `<div class="dtile${sem ? ' s-' + sem : ''}"${sem ? dTip(sem, tip || [`${String(rot).replace(/<[^>]+>/g, '')}: ${String(val).replace(/<[^>]+>/g, '')} ${un}`, String(cap).replace(/<[^>]+>/g, '')]) : ''}><span class="gh">${rot}</span><span class="nw"><b class="big b48">${val}</b>${un ? `<span class="unit">${un}</span>` : ''}</span>${cap ? `<span class="cap">${cap}</span>` : ''}</div>`;
const diasDesde = (iso, ref) => iso ? diffDias(ref, iso) : null;

const DETALHES = {
  /* ---------- Últimas 24h (todas as coordenações) ---------- */
  ultimas24(E, ctx, b, coord) {
    const ds = destaquesDe(E, coord), am = itensDe(E, coord, 'ameaca'), op = itensDe(E, coord, 'oportunidade');
    const sug = E.sugestoes.filter(s => s.payload.coord === coord);
    const nAp = sug.filter(s => s.decisao?.payload.acao === 'aprovar').length, nRe = sug.filter(s => s.decisao?.payload.acao === 'recusar').length, nPe = pendentes(E, coord).length;
    const bloco = d => {
      const p = d.ref.payload, coms = d.tipo === 'sugestao' ? (E.comentarios?.[d.id] || []) : [];
      return `<div class="dqx s-${d.semaforo}"><div class="dq-m">${pill(d.semaforo, d.status || semNome(d.semaforo), true, TIP.curado(d))}${tag(d.fonte)}${d.abertura ? tagAb : ''}<span class="cap">${T(d.tag)}${d.tag ? ' · ' : ''}${esc(d.meta)}</span></div>
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
        <div class="card col">${hd('Ameaças')}${am.map(i => `<div class="th2">${glyph(i.payload.semaforo, 18, TIP.item(i))}<span>${T(i.payload.texto)}</span></div>`).join('') || '<div class="th2"><span></span><span class="sec">Nenhuma ameaça registrada</span></div>'}</div>
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
        <div class="dtiles">${tile('Na tela da ' + coord, s.itens.length, '', '', (s.sugerida ? 'desvios aprovados automaticamente' : 'desvios + ajustes do coordenador') + (s.seguranca.length ? ` · ${s.seguranca.length} de segurança` : ''))}${tile('Indisponíveis', nInd, '', nInd ? 'nok' : 'ok', '', ['Sistemas indisponíveis no PFCEO:', ...s.itens.filter(i => i.disponibilidade === 'Indisponível').map(i => i.funcao + (i.nota ? ' · ' + i.nota : ''))])}${tile('Com restrição', nRes, '', nRes ? 'at' : 'ok', '', ['Sistemas disponíveis com restrição:', ...s.itens.filter(i => i.disponibilidade === 'Disponível com Restrição').map(i => i.funcao + (i.nota ? ' · ' + i.nota : ''))])}${tile('Menor margem', menor ? `${menor.disponiveis}/${menor.unidades}` : '—', '', menor ? (PF.margem(menor) < 1 ? 'at' : 'ok') : '', menor ? T(menor.funcao) : 'sem redundância informada')}</div>
        <div class="card col fill">${hd('Funções críticas selecionadas · piores primeiro', v ? `<span class="cap nw">${tag(v.origem)} ${esc(v.fonte || '')} · ${hhmm(v.em)}</span>` : '')}
          <div class="tbl pft"><span class="th l">Função crítica · TAG</span><span class="th l">Redundância</span><span class="th l">Unidades</span><span class="th l">Disponibilidade</span><span class="th l">Condição</span><span class="th l">Situação</span><span class="th l">Nota · NM SAP</span>
          ${s.itens.map(i => `<span class="td l"><b>${PF.seguranca(i) ? '<span class="o escl escl-seg">Segurança</span> ' : ''}${T(i.funcao)}</b><span class="un">${T(i.tag || '')}</span></span><span class="td l">${esc(i.redundancia || '—')}</span><span class="td l">${unidadesHtml(i) || '—'}</span><span class="td l">${pill(PF.semDisp(i.disponibilidade), PF.curto(i.disponibilidade), true, TIP.pf(i))}</span><span class="td l"><span class="row-c">${glyph(PF.semCond(i.condicao), 16, [`${i.funcao}: condição ${i.condicao || 'sem dado'}`, i.nota ? 'Nota: ' + i.nota : '', 'Origem: PFCEO'])}${esc(i.condicao || '—')}</span></span><span class="td l">${esc(i.situacao || '—')}</span><span class="td l">${T(i.nota || '')}${i.nm ? ` <span class="sec">· NM ${esc(i.nm)}</span>` : ''}</span>`).join('') || '<span class="td l sec">Nenhuma função selecionada</span><span class="td"></span><span class="td"></span><span class="td"></span><span class="td"></span><span class="td"></span><span class="td"></span>'}
          </div></div></div>
      <div class="card col">${hd('Demais funções no PFCEO', `<span class="cap">${outros.length}</span>`)}
        ${outros.map(i => `<div class="li"><span class="row-c">${glyph(PF.semDisp(i.disponibilidade), 16, TIP.pf(i))}${T(i.funcao)}</span><span class="s">${esc(PF.curto(i.disponibilidade))}</span></div>`).join('') || '<div class="li n0"><span class="sec">Todas estão na tela</span></div>'}
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
    const an = labDe(E, coord, ctx.dia), atr = an.filter(a => a.atrasada).length, sem = an.filter(a => a.valor === null).length, fora = an.filter(a => a.sem === 'nok').length;
    return `<main class="m3 det" style="grid-template-columns:minmax(0,1fr)">
      <div class="colg">
        <div class="dtiles">${tile('Análises', an.length)}${tile('Fora da especificação', fora, '', fora ? 'nok' : 'ok', `${an.filter(a => a.limTxt).length} com limite definido`, ['Análises fora da especificação:', ...an.filter(a => a.sem === 'nok').map(a => `${a.rot}: ${fmtN(a.valor, a.dec)} ${a.un || ''} (${a.limTxt})`)])}${tile('Em dia', an.filter(a => a.data && !a.atrasada).length, '', 'ok')}${tile('Atrasadas', atr, '', atr ? 'at' : 'ok', '', ['Análises com resultado atrasado:', ...an.filter(a => a.atrasada).map(a => `${a.rot}: ${a.dias} dias (periodicidade ${a.per} d)`)])}${tile('Sem resultado', sem, '', sem ? 'at' : 'ok', '', ['Análises sem resultado gravado:', ...an.filter(a => a.valor === null).map(a => a.rot)])}</div>
        <div class="card col fill">${hd('Resultados de Análises · ' + COORD_NOME[coord], `<span class="cap nw">${tag('A')} eplab · captura em Dados automáticos</span>`)}
          <div class="tbl lab"><span class="th l">Análise</span><span class="th">Resultado</span><span class="th l">Especificação</span><span class="th l">Data do resultado</span><span class="th l">Periodicidade</span><span class="th l">Situação</span><span class="th l">Enquadramento · tela</span><span class="th l">Origem</span>
          ${an.map(a => `<span class="td l fb">${esc(a.rot)}</span><span class="td">${a.valor === null ? '<span class="sec">Sem dado</span>' : `<b>${a.tipo === 'texto' ? esc(a.valor) : fmtN(a.valor, a.dec)}</b>${a.un ? `<span class="u">${NBSP}${esc(a.un)}</span>` : ''}`}</span><span class="td l nw">${a.sem ? `<span class="row-c">${glyph(a.sem, 16, TIP.analise(a))}${esc(a.limTxt)}${a.un ? NBSP + esc(a.un) : ''}</span>` : a.limTxt ? esc(a.limTxt) : '<span class="sec">sem limite</span>'}</span><span class="td l nw">${a.data ? (a.atrasada ? `<span class="o at dt">${SH.at(15)}${ddmmaaaa(a.data)}</span>` : ddmmaaaa(a.data)) : '—'}</span><span class="td l nw">a cada ${a.per} ${a.per === 1 ? 'dia' : 'dias'}</span><span class="td l">${a.valor === null ? pill('sd', 'Sem resultado', true, TIP.analise(a)) : a.sem === 'nok' ? pill('nok', 'Fora da especificação', true, TIP.analise(a)) : a.atrasada ? pill('at', `Atrasada · ${a.dias} dias`, true, TIP.analise(a)) : a.sem === 'at' ? pill('at', 'Perto do limite', true, TIP.analise(a)) : a.data ? pill('ok', 'Em dia') : pill('sd', 'Sem data', true, [`${a.rot}: resultado sem data`])}</span><span class="td l nw cap">${a.corrente ? `<b class="k">${esc(CORRENTES[a.corrente])}</b>` : '—'}${a.tela ? '' : ' · fora do card'}</span><span class="td l cap">${esc(a.fonte || '—')}</span>`).join('')}
          </div>
          <span class="cap mt-auto">Parâmetros e periodicidades iniciais, a ajustar com cada coordenação (D-52). Limites de especificação na Configuração da UEP (D-61): fora do limite = Não OK; a menos de 10% da faixa = Atenção. Resultado atrasado: intervalo desde a última amostra maior que a periodicidade.</span></div>
      </div></main>`;
  },

  /* ---------- COPROD ---------- */
  'indicadores:COPROD'(E, ctx) {
    const r = reservaQueima(E, ctx.dia), def = deferimentoDe(E), defTot = def.reduce((a, d) => a + d.volume, 0), vd = E.listas['oleo.deferimento'], cota = VN(E, 'queima.campo_cota'), cAcum = VN(E, 'queima.campo_acum');   // D-63 (propostas 8 e 6)
    const urs = VN(E, 'agua.urs') || 0, pr = VN(E, 'agua.prod_reinj') || 0, tot = urs + pr, pct = x => tot ? fmtN(x / tot * 100, 1) + '%' : '—';
    const flare = (n, v) => v === 'Aberto' ? chip('Aberto', 'reaberto', n) : chip(v || 'Sem dado', null, n);
    return `<main class="m3 det" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)">
      <div class="colg">
        <div class="card">${hd('Indicadores · meta × realizado × projetado')}<div class="tbl big2">${linhasIndicadoresCoprod(E)}</div></div>
        <div class="card col">${hd('Perda de produção D-1 · por causa e sistema', `<span class="cap nw">${vd ? tag(vd.origem) + ' ' + esc(vd.fonte || '') : ''} · total <b class="k">${fmtN(defTot)}</b> m³/d</span>`)}
          <div class="bars">${def.slice(0, 4).map(d => `<span>${T(d.causa)} <span class="sec n">· ${esc(d.sistema || '—')}</span></span><div class="track"><div style="width:${defTot ? d.volume / defTot * 100 : 0}%;background:${COR_SIS[d.sistema] || '#75787B'}"></div></div><b>${fmtN(d.volume)}</b>`).join('') || '<span class="sec">Nenhuma perda de produção registrada para D-1</span>'}</div>
          ${E.def?.dias ? `<div class="row-sb mt6"><span class="gh">Pareto do mês por sistema · ${E.def.dias} dia${E.def.dias === 1 ? '' : 's'}</span><span class="cap"><b class="k">${fmtN(E.def.total)}</b> m³ no mês</span></div>
          <div class="bar b16">${E.def.porSistema.map(x => `<div style="width:${E.def.total ? x.v / E.def.total * 100 : 0}%;background:${COR_SIS[x.k] || '#75787B'}" title="${esc(x.k)}: ${fmtN(x.v)} m³"></div>`).join('')}</div>
          <span class="cap lg2">${E.def.porSistema.slice(0, 4).map(x => `<span><i style="background:${COR_SIS[x.k] || '#75787B'}"></i>${esc(x.k)} ${fmtN(E.def.total ? x.v / E.def.total * 100 : 0, 0)}%</span>`).join('')}</span>` : '<span class="cap">Sem perda de produção registrada nas REDIAs anteriores do mês</span>'}</div>
      </div>
      <div class="colg">
        <div class="card col">${hd('Equipamentos · status')}
          ${EQUIP.map(e => `<span class="gh">${esc(e.rot)}</span><div class="cps">${chipsEq(E, e.id)}</div>`).join('')}
          <span class="gh">Modo do flare</span><div class="cps">${flare('HP', V(E, 'flare.hp'))}${flare('LP', V(E, 'flare.lp'))}</div>
          <span class="mt4">${legendaEq()}</span></div>
        <div class="card col">${hd('Composição da água injetada', V(E, 'agua.ref') ? tag(V(E, 'agua.ref')) : '')}
          <div class="bar b16"><div style="width:${tot ? urs / tot * 100 : 0}%;background:#00B2A9"></div><div style="width:${tot ? pr / tot * 100 : 0}%;min-width:${pr ? 4 : 0}px;background:#75787B"></div></div>
          <div class="comp"><span class="lg"><i style="background:#00B2A9"></i>Dessulfatada (URS)</span><b>${fmtU(urs, 0, 'm³')}</b><span class="sec">${pct(urs)}</span>
            <span class="lg"><i style="background:#75787B"></i>Produzida reinjetada</span><b>${fmtU(pr, 0, 'm³')}</b><span class="sec">${pct(pr)}</span></div>
          ${li('Produzida descartada no mar', fmtU(VN(E, 'agua.prod_desc'), 0, 'm³'))}</div>
        <div class="card col fill">${hd('IUGA e queima · contexto do ativo e do campo')}
          ${li(`P-83 · parcial do mês <span class="sec n">· meta ${VN(E, 'iuga.meta') != null ? fmtN(VN(E, 'iuga.meta'), 2) + '%' : '—'}</span>`, r.iugaMes != null ? `<span${estDef(r.iugaMes, VN(E, 'iuga.meta'), { modo: 'pp' })}>${fmtN(r.iugaMes, 2)}%</span>` : 'Sem dado')}
          ${li(esc(CFG.ativo) + ' · IUGA', VN(E, 'iuga.atp') != null ? `<span${estDef(VN(E, 'iuga.atp'), VN(E, 'iuga.meta'), { modo: 'pp' })}>${fmtN(VN(E, 'iuga.atp'), 2)}%</span>` : 'Sem dado', 1)}${li(esc(CFG.campo) + ' · IUGA', VN(E, 'iuga.buzios') != null ? `<span${estDef(VN(E, 'iuga.buzios'), VN(E, 'iuga.meta'), { modo: 'pp' })}>${fmtN(VN(E, 'iuga.buzios'), 2)}%</span>` : 'Sem dado', 1)}
          ${cota != null ? `<div class="li"><span>Cota de queima de ${esc(CFG.campo)} no mês</span><span class="v">${fmtN(cAcum)} <span class="sec n">de ${fmtN(cota)} m³ · ${cAcum != null ? fmtN(cAcum / cota * 100, 0) + '%' : '—'}</span></span></div><div class="bar b16"><div style="width:${cAcum != null ? Math.min(100, cAcum / cota * 100) : 0}%;background:${cAcum != null && cAcum / cota > 0.9 ? '#DA291C' : '#75787B'}"></div></div>${li('Reserva do campo', cAcum != null ? fmtU(cota - cAcum, 0, 'm³') : 'Sem dado')}` : li(`Cota de queima de ${esc(CFG.campo)}`, 'Sem dado', 1)}
          <span class="cap mt-auto">A cota de queima é do campo inteiro: a P-83 é lida junto com o ${esc(CFG.ativo)} e ${esc(CFG.campo)}. Dados do ativo (I-04).</span></div>
      </div></main>`;
  },
  'queima:COPROD'(E, ctx) {
    const r = reservaQueima(E, ctx.dia), iuS = Regras.iuga(r.iugaMes, r.meta);
    const causas = L(E, 'queima.causas'), totQ = causas.reduce((a, c) => a + (+c.valor || 0), 0) || 1, ev = L(E, 'queima.eventos'), cl = E.classes || { Rotina: 0, 'Extraordinária': 0, dias: 0 };
    const m3 = v => v != null ? fmtN(v) + NBSP + 'm³' : 'Sem dado';
    const hojeCl = k => causas.filter(c => classeQueima(c) === k).reduce((a, c) => a + (+c.valor || 0), 0), totCl = cl.Rotina + cl['Extraordinária'];
    return `<main class="m3 det" style="grid-template-columns:minmax(0,1.15fr) minmax(0,1fr)">
      <div class="colg">
        <div class="dtiles">${tile('Queima projetada D', fmtN(VN(E, 'queima.proj')), 'Mm³/d')}${tile('Acumulado no mês', fmtN(r.Qacc), 'm³', r.faltam.length ? 'at' : '', r.faltam.length ? `até D-1 · falta${r.faltam.length > 1 ? 'm' : ''} ${r.faltam.length} dia${r.faltam.length > 1 ? 's' : ''}` : `até D-1 · ${r.dias} dia${r.dias === 1 ? '' : 's'}`)}${tile('IUGA parcial do mês', r.iugaMes != null ? `<span${estDef(r.iugaMes, r.meta, { modo: 'pp' })}>${fmtN(r.iugaMes, 2)}</span>` : '—', '%', iuS.sem, 'meta ' + (r.meta != null ? fmtN(r.meta, 2) + '%' : '—'), TIP.iuga(E, iuS, 'IUGA parcial do mês', r.iugaMes, r.meta))}</div>
        ${cardTatico(E, ctx.dia)}
        <div class="card col">${hd('Queima projetada D · por causa e classe', `<span class="cap nw">hoje: rotina ${fmtN(hojeCl('Rotina'))} · extraordinária ${fmtN(hojeCl('Extraordinária'))} Mm³/d</span>`)}
          <div class="bars">${causas.map(c => `<span>${T(c.causa)} <span class="sec n">· ${esc(classeQueima(c))}${c.evitavel === 'sim' ? ' · evitável' : ''}</span></span><div class="track"><div style="width:${(+c.valor || 0) / totQ * 100}%;background:${classeQueima(c) === 'Extraordinária' ? '#ED8B00' : '#75787B'}"></div></div><b>${fmtN(c.valor)}</b>`).join('') || '<span class="sec">Sem causas registradas</span>'}</div>
          <span class="cap lg2"><span><i style="background:#ED8B00"></i>Extraordinária · emergência, parada de compressor, teste acima do previsto</span><span><i style="background:#75787B"></i>Rotina · purga, piloto, gás de assistência</span><span>Mm³/d</span></span>
          ${E.custo?.itens.length ? `<div class="row-sb mt6"><span class="gh">Gás queimado por equipamento indisponível · mês</span><span class="cap"><b class="k">${fmtN(E.custo.total)}</b> m³</span></div><div class="cps">${E.custo.itens.slice(0, 4).map(x => `<span class="w" title="${esc(x.eq)}: ${fmtN(x.m3)} m³ em ${x.dias} dia${x.dias === 1 ? '' : 's'}"><span class="q">${T(x.eq)}</span>${fmtN(x.m3 / 1000)} mil m³ · ${x.dias} d</span>`).join('')}</div>` : ''}
          ${cl.dias ? `<div class="qcl"><div class="row-sb"><span class="gh">No mês · ${cl.dias} dia${cl.dias === 1 ? '' : 's'} (inclui a projeção de hoje)</span><span class="cap"><b class="k">Rotina ${fmtN(cl.Rotina)}</b> m³ (${totCl ? fmtN(cl.Rotina / totCl * 100, 0) : '—'}%) · <b class="k">Extraordinária ${fmtN(cl['Extraordinária'])}</b> m³ (${totCl ? fmtN(cl['Extraordinária'] / totCl * 100, 0) : '—'}%)</span></div><div class="bar b16"><div style="width:${totCl ? cl.Rotina / totCl * 100 : 0}%;background:#75787B"></div><div style="width:${totCl ? cl['Extraordinária'] / totCl * 100 : 0}%;background:#ED8B00"></div></div></div>` : '<span class="cap">Sem classe registrada nas REDIAs anteriores do mês</span>'}</div>
      </div>
      <div class="colg">
      <div class="card col qcalc s-${r.sem}">${hd('Reserva de queima no mês', pill(r.sem, r.sem === 'nok' ? 'Sem reserva' : r.sem === 'at' ? 'Abaixo do projetado' : r.sem === 'ok' ? 'Folga' : 'Sem dado', true, TIP.queima(r)))}
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
      <div class="card col fill">${hd('IUGA acumulado do mês × trajetória para a meta')}${graficoIuga(E, ctx.dia, { w: 760, h: 170 })}
        <span class="cap mt-auto">Últimas 24 h${V(E, 'queima.ref') ? ' (' + esc(V(E, 'queima.ref')) + ')' : ''}: ${ev.map(e => `${esc(e.evento)} ${fmtN(e.volume, 1)}${NBSP}Mm³ (flare ${esc(e.flare)})`).join(' · ') || 'sem evento relevante'} · flare HP ${esc(V(E, 'flare.hp') || '—')} · LP ${esc(V(E, 'flare.lp') || '—')}</span></div>
      </div>
    </main>`;
  },
  'pocos:COPROD'(E, ctx) {
    const prod = pocos(E, 'produtor'), prox = V(E, 'teste.proximo'), pProx = prod.find(p => p.poco === prox);
    const linhaPoco = p => { const d = pocoDesvio(p), tv = testeVencido(p, ctx.dia); return `<div class="li pw">${chipPoco(p, ctx.dia)}<span class="s">${d ? `<b class="${d.abaixo ? 'k' : ''}">${fmtN(d.vz)}</b>/${fmtN(d.pot)} m³/d` : 'sem potencial'} · ${p.ultimo_teste ? `teste ${ddmm(p.ultimo_teste)} · ${diasDesde(p.ultimo_teste, ctx.dia)} d${tv?.vencido ? ' ⚠' : ''}` : 'sem teste'}</span></div>`; };
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
        <div class="card col">${hd('Produtores por trem', `<span class="cap nw">vazão D-1 / potencial · abaixo do potencial: <b class="k">${prod.filter(p => pocoDesvio(p)?.abaixo && p.status !== 'fechado').length}</b> · perda ${fmtN(prod.filter(p => p.status !== 'fechado').reduce((a, p) => a + (pocoDesvio(p)?.perda || 0), 0))} m³/d</span>`)}
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
    const jm = janelaMeteo(E), es = estabilidade(E);   // D-63 (propostas 16 e 19)
    const est = VN(E, 'off.estoque'), cap = VN(E, 'off.capacidade'), p = est && cap ? est / cap * 100 : 0;
    const ate = VN(E, 'off.ate_top'), prod = VN(E, 'off.prod24'), dias = ate != null && prod ? ate / prod : null;
    const top = String(V(E, 'off.top') || '').split(' ');
    return `<main class="m3 det" style="grid-template-columns:minmax(0,1.2fr) minmax(0,1fr)">
      <div class="card col">${hd('Tancagem e offloading', V(E, 'off.navio_ok') === 'Sim' ? pill('ok', 'Navio confirmado') : pill('at', 'Navio não confirmado', true, TIP.navio(E, String(V(E, 'off.navio') || '').split(' · ')[0].trim())), 'navio')}
        <div class="nw"><span class="big b64">${fmtN(est)}</span><span class="unit">m³ em estoque</span></div>
        <div class="track t20"><div style="width:${p}%;background:#008542"></div></div>
        <span class="cap">${p ? fmtN(p, 0) + '% da capacidade de ' + fmtN(cap) + NBSP + 'm³' : 'Capacidade sem dado'}</span>
        <div class="dtiles dt-in">${tile('Até o TOP', fmtN(ate), 'm³')}${tile('Produção 24 h', fmtN(prod), 'm³')}${tile('Previsão de TOP', esc(top[0] || '—'), esc(top[1] || ''), '', dias != null ? `≈ ${fmtN(dias, 1)} dias no ritmo atual` : '')}</div></div>
      <div class="colg">
      <div class="card col">${hd('Navio e qualidade')}
        ${li('Navio aliviador', T(V(E, 'off.navio') || 'Sem dado'))}${li('Navio confirmado', esc(V(E, 'off.navio_ok') || 'Sem dado'))}${li('Qualidade do estoque', T(V(E, 'off.qualidade') || 'Sem dado'))}${li('Estações de offloading', T(V(E, 'off.estacoes') || 'Sem dado'))}
        <span class="cap">Fonte: SITOP (offloading) e curadoria da COEMB.</span></div>
      <div class="card col">${hd('Janela meteo-oceanográfica do offloading', pill(jm.sem, jm.rot, true, TIP.meteo(jm)))}
        <div class="dtiles dt-in">${tile('Hs', jm.hs.v != null ? fmtN(jm.hs.v, 1) : '—', 'm', jm.hs.sem || '', jm.hs.lim != null ? `limite ${fmtN(jm.hs.lim, 1)} m` : '')}${tile('Vento', jm.vento.v != null ? fmtN(jm.vento.v, 0) : '—', 'nós', jm.vento.sem || '', jm.vento.lim != null ? `limite ${fmtN(jm.vento.lim, 0)} nós` : '')}${tile('Corrente', jm.corrente.v != null ? fmtN(jm.corrente.v, 1) : '—', 'nós', jm.corrente.sem || '', jm.corrente.lim != null ? `limite ${fmtN(jm.corrente.lim, 1)} nós` : '')}</div>
        ${jm.tendencia ? li('Tendência 24–48 h', T(jm.tendencia)) : ''}<span class="cap">Limites de conexão do offloading na Configuração da UEP (PREMISSA). Previsão: fonte a confirmar (I-58).</span></div>
      <div class="card col fill">${hd('Lastro e estabilidade', pill(es.sem, es.sem === 'nok' ? 'Fora do limite' : es.sem === 'at' ? 'Perto do limite' : es.sem === 'ok' ? 'Dentro dos limites' : 'Sem dado', true, TIP.estab(es)))}
        <div class="dtiles dt-in">${tile('Calado vante / ré', es.cv != null || es.cr != null ? `${fmtN(es.cv, 1)} / ${fmtN(es.cr, 1)}` : '—', 'm', es.s.calado || '', es.lim.caladoMax != null ? `máx. ${fmtN(es.lim.caladoMax, 1)} m` : '')}${tile('Trim', es.trim != null ? (es.trim > 0 ? '+' : '') + fmtN(es.trim, 2) : '—', 'm', es.s.trim || '', es.lim.trim != null ? `limite ±${fmtN(es.lim.trim, 1)} m` : '')}${tile('Banda', es.banda != null ? (es.banda > 0 ? '+' : '') + fmtN(es.banda, 1) : '—', '°', es.s.banda || '', es.lim.banda != null ? `limite ±${fmtN(es.lim.banda, 1)}°` : '')}</div>
        <span class="cap mt-auto">Trim positivo = pela popa; banda positiva = boreste. Limites na Configuração (PREMISSA); sistema de lastro a confirmar.</span></div>
      </div>
    </main>`;
  },
  'utilidades:COEMB'(E) {
    const util = L(E, 'util');
    return `<main class="m3 det" style="grid-template-columns:minmax(0,1fr)">
      <div class="card col">${hd('Utilidades · estoque × mínimo')}
        <div class="tbl utt"><span class="th l">Utilidade</span><span class="th">Estoque</span><span class="th">Mínimo</span><span class="th">Consumo</span><span class="th">Produção</span><span class="th">Saldo/dia</span><span class="th">Dias até o mínimo</span><span class="th l">Situação</span>
        ${util.map(u => { const r = Regras.utilidade(u), saldo = (+u.producao || 0) - (+u.consumo || 0); return `<span class="td l fb">${T(u.nome)}<span class="un"><span class="track mini"><div style="width:${u.minimo ? Math.min(100, u.estoque / (u.minimo * 2) * 100) : 0}%;background:${COR[r.sem]}"></div></span></span></span><span class="td k">${fmtU(u.estoque, 0, 'm³')}</span><span class="td">${fmtN(u.minimo)}</span><span class="td">${fmtN(u.consumo)}</span><span class="td">${fmtN(u.producao)}</span><span class="td${saldo < 0 ? ' fb' : ''}">${saldo > 0 ? '+' : saldo < 0 ? '−' : ''}${fmtN(Math.abs(saldo))}</span><span class="td">${r.dias != null ? fmtN(r.dias, 1) : '—'}</span><span class="td l">${pill(r.sem, semNome(r.sem), true, TIP.utilidade(u, r))}</span>`; }).join('')}
        </div><span class="cap mt-auto">Volumes em m³ e m³/d. Atenção quando o estoque chega ao mínimo em até ${CFG.limiares.utilidades.diasAtencao} dias. A barra compara o estoque com o dobro do mínimo.</span></div></main>`;
  },
  'tanques:COEMB'(E) {
    const tq = L(E, 'tq.atencao');
    return `<main class="m3 det" style="grid-template-columns:minmax(0,1fr)"><div class="card col">${hd('Tanques em atenção', `<span class="cap">${tq.length}</span>`)}
      ${tq.map(t => `<div class="row2 big3"><div class="col"><span class="t1">${T(t.tanque)}</span><span class="t2">${T(t.nota || '')}</span></div><span class="tg">${pill(semDeStatus(t.status), t.status || 'Sem dado', true, TIP.status(t.tanque, t.status, [t.nota]))}</span></div>`).join('') || '<div class="row2"><span class="sec">Nenhum tanque em atenção</span></div>'}</div></main>`;
  },

  /* ---------- COMAN ---------- */
  'indicadores:COMAN'(E) {
    const ind = L(E, 'man.ind');
    return `<main class="m3 det" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)">
      <div class="card col">${hd('Indicadores de manutenção', V(E, 'man.ref') ? tag(V(E, 'man.ref')) : '')}
        <div class="dtiles dt-in">${ind.map(i => { const mt = metaManutencao(i), s = Regras.manutencao(+i.valor, mt), d = mt != null ? +i.valor - mt : null; return tile(T(i.ind), `<span${estDef(+i.valor, mt, { modo: 'pp', cheio: CFG.limiares.manutencaoFaixaAtencao * 2 })}>${fmtN(i.valor, i.valor % 1 ? 1 : 0)}</span>`, '%', s, mt != null ? `meta ${fmtN(mt, mt % 1 ? 1 : 0)}%${i.meta === '' || i.meta == null ? ' (UEP)' : ''} · ${d >= 0 ? '+' : '−'}${fmtN(Math.abs(d), 1)} p.p.` : 'meta não definida na Configuração', TIP.manut(i, mt, s)); }).join('')}</div>
        <span class="cap mt-auto">Atenção até ${CFG.limiares.manutencaoFaixaAtencao} p.p. abaixo da meta. Metas da linha de base da ${esc(CFG.uep)} na Configuração da UEP (D-61); fonte dos indicadores a definir (I-06).</span></div>
      <div class="colg">
      <div class="card col">${hd('Plano de manutenção · semana e backlog', E.valores['man.aderencia'] ? tag(E.valores['man.aderencia'].origem === 'A' ? E.valores['man.aderencia'].fonte || 'SAP PM' : 'M') : '')}
        <div class="dtiles dt-in">${tile('Aderência ao plano', VN(E, 'man.aderencia') != null ? fmtN(VN(E, 'man.aderencia'), 0) : '—', '%', VN(E, 'man.aderencia') == null ? '' : VN(E, 'man.aderencia') >= 90 ? 'ok' : VN(E, 'man.aderencia') >= 80 ? 'at' : 'nok', 'ordens programadas executadas')}${tile('Backlog', VN(E, 'man.backlog') != null ? fmtN(VN(E, 'man.backlog'), 1) : '—', 'sem.-equipe', '', 'total')}${tile('Backlog crítico', VN(E, 'man.backlog_critico') != null ? fmtN(VN(E, 'man.backlog_critico'), 1) : '—', 'sem.-equipe', VN(E, 'man.backlog_critico') == null ? '' : VN(E, 'man.backlog_critico') > 2 ? 'nok' : VN(E, 'man.backlog_critico') > 1 ? 'at' : 'ok', 'itens críticos')}</div>
        <span class="cap">Aderência ≥ 90% OK, ≥ 80% Atenção; backlog crítico ≤ 1 semana-equipe OK, ≤ 2 Atenção (PREMISSA, D-63a). Fonte: SAP PM (I-06).</span></div>
      <div class="card col fill">${hd('Segurança operacional')}
        <div class="nums"><span><b class="big b52">${fmtN(VN(E, 'man.notas_if6'))}</b><span class="cap">notas IF6/6 abertas</span></span><span><b class="big b52">${fmtN(VN(E, 'man.sensores'))}</b><span class="cap">sensores em falha</span></span></div></div>
      </div>
    </main>`;
  },
  'geracao:COMAN'(E) {
    const tgs = L(E, 'ger.tgs');
    return `<main class="m3 det" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr)">
      <div class="card col">${hd('Geração principal · 4 × 33%', pill(V(E, 'ger.reserva') === 'Sem reserva' ? 'nok' : 'ok', V(E, 'ger.reserva') || 'Sem dado', true, ['Geração principal sem reserva de turbogerador', ...tgs.map(t => `${t.tg}: ${t.status}${t.linha1 ? ' · ' + t.linha1 : ''}`)]), 'raio')}
        <div class="tgs g4">${tgs.map(t => `<div class="tgc"><div class="row-sb"><b class="f32">${T(t.tg)}</b>${pill(semDeStatus(t.status) === 'sd' ? 'sd' : semDeStatus(t.status), t.status, true, TIP.status(t.tg, t.status, [t.linha1, t.linha2]))}</div><span class="t2 k f20">${T(t.linha1)}</span><span class="t2 f20${t.alerta === 'sim' ? ' k fb' : ''}">${T(t.linha2)}</span></div>`).join('')}</div></div>
      <div class="card col">${hd('Emergência e auxiliares')}${L(E, 'ger.aux').map(a => `<div class="li"><span>${T(a.nome)}</span><span class="s row-c">${glyph(semDeStatus(a.status), 14, TIP.status(a.nome, a.status, [a.nota]))}${esc(String(a.status).toLowerCase())}</span></div>`).join('')}</div>
    </main>`;
  },
  /* ---------- D-62 (propostas 17): inspeções de integridade · COEMB ---------- */
  'integridade:COEMB'(E, ctx) {
    const ins = inspecoesDe(E, ctx.dia), v = E.listas['insp.integridade'], venc = ins.filter(i => i.v.k === 'nok'), prox = ins.filter(i => i.v.k === 'at');
    return `<main class="m3 det" style="grid-template-columns:minmax(0,1fr)">
      <div class="colg">
        <div class="dtiles">${tile('Inspeções no plano', ins.length)}${tile('Vencidas', venc.length, '', venc.length ? 'nok' : 'ok', '', TIP.venc('Inspeções vencidas', venc))}${tile(`Vencem em ${CFG.limiares.inspecaoJanelaDias} dias`, prox.length, '', prox.length ? 'at' : 'ok')}${tile('Próxima', ins.find(i => i.v.dias != null && i.v.dias >= 0) ? ddmm(ins.filter(i => i.v.dias != null && i.v.dias >= 0).sort((a, b) => a.v.dias - b.v.dias)[0].proxima) : '—', '', '', ins.find(i => i.v.dias != null && i.v.dias >= 0) ? T(ins.filter(i => i.v.dias != null && i.v.dias >= 0).sort((a, b) => a.v.dias - b.v.dias)[0].item) : '')}</div>
        <div class="card col fill">${hd('Inspeções de integridade · tanques, casco, amarração e turret', v ? `<span class="cap nw">${tag(v.origem)} ${esc(v.fonte || '')} · ${hhmm(v.em)}</span>` : '')}
          <div class="tbl insp"><span class="th l">Item</span><span class="th l">Inspeção</span><span class="th l">Última</span><span class="th l">Próxima / vencimento</span><span class="th l">Situação</span>
          ${ins.map(i => `<span class="td l fb">${T(i.item)}</span><span class="td l">${T(i.tipo || '')}</span><span class="td l nw">${i.ultima ? ddmmaaaa(i.ultima) : '—'}</span><span class="td l nw">${i.proxima ? ddmmaaaa(i.proxima) : '—'}</span><span class="td l">${pill(i.v.k, i.v.rot, true, [`${i.item}${i.tipo ? ' · ' + i.tipo : ''}`, `Última ${i.ultima ? ddmmaaaa(i.ultima) : '—'} · próxima ${i.proxima ? ddmmaaaa(i.proxima) : '—'}`, `Regra: vencida Não OK · vence em até ${CFG.limiares.inspecaoJanelaDias} dias Atenção`])}</span>`).join('') || '<span class="td l sec">Nenhuma inspeção registrada</span><span class="td"></span><span class="td"></span><span class="td"></span><span class="td"></span>'}
          </div>
          <span class="cap mt-auto">Vencida = próxima antes de hoje e não executada; Atenção = vence em até ${CFG.limiares.inspecaoJanelaDias} dias (Configuração). Plano de inspeção: fonte a confirmar (I-56).</span></div>
      </div></main>`;
  },
  /* ---------- D-62 (propostas 3, 21 e 23): críticos de segurança e peças em falta · COMAN ---------- */
  'criticos:COMAN'(E, ctx) {
    const crit = criticasDe(E, ctx.dia), venc = crit.filter(c => c.v.k === 'nok'), v7 = crit.filter(c => c.v.k === 'at'), pecas = pecasDe(E), falta = pecas.filter(x => x.situacao === 'Em falta');
    const vc = E.listas['man.criticas'], vp = E.listas['man.pecas'];
    return `<main class="m3 det" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr)">
      <div class="colg">
        <div class="dtiles">${tile('Itens críticos', crit.length)}${tile('Vencidos', venc.length, '', venc.length ? 'nok' : 'ok', '', TIP.venc('Críticos de segurança vencidos', venc))}${tile('Vencem em 7 dias', v7.length, '', v7.length ? 'at' : 'ok', '', TIP.venc('Críticos que vencem em 7 dias', v7))}${tile('Executados', crit.filter(c => c.situacao === 'Executada').length, '', 'ok')}</div>
        <div class="card col fill">${hd('Itens de segurança crítica · preventivas e testes (SIS, F&G, dilúvio, ESD)', vc ? `<span class="cap nw">${tag(vc.origem)} ${esc(vc.fonte || '')} · ${hhmm(vc.em)}</span>` : '')}
          <div class="tbl crit"><span class="th l">Item · TAG</span><span class="th l">Tipo</span><span class="th l">Vencimento</span><span class="th l">Situação</span>
          ${crit.map(c => `<span class="td l"><b>${T(c.item)}</b><span class="un">${T(c.tag || '')}</span></span><span class="td l">${esc(c.tipo || '—')}</span><span class="td l nw">${c.vencimento ? ddmmaaaa(c.vencimento) : '—'}</span><span class="td l">${pill(c.v.k, c.v.rot, true, [`${c.item}${c.tag ? ' (' + c.tag + ')' : ''} · ${c.tipo || ''}`, `Vencimento ${c.vencimento ? ddmmaaaa(c.vencimento) : '—'}`, 'Regra: vencido Não OK · vence em 7 dias Atenção'])}</span>`).join('') || '<span class="td l sec">Nenhum item registrado</span><span class="td"></span><span class="td"></span><span class="td"></span>'}
          </div>
          <span class="cap mt-auto">Vencido = vencimento antes de hoje e não executado. Fonte: SAP PM (I-06); até a integração, lista da COMAN.</span></div>
      </div>
      <div class="card col">${hd('Peças críticas em falta', vp ? `<span class="cap nw">${falta.length} em falta · ${pecas.filter(x => x.situacao === 'Em trânsito').length} em trânsito</span>` : '')}
        ${pecas.map(x => `<div class="row2"><div class="col"><span class="t1">${T(x.peca)}</span><span class="t2">${[x.equipamento, x.om ? 'OM ' + x.om : '', x.impacto].filter(Boolean).map(T).join(' · ')}</span></div><span class="tg">${x.previsao ? `<span class="cap nw">prev. ${ddmm(x.previsao)}</span>` : ''}${pill(x.situacao === 'Em falta' ? 'at' : x.situacao === 'Recebida' ? 'ok' : 'sd', x.situacao || 'Sem dado', true, [`${x.peca}: ${x.situacao || 'sem situação'}`, x.equipamento ? 'Equipamento: ' + x.equipamento : '', x.om ? 'OM ' + x.om : '', x.previsao ? 'Previsão de chegada: ' + ddmm(x.previsao) : 'Sem previsão de chegada'])}</span></div>`).join('') || '<div class="row2"><span class="sec">Nenhuma peça em falta</span></div>'}
        <span class="cap mt-auto">Materiais que travam ordem de manutenção, com previsão de chegada. Fonte: SAP MM (I-06); até a integração, lista da COMAN.</span></div>
    </main>`;
  },
  'legais:COMAN'(E) {
    return `<main class="m3 det" style="grid-template-columns:minmax(0,1fr)"><div class="card col">${hd('Órgãos legais e suprimentos')}
      ${L(E, 'legais').map(l => `<div class="row2 big3"><span class="t1">${T(l.item)}</span><span class="tg">${pill(semDeStatus(l.status), l.status, true, TIP.status(l.item, l.status, [l.nota]))}</span></div>`).join('') || '<div class="row2"><span class="sec">Nenhum item</span></div>'}</div></main>`;
  },
};
