/* ===================== REDIA Búzios · modelo de dados e regras ===================== */
'use strict';
const COORDS = ['GEPLAT', 'COPROD', 'COEMB', 'COMAN'];
const COORD_NOME = { GEPLAT: 'Gerência da plataforma', COPROD: 'Produção', COEMB: 'Embarcação', COMAN: 'Manutenção' };

/* ---- campos de valor único (origem A = automático, M = manual, C = curadoria) ---- */
const CAMPOS = [
  // GEPLAT · abertura
  { id: 'geplat.situacao', coord: 'GEPLAT', grupo: 'Situação da unidade', rot: 'Frase-resumo (até 140 caracteres)', tipo: 'texto', max: 140 },
  { id: 'geplat.situacao_sem', coord: 'GEPLAT', grupo: 'Situação da unidade', rot: 'Semáforo da unidade', tipo: 'semaforo' },
  { id: 'sms.dias_parada', coord: 'GEPLAT', grupo: 'Dias sem evento', rot: 'Dias sem parada não programada', tipo: 'num', un: 'dias' },
  { id: 'sms.recorde_parada', coord: 'GEPLAT', grupo: 'Dias sem evento', rot: 'Recorde sem parada', tipo: 'num', un: 'dias' },
  { id: 'sms.dias_ocorrencia', coord: 'GEPLAT', grupo: 'Dias sem evento', rot: 'Dias sem ocorrência registrável', tipo: 'num', un: 'dias' },
  { id: 'sms.desde_ocorrencia', coord: 'GEPLAT', grupo: 'Dias sem evento', rot: 'Última ocorrência registrável', tipo: 'texto' },
  { id: 'sms.dias_incendio', coord: 'GEPLAT', grupo: 'Dias sem evento', rot: 'Dias sem princípio de incêndio', tipo: 'num', un: 'dias' },
  { id: 'sms.recorde_incendio', coord: 'GEPLAT', grupo: 'Dias sem evento', rot: 'Recorde sem princípio de incêndio', tipo: 'num', un: 'dias' },
  { id: 'pob.atual', coord: 'GEPLAT', grupo: 'POB', rot: 'POB atual', tipo: 'num' },
  { id: 'pob.max', coord: 'GEPLAT', grupo: 'POB', rot: 'POB máximo', tipo: 'num' },
  // COPROD
  { id: 'oleo.real', coord: 'COPROD', grupo: 'Produção de óleo', rot: 'Realizado D-1', tipo: 'num', un: 'm³/d' },
  { id: 'oleo.potencial', coord: 'COPROD', grupo: 'Produção de óleo', rot: 'Potencial', tipo: 'num', un: 'm³/d' },
  { id: 'oleo.proj', coord: 'COPROD', grupo: 'Produção de óleo', rot: 'Projetado D', tipo: 'num', un: 'm³/d' },
  { id: 'iuga.real', coord: 'COPROD', grupo: 'IUGA e queima', rot: 'IUGA realizado D-1', tipo: 'num', un: '%', dec: 2 },
  { id: 'iuga.meta', coord: 'COPROD', grupo: 'IUGA e queima', rot: 'Meta de IUGA', tipo: 'num', un: '%', dec: 2 },
  { id: 'iuga.proj', coord: 'COPROD', grupo: 'IUGA e queima', rot: 'IUGA projetado D', tipo: 'num', un: '%', dec: 2 },
  { id: 'iuga.atp', coord: 'COPROD', grupo: 'IUGA e queima', rot: 'IUGA do ATP-BUZ III', tipo: 'num', un: '%', dec: 2 },
  { id: 'iuga.buzios', coord: 'COPROD', grupo: 'IUGA e queima', rot: 'IUGA de Búzios', tipo: 'num', un: '%', dec: 2 },
  { id: 'queima.proj', coord: 'COPROD', grupo: 'IUGA e queima', rot: 'Queima projetada D', tipo: 'num', un: 'Mm³/d' },
  { id: 'gas.prod_d1', coord: 'COPROD', grupo: 'IUGA e queima', rot: 'Gás produzido D-1 (SITOP)', tipo: 'num', un: 'm³' },
  { id: 'queima.real_d1', coord: 'COPROD', grupo: 'IUGA e queima', rot: 'Queima D-1 (SITOP)', tipo: 'num', un: 'm³' },
  { id: 'iuga.gas_prod_mes', coord: 'COPROD', grupo: 'IUGA e queima', rot: 'Gás produzido no mês · correção manual (substitui a soma diária)', tipo: 'num', un: 'm³' },
  { id: 'queima.acum_mes', coord: 'COPROD', grupo: 'IUGA e queima', rot: 'Queima no mês · correção manual (substitui a soma diária)', tipo: 'num', un: 'm³' },
  { id: 'iuga.margem', coord: 'COPROD', grupo: 'IUGA e queima', rot: 'Margem de segurança da reserva tática (p.p. acima da meta; vazio = 0,1)', tipo: 'num', un: 'p.p.', dec: 2 },
  { id: 'iuga.gas_prod_proj', coord: 'COPROD', grupo: 'IUGA e queima', rot: 'Gás produzido projetado (dias restantes do mês)', tipo: 'num', un: 'm³/d' },
  { id: 'queima.campo_cota', coord: 'COPROD', grupo: 'IUGA e queima', rot: `Cota de queima do campo no mês (${'Búzios'})`, tipo: 'num', un: 'm³' },   // D-63 (proposta 6)
  { id: 'queima.campo_acum', coord: 'COPROD', grupo: 'IUGA e queima', rot: 'Queima acumulada do campo no mês', tipo: 'num', un: 'm³' },
  { id: 'queima.ref', coord: 'COPROD', grupo: 'IUGA e queima', rot: 'Referência dos eventos de queima', tipo: 'texto' },
  { id: 'flare.hp', coord: 'COPROD', grupo: 'IUGA e queima', rot: 'Flare HP agora', tipo: 'opcao', opcoes: ['Fechado', 'Aberto'] },
  { id: 'flare.lp', coord: 'COPROD', grupo: 'IUGA e queima', rot: 'Flare LP agora', tipo: 'opcao', opcoes: ['Fechado', 'Aberto'] },
  { id: 'gas.real', coord: 'COPROD', grupo: 'Injeção de gás', rot: 'Realizado', tipo: 'num', un: 'Mm³/d' },
  { id: 'gas.meta', coord: 'COPROD', grupo: 'Injeção de gás', rot: 'Meta', tipo: 'num', un: 'Mm³/d' },
  { id: 'gas.proj', coord: 'COPROD', grupo: 'Injeção de gás', rot: 'Projetado D', tipo: 'num', un: 'Mm³/d' },
  { id: 'gas.ref', coord: 'COPROD', grupo: 'Injeção de gás', rot: 'Referência do realizado', tipo: 'texto' },
  { id: 'agua.real', coord: 'COPROD', grupo: 'Injeção de água', rot: 'Realizado', tipo: 'num', un: 'm³/d' },
  { id: 'agua.meta', coord: 'COPROD', grupo: 'Injeção de água', rot: 'Meta', tipo: 'num', un: 'm³/d' },
  { id: 'agua.proj', coord: 'COPROD', grupo: 'Injeção de água', rot: 'Projetado D', tipo: 'num', un: 'm³/d' },
  { id: 'agua.urs', coord: 'COPROD', grupo: 'Injeção de água', rot: 'Água do mar dessulfatada (URS)', tipo: 'num', un: 'm³' },
  { id: 'agua.prod_reinj', coord: 'COPROD', grupo: 'Injeção de água', rot: 'Água produzida reinjetada', tipo: 'num', un: 'm³' },
  { id: 'agua.prod_desc', coord: 'COPROD', grupo: 'Injeção de água', rot: 'Água produzida descartada no mar', tipo: 'num', un: 'm³' },
  { id: 'agua.ref', coord: 'COPROD', grupo: 'Injeção de água', rot: 'Referência da composição', tipo: 'texto' },
  { id: 'teste.proximo', coord: 'COPROD', grupo: 'Poços e testes', rot: 'Próximo poço em teste de vazão (BUZ-XXX)', tipo: 'texto' },
  { id: 'teste.previsao', coord: 'COPROD', grupo: 'Poços e testes', rot: 'Previsão do teste (dd/mm)', tipo: 'texto' },
  // COEMB
  { id: 'off.estoque', coord: 'COEMB', grupo: 'Tancagem e offloading', rot: 'Estoque', tipo: 'num', un: 'm³' },
  { id: 'off.capacidade', coord: 'COEMB', grupo: 'Tancagem e offloading', rot: 'Capacidade de estocagem', tipo: 'num', un: 'm³' },
  { id: 'off.ate_top', coord: 'COEMB', grupo: 'Tancagem e offloading', rot: 'Até o TOP', tipo: 'num', un: 'm³' },
  { id: 'off.prod24', coord: 'COEMB', grupo: 'Tancagem e offloading', rot: 'Produzido em 24 h', tipo: 'num', un: 'm³' },
  { id: 'off.top', coord: 'COEMB', grupo: 'Tancagem e offloading', rot: 'Previsão de TOP (dd/mm hh:mm)', tipo: 'texto' },
  { id: 'off.navio', coord: 'COEMB', grupo: 'Tancagem e offloading', rot: 'Navio aliviador', tipo: 'texto' },
  { id: 'off.navio_ok', coord: 'COEMB', grupo: 'Tancagem e offloading', rot: 'Navio confirmado', tipo: 'opcao', opcoes: ['Sim', 'Não'] },
  { id: 'off.qualidade', coord: 'COEMB', grupo: 'Tancagem e offloading', rot: 'Qualidade do estoque', tipo: 'texto' },
  { id: 'off.estacoes', coord: 'COEMB', grupo: 'Tancagem e offloading', rot: 'Estações de offloading disponíveis', tipo: 'texto' },
  // COMAN
  { id: 'ger.reserva', coord: 'COMAN', grupo: 'Geração principal', rot: 'Situação da reserva', tipo: 'opcao', opcoes: ['Reserva disponível', 'Sem reserva'] },
  { id: 'man.ref', coord: 'COMAN', grupo: 'Indicadores de manutenção', rot: 'Fonte dos indicadores', tipo: 'texto' },
  { id: 'man.notas_if6', coord: 'COMAN', grupo: 'Indicadores de manutenção', rot: 'Notas IF6/6 abertas', tipo: 'num' },
  { id: 'man.sensores', coord: 'COMAN', grupo: 'Indicadores de manutenção', rot: 'Sensores em falha', tipo: 'num' },
  // D-63 (proposta 20): aderência ao plano da semana e backlog em semanas-equipe (SAP PM, I-06)
  { id: 'man.aderencia', coord: 'COMAN', grupo: 'Plano de manutenção', rot: 'Aderência ao plano da semana (ordens programadas executadas)', tipo: 'num', un: '%', dec: 0 },
  { id: 'man.backlog', coord: 'COMAN', grupo: 'Plano de manutenção', rot: 'Backlog total', tipo: 'num', un: 'semanas-equipe', dec: 1 },
  { id: 'man.backlog_critico', coord: 'COMAN', grupo: 'Plano de manutenção', rot: 'Backlog de itens críticos', tipo: 'num', un: 'semanas-equipe', dec: 1 },
  // D-63 (proposta 16): janela meteo-oceanográfica do offloading (fonte a confirmar, I-58)
  { id: 'meteo.hs', coord: 'COEMB', grupo: 'Janela meteo-oceanográfica', rot: 'Altura significativa de onda (Hs)', tipo: 'num', un: 'm', dec: 1 },
  { id: 'meteo.vento', coord: 'COEMB', grupo: 'Janela meteo-oceanográfica', rot: 'Vento', tipo: 'num', un: 'nós', dec: 0 },
  { id: 'meteo.corrente', coord: 'COEMB', grupo: 'Janela meteo-oceanográfica', rot: 'Corrente de superfície', tipo: 'num', un: 'nós', dec: 1 },
  { id: 'meteo.tendencia', coord: 'COEMB', grupo: 'Janela meteo-oceanográfica', rot: 'Tendência das próximas 24–48 h', tipo: 'texto' },
  // D-63 (proposta 19): lastro e estabilidade (condição do dia)
  { id: 'lastro.calado_vante', coord: 'COEMB', grupo: 'Lastro e estabilidade', rot: 'Calado a vante', tipo: 'num', un: 'm', dec: 2 },
  { id: 'lastro.calado_re', coord: 'COEMB', grupo: 'Lastro e estabilidade', rot: 'Calado a ré', tipo: 'num', un: 'm', dec: 2 },
  { id: 'lastro.trim', coord: 'COEMB', grupo: 'Lastro e estabilidade', rot: 'Trim (positivo = pela popa)', tipo: 'num', un: 'm', dec: 2 },
  { id: 'lastro.banda', coord: 'COEMB', grupo: 'Lastro e estabilidade', rot: 'Banda (positiva = boreste)', tipo: 'num', un: '°', dec: 1 },
];
/* Resultados de análises laboratoriais (eplab) · 5 parâmetros por coordenação.
   PREMISSA (D-52): lista inicial para validar com cada coordenação; periodicidade (dias) ajustável.
   Cada análise grava dois campos: o resultado (lab.<COORD>.<k>) e a data do resultado (lab.<COORD>.<k>.data). */
const LAB_GRUPO = 'Resultados de análises (eplab)';
const LAB = {
  COPROD: [
    { k: 'bsw_oleo', rot: 'BSW do óleo tratado', un: '%', dec: 2, per: 1 },
    { k: 'sal_oleo', rot: 'Salinidade do óleo tratado', un: 'mg/L', dec: 0, per: 1 },
    { k: 'tog_agua', rot: 'TOG da água produzida', un: 'mg/L', dec: 0, per: 1 },
    { k: 'h2s_gas', rot: 'H₂S no gás combustível', un: 'ppm', dec: 0, per: 7 },
    { k: 'so4_urs', curto: 'Sulfato na água da URS', rot: 'Sulfato na água dessulfatada (URS)', un: 'mg/L', dec: 0, per: 1 },
    { k: 'o2_inj', curto: 'O₂ dissolvido · água de injeção', rot: 'Oxigênio dissolvido na água de injeção', un: 'ppb', dec: 0, per: 1 },   // D-65: enquadramento da água injetada
    { k: 'h2o_gas', curto: 'Água no gás de injeção', rot: 'Teor de água no gás de injeção', un: 'ppmv', dec: 0, per: 1 },             // D-65: enquadramento do gás injetado
  ],
  COEMB: [
    { k: 'bsw_tq', rot: 'BSW dos tanques de carga', un: '%', dec: 2, per: 1 },
    { k: 'tog_slop', rot: 'TOG do slop descartado', un: 'mg/L', dec: 0, per: 1 },
    { k: 'cl_pot', curto: 'Cloro residual · água potável', rot: 'Cloro residual livre · água potável', un: 'mg/L', dec: 2, per: 1 },
    { k: 'turb_pot', curto: 'Turbidez · água potável', rot: 'Turbidez · água potável', un: 'NTU', dec: 1, per: 7 },
    { k: 'agua_diesel', rot: 'Água no óleo diesel', un: 'ppm', dec: 0, per: 30 },
  ],
  COMAN: [
    { k: 'visc_tg', curto: 'Viscosidade 40 °C · lubrificante TGs', rot: 'Viscosidade a 40 °C · óleo lubrificante dos TGs', un: 'cSt', dec: 1, per: 30 },
    { k: 'agua_tg', curto: 'Água no lubrificante dos TGs', rot: 'Água no óleo lubrificante dos TGs', un: 'ppm', dec: 0, per: 30 },
    { k: 'iso_hid', curto: 'Fluido hidráulico · ISO 4406', rot: 'Limpeza do fluido hidráulico (ISO 4406)', un: '', tipo: 'texto', per: 30 },
    { k: 'ph_resf', rot: 'pH da água de resfriamento', un: '', dec: 1, per: 7 },
    { k: 'cond_dess', curto: 'Condutividade · água dessalinizada', rot: 'Condutividade da água dessalinizada', un: 'µS/cm', dec: 0, per: 1 },
  ],
};
var CAMPO_PRONTO = null;   // vira o mapa CAMPO depois de montado (evita acessar a const antes da declaração)
function registrarCampoLab(coord, a) {
  const id = `lab.${coord}.${a.k}`;
  if (CAMPO_PRONTO ? CAMPO_PRONTO[id] : CAMPOS.some(c => c.id === id)) return;
  const c1 = { id, coord, grupo: LAB_GRUPO, rot: a.rot, tipo: a.tipo || 'num', un: a.un, dec: a.dec, lab: a }, c2 = { id: id + '.data', coord, grupo: LAB_GRUPO, rot: a.rot + ' · data do resultado', tipo: 'data', lab: a, labData: true };
  CAMPOS.push(c1, c2); if (CAMPO_PRONTO) { CAMPO_PRONTO[c1.id] = c1; CAMPO_PRONTO[c2.id] = c2; }
}
for (const [coord, ans] of Object.entries(LAB)) for (const a of ans) registrarCampoLab(coord, a);
/* D-65 · análises configuráveis por UEP (Configuração › Limites de especificação):
   CFG.labNovas = [{ coord, k, rot, un, dec, per }] (incluídas), CFG.labRemovidas = [ids] (excluídas da lista-base),
   CFG.labCfg = { [id]: { tela: bool (aparece no card da coordenação), corrente: '' | 'oleo' | 'gas' | 'agua' (entra no enquadramento) } } */
const CORRENTES = { oleo: 'Óleo', gas: 'Gás injetado', agua: 'Água injetada' };
function labLista(coord) {
  const rem = new Set(CFG.labRemovidas || []), novas = (CFG.labNovas || []).filter(a => a.coord === coord && a.k);
  for (const a of novas) registrarCampoLab(coord, a);
  return [...(LAB[coord] || []), ...novas.filter(n => !(LAB[coord] || []).some(b => b.k === n.k))].filter(a => !rem.has(`lab.${coord}.${a.k}`));
}
const labAtiva = id => { const [, coord, k] = id.split('.'); return labLista(coord).some(a => a.k === k); };
const labOpc = id => Object.assign({ tela: true, corrente: '' }, (CFG.labCfg || {})[id] || {});
/* resultado, data e atraso de cada análise da coordenação (atrasada = intervalo desde o resultado maior que a periodicidade) */
function labDe(E, coord, hojeIso = (typeof DIA !== 'undefined' ? DIA : isoData(new Date()))) {
  return labLista(coord).map(a => {
    const id = `lab.${coord}.${a.k}`, v = E.valores[id], d = E.valores[id + '.data'];
    const valor = v ? v.valor : null, data = d && /^\d{4}-\d{2}-\d{2}$/.test(d.valor || '') ? d.valor : null;
    const dias = data ? diffDias(hojeIso, data) : null;
    const lim = (CFG.limitesLab || {})[id] || {}, r = labSem(valor === '' ? null : valor, lim, a.tipo, a.dec);
    const o = labOpc(id);
    return { ...a, id, coord, valor: valor === '' ? null : valor, data, dias, atrasada: dias !== null && dias > a.per, origem: v?.origem || null, fonte: v?.fonte || '', em: v?.em || null, lim, sem: r.sem, limTxt: r.txt, tela: o.tela !== false, corrente: o.corrente || '' };
  });
}
/* D-65 · enquadramento da corrente (óleo, gás injetado, água injetada) = soma das análises marcadas para a corrente:
   uma fora da especificação → Desenquadrado; perto do limite, sem resultado ou com resultado atrasado → Atenção; todas dentro → Enquadrado.
   Análise sem limite definido não decide (fica listada como "sem limite"). */
const ENQ_ROT = { ok: 'Enquadrado', at: 'Atenção', nok: 'Desenquadrado', sd: 'Sem análise' };
function enquadramento(E, corrente, hoje = (typeof DIA !== 'undefined' ? DIA : isoData(new Date()))) {
  const itens = Object.keys(LAB).concat((CFG.labNovas || []).map(a => a.coord)).filter((c, i, a) => a.indexOf(c) === i).flatMap(c => labDe(E, c, hoje)).filter(a => a.corrente === corrente);
  const st = a => a.sem === null ? null : a.sem === 'nok' ? 'nok' : (a.sem === 'at' || a.sem === 'sd' || a.valor === null || a.atrasada) ? 'at' : 'ok';
  const sts = itens.map(st).filter(Boolean);
  const sem = !sts.length ? 'sd' : sts.includes('nok') ? 'nok' : sts.includes('at') ? 'at' : 'ok';
  const motivo = a => a.sem === 'nok' ? 'fora da especificação' : a.valor === null ? 'sem resultado' : a.atrasada ? `resultado atrasado (${a.dias} d)` : a.sem === 'at' ? 'perto do limite' : a.sem === null ? 'sem limite' : 'dentro';
  return { corrente, nome: CORRENTES[corrente], sem, rot: ENQ_ROT[sem], itens: itens.map(a => ({ ...a, st: st(a), motivo: motivo(a) })) };
}
/* D-61 (proposta 13): semáforo por faixa de especificação. Limites por parâmetro ficam na configuração da UEP (CFG.limitesLab),
   não no código; sem limite informado, não há semáforo (só a data). Atenção = dentro do limite, mas a menos de 10% da faixa dele. */
function labSem(valor, lim = {}, tipo = 'num', dec = 0) {
  const min = lim.min === '' || lim.min == null ? null : +lim.min, max = lim.max === '' || lim.max == null ? null : +lim.max;
  const f = v => { const t = String(v), d = t.includes('.') ? Math.min(t.split('.')[1].length, 2) : 0; return fmtN(v, d); };
  const txt = min != null && max != null ? `${f(min)} a ${f(max)}` : max != null ? `≤ ${f(max)}` : min != null ? `≥ ${f(min)}` : '';
  if (tipo === 'texto' || (min == null && max == null)) return { sem: null, txt };
  if (valor == null || isNaN(+valor)) return { sem: 'sd', txt };
  const v = +valor, faixa = min != null && max != null ? max - min : Math.abs(max != null ? max : min) || 1, folga = 0.1 * faixa;
  if ((max != null && v > max) || (min != null && v < min)) return { sem: 'nok', txt };
  if ((max != null && v > max - folga) || (min != null && v < min + folga)) return { sem: 'at', txt };
  return { sem: 'ok', txt };
}
/* Equipamentos da COPROD com status individual (D-53): uma linha por equipamento, com caixa de seleção do status.
   Captura: status informado na passagem de serviço pelo operador do posto que opera o equipamento.
   PREMISSA: grupos e unidades conforme D-31/D-32; posto de cada grupo a confirmar. Configurável por UEP aqui. */
const ST_EQ = ['Operando', 'Stand By', 'Em manutenção', 'Indisponível', 'Limitado'];
const ST_EQ_CLS = { 'Operando': 'eq-op', 'Stand By': 'eq-sb', 'Em manutenção': 'eq-mn', 'Indisponível': 'eq-in', 'Limitado': 'eq-lm' };   // prefixo próprio (R-05)
const EQUIP = [
  { id: 'gas', rot: 'Compressores de gás', posto: 'Gás', grupos: [['VRU', 'A B'], ['Main', 'A B C'], ['Injection', 'A B C'], ['CO2', 'A B']] },
  { id: 'recuperacao', rot: 'Recuperação de gás', posto: 'Gás', grupos: [['FGRU', 'A B C'], ['TGRU', 'A B'], ['SRGU', 'A B']] },
  { id: 'bombas', rot: 'Bombas de injeção de água', posto: 'Água', grupos: [['Booster', 'A B C'], ['Principal', 'A B C']] },
].map(e => ({ ...e, itens: e.grupos.flatMap(([g, us]) => us.split(' ').map(u => ({ id: `eq.${e.id}.${g.toLowerCase()}.${u.toLowerCase()}`, grupo: g, un: u, nome: `${g} ${u}` }))) }));
for (const e of EQUIP) for (const it of e.itens) CAMPOS.push({ id: it.id, coord: 'COPROD', grupo: e.rot, rot: it.nome, tipo: 'opcao', opcoes: ST_EQ, equip: e.id });
CAMPOS.sort((a, b) => (a.lab ? 1 : 0) - (b.lab ? 1 : 0));   // análises de laboratório por último na aba (ordenação estável)
/* status atual dos equipamentos de um conjunto, por grupo: [{ grupo, itens: [{ un, nome, status }] }] */
function equipDe(E, conj) {
  const e = EQUIP.find(x => x.id === conj); if (!e) return [];
  return e.grupos.map(([g]) => ({ grupo: g, itens: e.itens.filter(i => i.grupo === g).map(i => ({ ...i, status: E.valores[i.id]?.valor || '' })) }));
}
const CAMPO = Object.fromEntries(CAMPOS.map(c => [c.id, c]));
CAMPO_PRONTO = CAMPO;

/* ---- campos de lista (substituídos inteiros a cada edição) ---- */
/* D-62 (proposta 1): classificação dos eventos de segurança de processo (API RP 754). Tier 1/2 = perda de contenção com consequência;
   Tier 3 = demanda a sistema de segurança (PSV, ESD, F&G) ou excursão de limite seguro; Tier 4 = barreira degradada / falha de teste. */
/* D-63 (proposta 8): sistemas da perda de produção ("deferimento"; lista fechada, PREMISSA) */
const SISTEMAS_DEF = ['Planta de processo', 'Poços e subsea', 'Escoamento / offloading', 'Restrição externa / mercado', 'Manutenção programada', 'Utilidades', 'Outros'];
const TIERS = ['Tier 1', 'Tier 2', 'Tier 3 · demanda a sistema de segurança', 'Tier 4 · barreira degradada'];
/* D-61 (proposta 10): classe da queima. Rotina = purga, gás de assistência, piloto; Extraordinária = emergência, parada de compressor, teste acima do previsto. */
const QUEIMA_CLASSES = ['Rotina', 'Extraordinária'];
const classeQueima = c => c.classe || (c.evitavel === 'sim' ? 'Extraordinária' : 'Rotina');   // sem classe informada: evitável = extraordinária
const ST_SIS = ['Disponível', 'Operando', 'Limitado', 'Atenção', 'Indisponível', 'Inoperante', 'Sem reserva', 'Em manutenção', 'Stand-by', 'A preencher'];
const LISTAS = [
  { id: 'pocos', coord: 'COPROD', rot: 'Poços · últimas 24 h', validar: validarTrens, cols: [{ k: 'poco', rot: 'Poço (BUZ-XXX)', tipo: 'texto' }, { k: 'tipo', rot: 'Tipo', tipo: 'opcao', opcoes: ['produtor', 'inj_agua', 'inj_gas'], nomes: { produtor: 'Produtor', inj_agua: 'Injetor de água', inj_gas: 'Injetor de gás' } }, { k: 'status', rot: 'Situação nas 24 h', tipo: 'opcao', opcoes: ['aberto', 'reaberto', 'fechado'], nomes: { aberto: 'Aberto 24 h', reaberto: 'Reaberto', fechado: 'Fechado agora' } }, { k: 'trem', rot: 'Trem (produtor)', tipo: 'opcao', opcoes: ['', 'A', 'B', 'Teste'], nomes: { '': '—', A: 'Trem A', B: 'Trem B', Teste: 'Trem de teste' } }, { k: 'ultimo_teste', rot: 'Último teste de vazão', tipo: 'data' }, { k: 'potencial', rot: 'Potencial (m³/d)', tipo: 'num' }, { k: 'vazao', rot: 'Vazão estimada D-1 (m³/d)', tipo: 'num' }] },   // D-63 (proposta 9): potencial × vazão por poço
  { id: 'pocos.operacoes', coord: 'COPROD', rot: 'Operações em poços (manobras, procedimentos e operações)', cols: [{ k: 'poco', rot: 'Poço (BUZ-XXX)', tipo: 'texto' }, { k: 'operacao', rot: 'Descrição', tipo: 'texto' }, { k: 'tipo', rot: 'Tipo', tipo: 'opcao', opcoes: ['Operação', 'Manobra', 'Procedimento'] }, { k: 'situacao', rot: 'Situação', tipo: 'opcao', opcoes: ['Prevista', 'Em curso', 'Realizada'] }, { k: 'data', rot: 'Data (início)', tipo: 'data' }, { k: 'apoio', rot: 'Apoio', tipo: 'opcao', opcoes: ['—', 'Embarcação', 'ROV', 'Embarcação + ROV'] }, { k: 'demandante', rot: 'Demandante', tipo: 'texto' }, { k: 'obs', rot: 'Observação / impacto', tipo: 'texto' }] },
  { id: 'cilindros', coord: 'COPROD', rot: 'Cilindros de amostra a bordo', cols: [{ k: 'tipo', rot: 'Tipo', tipo: 'opcao', opcoes: ['gas', 'pvt'], nomes: { gas: 'Amostra de gás pressurizado', pvt: 'PVT · petróleo pressurizado' } }, { k: 'serie', rot: 'Nº de série', tipo: 'texto' }, { k: 'chegada', rot: 'Chegada a bordo', tipo: 'data' }, { k: 'situacao', rot: 'Situação', tipo: 'opcao', opcoes: ['Disponível', 'Coletado'] }] },
  { id: 'queima.eventos', coord: 'COPROD', rot: 'Últimas 24 h · maiores queimas (até 2)', max: 2, cols: [{ k: 'evento', rot: 'Evento', tipo: 'texto' }, { k: 'flare', rot: 'Flare', tipo: 'opcao', opcoes: ['HP', 'LP'] }, { k: 'volume', rot: 'Volume (Mm³)', tipo: 'num', dec: 1 }] },
  { id: 'queima.causas', coord: 'COPROD', rot: 'Queima projetada D por causa', cols: [{ k: 'causa', rot: 'Causa', tipo: 'texto' }, { k: 'valor', rot: 'Mm³/d', tipo: 'num' }, { k: 'evitavel', rot: 'Evitável', tipo: 'opcao', opcoes: ['sim', 'não'] }, { k: 'classe', rot: 'Classe', tipo: 'opcao', opcoes: QUEIMA_CLASSES }, { k: 'equipamento', rot: 'Equipamento indisponível (se houver)', tipo: 'texto' }] },   // D-63 (proposta 15)
  { id: 'queima.manobras', coord: 'COPROD', rot: 'Manobras previstas com queima estimada', cols: [{ k: 'manobra', rot: 'Manobra', tipo: 'texto' }, { k: 'data', rot: 'Data prevista', tipo: 'data' }, { k: 'queima', rot: 'Queima estimada (Mm³)', tipo: 'num', dec: 1 }, { k: 'situacao', rot: 'Situação', tipo: 'opcao', opcoes: ['Prevista', 'Realizada', 'Cancelada'] }] },   // D-63 (proposta 11)
  { id: 'oleo.deferimento', coord: 'COPROD', rot: 'Perda de produção D-1 · por causa e sistema', cols: [{ k: 'causa', rot: 'Causa', tipo: 'texto' }, { k: 'sistema', rot: 'Sistema', tipo: 'opcao', opcoes: SISTEMAS_DEF }, { k: 'volume', rot: 'Volume (m³/d)', tipo: 'num' }, { k: 'obs', rot: 'Observação', tipo: 'texto' }] },   // D-63 (proposta 8)
  { id: 'tq.atencao', coord: 'COEMB', rot: 'Tanques em atenção', cols: [{ k: 'tanque', rot: 'Tanque', tipo: 'texto' }, { k: 'nota', rot: 'Situação', tipo: 'texto' }, { k: 'status', rot: 'Status', tipo: 'opcao', opcoes: ST_SIS }] },
  { id: 'util', coord: 'COEMB', rot: 'Utilidades · estoque × mínimo', cols: [{ k: 'nome', rot: 'Utilidade', tipo: 'texto' }, { k: 'estoque', rot: 'Estoque (m³)', tipo: 'num' }, { k: 'minimo', rot: 'Mínimo (m³)', tipo: 'num' }, { k: 'consumo', rot: 'Consumo (m³/d)', tipo: 'num' }, { k: 'producao', rot: 'Produção (m³/d)', tipo: 'num' }] },
  { id: 'ger.tgs', coord: 'COMAN', rot: 'Turbogeradores', cols: [{ k: 'tg', rot: 'TG', tipo: 'texto' }, { k: 'status', rot: 'Status', tipo: 'opcao', opcoes: ['Operando', 'Stand-by', 'Indisponível', 'Em manutenção'] }, { k: 'linha1', rot: 'Combustível · carga · limitador', tipo: 'texto' }, { k: 'linha2', rot: 'WHRU / observação', tipo: 'texto' }, { k: 'alerta', rot: 'Destacar observação', tipo: 'opcao', opcoes: ['não', 'sim'] }] },
  { id: 'ger.aux', coord: 'COMAN', rot: 'Emergência e auxiliares', cols: [{ k: 'nome', rot: 'Equipamento', tipo: 'texto' }, { k: 'status', rot: 'Status', tipo: 'opcao', opcoes: ['Operacional', 'Operacionais', 'Indisponível', 'Em manutenção'] }] },
  { id: 'man.ind', coord: 'COMAN', rot: 'Indicadores de manutenção', cols: [{ k: 'ind', rot: 'Indicador', tipo: 'texto' }, { k: 'valor', rot: 'Valor (%)', tipo: 'num', dec: 1 }, { k: 'meta', rot: 'Meta (%) · vazio = meta da UEP (Configuração)', tipo: 'num', dec: 1 }] },
  { id: 'legais', coord: 'COMAN', rot: 'Órgãos legais e suprimentos', cols: [{ k: 'item', rot: 'Item', tipo: 'texto' }, { k: 'status', rot: 'Status', tipo: 'opcao', opcoes: ST_SIS }] },
  /* D-62 · onda 2 das propostas (listas com captura simulada até as integrações; PREMISSA: campos a validar com cada coordenação) */
  { id: 'sms.eventos', coord: 'GEPLAT', rot: 'Segurança de processo · eventos das 24 h', cols: [{ k: 'evento', rot: 'Evento', tipo: 'texto' }, { k: 'tier', rot: 'Classificação (API RP 754)', tipo: 'opcao', opcoes: TIERS }, { k: 'sistema', rot: 'Sistema / TAG', tipo: 'texto' }, { k: 'hora', rot: 'Hora', tipo: 'texto' }, { k: 'situacao', rot: 'Situação', tipo: 'opcao', opcoes: ['Em tratamento', 'Investigação aberta', 'Encerrado'] }] },
  { id: 'sms.inibicoes', coord: 'GEPLAT', rot: 'Inibições e bypass de funções de segurança ativos', cols: [{ k: 'funcao', rot: 'Função de segurança', tipo: 'texto' }, { k: 'tag', rot: 'TAG', tipo: 'texto' }, { k: 'tipo', rot: 'Tipo', tipo: 'opcao', opcoes: ['Inibição', 'Bypass'] }, { k: 'desde', rot: 'Desde', tipo: 'data' }, { k: 'responsavel', rot: 'Responsável', tipo: 'texto' }, { k: 'motivo', rot: 'Motivo / medida compensatória', tipo: 'texto' }, { k: 'previsao', rot: 'Previsão de retirada', tipo: 'data' }] },
  { id: 'man.criticas', coord: 'COMAN', rot: 'Itens de segurança crítica · preventivas e testes (SIS, F&G, dilúvio, ESD)', cols: [{ k: 'item', rot: 'Item', tipo: 'texto' }, { k: 'tag', rot: 'TAG', tipo: 'texto' }, { k: 'tipo', rot: 'Tipo', tipo: 'opcao', opcoes: ['Preventiva', 'Teste de SIS', 'Teste de F&G', 'Teste de dilúvio', 'Teste de ESD', 'Inspeção'] }, { k: 'vencimento', rot: 'Vencimento', tipo: 'data' }, { k: 'situacao', rot: 'Situação', tipo: 'opcao', opcoes: ['Programada', 'Executada', 'Adiada'] }] },
  { id: 'man.pecas', coord: 'COMAN', rot: 'Peças críticas em falta (travam ordem de manutenção)', cols: [{ k: 'peca', rot: 'Peça / material', tipo: 'texto' }, { k: 'equipamento', rot: 'Equipamento', tipo: 'texto' }, { k: 'om', rot: 'OM', tipo: 'texto' }, { k: 'situacao', rot: 'Situação', tipo: 'opcao', opcoes: ['Em falta', 'Em trânsito', 'Recebida'] }, { k: 'previsao', rot: 'Previsão de chegada', tipo: 'data' }, { k: 'impacto', rot: 'Impacto', tipo: 'texto' }] },
  { id: 'insp.integridade', coord: 'COEMB', rot: 'Inspeções de integridade (tanques, casco, amarração, turret)', cols: [{ k: 'item', rot: 'Item', tipo: 'texto' }, { k: 'tipo', rot: 'Inspeção', tipo: 'texto' }, { k: 'ultima', rot: 'Última', tipo: 'data' }, { k: 'proxima', rot: 'Próxima / vencimento', tipo: 'data' }, { k: 'situacao', rot: 'Situação', tipo: 'opcao', opcoes: ['Programada', 'Executada', 'Adiada'] }] },
];
/* Equipamentos e Sistemas · PFCEO (Painel de Funções Críticas para Eficiência Operacional, 02_Glossario).
   Dimensões de status do Portal: Disponibilidade, Condição e Situação. Editado na aba PFCEO da curadoria. */
const PF_DISP = ['Indisponível', 'Disponível com Restrição', 'Indefinido', 'Disponível'];
const PF_COND = ['Crítico', 'Atenção', 'Pré-Atenção', 'Indefinido', 'Normal'];
const PF_SIT = ['Ligado', 'Desligado', 'Indefinido'];
for (const c of ['COPROD', 'COEMB', 'COMAN']) LISTAS.push({ id: 'pfceo.' + c, coord: c, aba: 'pfceo', rot: 'Equipamentos e Sistemas · PFCEO (dados)', cols: [{ k: 'funcao', rot: 'Função crítica / sistema', tipo: 'texto' }, { k: 'tag', rot: 'TAG', tipo: 'texto' }, { k: 'redundancia', rot: 'Redundância (ex.: 3×66%)', tipo: 'texto' }, { k: 'unidades', rot: 'Unidades', tipo: 'num' }, { k: 'disponiveis', rot: 'Disponíveis', tipo: 'num' }, { k: 'disponibilidade', rot: 'Disponibilidade', tipo: 'opcao', opcoes: PF_DISP }, { k: 'condicao', rot: 'Condição', tipo: 'opcao', opcoes: PF_COND }, { k: 'situacao', rot: 'Situação', tipo: 'opcao', opcoes: PF_SIT }, { k: 'nota', rot: 'Nota', tipo: 'texto' }, { k: 'nm', rot: 'NM SAP', tipo: 'texto' }, { k: 'seguranca', rot: 'Sistema de segurança', tipo: 'opcao', opcoes: ['não', 'sim'] }] });
const LISTA = Object.fromEntries(LISTAS.map(l => [l.id, l]));
/* Preenchimento manual (D-46): itens sem captura automática ganham aba própria no menu da curadoria.
   [id da aba, rótulo do menu, campos, listas, onde aparece na apresentação] */
const MANUAIS = {
  GEPLAT: [['m-situacao', 'Situação da unidade', ['geplat.situacao', 'geplat.situacao_sem'], [], ['#/apresentacao/1', 'Abertura · Situação da unidade']]],
  COPROD: [
    ['m-pocos', 'Poços e testes de vazão', ['teste.proximo', 'teste.previsao'], ['pocos'], ['#/apresentacao/2/pocos', 'COPROD · Poços (card e detalhe)']],
    ['m-operacoes', 'Operações em poços', [], ['pocos.operacoes'], ['#/apresentacao/2/pocos', 'COPROD · detalhe de Poços · Operações']],
    ['m-cilindros', 'Cilindros de amostra', [], ['cilindros'], ['#/apresentacao/2/pocos', 'COPROD · detalhe de Poços · Cilindros']],
  ],
  COEMB: [
    ['m-navio', 'Navio aliviador', ['off.navio', 'off.navio_ok'], [], ['#/apresentacao/3/indicadores', 'COEMB · Indicadores (tancagem e offloading)']],
    ['m-tanques', 'Tanques em atenção', [], ['tq.atencao'], ['#/apresentacao/3/tanques', 'COEMB · Tanques em atenção']],
  ],
  COMAN: [
    ['m-manutencao', 'Indicadores de manutenção', ['man.ref', 'man.notas_if6', 'man.sensores'], ['man.ind'], ['#/apresentacao/4/indicadores', 'COMAN · Indicadores']],
    ['m-legais', 'Órgãos legais e suprimentos', [], ['legais'], ['#/apresentacao/4/legais', 'COMAN · Órgãos legais e suprimentos']],
  ],
};
const MANUAL_IDS = new Set(Object.values(MANUAIS).flatMap(a => a.flatMap(([, , c, l]) => [...c, ...l])));

/* trens de produção: A (até 5 poços), B (até 5) e teste (1); só produtores */
const TRENS = [['A', 'Trem A', 5], ['B', 'Trem B', 5], ['Teste', 'Trem de teste', 1]];
function validarTrens(itens) {
  const n = { A: 0, B: 0, Teste: 0 };
  for (const p of itens) {
    if (!p.trem) continue;
    if (p.tipo !== 'produtor') return `${p.poco || 'Poço'}: só poço produtor é alinhado a trem.`;
    n[p.trem]++;
  }
  for (const [k, nome, max] of TRENS) if (n[k] > max) return `${nome} aceita até ${max} poço${max > 1 ? 's' : ''} (${n[k]} informados).`;
  return null;
}

const PF = {
  semDisp: d => ({ 'Indisponível': 'nok', 'Disponível com Restrição': 'at', 'Disponível': 'ok' }[d] || 'sd'),
  semCond: c => ({ 'Crítico': 'nok', 'Atenção': 'at', 'Pré-Atenção': 'at', 'Normal': 'ok' }[c] || 'sd'),
  curto: d => ({ 'Disponível com Restrição': 'Com restrição' }[d] || d || 'Sem dado'),
  /* desvio: qualquer estado diferente de disponível com condição normal (ligado ou desligado) */
  desvio: i => i.disponibilidade !== 'Disponível' || (i.condicao && i.condicao !== 'Normal'),
  chave: i => (String(i.funcao || '').trim() + '|' + String(i.tag || '').trim()).toLowerCase(),
  seguranca: i => i.seguranca === 'sim',   // D-61 (proposta 22): barreira de segurança (SIS, F&G, dilúvio, ESD, geração de emergência) · sempre na tela, primeiro
  margem: i => (+i.unidades > 0 && i.disponiveis !== null && i.disponiveis !== '' && !isNaN(+i.disponiveis)) ? +i.disponiveis / +i.unidades : 1,
  /* piores primeiro: disponibilidade, depois condição, depois menor margem de redundância */
  ordem: (a, b) => (PF.seguranca(b) - PF.seguranca(a)) || (PF_DISP.indexOf(a.disponibilidade) + 9) % 9 - (PF_DISP.indexOf(b.disponibilidade) + 9) % 9 || (PF_COND.indexOf(a.condicao) + 9) % 9 - (PF_COND.indexOf(b.condicao) + 9) % 9 || PF.margem(a) - PF.margem(b) || String(a.funcao).localeCompare(String(b.funcao)),
};

/* ---- status textual -> semáforo ---- */
function semDeStatus(s) {
  const t = String(s || '').toLowerCase();
  if (/indispon|inoperante|sem reserva|n[aã]o ok/.test(t)) return 'nok';
  if (/limitad|aten|reabert/.test(t)) return 'at';
  if (/dispon|operando|operaciona|confirmad|^ok/.test(t)) return 'ok';
  return 'sd';
}
const SEM_NOME = { ok: 'OK', at: 'Atenção', nok: 'Não OK', sd: 'Sem dado' };

/* ---- regras de semáforo v0 (30_Modelo; limiares em CFG.limiares) ---- */
const Regras = {
  efop(real, pot) {
    if (real == null || !pot) return { sem: 'sd', motivo: 'Sem dado' };   // R-04: produção 0 é dado (Não OK), não “sem dado”
    const p = real / pot * 100, L = CFG.limiares.efop;
    return { sem: p >= L.ok ? 'ok' : p >= L.at ? 'at' : 'nok', pct: p, motivo: `EFOP ${fmtN(p, 1)}%` };
  },
  iuga(real, meta) {
    if (real == null || meta == null) return { sem: 'sd', motivo: 'Sem dado' };
    const d = real - meta, f = CFG.limiares.iugaFaixaAtencao;
    return { sem: d >= 0 ? 'ok' : d >= -f ? 'at' : 'nok', desvio: d, motivo: `${d >= 0 ? '+' : '−'}${fmtN(Math.abs(d), 2)} p.p. da meta` };
  },
  injecao(real, meta) {
    if (real == null || !meta) return { sem: 'sd', motivo: 'Sem dado' };
    const p = real / meta * 100, L = CFG.limiares.injecao;
    return { sem: p >= L.ok ? 'ok' : p >= L.at ? 'at' : 'nok', pct: p, motivo: `${fmtN(p, 1)}% da meta` };
  },
  utilidade(u) {
    if (!u || !u.minimo) return { sem: 'sd', motivo: 'Sem dado' };
    const L = CFG.limiares.utilidades, p = u.estoque / u.minimo * 100;
    let sem = p > L.ok ? 'ok' : p >= L.at ? 'at' : 'nok';
    let dias = null;
    const queda = (+u.consumo || 0) - (+u.producao || 0);
    if (queda > 0) { dias = (u.estoque - u.minimo) / queda; if (sem === 'ok' && dias <= L.diasAtencao) sem = 'at'; }
    return { sem, pct: p, queda, dias };
  },
  manutencao(valor, meta) {
    if (valor == null || meta == null) return 'sd';
    const d = valor - meta; return d >= 0 ? 'ok' : d >= -CFG.limiares.manutencaoFaixaAtencao ? 'at' : 'nok';
  },
  demanda(prazo, status, hojeIso) {
    if (status === 'encerrada') return 'enc';
    if (!prazo) return 'ok';
    const d = diffDias(prazo, hojeIso);
    return d < 0 ? 'vencida' : d === 0 ? 'vence24' : 'prazo';
  },
};

/* ======================================================================
   Reconstrução do estado a partir dos registros (event sourcing simples)
   ====================================================================== */
function construirEstado(regs, demRegs, hojeIso) {
  const E = {
    valores: {}, listas: {}, sugestoes: [], servicos: [], servicosOcultos: [], itens: [], demandas: [], comentarios: {},
    congelamento: null, reaberturas: [], atas: [], aceites: [], redia: null, acordos: [], anexos: [], hist: {}, ultimaAlteracao: null, conclusoes: {}, notificacoes: [], selecoes: {}, reuniao: [],
  };
  const porId = new Map(), removidos = new Set(), atualizacoes = [], decisoes = [];
  const todos = [...regs, ...demRegs].sort(ordem);
  for (const r of todos) {
    E.ultimaAlteracao = r.criadoEm;
    switch (r.tipo) {
      case 'remove': removidos.add(r.payload.alvo); break;
      case 'atualiza': atualizacoes.push(r); break;
      case 'valor': E.valores[r.payload.campo] = { ...r.payload, autor: r.autor, em: r.criadoEm, id: r.id }; (E.hist[r.payload.campo] ||= []).push(r); break;
      case 'lista': E.listas[r.payload.campo] = { ...r.payload, autor: r.autor, em: r.criadoEm, id: r.id }; break;
      case 'comentario': (E.comentarios[r.payload.alvo] ||= []).push(r); break;
      case 'congelamento': E.congelamento = r; break;
      case 'reabertura': E.reaberturas.push(r); E.congelamento = null; break;   // registros já vêm em ordem de gravação (R-01)
      case 'ata': E.atas.push(r); break;
      case 'aceite': E.aceites.push(r); break;
      case 'redia': if (!E.redia) E.redia = r; break;   // D-67: a primeira vale (a base garante uma por dia)
      case 'acordo': E.acordos.push(r); break;
      case 'conclusao': E.conclusoes[r.payload.coord] = r; break;
      case 'notificacao': E.notificacoes.push(r); break;
      case 'selecao': E.selecoes[r.payload.campo + ':' + r.payload.coord] = r; break;
      case 'anexo': E.anexos.push(r); break;
      case 'decisao': decisoes.push(r); break;
      default: porId.set(r.id, { ...r, payload: { ...r.payload }, _decisoes: [] });
    }
  }
  for (const d of decisoes) porId.get(d.payload.alvo)?._decisoes.push(d);
  for (const u of atualizacoes) {
    const alvo = porId.get(u.payload.alvo); if (!alvo) continue;
    Object.assign(alvo.payload, u.payload.campos); alvo.atualizadoEm = u.criadoEm; alvo.atualizadoPor = u.autor;
  }
  for (const r of porId.values()) {
    if (removidos.has(r.id)) { if (r.tipo === 'servico') E.servicosOcultos.push(r); continue; }
    if (r.tipo === 'sugestao') { r.decisao = r._decisoes.length ? r._decisoes[r._decisoes.length - 1] : null; E.sugestoes.push(r); }
    else if (r.tipo === 'servico') E.servicos.push(r);
    else if (r.tipo === 'item') E.itens.push(r);
    else if (r.tipo === 'reuniao') E.reuniao.push(r);
    else if (r.tipo === 'demanda') { r.situacao = Regras.demanda(r.payload.prazo, r.payload.status, hojeIso); E.demandas.push(r); }
  }
  E.servicos.sort((a, b) => (a.payload.ordem ?? 0) - (b.payload.ordem ?? 0) || ordem(a, b));
  E.itens.sort((a, b) => (a.payload.ordem ?? 0) - (b.payload.ordem ?? 0) || ordem(a, b));
  return E;
}
/* D-67 · responsáveis pelo "de acordo" da ata (mesma regra da função redia_responsaveis da base): por coordenação, quem concluiu o
   preenchimento ou, sem conclusão, a última alteração de curadoria da coordenação no dia; registros de exemplo não contam.
   Coordenação sem participação não precisa dar o de acordo; o GEPLAT, sempre (sem participante: qualquer usuário do GEPLAT). */
const TIPOS_CURADORIA = ['conclusao', 'decisao', 'item', 'selecao', 'servico', 'valor', 'lista', 'remove'];
function responsaveisDe(regsDia) {
  const regs = regsDia.filter(r => r.escopo !== 'demandas' && TIPOS_CURADORIA.includes(r.tipo) && r.payload?.coord && !r.payload.exemplo).sort(ordem);
  return COORDS.map(coord => {
    const c = regs.filter(r => r.payload.coord === coord), conc = c.filter(r => r.tipo === 'conclusao' && r.payload.concluido), x = conc[conc.length - 1] || c[c.length - 1];
    return x ? { coord, chave: x.autor?.chave || null, nome: x.autor?.nome || '' } : coord === 'GEPLAT' ? { coord, chave: null, nome: '' } : null;
  }).filter(Boolean);
}
function faltaAcordo(regsDia) {
  const ord = regsDia.slice().sort(ordem), pauta = ord.filter(x => x.tipo === 'congelamento' || x.tipo === 'reabertura'), cong = pauta[pauta.length - 1];
  const depois = cong && cong.tipo === 'congelamento' ? ord.slice(ord.indexOf(cong) + 1) : [];
  return responsaveisDe(ord).filter(rp => !depois.some(a => a.tipo === 'acordo' && a.payload.coord === rp.coord && (!rp.chave || a.autor?.chave === rp.chave)));
}
/* getters */
function V(E, campo) { const v = E.valores[campo]; return v ? v.valor : null; }
function VN(E, campo) { const v = V(E, campo); return v === null || v === '' || isNaN(+v) ? null : +v; }
function L(E, campo) { return E.listas[campo]?.itens || []; }
function aprovados(E, coord) {
  return E.sugestoes.filter(s => s.payload.coord === coord && s.decisao?.payload.acao === 'aprovar')
    .sort((a, b) => ['nok', 'at', 'ok', 'sd'].indexOf(a.decisao.payload.semaforo) - ['nok', 'at', 'ok', 'sd'].indexOf(b.decisao.payload.semaforo));
}
function pendentes(E, coord) { return E.sugestoes.filter(s => s.payload.coord === coord && !s.payload.somenteLeitura && (!s.decisao || s.decisao.payload.acao === 'reabrir')); }
function atividadesAbertura(E, coord) { return E.servicos.filter(s => s.payload.coord === coord && s.payload.abertura).slice(0, CFG.atividadesMax); }
/* Destaques da coordenação: sugestões aprovadas (PS) + itens criados pelo coordenador (C).
   abertura = o coordenador classificou como muito importante → vai para a tela de abertura (GEPLAT).
   Para o GEPLAT, todo destaque aprovado vai para a abertura (é o bloco dele). */
const ORD_SEM = ['nok', 'at', 'ok', 'sd'];
function destaquesDe(E, coord) {
  const ps = aprovados(E, coord).map(s => { const d = s.decisao.payload, p = s.payload; return { id: s.id, tipo: 'sugestao', fonte: 'PS', coord, titulo: d.titulo, tag: d.tag || p.tag || '', status: d.status, semaforo: d.semaforo || 'at', impacto: d.impacto, pedido: d.pedido, abertura: coord === 'GEPLAT' || !!d.abertura, escalar: !!d.escalar, seguranca: ehSeguranca(d.categoria || p.categoria, d.impacto), meta: `${p.turno} · ${p.passagem}${p.dataPassagem && p.dataPassagem !== s.data ? ' (' + ddmm(p.dataPassagem) + ')' : ''}`, por: s.decisao.autor, em: s.decisao.criadoEm, ref: s }; });
  const cc = itensDe(E, coord, 'destaque').map(i => { const p = i.payload; return { id: i.id, tipo: 'item', fonte: 'C', coord, titulo: p.texto, tag: p.tag || '', status: p.status, semaforo: p.semaforo || 'at', impacto: p.impacto, pedido: p.pedido, abertura: coord === 'GEPLAT' || !!p.abertura, escalar: !!p.escalar, seguranca: ehSeguranca(p.categoria, p.impacto), meta: 'coordenação', por: i.atualizadoPor || i.autor, em: i.atualizadoEm || i.criadoEm, ref: i }; });
  /* D-61: ordem da agenda fixa — escalonamento (7) e segurança (27) primeiro; depois semáforo e abertura */
  return [...ps, ...cc].sort((a, b) => (b.escalar - a.escalar) || (b.seguranca - a.seguranca) || ORD_SEM.indexOf(a.semaforo) - ORD_SEM.indexOf(b.semaforo) || (b.abertura - a.abertura));
}
const ehSeguranca = (categoria, impacto) => /seguran/i.test(String(categoria || '')) || /seguran/i.test(String(impacto || ''));
function escalados(E) { return COORDS.flatMap(c => destaquesDe(E, c).filter(d => d.escalar)); }
function destaquesAbertura(E, coord) { return destaquesDe(E, coord).filter(d => d.abertura); }
/* Conclusão do preenchimento por coordenação e notificações do GEPLAT */
function concluida(E, coord) { const c = E.conclusoes[coord]; return c && c.payload.concluido ? c : null; }
function naoConcluidas(E) { return COORDS.filter(c => !concluida(E, c)); }
function notificacoesAbertas(E, coord) { const c = E.conclusoes[coord]; return E.notificacoes.filter(n => n.payload.coord === coord && (!c || chaveOrdem(n) > chaveOrdem(c)) && !concluida(E, coord)); }
/* PFCEO: lista da coordenação em ordem de pior disponibilidade e seleção do coordenador para a tela.
   Sem seleção registrada no dia, a tela usa a seleção automática (indisponíveis e com restrição). */
/* Operações em poços (D-44): em curso primeiro, depois previstas (data mais próxima) e realizadas (mais recente) */
const ORD_OP = { 'Em curso': 0, 'Prevista': 1, 'Realizada': 2 };
function operacoesPocos(E) {
  return L(E, 'pocos.operacoes').slice().sort((a, b) => (ORD_OP[a.situacao] ?? 3) - (ORD_OP[b.situacao] ?? 3)
    || (a.situacao === 'Realizada' ? String(b.data || '').localeCompare(String(a.data || '')) : String(a.data || '9').localeCompare(String(b.data || '9'))));
}
function pfceoDe(E, coord) { return L(E, 'pfceo.' + coord).slice().sort(PF.ordem); }
/* D-54: lista de entrada do PFCEO, piores primeiro até o estado normal (disponível e condição normal, operando ou parado).
   Com desvio = já aprovado para a tela PFCEO da coordenação (o coordenador pode retirar);
   normal = fora da tela, salvo se o coordenador incluir. Até 2 por coordenação vão para a abertura do GEPLAT.
   Seleção gravada: { fora: [chaves com desvio retiradas], extra: [chaves normais incluídas], abertura: [até 2 chaves] }. */
const PF_ABERTURA_MAX = 2;
function pfceoSelecao(E, coord) {
  const todos = pfceoDe(E, coord), r0 = E.selecoes['pfceo:' + coord];
  const reg = r0 && (r0.payload.fora || r0.payload.extra || r0.payload.abertura) ? r0 : null;   // seleção antiga (lista de ids) é ignorada
  const fora = new Set(reg?.payload.fora || []), extra = new Set(reg?.payload.extra || []), ab = new Set(reg?.payload.abertura || []);
  const naTela = i => PF.seguranca(i) || (PF.desvio(i) ? !fora.has(PF.chave(i)) : extra.has(PF.chave(i)));
  return { todos, itens: todos.filter(naTela), naTela, seguranca: todos.filter(PF.seguranca), abertura: todos.filter(i => ab.has(PF.chave(i))).slice(0, PF_ABERTURA_MAX), sugerida: !reg, reg, fora: [...fora], extra: [...extra], ab: [...ab] };
}
/* Acumulados do mês (D-43): o sistema soma, dia a dia, o gás produzido D-1 e a queima D-1 do SITOP gravados em cada REDIA do mês.
   A REDIA do dia x traz os valores de x-1; por isso a soma vai da REDIA do dia 2 até a REDIA do dia (a do dia 1 traz o mês anterior). */
const CAMPOS_MES = ['gas.prod_d1', 'queima.real_d1'];
/* D-61 (proposta 4): tendência de 7 dias dos indicadores da abertura, com os registros já gravados nas REDIAs anteriores.
   A REDIA do dia x traz o realizado de x−1: a série vai da REDIA de D-6 à de D (7 pontos = realizados de D-7 a D-1). */
const CAMPOS_TENDENCIA = ['oleo.real', 'iuga.real', 'gas.real', 'agua.real', 'queima.real_d1'];
const CAMPOS_HISTORICO = [...new Set([...CAMPOS_MES, ...CAMPOS_TENDENCIA, 'queima.causas', 'oleo.deferimento'])];   // + deferimento (Pareto do mês, D-63)   // o que redia_carregar traz dos dias anteriores
const TENDENCIA_DIAS = 7;
function tendencias(iso, regsDoDia, n = TENDENCIA_DIAS) {
  const num = v => (v === null || v === undefined || v === '' || isNaN(+v)) ? null : +v, out = {};
  for (const c of CAMPOS_TENDENCIA) out[c] = [];
  for (let k = n - 1; k >= 0; k--) {
    const dia = addDias(iso, -k), v = {};
    for (const r of regsDoDia(dia)) if (r.tipo === 'valor' && CAMPOS_TENDENCIA.includes(r.payload.campo)) v[r.payload.campo] = r.payload.valor;
    for (const c of CAMPOS_TENDENCIA) out[c].push({ redia: dia, ref: addDias(dia, -1), valor: num(v[c]) });
  }
  return out;
}
/* D-61 (proposta 10): queima do mês por classe (rotina × extraordinária), somando as listas "queima projetada D por causa" de cada REDIA do mês (Mm³/d → m³) */
function acumuladoClasses(iso, regsDoDia) {
  const d = parseData(iso), out = { Rotina: 0, 'Extraordinária': 0, dias: 0 };
  for (let x = 1; x <= d.getDate(); x++) {
    const dia = iso.slice(0, 8) + pad(x); let lista = null;
    for (const r of regsDoDia(dia)) if (r.tipo === 'lista' && r.payload.campo === 'queima.causas') lista = r.payload.itens;
    if (!lista) continue;
    out.dias++;
    for (const c of lista) out[classeQueima(c)] += (+c.valor || 0) * 1000;
  }
  return out;
}
function acumuladoMes(iso, regsDoDia) {
  const d = parseData(iso), dias = [], faltam = [];
  let gas = 0, queima = 0, nG = 0, nQ = 0;
  const num = v => (v === null || v === undefined || v === '' || isNaN(+v)) ? null : +v;
  for (let x = 2; x <= d.getDate(); x++) {
    const dia = iso.slice(0, 8) + pad(x), v = {};
    for (const r of regsDoDia(dia)) if (r.tipo === 'valor' && CAMPOS_MES.includes(r.payload.campo)) v[r.payload.campo] = r.payload.valor;   // em ordem de gravação: o último vale
    const g = num(v['gas.prod_d1']), q = num(v['queima.real_d1']);
    dias.push({ redia: dia, ref: addDias(dia, -1), gas: g, queima: q });
    if (g == null || q == null) faltam.push(addDias(dia, -1));
    if (g != null) { gas += g; nG++; }
    if (q != null) { queima += q; nQ++; }
  }
  return { gas: nG ? gas : null, queima: nQ ? queima : null, n: dias.length, dias, faltam };
}
/* Reserva de queima do mês (PREMISSA de cálculo, ver 90_Prototipo):
   limite = (100 − meta IUGA)% × (gás produzido acumulado + gás projetado × dias restantes); reserva = limite − queima acumulada.
   Acumulados até D-1 (BDO); dias restantes contam a partir do dia da REDIA, inclusive. */
function reservaQueima(E, iso) {
  const M = E.mes || {}, mP = VN(E, 'iuga.gas_prod_mes'), mQ = VN(E, 'queima.acum_mes');
  const meta = VN(E, 'iuga.meta'), Pacc = mP != null ? mP : (M.gas ?? null), Qacc = mQ != null ? mQ : (M.queima ?? null), Pproj = VN(E, 'iuga.gas_prod_proj');
  const d = parseData(iso), ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(), restantes = ultimo - d.getDate() + 1;
  const iugaMes = Pacc ? (Pacc - (Qacc || 0)) / Pacc * 100 : null;
  const projDia = VN(E, 'queima.proj') != null ? VN(E, 'queima.proj') * 1000 : null;   // Mm³/d (mil m³/d) → m³/d
  const r = { meta, Pacc, Qacc, Pproj, restantes, ultimo, iugaMes, projDia, fonteP: mP != null ? 'manual' : 'soma', fonteQ: mQ != null ? 'manual' : 'soma', dias: M.n || 0, faltam: M.faltam || [], reserva: null, porDia: null, limite: null, Ptot: null, conservadora: null, sem: 'sd' };
  if (meta == null || Pacc == null || Qacc == null) return r;
  r.Ptot = Pacc + (Pproj || 0) * restantes;
  r.limite = (1 - meta / 100) * r.Ptot;
  r.reserva = r.limite - Qacc;
  r.porDia = restantes ? r.reserva / restantes : null;
  r.conservadora = (1 - meta / 100) * Pacc - Qacc;
  r.sem = r.reserva <= 0 ? 'nok' : (projDia != null && r.porDia < projDia) ? 'at' : 'ok';
  return r;
}
/* D-57 · IUGA tático: reserva tática e recuperação da meta
   Produção do mês projetada = gás produzido até D-1 + produção diária × dias restantes (projeção do SITOP ou, sem ela, média do mês).
   Reserva tática = (IUGA do mês − (meta + margem)) × produção projetada: o volume que ainda pode ser queimado,
   além do ritmo atual, fechando o mês com IUGA ≥ meta + margem (margem padrão 0,1 p.p., ajustável na curadoria da COPROD).
   Abaixo da meta: queima máxima diária nos dias restantes para fechar o mês na meta, IUGA diário necessário,
   redução frente à queima atual e as causas evitáveis que podem ser trabalhadas, maiores primeiro. */
const IUGA_MARGEM_PADRAO = 0.1;
function iugaTatico(E, iso) {
  const r = reservaQueima(E, iso);
  const margem = VN(E, 'iuga.margem') ?? IUGA_MARGEM_PADRAO;
  const dec = r.dias || Math.max(0, parseData(iso).getDate() - 1);
  const prodDia = r.Pproj != null ? r.Pproj : (r.Pacc != null && dec ? r.Pacc / dec : null);
  const t = { ...r, margem, metaT: r.meta != null ? r.meta + margem : null, prodDia, fonteProj: r.Pproj != null ? 'projeção do SITOP' : 'média do mês', modo: null,
    PtotT: null, tatica: null, taticaDia: null, maxDia: null, iugaDiaNec: null, queimaDia: null, fonteQueima: null, reducao: null, alcancavel: null, iugaMaxPossivel: null, origens: [] };
  if (r.meta == null || r.Pacc == null || r.Qacc == null || prodDia == null) return t;
  t.PtotT = r.Pacc + prodDia * r.restantes;
  t.modo = r.iugaMes != null && r.iugaMes >= r.meta ? 'reserva' : 'recuperar';
  t.tatica = r.iugaMes != null ? (r.iugaMes - t.metaT) / 100 * t.PtotT : null;
  t.taticaDia = t.tatica != null && r.restantes ? t.tatica / r.restantes : null;
  t.maxDia = r.restantes ? ((1 - r.meta / 100) * t.PtotT - r.Qacc) / r.restantes : null;
  t.iugaDiaNec = t.maxDia != null && prodDia ? (1 - t.maxDia / prodDia) * 100 : null;
  t.queimaDia = r.projDia != null ? r.projDia : (dec ? r.Qacc / dec : null);
  t.fonteQueima = r.projDia != null ? 'queima projetada D' : 'média do mês';
  t.reducao = t.queimaDia != null && t.maxDia != null ? Math.max(0, t.queimaDia - Math.max(0, t.maxDia)) : null;
  t.alcancavel = t.maxDia != null ? t.maxDia > 0 : null;
  t.iugaMaxPossivel = t.PtotT ? (t.PtotT - r.Qacc) / t.PtotT * 100 : null;
  let acum = 0;
  t.origens = L(E, 'queima.causas').filter(c => c.evitavel === 'sim' && +c.valor > 0).map(c => ({ causa: c.causa, m3d: +c.valor * 1000 })).sort((a, b) => b.m3d - a.m3d)
    .map(o => { acum += o.m3d; return { ...o, acum, cobre: t.reducao ? Math.min(100, acum / t.reducao * 100) : null }; });
  return t;
}
/* D-61 (proposta 24): meta do indicador de manutenção = a informada na linha ou, vazia, a da linha de base da UEP (CFG.metasManutencao) */
function metaManutencao(i) { const m = i.meta; if (m !== '' && m != null && !isNaN(+m)) return +m; const c = (CFG.metasManutencao || {})[String(i.ind || '').trim()]; return c == null || c === '' ? null : +c; }
function itensDe(E, coord, tipo) { return E.itens.filter(i => i.payload.coord === coord && i.payload.tipo === tipo); }
/* D-61 (propostas 25 e 27): registros da reunião · decisões tomadas (com quem decidiu), aprendizados do dia e tempo medido por bloco */
function reuniaoDe(E, tipo) { return E.reuniao.filter(r => r.payload.tipo === tipo); }
const BLOCOS_NOME = { 1: 'Abertura · GEPLAT', 2: 'COPROD', 3: 'COEMB', 4: 'COMAN', 5: 'Fechamento' };
function temposBlocos(E) {
  const ult = {};
  for (const r of reuniaoDe(E, 'tempo')) ult[r.payload.bloco] = r;   // em ordem de gravação: vale a última passagem por cada bloco
  const linhas = [1, 2, 3, 4, 5].map(b => { const r = ult[b], p = r?.payload; return { bloco: b, nome: BLOCOS_NOME[b], reg: r || null, inicio: p?.inicio || null, fim: p?.fim || null, segundos: p ? +p.segundos : null, timebox: p ? +p.timebox : CFG.timeboxMin * 60, estouro: p ? Math.max(0, +p.segundos - +p.timebox) : null }; });
  const medidos = linhas.filter(l => l.segundos != null);
  return { linhas, medidos: medidos.length, total: medidos.reduce((a, l) => a + l.segundos, 0), estouro: medidos.reduce((a, l) => a + l.estouro, 0), previsto: linhas.reduce((a, l) => a + l.timebox, 0) };
}
/* D-62 · onda 2 · segurança de processo, barreiras e vencimentos (PREMISSAS de regra, ver 40_Pendencias D-62a) */
const diasAte = (iso, hoje) => iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? diffDias(iso, hoje) : null;   // >0 futuro · <0 passado
function inibicoesDe(E, hoje) {
  const L1 = CFG.limiares.inibicaoDias || { at: 1, nok: 3 };
  return L(E, 'sms.inibicoes').map(i => { const d = diasAte(i.desde, hoje), dias = d == null ? null : -d; return { ...i, dias, sem: dias == null ? 'sd' : dias >= L1.nok ? 'nok' : dias >= L1.at ? 'at' : 'ok' }; }).sort((a, b) => (b.dias ?? -1) - (a.dias ?? -1));
}
/* vencimento de itens com data: vencida (< hoje e não executada), vence em 7 dias, programada */
function situacaoVenc(dataIso, situacao, hoje, janela = 7) {
  if (situacao === 'Executada') return { k: 'ok', rot: 'Executada', dias: null };
  const d = diasAte(dataIso, hoje); if (d == null) return { k: 'sd', rot: 'Sem data', dias: null };
  if (d < 0) return { k: 'nok', rot: `Vencida há ${-d} d`, dias: d };
  if (d <= janela) return { k: 'at', rot: d === 0 ? 'Vence hoje' : `Vence em ${d} d`, dias: d };
  return { k: 'ok', rot: `Em ${d} d`, dias: d };
}
const ORD_VENC = { nok: 0, at: 1, sd: 2, ok: 3 };
function criticasDe(E, hoje) { return L(E, 'man.criticas').map(i => ({ ...i, v: situacaoVenc(i.vencimento, i.situacao, hoje) })).sort((a, b) => ORD_VENC[a.v.k] - ORD_VENC[b.v.k] || (a.v.dias ?? 999) - (b.v.dias ?? 999)); }
function inspecoesDe(E, hoje) { return L(E, 'insp.integridade').map(i => ({ ...i, v: situacaoVenc(i.proxima, i.situacao, hoje, CFG.limiares.inspecaoJanelaDias || 30) })).sort((a, b) => ORD_VENC[a.v.k] - ORD_VENC[b.v.k] || (a.v.dias ?? 999) - (b.v.dias ?? 999)); }
function pecasDe(E) { const o = { 'Em falta': 0, 'Em trânsito': 1, 'Recebida': 2 }; return L(E, 'man.pecas').slice().sort((a, b) => (o[a.situacao] ?? 3) - (o[b.situacao] ?? 3) || String(a.previsao || '9').localeCompare(String(b.previsao || '9'))); }
/* D-62 (proposta 14): teste de vazão vencido = dias desde o último teste acima da periodicidade da UEP (CFG.testeVazaoDias) */
function testeVencido(p, hoje) { const per = CFG.testeVazaoDias || 90; if (p.tipo !== 'produtor') return null; const d = diasAte(p.ultimo_teste, hoje); const dias = d == null ? null : -d; return { dias, per, vencido: dias != null && dias > per, semTeste: dias == null }; }
/* resumo para a abertura (proposta 1): eventos Tier 1/2 e demandas a sistemas de segurança nas 24 h, inibições ativas, críticos vencidos */
function segurancaProcesso(E, hoje) {
  const ev = L(E, 'sms.eventos'), t12 = ev.filter(e => /^Tier [12]/.test(e.tier || '')), t3 = ev.filter(e => /^Tier 3/.test(e.tier || '')), t4 = ev.filter(e => /^Tier 4/.test(e.tier || ''));
  const inib = inibicoesDe(E, hoje), crit = criticasDe(E, hoje), venc = crit.filter(c => c.v.k === 'nok'), v7 = crit.filter(c => c.v.k === 'at');
  const piorInib = inib.length ? ['nok', 'at', 'ok', 'sd'].find(x => inib.some(i => i.sem === x)) : 'ok';
  const sem = t12.length || venc.length || piorInib === 'nok' ? 'nok' : t3.length || t4.length || inib.length || v7.length ? 'at' : (E.listas['sms.eventos'] || E.listas['sms.inibicoes'] || E.listas['man.criticas']) ? 'ok' : 'sd';
  return { eventos: ev, t12, t3, t4, inib, maisAntiga: inib[0] || null, piorInib, crit, venc, v7, sem };
}
/* D-63 · onda 3 (PREMISSAS de regra, ver 40_Pendencias D-63a) */
/* (8) perda de produção D-1 por causa e sistema + Pareto do mês por sistema (soma das listas diárias) · campo oleo.deferimento */
function deferimentoDe(E) { return L(E, 'oleo.deferimento').map(d => ({ ...d, volume: +d.volume || 0 })).sort((a, b) => b.volume - a.volume); }
function acumuladoDeferimento(iso, regsDoDia) {
  const d = parseData(iso), porSistema = {}, porCausa = {}; let total = 0, dias = 0;
  for (let x = 1; x <= d.getDate(); x++) {
    const dia = iso.slice(0, 8) + pad(x); let lista = null;
    for (const r of regsDoDia(dia)) if (r.tipo === 'lista' && r.payload.campo === 'oleo.deferimento') lista = r.payload.itens;
    if (!lista) continue; dias++;
    for (const c of lista) { const v = +c.volume || 0; total += v; porSistema[c.sistema || 'Outros'] = (porSistema[c.sistema || 'Outros'] || 0) + v; porCausa[c.causa || '—'] = (porCausa[c.causa || '—'] || 0) + v; }
  }
  const ord = o => Object.entries(o).map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
  return { total, dias, porSistema: ord(porSistema), porCausa: ord(porCausa) };
}
/* (16) janela meteo-oceanográfica × limites do offloading (CFG.limitesOffloading) */
function janelaMeteo(E) {
  const Lm = CFG.limitesOffloading || {}, par = (id, lim) => { const v = VN(E, id); if (v == null) return { v, sem: 'sd' }; if (lim == null) return { v, sem: null }; return { v, lim, sem: v > lim ? 'nok' : v > lim * 0.85 ? 'at' : 'ok' }; };
  const hs = par('meteo.hs', Lm.hs), vento = par('meteo.vento', Lm.vento), corrente = par('meteo.corrente', Lm.corrente);
  const sems = [hs.sem, vento.sem, corrente.sem].filter(Boolean), sem = sems.includes('nok') ? 'nok' : sems.includes('at') ? 'at' : sems.includes('ok') ? 'ok' : 'sd';
  return { hs, vento, corrente, tendencia: V(E, 'meteo.tendencia') || '', sem, rot: sem === 'nok' ? 'Fora da janela' : sem === 'at' ? 'Perto do limite' : sem === 'ok' ? 'Dentro da janela' : 'Sem dado' };
}
/* (19) lastro e estabilidade × limites (CFG.limitesEstabilidade) */
function estabilidade(E) {
  const Le = CFG.limitesEstabilidade || {}, cv = VN(E, 'lastro.calado_vante'), cr = VN(E, 'lastro.calado_re'), trim = VN(E, 'lastro.trim') ?? (cv != null && cr != null ? +(cr - cv).toFixed(2) : null), banda = VN(E, 'lastro.banda');
  const chk = (v, lim) => v == null ? 'sd' : lim == null ? null : Math.abs(v) > lim ? 'nok' : Math.abs(v) > lim * 0.8 ? 'at' : 'ok';
  const calMax = cv != null || cr != null ? Math.max(cv ?? -Infinity, cr ?? -Infinity) : null;
  const s = { trim: chk(trim, Le.trim), banda: chk(banda, Le.banda), calado: calMax == null ? 'sd' : Le.caladoMax == null ? null : calMax > Le.caladoMax ? 'nok' : calMax > Le.caladoMax * 0.97 ? 'at' : 'ok' };
  const sems = Object.values(s).filter(Boolean), sem = sems.includes('nok') ? 'nok' : sems.includes('at') ? 'at' : sems.includes('ok') ? 'ok' : 'sd';
  return { cv, cr, trim, banda, calMax, s, sem, lim: Le };
}
/* (9) poço produtor abaixo do potencial: vazão estimada D-1 < potencial × (1 − CFG.pocoDesvioPct/100) */
function pocoDesvio(p) { const pot = +p.potencial, vz = +p.vazao; if (p.tipo !== 'produtor' || !(pot > 0) || p.vazao === '' || p.vazao == null || isNaN(vz)) return null; const pct = vz / pot * 100; return { pot, vz, pct, abaixo: pct < 100 - (CFG.pocoDesvioPct || 10), perda: Math.max(0, pot - vz) }; }
/* (11) manobras previstas × reserva tática */
function manobrasDe(E, iso) {
  const t = iugaTatico(E, iso), prev = L(E, 'queima.manobras').filter(m => m.situacao !== 'Cancelada' && m.situacao !== 'Realizada').sort((a, b) => String(a.data || '9').localeCompare(String(b.data || '9')));
  const total = prev.reduce((a, m) => a + (+m.queima || 0) * 1000, 0);
  return { itens: prev, total, tatica: t.tatica, modo: t.modo, cabe: t.modo === 'reserva' && t.tatica != null ? total <= t.tatica : t.modo === 'recuperar' ? false : null, saldo: t.tatica != null ? t.tatica - total : null };
}
/* (15) custo da indisponibilidade: queima do mês ligada a equipamento indisponível (coluna "equipamento" das causas) */
function custoIndisponibilidade(iso, regsDoDia) {
  const d = parseData(iso), por = {}; let total = 0, dias = 0;
  for (let x = 1; x <= d.getDate(); x++) {
    const dia = iso.slice(0, 8) + pad(x); let lista = null;
    for (const r of regsDoDia(dia)) if (r.tipo === 'lista' && r.payload.campo === 'queima.causas') lista = r.payload.itens;
    if (!lista) continue; dias++;
    for (const c of lista) { const eq = String(c.equipamento || '').trim(); if (!eq) continue; const v = (+c.valor || 0) * 1000; total += v; (por[eq] ||= { m3: 0, dias: 0 }); por[eq].m3 += v; por[eq].dias++; }
  }
  return { total, dias, itens: Object.entries(por).map(([eq, o]) => ({ eq, ...o })).sort((a, b) => b.m3 - a.m3) };
}
/* (29) recorrência: mesma TAG (sugestões e itens) ou causa de queima / função do PFCEO com desvio em ≥ N REDIAs nos últimos D dias (CFG.recorrencia) */
const chaveRec = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
function recorrencias(iso, regsDoDia) {
  const R = CFG.recorrencia || { vezes: 3, dias: 30 }, mapa = new Map();
  const marca = (chave, dia, rot) => { if (!chave) return; const m = mapa.get(chave) || { chave, rot, dias: new Set() }; m.dias.add(dia); if (!m.rot) m.rot = rot; mapa.set(chave, m); };
  for (let k = 0; k < R.dias; k++) {
    const dia = addDias(iso, -k);
    for (const r of regsDoDia(dia)) {
      if (r.tipo === 'sugestao' || r.tipo === 'item') { const t = r.payload.tag; if (t) marca(chaveRec(t), dia, t); }
      else if (r.tipo === 'lista' && r.payload.campo === 'queima.causas') for (const c of r.payload.itens || []) { if (c.evitavel === 'sim') marca('causa:' + chaveRec(c.causa), dia, c.causa); if (c.equipamento) marca(chaveRec(c.equipamento), dia, c.equipamento); }
    }
  }
  const out = {}; for (const m of mapa.values()) if (m.dias.size >= R.vezes) out[m.chave] = { rot: m.rot, n: m.dias.size, dias: [...m.dias].sort() };
  return out;
}
const recorrenteDe = (E, tag) => E.rec ? E.rec[chaveRec(tag)] || null : null;
/* D-61 (proposta 26): taxa de demandas do Canal Base x Bordo fechadas no prazo, no mês da REDIA, por coordenação e sentido.
   Conta as demandas registradas no mês já decididas (encerradas ou vencidas); no prazo = encerrada até a data do prazo. */
function taxaPrazo(E, iso) {
  const mes = iso.slice(0, 7), dec = E.demandas.filter(d => String(d.payload.dataRedia || '').startsWith(mes) && (d.payload.status === 'encerrada' || d.situacao === 'vencida'));
  const noPrazo = d => d.payload.status === 'encerrada' && (!d.payload.prazo || !d.payload.statusEm || d.payload.statusEm.slice(0, 10) <= d.payload.prazo);
  const grupo = f => { const g = {}; for (const d of dec) { const k = f(d); (g[k] ||= { n: 0, ok: 0 }); g[k].n++; if (noPrazo(d)) g[k].ok++; } return Object.entries(g).map(([k, v]) => ({ k, ...v, pct: v.n ? v.ok / v.n * 100 : null })); };
  const n = dec.length, ok = dec.filter(noPrazo).length;
  return { n, ok, pct: n ? ok / n * 100 : null, abertas: E.demandas.filter(d => d.payload.status !== 'encerrada').length, porCoord: grupo(d => d.payload.coord), porSentido: grupo(d => d.payload.sentido) };
}
function principalAmeaca(E, coord) {
  const a = itensDe(E, coord, 'ameaca');
  return a.slice().sort((x, y) => ['nok', 'at', 'ok', 'sd'].indexOf(x.payload.semaforo) - ['nok', 'at', 'ok', 'sd'].indexOf(y.payload.semaforo))[0] || null;
}

/* ======================================================================
   Dados de exemplo (operação · exemplo com dados da P-75; sem nomes de pessoas)
   build.py com REDIA_SEM_EXEMPLO=1 retira este bloco da montagem (site público sem dados de exemplo).
   ====================================================================== */
/* EXEMPLO-INICIO */
const EXEMPLO_DISPONIVEL = true;
/* APLAT simulado (D-54): PTs planejadas que só aparecem ao clicar em "Capturar dados" nos Serviços do dia */
const APLAT_EXEMPLO_NOVAS = {
  COPROD: [['Limpeza do filtro de água de injeção', 'Injeção de água · PT [nº] · [horário]']],
  COEMB: [['Inspeção da estação de offloading de popa', 'Offloading · PT [nº] · [horário]']],
  COMAN: [['Troca de filtros do TG-B', 'Geração principal · PT [nº] · [horário]']],
};
/* D-65 · valores dos dias anteriores, determinísticos pela data: o exemplo do dia e o histórico de 15 dias geram exatamente
   os mesmos números para a mesma data (gravar os dois não cria versões diferentes do mesmo dia) */
const numDia = dia => Math.round(parseData(dia).getTime() / 86400000);
function valoresTendDia(dia) {
  const n = numDia(dia);
  return { 'oleo.real': Math.round(26400 + 420 * Math.sin(n * 1.3) + (n % 11 === 4 ? -1800 : 0)), 'iuga.real': +(97.4 + 0.5 * Math.cos(n * 0.9)).toFixed(2), 'gas.real': Math.round(5100 + 250 * Math.sin(n * 0.8)), 'agua.real': Math.round(17350 + 180 * Math.cos(n * 1.1)) };
}
function gasQueimaDia(dia) { const x = parseData(dia).getDate(), gas = Math.round(4185000 + 60000 * Math.sin(x * 1.7)), iu = 97.62 + 0.35 * Math.sin(x * 2.3); return { 'gas.prod_d1': gas, 'queima.real_d1': Math.round(gas * (1 - iu / 100)) }; }
function listasDia(dia) {
  const x = parseData(dia).getDate(), q = 28 + 6 * Math.sin(x * 1.7), extra = x % 11 === 0 ? 60 : x % 7 === 0 ? 18 : 0;
  return {
    causas: [{ causa: 'Gás de assistência e purga', valor: Math.round(q), evitavel: 'não', classe: 'Rotina', equipamento: '' }, ...(extra ? [{ causa: 'Parada de compressor', valor: extra, evitavel: 'sim', classe: 'Extraordinária', equipamento: x % 11 === 0 ? 'TC-A' : 'FGRU A' }] : [])],
    perda: [...(x % 4 === 0 ? [{ causa: 'Parada de compressor', sistema: 'Planta de processo', volume: 900, obs: '' }] : []), ...(x % 6 === 0 ? [{ causa: 'Teste de produção', sistema: 'Poços e subsea', volume: 400, obs: '' }] : []), ...(x % 9 === 0 ? [{ causa: 'Offloading · redução de vazão', sistema: 'Escoamento / offloading', volume: 300, obs: '' }] : [])],
  };
}
/* monta os registros de exemplo do dia (sem gravar); também serve de origem simulada para a captura (D-52) */
function montarExemplo(iso) {
  const D1 = addDias(iso, -1), D2 = addDias(iso, -2);
  const autorSis = { nome: 'Dados de exemplo', chave: '', papel: 'sistema' };
  const base = new Date(Relogio.agora().getTime() - 3 * 3600 * 1000);
  let t = base.getTime();
  const mk = (tipo, payload, extra = {}) => ({ v: 1, id: uid(), tipo, data: iso, uep: CFG.uep, criadoEm: new Date(t += 1000).toISOString(), gravadoEm: carimbo(), autor: autorSis, payload, ...extra });
  const regs = [];
  const val = (campo, valor, origem = 'A', fonte = 'SITOP 00:37') => regs.push(mk('valor', { campo, valor, origem, fonte, exemplo: true }));
  const lst = (campo, itens, origem = 'A', fonte = 'SITOP 00:37') => regs.push(mk('lista', { campo, itens, origem, fonte, exemplo: true }));

  val('geplat.situacao', 'Produção acima do potencial. Injeção de gás em 69% da meta com a Injection A indisponível; flare LP aberto.', 'C', 'GEPLAT');
  val('geplat.situacao_sem', 'at', 'C', 'GEPLAT');
  val('sms.dias_parada', 60); val('sms.recorde_parada', 104); val('sms.dias_ocorrencia', 944); val('sms.desde_ocorrencia', '09/03/2024');
  val('sms.dias_incendio', 553); val('sms.recorde_incendio', 652); val('pob.atual', 181); val('pob.max', 190);
  val('oleo.real', 26925, 'A', 'BDO D-1 03:41'); val('oleo.potencial', 26869); val('oleo.proj', 26869);
  val('iuga.real', 96.35, 'A', 'BDO D-1 03:41'); val('iuga.meta', 97, 'A', 'Metas da UEP'); val('iuga.proj', 97.94);
  val('iuga.buzios', 97.41, 'A', 'Dados do ativo 05:00');   // D-63 (proposta 6): contexto do ativo e do campo (o IUGA do ATP fica sem dado para mostrar o alerta da captura)
  val('queima.campo_cota', 42000000, 'A', 'Dados do ativo 05:00'); val('queima.campo_acum', 19800000, 'A', 'Dados do ativo 05:00');
  val('queima.proj', 140); val('queima.ref', 'BDO ' + ddmm(D2), 'A', 'BDO');
  val('flare.hp', 'Fechado', 'M', 'Passagem 06:00'); val('flare.lp', 'Aberto', 'M', 'Passagem 06:00');
  val('gas.real', 3791, 'A', 'BDO ' + ddmm(D2)); val('gas.meta', 5500, 'A', 'Metas da UEP'); val('gas.proj', 3570); val('gas.ref', 'BDO ' + ddmm(D2), 'A', 'BDO');
  val('agua.real', 17422, 'A', 'BDO D-1 03:41'); val('agua.meta', 17400, 'A', 'Metas da UEP'); val('agua.proj', 17400);
  val('agua.urs', 16743, 'A', 'BDO ' + ddmm(D2)); val('agua.prod_reinj', 679, 'A', 'BDO ' + ddmm(D2)); /* produzida reinjetada = 3,9% do injetado (17.422 m³) */ val('agua.prod_desc', 0, 'A', 'BDO ' + ddmm(D2)); val('agua.ref', 'BDO ' + ddmm(D2), 'A', 'BDO');
  val('off.estoque', 127240); val('off.capacidade', 210000); val('off.ate_top', 82760); val('off.prod24', 27135);
  val('off.top', `${ddmm(iso)} 12:47`); val('off.navio', `Maran Libra · 80.000 m³ · ETA ${ddmm(D2)}`, 'M', 'COEMB'); val('off.navio_ok', 'Sim', 'M', 'COEMB');
  val('off.qualidade', 'BSW 0,25% · salinidade 57 mg/L'); val('off.estacoes', 'Proa e popa');
  val('ger.reserva', 'Reserva disponível'); val('man.ref', 'Exemplo P-77 · fonte a definir', 'M', 'COMAN'); val('man.notas_if6', 15, 'M', 'COMAN'); val('man.sensores', 7, 'M', 'COMAN');
  val('man.aderencia', 82, 'A', 'SAP PM'); val('man.backlog', 6.4, 'A', 'SAP PM'); val('man.backlog_critico', 1.2, 'A', 'SAP PM');   // D-63 (proposta 20)
  val('meteo.hs', 1.8, 'A', 'Meteo 06:00'); val('meteo.vento', 18, 'A', 'Meteo 06:00'); val('meteo.corrente', 0.6, 'A', 'Meteo 06:00'); val('meteo.tendencia', 'Ondas de 2,5 m a partir de amanhã à tarde', 'A', 'Meteo 06:00');   // D-63 (proposta 16)
  val('lastro.calado_vante', 21.4); val('lastro.calado_re', 21.9); val('lastro.trim', 0.5); val('lastro.banda', 0.3);   // D-63 (proposta 19) · SITOP

  const dt = n => addDias(iso, -n);
  lst('pocos', [
    { poco: 'BUZ-095', tipo: 'produtor', status: 'reaberto', trem: 'A', ultimo_teste: dt(41), potencial: 5200, vazao: 4100 }, { poco: 'BUZ-130', tipo: 'produtor', status: 'fechado', trem: 'Teste', ultimo_teste: dt(64), potencial: 4800, vazao: 0 },
    { poco: 'BUZ-061', tipo: 'produtor', status: 'aberto', trem: 'A', ultimo_teste: dt(20), potencial: 5600, vazao: 5550 }, { poco: 'BUZ-074', tipo: 'produtor', status: 'aberto', trem: 'A', ultimo_teste: dt(35), potencial: 5300, vazao: 5280 },
    { poco: 'BUZ-088', tipo: 'produtor', status: 'aberto', trem: 'B', ultimo_teste: dt(12), potencial: 6100, vazao: 6050 }, { poco: 'BUZ-112', tipo: 'produtor', status: 'aberto', trem: 'B', ultimo_teste: dt(95), potencial: 6200, vazao: 5945 },
    { poco: 'BUZ-047', tipo: 'inj_agua', status: 'aberto' }, { poco: 'BUZ-053', tipo: 'inj_agua', status: 'aberto' }, { poco: 'BUZ-119', tipo: 'inj_agua', status: 'aberto' },
    { poco: 'BUZ-068', tipo: 'inj_gas', status: 'aberto' }, { poco: 'BUZ-102', tipo: 'inj_gas', status: 'aberto' },
  ], 'M', 'Fonte a definir (I-25)');
  val('teste.proximo', 'BUZ-112', 'M', 'COPROD'); val('teste.previsao', ddmm(addDias(iso, 2)), 'M', 'COPROD');
  { // gás produzido D-1 e queima D-1 (SITOP) de cada REDIA do mês; o sistema soma (D-43)
    const hoje = parseData(iso).getDate();
    for (let x = 2; x <= hoje; x++) {
      const dia = iso.slice(0, 8) + pad(x), gq = gasQueimaDia(dia), sit = `SITOP ${ddmm(dia)} 00:37`;
      if (x === hoje) gq['queima.real_d1'] = Math.round(gq['gas.prod_d1'] * (1 - 96.35 / 100));   // a REDIA de hoje traz o IUGA D-1 do dia (96,35%)
      for (const [campo, valor] of Object.entries(gq)) { const r = mk('valor', { campo, valor, origem: 'A', fonte: sit, exemplo: true }); r.data = dia; regs.push(r); }
    }
    val('iuga.gas_prod_proj', 4200000, 'A', 'SITOP 00:37'); }
  lst('cilindros', [
    { tipo: 'gas', serie: 'EX-GAS-0412', chegada: dt(118), situacao: 'Disponível' }, { tipo: 'gas', serie: 'EX-GAS-0417', chegada: dt(118), situacao: 'Coletado' },
    { tipo: 'gas', serie: 'EX-GAS-0450', chegada: dt(76), situacao: 'Disponível' }, { tipo: 'gas', serie: 'EX-GAS-0453', chegada: dt(76), situacao: 'Disponível' },
    { tipo: 'gas', serie: 'EX-GAS-0498', chegada: dt(23), situacao: 'Disponível' }, { tipo: 'gas', serie: 'EX-GAS-0501', chegada: dt(23), situacao: 'Disponível' },
    { tipo: 'pvt', serie: 'EX-PVT-0107', chegada: dt(131), situacao: 'Disponível' }, { tipo: 'pvt', serie: 'EX-PVT-0112', chegada: dt(90), situacao: 'Coletado' },
    { tipo: 'pvt', serie: 'EX-PVT-0125', chegada: dt(44), situacao: 'Disponível' }, { tipo: 'pvt', serie: 'EX-PVT-0126', chegada: dt(44), situacao: 'Disponível' },
  ], 'M', 'COPROD · exemplo');
  lst('pocos.operacoes', [
    { poco: 'BUZ-112', operacao: 'Inspeção da ANM com ROV', tipo: 'Operação', situacao: 'Em curso', data: iso, apoio: 'Embarcação + ROV', demandante: 'Gerência de poços de Búzios', obs: 'Embarcação na área desde 06:00 · poço segue aberto' },
    { poco: 'BUZ-061', operacao: 'Teste de estanqueidade da DHSV', tipo: 'Procedimento', situacao: 'Prevista', data: addDias(iso, 2), apoio: '—', demandante: 'Gerência de poços de Búzios', obs: 'Requer fechamento do poço por cerca de 4 h' },
    { poco: 'BUZ-047', operacao: 'Ajuste da configuração das zonas de injeção', tipo: 'Manobra', situacao: 'Prevista', data: addDias(iso, 4), apoio: 'Embarcação + ROV', demandante: 'Gerência de poços de Búzios', obs: 'Aguardando janela da embarcação' },
    { poco: 'BUZ-095', operacao: 'Ajuste da configuração das zonas produtoras', tipo: 'Manobra', situacao: 'Realizada', data: addDias(iso, -1), apoio: '—', demandante: 'Gerência de poços de Búzios', obs: 'Poço reaberto às 02:10 · em estabilização' },
  ], 'M', 'COPROD · exemplo');
  lst('queima.eventos', [{ evento: 'Partida do TC-A', flare: 'LP', volume: 57.0 }, { evento: 'Passagem de válvulas', flare: 'HP', volume: 15.1 }], 'A', 'BDO ' + ddmm(D2));
  lst('queima.causas', [{ causa: 'Queda do TC-A e da FGRU', valor: 90, evitavel: 'sim', classe: 'Extraordinária', equipamento: 'TC-A' }, { causa: 'Gás de assistência', valor: 24, evitavel: 'não', classe: 'Rotina', equipamento: '' }, { causa: 'Indisponibilidade da FGRU A', valor: 22, evitavel: 'sim', classe: 'Extraordinária', equipamento: 'FGRU A' }, { causa: 'Purga do flare', valor: 4, evitavel: 'não', classe: 'Rotina', equipamento: '' }]);
  lst('queima.manobras', [{ manobra: 'Partida da Injection A', data: iso, queima: 35, situacao: 'Prevista' }, { manobra: 'Retorno da FGRU A (despressurização)', data: addDias(iso, 1), queima: 12, situacao: 'Prevista' }, { manobra: 'Teste de vazão do BUZ-112 · alinhamento', data: addDias(iso, 2), queima: 8, situacao: 'Prevista' }], 'M', 'COPROD');   // D-63 (proposta 11)
  lst('oleo.deferimento', [{ causa: 'Injection A indisponível · restrição de gas lift', sistema: 'Planta de processo', volume: 620, obs: 'Até o retorno da Injection A' }, { causa: 'BUZ-130 fechado para teste', sistema: 'Poços e subsea', volume: 380, obs: 'Teste de produção' }, { causa: 'Limitação do TC-A após a partida', sistema: 'Planta de processo', volume: 150, obs: '' }], 'A', 'BDO D-1 03:41');   // D-63 (proposta 8)
  { // D-61: tendência de 7 dias (REDIAs de D-6 a D-1, cada uma com o realizado do dia anterior) e queima por classe nas REDIAs anteriores do mês
    const ant = (dia, campo, valor, fonte) => { const r = mk('valor', { campo, valor, origem: 'A', fonte, exemplo: true }); r.data = dia; regs.push(r); };
    for (let k = 29; k >= 1; k--) {   // 30 dias (visão semanal, D-63); os últimos 7 alimentam a abertura · valores por data (D-65)
      const dia = addDias(iso, -k), f = `BDO D-1 · REDIA ${ddmm(dia)}`;
      for (const [campo, valor] of Object.entries(valoresTendDia(dia))) ant(dia, campo, valor, f);
    }
    const hoje = parseData(iso).getDate();
    for (let x = 1; x < hoje; x++) {
      const dia = iso.slice(0, 8) + pad(x), ls = listasDia(dia);
      const r = mk('lista', { campo: 'queima.causas', itens: ls.causas, origem: 'A', fonte: `SITOP ${ddmm(dia)} 00:37`, exemplo: true }); r.data = dia; regs.push(r);
      const df = mk('lista', { campo: 'oleo.deferimento', itens: ls.perda, origem: 'A', fonte: `BDO ${ddmm(dia)}`, exemplo: true }); if (df.payload.itens.length) { df.data = dia; regs.push(df); }   // D-63 (proposta 8): Pareto do mês
    }
  }
  /* status dos equipamentos (D-53): o da passagem de serviço das 06:00; CO2 B fica sem informação para mostrar o alerta da captura */
  const ST_EX = { 'vru.a': 'Operando', 'vru.b': 'Stand By', 'main.a': 'Operando', 'main.b': 'Operando', 'main.c': 'Stand By', 'injection.a': 'Indisponível', 'injection.b': 'Operando', 'injection.c': 'Operando', 'co2.a': 'Operando',
    'fgru.a': 'Indisponível', 'fgru.b': 'Operando', 'fgru.c': 'Em manutenção', 'tgru.a': 'Operando', 'tgru.b': 'Stand By', 'srgu.a': 'Operando', 'srgu.b': 'Stand By',
    'booster.a': 'Operando', 'booster.b': 'Operando', 'booster.c': 'Stand By', 'principal.a': 'Operando', 'principal.b': 'Limitado', 'principal.c': 'Stand By' };
  for (const e of EQUIP) for (const it of e.itens) { const st = ST_EX[it.id.split('.').slice(2).join('.')]; if (st) val(it.id, st, 'A', `Passagem 06:00 · posto ${e.posto}`); }
  lst('tq.atencao', [
    { tanque: 'TQ-4S', nota: 'Tratamento e pintura abaixo da voluta; bomba desmontada', status: 'Em manutenção' },
    { tanque: 'TQ-5C', nota: 'Aberto e inspecionado; aguarda fechamento', status: 'Em manutenção' },
    { tanque: 'BSW 6% em três tanques', nota: 'TQ-1358505P, TQ-1358507S, TQ-5336508P/S', status: 'Atenção' }], 'M', 'COEMB');

  lst('util', [{ nome: 'Água potável', estoque: 808, minimo: 600, consumo: 139, producao: 106 }, { nome: 'Água destilada', estoque: 353, minimo: 200, consumo: 0, producao: 0 }, { nome: 'Óleo diesel', estoque: 3525, minimo: 1000, consumo: 0, producao: 0 }]);
  lst('ger.tgs', [
    { tg: 'TG-A', status: 'Operando', linha1: 'Gás · full load 25 MW · NPT', linha2: 'WHRU seco', alerta: 'não' },
    { tg: 'TG-B', status: 'Stand-by', linha1: 'Full load 25 MW · NPT', linha2: 'WHRU molhado e restringido', alerta: 'sim' },
    { tg: 'TG-C', status: 'Operando', linha1: 'Gás · full load 23 MW · T48', linha2: 'WHRU molhado e restringido', alerta: 'sim' },
    { tg: 'TG-D', status: 'Operando', linha1: 'Gás · full load 25 MW · NPT', linha2: 'WHRU operando', alerta: 'não' }], 'A', 'SITOP Equipamentos');
  lst('ger.aux', [{ nome: 'Gerador de emergência', status: 'Operacional' }, { nome: 'Auxiliar', status: 'Operacional' }, { nome: 'Bombas de incêndio A/B/C', status: 'Operacionais' }], 'A', 'SITOP Equipamentos');
  lst('man.ind', [{ ind: 'ICPMe', valor: 88.1, meta: '' }, { ind: 'ICPMeIF6', valor: 97.2, meta: '' }, { ind: 'IARP', valor: 100, meta: '' }], 'M', 'Exemplo P-77');   // metas vêm da Configuração da UEP (D-61)

  // Equipamentos e Sistemas · PFCEO (exemplo; sem integração com o Portal de Integridade, I-03)
  const pf = (funcao, tag, redundancia, unidades, disponiveis, disponibilidade, condicao, situacao, nota, nm = '') => ({ funcao, tag, redundancia, unidades, disponiveis, disponibilidade, condicao, situacao, nota, nm });
  const fontePf = 'PFCEO 05:30';   // exemplo; sem integração com o Portal de Integridade (I-03), a captura é simulada
  lst('pfceo.COPROD', [
    pf('FGRU · recuperação de gás de flare', 'FGRU A/B/C', '3×66%', 3, 2, 'Disponível com Restrição', 'Atenção', 'Ligado', 'FGRU A indisponível · flare LP aberto', '[NM]'),
    pf('Compressão de injeção de gás', 'Injection A/B/C', '', 3, 2, 'Disponível com Restrição', 'Atenção', 'Ligado', 'Injection A fora · injeção em 69% da meta', '[NM]'),
    pf('Compressão principal', 'Main A/B/C', '', 3, 3, 'Disponível', 'Normal', 'Ligado', 'Main A e B em operação'),
    pf('Recuperação de vapores', 'VRU A/B', '', 2, 2, 'Disponível', 'Normal', 'Ligado', 'VRU A em operação'),
    pf('Compressão de CO2', 'CO2 A/B', '', 2, 2, 'Disponível', 'Normal', 'Ligado', 'CO2 A em operação'),
    pf('Recuperação de gás · TGRU', 'TGRU A/B', '2×100%', 2, 2, 'Disponível', 'Normal', 'Ligado', 'TGRU A em operação'),
    pf('Recuperação de gás · SRGU', 'SRGU A/B', '2×100%', 2, 2, 'Disponível', 'Pré-Atenção', 'Ligado', 'SRGU A em operação'),
    pf('Bombas de injeção de água · principal', 'Principal A/B/C', '', 3, 3, 'Disponível', 'Normal', 'Ligado', 'A e B em operação'),
  ], 'A', fontePf);
  lst('pfceo.COEMB', [
    pf('Lastro · lift de emergência', '', '', 1, 0, 'Indisponível', 'Crítico', 'Desligado', 'Bomba desarma por temperatura alta · desde 28/09/2025', '[NM]'),
    pf('Ancoragem · tensão das amarras', 'PN-CJ-5200502B-02 · C-02', '', '', '', 'Disponível com Restrição', 'Atenção', 'Ligado', 'Sem comunicação com o supervisório · leitura local'),
    pf('Slop · balance line', 'XV-53366014', '', '', '', 'Disponível com Restrição', 'Atenção', 'Ligado', 'Emissão fugitiva · NM aberta', '[NM]'),
    pf('Medição de calado', 'XT-55206001', '', '', '', 'Disponível com Restrição', 'Pré-Atenção', 'Ligado', 'Sensor inoperante · leitura por escala visual'),
    pf('Filling station de proa', '', '', 2, 1, 'Disponível com Restrição', 'Pré-Atenção', 'Ligado', 'Água e diesel inoperantes (sem mangote) · popa operacional'),
    pf('Gás inerte · GGI A e B', 'GGI A/B', '', 2, 2, 'Disponível', 'Normal', 'Ligado', 'Operacionais no diesel'),
    pf('Carga e descarregamento', '', '', '', '', 'Disponível', 'Normal', 'Ligado', 'Sem anomalias'),
    pf('Descarte do slop', '', '', '', '', 'Disponível', 'Normal', 'Ligado', '557 m³ descartados ao mar em 24 h'),
  ], 'A', fontePf);
  lst('pfceo.COMAN', [
    /* D-61 (proposta 22): barreiras de segurança sempre na primeira linha do PFCEO da COMAN */
    { ...pf('Sistema instrumentado de segurança · ESD', 'SIS/ESD', '', '', '', 'Disponível', 'Normal', 'Ligado', 'Sem inibições ativas'), seguranca: 'sim' },
    { ...pf('Detecção de fogo e gás', 'F&G', '', '', '', 'Disponível com Restrição', 'Atenção', 'Ligado', '2 detectores de gás do M-10 em falha · NM aberta', '[NM]'), seguranca: 'sim' },
    { ...pf('Dilúvio e combate a incêndio', 'Bombas de incêndio A/B/C', '3×50%', 3, 3, 'Disponível', 'Normal', 'Ligado', 'Teste do M-10 concluído sem anomalias'), seguranca: 'sim' },
    { ...pf('Geração de emergência', 'GE', '', 1, 1, 'Disponível', 'Normal', 'Desligado', 'Teste semanal em dia'), seguranca: 'sim' },
    pf('Tratamento de efluentes', 'Z-5312502', '', 1, 0, 'Indisponível', 'Crítico', 'Desligado', 'Descarte de 57 m³/d pelo Z-5312502'),
    pf('HVAC · AC-5252003A (M22)', 'AC-5252003A', '', 1, 0, 'Indisponível', 'Atenção', 'Desligado', 'Compressor instalado; faltam contator, disjuntor e PSVs novas', '[NM]'),
    pf('HVAC · AC-5252001A (M17)', 'AC-5252001A', '', 1, 0, 'Indisponível', 'Atenção', 'Desligado', 'Vazamento no condensador · reparo pela contratada', '[NM]'),
    pf('Eletrocloração', 'UE-5121501 vante/ré', '2×100%', 2, 1, 'Disponível com Restrição', 'Atenção', 'Ligado', 'Vante em manutenção · ré opera sem reserva', '[NM]'),
    pf('Dessalinização', 'UD-5122501A/B/C', '', 3, 2, 'Disponível com Restrição', 'Atenção', 'Ligado', 'UD-C em manutenção · osmose alugada 83 m³/d'),
    pf('Geração · WHRU', 'WHRU TG-B/C', '', 4, 2, 'Disponível com Restrição', 'Pré-Atenção', 'Ligado', 'WHRU de TG-B e TG-C molhados e restringidos'),
    pf('Ar comprimido', 'UC-5134501A/B/C', '', 3, 3, 'Disponível', 'Pré-Atenção', 'Ligado', 'Secadora B com ponto de orvalho em −10 °C'),
    pf('Geração principal', 'TG-A/B/C/D', '4×33%', 4, 4, 'Disponível', 'Normal', 'Ligado', 'TG-B em stand-by'),
  ], 'A', fontePf);
  lst('legais', [{ item: 'Pendências legais', status: 'A preencher' }, { item: 'Suprimentos críticos', status: 'A preencher' }], 'M', 'COMAN');
  /* D-62 · onda 2: segurança de processo, inibições, críticos de segurança, peças em falta e inspeções de integridade (exemplo; captura simulada) */
  lst('sms.eventos', [
    { evento: 'Abertura de PSV do vaso de teste por sobrepressão', tier: 'Tier 3 · demanda a sistema de segurança', sistema: 'PSV-1223001', hora: '22:40', situacao: 'Em tratamento' },
    { evento: 'Atuação do F&G por detector em falha (alarme falso)', tier: 'Tier 4 · barreira degradada', sistema: 'F&G M-10', hora: '03:15', situacao: 'Encerrado' },
  ], 'A', 'Passagem 06:00 · Téc. segurança');
  lst('sms.inibicoes', [
    { funcao: 'Detector de gás', tag: 'GD-5243012', tipo: 'Inibição', desde: addDias(iso, -4), responsavel: 'SUEIN', motivo: 'Detector em falha · NM aberta · ronda a cada 2 h', previsao: addDias(iso, 2) },
    { funcao: 'Intertravamento de nível alto do vaso de teste', tag: 'LSHH-1223007', tipo: 'Bypass', desde: addDias(iso, -1), responsavel: 'SUPROD', motivo: 'Teste de vazão com nível elevado · operador no painel', previsao: iso },
  ], 'A', 'Passagem 06:00 · Téc. segurança');
  lst('man.criticas', [
    { item: 'Teste de dilúvio do M-12', tag: 'DV-M12', tipo: 'Teste de dilúvio', vencimento: addDias(iso, -3), situacao: 'Programada' },
    { item: 'Preventiva da bomba de incêndio B', tag: 'P-5411002B', tipo: 'Preventiva', vencimento: addDias(iso, 5), situacao: 'Programada' },
    { item: 'Teste de ESD nível 2', tag: 'ESD-2', tipo: 'Teste de ESD', vencimento: addDias(iso, 20), situacao: 'Programada' },
    { item: 'Teste dos detectores de gás do M-10', tag: 'GD-M10', tipo: 'Teste de F&G', vencimento: addDias(iso, -1), situacao: 'Executada' },
  ], 'A', 'SAP PM');
  lst('man.pecas', [
    { peca: 'Contator e disjuntor do AC-5252003A', equipamento: 'AC-5252003A', om: '[OM]', situacao: 'Em trânsito', previsao: addDias(iso, 3), impacto: 'Habitabilidade do M22' },
    { peca: 'Kit de vedação da UD-5122501C', equipamento: 'UD-5122501C', om: '[OM]', situacao: 'Em falta', previsao: '', impacto: 'Dessalinização sem reserva' },
    { peca: 'Mangotes da filling station de proa', equipamento: 'Filling station de proa', om: '[OM]', situacao: 'Em falta', previsao: addDias(iso, 9), impacto: 'Abastecimento de água e diesel só pela popa' },
  ], 'A', 'SAP MM');
  lst('insp.integridade', [
    { item: 'Amarração · linha C-02', tipo: 'Inspeção de tensão com ROV', ultima: addDias(iso, -200), proxima: addDias(iso, -5), situacao: 'Programada' },
    { item: 'TQ-5C', tipo: 'Inspeção interna', ultima: addDias(iso, -1), proxima: addDias(iso, 1825), situacao: 'Executada' },
    { item: 'Casco · tanque de lastro 3S', tipo: 'Inspeção visual interna', ultima: addDias(iso, -60), proxima: addDias(iso, 20), situacao: 'Programada' },
    { item: 'Turret · swivel', tipo: 'Inspeção de classe', ultima: addDias(iso, -100), proxima: addDias(iso, 80), situacao: 'Programada' },
  ], 'A', 'Plano de inspeção · COEMB');

  const srv = (coord, titulo, detalhe, origem, abertura, ordem) => regs.push(mk('servico', { coord, titulo, detalhe, origem, abertura, ordem, exemplo: true }));
  srv('COPROD', 'Partida da Injection A', 'Compressão de injeção · PT [nº] · [horário]', 'PT', true, 1);
  srv('COPROD', 'Verificação dos PSLL-1210712 e 1210716', 'HPU subsea · PT [nº] · [horário]', 'PT', true, 2);
  srv('COPROD', 'Retorno da FGRU A', 'Recuperação de gás · PT [nº] · [horário]', 'PT', false, 3);
  srv('COPROD', 'Ajuste da inibição anti-incrustante', 'BUZ-061 e BUZ-074', 'M', false, 4);
  srv('COEMB', 'Offloading para o Maran Libra', 'Estação de offloading · PT [nº] · [horário]', 'PT', true, 1);
  srv('COEMB', 'Fechamento do TQ-5C', 'TQ-5C · PT [nº] · [horário]', 'PT', true, 2);
  srv('COEMB', 'Tratamento e pintura no TQ-4S', 'TQ-4S · PT [nº] · [horário]', 'PT', false, 3);
  srv('COEMB', 'Mangotes da filling station de proa', 'Água e diesel · aguardando material', 'M', false, 4);
  srv('COMAN', 'Reparo da eletrocloradora de vante', 'UE-5121501 · PT [nº] · [horário]', 'PT', true, 1);
  srv('COMAN', 'Componentes elétricos do AC-5252003A', 'M22 · aguardando contator e disjuntor', 'M', true, 2);
  srv('COMAN', 'Reparo da UD-5122501C', 'Dessalinização · PT [nº] · [horário]', 'PT', false, 3);
  srv('COMAN', 'Condensador do AC-5252001A', 'M17 · contratada · PT [nº] · [horário]', 'PT', false, 4);

  const item = (coord, tipo, texto, semaforo, ordem, detalhe = '') => regs.push(mk('item', { coord, tipo, texto, detalhe, semaforo, ordem, exemplo: true }));
  item('COPROD', 'ameaca', 'Injection A e FGRU A fora · injeção abaixo da meta e flare LP aberto', 'nok', 1);
  item('COPROD', 'ameaca', 'Nova falha de compressão eleva a queima com a FGRU sem reserva', 'at', 2);
  item('COEMB', 'ameaca', 'Lift de emergência fora de operação · bomba desarma por temperatura alta', 'at', 1);
  item('COEMB', 'ameaca', 'Água potável abaixo do mínimo em cerca de 6 dias', 'at', 2);
  item('COMAN', 'ameaca', 'Eletrocloradora de vante indisponível · a de ré opera sem reserva', 'at', 1);
  item('COMAN', 'ameaca', 'Duas unidades de HVAC inoperantes', 'at', 2);
  regs.push(mk('item', { coord: 'GEPLAT', tipo: 'pauta_extra', texto: 'Habitabilidade', detalhe: 'AC-5252003A (M22) inoperante', semaforo: 'at', ordem: 1, dono: '4º GEPLAT', prazo: addDias(iso, 2), exemplo: true }));   // D-61: pauta extra com dono e prazo
  const dst = (coord, texto, semaforo, abertura, extra) => { const r = mk('item', { coord, tipo: 'destaque', texto, semaforo, abertura, ordem: 1, exemplo: true, ...extra }); r.autor = { nome: coord + ' (exemplo)', chave: '', papel: coord }; regs.push(r); };
  dst('COEMB', 'Janela do offloading do Maran Libra depende do mar de amanhã', 'at', true, { tag: 'Estação de offloading', status: 'Atenção', impacto: 'Escoamento', categoria: 'Logística', pedido: 'Confirmar a janela com a logística', escalar: true });   // D-61: decisão do GEOP/gerência
  /* D-61 (proposta 25): decisões e aprendizados ficam registrados na reunião (exemplo de REDIA anterior, para mostrar o formato) */
  regs.push(mk('reuniao', { tipo: 'aprendizado', texto: 'Partida de compressor com a FGRU sem reserva: alinhar a sequência de partida com a base antes da manobra', exemplo: true }));
  item('GEPLAT', 'pauta_extra', 'Integridade', 'at', 2, 'Pintura: 64% realizado × 82% planejado');

  const sug = (coord, passagem, prioridade, origem, titulo, textoOriginal, extra = {}) => {
    const r = mk('sugestao', { coord, passagem, turno: passagem === '06:00' ? 'noturno' : 'diurno', dataPassagem: passagem === '06:00' ? iso : D1, prioridade, origem, titulo, textoOriginal, exemplo: true, ...extra });
    r.autor = { nome: 'Supervisor (exemplo)', chave: '', papel: 'supervisor' }; regs.push(r); return r;
  };
  const s1 = sug('COPROD', '06:00', 'alta', 'SUPROD · posto Gás', 'FGRU A indisponível e Injection A fora · flare LP aberto',
    'Queda da Injection A e da FGRU A no turno noturno; a FGRU A segue indisponível e o flare LP está aberto. Injeção de gás reduzida. NM [número].',
    { categoria: 'Falha / degradação', tag: 'FGRU A · Injection A', status: 'Indisponível', impacto: 'Queima' });
  const s2 = sug('COPROD', '06:00', 'media', 'SUPROD', 'Inibição anti-incrustante suspensa em dois poços abertos',
    'Inibição anti-incrustante segue suspensa no BUZ-061 e no BUZ-074; aguardando ajuste da bomba dosadora.',
    { categoria: 'Operação', tag: 'BUZ-061 e BUZ-074', status: 'Atenção', impacto: 'Integridade', abertoDias: 3 });
  // COPROD · passagem 06:00 (turno noturno): s1, s2 e mais duas
  sug('COPROD', '06:00', 'media', 'SUPROD · posto Óleo', 'BUZ-095 reaberto às 02:10 · em estabilização',
    'BUZ-095 reaberto às 02:10 após intervenção; vazão em estabilização, acompanhando BSW e pressão de chegada.',
    { categoria: 'Operação', tag: 'BUZ-095', status: 'Atenção', impacto: 'Produção' });
  sug('COPROD', '06:00', 'info', 'SUPROD · posto Água', 'Injeção de água na meta · pressão do BUZ-119 em elevação',
    'Injeção de água em 100% da meta no turno. Pressão de cabeça do BUZ-119 subindo de forma gradual; mantido em observação.',
    { categoria: 'Operação', tag: 'BUZ-119', status: 'Operando', impacto: 'Injeção' });
  // COPROD · passagem 18:00 de D-1 (turno diurno)
  sug('COPROD', '18:00', 'media', 'SUPROD', 'Falha na SDV-1235818 · possível restrição da produção',
    'SDV-1235818 não fechou no teste do turno diurno; equipe de automação avaliando.',
    { categoria: 'Falha / degradação', tag: 'SDV-1235818', status: 'Atenção', impacto: 'Produção' });
  sug('COPROD', '18:00', 'media', 'SUPROD · posto Óleo', 'BUZ-130 fechado para teste de produção',
    'BUZ-130 fechado às 15:30 para alinhamento ao teste de produção; previsão de reabertura após o teste.',
    { categoria: 'Operação', tag: 'BUZ-130', status: 'Atenção', impacto: 'Produção' });
  sug('COPROD', '18:00', 'info', 'SUPROD · posto Gás', 'TC-A partiu e estabilizou após a queda',
    'TC-A partiu e estabilizou no turno diurno. Queima associada à partida de cerca de 57 mil m³ pelo flare LP.',
    { categoria: 'Operação', tag: 'TC-A', status: 'Operando', impacto: 'Queima' });

  // GEPLAT · temas da plataforma (D-16: segurança, saúde, radioperador)
  sug('GEPLAT', '06:00', 'media', 'Téc. segurança → GEPLAT', 'Duas PTs de espaço confinado ativas (TQ-5C e TQ-4S)',
    'Permanecem ativas as PTs de entrada em espaço confinado no TQ-5C e no TQ-4S; vigias e monitoramento de atmosfera mantidos no turno noturno.',
    { categoria: 'Segurança', tag: 'TQ-5C · TQ-4S', status: 'Atenção', impacto: 'Segurança' });
  sug('GEPLAT', '06:00', 'info', 'Téc. segurança → GEPLAT', 'Simulado de abandono programado para hoje às 14:00',
    'Simulado de abandono programado para hoje às 14:00, com reunião prévia das brigadas às 13:30.',
    { categoria: 'Segurança', tag: 'Abandono', status: 'Disponível', impacto: 'Segurança' });
  sug('GEPLAT', '06:00', 'info', 'Enfermaria → GEPLAT', 'Um atendimento ambulatorial no turno, sem afastamento',
    'Um atendimento ambulatorial no turno noturno, sem afastamento e sem relação com o trabalho.',
    { categoria: 'Saúde', tag: 'Enfermaria', status: 'Disponível', impacto: 'Saúde' });
  sug('GEPLAT', '06:00', 'media', 'Radioperador → GEPLAT', 'Voo de troca de turma confirmado · POB em 181 de 190',
    'Voo de troca de turma confirmado para a janela da manhã. POB atual 181 para capacidade de 190.',
    { categoria: 'Logística', tag: 'POB', status: 'Disponível', impacto: 'Logística' });
  sug('GEPLAT', '18:00', 'info', 'Téc. segurança → GEPLAT', 'Teste de dilúvio do módulo M-10 concluído', 'Teste de dilúvio do M-10 concluído sem anomalias.', {});
  sug('GEPLAT', '18:00', 'media', 'Radioperador → GEPLAT', 'Previsão de mar com ondas de 2,5 m a partir de amanhã',
    'Previsão meteoceanográfica indica ondas de 2,5 m a partir de amanhã; avaliar impacto na janela do offloading.',
    { categoria: 'Logística', tag: 'Meteoceanografia', status: 'Atenção', impacto: 'Logística' });
  sug('GEPLAT', '18:00', 'media', 'Enfermaria → GEPLAT', 'Camarotes do M22 sem climatização · remanejamento a confirmar',
    'Com o AC-5252003A inoperante, camarotes do M22 seguem sem climatização; remanejamento de leitos a confirmar com a hotelaria.',
    { categoria: 'Saúde', tag: 'AC-5252003A', status: 'Inoperante', impacto: 'Habitabilidade', abertoDias: 4 });

  // COEMB
  sug('COEMB', '06:00', 'alta', 'SUEMB', 'Bomba do lift de emergência desarmou novamente', 'Bomba do lift de emergência desarmou por temperatura alta na partida de teste do turno noturno.',
    { categoria: 'Falha / degradação', tag: 'Lastro · lift de emergência', status: 'Indisponível', impacto: 'Segurança' });
  sug('COEMB', '06:00', 'media', 'SUEMB', 'Maran Libra na área · conexão do offloading prevista para 10:00',
    'Navio aliviador Maran Libra na área desde as 04:00; conexão do mangote prevista para 10:00, condicionada ao mar.',
    { categoria: 'Operação', tag: 'Estação de offloading', status: 'Disponível', impacto: 'Escoamento' });
  sug('COEMB', '06:00', 'media', 'SUEMB', 'BSW de 6% em três tanques · drenagem em andamento',
    'BSW em 6% nos TQ-1358505P, TQ-1358507S e TQ-5336508P/S; drenagem para o slop em andamento.',
    { categoria: 'Operação', tag: 'TQ-1358505P · TQ-1358507S · TQ-5336508P/S', status: 'Atenção', impacto: 'Escoamento', abertoDias: 2 });
  sug('COEMB', '06:00', 'info', 'SUEMB', 'Descarte de 557 m³ de slop ao mar em 24 h',
    'Descarte de 557 m³ de slop ao mar nas últimas 24 h, dentro dos parâmetros de TOG.',
    { categoria: 'Meio ambiente', tag: 'Slop', status: 'Disponível', impacto: 'Meio ambiente' });
  sug('COEMB', '18:00', 'info', 'SUEMB', 'TQ-5C inspecionado · aguarda fechamento',
    'Inspeção interna do TQ-5C concluída; tanque aguarda fechamento no turno de amanhã.',
    { categoria: 'Integridade', tag: 'TQ-5C', status: 'Em manutenção', impacto: 'Integridade' });
  sug('COEMB', '18:00', 'media', 'SUEMB', 'Sensor de calado XT-55206001 segue inoperante',
    'Sensor XT-55206001 segue inoperante; leitura de calado feita por escala visual a cada turno.',
    { categoria: 'Falha / degradação', tag: 'XT-55206001', status: 'Limitado', impacto: 'Segurança', abertoDias: 5 });
  sug('COEMB', '18:00', 'media', 'SUEMB', 'Tensão das amarras B-02 e C-02 sem comunicação',
    'PN-CJ-5200502B-02 e C-02 sem comunicação com o supervisório; leitura local feita no turno.',
    { categoria: 'Falha / degradação', tag: 'PN-CJ-5200502B-02 · C-02', status: 'Limitado', impacto: 'Segurança' });

  // COMAN (supervisões SUEIN e SUMEC)
  sug('COMAN', '06:00', 'alta', 'SUEIN', 'Eletrocloradora de vante segue fora · a de ré sem reserva',
    'Transformador da UE-5121501 em teste após reparo; sopradores ainda em manutenção. Eletrocloradora de ré opera sozinha.',
    { categoria: 'Falha / degradação', tag: 'UE-5121501', status: 'Sem reserva', impacto: 'Integridade' });
  sug('COMAN', '06:00', 'media', 'SUMEC', 'UD-5122501C desmontada · aguardando kit de vedação',
    'Dessalinizadora UD-5122501C desmontada; kit de vedação solicitado. Osmose alugada mantém a produção de água.',
    { categoria: 'Integridade', tag: 'UD-5122501C', status: 'Indisponível', impacto: 'Utilidades', abertoDias: 6 });
  sug('COMAN', '06:00', 'media', 'SUEIN', 'Ponto de orvalho da secadora do UC-5134501B em −10 °C',
    'Secadora do UC-5134501B com ponto de orvalho em −10 °C; A em −26 °C e C em −60 °C. Avaliar troca do dessecante.',
    { categoria: 'Falha / degradação', tag: 'UC-5134501B', status: 'Atenção', impacto: 'Utilidades' });
  sug('COMAN', '06:00', 'media', 'SUMEC', 'WHRU do TG-B e do TG-C molhados e restringidos',
    'WHRU do TG-B e do TG-C seguem molhados e restringidos; TG-B em stand-by.',
    { categoria: 'Falha / degradação', tag: 'TG-B · TG-C', status: 'Limitado', impacto: 'Utilidades' });
  sug('COMAN', '18:00', 'media', 'SUMEC', 'Vazamento no condensador do AC-5252001A (M17)', 'Vazamento no condensador do AC-5252001A confirmado; contratada acionada.',
    { categoria: 'Falha / degradação', tag: 'AC-5252001A', status: 'Inoperante', impacto: 'Habitabilidade' });
  sug('COMAN', '18:00', 'media', 'SUEIN', 'AC-5252003A (M22): faltam contator e disjuntor',
    'Compressor do AC-5252003A instalado; faltam contator, disjuntor e PSVs novas para o retorno.',
    { categoria: 'Integridade', tag: 'AC-5252003A', status: 'Inoperante', impacto: 'Habitabilidade', abertoDias: 8 });
  sug('COMAN', '18:00', 'info', 'SUEIN', '15 notas IF6 abertas e 7 sensores em falha',
    'Fechamento do turno: 15 notas IF6 abertas e 7 sensores em falha registrados.',
    { categoria: 'Integridade', tag: 'IF6', status: 'Atenção', impacto: 'Integridade' });

  // D-63 (proposta 29): sugestões de REDIAs anteriores com a mesma TAG (recorrência · FGRU A em 3 REDIAs em 30 dias; UE-5121501 em 3)
  for (const [k, coord, tag, titulo] of [[5, 'COPROD', 'FGRU A · Injection A', 'FGRU A desarmou por alta temperatura'], [12, 'COPROD', 'FGRU A · Injection A', 'FGRU A indisponível · troca de selo'], [3, 'COMAN', 'UE-5121501', 'Eletrocloradora de vante em falha'], [10, 'COMAN', 'UE-5121501', 'Transformador da UE-5121501 em reparo']]) {
    const r = mk('sugestao', { coord, passagem: '06:00', turno: 'noturno', dataPassagem: addDias(iso, -k), prioridade: 'media', origem: 'SUPROD', titulo, textoOriginal: titulo + '.', tag, categoria: 'Falha / degradação', status: 'Indisponível', impacto: 'Queima', exemplo: true });
    r.data = addDias(iso, -k); r.autor = { nome: 'Supervisor (exemplo)', chave: '', papel: 'supervisor' }; regs.push(r);
  }
  // D-52: na demonstração, todas as sugestões dos supervisores chegam às curadorias sem classificação (nenhuma decisão prévia)

  /* PFCEO (D-54): COPROD inclui um sistema normal na tela e destaca a FGRU na abertura; COEMB e COMAN ficam com a aprovação automática dos desvios */
  const selPf = (coord, sel) => { const r = mk('selecao', { coord, campo: 'pfceo', fora: [], extra: [], abertura: [], ...sel, exemplo: true }); r.autor = { nome: coord + ' (exemplo)', chave: '', papel: coord }; regs.push(r); };
  selPf('COPROD', { extra: ['compressão principal|main a/b/c'], abertura: ['fgru · recuperação de gás de flare|fgru a/b/c'] });
  const dem = (titulo, sentido, responsavel, prazo, origem, coord, dataRedia) => {
    const r = mk('demanda', { titulo, sentido, responsavel, prazo, origem, coord, dataRedia, status: 'aberta', exemplo: true }, { escopo: 'demandas' });
    r.data = dataRedia; regs.push(r);
  };
  dem('Envio do contator e do disjuntor do AC-5252003A', 'bordo → base', '4º COMAN', addDias(iso, -1), 'C', 'COMAN', addDias(iso, -4));
  dem('Plano de recuperação do lift de emergência', 'bordo → base', '4º COEMB', iso, 'C', 'COEMB', addDias(iso, -3));
  dem('Programação do próximo alívio', 'base → bordo', 'COEMB de bordo', addDias(iso, 4), 'C', 'COEMB', addDias(iso, -1));

  dem('Plano de retorno da FGRU A e impacto na queima do mês', 'bordo → base', '4º COPROD', addDias(iso, 1), 'C', 'COPROD', addDias(iso, -2));
  dem('Programação do teste de vazão do BUZ-112', 'base → bordo', 'COPROD de bordo', addDias(iso, 2), 'C', 'COPROD', addDias(iso, -1));
  dem('Kit de vedação da UD-5122501C', 'bordo → base', '4º COMAN', addDias(iso, 3), 'C', 'COMAN', addDias(iso, -2));

  // Resultados de análises (eplab) · exemplo com uma análise atrasada por coordenação e algumas sem resultado na origem
  const lab = (coord, k, valor, diasAtras, hora = '05:10') => { val(`lab.${coord}.${k}`, valor, 'A', `eplab ${hora}`); val(`lab.${coord}.${k}.data`, addDias(iso, -diasAtras), 'A', `eplab ${hora}`); };
  lab('COPROD', 'bsw_oleo', 0.25, 1); lab('COPROD', 'sal_oleo', 57, 1); lab('COPROD', 'tog_agua', 18, 1); lab('COPROD', 'h2s_gas', 4, 11); lab('COPROD', 'so4_urs', 28, 1); lab('COPROD', 'o2_inj', 12, 1); lab('COPROD', 'h2o_gas', 45, 1);
  lab('COEMB', 'bsw_tq', 0.40, 1); lab('COEMB', 'tog_slop', 22, 1); lab('COEMB', 'cl_pot', 0.8, 1); lab('COEMB', 'turb_pot', 0.6, 9);
  lab('COMAN', 'visc_tg', 30.8, 12); lab('COMAN', 'agua_tg', 85, 12); lab('COMAN', 'ph_resf', 8.2, 10); lab('COMAN', 'cond_dess', 410, 1);
  return regs;
}
/* D-65 · histórico de REDIAs: monta os dias D-n a D-1 como REDIAs completas e encerradas (dados, listas, sugestões dos
   supervisores e decisões da curadoria, ameaças, demandas do Canal Base x Bordo, decisões/aprendizados/tempos da reunião,
   pauta congelada às 08:40 e ata fechada), para que tendências, recorrência, visão semanal, histórico e arquivo tenham base.
   Tudo marcado como exemplo (payload.exemplo e payload.historico). */
const HIST_SUG = {   // 8 por coordenação; só a passagem das 06:00 dos dias pares leva TAG: no histórico de 15 dias cada TAG aparece 1 ou 2 vezes (a recorrência fica para os casos do exemplo)
  COPROD: [['FGRU A desarmou por alta temperatura', 'FGRU A', 'Queima'], ['BSW elevado no BUZ-095 após reabertura', 'BUZ-095', 'Produção'], ['Oscilação de nível no separador de teste', 'LIT-1223007', 'Produção'], ['TC-A partiu após trip por vibração', 'TC-A', 'Queima'], ['Dosagem de anti-incrustante ajustada no BUZ-074', 'BUZ-074', 'Produção'], ['Alarme de alta pressão no vaso de flare', 'PIT-5410001', 'Queima'], ['Troca de filtro da injeção de água', 'F-1251001', 'Injeção'], ['Main C em stand-by após teste', 'Main C', 'Injeção']],
  COEMB: [['Água potável em queda com a UD-5122501C fora', 'UD-5122501C', 'Utilidades'], ['Conexão do offloading adiada pelo mar', 'Estação de offloading', 'Escoamento'], ['Sensor de calado inoperante', 'XT-55206001', 'Segurança'], ['Drenagem do TQ-3C para o slop', 'TQ-3C', 'Escoamento'], ['Gerador de gás inerte B no diesel', 'GGI B', 'Utilidades'], ['Inspeção do mangote de proa', 'Mangote de proa', 'Escoamento'], ['Bomba de lastro 2 com vibração', 'B-5320002', 'Integridade'], ['Teste do sistema de amarração', 'Amarração', 'Integridade']],
  COMAN: [['Eletrocloradora de vante em falha', 'UE-5121501', 'Integridade'], ['HVAC do M22 inoperante', 'AC-5252003A', 'Habitabilidade'], ['WHRU do TG-C restringido', 'TG-C', 'Utilidades'], ['Compressor de ar C em manutenção', 'UC-5134501C', 'Utilidades'], ['Inversor da bomba de incêndio B com alarme', 'P-5411002B', 'Segurança'], ['Iluminação de emergência do M-14 em falha', 'M-14', 'Segurança'], ['Troca de óleo do TG-A', 'TG-A', 'Utilidades'], ['Detector de gás do M-10 em falha', 'GD-5243012', 'Segurança']],
  GEPLAT: [['PT de espaço confinado no TQ-4S', '', 'Segurança'], ['Voo de troca de turma confirmado', '', 'Logística'], ['Simulado de abandono realizado', '', 'Segurança'], ['Atendimento ambulatorial sem afastamento', '', 'Saúde'], ['Auditoria interna de SMS programada', '', 'Segurança']],
};
const HIST_DEM = [['Peças para a FGRU A', 'bordo → base', '4º COPROD', 'COPROD'], ['Programação do próximo alívio', 'base → bordo', 'COEMB de bordo', 'COEMB'], ['Kit de vedação da dessalinizadora', 'bordo → base', '4º COMAN', 'COMAN'], ['Janela da embarcação para o BUZ-047', 'base → bordo', 'COPROD de bordo', 'COPROD'], ['Laudo da amostra de óleo diesel', 'bordo → base', '4º COEMB', 'COEMB']];
const HIST_DEC = ['Manter a FGRU A fora até a troca do selo', 'Antecipar o teste de vazão do BUZ-112', 'Priorizar a dessalinizadora C na manutenção', 'Reduzir a vazão do BUZ-095 até estabilizar o BSW', 'Adiar a conexão do offloading para a janela da tarde'];
const HIST_APZ = ['Confirmar a janela do navio antes de programar o offloading', 'Registrar a queima estimada antes de cada partida de compressor', 'Checar o estoque de químicos antes do fim de semana'];
function montarHistorico(iso, dias = 15) {
  const regs = [], autor = c => ({ nome: (c || 'GEPLAT') + ' (exemplo)', chave: '', papel: c || 'GEPLAT' });
  const mk = (tipo, dia, hora, payload, extra = {}) => ({ v: 1, id: uid(), tipo, data: dia, uep: CFG.uep, criadoEm: `${dia}T${hora}:00.000Z`, gravadoEm: carimbo(), autor: autor(payload.coord), payload: { ...payload, exemplo: true, historico: true }, ...extra });
  for (let k = dias; k >= 1; k--) {
    const dia = addDias(iso, -k), n = numDia(dia), f = `BDO D-1 · REDIA ${ddmm(dia)}`, sit = `SITOP ${ddmm(dia)} 00:37`;
    regs.push(mk('redia', dia, '09:02', { coord: 'GEPLAT', codigo: codigoRedia(CFG.uep, dia), iniciadaPor: 'GEPLAT' }));   // D-67: abertura da REDIA com o código único
    // dados e listas (mesmos números do exemplo para a mesma data)
    for (const [campo, valor] of Object.entries(valoresTendDia(dia))) regs.push(mk('valor', dia, '06:41', { campo, valor, origem: 'A', fonte: f }));
    for (const [campo, valor] of Object.entries(gasQueimaDia(dia))) regs.push(mk('valor', dia, '06:42', { campo, valor, origem: 'A', fonte: sit }));
    for (const [campo, valor] of [['oleo.potencial', 26869], ['iuga.meta', 97], ['gas.meta', 5500], ['agua.meta', 17400], ['pob.atual', 176 + (n % 12)], ['pob.max', 190], ['off.estoque', 60000 + ((n * 27135) % 140000)]]) regs.push(mk('valor', dia, '06:43', { campo, valor, origem: 'A', fonte: sit }));
    const ls = listasDia(dia);
    regs.push(mk('lista', dia, '06:44', { campo: 'queima.causas', itens: ls.causas, origem: 'A', fonte: sit }));
    if (ls.perda.length) regs.push(mk('lista', dia, '06:44', { campo: 'oleo.deferimento', itens: ls.perda, origem: 'A', fonte: `BDO ${ddmm(dia)}` }));
    // passagens de serviço (06:00 e 18:00 da véspera) e curadoria
    for (const [coord, pool] of Object.entries(HIST_SUG)) for (let j = 0; j < (n % 2 ? 2 : 1); j++) {
      const [titulo, tag0, impacto] = pool[(n * 3 + j * 5) % pool.length], tag = j || n % 2 ? '' : tag0, pas = j ? '18:00' : '06:00';
      const sg = mk('sugestao', dia, j ? '07:02' : '07:01', { coord, passagem: pas, turno: j ? 'diurno' : 'noturno', dataPassagem: j ? addDias(dia, -1) : dia, prioridade: j ? 'media' : 'alta', origem: coord === 'GEPLAT' ? 'Téc. segurança → GEPLAT' : 'Supervisor', titulo, textoOriginal: titulo + '.', tag, categoria: 'Falha / degradação', status: 'Atenção', impacto });
      sg.autor = { nome: 'Supervisor (exemplo)', chave: '', papel: 'supervisor' }; regs.push(sg);
      const recusa = j === 1 && n % 3 === 0;
      regs.push(mk('decisao', dia, '07:45', recusa ? { coord, alvo: sg.id, acao: 'recusar', motivo: 'Já tratado na passagem anterior' } : { coord, alvo: sg.id, acao: 'aprovar', titulo, tag, status: 'Atenção', impacto, semaforo: j ? 'at' : (n % 4 === 0 ? 'nok' : 'at'), abertura: j === 0 }));
    }
    for (const coord of ['COPROD', 'COEMB', 'COMAN']) { const [t] = HIST_SUG[coord][(n * 3) % HIST_SUG[coord].length]; regs.push(mk('item', dia, '07:50', { coord, tipo: 'ameaca', texto: t, semaforo: 'at', ordem: 1 })); }
    for (const coord of COORDS) regs.push(mk('conclusao', dia, '08:05', { coord, concluido: true }));
    // Canal Base x Bordo: uma demanda a cada 2 dias; as antigas fechadas (no prazo ou com atraso)
    if (n % 2 === 0) {
      const [titulo, sentido, responsavel, coord] = HIST_DEM[(n / 2) % HIST_DEM.length | 0], prazo = addDias(dia, 3);
      const d = mk('demanda', dia, '09:30', { titulo, sentido, responsavel, prazo, origem: 'C', coord, dataRedia: dia, status: 'aberta' }, { escopo: 'demandas' }); regs.push(d);
      if (k > 5) { const fim = addDias(dia, n % 4 === 0 ? 2 : 5); regs.push(mk('atualiza', fim, '10:00', { coord, alvo: d.id, campos: { status: 'encerrada', statusEm: `${fim}T13:00:00.000Z` } }, { escopo: 'demandas' })); }
    }
    // reunião: tempos medidos por bloco, decisão e aprendizado
    let ini = Date.parse(`${dia}T11:45:00.000Z`);
    for (let b = 1; b <= 5; b++) { const seg = 250 + ((n * 37 + b * 53) % 140); regs.push(mk('reuniao', dia, '12:' + pad(5 + b * 8), { tipo: 'tempo', bloco: b, inicio: new Date(ini).toISOString(), fim: new Date(ini + seg * 1000).toISOString(), segundos: seg, timebox: CFG.timeboxMin * 60 })); ini += seg * 1000; }
    const dec = HIST_DEC[n % HIST_DEC.length];
    regs.push(mk('reuniao', dia, '12:40', { tipo: 'decisao', texto: dec, por: 'GEOP', coord: 'GEPLAT' }));
    if (n % 3 === 0) regs.push(mk('reuniao', dia, '12:41', { tipo: 'aprendizado', texto: HIST_APZ[n % HIST_APZ.length] }));
    // pauta congelada às 08:40 e ata fechada (PDF gerado sob demanda na área Arquivo)
    regs.push(mk('congelamento', dia, '11:40', { coord: 'GEPLAT', snapshot: {}, hash: hash(dia + CFG.uep), semConclusao: [] }));
    regs.push(mk('acordo', dia, '13:00', { coord: 'GEPLAT', codigo: codigoRedia(CFG.uep, dia) }));   // D-67: de acordo para o fechamento
    regs.push(mk('ata', dia, '13:05', { coord: 'GEPLAT', codigo: codigoRedia(CFG.uep, dia), participantes: ['GEPLAT de bordo', 'COPROD de bordo', 'COEMB de bordo', 'COMAN de bordo', 'GEOP (base)', '4º COPROD (base)'], observacoes: dec + '.', formato: 'pdf', paginas: null, telas: null }));
  }
  return regs;
}
/* dias já encerrados ou congelados na base: o histórico não grava neles (não sobrescreve REDIA real nem duplica um histórico já gravado) */
async function diasFechados() {
  const arq = await Store.arquivo(), por = {};
  for (const r of arq.slice().reverse()) { const d = (por[r.data] ||= { ata: false, cong: false, redia: false }); if (r.tipo === 'ata') d.ata = true; else if (r.tipo === 'redia') d.redia = true; else d.cong = r.tipo === 'congelamento'; }
  return new Set(Object.entries(por).filter(([, d]) => d.ata || d.cong || d.redia).map(([dia]) => dia));
}
function filtrarDias(regs, fechados) {
  const diaDe = r => r.escopo === 'demandas' ? (r.payload.dataRedia || r.data) : r.data, encerra = r => r.tipo === 'atualiza' && r.escopo === 'demandas';
  const out = regs.filter(r => !encerra(r) && !fechados.has(diaDe(r))), ids = new Set(out.map(r => r.id));
  return [...out, ...regs.filter(r => encerra(r) && ids.has(r.payload.alvo))];
}
async function gravarHistorico(iso, dias = 15) {
  const fechados = await diasFechados(), regs = filtrarDias(montarHistorico(iso, dias), fechados);
  const n = regs.length ? await Store.gravarLote(regs) : 0;
  return { n, dias: new Set(regs.filter(r => r.escopo !== 'demandas').map(r => r.data)).size, pulados: [...fechados].filter(d => d < iso && d >= addDias(iso, -dias)).length };
}
async function carregarExemplo(iso) {
  const ex = montarExemplo(iso), hist = montarHistorico(iso, 15);
  if (![...Store.cache.values()].some(r => r.data === iso && r.tipo === 'redia')) ex.unshift({ ...ex[0], id: uid(), tipo: 'redia', escopo: undefined, payload: { coord: 'GEPLAT', codigo: codigoRedia(CFG.uep, iso), iniciadaPor: 'GEPLAT', exemplo: true } });   // D-67: o exemplo abre a REDIA do dia
  const chave = r => (r.tipo === 'valor' || r.tipo === 'lista') ? r.data + '|' + r.tipo + '|' + r.payload.campo : null;
  const vistos = new Set(ex.map(chave).filter(Boolean));
  const fechados = await diasFechados(); fechados.delete(iso);   // o dia aberto recebe o exemplo mesmo com a REDIA já iniciada
  const regs = filtrarDias([...ex, ...hist.filter(r => { const k = chave(r); return !k || !vistos.has(k); })], fechados);
  await Store.gravarLote(regs);   // na nuvem: em lotes, numa ida só por lote
  return regs.length;
}
/* D-67 · versão de teste: preenche a REDIA aberta com valores fictícios para todas as coordenações e o GEPLAT, sem apagar o que já foi
   preenchido: campos e listas vazios, sugestões (se o dia não tem), itens e serviços das coordenações sem registro, aprovação das sugestões
   pendentes e conclusão do preenchimento. Tudo marcado como exemplo/fictício (não conta para o de acordo da ata). */
async function preencherFicticio(iso, E) {
  const ex = montarExemplo(iso), novos = [], marca = r => ({ ...r, payload: { ...r.payload, exemplo: true, ficticio: true } });
  const temItem = c => E.itens.some(i => i.payload.coord === c), temServ = c => E.servicos.some(i => i.payload.coord === c);
  for (const r of ex) {
    if (r.escopo === 'demandas' || r.tipo === 'redia' || r.data !== iso) continue;   // D-69: só o dia aberto (o exemplo traz também valores de dias anteriores, que estão encerrados)
    if (r.tipo === 'valor' && (E.valores[r.payload.campo]?.valor ?? '') !== '') continue;
    if (r.tipo === 'lista' && (E.listas[r.payload.campo]?.itens || []).length) continue;
    if (r.tipo === 'sugestao' && E.sugestoes.length) continue;
    if (r.tipo === 'item' && temItem(r.payload.coord)) continue;
    if (r.tipo === 'servico' && temServ(r.payload.coord)) continue;
    if (r.tipo === 'conclusao' || r.tipo === 'congelamento' || r.tipo === 'ata' || r.tipo === 'reabertura') continue;
    novos.push(marca(r));
  }
  const suges = [...E.sugestoes.filter(s => !s.payload.somenteLeitura && (!s.decisao || s.decisao.payload.acao === 'reabrir')), ...novos.filter(r => r.tipo === 'sugestao')];
  let t = Date.now();
  const mk = (tipo, payload) => ({ v: 1, id: uid(), tipo, data: iso, uep: CFG.uep, criadoEm: new Date(t += 1000).toISOString(), gravadoEm: carimbo(), autor: { nome: 'Preenchimento fictício', chave: '', papel: 'sistema' }, payload: { ...payload, exemplo: true, ficticio: true } });
  suges.forEach((s, k) => { const p = s.payload; novos.push(mk('decisao', { coord: p.coord, alvo: s.id, acao: 'aprovar', titulo: p.titulo, tag: p.tag || '', status: p.status || 'Atenção', impacto: p.impacto || '', semaforo: k % 5 === 0 ? 'nok' : 'at', abertura: k % 3 === 0 })); });
  for (const c of COORDS) if (!E.conclusoes[c]?.payload.concluido) novos.push(mk('conclusao', { coord: c, concluido: true, pendentes: 0 }));
  if (novos.length) await Store.gravarLote(novos);
  return { n: novos.length, valores: novos.filter(r => r.tipo === 'valor').length, listas: novos.filter(r => r.tipo === 'lista').length, aprovadas: suges.length };
}
/* D-75 · versão de teste: ata automática às 23:59 · se o dia não tem ata arquivada, gera os registros que faltam para a REDIA ficar
   completa e fechada, mantendo a base do período de teste atualizada. Usa o mesmo gerador do exemplo: preenche só o que está vazio (se a pauta ainda não foi congelada), aprova as sugestões
   pendentes, conclui as coordenações, congela, dá o de acordo e fecha a ata (dia sem REDIA iniciada: abre a REDIA e preenche tudo). Tudo marcado como fictício e "automática". Função pura:
   recebe os registros do dia e devolve os novos (o app grava na demonstração; a função do servidor grava na base). */
function montarAtaAutomatica(iso, regsDia) {
  const dia = regsDia.filter(r => r.data === iso && r.escopo !== 'demandas'), codigo = codigoRedia(CFG.uep, iso);
  if (dia.some(r => r.tipo === 'ata')) return [];
  const obs = 'Ata gerada automaticamente às 23:59 porque a REDIA do dia não foi encerrada (versão de teste). Campos vazios preenchidos com dados fictícios.';
  const auto = r => ({ ...r, payload: { ...r.payload, exemplo: true, ficticio: true, automatica: true } });
  let t = Date.parse(`${iso}T23:57:00-03:00`);
  const sis = { nome: 'REDIA · ata automática', chave: '', papel: 'sistema' };
  const mk = (tipo, payload) => auto({ v: 1, id: uid(), tipo, data: iso, uep: CFG.uep, criadoEm: new Date(t += 1000).toISOString(), gravadoEm: carimbo(), autor: sis, payload });
  const tem = tp => dia.some(r => r.tipo === tp), ult = tp => dia.filter(r => tp.includes(r.tipo)).sort((a, b) => (a.gravadoEm || a.criadoEm) < (b.gravadoEm || b.criadoEm) ? -1 : 1).pop();
  const out = [];
  if (!tem('redia')) { const r = mk('redia', { coord: 'GEPLAT', codigo, iniciadaPor: 'sistema' }); out.push(r); dia.push(r); }   // dia sem REDIA iniciada: abre e preenche tudo
  const congelada = ult(['congelamento', 'reabertura'])?.tipo === 'congelamento';
  if (!congelada) {
    const comValor = new Set(dia.filter(r => r.tipo === 'valor' && r.payload.valor !== '' && r.payload.valor != null).map(r => r.payload.campo));
    const comLista = new Set(dia.filter(r => r.tipo === 'lista' && (r.payload.itens || []).length).map(r => r.payload.campo));
    const coordCom = tp => new Set(dia.filter(r => r.tipo === tp).map(r => r.payload.coord));
    const itens = coordCom('item'), servs = coordCom('servico'), temSug = tem('sugestao');
    for (const r of montarExemplo(iso)) {
      if (r.escopo === 'demandas' || r.data !== iso || ['redia', 'conclusao', 'congelamento', 'reabertura', 'acordo', 'ata', 'notificacao'].includes(r.tipo)) continue;
      if (r.tipo === 'valor' ? comValor.has(r.payload.campo) : r.tipo === 'lista' ? comLista.has(r.payload.campo) : r.tipo === 'sugestao' || r.tipo === 'decisao' ? temSug
        : r.tipo === 'item' ? itens.has(r.payload.coord) : r.tipo === 'servico' ? servs.has(r.payload.coord) : tem(r.tipo)) continue;
      out.push(auto({ ...r, autor: r.autor || sis }));
    }
    const decididas = new Set([...dia, ...out].filter(r => r.tipo === 'decisao').map(r => r.payload.alvo));
    [...dia, ...out].filter(r => r.tipo === 'sugestao' && !r.payload.somenteLeitura && !decididas.has(r.id)).forEach((s, k) => { const p = s.payload; out.push(mk('decisao', { coord: p.coord, alvo: s.id, acao: 'aprovar', titulo: p.titulo, tag: p.tag || '', status: p.status || 'Atenção', impacto: p.impacto || '', semaforo: 'at', abertura: k % 3 === 0 })); });
    const concl = {}; dia.filter(r => r.tipo === 'conclusao').forEach(r => { concl[r.payload.coord] = r.payload.concluido; });
    for (const c of COORDS) if (!concl[c]) out.push(mk('conclusao', { coord: c, concluido: true, pendentes: 0 }));
    out.push(mk('congelamento', { coord: 'GEPLAT', snapshot: {}, hash: hash(iso + CFG.uep + 'auto'), semConclusao: [] }));
  }
  out.push(mk('acordo', { coord: 'GEPLAT', codigo }));
  out.push(mk('ata', { coord: 'GEPLAT', codigo, participantes: ['Ata automática (23:59)'], observacoes: obs, formato: 'pdf', paginas: null, telas: null }));
  return out;
}
/* EXEMPLO-FIM */
