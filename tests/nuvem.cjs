// Teste ponta a ponta da REDIA V1.0 no modo nuvem, contra um Supabase simulado (servidor.mjs)
// que roda o MESMO schema SQL (supabase/01_schema.sql) num PostgreSQL local.
// Uso: node nuvem.cjs
const { chromium } = require('playwright');
const fecharAviso = async p => { const b = await p.waitForSelector('[data-mdl="entendi"]', { timeout: 2500 }).catch(() => null); if (b) { await b.click(); await p.waitForTimeout(150); } };   // D-71: aviso de protótipo depois de cada login
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
  const URL = srv.url + '/app/index.html';
  await srv.criarUsuario('GP01', 'Temp1234', 'Usuário GEPLAT Teste', 'GEPLAT', { admin: true });
  await srv.criarUsuario('CP01', 'Senha2026', 'Usuário COPROD Teste', 'SUPROD', { trocarSenha: false });
  await srv.criarUsuario('ZZ01', 'Senha2026', 'Sem perfil', 'GEOP', { semPerfil: true });
  await srv.criarUsuario('XX01', 'Senha2026', 'Outra UEP', 'COMAN', { uep: 'P-74', trocarSenha: false });
  const browser = await chromium.launch();
  const vig = (pg, nome) => {
    pg.on('pageerror', e => { erros.push(`pageerror(${nome}): ${e.message}`); console.log('PAGEERROR', nome, e.message); });
    pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) { erros.push(`console(${nome}): ${m.text()}`); console.log('CONSOLE', nome, m.text()); } });
  };
  const novo = async (nome, vp = { width: 1600, height: 1000 }) => { const c = await browser.newContext({ viewport: vp, acceptDownloads: true }); const p = await c.newPage(); vig(p, nome); await p.addInitScript(() => { window.print = () => { }; }); return { c, p }; };
  const login = async (p, chave, senha) => { await p.fill('#lg-chave', chave); await p.fill('#lg-senha', senha); await p.click('.lg-btn'); await p.waitForTimeout(700); await fecharAviso(p); };
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
  ok(await g.$('.apph') !== null && await g.evaluate(() => CFG.uep === 'P-74' && Store.cache.size === 0), 'usuário de outra UEP entra na própria UEP e não vê a P-83');
  await g.click('a.sair'); await g.waitForTimeout(500);
  await login(g, 'GP01', 'Temp1234');
  ok(await g.$('.mdl') !== null && /Troque a senha temporária/.test(await g.textContent('.mdl')), 'primeiro acesso pede a troca da senha temporária');
  await g.fill('[data-mdl-in="s1"]', 'Nova2026a'); await g.fill('[data-mdl-in="s2"]', 'Nova2026b'); await g.click('[data-mdl="ok"]'); await g.waitForTimeout(300);
  ok(await g.$('.mdl') !== null && /não conferem/.test(await g.textContent('#toasts')), 'senhas diferentes: pede de novo');
  await g.fill('[data-mdl-in="s1"]', 'GP01abcd9'); await g.fill('[data-mdl-in="s2"]', 'GP01abcd9'); await g.click('[data-mdl="ok"]'); await g.waitForTimeout(300);
  ok(await g.$('.mdl') !== null && /não pode conter a chave/.test(await g.textContent('#toasts')), 'senha com a chave é recusada');
  await g.fill('[data-mdl-in="s1"]', 'Nova2026a'); await g.fill('[data-mdl-in="s2"]', 'Nova2026a'); await g.click('[data-mdl="ok"]'); await g.waitForTimeout(1200); await fecharAviso(g);
  const pf = (await srv.sql(`select p.trocar_senha, u.senha from public.perfis p join auth.users u on u.id = p.user_id where p.chave = 'GP01'`)).rows[0];
  ok(await g.$('.apph') !== null && pf.trocar_senha === false && pf.senha === 'Nova2026a', 'senha trocada no Auth e marcada no perfil; entra na REDIA');
  const ug = await g.evaluate(() => USUARIO);
  ok(ug.chave === 'GP01' && ug.coord === 'GEPLAT' && ug.admin === true && ug.nome === 'Usuário GEPLAT Teste', 'usuário vem do perfil da base (nome, coordenação, administrador)');
  ok(/Base conectada/.test(await g.textContent('.ses')) && /Supabase/.test(await g.textContent('.ses')) && /Nuvem · sincronizado/.test(await g.textContent('.apph .armz')), 'Início e cabeçalho mostram a base Supabase');
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
  const doDia = () => E.sugestoes.length === 28 && [...Store.cache.values()].filter(r => r.data === DIA && r.escopo === 'dia').length;   // D-65: a sessão que gravou o exemplo guarda também o histórico completo no cache
  ok(await c.evaluate(doDia) === await g.evaluate(doDia), 'COPROD lê exatamente os mesmos registros do dia');
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
  const arqN = await g.evaluate(async () => { const a = await Store.arquivo(); return { n: a.length, tipos: [...new Set(a.map(r => r.tipo))].sort().join(), snap: a.some(r => r.payload && 'snapshot' in r.payload) }; });
  ok(arqN.n >= 2 && /congelamento/.test(arqN.tipos) && /reabertura/.test(arqN.tipos) && !arqN.snap, `Arquivo na nuvem: redia_arquivo lista congelamento e reabertura sem o snapshot (${JSON.stringify(arqN)})`);

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
  /* D-61: a tendência de 7 dias e as classes de queima vêm da base (redia_carregar traz valores e listas dos dias anteriores) */
  await c.evaluate(async () => { const r = novoRegistro('valor', { campo: 'oleo.real', valor: 25000, origem: 'M', fonte: 'teste' }); r.data = addDias(DIA, -20); await Store.gravarLote([r]); });   // D-65: D-15 a D-1 são REDIAs encerradas do histórico (pauta congelada) — grava fora delas
  await c.reload(); await c.waitForTimeout(1500);
  const tend = await c.evaluate(() => ({ oleo: E.tend30['oleo.real'].find(p => p.redia === addDias(DIA, -20))?.valor, d2: E.tend['oleo.real'].find(p => p.redia === addDias(DIA, -2))?.valor, ext: E.classes['Extraordinária'], t30: E.tend30['oleo.real'].filter(p => p.valor != null).length }));
  ok(tend.oleo === 25000 && tend.d2 > 20000 && tend.ext > 0 && tend.t30 >= 16, `tendências de 7 e 30 dias e classes de queima recarregadas da base, com o histórico (${JSON.stringify(tend)})`);
  const arqH = await c.evaluate(async () => (await Store.arquivo()).filter(r => r.tipo === 'ata').length);
  ok(arqH === 15, `Arquivo na nuvem: 15 atas do histórico vindas de redia_arquivo (${arqH})`);
  /* D-63 (proposta 30): histórico pesquisável consulta a base (redia_buscar) */
  const bus = await c.evaluate(async () => { const r = await Store.buscar('teste', 50); return { n: r.length, tipos: [...new Set(r.map(x => x.tipo))].sort(), ant: r.some(x => x.data < DIA) }; });
  ok(bus.n >= 2 && bus.ant && bus.tipos.includes('valor'), `histórico: Store.buscar consulta a base e encontra registros de dias anteriores (${JSON.stringify(bus)})`);
  await c.goto(URL + '#/arquivo'); await c.waitForTimeout(800); await c.fill('#aq-q', 'teste'); await c.click('[data-act="aq-buscar"]'); await c.waitForTimeout(800);
  ok(await c.evaluate(() => document.querySelectorAll('.arq-g tbody tr').length >= 2 && !document.querySelector('table.arq')), 'Arquivo: a busca lista os resultados vindos da base no lugar das atas');
  const fil = await c.evaluate(async () => (await Store.buscar('', 50, { de: addDias(DIA, -3), ate: addDias(DIA, -1), coord: 'COPROD', tipos: ['sugestao'] })).map(r => r.tipo + ':' + r.payload.coord + ':' + (r.data >= addDias(DIA, -3) && r.data < DIA)));
  ok(fil.length >= 1 && fil.every(x => x === 'sugestao:COPROD:true'), `busca com filtros de período, coordenação e tipo na base (${fil.length})`);
  const { c: c3, p: x } = await novo('sem sessão'); await x.goto(URL + '#/inicio'); await x.waitForTimeout(800);
  ok(await x.$('.login .lg-card') !== null, 'outra janela (sem sessão) pede login');
  await c3.close();

  /* ---- transcrição no Storage (antes da ata: depois dela, nada mais entra no dia) ---- */
  await g.goto(URL + '#/ata'); await g.waitForTimeout(300);
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

  /* D-69: preencher a REDIA aberta (fictício) grava só no dia aberto; antes, valores de dias encerrados faziam a base recusar o lote */
  const pfc = await g.evaluate(async () => { const hoje = DIA, dv = addDias(hoje, 1); await abrirDia(dv); try { const r = await preencherFicticio(DIA, E); await Store.carregar(DIA); atualizarEstado(); const out = { ok: true, n: r.n, valores: r.valores, outros: [...Store.cache.values()].filter(x => x.payload?.ficticio && x.data !== DIA).length, concl: naoConcluidas(E).length, pend: COORDS.reduce((a, c) => a + pendentes(E, c).length, 0) }; await abrirDia(hoje); return out; } catch (e) { await abrirDia(hoje); return { ok: false, erro: e.message }; } });   // dia vazio, como a REDIA recém-iniciada
  ok(pfc.ok && pfc.valores > 50 && pfc.outros === 0 && pfc.concl === 0 && pfc.pend === 0, `preencher a REDIA aberta (fictício) na base: num dia vazio grava só nesse dia (dias anteriores encerrados ficam de fora), aprova as pendentes e conclui (${JSON.stringify(pfc)})`);
  /* ---- D-67: de acordo dos responsáveis, ata em PDF no Storage e dia encerrado ---- */
  await g.goto(URL + '#/inicio'); await g.waitForTimeout(400); await g.click('[data-act="congelar-ini"]'); await g.waitForTimeout(400);
  if (await g.$('.mdl')) { await g.click('[data-mdl="congelar"]'); await g.waitForTimeout(1200); }
  await g.goto(URL + '#/ata'); await g.waitForTimeout(500);
  const resp = await g.evaluate(() => situacaoAcordos().map(x => x.coord + ':' + (x.chave || '-')));
  ok(resp.includes('GEPLAT:-') && resp.includes('COPROD:CP01'), `responsáveis pelo de acordo vindos da base (${resp.join(', ')})`);
  ok(await g.evaluate(async () => { try { await Nuvem.gravar([novoRegistro('ata', { participantes: [] })]); return 'gravou'; } catch (e) { return e.codigo; } }) === 'ATA_SEM_ACORDO', 'servidor recusa a ata sem o de acordo (ATA_SEM_ACORDO)');
  while (await g.$('[data-acordo]')) { await g.click('[data-acordo]'); await g.waitForTimeout(800); }   // GEPLAT e a coordenação em que o GP01 alterou dados (COMAN, pela importação)
  await c.goto(URL + '#/ata'); await c.waitForTimeout(800); await c.click('[data-acordo="COPROD"]'); await c.waitForTimeout(800);
  await g.evaluate(async () => { await Store.sincronizar(); atualizarEstado(); rerender(); }); await g.waitForTimeout(400);
  ok(await g.evaluate(() => podeFecharAta()), 'com o de acordo de todos os responsáveis (COPROD em outra sessão), o fechamento é liberado');
  await g.fill('#at-part', 'Participante 1\nParticipante 2'); await g.click('[data-act="fechar-ata"]');
  await g.waitForFunction(() => E.atas.length > 0 && !document.querySelector('.ata-prog'), null, { timeout: 90000 }).catch(() => null); await g.waitForTimeout(500);
  const kAta = [...srv.arquivos.keys()].find(k => /ata_REDIA-P83-\d{8}_\d{6}\.pdf$/.test(k));
  ok(!!kAta && srv.arquivos.get(kAta).dados.includes('%PDF-') && srv.arquivos.get(kAta).dados.length > 200000, `ata em PDF (relatório + telas) gravada no Storage com o código da REDIA (${kAta})`);
  const [dl] = await Promise.all([g.waitForEvent('download', { timeout: 4000 }).catch(() => null), g.click('button:has-text("Baixar PDF da ata")')]);
  ok(!!dl && /^ata_REDIA-P83-\d{8}/.test(dl.suggestedFilename()), `ata baixada do Storage (${dl && dl.suggestedFilename()})`);
  ok(await c.evaluate(async () => { try { await Nuvem.gravar([novoRegistro('item', { coord: 'COPROD', tipo: 'ameaca', texto: 'x' })]); return 'gravou'; } catch (e) { return e.codigo; } }) === 'ATA_FECHADA', 'depois da ata, o servidor recusa qualquer alteração no dia (ATA_FECHADA)');
  const arqP = await g.evaluate(async () => { UI.arqLido = 0; location.hash = '#/arquivo'; await new Promise(r => setTimeout(r, 900)); return { n: document.querySelectorAll('table.arq tbody tr').length, top: document.querySelector('table.arq tbody tr')?.textContent || '' }; });
  ok(arqP.n === 16 && /REDIA-P83-\d{8}/.test(arqP.top), `Arquivo na nuvem: a ata fechada entra no topo da lista (${arqP.n})`);
  const [dl2] = await Promise.all([g.waitForEvent('download', { timeout: 6000 }).catch(() => null), g.click('table.arq tbody tr:first-child [data-arq-pdf]')]);
  ok(!!dl2 && /^ata_REDIA-P83-/.test(dl2.suggestedFilename()), 'Arquivo: Baixar PDF da ata traz o arquivo gravado no Storage');

  /* ---- D-52: resetar a demonstração na base ---- */
  await c.goto(URL + '#/inicio'); await c.waitForTimeout(300);
  ok(await c.$('[data-act="resetar"]') === null, 'reset: botão não aparece para quem não é administrador');
  ok(await c.evaluate(async () => { try { await Nuvem.resetar(CFG.uep); return 'resetou'; } catch (e) { return e.codigo; } }) === 'SEM_PERMISSAO_RESET', 'reset: servidor recusa pedido de quem não é administrador');
  await c.evaluate(() => sincronizarTela()); const antesC = await c.evaluate(() => Store.cache.size);
  // D-74: reset do dia (Início) só por coordenador/GEPLAT/administrador; reset total só pelo administrador do sistema (Administração)
  ok(await c.evaluate(async () => { try { await Nuvem.resetarDia('P-74', DIA); return 'resetou'; } catch (e) { return e.codigo; } }) === 'SEM_PERMISSAO_RESET_DIA', 'reset do dia: servidor recusa unidade em que o usuário não está lotado (D-75: supervisores da unidade podem)');
  ok(await g.evaluate(async () => { try { await Nuvem.resetar(CFG.uep); return 'resetou'; } catch (e) { return e.codigo; } }) === 'SEM_PERMISSAO_RESET', 'reset total: servidor recusa administrador da unidade (só o administrador do sistema)');
  await srv.sql(`update public.perfis set admin_sistema = true where chave = 'GP01'`);
  await g.goto(URL + '#/sair'); await g.waitForTimeout(400); await login(g, 'GP01', 'Nova2026a');
  await g.click('[data-uep="P-83"]'); await g.waitForTimeout(1200); await g.goto(URL + '#/admin'); await g.waitForTimeout(900); await g.click('[data-aba="testes"]'); await g.waitForTimeout(600); await g.selectOption('#at-un', 'P-83'); await g.waitForTimeout(800);
  await g.click('[data-t="reset"]'); await g.waitForTimeout(300); await g.fill('[data-mdl-in="conf"]', 'RESETAR'); await g.click('[data-mdl="ok"]'); await g.waitForTimeout(1500);
  await srv.sql(`update public.perfis set admin_sistema = false where chave = 'GP01'`);
  const totalBase = await nReg();
  ok(totalBase === 0 && await g.evaluate(() => Store.cache.size) === 0, `reset na nuvem: a base da UEP fica vazia para todos (${totalBase} registros)`);
  await c.evaluate(() => sincronizarTela()); await c.waitForTimeout(800);
  ok(antesC > 0 && await c.evaluate(() => Store.cache.size) === 0 && /resetada/.test(await c.textContent('#toasts')), 'outra sessão percebe o reset e limpa a tela');
  ok((await srv.sql(`select count(*)::int n from public.perfis`)).rows[0].n === 3, 'reset mantém os perfis dos usuários');

  /* ---- D-56: Esqueci a senha (Edge Function) e contas genéricas de teste ---- */
  const { p: r1 } = await novo('recuperar');
  await r1.goto(URL); await r1.waitForTimeout(600);
  await r1.click('[data-act="esqueci"]'); await r1.waitForTimeout(200);
  ok(/administrador/.test(await r1.textContent('.mdl')), 'login: "Esqueci a senha" explica que a nova senha vai ao administrador');
  await r1.fill('[data-mdl-in="chave"]', 'cp01'); await r1.click('[data-mdl="ok"]'); await r1.waitForTimeout(800);
  const em = srv.emails.at(-1);
  ok(srv.emails.length === 1 && em.chave === 'CP01' && em.para === 'admin@exemplo.test' && /Pedido registrado/.test(await r1.textContent('#toasts')), 'pedido gera senha temporária enviada ao e-mail do administrador');
  await login(r1, 'CP01', 'Senha2026');
  ok(/incorreta/.test(await msg(r1)), 'a senha anterior deixa de valer');
  await login(r1, 'CP01', em.senha);
  ok(await r1.$('.mdl') !== null && /Troque a senha temporária/.test(await r1.textContent('.mdl')), 'com a senha temporária, o app pede uma senha pessoal');
  const { p: r2 } = await novo('recuperar2'); await r2.goto(URL); await r2.waitForTimeout(500);
  await r2.click('[data-act="esqueci"]'); await r2.fill('[data-mdl-in="chave"]', 'CP01'); await r2.click('[data-mdl="ok"]'); await r2.waitForTimeout(600);
  await r2.click('[data-act="esqueci"]'); await r2.fill('[data-mdl-in="chave"]', 'QQ99'); await r2.click('[data-mdl="ok"]'); await r2.waitForTimeout(600);
  ok(srv.emails.length === 1 && /Pedido registrado/.test(await r2.textContent('#toasts')), 'novo pedido em menos de 15 min e chave inexistente: nada é enviado e a resposta não revela quem existe');
  await srv.criarUsuario('TCPR', 'Generica99', 'Teste COPROD (conta genérica)', 'COPROD', { compartilhado: true });
  await login(r2, 'TCPR', 'Generica99');
  ok(await r2.$('.mdl') === null && await r2.$('.login') === null, 'conta genérica entra direto, sem pedir troca de senha');
  await r2.goto(URL + '#/inicio'); await r2.waitForTimeout(400);
  ok(await r2.$('[data-act="senha"]') === null, 'conta genérica não oferece "Alterar senha" (senha comum a todos)');
  await g.goto(URL + '#/config'); await g.waitForTimeout(300); await g.goto(URL + '#/inicio'); await g.waitForTimeout(900);
  ok(/Pedidos de nova senha/.test(await g.textContent('.pn.adm')) && /CP01/.test(await g.textContent('.pn.adm')) && /enviada/.test(await g.textContent('.pn.adm')), 'administrador acompanha os pedidos de nova senha no Início');
  await r1.context().close(); await r2.context().close();

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

  /* ---- D-70 a D-73 na nuvem: administrador do sistema, administração, autocadastro e Studio ---- */
  {
    await srv.sql(`update public.perfis set admin_sistema = true where chave = 'GP01'`);
    const { c: ca, p: a } = await novo('admin-sistema');
    await a.goto(URL); await a.waitForTimeout(600); await login(a, 'GP01', 'Nova2026a');
    ok(await a.evaluate(() => location.hash === '#/unidades' && document.querySelectorAll('.uni-g [data-uep]').length === 10 && !!document.querySelector('.uni-x a[href="#/admin"]')), 'nuvem: administrador do sistema vê as 10 unidades e a Administração');
    await a.goto(URL + '#/admin'); await a.waitForTimeout(900); await a.click('[data-aba="usuarios"]'); await a.waitForTimeout(700);
    ok(await a.$('[data-ed]') !== null && /GP01/.test(await a.textContent('#adm-lista')) && /XX01/.test(await a.textContent('#adm-lista')), 'nuvem: Administração lista os usuários da base (redia_admin_usuarios)');
    const idCp = (await srv.sql(`select user_id from public.perfis where chave = 'CP01'`)).rows[0].user_id;
    await a.click(`[data-ed="${idCp}"]`); await a.waitForTimeout(300); await a.check('[data-mdl-in="lot:P-75"]'); await a.check('[data-mdl-in="ed:P-75"]'); await a.click('.mdl [data-mdl="ok"]'); await a.waitForTimeout(800);
    const lt = (await srv.sql(`select string_agg(uep || case when editor then '*' else '' end, ',' order by uep) l from public.lotacoes where user_id = $1`, [idCp])).rows[0].l;
    ok(lt === 'P-75*,P-83', `nuvem: Administração grava lotações e o perfil de editor na base (${lt})`);
    await a.click('[data-a="novo"]'); await a.waitForTimeout(300);
    await a.fill('#au-ch', 'NV01'); await a.fill('#au-no', 'Usuário Novo Teste'); await a.selectOption('#au-po', 'COEMB'); await a.fill('#au-em', 'novo@exemplo.com'); await a.check('[data-mdl-in="lot:P-79"]'); await a.click('.mdl [data-mdl="ok"]'); await a.waitForTimeout(900);
    const nv = (await srv.sql(`select p.coord, p.trocar_senha, l.uep from public.perfis p join public.lotacoes l using (user_id) where p.chave = 'NV01'`)).rows[0];
    ok(nv && nv.coord === 'COEMB' && nv.trocar_senha && nv.uep === 'P-79' && srv.emails.some(e => e.para === 'novo@exemplo.com' && e.chave === 'NV01'), 'nuvem: administrador cria usuário (Edge Function redia-admin) e a senha provisória vai ao e-mail informado');
    const idNv = (await srv.sql(`select user_id from public.perfis where chave = 'NV01'`)).rows[0].user_id;
    await a.fill('#af-q', 'NV01'); await a.waitForTimeout(200); await a.click(`[data-ex="${idNv}"]`); await a.waitForTimeout(300); await a.fill('[data-mdl-in="conf"]', 'NV01'); await a.click('.mdl [data-mdl="ok"]'); await a.waitForTimeout(1200);
    ok((await srv.sql(`select count(*)::int n from public.perfis where chave = 'NV01'`)).rows[0].n === 0 && (await srv.sql(`select count(*)::int n from auth.users where email = 'nv01@redia.local'`)).rows[0].n === 0, 'nuvem: D-74 administrador exclui a conta (Auth, perfil e lotações)');
    const au = (await srv.sql(`select string_agg(acao, ',') a from public.auditoria where por = 'GP01'`)).rows[0].a || '';
    ok(/usuario\.alterar/.test(au) && /usuario\.criar/.test(au) && /usuario\.excluir/.test(au), `nuvem: alterações e criação na auditoria (${au})`);
    await ca.close();
    // autocadastro pela tela de login
    const { c: cc, p: n } = await novo('autocadastro');
    await n.goto(URL); await n.waitForTimeout(600); await n.click('[data-act="cadastrar"]'); await n.waitForTimeout(250);
    await n.fill('#ac-ch', 'AC01'); await n.fill('#ac-no', 'Pessoa Autocadastro'); await n.fill('#ac-em', 'auto@exemplo.com'); await n.selectOption('#ac-un', 'P-78'); await n.selectOption('#ac-po', 'SUPROD'); await n.click('[data-mdl="ok"]'); await n.waitForTimeout(900);
    const em = srv.emails.find(e => e.para === 'auto@exemplo.com');
    ok(em && /enviada para o seu e-mail/.test(await n.textContent('.mdl')), 'nuvem: autocadastro envia a senha provisória ao e-mail informado (Edge Function redia-cadastro)');
    await n.click('.mdl [data-mdl="ok"]'); await n.waitForTimeout(200);
    await n.fill('#lg-senha', em.senha); await n.click('.lg-btn'); await n.waitForTimeout(900);
    ok(/Troque a senha temporária/.test(await n.textContent('.mdl')) && /senha Petrobras/.test(await n.textContent('.mdl')), 'nuvem: primeiro acesso do autocadastro pede a troca, com o alerta sobre a senha Petrobras');
    await n.fill('[data-mdl-in="s1"]', 'Pessoal2026'); await n.fill('[data-mdl-in="s2"]', 'Pessoal2026'); await n.click('[data-mdl="ok"]'); await n.waitForTimeout(1400); await fecharAviso(n);
    ok(await n.evaluate(() => USUARIO.chave === 'AC01' && USUARIO.uep === 'P-78' && CFG.uep === 'P-78'), 'nuvem: depois da troca, entra na REDIA da unidade de lotação');
    await cc.close();
    // Studio: CP01 é editor da P-75
    await srv.sql(`update auth.users set senha = 'Senha2026' where email = 'cp01@redia.local'`); await srv.sql(`update public.perfis set trocar_senha = false where chave = 'CP01'`);   // a senha pode ter sido trocada no teste do "Esqueci a senha"
    const { c: cs, p: e } = await novo('studio');
    await e.goto(URL); await e.waitForTimeout(600); await login(e, 'CP01', 'Senha2026');
    ok(await e.evaluate(() => location.hash === '#/unidades' && document.querySelectorAll('.uni-g [data-uep]').length === 2), 'nuvem: lotado em 2 unidades escolhe a unidade ao entrar');
    await e.click('.uni-x a[href="#/studio"]'); await e.waitForTimeout(1500);
    ok(await e.evaluate(() => USUARIO.uep === 'P-75' && document.querySelectorAll('#sto-cards .sto-c').length >= 8), 'nuvem: Studio abre a unidade em que o usuário é editor');
    await e.uncheck('#sto-cards .sto-c >> nth=0 >> [data-f="vis"]'); await e.waitForTimeout(300);
    await e.click('[data-s="publicar"]'); await e.waitForTimeout(250); await e.click('.mdl [data-mdl="ok"]'); await e.waitForTimeout(1000);
    const ly = (await srv.sql(`select versao, publicado from public.layouts where uep = 'P-75'`)).rows[0];
    ok(ly && ly.versao === 1 && Object.keys(ly.publicado.telas.abertura.cards).length === 1, 'nuvem: Studio publica o layout da unidade na base (versão 1)');
    await cs.close();
    // D-75: ata automática pela função do servidor (botão da Administração para testar agora)
    const { c: cq, p: q2 } = await novo('ata-auto');
    await q2.goto(URL); await q2.waitForTimeout(600); await login(q2, 'GP01', 'Nova2026a');
    await q2.click('[data-uep="P-80"]'); await q2.waitForTimeout(1200); await q2.goto(URL + '#/admin'); await q2.waitForTimeout(900); await q2.click('[data-aba="testes"]'); await q2.waitForTimeout(600); await q2.selectOption('#at-un', 'P-80'); await q2.waitForTimeout(900);
    await q2.click('[data-t="ata"]'); await q2.waitForTimeout(300); await q2.click('.mdl [data-mdl="ok"]'); await q2.waitForTimeout(2500);
    const aq = (await srv.sql(`select count(*)::int n, count(*) filter (where tipo = 'ata' and autor_chave = 'SISTEMA')::int ata, count(*) filter (where tipo = 'valor')::int val from public.registros where uep = 'P-80'`)).rows[0];
    ok(aq.ata === 1 && aq.val > 50, `nuvem: D-75 ata automática gravada pela função do servidor, com autoria SISTEMA e o dia totalmente preenchido (${JSON.stringify(aq)})`);
    ok(await q2.evaluate(async () => { const o = await fetch(NUVEM.supabaseUrl + '/functions/v1/redia-ata-auto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(r => r.json()); return /Fora da janela/.test(o.mensagem); }), 'nuvem: sem credencial, a função só age na janela das 23:59 (fora dela, não faz nada)');
    await cq.close();
    await srv.sql(`update public.perfis set admin_sistema = false where chave = 'GP01'`);
  }

  /* ---- o que vai para o navegador ---- */
  const js = fs.readFileSync(path.join(DIST, 'app', 'app.js'), 'utf8'), cfg = fs.readFileSync(path.join(DIST, 'app', 'config.js'), 'utf8'), idx = fs.readFileSync(path.join(DIST, 'app', 'index.html'), 'utf8');
  const linhasAcesso = js.match(/\b[A-Z0-9]{4}\|[A-ZÃÂÉÍÓÚÇ ]{4,20}\|[^\n|`]+/g) || [];
  ok(!/service_role/.test(cfg) && linhasAcesso.length === 7 && linhasAcesso.every(l => /\(demo\)/.test(l)), 'app publicado sem chave service_role e só com os 7 usuários fictícios da demonstração');
  ok(/connect-src 'self' http:\/\/127\.0\.0\.1:8791 ws:\/\/127\.0\.0\.1:8791;/.test(idx) && /script-src 'self';/.test(idx), 'CSP libera só o próprio site e o Supabase configurado, e scripts do próprio site');

  const SEMEX = path.join(P, '.saida', 'sem-exemplo');
  execFileSync('python3', [path.join(P, '..', 'build.py'), '--saida', SEMEX], { stdio: 'ignore', env: { ...process.env, SUPABASE_URL: '', SUPABASE_ANON_KEY: '', REDIA_SEM_EXEMPLO: '1' } });
  const jsSem = fs.readFileSync(path.join(SEMEX, 'app', 'app.js'), 'utf8');
  ok(!/BUZ-061|Maran Libra|EX-GAS/.test(jsSem) && /EXEMPLO_DISPONIVEL = false/.test(jsSem), 'REDIA_SEM_EXEMPLO=1 publica sem os dados de exemplo');

  await browser.close(); await srv.fechar();
  console.log('\n' + (erros.length ? `${erros.length} FALHA(S):\n - ` + erros.join('\n - ') : 'TODOS OS TESTES DA NUVEM PASSARAM'));
  process.exit(erros.length ? 1 : 0);
})();
