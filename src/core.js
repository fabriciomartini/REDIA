/* ===================== REDIA Búzios · núcleo ===================== */
'use strict';
const APP = { nome: 'REDIA Búzios', versao: '2.3.0', fase: 'piloto', uep: 'P-83' };
/* D-70 · REDIA Búzios: todas as plataformas do campo; cada usuário acessa as unidades em que está lotado */
const UNIDADES = [['P-74', 'FPSO P-74'], ['P-75', 'FPSO P-75'], ['P-76', 'FPSO P-76'], ['P-77', 'FPSO P-77'], ['P-78', 'FPSO P-78'], ['P-79', 'FPSO P-79'], ['P-80', 'FPSO P-80'], ['P-82', 'FPSO P-82'], ['P-83', 'FPSO P-83'], ['P-91', 'FPSO P-91']].map(([uep, nome], i) => ({ uep, nome, ordem: i + 1, situacao: 'operacao' }));
const ATIVO_UEP = { 'P-83': 'ATP-BUZ III' };   // ativo de cada unidade (os demais: definir na Configuração da unidade)
/* V1.0 (D-48): versão web. Com config.js preenchido (Supabase), grava na base de dados da nuvem;
   sem ele (ou com ?demo=1 na URL), roda em modo demonstração, só neste navegador. */
const NUVEM = Object.assign({ supabaseUrl: '', supabaseAnonKey: '', emailDominio: 'redia.local', tempoReal: true }, window.REDIA_CONFIG || {});
const MODO_NUVEM = !!(NUVEM.supabaseUrl && NUVEM.supabaseAnonKey && window.supabase?.createClient) && !new URLSearchParams(location.search).has('demo');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const uid = () => Math.random().toString(36).slice(2, 10).padEnd(8, '0');
const pad = n => String(n).padStart(2, '0');
const NBSP = ' ';

/* ---------- números e datas (pt-BR) ---------- */
const fmtN = (v, dec = 0) => (v === null || v === undefined || v === '' || isNaN(+v)) ? '—'
  : (+v).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtU = (v, dec, u) => v === null || v === undefined || v === '' ? 'Sem dado' : `${fmtN(v, dec)}${NBSP}${u}`;
function parseData(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
function isoData(dt) { return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`; }
function addDias(iso, n) { const d = parseData(iso); d.setDate(d.getDate() + n); return isoData(d); }
function ddmm(iso) { const d = parseData(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; }
function ddmmaaaa(iso) { const d = parseData(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; }
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
function diaSemana(iso) { return DIAS[parseData(iso).getDay()]; }
function hhmm(ts) { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function hhmmss(ts) { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; }
function diffDias(isoA, isoB) { return Math.round((parseData(isoA) - parseData(isoB)) / 86400000); }

/* ---------- armazenamento local do navegador (só conveniências) ---------- */
const LS = {
  get(k, def) { try { const v = localStorage.getItem('redia.' + k); return v === null ? def : JSON.parse(v); } catch { return def; } },
  set(k, v) { try { localStorage.setItem('redia.' + k, JSON.stringify(v)); return true; } catch { return false; } },  // false = sem armazenamento ou cota cheia
  del(k) { try { localStorage.removeItem('redia.' + k); } catch { } },
};

/* ---------- relógio (com simulação de horário para demonstração) ---------- */
const Relogio = {
  offset: LS.get('relogio.offset', 0),
  agora() { return new Date(Date.now() + this.offset); },
  simular(hhmmStr) {
    const [h, m] = hhmmStr.split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0);
    this.offset = d - Date.now(); LS.set('relogio.offset', this.offset);
  },
  real() { this.offset = 0; LS.del('relogio.offset'); },
  simulado() { return Math.abs(this.offset) > 60000; },
  minutos() { const d = this.agora(); return d.getHours() * 60 + d.getMinutes(); },
};

/* ---------- configuração da UEP (config/uep.json na pasta) ---------- */
const CFG_PADRAO = {
  uep: 'P-83', campo: 'Búzios', ativo: 'ATP-BUZ III', modo: 'operacao',
  horarios: { preenchimento: '08:10', preRedia: '08:10', congelamento: '08:40', inicio: '08:45', fim: '10:00' },
  timeboxMin: 5,
  timeboxBlocos: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5 },   // D-77: tempo de exibição de cada tela da apresentação (min)
  destaquesPorBloco: 5,
  atividadesMax: 4, atividadesRecomendado: 2, destaquesAberturaMax: 2, pfceoMax: 6,
  limiares: {
    efop: { ok: 98, at: 95 },
    injecao: { ok: 98, at: 90 },
    iugaFaixaAtencao: 1,
    utilidades: { ok: 120, at: 100, diasAtencao: 7 },
    manutencaoFaixaAtencao: 3,
    recorrente: { at: 3, nok: 7 },
    inibicaoDias: { at: 1, nok: 3 },      // D-62: inibição/bypass de função de segurança ativa há ≥ 1 dia = Atenção; ≥ 3 dias = Não OK (PREMISSA)
    inspecaoJanelaDias: 30,               // D-62: inspeção de integridade que vence em até 30 dias fica em Atenção (PREMISSA)
  },
  limitesOffloading: { hs: 2.5, vento: 25, corrente: 1.0 },       // D-63 (proposta 16): janela de conexão do offloading (PREMISSA; limites operacionais a confirmar)
  limitesEstabilidade: { trim: 1.0, banda: 1.0, caladoMax: 23 },  // D-63 (proposta 19): trim e banda em módulo; calado máximo (PREMISSA)
  pocoDesvioPct: 10,                      // D-63 (proposta 9): poço abaixo do potencial quando a vazão fica mais de 10% abaixo (PREMISSA)
  recorrencia: { vezes: 3, dias: 30 },    // D-63 (proposta 29): item recorrente = mesma TAG/causa em 3 REDIAs em 30 dias
  diaVisaoSemanal: 5,                     // D-63 (proposta 28): dia da semana da visão semanal (0 = domingo … 5 = sexta)
  testeVazaoDias: 90,                     // D-62 (proposta 14): periodicidade do teste de vazão por poço (PREMISSA; regulação de medição a confirmar)
  pautaExtra: { 1: '[tema de segunda]', 2: '[tema de terça]', 3: '[tema de quarta]', 4: '[tema de quinta]', 5: '[tema de sexta]', 6: '[tema de sábado]', 0: '[tema de domingo]' },
  temasPlataforma: ['Segurança', 'Saúde', 'Habitabilidade', 'Integridade', 'Conformidade', 'Auditorias', 'GDB', 'SL&R'],
  /* D-61 (proposta 24): metas dos indicadores de manutenção por UEP (linha de base), não fixas no código. Valores iniciais = exemplo (I-05). */
  metasManutencao: { ICPMe: 90, ICPMeIF6: 97, IARP: 95 },
  /* D-65: análises incluídas/excluídas pela UEP e, por análise, se aparece no card da coordenação (tela) e em qual corrente entra no enquadramento */
  labNovas: [], labRemovidas: [],
  labCfg: {
    'lab.COPROD.bsw_oleo': { corrente: 'oleo' }, 'lab.COPROD.sal_oleo': { corrente: 'oleo' },
    'lab.COPROD.so4_urs': { corrente: 'agua' }, 'lab.COPROD.o2_inj': { corrente: 'agua', tela: false }, 'lab.COPROD.h2o_gas': { corrente: 'gas', tela: false },
  },
  /* D-61 (proposta 13): limites de especificação das análises por parâmetro (vazio = sem semáforo, só a data).
     PREMISSA: referências públicas a confirmar pela coordenação — BSW/salinidade do óleo (especificação de exportação), TOG da água produzida
     (CONAMA 393, diário), TOG do slop (MARPOL), cloro e turbidez da água potável (portaria de potabilidade). */
  limitesLab: {
    'lab.COPROD.bsw_oleo': { max: 1 }, 'lab.COPROD.sal_oleo': { max: 570 }, 'lab.COPROD.tog_agua': { max: 42 },
    'lab.COPROD.so4_urs': { max: 40 }, 'lab.COPROD.o2_inj': { max: 20 }, 'lab.COPROD.h2o_gas': { max: 60 },   // D-65 (PREMISSA: especificação de injeção a confirmar)
    'lab.COEMB.tog_slop': { max: 15 }, 'lab.COEMB.cl_pot': { min: 0.2, max: 5 }, 'lab.COEMB.turb_pot': { max: 5 },
  },
};
let CFG = JSON.parse(JSON.stringify(CFG_PADRAO));
/* D-77: tempo da tela (bloco 1 a 5) em segundos; sem valor da tela, vale o tempo padrão por bloco */
const timeboxSeg = b => Math.round((+(CFG.timeboxBlocos || {})[b] > 0 ? +CFG.timeboxBlocos[b] : CFG.timeboxMin) * 60);
function horaMin(s) { const [h, m] = s.split(':').map(Number); return h * 60 + m; }

/* ---------- usuário (autoria dos registros) ---------- */
/* Nuvem (D-49): chave + senha pessoal no Supabase Auth; perfil (nome, posto, coordenação, UEP) vem da tabela perfis.
   Demonstração: usuários FICTÍCIOS + senha comum 1234. O cadastro real de chaves fica só na base, nunca no código. */
const SENHA_GENERICA = '1234';
const POSTO_COORD = { 'GEOP': 'GEPLAT', 'GEPLAT': 'GEPLAT', 'GESTÃO': 'GEPLAT', 'COPROD': 'COPROD', 'SUPROD': 'COPROD', 'ENG PROCESSAMENTO': 'COPROD', 'ENG PETRÓLEO': 'COPROD',
  'COEMB': 'COEMB', 'SUEMB': 'COEMB', 'COMAN': 'COMAN', 'SUEIN': 'COMAN', 'SUMEC': 'COMAN', 'ENG ELETRICISTA': 'COMAN', 'ENG MECÂNICO': 'COMAN' };
const ACESSO_DEMO = Object.fromEntries(`GP01|GEPLAT|Usuário GEPLAT (demo)
CP01|COPROD|Usuário COPROD (demo)
SP01|SUPROD|Usuário SUPROD (demo)
CE01|COEMB|Usuário COEMB (demo)
SE01|SUEMB|Usuário SUEMB (demo)
CM01|COMAN|Usuário COMAN (demo)
SI01|SUEIN|Usuário SUEIN (demo)`.split('\n').map(l => { const [c, p, n] = l.split('|'); return [c, { posto: p, nome: n }]; }));
/* D-70 · usuários de teste por unidade (ex.: P-74 → GO74, GP74, CP74…), iguais à lista de cadastro de teste; AD01 = administrador do sistema */
const POSTOS_TESTE = { GO: 'GEOP', GP: 'GEPLAT', CP: 'COPROD', CM: 'COMAN', CE: 'COEMB', SP: 'SUPROD', SM: 'SUMEC', SI: 'SUEIN', SE: 'SUEMB', EE: 'ENG ELETRICISTA', EM: 'ENG MECÂNICO', EQ: 'ENG PROCESSAMENTO', EP: 'ENG PETRÓLEO' };
/* D-72 · a demonstração lê os usuários do diretório (lista-base fictícia + alterações da Administração, só neste navegador · admin.js) */
function acessoDemo(c) {
  const u = DiretorioDemo.achar(c);
  if (!u || !u.ativo || !u.lotacoes.length && !u.adminSistema) return null;
  const ativa = uep => UNIDADES.some(x => x.uep === uep && x.ativa !== false);   // unidade desativada na Administração some da lista (igual à base)
  const lot = u.lotacoes.filter(l => ativa(l.uep)).map(l => ({ uep: l.uep, admin: !!l.admin, editor: !!l.editor, lotado: true }));
  if (u.adminSistema) UNIDADES.forEach(x => { if (ativa(x.uep) && !lot.some(l => l.uep === x.uep)) lot.push({ uep: x.uep, admin: true, editor: false, lotado: false }); });
  lot.sort((a, b) => UNIDADES.findIndex(x => x.uep === a.uep) - UNIDADES.findIndex(x => x.uep === b.uep));
  return { nome: u.nome, chave: u.chave, posto: u.posto, email: u.email || '', adminSistema: !!u.adminSistema, compartilhado: !!u.compartilhado, trocarSenha: !!u.trocarSenha, unidades: lot };
}
const SS = { get(k) { try { return JSON.parse(sessionStorage.getItem('redia.' + k)); } catch { return null; } }, set(k, v) { try { sessionStorage.setItem('redia.' + k, JSON.stringify(v)); } catch { } }, del(k) { try { sessionStorage.removeItem('redia.' + k); } catch { } } };
let USUARIO = SS.get('sessao') || null;      // { nome, chave, posto, papel, coord, desde }
async function entrar(chave, senha) {
  const c = String(chave || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(c)) return { erro: 'Informe a chave com 4 caracteres.' };
  if (MODO_NUVEM) {
    const r = await Nuvem.entrar(c, String(senha || ''));
    if (r.erro) return r;
    definirUsuario(r.perfil); LS.set('ultimaChave', c); return { ok: true, trocarSenha: !!r.perfil.trocarSenha };
  }
  const a = acessoDemo(c);
  if (!a) return { erro: 'Chave não cadastrada ou desativada na demonstração. Use GP01, CP01, CE01 ou CM01 (P-83), as chaves de teste por unidade (ex.: GP74, CP80) ou AD01 (administrador).' };
  if (!(await DiretorioDemo.conferirSenha(c, String(senha || '')))) return { erro: 'Senha incorreta.' };
  definirUsuario(a); DiretorioDemo.registrarAcesso(c);
  LS.set('ultimaChave', c); return { ok: true, trocarSenha: a.trocarSenha };
}
/* D-70: perfil com as unidades acessíveis; a unidade ativa (uep) é escolhida na tela de unidades quando há mais de uma */
function definirUsuario(p, uepAtiva = null) {
  const coord = p.coord || POSTO_COORD[p.posto] || 'GEPLAT';
  const unidades = (p.unidades && p.unidades.length ? p.unidades : [{ uep: p.uep || 'P-83', admin: !!p.admin, editor: false, lotado: true }]).map(u => ({ ...UNIDADES.find(x => x.uep === u.uep), ...u }));
  const unica = unidades.length === 1 && !p.adminSistema ? unidades[0].uep : null;
  const uep = [uepAtiva, unica].find(x => x && unidades.some(u => u.uep === x)) || null;
  USUARIO = { nome: p.nome, chave: p.chave, posto: p.posto, papel: p.posto, coord, email: p.email || '', unidades, adminSistema: !!p.adminSistema, uep, admin: false, editor: false, compartilhado: !!p.compartilhado, desde: new Date().toISOString() };
  aplicarUnidade(uep);
}
/* unidade ativa: permissões da lotação e configuração padrão da unidade (a configuração salva é lida pelo Store) */
function aplicarUnidade(uep) {
  if (!USUARIO) return;
  const u = USUARIO.unidades.find(x => x.uep === uep);
  USUARIO.uep = u ? uep : null; USUARIO.admin = !!(u && (u.admin || USUARIO.adminSistema)); USUARIO.editor = !!(u && u.editor);
  if (u && CFG.uep !== uep) { CFG = JSON.parse(JSON.stringify(CFG_PADRAO)); CFG.uep = uep; CFG.ativo = ATIVO_UEP[uep] || 'Ativo (configurar)'; }
  SS.set('sessao', USUARIO);
}
const unidadeAtiva = () => USUARIO?.unidades?.find(u => u.uep === USUARIO.uep) || null;
const nomeUnidade = uep => (UNIDADES.find(u => u.uep === uep) || { nome: uep }).nome;
function sair() { USUARIO = null; SS.del('sessao'); if (MODO_NUVEM) Nuvem.sair(); Store.encerrar(); }
/* pode alterar a configuração da UEP e carregar dados de exemplo na base */
/* D-67: a REDIA do dia é iniciada por coordenador ou GEPLAT (ou administrador na base) · código único por UEP e dia */
const POSTOS_COORDENADOR = ['GEOP', 'GEPLAT', 'GESTÃO', 'COPROD', 'COEMB', 'COMAN'];
const podeIniciarRedia = () => !!USUARIO && (POSTOS_COORDENADOR.includes(USUARIO.posto) || (MODO_NUVEM && !!USUARIO.admin) || !!USUARIO.adminSistema);
const codigoRedia = (uep, iso) => { const [a, m, d] = String(iso).split('-'); return 'REDIA-' + String(uep).replace(/[^A-Za-z0-9]/g, '').toUpperCase() + '-' + d + m + a; };   // D-68: data em ddmmaaaa
const podeAdministrar = () => !MODO_NUVEM || !!USUARIO?.admin || USUARIO?.coord === 'GEPLAT';
function coordDoPapel(p) { if (USUARIO?.coord && p === USUARIO.papel) return USUARIO.coord; const m = /(COPROD|COEMB|COMAN|GEPLAT)/.exec(p || ''); return m ? m[1] : (POSTO_COORD[p] || null); }

/* ======================================================================
   Store: registros só de acréscimo (event sourcing)
   Nuvem:   tabela public.registros no Supabase (uma linha por registro; o servidor carimba
            autoria, hora oficial e recusa curadoria com a pauta congelada) + arquivos no Storage
   Memória: mesma estrutura lógica, guardada no navegador (demonstração)
   A chave lógica (_arq) mantém o formato do protótipo: dados/AAAA/MM/DD/<ts>_<tipo>_<id>.json
   ====================================================================== */
const TIPOS_REG = ['sugestao', 'decisao', 'comentario', 'valor', 'lista', 'servico', 'item', 'demanda', 'atualiza', 'remove', 'aceite', 'congelamento', 'reabertura', 'anexo', 'ata', 'conclusao', 'notificacao', 'selecao', 'reuniao', 'redia', 'acordo'];
const Store = {
  modo: null,            // 'nuvem' | 'memoria'
  nomeRaiz: '',
  cache: new Map(),      // chave lógica -> registro
  ultimaLeitura: null,
  seq: 0,                // última sequência lida da base (sincronização incremental)
  tempoReal: false,      // canal de tempo real conectado
  online: true,
  erros: [],

  remoto() { return this.modo === 'nuvem'; },
  async usarMemoria() {
    this.modo = 'memoria'; this.nomeRaiz = 'memória do navegador'; this.cache.clear();
    LS.set('modo', 'memoria');
    const regs = LS.get(this.chaveMem('registros'), []);   // D-70: cada unidade tem o seu armazenamento no navegador
    for (const r of regs) this.cache.set(r._arq, r);
    const uep = USUARIO?.uep || CFG.uep, cfg = LS.get(this.chaveMem('config'), null);
    if (cfg) { CFG = mesclarCfg(cfg); CFG.uep = uep; }
  },
  async usarNuvem() {
    this.modo = 'nuvem'; this.nomeRaiz = Nuvem.rotulo(); this.cache.clear(); this.seq = 0;
    await this.lerConfig();
  },
  encerrar() { if (this.modo === 'nuvem') { this.modo = null; this.cache.clear(); this.seq = 0; } },
  pastaDia(iso) { const [y, m, d] = iso.split('-'); return ['dados', y, m, d]; },
  pastaRedia(iso) { const [y, m, d] = iso.split('-'); return ['redia', y, m, d]; },
  nomeArquivo(r) { const t = r.criadoEm.replace(/[-:.Z]/g, '').replace('T', 'T').slice(0, 18); return `${t}_${r.tipo}_${r.id}.json`; },
  chaveDe(r) { return (r.escopo === 'demandas' ? 'dados/demandas' : this.pastaDia(r.data).join('/')) + '/' + this.nomeArquivo(r); },
  guardar(r) { r._arq = this.chaveDe(r); this.cache.set(r._arq, r); return r; },

  async gravar(r) {
    if (this.modo === 'nuvem') {
      const [s] = await Nuvem.gravar([r]);
      if (!s) throw new Error('Registro repetido: já existe na base.');
      if (s.seq === this.seq + 1) this.seq = s.seq;    // sem lacuna: ninguém gravou no meio
      return this.guardar(s);
    }
    regrasDemo(r);   // D-67: mesmas regras do gatilho da base (REDIA única, ata fechada, de acordo)
    const k = this.chaveDe(r), tinha = this.cache.get(k);
    this.guardar(r);
    try { this.salvarMemoria(); } catch (e) { if (tinha) this.cache.set(k, tinha); else this.cache.delete(k); throw e; }   // R-02
    return r;
  },
  /* vários registros de uma vez (dados de exemplo, importação): na nuvem, em lotes de 500 */
  async gravarLote(regs) {
    if (this.modo !== 'nuvem') { for (const r of regs) { if (r.tipo === 'redia' || r.tipo === 'ata') r.payload = { ...r.payload, codigo: codigoRedia(r.uep, r.data) }; this.guardar(r); } this.salvarMemoria(); return regs.length; }
    let n = 0;
    for (let i = 0; i < regs.length; i += 500) { const out = await Nuvem.gravar(regs.slice(i, i + 500)); out.forEach(x => this.guardar(x)); n += out.length; }
    return n;
  },
  chaveMem(k) { const uep = USUARIO?.uep || CFG.uep; return uep === 'P-83' ? 'memoria.' + k : `memoria.${k}.${uep}`; },   // a P-83 mantém as chaves da versão de uma unidade
  salvarMemoria() { if (!LS.set(this.chaveMem('registros'), [...this.cache.values()])) throw new Error('O armazenamento deste navegador está cheio ou bloqueado: o registro não foi guardado. Exporte os registros e limpe os dados de exemplo.'); },

  /* lê os registros do dia da REDIA (inclui as sugestões das passagens das 18:00 e 06:00), as demandas
     e, dos dias anteriores (mês e últimos 7 dias), só os campos usados nos acumulados (D-43) e nas tendências (D-61) */
  async carregar(iso) {
    if (this.modo === 'nuvem') {
      const o = await Nuvem.carregar(CFG.uep, iso, CAMPOS_HISTORICO);
      this.cache.clear(); o.registros.forEach(r => this.guardar(r)); this.seq = o.seq || 0;
    }
    this.ultimaLeitura = Date.now();
  },
  /* traz o que outros usuários gravaram desde a última leitura; devolve quantos registros novos */
  async sincronizar() {
    if (this.modo !== 'nuvem') return 0;
    let n = 0;
    for (let volta = 0; volta < 10; volta++) {
      const o = await Nuvem.novos(CFG.uep, this.seq);
      if (typeof o.max === 'number' && o.max < this.seq) { this.cache.clear(); this.seq = 0; await this.carregar(DIA); return -1; }   // base resetada por outra sessão (D-52)
      for (const r of o.registros) { const k = this.chaveDe(r); if (!this.cache.has(k)) { this.guardar(r); n++; } }
      const fim = !o.registros.length || o.seq === this.seq;
      this.seq = o.seq || this.seq;
      if (fim || o.registros.length < 2000) break;
    }
    this.ultimaLeitura = Date.now();
    return n;
  },
  /* D-63 (proposta 30): histórico pesquisável · na nuvem consulta a base (todas as REDIAs da UEP); na demonstração, o que está no navegador */
  async buscar(texto, limite = 100, f = {}) {   // D-67: filtros de período, coordenação e tipos (área Arquivo)
    const t = String(texto || '').trim().toLowerCase(), temFiltro = !!(f.de || f.ate || f.coord || f.tipos?.length);
    if (t.length < 2 && !temFiltro) return [];
    if (this.modo === 'nuvem') return Nuvem.buscar(CFG.uep, t, limite, f);
    const base = ['sugestao', 'item', 'demanda', 'servico', 'reuniao', 'decisao', 'valor', 'lista'], tipos = new Set(f.tipos?.length ? f.tipos.filter(x => base.includes(x)) : base);
    return [...this.cache.values()].filter(r => tipos.has(r.tipo) && (!f.de || r.data >= f.de) && (!f.ate || r.data <= f.ate) && (!f.coord || r.payload?.coord === f.coord) && (t.length < 2 || JSON.stringify(r.payload).toLowerCase().includes(t)))
      .sort((a, b) => String(b.data).localeCompare(String(a.data)) || ordem(b, a)).slice(0, limite);
  },
  /* D-65: arquivo · atas, congelamentos e reaberturas de todos os dias (sem o retrato da pauta) */
  async arquivo() {
    if (this.modo === 'nuvem') return Nuvem.arquivo(CFG.uep);
    return [...this.cache.values()].filter(r => r.escopo !== 'demandas' && ['ata', 'congelamento', 'reabertura'].includes(r.tipo)).map(r => { const { snapshot, ...p } = r.payload; return { ...r, payload: p }; })
      .sort((a, b) => String(b.data).localeCompare(String(a.data)) || ordem(b, a));
  },
  /* reset da demonstração (D-52): apaga todos os registros da UEP (na nuvem, para todos os usuários) */
  async resetar() {
    let n;
    if (this.modo === 'nuvem') { n = await Nuvem.resetar(CFG.uep); this.cache.clear(); this.seq = 0; await this.carregar(DIA); }
    else { n = this.cache.size; this.cache.clear(); this.salvarMemoria(); }
    return n;
  },
  /* D-74: apaga só os registros da REDIA do dia (escopo dia); demandas do Canal Base x Bordo ficam */
  async resetarDia(iso) {
    let n;
    if (this.modo === 'nuvem') { n = await Nuvem.resetarDia(CFG.uep, iso); this.cache.clear(); this.seq = 0; await this.carregar(iso); }
    else { const fora = [...this.cache.entries()].filter(([, r]) => r.data === iso && r.escopo !== 'demandas'); fora.forEach(([k]) => this.cache.delete(k)); n = fora.length; this.salvarMemoria(); }
    return n;
  },
  validoParaImportar(r) {
    return r && typeof r === 'object' && TIPOS_REG.includes(r.tipo) && /^[a-z0-9]{8}$/.test(r.id || '') && /^\d{4}-\d{2}-\d{2}$/.test(r.data || '') && typeof r.criadoEm === 'string' && r.payload && typeof r.payload === 'object' && (!r.uep || r.uep === CFG.uep);
  },
  registros(iso) {
    const dia = this.pastaDia(iso).join('/') + '/';
    return [...this.cache.values()].filter(r => r._arq.startsWith(dia)).sort(ordem);
  },
  demandas() { return [...this.cache.values()].filter(r => r._arq.startsWith('dados/demandas/')).sort(ordem); },

  /* arquivos da REDIA (pauta congelada, ata, transcrição): na nuvem vão para o Storage, só de acréscimo */
  async gravarArquivo(iso, nome, conteudo, tipo) {
    if (this.modo !== 'nuvem') return null;
    const [y, m, d] = iso.split('-');
    const carimbo_ = hhmmss(Date.now()).replace(/:/g, '');
    const final = nome.replace(/(\.[a-z0-9]+)?$/i, x => `_${carimbo_}${x}`);
    return Nuvem.enviarArquivo(`${CFG.uep}/${y}/${m}/${d}/${final}`, conteudo, tipo);
  },
  async lerConfig() {
    if (this.modo !== 'nuvem') return;
    const c = await Nuvem.configLer(CFG.uep);
    const uep = CFG.uep, ativo = CFG.ativo; CFG = mesclarCfg(c || {}); CFG.uep = uep; if (!c?.ativo) CFG.ativo = ativo;
  },
  async salvarConfig() {
    if (this.modo === 'nuvem') await Nuvem.configSalvar(CFG.uep, CFG);
    else LS.set(this.chaveMem('config'), CFG);
  },
  exportar() { return JSON.stringify({ app: APP, exportadoEm: new Date().toISOString(), config: CFG, registros: [...this.cache.values()] }, null, 1); },
  /* importa uma exportação (inclusive do protótipo v0.8): ids já existentes são ignorados */
  async importar(txt) {
    const o = JSON.parse(txt); if (!Array.isArray(o.registros)) throw new Error('Arquivo sem registros.');
    const novos = o.registros.filter(r => this.validoParaImportar(r) && !this.cache.has(r._arq || this.chaveDe(r))).sort(ordem)
      .map(r => { const x = { ...r, uep: CFG.uep }; delete x._arq; delete x.seq; if (this.modo === 'nuvem' && x.autor && !x.payload.exemplo) x.payload = { ...x.payload, autorOriginal: x.autor }; return x; });
    const n = novos.length ? await this.gravarLote(novos) : 0;
    return { n, data: o.data || null, tipo: o.tipo || 'exportacao' };
  },
};
/* Ordem dos registros (R-01): pela hora REAL de gravação (gravadoEm), nunca pela hora exibida (criadoEm),
   que segue o horário simulado. Registros antigos sem gravadoEm usam criadoEm. */
const chaveOrdem = r => r.gravadoEm || r.criadoEm;
function ordem(a, b) { const x = chaveOrdem(a), y = chaveOrdem(b); return x < y ? -1 : x > y ? 1 : (a.seq && b.seq ? a.seq - b.seq : a.id < b.id ? -1 : 1); }
let ULTIMO_CARIMBO = 0;
function carimbo() { const t = Math.max(Date.now(), ULTIMO_CARIMBO + 1); ULTIMO_CARIMBO = t; return new Date(t).toISOString(); }
function mesclarCfg(c) {
  const base = JSON.parse(JSON.stringify(CFG_PADRAO)), r = deepMerge(base, c || {});
  for (const k of ['metasManutencao', 'limitesLab', 'limitesOffloading', 'limitesEstabilidade', 'labCfg']) if (c && c[k] && typeof c[k] === 'object') r[k] = JSON.parse(JSON.stringify(c[k]));   // D-61: tabelas por UEP substituem o padrão inteiro (remover uma linha vale)
  if (r.ativo === 'ATP-BUZ') r.ativo = 'ATP-BUZ III';   // D-64: nome do ativo corrigido também nas configurações já salvas (base e navegador)
  return r;
}
function deepMerge(a, b) { for (const k of Object.keys(b)) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') deepMerge(a[k], b[k]); else a[k] = b[k]; } return a; }

/* ---------- criação de registros ---------- */
let DIA = LS.get('dia', isoData(new Date()));
function novoRegistro(tipo, payload, extra = {}) {
  /* D-67: valor e lista levam a coordenação do campo (base do responsável pelo "de acordo" da ata) */
  if ((tipo === 'decisao' || tipo === 'remove') && payload && !payload.coord && payload.alvo && typeof E !== 'undefined' && E) { const a = [...E.sugestoes, ...E.itens, ...E.servicos, ...E.reuniao].find(x => x.id === payload.alvo); if (a?.payload.coord) payload = { ...payload, coord: a.payload.coord }; }
  if ((tipo === 'valor' || tipo === 'lista') && payload && !payload.coord && payload.campo) { const c = (typeof CAMPO !== 'undefined' && CAMPO[payload.campo]?.coord) || (typeof LISTA !== 'undefined' && LISTA[payload.campo]?.coord); if (c) payload = { ...payload, coord: c }; }
  return { v: 1, id: uid(), tipo, data: DIA, uep: CFG.uep, criadoEm: Relogio.agora().toISOString(), gravadoEm: carimbo(), autor: { nome: USUARIO?.nome || '(sem nome)', chave: USUARIO?.chave || '', papel: USUARIO?.papel || '' }, payload, ...extra };
}
async function registrar(tipo, payload, extra) { return Store.gravar(novoRegistro(tipo, payload, extra)); }   // na nuvem devolve o registro carimbado pelo servidor

/* ---------- hash simples (FNV-1a 32) para o snapshot congelado ---------- */
function hash(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); }

/* ---------- mídia: embutida (arquivo único) ou servida em assets/ (versão web) ---------- */
function midiaUrl(id, arquivo, mime) {
  const b = (document.getElementById('redia-' + id)?.textContent || '').trim();
  return b ? `data:${mime};base64,${b}` : 'assets/' + arquivo;
}

/* ---------- avisos ---------- */
function aviso(msg, tipo = 'info') {
  const el = document.createElement('div'); el.className = 'toast ' + tipo; el.setAttribute('role', 'status'); el.textContent = msg;
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), 4200);
}
function baixar(nome, conteudo, mime = 'application/json') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([conteudo], { type: mime })); a.download = nome;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
/* D-67 · no modo demonstração, as regras que o gatilho da base aplica (mesmos códigos de erro) */
function erroRegra(codigo, msg) { const e = new Error(msg); e.codigo = codigo; return e; }
function regrasDemo(r) {
  if (r.escopo === 'demandas') return;
  const doDia = [...Store.cache.values()].filter(x => x.data === r.data && x.escopo !== 'demandas' && x.uep === r.uep).sort(ordem);
  if (doDia.some(x => x.tipo === 'ata')) throw erroRegra('ATA_FECHADA', 'A ata desta REDIA já foi fechada e arquivada; ela não pode mais ser alterada.');
  if (r.tipo === 'redia') { if (doDia.some(x => x.tipo === 'redia')) throw erroRegra('REDIA_JA_INICIADA', 'A REDIA deste dia já foi iniciada por outro usuário.'); r.payload = { ...r.payload, codigo: codigoRedia(r.uep, r.data) }; }
  if (r.tipo === 'acordo' || r.tipo === 'ata') {
    const pauta = doDia.filter(x => x.tipo === 'congelamento' || x.tipo === 'reabertura'), ult = pauta[pauta.length - 1];
    if (!ult || ult.tipo !== 'congelamento') throw erroRegra('PAUTA_NAO_CONGELADA', 'Congele a pauta antes do de acordo e do fechamento da ata.');
    if (r.tipo === 'ata') {
      const falta = faltaAcordo(doDia).map(x => x.coord);
      if (falta.length) throw erroRegra('ATA_SEM_ACORDO', 'Falta o de acordo de: ' + falta.join(', ') + '.');
      r.payload = { ...r.payload, codigo: codigoRedia(r.uep, r.data) };
    }
  }
}
