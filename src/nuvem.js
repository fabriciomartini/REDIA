/* ===================== REDIA P-83 · base de dados na nuvem (Supabase) ===================== */
'use strict';
/* Toda a conversa com o Supabase passa por aqui (D-48):
   - Auth: login por chave (e-mail técnico <chave>@<emailDominio>) e senha pessoal; sessão só desta aba (sessionStorage)
   - RPC: redia_carregar, redia_novos, redia_gravar, redia_meu_perfil, redia_config_* (ver supabase/01_schema.sql)
   - Tempo real: aviso de registro novo da UEP → o app sincroniza (a leitura em si é sempre por RPC)
   - Storage: bucket privado "redia" para pauta congelada, ata e transcrição */
const ERROS_NUVEM = {
  PAUTA_CONGELADA: 'A pauta deste dia foi congelada por outra sessão. A alteração não foi gravada.',
  ATA_FECHADA: 'A ata desta REDIA já foi fechada e arquivada: ela não pode mais ser alterada.',
  REDIA_JA_INICIADA: 'A REDIA deste dia já foi iniciada por outro usuário.',
  PAUTA_NAO_CONGELADA: 'Congele a pauta antes do de acordo e do fechamento da ata.',
  ATA_SEM_ACORDO: 'Falta o de acordo de um ou mais responsáveis: a ata não foi fechada.',
  SEM_PERFIL: 'Sua chave não tem perfil ativo na REDIA. Procure o administrador.',
  UEP_NAO_PERMITIDA: 'Registro de outra UEP: não gravado.',
  SEM_PERMISSAO_RESET: 'Só o administrador da UEP pode resetar a demonstração.',
  SEM_PERMISSAO: 'Só o GEPLAT ou o administrador alteram a configuração da UEP.',
  LOTE_INVALIDO: 'Lote de registros inválido.',
};
class ErroNuvem extends Error { constructor(msg, codigo) { super(msg); this.codigo = codigo; } }
function erroNuvem(e) {
  const m = String(e?.message || e || '');
  const cod = Object.keys(ERROS_NUVEM).find(k => m.includes(k));
  if (cod) return new ErroNuvem(ERROS_NUVEM[cod], cod);
  if (/fetch|network|Load failed|ECONN|timeout/i.test(m)) { Store.online = false; return new ErroNuvem('Sem conexão com a base de dados. Verifique a rede e tente de novo.', 'REDE'); }
  if (/JWT|token|PGRST30/i.test(m)) return new ErroNuvem('Sessão expirada. Entre de novo.', 'SESSAO');
  if (/permission denied|row-level security/i.test(m)) return new ErroNuvem('Operação não permitida para o seu perfil.', 'PERMISSAO');
  return new ErroNuvem('Erro na base de dados: ' + m, 'BASE');
}

const Nuvem = {
  cli: null, canal: null, _t: null,
  cliente() {
    if (!this.cli) {
      this.cli = window.supabase.createClient(NUVEM.supabaseUrl, NUVEM.supabaseAnonKey, {
        auth: { storage: window.sessionStorage, storageKey: 'redia.sb.sessao', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
        global: { headers: { 'x-redia-versao': APP.versao } },
      });
    }
    return this.cli;
  },
  rotulo() { try { return 'Supabase · ' + new URL(NUVEM.supabaseUrl).hostname.split('.')[0]; } catch { return 'Supabase'; } },
  email(chave) { return chave.toLowerCase() + '@' + (NUVEM.emailDominio || 'redia.local'); },

  async entrar(chave, senha) {
    if (!senha) return { erro: 'Informe a senha.' };
    let r;
    try { r = await this.cliente().auth.signInWithPassword({ email: this.email(chave), password: senha }); }
    catch (e) { return { erro: erroNuvem(e).message }; }
    if (r.error) {
      const m = r.error.message || '';
      if (/invalid login|invalid credentials|invalid_grant/i.test(m)) return { erro: 'Chave ou senha incorreta.' };
      if (/not confirmed/i.test(m)) return { erro: 'Usuário ainda não confirmado na base. Procure o administrador.' };
      if (/rate|too many/i.test(m)) return { erro: 'Muitas tentativas. Aguarde alguns minutos.' };
      return { erro: erroNuvem(r.error).message };
    }
    let perfil = null;
    try { perfil = await this.rpc('redia_meu_perfil'); } catch (e) { await this.sair(); return { erro: e.message }; }
    if (!perfil) { await this.sair(); return { erro: ERROS_NUVEM.SEM_PERFIL }; }
    return { ok: true, perfil };
  },
  /* sessão já aberta nesta aba (recarregar a página não pede login de novo) */
  async restaurar() {
    try {
      const { data } = await this.cliente().auth.getSession();
      if (!data?.session) return null;
      return await this.rpc('redia_meu_perfil');
    } catch { return null; }
  },
  async trocarSenha(nova) {
    const { error } = await this.cliente().auth.updateUser({ password: nova });
    if (error) {
      const m = error.message || '';
      if (/different from the old|same/i.test(m)) throw new ErroNuvem('A nova senha precisa ser diferente da atual.', 'SENHA');
      if (/weak|at least|characters/i.test(m)) throw new ErroNuvem('Senha fraca para a política da base. Use ao menos 8 caracteres, com letras e números.', 'SENHA');
      throw erroNuvem(error);
    }
    await this.rpc('redia_senha_trocada');
  },
  /* D-56: "Esqueci a senha" · a Edge Function gera a senha temporária e a envia ao e-mail do administrador */
  async recuperarSenha(chave) {
    let r, corpo = {};
    try {
      r = await fetch(NUVEM.supabaseUrl.replace(/\/$/, '') + '/functions/v1/redia-recuperar-senha', {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: NUVEM.supabaseAnonKey, Authorization: 'Bearer ' + NUVEM.supabaseAnonKey }, body: JSON.stringify({ chave }) });
    } catch (e) { throw new ErroNuvem('Sem conexão com a base de dados. Verifique a rede e tente de novo.', 'REDE'); }
    try { corpo = await r.json(); } catch { }
    if (r.status === 404) throw new ErroNuvem('A recuperação de senha ainda não está instalada na base. Procure o administrador da REDIA.', 'RECUPERAR');
    if (!r.ok) throw new ErroNuvem(corpo.mensagem || 'Não foi possível enviar o pedido agora. Tente mais tarde ou procure o administrador.', 'RECUPERAR');
    return corpo.mensagem || 'Pedido registrado.';
  },
  async pedidosSenha(uep) { try { return await this.rpc('redia_pedidos_senha', { p_uep: uep }); } catch { return []; } },
  async sair() { this.pararTempoReal(); this.vivoParar(); try { await this.cli?.auth.signOut({ scope: 'local' }); } catch { } },

  async rpc(fn, args) {
    let r;
    try { r = await this.cliente().rpc(fn, args); } catch (e) { throw erroNuvem(e); }
    if (r.error) throw erroNuvem(r.error);
    Store.online = true;
    return r.data;
  },
  carregar(uep, iso, camposMes) { return this.rpc('redia_carregar', { p_uep: uep, p_data: iso, p_campos_mes: camposMes || [] }); },
  novos(uep, seq) { return this.rpc('redia_novos', { p_uep: uep, p_seq: seq || 0 }); },
  gravar(regs) { return this.rpc('redia_gravar', { p_regs: regs.map(r => { const x = { ...r }; delete x._arq; delete x.seq; return x; }) }); },
  resetar(uep) { return this.rpc('redia_resetar', { p_uep: uep }); },
  arquivo(uep, limite = 400) { return this.rpc('redia_arquivo', { p_uep: uep, p_limite: limite }); },   // D-65: atas e congelamentos de todos os dias
  buscar(uep, texto, limite = 100, f = {}) { const a = { p_uep: uep, p_texto: texto, p_limite: limite }; if (f.de) a.p_de = f.de; if (f.ate) a.p_ate = f.ate; if (f.coord) a.p_coord = f.coord; if (f.tipos?.length) a.p_tipos = f.tipos; return this.rpc('redia_buscar', a); },   // só os filtros usados (os demais ficam no padrão da função)   // D-63: histórico pesquisável
  configLer(uep) { return this.rpc('redia_config_ler', { p_uep: uep }); },
  configSalvar(uep, cfg) { return this.rpc('redia_config_salvar', { p_uep: uep, p_config: cfg }); },

  async enviarArquivo(caminho, conteudo, tipo) {
    const blob = conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo || 'application/octet-stream' });
    let r;
    try { r = await this.cliente().storage.from('redia').upload(caminho, blob, { upsert: false, contentType: blob.type || tipo || 'application/octet-stream' }); }
    catch (e) { throw erroNuvem(e); }
    if (r.error) throw erroNuvem(r.error);
    return caminho;
  },
  async baixarArquivo(caminho) {
    const r = await this.cliente().storage.from('redia').download(caminho);
    if (r.error) throw erroNuvem(r.error);
    return r.data;   // Blob
  },

  /* tempo real: um aviso por registro novo da UEP; a leitura é feita por redia_novos */
  tempoReal(uep, aoMudar) {
    this.pararTempoReal();
    if (NUVEM.tempoReal === false) return;
    try {
      this.canal = this.cliente().channel('redia-' + uep)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'registros', filter: 'uep=eq.' + uep }, () => { clearTimeout(this._t); this._t = setTimeout(aoMudar, 250); })
        .subscribe(st => { Store.tempoReal = st === 'SUBSCRIBED'; });
    } catch (e) { Store.tempoReal = false; Store.erros.push('tempo real: ' + e.message); }
  },
  /* D-67 · apresentação ao vivo: canal de transmissão (broadcast) da UEP, sem gravar nada na base */
  vivoCanal(uep, aoReceber) {
    this.vivoParar(); if (NUVEM.tempoReal === false) return;
    try { this.cv = this.cliente().channel('redia-vivo-' + uep, { config: { broadcast: { self: false } } }).on('broadcast', { event: 'vivo' }, m => aoReceber(m.payload)).subscribe(); }
    catch (e) { Store.erros.push('ao vivo: ' + e.message); }
  },
  vivoEnviar(msg) { try { this.cv?.send({ type: 'broadcast', event: 'vivo', payload: msg }); } catch { } },
  vivoParar() { if (this.cv) { try { this.cli.removeChannel(this.cv); } catch { } this.cv = null; } },
  pararTempoReal() { if (this.canal) { try { this.cli.removeChannel(this.canal); } catch { } this.canal = null; } Store.tempoReal = false; },
};
