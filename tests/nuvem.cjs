// Teste ponta a ponta da REDIA V1.0 no modo nuvem, contra um Supabase simulado (servidor.mjs)
// que roda o MESMO schema SQL (supabase/01_schema.sql) num PostgreSQL local.
// Uso: node nuvem.cjs
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const P = __dirname, OUT = path.join(P, 'out', 'nuvem'); fs.mkdirSync(OUT, { recursive: true });
const PORTA = 8791, DIST = path.join(P, '.saida', 'nuvem');
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + Buffer.from(JSON.stringify({ role: 'anon', iss: 'teste' })).toString('base64url') + '.assinatura';
execFileSync('python3', [path.join(P, '..', 'build.py'), '--saida', DIST], { stdio: 'inherit', env: { ...process.env, SUPABASE_URL: `http://127.0.0.1:${PORTA}`, SUPABASE_ANON_KEY: ANON, REDIA_TEMPO_REAL: '0' } });
const erros = [];
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) erros.push(m); };
const espera = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const { iniciarServidor } = await import('./servidor.mjs');
  const srv = await iniciarServidor({ estatico: DIST, porta: PORTA, supabase: true });
  const URL = srv.url + '/index.html';
  await srv.criarUsuario('GP01', 'Temp1234', 'Usuário GEPLAT Teste', 'GEPLAT', { admin: true });
  await srv.criarUsuario('CP01', 'Senha2026', 'Usuário COPROD Teste', 'SUPROD', { trocarSenha: false });
  await srv.criarUsuario('ZZ01', 'Senha2026', 'Sem perfil', 'GEOP', { semPerfil: true });
  await srv.criarUsuario('XX01', 'Senha2026', 'Outra UEP', 'COMAN', { uep: 'P-99', trocarSenha: false });
  const browser = await chromium.launch();
  const vig = (pg, nome) => {
    pg.on('pageerror', e => { erros.push(`pageerror(${nome}): ${e.message}`); console.log('PAGEERROR', nome, e.message); });
    pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) { erros.push(`console(${nome}): ${m.text()}`); console.log('CONSOLE', nome, m.text()); } });
  };
  const novo = async (nome, vp = { width: 1600, height: 1000 }) => { const c = await browser.newContext({ viewport: vp, acceptDownloads: true }); const p = await c.newPage(); vig(p, nome); await p.addInitScript(() => { window.print = () => { }; }); return { c, p }; };
  const login = async (p, chave, senha) => { await p.fill('#lg-chave', chave); await p.fill('#lg-senha', senha); await p.click('.lg-btn'); await p.waitForTimeout(700); };
  const msg = p => p.textContent('#lg-msg');
  const nReg = async (where = 'true') => (await srv.sql(`select count(*)::int n from public.registros where ${where}`)).rows[0].n;

  /* ---- acesso ---- */
  const { c: cg, p: g } = await novo('GEPLAT');
  await g.goto(URL); await g.waitForTimeout(900);
  ok(await g.evaluate(() => MODO_NUVEM && !!window.supabase), 'config.js com Supabase: app abre no modo nuvem');
  ok(!/demonstração/.test(await g.textContent('.lg-rod')) && /Senha pessoal/.test(await g.textContent('.lg-card')), 'tela de acesso da nuvem (sem dica de demonstração)');
  await login(g, 'GP01', 'errada99');
  ok(/Chave ou senha incorreta/.test(await msg(g)), 'senha errada recusada pelo Auth');
  await login(g, 'ZZ01', 'Senha2026');
  ok(/não tem perfil ativo/.test(await msg(g)) && await g.$('.apph') === null, 'usuário do Auth sem perfil na REDIA não entra');
  await login(g, 'XX01', 'Senha2026');
  ok(await g.$('.apph') !== null && await g.evaluate(() => CFG.uep === 'P-99' && Store.cache.size === 0), 'usuário de outra UEP entra na própria UEP e não vê a P-83');
  await g.click('a.sair'); await g.waitForTimeout(500);
  await login(g, 'GP01', 'Temp1234');
  ok(await g.$('.mdl') !== null && /Troque a senha temporária/.test(await g.textContent('.mdl')), 'primeiro acesso pede a troca da senha temporária');
  await g.fill('[data-mdl-in="s1"]', 'Nova2026a'); await g.fill('[data-mdl-in="s2"]', 'Nova2026b'); await g.click('[data-mdl="ok"]'); await g.waitForTimeout(300);
  ok(await g.$('.mdl') !== null && /não conferem/.test(await g.textContent('#toasts')), 'senhas diferentes: pede de novo');
  await g.fill('[data-mdl-in="s1"]', 'GP01abcd9'); await g.fill('[data-mdl-in="s2"]', 'GP01abcd9'); await g.click('[data-mdl="ok"]'); await g.waitForTimeout(300);
  ok(await g.$('.mdl') !== null && /não pode conter a chave/.test(await g.textContent('#toasts')), 'senha com a chave é recusada');
  await g.fill('[data-mdl-in="s1"]', 'Nova2026a'); await g.fill('[data-mdl-in="s2"]', 'Nova2026a'); await g.click('[data-mdl="ok"]'); await g.waitForTimeout(1200);
  const pf = (await srv.sql(`select p.trocar_senha, u.senha from public.perfis p join auth.users u on u.id = p.user_id where p.chave = 'GP01'`)).rows[0];
  ok(await g.$('.apph') !== null && pf.trocar_senha === false && pf.senha === 'Nova2026a', 'senha trocada no Auth e marcada no perfil; entra na REDIA');
  const ug = await g.evaluate(() => USUARIO);
  ok(ug.chave === 'GP01' && ug.coord === 'GEPLAT' && ug.admin === true && ug.nome === 'Usuário GEPLAT Teste', 'usuário vem do perfil da base (nome, coordenação, administrador)');
  ok(/Base de dados/.test(await g.textContent('.g-setup')) && /Supabase/.test(await g.textContent('.g-setup')) && /Nuvem · sincronizado/.test(await g.textContent('.apph .armz')), 'Início e cabeçalho mostram a base Supabase');
  ok(await g.evaluate(() => DIA === isoData(new Date())), 'na nuvem, o login abre a REDIA de hoje');
  await g.screenshot({ path: path.join(OUT, 'inicio_nuvem.png'), fullPage: true });

  /* ---- dados de exemplo gravados na base em lotes ---- */
  const ch0 = srv.chamadas.length;
  await g.click('[data-act="exemplo"]'); await g.waitForTimeout(2500);
  const nEx = await nReg(), lotes = srv.chamadas.slice(ch0).filter(c => c.endsWith('/redia_gravar')).length;
  ok(nEx > 80 && lotes <= 3, `exemplo gravado na base (${nEx} registros em ${lotes} lote(s))`);
  ok((await srv.sql(`select count(*)::int n from public.registros where autor_chave <> 'GP01'`)).rows[0].n === 0, 'autor_chave real (GP01) em todos os registros do exemplo');
  ok(await g.evaluate(() => E.sugestoes.length) === 28, 'estado reconstruído a partir da base (28 sugestões)');

  /* ---- segunda sessão: outro usuário vê os mesmos dados ---- */
  const { c: cc, p: c } = await novo('COPROD');
  await c.goto(URL); await c.waitForTimeout(800);
  await login(c, 'cp01', 'Senha2026');
  ok(await c.$('.mdl') === null && await c.evaluate(() => USUARIO.coord === 'COPROD' && USUARIO.posto === 'SUPROD'), 'SUPROD entra sem troca de senha e cai na COPROD');
  ok(await c.evaluate(() => E.sugestoes.length === 28 && Store.cache.size) === await g.evaluate(() => Store.cache.size), 'COPROD lê exatamente os mesmos registros');
  ok(await c.$('[data-act="exemplo"]') === null && await c.$('#sim') === null, 'COPROD não carrega exemplo nem simula horário na base');
  const dec = await c.evaluate(async () => { const s = pendentes(E, 'COPROD')[0]; await salvarE('decisao', { alvo: s.id, acao: 'aprovar', titulo: s.payload.titulo, semaforo: 'at' }); return s.id; });
  const linha = (await srv.sql(`select autor, autor_chave from public.registros where tipo = 'decisao' and payload->>'alvo' = $1`, [dec])).rows[0];
  ok(linha && linha.autor.nome === 'Usuário COPROD Teste' && linha.autor_chave === 'CP01', 'aprovação gravada com a autoria do perfil');
  await g.evaluate(() => sincronizarTela()); await g.waitForTimeout(400);
  ok(await g.evaluate(id => aprovados(E, 'COPROD').some(s => s.id === id), dec), 'GEPLAT recebe a aprovação feita pela COPROD (sincronização)');
  const forj = await c.evaluate(async () => { const r = novoRegistro('comentario', { alvo: 'x', texto: 'teste' }); r.autor = { nome: 'Forjado', chave: 'GP01', papel: 'GEOP' }; return (await Store.gravar(r)).autor; });
  ok(forj.nome === 'Usuário COPROD Teste' && forj.chave === 'CP01', 'autoria forjada no navegador é substituída pelo servidor');

  /* ---- congelamento: GEPLAT congela; sessão desatualizada da COPROD não grava ---- */
  await g.goto(URL + '#/inicio'); await g.waitForTimeout(300);
  await g.click('[data-act="congelar-ini"]'); await g.waitForTimeout(400);
  if (await g.$('.mdl')) { await g.click('[data-mdl="congelar"]'); await g.waitForTimeout(1200); }
  ok(await g.evaluate(() => !!E.congelamento), 'GEPLAT congela a pauta');
  ok([...srv.arquivos.keys()].some(k => /^redia\/P-83\/\d{4}\/\d\d\/\d\d\/pauta_congelada_\d{6}\.json$/.test(k)), 'cópia da pauta congelada gravada no Storage');
  const antes = await nReg("tipo = 'valor'");
  await c.evaluate(() => salvarE('valor', { campo: 'oleo.real', valor: 1, origem: 'M' })); await c.waitForTimeout(400);
  ok(await nReg("tipo = 'valor'") === antes && await c.evaluate(() => congelada()), 'COPROD desatualizada: alteração recusada e tela passa a mostrar a pauta congelada');
  const direto = await c.evaluate(async () => { try { await Store.gravar(novoRegistro('valor', { campo: 'oleo.real', valor: 2, origem: 'M' })); return 'gravou'; } catch (e) { return e.codigo; } });
  ok(direto === 'PAUTA_CONGELADA', 'mesmo sem a checagem do app, o servidor recusa (PAUTA_CONGELADA)');
  await c.evaluate(() => salvarE('demanda', { titulo: 'Demanda com pauta congelada', sentido: 'bordo → base', responsavel: 'teste', prazo: DIA, origem: 'C', coord: 'COPROD', dataRedia: DIA, status: 'aberta' }, { escopo: 'demandas' })); await c.waitForTimeout(400);
  ok(await nReg("tipo = 'demanda' and payload->>'titulo' = 'Demanda com pauta congelada'") === 1, 'demanda continua liberada com a pauta congelada');
  await g.click('[data-act="descongelar"]'); await g.waitForTimeout(300); await g.fill('[data-mdl-in="motivo"]', 'teste nuvem'); await g.click('[data-mdl="ok"]'); await g.waitForTimeout(800);
  await c.evaluate(() => salvarE('valor', { campo: 'oleo.real', valor: 26000, origem: 'M' })); await c.waitForTimeout(500);
  ok(await c.evaluate(() => !congelada() && VN(E, 'oleo.real') === 26000), 'após descongelar, a COPROD volta a gravar');

  /* ---- configuração da UEP ---- */
  await c.goto(URL + '#/config'); await c.waitForTimeout(300);
  ok(await c.$eval('[data-act="salvar-cfg"]', b => b.disabled) && /Somente leitura/.test(await c.textContent('.banner')), 'COPROD vê a configuração somente leitura');
  ok(await c.evaluate(async () => { try { await Nuvem.configSalvar(CFG.uep, CFG); return 'salvou'; } catch (e) { return e.codigo; } }) === 'SEM_PERMISSAO', 'servidor recusa configuração salva pela COPROD');
  await g.goto(URL + '#/config'); await g.waitForTimeout(300);
  ok(await g.$eval('#c-uep', i => i.disabled), 'UEP vem do perfil (campo bloqueado)');
  await g.fill('#c-tb', '7'); await g.click('[data-act="salvar-cfg"]'); await g.waitForTimeout(600);
  const cfgDb = (await srv.sql(`select config->>'timeboxMin' t, atualizado_por from public.uep_config where uep = 'P-83'`)).rows[0];
  ok(cfgDb && cfgDb.t === '7' && cfgDb.atualizado_por === 'GP01', 'GEPLAT salva a configuração na base');
  await c.reload(); await c.waitForTimeout(1500);
  ok(await c.$('.apph') !== null && await c.evaluate(() => USUARIO.chave === 'CP01' && CFG.timeboxMin === 7), 'recarregar mantém a sessão da aba e lê a configuração nova');
  const { c: c3, p: x } = await novo('sem sessão'); await x.goto(URL + '#/inicio'); await x.waitForTimeout(800);
  ok(await x.$('.login .lg-card') !== null, 'outra janela (sem sessão) pede login');
  await c3.close();

  /* ---- ata e transcrição no Storage ---- */
  await g.goto(URL + '#/ata'); await g.waitForTimeout(300);
  await g.fill('#at-part', 'Participante 1\nParticipante 2'); await g.click('[data-act="fechar-ata"]'); await g.waitForTimeout(1000);
  const kAta = [...srv.arquivos.keys()].find(k => /ata_REDIA_P-83_.*_\d{6}\.html$/.test(k));
  ok(!!kAta && /Ata de/.test(srv.arquivos.get(kAta).dados.toString()), 'ata gravada no Storage');
  const [dl] = await Promise.all([g.waitForEvent('download', { timeout: 4000 }).catch(() => null), g.click('button:has-text("Baixar arquivo da ata")')]);
  ok(!!dl && /^ata_REDIA_P-83_/.test(dl.suggestedFilename()), `ata baixada do Storage (${dl && dl.suggestedFilename()})`);
  const tf = path.join(OUT, 'transcricao_teste.vtt'); fs.writeFileSync(tf, 'WEBVTT\n\n00:00.000 --> 00:01.000\nteste\n');
  await g.setInputFiles('#trans', tf); await g.waitForTimeout(1000);
  ok([...srv.arquivos.keys()].some(k => /transcricao_transcricao_teste_\d{6}\.vtt$/.test(k)) && await g.evaluate(() => E.anexos.length === 1), 'transcrição enviada ao Storage e anexada');
  await g.screenshot({ path: path.join(OUT, 'ata_nuvem.png'), fullPage: true });

  /* ---- apresentação ---- */
  for (let b = 1; b <= 5; b++) { await g.goto(URL + '#/apresentacao/' + b); await g.waitForTimeout(250); }
  ok(await g.$('.stage') !== null, 'apresentação abre os 5 blocos com dados da base');
  await g.goto(URL + '#/apresentacao/2'); await g.waitForTimeout(300); await g.evaluate(() => document.querySelector('#ctrl')?.classList.add('hide'));
  await g.screenshot({ path: path.join(OUT, 'coprod_nuvem.png') });

  /* ---- importação idempotente (migração do protótipo) ---- */
  const imp = await g.evaluate(async () => (await Store.importar(Store.exportar())).n);
  ok(imp === 0, 'reimportar a exportação não duplica registros');
  const imp2 = await g.evaluate(async () => { const r = novoRegistro('valor', { campo: 'man.sensores', valor: 9, origem: 'M' }); r.autor = { nome: 'Pessoa do protótipo', chave: 'AB12', papel: 'COMAN' }; return (await Store.importar(JSON.stringify({ registros: [r] }))).n; });
  const orig = (await srv.sql(`select payload->'autorOriginal'->>'nome' n, autor->>'nome' a from public.registros where payload->>'campo' = 'man.sensores' and payload->>'valor' = '9'`)).rows[0];
  ok(imp2 === 1 && orig.n === 'Pessoa do protótipo' && orig.a === 'Usuário GEPLAT Teste', 'importação grava quem importou e guarda o autor original no registro');

  /* ---- D-52: resetar a demonstração na base ---- */
  await c.goto(URL + '#/inicio'); await c.waitForTimeout(300);
  ok(await c.$('[data-act="resetar"]') === null, 'reset: botão não aparece para quem não é administrador');
  ok(await c.evaluate(async () => { try { await Nuvem.resetar(CFG.uep); return 'resetou'; } catch (e) { return e.codigo; } }) === 'SEM_PERMISSAO_RESET', 'reset: servidor recusa pedido de quem não é administrador');
  await c.evaluate(() => sincronizarTela()); const antesC = await c.evaluate(() => Store.cache.size);
  await g.goto(URL + '#/inicio'); await g.waitForTimeout(300);
  await g.click('[data-act="resetar"]'); await g.waitForTimeout(200); await g.fill('[data-mdl-in="conf"]', 'RESETAR'); await g.click('[data-mdl="ok"]'); await g.waitForTimeout(1200);
  const totalBase = await nReg();
  ok(totalBase === 0 && await g.evaluate(() => Store.cache.size) === 0, `reset na nuvem: a base da UEP fica vazia para todos (${totalBase} registros)`);
  await c.evaluate(() => sincronizarTela()); await c.waitForTimeout(800);
  ok(antesC > 0 && await c.evaluate(() => Store.cache.size) === 0 && /resetada/.test(await c.textContent('#toasts')), 'outra sessão percebe o reset e limpa a tela');
  ok((await srv.sql(`select count(*)::int n from public.perfis`)).rows[0].n === 3, 'reset mantém os perfis dos usuários');

  /* ---- sessão expirada ---- */
  await c.goto(URL + '#/inicio'); await c.waitForTimeout(300);
  const tok = await c.evaluate(() => JSON.parse(sessionStorage.getItem('redia.sb.sessao')).access_token);
  await srv.sql('select 1'); srv.chamadas.length = 0;
  await c.evaluate(t => fetch('/auth/v1/logout', { method: 'POST', headers: { authorization: 'Bearer ' + t } }), tok);
  await c.evaluate(() => salvarE('valor', { campo: 'oleo.real', valor: 3, origem: 'M' })); await c.waitForTimeout(2200);
  ok(await c.$('.login') !== null, 'sessão expirada: aviso e volta à tela de acesso');

  /* ---- sair ---- */
  await g.goto(URL + '#/inicio'); await g.waitForTimeout(300); await g.click('a.sair'); await g.waitForTimeout(600);
  ok(await g.$('.login') !== null && await g.evaluate(() => USUARIO === null && !sessionStorage.getItem('redia.sb.sessao') && Store.cache.size === 0), 'sair encerra a sessão do Supabase e limpa os dados da memória');

  /* ---- o que vai para o navegador ---- */
  const js = fs.readFileSync(path.join(DIST, 'app.js'), 'utf8'), cfg = fs.readFileSync(path.join(DIST, 'config.js'), 'utf8'), idx = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  const linhasAcesso = js.match(/\b[A-Z0-9]{4}\|[A-ZÃÂÉÍÓÚÇ ]{4,20}\|[^\n|`]+/g) || [];
  ok(!/service_role/.test(cfg) && linhasAcesso.length === 7 && linhasAcesso.every(l => /\(demo\)/.test(l)), 'app publicado sem chave service_role e só com os 7 usuários fictícios da demonstração');
  ok(/connect-src http:\/\/127\.0\.0\.1:8791 ws:\/\/127\.0\.0\.1:8791;/.test(idx) && /script-src 'self';/.test(idx), 'CSP libera só o Supabase configurado e scripts do próprio site');

  const SEMEX = path.join(P, '.saida', 'sem-exemplo');
  execFileSync('python3', [path.join(P, '..', 'build.py'), '--saida', SEMEX], { stdio: 'ignore', env: { ...process.env, SUPABASE_URL: '', SUPABASE_ANON_KEY: '', REDIA_SEM_EXEMPLO: '1' } });
  const jsSem = fs.readFileSync(path.join(SEMEX, 'app.js'), 'utf8');
  ok(!/BUZ-061|Maran Libra|EX-GAS/.test(jsSem) && /EXEMPLO_DISPONIVEL = false/.test(jsSem), 'REDIA_SEM_EXEMPLO=1 publica sem os dados de exemplo');

  await browser.close(); await srv.fechar();
  console.log('\n' + (erros.length ? `${erros.length} FALHA(S):\n - ` + erros.join('\n - ') : 'TODOS OS TESTES DA NUVEM PASSARAM'));
  process.exit(erros.length ? 1 : 0);
})();
