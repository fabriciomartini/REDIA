/* ===================== REDIA P-83 · captura automática de dados (D-52) ===================== */
'use strict';
/* "Capturar dados" em cada bloco da aba Dados automáticos.
   Cada campo tem um sistema de origem. A lógica de captura conecta a cada sistema, consulta os campos,
   valida e grava o que encontrou como origem A (automático), com a fonte e a hora. O que não for
   encontrado vira alerta, com pedido de preenchimento manual.
   ESTADO ATUAL: as integrações com os sistemas da Petrobras ainda não estão liberadas (I-01 SITOP,
   I-02 BDO, I-03 PFCEO, I-51 eplab, I-13 passagem de serviço). Até lá, cada conector roda em modo SIMULADO: devolve os valores
   do conjunto de exemplo do dia e marca a fonte como "simulado". Para ligar um sistema real, troque
   o método buscar() do conector, mantendo o mesmo contrato ({ campo: { valor } | { itens } }). */
const FONTES_CAPTURA = {
  BDO: { nome: 'BDO', desc: 'Boletim Diário de Operação · D-1', pendencia: 'I-02' },
  SITOP: { nome: 'SITOP', desc: 'SITOP Digital', pendencia: 'I-01' },
  METAS: { nome: 'Metas da UEP', desc: 'Metas anuais e potencial da UEP', pendencia: 'I-05' },
  EPLAB: { nome: 'eplab', desc: 'Resultados de análises laboratoriais', pendencia: 'I-51' },
  PFCEO: { nome: 'PFCEO', desc: 'Painel de Funções Críticas · status e disponibilidade', pendencia: 'I-03' },
  APLAT: { nome: 'APLAT', desc: 'Planejamento diário das permissões de trabalho', pendencia: 'I-24' },
  PASSAGEM: { nome: 'Passagem de serviço', desc: 'Status dos equipamentos informado pelo operador do posto', pendencia: 'I-13' },
};
/* campos que nunca são capturados: correções manuais dos acumulados do mês (D-43) */
const NAO_CAPTURAR = new Set(['iuga.gas_prod_mes', 'queima.acum_mes', 'iuga.margem']);   // correções manuais e a margem da reserva tática (D-57)
const CAMPOS_BDO = new Set(['oleo.real', 'iuga.real', 'gas.real', 'gas.ref', 'agua.real', 'agua.urs', 'agua.prod_reinj', 'agua.prod_desc', 'agua.ref', 'queima.ref']);
const LISTAS_BDO = new Set(['queima.eventos']);
function fonteDoCampo(id) {
  if (id.startsWith('lab.')) return 'EPLAB';
  if (id.startsWith('eq.')) return 'PASSAGEM';
  if (id.startsWith('pfceo.')) return 'PFCEO';
  if (id.startsWith('servicos.')) return 'APLAT';
  if (/\.meta$/.test(id)) return 'METAS';
  if (CAMPOS_BDO.has(id) || LISTAS_BDO.has(id)) return 'BDO';
  return 'SITOP';
}
const capturavel = id => !NAO_CAPTURAR.has(id);

/* conector simulado: o "sistema" responde com os valores automáticos do exemplo do dia */
function conectorSimulado(chave) {
  return {
    chave, modo: 'simulado',
    async buscar(ids, iso) {
      const regs = typeof montarExemplo === 'function' ? montarExemplo(iso) : [];
      const base = {};
      for (const r of regs) {
        if (r.data !== iso || !['valor', 'lista'].includes(r.tipo) || r.payload.origem !== 'A') continue;
        base[r.payload.campo] = r.tipo === 'lista' ? { itens: r.payload.itens } : { valor: r.payload.valor };
      }
      const out = {};
      for (const id of ids) if (base[id] && fonteDoCampo(id) === chave) out[id] = base[id];
      return out;
    },
  };
}
const CONECTORES = Object.fromEntries(Object.keys(FONTES_CAPTURA).map(k => [k, conectorSimulado(k)]));
/* APLAT simulado: PTs planejadas para o dia na coordenação = as PTs do exemplo + as novas do APLAT de exemplo */
CONECTORES.APLAT.buscar = async (ids, iso) => {
  const regs = typeof montarExemplo === 'function' ? montarExemplo(iso) : [], out = {};
  for (const id of ids) {
    const coord = id.split('.')[1];
    const pts = regs.filter(r => r.tipo === 'servico' && r.payload.coord === coord && r.payload.origem === 'PT').map(r => ({ titulo: r.payload.titulo, detalhe: r.payload.detalhe }));
    for (const [titulo, detalhe] of (typeof APLAT_EXEMPLO_NOVAS !== 'undefined' ? APLAT_EXEMPLO_NOVAS[coord] || [] : [])) pts.push({ titulo, detalhe });
    if (pts.length) out[id] = { itens: pts };
  }
  return out;
};

const Captura = {
  pausa: ms => new Promise(r => setTimeout(r, Captura.rapida ? 0 : ms)),
  rapida: false,
  /* alvo: { campos: [id], listas: [id] }; aoPasso({ pct, passos, atual }) é chamado a cada etapa */
  async executar(alvo, aoPasso = () => { }) {
    const campos = (alvo.campos || []).filter(capturavel), listas = (alvo.listas || []).filter(capturavel);
    const porFonte = {};
    for (const id of [...campos, ...listas]) (porFonte[fonteDoCampo(id)] ||= []).push(id);
    const fontes = Object.keys(porFonte);
    const passos = [];
    for (const f of fontes) {
      const n = porFonte[f].length, F = FONTES_CAPTURA[f];
      passos.push({ id: f + ':con', txt: `Conectando ao ${F.nome}`, st: 'fila' });
      passos.push({ id: f + ':qry', txt: `Consultando ${n} ${n === 1 ? 'item' : 'itens'} no ${F.nome}`, st: 'fila' });
      passos.push({ id: f + ':val', txt: `Validando os dados do ${F.nome}`, st: 'fila' });
    }
    passos.push({ id: 'gravar', txt: 'Gravando na REDIA com origem e hora', st: 'fila' });
    let feitos = 0;
    const passo = async (id, ms, fn) => {
      const p = passos.find(x => x.id === id); p.st = 'exec'; aoPasso({ pct: feitos / passos.length * 100, passos });
      await Captura.pausa(ms);
      try { const r = fn ? await fn() : null; p.st = 'ok'; if (r) p.nota = r; }
      catch (e) { p.st = 'erro'; p.nota = e.message; }
      feitos++; aoPasso({ pct: feitos / passos.length * 100, passos });
    };
    const achados = {}, faltando = [], mantidos = [], hora = hhmm(Date.now());
    for (const f of fontes) {
      const con = CONECTORES[f]; let resp = {};
      await passo(f + ':con', 350, () => con.modo === 'simulado' ? 'modo simulado' : null);
      await passo(f + ':qry', 500, async () => { resp = await con.buscar(porFonte[f], DIA); const n = Object.keys(resp).length; return `${n} de ${porFonte[f].length} encontrados`; });
      await passo(f + ':val', 250, () => {
        let ruins = 0;
        for (const id of porFonte[f]) {
          const r = resp[id], c = CAMPO[id];
          const ok = r && (r.itens ? r.itens.length > 0 : r.valor !== null && r.valor !== undefined && r.valor !== '' && !(c?.tipo === 'num' && isNaN(+r.valor)));
          if (ok) achados[id] = { ...r, fonte: `${FONTES_CAPTURA[f].nome} ${hora}${f === 'PASSAGEM' && CAMPO[id]?.equip ? ' · posto ' + EQUIP.find(e => e.id === CAMPO[id].equip).posto : ''}${con.modo === 'simulado' ? ' · simulado' : ''}` };
          else {
            if (r) ruins++;
            const atual = LISTA[id] ? (E.listas[id]?.itens || []).length : (v => v !== null && v !== undefined && v !== '')(E.valores[id]?.valor);
            (atual ? mantidos : faltando).push({ id, fonte: FONTES_CAPTURA[f].nome });   // sem valor na origem: mantém o manual, se houver
          }
        }
        return ruins ? `${ruins} valor(es) inválido(s) descartado(s)` : null;
      });
    }
    let gravados = 0, iguais = 0, mantidosOcultos = 0; const substituidos = [];
    await passo('gravar', 300, async () => {
      const regs = [];
      for (const [id, r] of Object.entries(achados)) {
        if (id.startsWith('servicos.')) {   // PTs do APLAT: entram como serviços (origem PT); as já listadas ou ocultadas pelo coordenador não se repetem
          const coord = id.split('.')[1], k = t => String(t || '').trim().toLowerCase();
          const ja = new Set(E.servicos.filter(x => x.payload.coord === coord).map(x => k(x.payload.titulo))), ocultas = new Set(E.servicosOcultos.filter(x => x.payload.coord === coord).map(x => k(x.payload.titulo)));
          let ordem = E.servicos.filter(x => x.payload.coord === coord).length;
          for (const pt of r.itens) {
            if (ja.has(k(pt.titulo))) { iguais++; continue; }
            if (ocultas.has(k(pt.titulo))) { mantidosOcultos++; continue; }
            ja.add(k(pt.titulo)); regs.push(novoRegistro('servico', { coord, titulo: pt.titulo, detalhe: pt.detalhe || '', origem: 'PT', abertura: false, ordem: ++ordem, fonte: r.fonte, captura: true }));
          }
          continue;
        }
        if (r.itens) {
          const atual = E.listas[id];
          if (atual && atual.origem === 'A' && JSON.stringify(atual.itens) === JSON.stringify(r.itens)) { iguais++; continue; }
          if (atual && atual.origem !== 'A') substituidos.push(id);
          regs.push(novoRegistro('lista', { campo: id, itens: r.itens, origem: 'A', fonte: r.fonte, captura: true }));
        } else {
          const atual = E.valores[id];
          if (atual && atual.origem === 'A' && String(atual.valor) === String(r.valor)) { iguais++; continue; }
          if (atual && atual.origem !== 'A') substituidos.push(id);
          regs.push(novoRegistro('valor', { campo: id, valor: r.valor, origem: 'A', fonte: r.fonte, captura: true }));
        }
      }
      if (regs.length) gravados = await Store.gravarLote(regs);
      return `${gravados} gravado(s)${iguais ? ` · ${iguais} sem alteração` : ''}${mantidosOcultos ? ` · ${mantidosOcultos} ocultado(s) pelo coordenador` : ''}`;
    });
    return { achados: Object.keys(achados), faltando, mantidos, gravados, iguais, substituidos, mantidosOcultos, passos, simulado: fontes.some(f => CONECTORES[f].modo === 'simulado'), em: Date.now() };
  },
};
