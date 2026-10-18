/* ===================== REDIA Búzios · Administração do sistema e autocadastro (D-72) ===================== */
'use strict';
/* Administrador do sistema (perfis.admin_sistema): usuários, lotações por unidade (cada usuário pode ser lotado em várias),
   papéis (administrador da unidade, editor do Studio, administrador do sistema), unidades, autocadastro, pedidos e auditoria.
   Nuvem: RPCs redia_admin_* (perfis e lotações) e a Edge Function redia-admin (o que exige o Auth: criar, redefinir senha,
   aprovar autocadastro, importar contas de teste). Demonstração: o mesmo, num diretório fictício guardado só neste navegador. */

const DIAS_REVISAO = 90;     // revisão periódica de acesso (PREMISSA · NIST SP 800-53 AC-2 / ISO 27001 5.18)
const DIAS_INATIVO = 60;     // conta ativa sem acesso há mais de N dias → sugerir desativação (PREMISSA · AC-2(3))
const NOMES_POSTO = { 'ENG ELETRICISTA': 'Eng. manutenção elétrica (base)', 'ENG MECÂNICO': 'Eng. manutenção mecânica', 'ENG PROCESSAMENTO': 'Eng. processamento', 'ENG PETRÓLEO': 'Eng. petróleo' };
const POSTOS_LISTA = ['GEOP', 'GEPLAT', 'COPROD', 'SUPROD', 'ENG PROCESSAMENTO', 'ENG PETRÓLEO', 'COEMB', 'SUEMB', 'COMAN', 'SUEIN', 'SUMEC', 'ENG ELETRICISTA', 'ENG MECÂNICO'];
const nomePosto = p => NOMES_POSTO[p] || p;

/* ---------- diretório da demonstração (fictício · só neste navegador) ---------- */
async function resumoSenha(s) {
  try { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('redia-demo:' + s)); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join(''); }
  catch { return 'h' + hash('redia-demo:' + s); }
}
function senhaProvisoria() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < 10; i++) s += a[Math.floor(Math.random() * a.length)]; return /\d/.test(s) ? s : s.slice(0, 9) + '7'; }
const DiretorioDemo = {
  _base: null,
  base() {
    if (this._base) return this._base;
    const t0 = '2026-10-01T08:00:00.000Z', u = (chave, nome, posto, lotacoes, extra = {}) => ({ userId: chave, chave, nome, posto, coord: POSTO_COORD[posto] || 'GEPLAT', email: '', adminSistema: false, ativo: true, compartilhado: true, trocarSenha: false, criadoEm: t0, revisadoEm: null, lotacoes, ...extra });
    const l = [u('AD01', 'Administrador do sistema (demo)', 'GEPLAT', UNIDADES.map(x => ({ uep: x.uep, admin: true, editor: true })), { adminSistema: true, compartilhado: false, proprietario: true })];   // na demonstração, AD01 faz o papel do proprietário do sistema
    // GEPLAT de cada unidade: administrador da unidade e editor do Studio; os demais, só lotados
    Object.entries(ACESSO_DEMO).forEach(([c, a]) => l.push(u(c, a.nome, a.posto, [{ uep: 'P-83', admin: a.posto === 'GEPLAT', editor: a.posto === 'GEPLAT' }])));
    UNIDADES.forEach(x => Object.entries(POSTOS_TESTE).forEach(([pf, posto]) => l.push(u(pf + x.uep.slice(2), `Teste ${nomePosto(posto)} ${x.uep} (demo)`, posto, [{ uep: x.uep, admin: pf === 'GP', editor: pf === 'GP' }]))));
    return (this._base = l);
  },
  extras() { return LS.get('demo.usuarios', {}); },
  todos() { const ex = this.extras(), b = this.base().map(x => ex[x.chave] ? { ...x, ...ex[x.chave] } : x); return [...b, ...Object.values(ex).filter(x => !b.some(y => y.chave === x.chave))].filter(x => !x.excluido).sort((a, b) => a.chave < b.chave ? -1 : 1); },
  excluir(c) { const ex = this.extras(); ex[c] = { chave: c, excluido: true }; LS.set('demo.usuarios', ex); const m = LS.get('demo.senhas', {}); delete m[c]; LS.set('demo.senhas', m); },
  achar(c) { return this.todos().find(x => x.chave === c) || null; },
  gravar(u) { const ex = this.extras(); ex[u.chave] = { ...u, userId: u.chave }; LS.set('demo.usuarios', ex); },
  async conferirSenha(c, s) { const h = LS.get('demo.senhas', {})[c]; return h ? h === await resumoSenha(s) : s === SENHA_GENERICA; },
  async definirSenha(c, s) { const m = LS.get('demo.senhas', {}); m[c] = await resumoSenha(s); LS.set('demo.senhas', m); },
  async trocarSenha(c, s) { await this.definirSenha(c, s); const u = this.achar(c); if (u) this.gravar({ ...u, trocarSenha: false }); },
  registrarAcesso(c) { const m = LS.get('demo.acessos', {}); m[c] = new Date().toISOString(); LS.set('demo.acessos', m); },
  ultimoAcesso(c) { return LS.get('demo.acessos', {})[c] || null; },
  auditar(acao, alvo, detalhe = {}) { const a = LS.get('demo.auditoria', []); a.unshift({ seq: (a[0]?.seq || 0) + 1, em: new Date().toISOString(), por: USUARIO?.chave || 'autocadastro', acao, alvo, detalhe }); LS.set('demo.auditoria', a.slice(0, 1000)); },
};
/* alterações das unidades feitas na Administração da demonstração (nome, ativa, situação) */
(function aplicarUnidadesDemo() { if (MODO_NUVEM) return; const o = LS.get('demo.unidades', {}); UNIDADES.forEach(u => Object.assign(u, o[u.uep] || {})); })();

const erroAdm = (codigo) => { const e = new Error(ERROS_NUVEM[codigo] || codigo); e.codigo = codigo; return e; };
const AdminDemo = {
  async usuarios() { return DiretorioDemo.todos().map(u => ({ ...u, ultimoAcesso: DiretorioDemo.ultimoAcesso(u.chave), ultimoRegistro: null })); },
  async salvarUsuario(p) {
    const antes = DiretorioDemo.achar(p.userId); if (!antes) throw erroAdm('USUARIO_INEXISTENTE');
    if (p.userId === USUARIO.chave && (p.adminSistema === false || p.ativo === false)) throw erroAdm('AUTO_BLOQUEIO');
    if (antes.proprietario && (p.adminSistema === false || p.ativo === false)) throw erroAdm('PROPRIETARIO');
    if (!p.lotacoes?.length) throw erroAdm('SEM_LOTACAO');
    const depois = { ...antes, nome: p.nome || antes.nome, posto: p.posto || antes.posto, coord: POSTO_COORD[p.posto || antes.posto] || 'GEPLAT', email: p.email ?? antes.email, adminSistema: !!p.adminSistema, ativo: !!p.ativo, compartilhado: !!p.compartilhado, trocarSenha: !!p.trocarSenha, lotacoes: p.lotacoes };
    if (!DiretorioDemo.todos().some(u => (u.chave === depois.chave ? depois : u).adminSistema && (u.chave === depois.chave ? depois : u).ativo)) throw erroAdm('SEM_ADMIN');
    DiretorioDemo.gravar(depois); DiretorioDemo.auditar('usuario.alterar', antes.chave, { antes: { posto: antes.posto, lotacoes: antes.lotacoes, adminSistema: antes.adminSistema, ativo: antes.ativo }, depois: { posto: depois.posto, lotacoes: depois.lotacoes, adminSistema: depois.adminSistema, ativo: depois.ativo } });
    return { ok: true };
  },
  async revisar(id) { const u = DiretorioDemo.achar(id); if (u) { DiretorioDemo.gravar({ ...u, revisadoEm: new Date().toISOString() }); DiretorioDemo.auditar('usuario.revisar_acesso', id); } },
  async auditoria() { return LS.get('demo.auditoria', []); },
  async resumo() {
    const us = DiretorioDemo.todos(), par = LS.get('demo.parametros', {});
    return {
      unidades: UNIDADES.map(x => { const regs = LS.get(x.uep === 'P-83' ? 'memoria.registros' : 'memoria.registros.' + x.uep, []); return { ...x, ativa: x.ativa !== false,
        usuarios: us.filter(u => u.ativo && u.lotacoes.some(l => l.uep === x.uep)).length, editores: us.filter(u => u.lotacoes.some(l => l.uep === x.uep && l.editor)).length,
        registros: regs.length, ultimaRedia: regs.filter(r => r.tipo === 'redia').map(r => r.data).sort().pop() || null, atas: regs.filter(r => r.tipo === 'ata').length }; }),
      cadastro: { aberto: true, aprovacao: false, ...(par.cadastro || {}) }, pedidosCadastro: LS.get('demo.pedidosCadastro', []), pedidosSenha: [],
    };
  },
  async salvarUnidade(p) { const o = LS.get('demo.unidades', {}); o[p.uep] = { nome: p.nome, ativa: p.ativa, situacao: p.situacao }; LS.set('demo.unidades', o); const u = UNIDADES.find(x => x.uep === p.uep); if (u) Object.assign(u, o[p.uep]); DiretorioDemo.auditar('unidade.alterar', p.uep, p); },
  async parametro(k, v) { const o = LS.get('demo.parametros', {}); o[k] = v; LS.set('demo.parametros', o); DiretorioDemo.auditar('parametro.alterar', k, v); },
  async criar(p, senha, trocar) {
    if (DiretorioDemo.achar(p.chave)) return { erro: 'chave já cadastrada', existe: true };
    DiretorioDemo.gravar({ chave: p.chave, nome: p.nome, posto: p.posto, coord: POSTO_COORD[p.posto] || 'GEPLAT', email: p.email || '', adminSistema: !!p.adminSistema, ativo: true, compartilhado: !!p.compartilhado, trocarSenha: trocar, criadoEm: new Date().toISOString(), revisadoEm: null, lotacoes: p.lotacoes });
    await DiretorioDemo.definirSenha(p.chave, senha); return { ok: true };
  },
  async acao(acao, b) {
    if (acao === 'excluir') {   // D-74
      const u = DiretorioDemo.achar(b.userId); if (!u) throw new Error('Usuário não encontrado.');
      if (u.proprietario) throw new Error('A conta do proprietário do sistema não pode ser excluída.');
      if (u.chave === USUARIO.chave) throw new Error('Você não pode excluir a sua própria conta.');
      if (u.adminSistema && !DiretorioDemo.todos().some(x => x.chave !== u.chave && x.adminSistema && x.ativo)) throw erroAdm('SEM_ADMIN');
      DiretorioDemo.excluir(u.chave); DiretorioDemo.auditar('usuario.excluir', u.chave, { nome: u.nome, posto: u.posto, lotacoes: u.lotacoes }); return { ok: true };
    }
    if (acao === 'criar') { const s = senhaProvisoria(), r = await this.criar(b, s, !b.compartilhado); if (r.erro) throw new Error(r.existe ? 'Esta chave já está cadastrada.' : r.erro); DiretorioDemo.auditar('usuario.criar', b.chave, { posto: b.posto, lotacoes: b.lotacoes, envio: 'tela' }); return { ok: true, envio: 'tela', senhaTemporaria: s }; }
    if (acao === 'redefinir') { const u = DiretorioDemo.achar(b.userId); if (!u) throw new Error('Usuário não encontrado.'); const s = senhaProvisoria(); await DiretorioDemo.definirSenha(u.chave, s); DiretorioDemo.gravar({ ...u, trocarSenha: !u.compartilhado }); DiretorioDemo.auditar('usuario.redefinir_senha', u.chave, { envio: 'tela' }); return { ok: true, envio: 'tela', senhaTemporaria: s }; }
    const peds = LS.get('demo.pedidosCadastro', []), q = peds.find(x => x.id === b.pedidoId && x.situacao === 'aguardando');
    if (acao === 'aprovar' || acao === 'recusar') {
      if (!q) throw new Error('Pedido não encontrado ou já tratado.');
      if (acao === 'recusar') { q.situacao = 'recusado'; q.detalhe = 'recusado por ' + USUARIO.chave; LS.set('demo.pedidosCadastro', peds); DiretorioDemo.auditar('cadastro.recusar', q.chave); return { ok: true }; }
      const s = senhaProvisoria(), r = await this.criar({ chave: q.chave, nome: q.nome, posto: q.posto, email: q.email, lotacoes: [{ uep: q.uep, admin: false, editor: false }] }, s, true);
      if (r.erro) throw new Error(r.erro);
      q.situacao = 'cadastrado'; q.detalhe = 'aprovado por ' + USUARIO.chave; LS.set('demo.pedidosCadastro', peds); DiretorioDemo.auditar('cadastro.aprovar', q.chave, { uep: q.uep, envio: 'tela' });
      return { ok: true, envio: 'tela', senhaTemporaria: s };
    }
    if (acao === 'importar') {
      const res = { criados: 0, existentes: 0, erros: [] };
      for (const u of b.usuarios) { const r = await this.criar({ ...u, lotacoes: [{ uep: u.uep, admin: false, editor: false }], compartilhado: true }, b.senha, false); if (r.erro) res.existentes++; else res.criados++; }
      DiretorioDemo.auditar('usuario.importar', `${b.usuarios.length} linhas`, res); return { ok: true, ...res };
    }
    throw new Error('Ação desconhecida.');
  },
  async cadastrar(p) {
    const par = { aberto: true, aprovacao: false, ...(LS.get('demo.parametros', {}).cadastro || {}) };
    if (!par.aberto) throw new Error('O autocadastro está fechado no momento. Procure o administrador da REDIA.');
    if (DiretorioDemo.achar(p.chave)) throw new Error('Esta chave já está cadastrada. Se esqueceu a senha, use “Esqueci a senha”.');
    const peds = LS.get('demo.pedidosCadastro', []), ped = { id: (peds[0]?.id || 0) + 1, chave: p.chave, nome: p.nome, email: p.email, uep: p.uep, posto: p.posto, pedido_em: new Date().toISOString() };
    if (par.aprovacao) { if (!peds.some(x => x.chave === p.chave && x.situacao === 'aguardando')) { peds.unshift({ ...ped, situacao: 'aguardando', detalhe: 'aguardando aprovação do administrador' }); LS.set('demo.pedidosCadastro', peds); } return { ok: true, mensagem: 'Pedido de cadastro enviado. Depois da aprovação do administrador, a senha provisória chega no e-mail informado.' }; }
    const s = senhaProvisoria(); await this.criar({ ...p, lotacoes: [{ uep: p.uep, admin: false, editor: false }] }, s, true);
    peds.unshift({ ...ped, situacao: 'cadastrado', detalhe: 'demonstração: senha exibida na tela' }); LS.set('demo.pedidosCadastro', peds);
    DiretorioDemo.auditar('usuario.autocadastro', p.chave, { uep: p.uep, posto: p.posto, envio: 'tela' });
    return { ok: true, envio: 'tela', senhaTemporaria: s, mensagem: 'Cadastro feito (demonstração).' };
  },
};
const AdminNuvem = {
  usuarios: () => Nuvem.adminUsuarios(), salvarUsuario: p => Nuvem.adminSalvarUsuario(p), revisar: id => Nuvem.adminRevisar(id), auditoria: () => Nuvem.adminAuditoria(300),
  resumo: () => Nuvem.adminResumo(), salvarUnidade: p => Nuvem.adminSalvarUnidade(p), parametro: (k, v) => Nuvem.adminParametro(k, v), acao: (a, p) => Nuvem.adminAcao(a, p), cadastrar: p => Nuvem.cadastrar(p),
};
const Admin = () => MODO_NUVEM ? AdminNuvem : AdminDemo;

/* ---------- autocadastro (tela de login) ---------- */
async function autocadastro() {
  const opts = UNIDADES.filter(u => u.ativa !== false).map(u => `<option value="${esc(u.uep)}">${esc(u.uep)} · ${esc(u.nome)}</option>`).join('');
  let v = { chave: '', nome: '', email: '', uep: '', posto: '' };
  for (;;) {
    const r = await modal({
      titulo: 'Cadastro de novo usuário',
      html: `<p>Informe os seus dados. O sistema cadastra a sua chave e envia uma <b>senha provisória</b> para o e-mail informado. No primeiro acesso, você troca a senha.</p>
        <div class="banner erro senha-alerta" role="note"><b>Ambiente de teste.</b> A REDIA Búzios é um protótipo em desenvolvimento: no primeiro acesso, crie uma senha diferente da sua senha Petrobras.</div>
        <div class="fgrid ac-f">
          <div><label class="lbl" for="ac-ch">Chave</label><input id="ac-ch" class="in" data-mdl-in="chave" maxlength="12" autocapitalize="characters" spellcheck="false" placeholder="ABC1" value="${esc(v.chave)}" aria-describedby="ac-ch-n"><span id="ac-ch-n" class="note">4 letras ou números</span></div>
          <div><label class="lbl" for="ac-un">Unidade de lotação</label><select id="ac-un" class="in" data-mdl-in="uep"><option value="">Selecione…</option>${opts}</select></div>
          <div class="ac-w"><label class="lbl" for="ac-no">Nome</label><input id="ac-no" class="in" data-mdl-in="nome" maxlength="120" autocomplete="name" value="${esc(v.nome)}"></div>
          <div class="ac-w"><label class="lbl" for="ac-em">E-mail</label><input id="ac-em" class="in" data-mdl-in="email" type="email" maxlength="160" autocomplete="email" value="${esc(v.email)}"></div>
          <div class="ac-w"><label class="lbl" for="ac-po">Função</label><select id="ac-po" class="in" data-mdl-in="posto"><option value="">Selecione…</option>${POSTOS_LISTA.map(p => `<option value="${esc(p)}">${esc(nomePosto(p))}</option>`).join('')}</select><span class="note">Define a coordenação em que você preenche a REDIA. O administrador pode ajustar depois.</span></div>
        </div>`,
      botoes: [{ id: 'cancelar', txt: 'Cancelar' }, { id: 'ok', txt: 'Cadastrar e receber senha provisória', cls: 'pri' }],
      aoAbrir: el => {
        const ch = $('#ac-ch', el); ch.oninput = () => { ch.value = ch.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); };
        if (v.uep) $('#ac-un', el).value = v.uep; if (v.posto) $('#ac-po', el).value = v.posto;
      },
    });
    if (r.id !== 'ok') return;
    v = { chave: String(r.chave || '').toUpperCase(), nome: String(r.nome || '').replace(/\s+/g, ' ').trim(), email: String(r.email || '').trim().toLowerCase(), uep: r.uep, posto: r.posto };
    const erro = !/^[A-Z0-9]{4}$/.test(v.chave) ? 'A chave precisa ter exatamente 4 letras ou números.' : v.nome.length < 2 ? 'Informe o seu nome.' : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email) ? 'Informe um e-mail válido.' : !v.uep ? 'Selecione a unidade de lotação.' : !v.posto ? 'Selecione a sua função.' : '';
    if (erro) { aviso(erro, 'erro'); continue; }
    try {
      const o = await Admin().cadastrar(v);
      if (o.senhaTemporaria) await mostrarSenha(v.chave, o.senhaTemporaria, 'Demonstração: sem envio de e-mail. Na versão em nuvem, a senha provisória vai para o e-mail informado.');
      else await modal({ titulo: 'Cadastro enviado', html: `<p>${esc(o.mensagem || 'Cadastro feito.')}</p>`, botoes: [{ id: 'ok', txt: 'Entendi', cls: 'pri' }] });
      const c = $('#lg-chave'); if (c) { c.value = v.chave; $('#lg-senha')?.focus(); }
      return;
    } catch (e) { aviso(e.message, 'erro'); }
  }
}
async function mostrarSenha(chave, senha, nota) {
  await modal({ titulo: 'Senha provisória', html: `<p>Senha provisória da chave <b>${esc(chave)}</b> (aparece só agora):</p>
    <p class="sp-v"><code data-senha>${esc(senha)}</code> <button class="btn sm" type="button" data-copiar>Copiar</button></p>
    <p class="note">${esc(nota || 'Entregue só ao usuário, por um canal individual. No primeiro acesso, o app pede uma senha pessoal.')}</p>`,
    botoes: [{ id: 'ok', txt: 'Fechar', cls: 'pri' }],
    aoAbrir: el => { const b = $('[data-copiar]', el); b.onclick = () => { navigator.clipboard?.writeText(senha).then(() => { b.textContent = 'Copiada'; }).catch(() => { }); }; } });
}

/* ---------- tela de Administração ---------- */
const diasDesdeTs = ts => ts ? Math.floor((Date.now() - new Date(ts)) / 86400000) : null;
const dataCurta = ts => ts ? `${ddmmaaaa(isoData(new Date(ts)))} ${hhmm(ts)}` : '—';
const revisaoVencida = u => u.ativo && (diasDesdeTs(u.revisadoEm) === null || diasDesdeTs(u.revisadoEm) > DIAS_REVISAO);
const semAcesso = u => u.ativo && !u.compartilhado && (diasDesdeTs(u.ultimoAcesso || u.criadoEm) ?? 0) > DIAS_INATIVO;
function filtrosAdm() { return UI.adm || (UI.adm = { aba: 'painel', q: '', uep: '', papel: '', sit: 'ativos' }); }
const ABAS_ADM = [['painel', 'Painel'], ['usuarios', 'Usuários'], ['unidades', 'Unidades'], ['cadastro', 'Cadastro e senhas'], ['testes', 'Dados de teste'], ['auditoria', 'Auditoria'], ['praticas', 'Boas práticas']];

async function telaAdmin() {
  if (!USUARIO?.adminSistema) { render(cabecalhoApp({ id: 'admin', titulo: 'Administração' }) + '<div class="wrap"><div class="banner erro"><b>Acesso restrito.</b> A Administração é só para o administrador do sistema.</div></div>'); return; }
  const F = filtrosAdm();
  render(cabecalhoApp({ id: 'admin', titulo: 'Administração' }) + `<div class="wrap adm">
    <section class="adm-h"><div><span class="kick">REDIA Búzios · administração do sistema</span><h2>Administração</h2></div>
      <p class="note">${MODO_NUVEM ? 'Alterações gravadas na base e registradas na auditoria.' : 'Demonstração: o diretório de usuários é fictício e as alterações ficam só neste navegador.'}</p></section>
    <nav class="adm-abas" role="tablist">${ABAS_ADM.map(([id, rot]) => `<button role="tab" class="adm-ab${F.aba === id ? ' on' : ''}" aria-selected="${F.aba === id}" data-aba="${id}">${rot}</button>`).join('')}</nav>
    <div id="adm-c" class="adm-c"><p class="note">Carregando…</p></div></div>`);
  $$('[data-aba]').forEach(b => b.onclick = () => { F.aba = b.dataset.aba; telaAdmin(); });
  try {
    const A = Admin();
    const [us, rs] = await Promise.all([A.usuarios(), A.resumo()]);
    UI.admDados = { us, rs };
    const c = $('#adm-c'); if (!c) return;
    ({ painel: admPainel, usuarios: admUsuarios, unidades: admUnidades, cadastro: admCadastro, testes: admTestes, auditoria: admAuditoria, praticas: admPraticas })[F.aba](c, us, rs);
  } catch (e) { const c = $('#adm-c'); if (c) c.innerHTML = `<div class="banner erro"><b>Não foi possível carregar a administração.</b> ${esc(e.message)}${MODO_NUVEM ? ' Confira se o SQL da versão 2.0 foi aplicado na base.' : ''}</div>`; }
}
function indicadores(us, rs) {
  const at = us.filter(u => u.ativo);
  return {
    ativos: at.length, inativos: us.length - at.length, admSis: at.filter(u => u.adminSistema).length,
    editores: at.filter(u => u.lotacoes.some(l => l.editor)).length, admUni: at.filter(u => u.lotacoes.some(l => l.admin)).length,
    compart: at.filter(u => u.compartilhado).length, revisao: us.filter(revisaoVencida).length, semAcesso: us.filter(semAcesso).length,
    multi: at.filter(u => u.lotacoes.length > 1).length, pedidos: (rs.pedidosCadastro || []).filter(p => p.situacao === 'aguardando').length,
  };
}
function admPainel(c, us, rs) {
  const k = indicadores(us, rs);
  const kp = (n, rot, sub, filtro, cls = '') => `<button class="adm-k ${cls}" ${filtro ? `data-ir='${JSON.stringify(filtro)}'` : 'disabled'}><b>${n}</b><span>${rot}</span>${sub ? `<em>${sub}</em>` : ''}</button>`;
  c.innerHTML = `<div class="adm-ks">
      ${kp(k.ativos, 'Usuários ativos', `${k.inativos} desativado${k.inativos === 1 ? '' : 's'}`, { aba: 'usuarios', sit: 'ativos', papel: '', uep: '', q: '' })}
      ${kp(k.admSis, 'Administradores do sistema', k.admSis < 2 ? 'Recomendado: ao menos 2' : k.admSis > 3 ? 'Recomendado: no máximo 3' : 'Dentro do recomendado', { aba: 'usuarios', sit: 'ativos', papel: 'sistema', uep: '', q: '' }, k.admSis < 2 || k.admSis > 3 ? 'at' : '')}
      ${kp(k.editores, 'Editores do Studio', 'Com perfil de editor em ao menos 1 unidade', { aba: 'usuarios', sit: 'ativos', papel: 'editor', uep: '', q: '' })}
      ${kp(k.revisao, 'Revisão de acesso vencida', `Sem revisão há mais de ${DIAS_REVISAO} dias`, { aba: 'usuarios', sit: 'revisao', papel: '', uep: '', q: '' }, k.revisao ? 'at' : 'ok')}
      ${kp(k.semAcesso, 'Contas pessoais sem uso', `Sem acesso há mais de ${DIAS_INATIVO} dias`, { aba: 'usuarios', sit: 'inativas', papel: '', uep: '', q: '' }, k.semAcesso ? 'at' : 'ok')}
      ${kp(k.compart, 'Contas compartilhadas', 'Contas genéricas de teste', { aba: 'usuarios', sit: 'compartilhadas', papel: '', uep: '', q: '' }, k.compart ? 'ne' : '')}
      ${kp(k.pedidos, 'Pedidos de cadastro', rs.cadastro?.aberto ? (rs.cadastro?.aprovacao ? 'Autocadastro com aprovação' : 'Autocadastro aberto, sem aprovação') : 'Autocadastro fechado', { aba: 'cadastro' }, k.pedidos ? 'at' : '')}
      ${kp(k.multi, 'Lotados em mais de 1 unidade', 'Veem a tela de seleção de unidade', { aba: 'usuarios', sit: 'ativos', papel: 'multi', uep: '', q: '' })}
    </div>
    <section class="pn"><div class="pn-h"><h2>Unidades do campo de Búzios</h2><span class="note">Usuários ativos lotados, editores e uso da REDIA</span></div>
      <div class="tbw"><table class="tb adm-tu"><thead><tr><th>Unidade</th><th>Situação</th><th>Usuários</th><th>Editores</th><th>Registros</th><th>Última REDIA</th><th>Atas</th></tr></thead><tbody>
      ${(rs.unidades || []).map(u => `<tr${u.ativa === false ? ' class="adm-off"' : ''}><td><b>${esc(u.uep)}</b> <span class="note">${esc(u.nome)}</span></td><td>${u.ativa === false ? '<span class="chip sd">Desativada</span>' : u.situacao === 'comissionamento' ? '<span class="chip at">Em comissionamento</span>' : '<span class="chip ok">Em operação</span>'}</td>
        <td><button class="btn lnk" data-ir='${JSON.stringify({ aba: 'usuarios', sit: 'ativos', papel: '', uep: u.uep, q: '' })}'>${u.usuarios}</button></td><td>${u.editores}${u.editores ? '' : ' <span class="chip at">sem editor</span>'}</td><td>${fmtN(u.registros)}</td><td>${u.ultimaRedia ? ddmmaaaa(String(u.ultimaRedia).slice(0, 10)) : '—'}</td><td>${u.atas}</td></tr>`).join('')}</tbody></table></div></section>`;
  bindIr(c);
}
function bindIr(c) { $$('[data-ir]', c).forEach(b => b.onclick = () => { Object.assign(filtrosAdm(), JSON.parse(b.dataset.ir)); telaAdmin(); }); }
const lotTxt = u => u.lotacoes.map(l => `<span class="adm-lot" title="${esc(l.uep)}${l.admin ? ' · administrador da unidade' : ''}${l.editor ? ' · editor' : ''}">${esc(l.uep)}${l.admin ? '<i>A</i>' : ''}${l.editor ? '<i class="e">E</i>' : ''}</span>`).join(' ');
function filtrarUsuarios(us, F) {
  const q = F.q.trim().toLowerCase();
  return us.filter(u => (!q || [u.chave, u.nome, u.email, u.posto].some(x => String(x || '').toLowerCase().includes(q)))
    && (!F.uep || u.lotacoes.some(l => l.uep === F.uep))
    && (!F.papel || (F.papel === 'sistema' ? u.adminSistema : F.papel === 'unidade' ? u.lotacoes.some(l => l.admin) : F.papel === 'editor' ? u.lotacoes.some(l => l.editor) : F.papel === 'multi' ? u.lotacoes.length > 1 : true))
    && (F.sit === 'todos' || (F.sit === 'ativos' ? u.ativo : F.sit === 'desativados' ? !u.ativo : F.sit === 'compartilhadas' ? u.ativo && u.compartilhado : F.sit === 'revisao' ? revisaoVencida(u) : F.sit === 'inativas' ? semAcesso(u) : F.sit === 'troca' ? u.trocarSenha : true)));
}
function admUsuarios(c, us) {
  const F = filtrosAdm();
  const sel = (id, val, ops) => `<select id="${id}" class="in">${ops.map(([v, t]) => `<option value="${v}"${v === val ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
  c.innerHTML = `<section class="pn"><div class="adm-bar">
      <input id="af-q" class="in" type="search" placeholder="Buscar por chave, nome, e-mail ou função" value="${esc(F.q)}" aria-label="Buscar usuário">
      ${sel('af-uep', F.uep, [['', 'Todas as unidades'], ...UNIDADES.map(u => [u.uep, u.uep])])}
      ${sel('af-papel', F.papel, [['', 'Todos os papéis'], ['sistema', 'Administrador do sistema'], ['unidade', 'Administrador da unidade'], ['editor', 'Editor do Studio'], ['multi', 'Lotado em mais de 1 unidade']])}
      ${sel('af-sit', F.sit, [['ativos', 'Ativos'], ['desativados', 'Desativados'], ['compartilhadas', 'Contas compartilhadas'], ['revisao', 'Revisão vencida'], ['inativas', `Sem acesso há ${DIAS_INATIVO}+ dias`], ['troca', 'Aguardando troca de senha'], ['todos', 'Todos']])}
      <span class="adm-acts"><button class="btn pri sm" data-a="novo">Novo usuário</button><button class="btn sm" data-a="importar">Importar contas de teste</button><button class="btn sm" data-a="csv">Exportar CSV</button></span></div>
    <div id="adm-lista"></div></section>`;
  const desenhar = () => {
    const l = filtrarUsuarios(us, F);
    $('#adm-lista', c).innerHTML = `<p class="note">${l.length} de ${us.length} usuário${us.length === 1 ? '' : 's'}</p><div class="tbw"><table class="tb adm-tb"><thead><tr><th>Chave</th><th>Nome</th><th>Função</th><th>Lotação</th><th>Papéis</th><th>Último acesso</th><th>Revisão</th><th>Situação</th><th></th></tr></thead><tbody>
      ${l.slice(0, 300).map(u => `<tr${u.ativo ? '' : ' class="adm-off"'}><td><b class="mono">${esc(u.chave)}</b></td><td>${esc(u.nome)}${u.email ? `<br><span class="note">${esc(u.email)}</span>` : ''}</td><td>${esc(nomePosto(u.posto))}<br><span class="note">${esc(u.coord || POSTO_COORD[u.posto] || '')}</span></td>
        <td>${lotTxt(u)}</td><td>${[u.proprietario ? '<span class="chip prop">Proprietário</span>' : '', u.adminSistema ? '<span class="chip nok">Adm. sistema</span>' : '', u.lotacoes.some(x => x.admin) ? '<span class="chip ne">Adm. unidade</span>' : '', u.lotacoes.some(x => x.editor) ? '<span class="chip ok">Editor</span>' : ''].filter(Boolean).join(' ') || '<span class="note">Usuário</span>'}</td>
        <td>${u.compartilhado ? '<span class="note">conta compartilhada</span>' : u.ultimoAcesso ? `${dataCurta(u.ultimoAcesso)}${semAcesso(u) ? ' <span class="chip at">sem uso</span>' : ''}` : '<span class="note">nunca</span>'}</td>
        <td>${u.revisadoEm ? ddmmaaaa(isoData(new Date(u.revisadoEm))) : '<span class="note">nunca</span>'}${revisaoVencida(u) ? ' <span class="chip at">vencida</span>' : ''}</td>
        <td>${u.ativo ? (u.trocarSenha ? '<span class="chip at">Troca de senha pendente</span>' : '<span class="chip ok">Ativo</span>') : '<span class="chip sd">Desativado</span>'}${u.compartilhado ? ' <span class="chip ne">Compartilhada</span>' : ''}</td>
        <td class="nw"><button class="btn sm" data-ed="${esc(u.userId)}">Editar</button>${podeExcluir(u) ? ` <button class="btn sm lnk perigo-l" data-ex="${esc(u.userId)}" title="Excluir a conta de ${esc(u.chave)}">Excluir</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="9" class="note">Nenhum usuário com estes filtros.</td></tr>'}</tbody></table></div>${l.length > 300 ? '<p class="note">Mostrando os 300 primeiros: refine a busca.</p>' : ''}`;
    $$('[data-ed]', c).forEach(b => b.onclick = () => editarUsuario(us.find(u => String(u.userId) === b.dataset.ed)));
    $$('[data-ex]', c).forEach(b => b.onclick = () => excluirUsuario(us.find(u => String(u.userId) === b.dataset.ex)));
  };
  desenhar();
  const q = $('#af-q', c); q.oninput = () => { F.q = q.value; desenhar(); };
  [['af-uep', 'uep'], ['af-papel', 'papel'], ['af-sit', 'sit']].forEach(([id, k]) => { $('#' + id, c).onchange = e => { F[k] = e.target.value; desenhar(); }; });
  $('[data-a="novo"]', c).onclick = () => editarUsuario(null);
  $('[data-a="importar"]', c).onclick = importarTeste;
  $('[data-a="csv"]', c).onclick = () => exportarUsuarios(filtrarUsuarios(us, F));
}
function gradeLotacoes(lots = []) {
  return `<div class="tbw"><table class="tb adm-gl"><thead><tr><th>Unidade</th><th>Lotado</th><th title="Reset da demonstração, configuração da unidade e pedidos de senha">Adm. da unidade</th><th title="Acessa o Studio e publica o layout das telas da unidade">Editor do Studio</th></tr></thead><tbody>
    ${UNIDADES.map(x => { const l = lots.find(y => y.uep === x.uep); return `<tr><td><b>${esc(x.uep)}</b>${x.ativa === false ? ' <span class="chip sd">desativada</span>' : ''}</td>
      <td><input type="checkbox" data-mdl-in="lot:${x.uep}" ${l ? 'checked' : ''} aria-label="Lotado na ${x.uep}"></td><td><input type="checkbox" data-mdl-in="adm:${x.uep}" ${l?.admin ? 'checked' : ''} aria-label="Administrador da ${x.uep}"></td><td><input type="checkbox" data-mdl-in="ed:${x.uep}" ${l?.editor ? 'checked' : ''} aria-label="Editor da ${x.uep}"></td></tr>`; }).join('')}</tbody></table></div>`;
}
const lerLotacoes = r => UNIDADES.filter(x => r['lot:' + x.uep] || r['adm:' + x.uep] || r['ed:' + x.uep]).map(x => ({ uep: x.uep, admin: !!r['adm:' + x.uep], editor: !!r['ed:' + x.uep] }));
async function editarUsuario(u) {
  const novo = !u, A = Admin();
  const ck = (k, rot, val, nota = '', dis = '') => `<label class="adm-ck"><input type="checkbox" data-mdl-in="${k}" ${val ? 'checked' : ''} ${dis}><span><b>${rot}</b>${nota ? `<span class="note">${nota}</span>` : ''}</span></label>`;
  const eu = !novo && (u.chave === USUARIO.chave || !!u.proprietario);   // D-74: proprietário nunca perde o perfil nem é desativado
  const r = await modal({
    titulo: novo ? 'Novo usuário' : `Usuário ${esc(u.chave)}`, largo: true,
    html: `<div class="fgrid">
        <div><label class="lbl" for="au-ch">Chave</label><input id="au-ch" class="in mono" data-mdl-in="chave" maxlength="4" value="${esc(u?.chave || '')}" ${novo ? '' : 'disabled'}></div>
        <div><label class="lbl" for="au-no">Nome</label><input id="au-no" class="in" data-mdl-in="nome" maxlength="120" value="${esc(u?.nome || '')}"></div>
        <div><label class="lbl" for="au-po">Função</label><select id="au-po" class="in" data-mdl-in="posto">${POSTOS_LISTA.map(p => `<option value="${esc(p)}"${p === (u?.posto || 'COPROD') ? ' selected' : ''}>${esc(nomePosto(p))}</option>`).join('')}</select></div>
        <div><label class="lbl" for="au-em">E-mail</label><input id="au-em" class="in" type="email" data-mdl-in="email" maxlength="160" value="${esc(u?.email || '')}"></div></div>
      <h3 class="adm-h3">Unidades de lotação e papéis</h3><p class="note">O usuário edita e consulta o histórico só das unidades em que está lotado. Lotado em mais de uma, escolhe a unidade ao entrar.</p>
      ${gradeLotacoes(u?.lotacoes || [])}
      <h3 class="adm-h3">Conta</h3><div class="adm-cks">
        ${ck('adminSistema', 'Administrador do sistema', u?.adminSistema, 'Todas as unidades e esta Administração', eu ? 'disabled' : '')}
        ${novo ? '' : ck('ativo', 'Conta ativa', u.ativo, 'Desativar mantém a autoria dos registros e das atas (não exclui)', eu ? 'disabled' : '')}
        ${ck('compartilhado', 'Conta compartilhada (teste)', u?.compartilhado, 'Conta genérica usada por várias pessoas: sem troca obrigatória de senha')}
        ${novo ? '' : ck('trocarSenha', 'Exigir troca de senha no próximo acesso', u.trocarSenha)}</div>
      ${novo ? `<p class="note">Ao criar, o sistema gera uma <b>senha provisória</b> e a envia ao e-mail informado${MODO_NUVEM ? '' : ' (na demonstração, ela aparece na tela)'}; sem e-mail, ela aparece uma vez para você repassar.</p>` : `<p class="note">Criado em ${dataCurta(u.criadoEm)} · último acesso ${dataCurta(u.ultimoAcesso)} · revisão de acesso ${dataCurta(u.revisadoEm)}</p>`}`,
    botoes: novo ? [{ id: 'cancelar', txt: 'Cancelar' }, { id: 'ok', txt: 'Criar usuário', cls: 'pri' }]
      : [...(podeExcluir(u) ? [{ id: 'excluir', txt: 'Excluir conta', cls: 'perigo' }] : []), { id: 'cancelar', txt: 'Cancelar' }, { id: 'senha', txt: 'Redefinir senha' }, { id: 'revisar', txt: 'Marcar acesso revisado' }, { id: 'ok', txt: 'Salvar', cls: 'pri' }],
  });
  if (r.id === 'cancelar') return;
  try {
    if (r.id === 'excluir') return excluirUsuario(u);
    if (r.id === 'revisar') { await A.revisar(u.userId); aviso(`Acesso de ${u.chave} marcado como revisado.`, 'ok'); return telaAdmin(); }
    if (r.id === 'senha') {
      const c = await modal({ titulo: 'Redefinir senha', html: `<p>Gerar uma nova senha provisória para <b>${esc(u.chave)}</b>? A senha atual deixa de valer${u.compartilhado ? ' para todos que usam esta conta compartilhada' : ' e o usuário troca a senha no próximo acesso'}.</p>`, botoes: [{ id: 'cancelar', txt: 'Cancelar' }, { id: 'ok', txt: 'Gerar senha provisória', cls: 'pri' }] });
      if (c.id !== 'ok') return;
      const o = await A.acao('redefinir', { userId: u.userId });
      if (o.senhaTemporaria) await mostrarSenha(u.chave, o.senhaTemporaria); else aviso(`Senha provisória enviada ao e-mail de ${u.chave}.`, 'ok');
      return telaAdmin();
    }
    const lot = lerLotacoes(r);
    if (!lot.length) return aviso('Marque ao menos uma unidade de lotação.', 'erro');
    if (novo) {
      const chave = String(r.chave || '').toUpperCase();
      if (!/^[A-Z0-9]{4}$/.test(chave)) return aviso('A chave precisa ter exatamente 4 letras ou números.', 'erro');
      if (String(r.nome || '').trim().length < 2) return aviso('Informe o nome.', 'erro');
      const o = await A.acao('criar', { chave, nome: r.nome.trim(), posto: r.posto, email: r.email || '', lotacoes: lot, adminSistema: !!r.adminSistema, compartilhado: !!r.compartilhado });
      if (o.senhaTemporaria) await mostrarSenha(chave, o.senhaTemporaria); else aviso(`Usuário ${chave} criado. Senha provisória enviada ao e-mail informado.`, 'ok');
    } else {
      await A.salvarUsuario({ userId: u.userId, nome: r.nome, posto: r.posto, email: r.email, uep: lot[0].uep, adminSistema: eu ? true : !!r.adminSistema, ativo: eu ? true : !!r.ativo, compartilhado: !!r.compartilhado, trocarSenha: !!r.trocarSenha, lotacoes: lot });
      aviso(`Usuário ${u.chave} atualizado.`, 'ok');
      if (eu && !MODO_NUVEM) { const a = acessoDemo(u.chave); if (a) definirUsuario(a, USUARIO.uep); }
    }
    telaAdmin();
  } catch (e) { aviso(e.message, 'erro'); }
}
/* D-74 · exclusão de conta: nunca o proprietário do sistema nem a própria conta; confirmação digitando a chave */
const podeExcluir = u => !!u && !u.proprietario && u.chave !== USUARIO?.chave;
async function excluirUsuario(u) {
  if (!podeExcluir(u)) return aviso(u?.proprietario ? 'A conta do proprietário do sistema não pode ser excluída.' : 'Você não pode excluir a sua própria conta.', 'erro');
  const r = await modal({ titulo: `Excluir a conta ${esc(u.chave)}?`, html: `<p>Exclui definitivamente a conta de <b>${esc(u.nome)}</b> (${esc(u.chave)}): acesso, perfil e lotações em ${u.lotacoes.map(l => esc(l.uep)).join(', ') || '—'}.</p>
      <p>Os registros e as atas em que a pessoa aparece continuam (guardam o nome do autor) e a exclusão fica na auditoria. A chave pode ser cadastrada de novo depois.</p>
      <p class="note">Se a pessoa pode voltar, prefira <b>desativar</b> a conta (Editar › Conta ativa): o histórico de acesso continua.</p>
      <label class="lbl" for="mdl-exc">Para confirmar, digite a chave ${esc(u.chave)}</label><input id="mdl-exc" class="in mono" data-mdl-in="conf" autocomplete="off" maxlength="4">`,
    botoes: [{ id: 'cancelar', txt: 'Cancelar' }, { id: 'ok', txt: 'Excluir definitivamente', cls: 'perigo' }] });
  if (r.id !== 'ok') return;
  if (String(r.conf || '').toUpperCase() !== u.chave) return aviso('Exclusão cancelada: a chave digitada não confere.', 'erro');
  try { await Admin().acao('excluir', { userId: u.userId }); aviso(`Conta ${u.chave} excluída.`, 'ok'); telaAdmin(); } catch (e) { aviso(e.message, 'erro'); }
}
/* D-74 · dados de teste por unidade (só administrador do sistema): histórico de 15 dias e reset total */
async function abrirUnidadeAdm(uep) {
  if (USUARIO.uep === uep && Store.modo) return;
  aplicarUnidade(uep); await iniciarSessao(true);
}
function admTestes(c, us, rs) {
  const F = filtrosAdm(); F.uepT = F.uepT || USUARIO.uep || 'P-83';
  const u = (rs.unidades || []).find(x => x.uep === F.uepT) || {};
  c.innerHTML = `<section class="pn adm-ts"><div class="pn-h"><h2>Dados de teste</h2><span class="note">Ações que mexem em muitos registros de uma unidade: só o administrador do sistema</span></div>
    <div class="adm-bar"><label class="lbl" for="at-un" style="margin:0">Unidade</label><select id="at-un" class="in">${UNIDADES.map(x => `<option value="${esc(x.uep)}"${x.uep === F.uepT ? ' selected' : ''}>${esc(x.uep)} · ${esc(x.nome)}</option>`).join('')}</select>
      <span class="note">${fmtN(u.registros || 0)} registros · última REDIA ${u.ultimaRedia ? ddmmaaaa(String(u.ultimaRedia).slice(0, 10)) : '—'} · ${u.atas || 0} ata(s)</span></div>
    <div class="adm-tsg">
      ${EXEMPLO_DISPONIVEL ? `<div class="adm-tsc"><h3>Gerar histórico de 15 dias</h3><p>Grava REDIAs de exemplo encerradas dos 15 dias anteriores a hoje na ${esc(F.uepT)} ${MODO_NUVEM ? '(na base, visíveis para todos)' : '(neste navegador)'}, para tendências, recorrência, visão semanal e Arquivo. Dias que já têm pauta congelada ou ata ficam como estão.</p><button class="btn sec" data-t="hist">Gerar histórico de 15 dias</button></div>` : ''}
      ${EXEMPLO_DISPONIVEL ? `<div class="adm-tsc"><h3>Ata automática das 23:59</h3><p>Todos os dias às 23:59, cada unidade sem ata arquivada recebe uma ata totalmente preenchida (dados fictícios onde estiver vazio), para manter a base do período de teste atualizada${MODO_NUVEM ? ' (função do servidor redia-ata-auto, agendada às 23:59 e às 00:10)' : ' (na demonstração, às 23:59 com o app aberto ou na próxima abertura)'}. Para testar agora, gere a de hoje: a REDIA da ${esc(F.uepT)} fica encerrada.</p><button class="btn sec" data-t="ata">Gerar a ata automática de hoje agora</button></div>` : ''}
      <div class="adm-tsc perigo"><h3>Resetar todos os dados de teste</h3><p>Apaga <b>todos os registros da ${esc(F.uepT)}</b>, de todos os dias ${MODO_NUVEM ? '(na base, para todos os usuários)' : '(neste navegador)'}. Usuários, configuração e layout do Studio continuam. Para apagar só o dia, use “Resetar a REDIA de hoje” no Início.</p><button class="btn perigo" data-t="reset">Resetar todos os dados da ${esc(F.uepT)}</button></div>
    </div></section>`;
  $('#at-un', c).onchange = e => { F.uepT = e.target.value; telaAdmin(); };
  $('[data-t="hist"]', c) && ($('[data-t="hist"]', c).onclick = async e => {
    const r0 = await modal({ titulo: `Gerar histórico de 15 dias na ${esc(F.uepT)}?`, html: `<p>Grava REDIAs de exemplo encerradas de ${ddmm(addDias(isoData(Relogio.agora()), -15))} a ${ddmm(addDias(isoData(Relogio.agora()), -1))} ${MODO_NUVEM ? '<b>na base de dados, visíveis para todos</b>' : 'neste navegador'}, marcadas como exemplo.</p>`, botoes: [{ id: 'cancelar', txt: 'Cancelar' }, { id: 'ok', txt: 'Gerar histórico', cls: 'pri' }] });
    if (r0.id !== 'ok') return;
    e.target.disabled = true;
    try { await abrirUnidadeAdm(F.uepT); const r = await gravarHistorico(DIA, 15); if (Store.remoto()) await Store.carregar(DIA); atualizarEstado(); if (!MODO_NUVEM) DiretorioDemo.auditar('teste.historico', F.uepT, { dias: r.dias, registros: r.n });
      aviso(r.n ? `Histórico gravado na ${F.uepT}: ${r.dias} dia(s), ${r.n} registros${r.pulados ? ` · ${r.pulados} dia(s) já encerrados foram mantidos` : ''}.` : 'Nada a gravar: os 15 dias anteriores já têm REDIA encerrada.', 'ok'); }
    catch (x) { aviso('Não foi possível gravar o histórico: ' + x.message, 'erro'); }
    telaAdmin();
  });
  $('[data-t="ata"]', c) && ($('[data-t="ata"]', c).onclick = async e => {   // D-75
    const hoje = isoData(Relogio.agora());
    const r0 = await modal({ titulo: `Gerar a ata automática de hoje na ${esc(F.uepT)}?`, html: `<p>Completa a REDIA de ${ddmmaaaa(hoje)} com dados fictícios onde estiver vazio, congela a pauta e fecha a ata ${MODO_NUVEM ? '<b>na base, para todos</b>' : 'neste navegador'}. Depois disso, nada mais entra no dia (para recomeçar, use “Resetar a REDIA de hoje” no Início).</p>`, botoes: [{ id: 'cancelar', txt: 'Cancelar' }, { id: 'ok', txt: 'Gerar a ata', cls: 'pri' }] });
    if (r0.id !== 'ok') return;
    e.target.disabled = true;
    try {
      if (MODO_NUVEM) { const o = await Nuvem.ataAutomatica(F.uepT, hoje); const f = (o.feito || [])[0] || {}; if (f.erro) throw new Error(f.erro); aviso(`${F.uepT}: ${f.situacao || 'concluído'}${f.registros ? ` (${f.registros} registros)` : ''}.`, 'ok'); if (USUARIO.uep === F.uepT) { await Store.carregar(DIA); atualizarEstado(); } }
      else { await abrirUnidadeAdm(F.uepT); const regs = montarAtaAutomatica(hoje, [...Store.cache.values()].filter(r => r.data === hoje)); if (regs.length) { await Store.gravarLote(regs); atualizarEstado(); DiretorioDemo.auditar('ata.automatica', F.uepT, { data: hoje, registros: regs.length }); } aviso(regs.length ? `Ata automática de ${ddmm(hoje)} gerada na ${F.uepT} (${regs.length} registros).` : 'A REDIA de hoje já tem ata arquivada.', 'ok'); }
    } catch (x) { aviso('Não foi possível gerar a ata: ' + x.message, 'erro'); }
    telaAdmin();
  });
  $('[data-t="reset"]', c).onclick = async () => {
    try { await abrirUnidadeAdm(F.uepT); } catch (x) { return aviso('Não foi possível abrir a ' + F.uepT + ': ' + x.message, 'erro'); }
    const antes = Store.cache.size; await resetarDemonstracao();
    if (!MODO_NUVEM && Store.cache.size < antes) DiretorioDemo.auditar('teste.resetar_tudo', F.uepT, { registros: antes });
    telaAdmin();
  };
}
async function importarTeste() {
  const r = await modal({
    titulo: 'Importar contas de teste', largo: true,
    html: `<p>Cria as contas genéricas de teste das unidades marcadas, uma por função (13 por unidade). Padrão da chave: prefixo da função + número da unidade (ex.: P-74 → GO74, GP74, CP74, CM74, CE74, SP74, SM74, SI74, SE74, EE74, EM74, EQ74, EP74). Chaves que já existem ficam como estão.</p>
      <div class="adm-cks adm-uns">${UNIDADES.map(u => `<label class="adm-ck"><input type="checkbox" data-mdl-in="u:${u.uep}" ${u.uep !== 'P-83' ? 'checked' : ''}><span><b>${esc(u.uep)}</b></span></label>`).join('')}</div>
      ${MODO_NUVEM ? `<label class="lbl" for="ai-s1">Senha única destas contas</label><input id="ai-s1" class="in" type="password" autocomplete="new-password" data-mdl-in="s1" maxlength="72">
      <label class="lbl" for="ai-s2">Repita a senha</label><input id="ai-s2" class="in" type="password" autocomplete="new-password" data-mdl-in="s2" maxlength="72">
      <p class="note">Contas compartilhadas não trocam a senha no primeiro acesso. Use uma senha só de teste, diferente de senhas corporativas, e repasse por canal individual.</p>` : '<p class="note">Na demonstração, as contas de teste já existem com a senha 1234: a importação só recria as que você tiver alterado.</p>'}`,
    botoes: [{ id: 'cancelar', txt: 'Cancelar' }, { id: 'ok', txt: 'Importar', cls: 'pri' }],
  });
  if (r.id !== 'ok') return;
  const ueps = UNIDADES.filter(u => r['u:' + u.uep]).map(u => u.uep);
  if (!ueps.length) return aviso('Marque ao menos uma unidade.', 'erro');
  let senha = SENHA_GENERICA;
  if (MODO_NUVEM) { if (r.s1 !== r.s2) return aviso('As senhas não conferem.', 'erro'); if (r.s1.length < 8 || !/\d/.test(r.s1) || !/[A-Za-z]/.test(r.s1)) return aviso('A senha precisa ter ao menos 8 caracteres, com letras e números.', 'erro'); senha = r.s1; }
  const usuarios = ueps.flatMap(uep => Object.entries(POSTOS_TESTE).map(([pf, posto]) => ({ chave: pf + uep.slice(2), nome: `Teste ${nomePosto(posto)} ${uep} (conta genérica)`, posto, uep })));
  try { const o = await Admin().acao('importar', { usuarios, senha }); aviso(`Importação: ${o.criados} criada${o.criados === 1 ? '' : 's'}, ${o.existentes} já existia${o.existentes === 1 ? '' : 'm'}${o.erros?.length ? `, ${o.erros.length} com erro` : ''}.`, o.erros?.length ? 'erro' : 'ok'); telaAdmin(); }
  catch (e) { aviso(e.message, 'erro'); }
}
function exportarUsuarios(l) {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const linhas = [['chave', 'nome', 'funcao', 'coordenacao', 'email', 'lotacoes', 'admin_sistema', 'ativo', 'compartilhada', 'ultimo_acesso', 'revisao_acesso'].join(';'),
    ...l.map(u => [u.chave, u.nome, u.posto, u.coord || POSTO_COORD[u.posto] || '', u.email, u.lotacoes.map(x => x.uep + (x.admin ? '(A)' : '') + (x.editor ? '(E)' : '')).join(' '), u.adminSistema ? 'sim' : 'não', u.ativo ? 'sim' : 'não', u.compartilhado ? 'sim' : 'não', u.ultimoAcesso || '', u.revisadoEm || ''].map(q).join(';'))];
  baixar(`redia_buzios_usuarios_${isoData(new Date())}.csv`, '﻿' + linhas.join('\n'), 'text/csv;charset=utf-8');
  aviso('Lista exportada (sem senhas).', 'ok');
}
function admUnidades(c, us, rs) {
  c.innerHTML = `<section class="pn"><div class="pn-h"><h2>Unidades</h2><span class="note">Nome exibido, situação (o status “Em comissionamento” aparece nas telas da unidade) e unidade ativa no sistema</span></div>
    <div class="tbw"><table class="tb adm-un"><thead><tr><th>UEP</th><th>Nome</th><th>Situação</th><th>Ativa</th><th>Usuários</th><th></th></tr></thead><tbody>
    ${(rs.unidades || []).map(u => `<tr data-un="${esc(u.uep)}"><td><b>${esc(u.uep)}</b></td><td><input class="in" data-k="nome" value="${esc(u.nome)}" maxlength="60"></td>
      <td><select class="in" data-k="situacao"><option value="operacao"${u.situacao !== 'comissionamento' ? ' selected' : ''}>Em operação</option><option value="comissionamento"${u.situacao === 'comissionamento' ? ' selected' : ''}>Em comissionamento</option></select></td>
      <td><input type="checkbox" data-k="ativa" ${u.ativa !== false ? 'checked' : ''} aria-label="Unidade ${esc(u.uep)} ativa"></td><td>${u.usuarios}</td><td><button class="btn sm" data-sv>Salvar</button></td></tr>`).join('')}</tbody></table></div>
    <p class="note">Desativar uma unidade a retira da lista de acesso de todos (os registros e as atas continuam guardados).</p></section>`;
  $$('[data-un]', c).forEach(tr => { $('[data-sv]', tr).onclick = async () => {
    const p = { uep: tr.dataset.un, nome: $('[data-k="nome"]', tr).value.trim(), situacao: $('[data-k="situacao"]', tr).value, ativa: $('[data-k="ativa"]', tr).checked };
    const antes = (rs.unidades || []).find(x => x.uep === p.uep);
    if (!p.ativa && antes?.ativa !== false) { const c = await modal({ titulo: `Desativar a ${esc(p.uep)}?`, html: `<p>A ${esc(p.uep)} sai da lista de acesso de todos os usuários (${antes?.usuarios || 0} lotado${antes?.usuarios === 1 ? '' : 's'}). Os registros e as atas continuam guardados e a unidade pode ser reativada.</p>`, botoes: [{ id: 'cancelar', txt: 'Cancelar' }, { id: 'ok', txt: 'Desativar', cls: 'perigo' }] }); if (c.id !== 'ok') return; }
    try { await Admin().salvarUnidade(p); const x = UNIDADES.find(y => y.uep === p.uep); if (x) Object.assign(x, { nome: p.nome, situacao: p.situacao, ativa: p.ativa }); aviso(`${p.uep} atualizada.`, 'ok'); telaAdmin(); } catch (e) { aviso(e.message, 'erro'); }
  }; });
}
function admCadastro(c, us, rs) {
  const cad = { aberto: true, aprovacao: false, ...(rs.cadastro || {}) };
  const SITC = { cadastrado: ['ok', 'Cadastrado'], aguardando: ['at', 'Aguardando aprovação'], falha: ['nok', 'Falha'], recusado: ['sd', 'Recusado'], ignorado: ['ne', 'Ignorado'], enviada: ['ok', 'Enviada'] };
  const sit = s => `<span class="chip ${(SITC[s] || SITC.ignorado)[0]}">${esc((SITC[s] || [0, s])[1])}</span>`;
  const pc = rs.pedidosCadastro || [], ps = rs.pedidosSenha || [];
  c.innerHTML = `<div class="grid2">
    <section class="pn"><h2>Autocadastro</h2>
      <p>A tela de login oferece “Cadastrar-se”: o novo usuário informa chave, nome, e-mail, unidade e função e recebe uma senha provisória por e-mail.</p>
      <div class="adm-cks"><label class="adm-ck"><input type="checkbox" id="pc-ab" ${cad.aberto ? 'checked' : ''}><span><b>Autocadastro aberto</b><span class="note">Desligado, o pedido é recusado com orientação para procurar o administrador</span></span></label>
      <label class="adm-ck"><input type="checkbox" id="pc-ap" ${cad.aprovacao ? 'checked' : ''}><span><b>Exigir aprovação do administrador</b><span class="note">Recomendado quando houver dados reais: a conta só é criada depois da aprovação</span></span></label></div>
      <button class="btn pri sm" id="pc-sv">Salvar parâmetros</button>
      ${MODO_NUVEM ? '<p class="note">Envio de e-mail: Edge Functions redia-cadastro e redia-admin com o Resend. Sem domínio verificado, o Resend só entrega ao e-mail da própria conta; nesse caso a senha vai para o administrador.</p>' : ''}</section>
    <section class="pn"><h2>Pedidos de nova senha</h2>${ps.length ? `<div class="tbw"><table class="tb"><thead><tr><th>Quando</th><th>Chave</th><th>Unidade</th><th>Situação</th></tr></thead><tbody>
      ${ps.slice(0, 50).map(p => `<tr><td>${dataCurta(p.pedido_em)}</td><td><b class="mono">${esc(p.chave)}</b></td><td>${esc(p.uep || '—')}</td><td>${sit(p.situacao)}${p.detalhe ? `<br><span class="note">${esc(p.detalhe)}</span>` : ''}</td></tr>`).join('')}</tbody></table></div>` : `<p class="note">${MODO_NUVEM ? 'Nenhum pedido de “Esqueci a senha”.' : 'Na demonstração não há “Esqueci a senha”.'}</p>`}</section>
    <section class="pn adm-full"><h2>Pedidos de cadastro</h2>${pc.length ? `<div class="tbw"><table class="tb"><thead><tr><th>Quando</th><th>Chave</th><th>Nome · e-mail</th><th>Unidade · função</th><th>Situação</th><th></th></tr></thead><tbody>
      ${pc.slice(0, 50).map(p => `<tr><td>${dataCurta(p.pedido_em)}</td><td><b class="mono">${esc(p.chave)}</b></td><td>${esc(p.nome || '')}<br><span class="note">${esc(p.email || '')}</span></td><td>${esc(p.uep || '')}<br><span class="note">${esc(nomePosto(p.posto || ''))}</span></td><td>${sit(p.situacao)}${p.detalhe ? `<br><span class="note">${esc(p.detalhe)}</span>` : ''}</td>
        <td>${p.situacao === 'aguardando' ? `<button class="btn sm pri" data-ap="${p.id}">Aprovar</button> <button class="btn sm" data-rc="${p.id}">Recusar</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="note">Nenhum pedido de cadastro.</p>'}</section></div>`;
  $('#pc-sv', c).onclick = async () => { try { await Admin().parametro('cadastro', { aberto: $('#pc-ab', c).checked, aprovacao: $('#pc-ap', c).checked }); aviso('Parâmetros do autocadastro salvos.', 'ok'); telaAdmin(); } catch (e) { aviso(e.message, 'erro'); } };
  $$('[data-ap]', c).forEach(b => b.onclick = async () => { try { const p = pc.find(x => String(x.id) === b.dataset.ap); const o = await Admin().acao('aprovar', { pedidoId: +b.dataset.ap }); if (o.senhaTemporaria) await mostrarSenha(p.chave, o.senhaTemporaria); else aviso(`Cadastro de ${p.chave} aprovado. Senha provisória enviada ao e-mail do usuário.`, 'ok'); telaAdmin(); } catch (e) { aviso(e.message, 'erro'); } });
  $$('[data-rc]', c).forEach(b => b.onclick = async () => { try { await Admin().acao('recusar', { pedidoId: +b.dataset.rc }); aviso('Pedido recusado.', 'ok'); telaAdmin(); } catch (e) { aviso(e.message, 'erro'); } });
}
const ACOES_AUD = { 'usuario.alterar': 'Usuário alterado', 'usuario.criar': 'Usuário criado', 'usuario.revisar_acesso': 'Acesso revisado', 'usuario.redefinir_senha': 'Senha redefinida', 'usuario.importar': 'Contas de teste importadas', 'usuario.autocadastro': 'Autocadastro', 'cadastro.aprovar': 'Cadastro aprovado', 'cadastro.recusar': 'Cadastro recusado', 'unidade.alterar': 'Unidade alterada', 'parametro.alterar': 'Parâmetro alterado', 'layout.publicar': 'Layout publicado (Studio)', 'layout.restaurar': 'Layout restaurado (Studio)', 'usuario.excluir': 'Conta excluída', 'teste.resetar_tudo': 'Dados de teste resetados (tudo)', 'teste.resetar_dia': 'REDIA do dia resetada', 'teste.historico': 'Histórico de 15 dias gerado', 'ata.automatica': 'Ata automática (23:59)' };
function resumoDetalhe(a) {
  const d = a.detalhe || {};
  if (a.acao === 'usuario.alterar' && d.depois) {
    const an = d.antes || {}, dp = d.depois, m = [], lt = x => (x || []).map(l => l.uep + (l.admin ? 'A' : '') + (l.editor ? 'E' : '')).join(' ');
    if ((an.posto || '') !== (dp.posto || an.posto || '')) m.push(`função ${an.posto} → ${dp.posto}`);
    const la = lt(an.lotacoes || []), ld = lt(dp.lotacoes || []); if (la && la !== ld) m.push(`lotação ${la} → ${ld}`); else if (!la && ld) m.push(`lotação ${ld}`);
    ['adminSistema', 'ativo'].forEach(k => { const va = an[k] ?? an[k === 'adminSistema' ? 'admin_sistema' : k]; if (dp[k] !== undefined && va !== undefined && va !== dp[k]) m.push(`${k === 'ativo' ? 'ativo' : 'adm. sistema'} ${va ? 'sim' : 'não'} → ${dp[k] ? 'sim' : 'não'}`); });
    return m.join(' · ') || 'dados do perfil';
  }
  return Object.entries(d).filter(([k]) => !['antes', 'depois'].includes(k)).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ').slice(0, 220);
}
function admAuditoria(c) {
  c.innerHTML = '<section class="pn"><p class="note">Carregando a auditoria…</p></section>';
  Admin().auditoria().then(l => {
    const F = filtrosAdm(); F.qa = F.qa || '';
    c.innerHTML = `<section class="pn"><div class="pn-h"><h2>Auditoria</h2><span class="note">Quem alterou o quê e quando · trilha só de acréscimo (últimos 300 eventos)</span></div>
      <div class="adm-bar"><input id="aa-q" class="in" type="search" placeholder="Filtrar por chave, ação ou detalhe" value="${esc(F.qa)}" aria-label="Filtrar auditoria"></div><div id="aa-l"></div></section>`;
    const des = () => { const q = F.qa.trim().toLowerCase(); const f = l.filter(a => !q || [a.por, a.alvo, a.acao, ACOES_AUD[a.acao], JSON.stringify(a.detalhe)].some(x => String(x || '').toLowerCase().includes(q)));
      $('#aa-l', c).innerHTML = f.length ? `<div class="tbw"><table class="tb"><thead><tr><th>Quando</th><th>Por</th><th>Ação</th><th>Alvo</th><th>Detalhe</th></tr></thead><tbody>${f.map(a => `<tr><td class="nw">${dataCurta(a.em)}</td><td><b class="mono">${esc(a.por || '—')}</b></td><td>${esc(ACOES_AUD[a.acao] || a.acao)}</td><td class="mono">${esc(a.alvo || '')}</td><td class="note">${esc(resumoDetalhe(a))}</td></tr>`).join('')}</tbody></table></div>` : '<p class="note">Nenhum evento.</p>'; };
    des(); const q = $('#aa-q', c); q.oninput = () => { F.qa = q.value; des(); };
  }).catch(e => { c.innerHTML = `<div class="banner erro">${esc(e.message)}</div>`; });
}
function admPraticas(c, us, rs) {
  const k = indicadores(us, rs), st = (ok, txt) => `<span class="chip ${ok === null ? 'ne' : ok ? 'ok' : 'at'}">${esc(txt)}</span>`;
  const P = [
    ['Menor privilégio', 'Cada pessoa recebe só os papéis de que precisa, só nas unidades em que trabalha. Administrador do sistema: 2 a 3 pessoas (nunca uma só, para não depender de uma pessoa; poucas, para reduzir risco).', st(k.admSis >= 2 && k.admSis <= 3, `${k.admSis} administrador${k.admSis === 1 ? '' : 'es'} do sistema`), 'NIST SP 800-53 AC-6'],
    ['Ciclo de vida da conta', 'Entrada, mudança de unidade e saída tratadas no mesmo dia: ao mudar de unidade, ajuste a lotação; ao sair, desative (não exclua: a autoria dos registros e das atas é preservada).', st(k.inativos === 0 ? null : true, `${k.inativos} conta${k.inativos === 1 ? '' : 's'} desativada${k.inativos === 1 ? '' : 's'}`), 'NIST SP 800-53 AC-2'],
    ['Revisão periódica de acesso', `Revise lotações e papéis de cada usuário a cada ${DIAS_REVISAO} dias e marque “acesso revisado”. Prioridade: administradores e editores.`, st(k.revisao === 0, `${k.revisao} revisão${k.revisao === 1 ? '' : 'ões'} vencida${k.revisao === 1 ? '' : 's'}`), 'NIST SP 800-53 AC-2(j) · ISO/IEC 27001 5.18'],
    ['Contas sem uso', `Contas pessoais sem acesso há mais de ${DIAS_INATIVO} dias devem ser confirmadas com a liderança da unidade ou desativadas.`, st(k.semAcesso === 0, `${k.semAcesso} conta${k.semAcesso === 1 ? '' : 's'} sem uso`), 'NIST SP 800-53 AC-2(3)'],
    ['Contas compartilhadas só para teste', 'Contas genéricas não identificam quem registrou: use só na fase de testes e substitua por contas pessoais antes do uso com dados reais.', st(k.compart === 0, `${k.compart} conta${k.compart === 1 ? '' : 's'} compartilhada${k.compart === 1 ? '' : 's'}`), 'NIST SP 800-53 AC-2(9)'],
    ['Separação de funções', 'O administrador não retira o próprio perfil nem desativa a própria conta, e o sistema exige ao menos um administrador ativo. Editor do Studio muda o layout; não muda dados nem permissões.', st(true, 'Garantido pelo sistema'), 'NIST SP 800-53 AC-5'],
    ['Trilha de auditoria', 'Toda criação, alteração de perfil, lotação, papel, unidade e parâmetro fica registrada com autor e hora, sem possibilidade de edição. Consulte na aba Auditoria.', st(true, 'Ativa'), 'NIST SP 800-53 AU-2 · AU-12'],
    ['Autenticação', 'Senha provisória com troca obrigatória no 1º acesso e alerta para não reutilizar a senha Petrobras. Para administradores, a boa prática é o segundo fator (MFA): decisão pendente com a TI.', st(false, 'MFA pendente'), 'OWASP ASVS V4.3.1'],
    ['Autocadastro controlado', 'Aberto só na fase de prova de conceito. Com dados reais: ligar a aprovação do administrador (ou fechar) e conferir a chave com a liderança da unidade.', st(rs.cadastro?.aprovacao || !rs.cadastro?.aberto, rs.cadastro?.aberto ? (rs.cadastro?.aprovacao ? 'Aberto com aprovação' : 'Aberto sem aprovação') : 'Fechado'), 'NIST SP 800-53 AC-2(1)'],
    ['Editor por unidade', 'Cada unidade deve ter ao menos um editor do Studio para ajustar as próprias telas sem depender de mudança de código.', st((rs.unidades || []).every(u => u.ativa === false || u.editores > 0), `${(rs.unidades || []).filter(u => u.ativa !== false && !u.editores).length} unidade(s) sem editor`), 'Prática do sistema (D-73)'],
  ];
  c.innerHTML = `<section class="pn"><div class="pn-h"><h2>Boas práticas de administração</h2><span class="note">Situação atual de cada prática, calculada a partir dos usuários e da configuração</span></div>
    <ol class="adm-bp">${P.map(([t, d, s, ref]) => `<li><div><b>${t}</b><p>${d}</p><span class="note">Referência: ${ref}</span></div>${s}</li>`).join('')}</ol>
    <p class="note">Referências: NIST SP 800-53 Rev. 5 (famílias AC e AU), ISO/IEC 27001:2022 (controle 5.18, direitos de acesso) e OWASP ASVS 4.0 (V4, controle de acesso). Prazos de ${DIAS_REVISAO} e ${DIAS_INATIVO} dias são premissas do protótipo, a validar com a segurança da informação.</p></section>`;
}
