/* ===================== REDIA P-83 · núcleo ===================== */
'use strict';
const APP = { nome: 'REDIA P-83', versao: '1.8.0', fase: 'piloto', uep: 'P-83' };
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
  uep: 'P-83', campo: 'Búzios', ativo: 'ATP-BUZ', modo: 'operacao',
  horarios: { preenchimento: '08:10', preRedia: '08:10', congelamento: '08:40', inicio: '08:45', fim: '10:00' },
  timeboxMin: 5,
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
  testeVazaoDias: 90,                     // D-62 (proposta 14): periodicidade do teste de vazão por poço (PREMISSA; regulação de medição a confirmar)
  pautaExtra: { 1: '[tema de segunda]', 2: '[tema de terça]', 3: '[tema de quarta]', 4: '[tema de quinta]', 5: '[tema de sexta]', 6: '[tema de sábado]', 0: '[tema de domingo]' },
  temasPlataforma: ['Segurança', 'Saúde', 'Habitabilidade', 'Integridade', 'Conformidade', 'Auditorias', 'GDB', 'SL&R'],
  /* D-61 (proposta 24): metas dos indicadores de manutenção por UEP (linha de base), não fixas no código. Valores iniciais = exemplo (I-05). */
  metasManutencao: { ICPMe: 90, ICPMeIF6: 97, IARP: 95 },
  /* D-61 (proposta 13): limites de especificação das análises por parâmetro (vazio = sem semáforo, só a data).
     PREMISSA: referências públicas a confirmar pela coordenação — BSW/salinidade do óleo (especificação de exportação), TOG da água produzida
     (CONAMA 393, diário), TOG do slop (MARPOL), cloro e turbidez da água potável (portaria de potabilidade). */
  limitesLab: {
    'lab.COPROD.bsw_oleo': { max: 1 }, 'lab.COPROD.sal_oleo': { max: 570 }, 'lab.COPROD.tog_agua': { max: 42 },
    'lab.COEMB.tog_slop': { max: 15 }, 'lab.COEMB.cl_pot': { min: 0.2, max: 5 }, 'lab.COEMB.turb_pot': { max: 5 },
  },
};
let CFG = JSON.parse(JSON.stringify(CFG_PADRAO));
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
  const a = ACESSO_DEMO[c];
  if (!a) return { erro: 'Chave não cadastrada na demonstração. Use GP01, CP01, CE01 ou CM01.' };
  if (String(senha) !== SENHA_GENERICA) return { erro: 'Senha incorreta.' };
  definirUsuario({ nome: a.nome, chave: c, posto: a.posto, uep: CFG.uep, admin: true });
  LS.set('ultimaChave', c); return { ok: true };
}
function definirUsuario(p) {
  const coord = p.coord || POSTO_COORD[p.posto] || 'GEPLAT';
  USUARIO = { nome: p.nome, chave: p.chave, posto: p.posto, papel: p.posto, coord, uep: p.uep || CFG.uep, admin: !!p.admin, compartilhado: !!p.compartilhado, desde: new Date().toISOString() };
  if (USUARIO.uep) CFG.uep = USUARIO.uep;
  SS.set('sessao', USUARIO);
}
function sair() { USUARIO = null; SS.del('sessao'); if (MODO_NUVEM) Nuvem.sair(); Store.encerrar(); }
/* pode alterar a configuração da UEP e carregar dados de exemplo na base */
const podeAdministrar = () => !MODO_NUVEM || !!USUARIO?.admin || USUARIO?.coord === 'GEPLAT';
function coordDoPapel(p) { if (USUARIO?.coord && p === USUARIO.papel) return USUARIO.coord; const m = /(COPROD|COEMB|COMAN|GEPLAT)/.exec(p || ''); return m ? m[1] : (POSTO_COORD[p] || null); }

/* ======================================================================
   Store: registros só de acréscimo (event sourcing)
   Nuvem:   tabela public.registros no Supabase (uma linha por registro; o servidor carimba
            autoria, hora oficial e recusa curadoria com a pauta congelada) + arquivos no Storage
   Memória: mesma estrutura lógica, guardada no navegador (demonstração)
   A chave lógica (_arq) mantém o formato do protótipo: dados/AAAA/MM/DD/<ts>_<tipo>_<id>.json
   ====================================================================== */
const TIPOS_REG = ['sugestao', 'decisao', 'comentario', 'valor', 'lista', 'servico', 'item', 'demanda', 'atualiza', 'remove', 'aceite', 'congelamento', 'reabertura', 'anexo', 'ata', 'conclusao', 'notificacao', 'selecao', 'reuniao'];
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
    const regs = LS.get('memoria.registros', []);
    for (const r of regs) this.cache.set(r._arq, r);
    const cfg = LS.get('memoria.config', null); if (cfg) CFG = mesclarCfg(cfg);
    if (USUARIO?.uep) CFG.uep = USUARIO.uep;
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
    const k = this.chaveDe(r), tinha = this.cache.get(k);
    this.guardar(r);
    try { this.salvarMemoria(); } catch (e) { if (tinha) this.cache.set(k, tinha); else this.cache.delete(k); throw e; }   // R-02
    return r;
  },
  /* vários registros de uma vez (dados de exemplo, importação): na nuvem, em lotes de 500 */
  async gravarLote(regs) {
    if (this.modo !== 'nuvem') { for (const r of regs) this.guardar(r); this.salvarMemoria(); return regs.length; }
    let n = 0;
    for (let i = 0; i < regs.length; i += 500) { const out = await Nuvem.gravar(regs.slice(i, i + 500)); out.forEach(x => this.guardar(x)); n += out.length; }
    return n;
  },
  salvarMemoria() { if (!LS.set('memoria.registros', [...this.cache.values()])) throw new Error('O armazenamento deste navegador está cheio ou bloqueado: o registro não foi guardado. Exporte os registros e limpe os dados de exemplo.'); },

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
  /* reset da demonstração (D-52): apaga todos os registros da UEP (na nuvem, para todos os usuários) */
  async resetar() {
    let n;
    if (this.modo === 'nuvem') { n = await Nuvem.resetar(CFG.uep); this.cache.clear(); this.seq = 0; await this.carregar(DIA); }
    else { n = this.cache.size; this.cache.clear(); this.salvarMemoria(); }
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
    const uep = CFG.uep; CFG = mesclarCfg(c || {}); CFG.uep = uep;
  },
  async salvarConfig() {
    if (this.modo === 'nuvem') await Nuvem.configSalvar(CFG.uep, CFG);
    else LS.set('memoria.config', CFG);
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
  for (const k of ['metasManutencao', 'limitesLab']) if (c && c[k] && typeof c[k] === 'object') r[k] = JSON.parse(JSON.stringify(c[k]));   // D-61: tabelas por UEP substituem o padrão inteiro (remover uma linha vale)
  return r;
}
function deepMerge(a, b) { for (const k of Object.keys(b)) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') deepMerge(a[k], b[k]); else a[k] = b[k]; } return a; }

/* ---------- criação de registros ---------- */
let DIA = LS.get('dia', isoData(new Date()));
function novoRegistro(tipo, payload, extra = {}) {
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
