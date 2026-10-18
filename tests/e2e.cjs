// Teste ponta a ponta da REDIA V1.0 no modo demonstração (versão web servida por HTTP).
// Uso: node e2e.cjs   (monta o app em tests/.saida/demo e sobe um servidor local)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const P = __dirname, OUT = path.join(P, 'out', 'demo'); fs.mkdirSync(OUT, { recursive: true });
const DIST = path.join(P, '.saida', 'demo');
execFileSync('python3', [path.join(P, '..', 'build.py'), '--saida', DIST], { stdio: 'inherit', env: { ...process.env, SUPABASE_URL: '', SUPABASE_ANON_KEY: '' } });
let URL = '';
const erros = [];
const TOPS = { 2: [['indicadores'], ['queima'], ['pocos'], ['pfceo'], ['ultimas24'], ['servicos'], ['analises']], 3: [['indicadores'], ['utilidades'], ['tanques'], ['integridade'], ['pfceo'], ['ultimas24'], ['servicos'], ['analises']], 4: [['indicadores'], ['geracao'], ['criticos'], ['legais'], ['pfceo'], ['ultimas24'], ['servicos'], ['analises']] };
const ok = (cond, msg) => { console.log((cond ? 'OK   ' : 'FALHA') + ' ' + msg); if (!cond) erros.push(msg); };

async function checarPalco(page, nome) {
  const res = await page.evaluate(() => {
    const out = [];
    const st = document.querySelector('.stage'); if (!st) return ['sem palco'];
    st.querySelectorAll('.card, main, section, .colg').forEach(el => {
      if (el.scrollHeight > el.clientHeight + 2) out.push(`VERT +${el.scrollHeight - el.clientHeight} ${el.className} "${(el.innerText || '').slice(0, 40).replace(/\s+/g, ' ')}"`);
      if (el.scrollWidth > el.clientWidth + 2) out.push(`HORIZ +${el.scrollWidth - el.clientWidth} ${el.className}`);
    });
    const runs = []; const w = document.createTreeWalker(st, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { if (!n.textContent.trim()) continue; const r = document.createRange(); r.selectNodeContents(n); const pe = n.parentElement, clip = getComputedStyle(pe).overflow === 'hidden' ? pe.getBoundingClientRect() : null; for (let rc of r.getClientRects()) { if (clip) rc = { left: Math.max(rc.left, clip.left), right: Math.min(rc.right, clip.right), top: Math.max(rc.top, clip.top), bottom: Math.min(rc.bottom, clip.bottom), get width() { return this.right - this.left; }, get height() { return this.bottom - this.top; } }; if (rc.width > 1 && rc.height > 1) runs.push({ el: pe, rc, t: n.textContent.trim().slice(0, 25) }); } }   /* texto cortado com reticências (overflow hidden): vale só a parte visível */
    let k = 0;
    for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) {
      const a = runs[i], b = runs[j]; if (a.el === b.el) continue;
      const x = Math.min(a.rc.right, b.rc.right) - Math.max(a.rc.left, b.rc.left), y = Math.min(a.rc.bottom, b.rc.bottom) - Math.max(a.rc.top, b.rc.top);
      if (x > 3 && y > 4 && k < 8) { k++; out.push(`OVERLAP "${a.t}" × "${b.t}"`); }
    }
    const sr = st.getBoundingClientRect();
    runs.forEach(r => { if (r.rc.bottom > sr.bottom + 1 || r.rc.right > sr.right + 1) out.push(`FORA "${r.t}"`); });
    const mais = [...st.querySelectorAll('.mais')].map(m => m.textContent);
    if (mais.length) out.push('INFO encaixe: ' + mais.join(' / '));
    return out.slice(0, 12);
  });
  const graves = res.filter(r => !r.startsWith('INFO'));
  ok(graves.length === 0, `palco ${nome} sem estouro/sobreposição ${res.length ? '→ ' + res.join(' | ') : ''}`);
}

(async () => {
  const { iniciarServidor } = await import('./servidor.mjs');
  const srv = await iniciarServidor({ estatico: DIST });
  URL = srv.url + '/app/index.html';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => { erros.push('pageerror: ' + e.message); console.log('PAGEERROR', e.message); });
  page.on('console', m => { if (m.type() === 'error') { erros.push('console: ' + m.text()); console.log('CONSOLE', m.text()); } });
  page.on('dialog', d => d.dismiss());
  await page.addInitScript(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });

  /* ---- modo demonstração ---- */
  /* ---- acesso ---- */
  await page.goto(URL + '#/inicio'); await page.waitForTimeout(1600);
  ok(await page.$('.login .lg-card') !== null && await page.$('.apph') === null, 'sem sessão, o app abre na tela de acesso');
  const vid = await page.evaluate(() => { const v = document.querySelector('.lg-vid'); return v ? { src: v.src.split('/').slice(-2).join('/'), muted: v.muted, loop: v.loop, err: v.error?.code || 0, rs: v.readyState } : null; });
  ok(vid && vid.muted && vid.loop && vid.err === 0 && vid.rs >= 2, `vídeo de fundo servido em assets/ (${JSON.stringify(vid)})`);
  await page.screenshot({ path: path.join(OUT, 'login.png') });
  await page.fill('#lg-chave', 'zz99'); await page.fill('#lg-senha', '1234'); await page.click('.lg-btn'); await page.waitForTimeout(200);
  ok(/não cadastrada/.test(await page.textContent('#lg-msg')), 'chave inexistente recusada');
  await page.fill('#lg-chave', 'cp01'); await page.fill('#lg-senha', '0000'); await page.click('.lg-btn'); await page.waitForTimeout(200);
  ok(/Senha incorreta/.test(await page.textContent('#lg-msg')) && await page.inputValue('#lg-chave') === 'CP01', 'senha errada recusada (chave em maiúsculas)');
  await page.screenshot({ path: path.join(OUT, 'login_erro.png') });
  await page.click('[data-act="esqueci"]'); await page.waitForTimeout(150);
  ok(/1234/.test(await page.textContent('.mdl')) && await page.$('[data-mdl-in="chave"]') === null, 'login: "Esqueci a senha" no modo demonstração lembra a senha de teste');
  await page.click('[data-mdl="cancelar"]'); await page.waitForTimeout(100);
  await page.fill('#lg-senha', '1234'); await page.click('.lg-btn'); await page.waitForTimeout(800);
  const u = await page.evaluate(() => USUARIO);
  ok(u && u.posto === 'COPROD' && u.coord === 'COPROD' && u.chave === 'CP01' && page.url().endsWith('#/inicio'), `login com chave e senha genérica (${u && u.posto}/${u && u.coord})`);
  ok(await page.evaluate(() => Store.modo === 'memoria' && !MODO_NUVEM), 'sem config.js do Supabase, abre direto no modo demonstração');
  ok(await page.evaluate(() => typeof ACESSO === 'undefined' && Object.keys(ACESSO_DEMO).every(c => /^[A-Z]{2}01$/.test(c)) && Object.values(ACESSO_DEMO).every(a => /\(demo\)$/.test(a.nome))), 'demonstração só com usuários fictícios (sem lista de chaves reais no código)');
  await page.evaluate(async () => { await abrirDia('2026-10-09'); }); await page.waitForTimeout(200);   // D-68: o Início não tem mais calendário
  await page.fill('#sim', '07:30'); await page.click('[data-act="simular"]'); await page.waitForTimeout(100);
  await page.click('[data-act="exemplo"]'); await page.waitForTimeout(400);
  const nReg = await page.evaluate(() => Store.cache.size);
  ok(nReg > 80, `exemplo carregado (${nReg} registros)`);
  /* ---- D-52: sugestões sem classificação, captura de dados, análises de laboratório, Canal Base x Bordo ---- */
  const sc = await page.evaluate(() => ({ n: E.sugestoes.length, dec: E.sugestoes.filter(x => x.decisao).length, so: E.sugestoes.filter(x => x.payload.somenteLeitura).length, pend: COORDS.map(c => pendentes(E, c).length) }));
  ok(sc.n === 28 && sc.dec === 0 && sc.so === 0 && sc.pend.every(n => n === 7), `exemplo: as 28 sugestões chegam sem classificação (${JSON.stringify(sc)})`);
  await page.goto(URL + '#/curadoria/COPROD/dados'); await page.waitForTimeout(250);
  ok(await page.$$eval('[data-capturar]', bs => bs.length) >= 6, 'Dados automáticos: botão "Capturar dados" em cada bloco');
  await page.evaluate(() => { Captura.rapida = true; });
  await page.click('[data-capturar="COPROD|IUGA e queima"]'); await page.waitForTimeout(600);
  const cap = await page.evaluate(() => { const r = UI.captura['COPROD|IUGA e queima']; return { falta: r.faltando.map(f => f.id), mant: r.mantidos.map(f => f.id), passos: r.passos.length, ok: r.passos.every(p => p.st === 'ok'), linhas: document.querySelectorAll('tr.falta').length, alerta: !!document.querySelector('.falta-al'), bar: r.passos.length > 0 }; });
  ok(cap.ok && cap.falta.includes('iuga.atp') && !cap.falta.includes('iuga.buzios') && cap.linhas === 1 && cap.alerta, `captura: progresso concluído e alerta para dados não encontrados (${cap.falta.join(', ')})`);
  ok(cap.mant.includes('flare.hp') && !cap.falta.includes('flare.hp'), 'captura: sem valor na origem, o valor manual atual é mantido e não vira pendência');
  const prog = await page.evaluate(async () => { const box = document.createElement('div'); progressoCaptura(box, { pct: 40, passos: [{ txt: 'Conectando ao SITOP', st: 'ok' }, { txt: 'Consultando', st: 'exec' }] }); return { bar: box.querySelector('.capt-bar i').style.width, pct: box.querySelector('.capt-pct').textContent, spin: !!box.querySelector('.spin') }; });
  ok(prog.bar === '40%' && prog.pct === '40%' && prog.spin, 'captura: barra de progresso, percentual e etapa em execução');
  ok(await page.$('[data-grupo]') === null && await page.$('[data-add]') === null && await page.$('[data-salvar]') === null, 'D-53: Dados automáticos sem botões Salvar e Adicionar linha');
  await page.fill('[data-campo="iuga.atp"]', '97.1'); await page.press('[data-campo="iuga.atp"]', 'Tab'); await page.waitForTimeout(300);
  const d53a = await page.evaluate(() => ({ falta: UI.captura['COPROD|IUGA e queima'].faltando.map(f => f.id).join(), v: E.valores['iuga.atp'], linha: document.querySelector('#cp-iuga\\.atp').closest('tr').className, orig: document.querySelector('[data-orig="iuga.atp"]').textContent, foco: document.activeElement?.dataset?.campo, nAl: document.querySelectorAll('tr.falta').length }));
  ok(d53a.falta === '' && d53a.v.valor === 97.1 && d53a.v.origem === 'M', 'ao sair do campo, o valor digitado grava sozinho e sai do alerta');
  ok(!/falta/.test(d53a.linha) && d53a.nAl === 0 && /^M/.test(d53a.orig) && /GP01|\(demo\)/.test(d53a.orig + JSON.stringify(d53a.v.autor)), `campo preenchido perde o destaque de falha e mostra M com autor e hora (${d53a.orig})`);
  ok(d53a.foco === 'iuga.buzios', `gravar não redesenha a tela: o foco segue no próximo campo (${d53a.foco})`);
  await page.selectOption('[data-campo="flare.lp"]', 'Fechado'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => E.valores['flare.lp'].valor === 'Fechado' && E.valores['flare.lp'].origem === 'M'), 'caixa de seleção grava ao escolher (origem M)');
  /* D-53: equipamentos com status individual, capturados da passagem de serviço */
  const eqs = await page.evaluate(() => ({ n: EQUIP.reduce((a, e) => a + e.itens.length, 0), sel: document.querySelectorAll('[data-campo^="eq."]').length, op: [...document.querySelector('[data-campo="eq.gas.main.a"]').options].map(o => o.value).filter(Boolean).join('|') }));
  ok(eqs.n === 23 && eqs.sel === 23 && eqs.op === 'Operando|Stand By|Em manutenção|Indisponível|Limitado', `equipamentos: uma linha e uma caixa de status por equipamento (${eqs.sel}; ${eqs.op})`);
  await page.click('[data-capturar="COPROD|Compressores de gás"]'); await page.waitForTimeout(600);
  const capEq = await page.evaluate(() => ({ falta: UI.captura['COPROD|Compressores de gás'].faltando.map(f => f.id).join(), fonte: E.valores['eq.gas.injection.a'].fonte, st: E.valores['eq.gas.injection.a'].valor, org: E.valores['eq.gas.injection.a'].origem, pas: UI.captura['COPROD|Compressores de gás'].passos.some(p => /Passagem de serviço/.test(p.txt)) }));
  ok(capEq.falta === 'eq.gas.co2.b' && capEq.st === 'Indisponível' && capEq.org === 'A' && /Passagem.* posto Gás/.test(capEq.fonte) && capEq.pas, `captura dos compressores pela passagem de serviço (${capEq.fonte}; falta ${capEq.falta})`);
  await page.selectOption('[data-campo="eq.gas.co2.b"]', 'Stand By'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => UI.captura['COPROD|Compressores de gás'].faltando.length === 0 && !document.querySelector('[data-bloco="COPROD|Compressores de gás"] tr.falta') && !document.querySelector('[data-bloco="COPROD|Compressores de gás"] .falta-al') && E.valores['eq.gas.co2.b'].origem === 'M'), 'status digitado no equipamento que faltou: grava, confirma e o alerta some');
  /* D-57: reserva tática e recuperação do IUGA */
  const t1 = await page.evaluate(() => { const t = iugaTatico(E, DIA); return { modo: t.modo, metaT: t.metaT, tat: t.tatica, conf: (t.iugaMes - t.metaT) / 100 * t.PtotT, Ptot: t.PtotT, Pacc: t.Pacc, prodDia: t.prodDia, rest: t.restantes }; });
  ok(t1.modo === 'reserva' && t1.metaT === 97.1 && t1.tat > 0 && Math.abs(t1.tat - t1.conf) < 1 && Math.abs(t1.Ptot - (t1.Pacc + t1.prodDia * t1.rest)) < 1, `reserva tática = (IUGA do mês − meta − margem 0,1) × produção projetada do mês (${Math.round(t1.tat)} m³)`);
  await page.fill('[data-campo="iuga.margem"]', '0.5'); await page.press('[data-campo="iuga.margem"]', 'Tab'); await page.waitForTimeout(300);
  const t2 = await page.evaluate(() => { const t = iugaTatico(E, DIA); return { metaT: t.metaT, tat: t.tatica }; });
  ok(t2.metaT === 97.5 && t2.tat < t1.tat, `margem de segurança ajustável pela curadoria (meta tática ${t2.metaT}%)`);
  await page.fill('[data-campo="iuga.margem"]', ''); await page.press('[data-campo="iuga.margem"]', 'Tab'); await page.waitForTimeout(300);
  await page.goto(URL + '#/apresentacao/1'); await page.waitForTimeout(250);
  ok(await page.evaluate(() => { const c = document.querySelector('.stage .card.iuga'); return /Reserva tática\s*\d+\s*mil m³/.test(c.textContent) && /Por dia\s*[\d,]+\s*mil m³\/d/.test(c.textContent); }), 'abertura · card IUGA: reserva tática no mês e por dia');
  await page.goto(URL + '#/apresentacao/2'); await page.waitForTimeout(250);
  ok(await page.evaluate(() => /Reserva tática/.test(document.querySelector('.stage .qtat')?.textContent || '') && !/Reserva no mês/.test(document.querySelector('.stage .qk').textContent)), 'COPROD · card Queima projetada: reserva tática no lugar de “Reserva no mês” (que segue no detalhe)');
  await page.evaluate(async () => { const r = reservaQueima(E, DIA); await registrar('valor', { campo: 'queima.acum_mes', valor: Math.round(r.Pacc * 0.0335), origem: 'M', fonte: 'Manual' }); atualizarEstado(); rerender(); });
  await page.waitForTimeout(250);
  const t3 = await page.evaluate(() => { const t = iugaTatico(E, DIA); return { modo: t.modo, maxDia: t.maxDia, conf: ((1 - t.meta / 100) * t.PtotT - t.Qacc) / t.restantes, nec: t.iugaDiaNec, conf2: (1 - t.maxDia / t.prodDia) * 100, org: t.origens.map(o => o.causa), card: document.querySelector('.stage .qtat')?.textContent || '', qb: document.querySelector('.stage .qb').textContent }; });
  ok(t3.modo === 'recuperar' && Math.abs(t3.maxDia - t3.conf) < 1 && Math.abs(t3.nec - t3.conf2) < 1e-9 && t3.nec > 97, `abaixo da meta: queima máxima diária para recuperar (${Math.round(t3.maxDia)} m³/d) e IUGA diário necessário (${t3.nec.toFixed(2)}%)`);
  ok(/Máx\. p\/ recuperar/.test(t3.card) && /Trabalhar:\s*Queda do TC-A e da FGRU/.test(t3.qb) && t3.org[0] === 'Queda do TC-A e da FGRU' && t3.org.length === 2, `COPROD: queima máxima e origens evitáveis a trabalhar, maiores primeiro (${t3.org.join(' · ')})`);
  await page.goto(URL + '#/apresentacao/1'); await page.waitForTimeout(250);
  ok(await page.evaluate(() => /Máx\.\/dia\s*\d+\s*mil m³\/d/.test(document.querySelector('.stage .card.iuga').textContent) && /IUGA diário mín\./.test(document.querySelector('.stage .card.iuga').textContent)), 'abertura · card IUGA: abaixo da meta mostra a queima máxima diária e o IUGA diário mínimo');
  await page.goto(URL + '#/apresentacao/2/queima'); await page.waitForTimeout(250);
  ok(await page.evaluate(() => { const c = document.querySelector('.stage .tatc.rec'); return c && /Recuperação do IUGA/.test(c.textContent) && /Origens evitáveis a trabalhar/.test(c.textContent) && /reduzir/.test(c.textContent); }), 'detalhe da queima: plano de recuperação com redução necessária e origens evitáveis');
  await page.evaluate(async () => { await registrar('valor', { campo: 'queima.acum_mes', valor: null, origem: 'M', fonte: 'Manual' }); atualizarEstado(); });
  await page.goto(URL + '#/curadoria/COPROD/dados'); await page.waitForTimeout(250);
  /* D-53: lista na aba Dados automáticos grava ao sair do campo, com linha em branco no fim para incluir */
  const lc = '[data-lista="queima.causas"]';
  const nCausas = await page.evaluate(() => L(E, 'queima.causas').length);
  ok(await page.$$eval(lc + ' tbody tr', t => t.length) === nCausas + 1, 'lista: linha em branco no fim, no lugar do botão Adicionar linha');
  await page.fill(lc + ' tbody tr:last-child [data-k="causa"]', 'Teste de causa'); await page.press(lc + ' tbody tr:last-child [data-k="causa"]', 'Tab'); await page.waitForTimeout(300);
  ok(await page.evaluate(n => L(E, 'queima.causas').length === n + 1 && E.listas['queima.causas'].origem === 'M' && document.querySelectorAll('[data-lista="queima.causas"] tbody tr').length === n + 2, nCausas), 'lista: preencher a linha em branco grava o item e abre nova linha em branco');
  await page.goto(URL + '#/curadoria/COMAN/dados'); await page.waitForTimeout(250);
  await page.click('[data-capturar="COMAN|Resultados de análises (eplab)"]'); await page.waitForTimeout(600);
  const capLab = await page.evaluate(() => UI.captura['COMAN|Resultados de análises (eplab)'].faltando.map(f => f.id));
  ok(capLab.includes('lab.COMAN.iso_hid') && capLab.includes('lab.COMAN.iso_hid.data') && capLab.length === 2, `captura eplab: análise sem resultado na origem vira pedido de preenchimento (${capLab.join(', ')})`);
  ok(await page.$$eval('table.lab tbody tr', t => t.length) === 5 && await page.$('table.lab input[type=date]') !== null, 'Dados automáticos: tabela de análises com resultado, data e periodicidade');
  /* D-66: Capturar todos os dados (todos os blocos da página, em sequência), mantendo o botão de cada bloco */
  const nBl = await page.$$eval('[data-capturar]', b => new Set(b.map(x => x.dataset.capturar)).size);
  await page.click('[data-act="capturar-todos"]'); await page.waitForFunction(() => !UI.capturando && UI.capturaTodos?.COMAN, null, { timeout: 60000 }); await page.waitForTimeout(300);
  const ct = await page.evaluate(() => ({ r: UI.capturaTodos.COMAN, blocos: Object.keys(UI.captura).filter(k => k.startsWith('COMAN|')).length, bot: document.querySelectorAll('[data-capturar]').length, txt: document.querySelector('[data-capt="todos"]').textContent }));
  ok(nBl >= 4 && ct.r.blocos === nBl && ct.r.feitos === nBl && ct.blocos >= nBl && ct.bot >= nBl && /Captura de todos os blocos/.test(ct.txt) && /não encontrado/.test(ct.txt), `Capturar todos os dados roda os ${nBl} blocos e mostra o resumo; os botões de cada bloco continuam (${JSON.stringify(ct.r)})`);
  const lab2 = await page.evaluate(() => labDe(E, 'COPROD').map(a => a.k + ':' + (a.atrasada ? 'atr' : 'ok')).join());
  ok(lab2 === 'bsw_oleo:ok,sal_oleo:ok,tog_agua:ok,h2s_gas:atr,so4_urs:ok,o2_inj:ok,h2o_gas:ok', `análises COPROD: H₂S atrasado pela periodicidade (${lab2})`);
  await page.goto(URL + '#/apresentacao/2'); await page.waitForTimeout(300);
  const card = await page.evaluate(() => { const c = [...document.querySelectorAll('.stage .card')].find(x => /Resultados de Análises/.test(x.querySelector('.hd')?.textContent)); const k = [...document.querySelectorAll('.stage .card')].find(x => /Canal Base x Bordo/.test(x.querySelector('.hd')?.textContent)); return { linhas: c.querySelectorAll('.row2.an').length, atr: c.querySelectorAll('.o.at.dt').length, canal: k.textContent, nums: !!k.querySelector('.nums') }; });
  ok(card.linhas === 5 && card.atr === 1, 'card Resultados de Análises: 5 parâmetros e a data atrasada em destaque');
  ok(!card.nums && !/abertas|vencidas|novas hoje/.test(card.canal) && /Plano de retorno da FGRU A/.test(card.canal), 'Canal Base x Bordo: só os tópicos, sem placar');
  await page.screenshot({ path: path.join(OUT, '0_inicio.png'), fullPage: true });

  for (let b = 1; b <= 5; b++) {
    await page.goto(URL + '#/apresentacao/' + b); await page.waitForTimeout(250);
    await page.evaluate(() => document.querySelector('#ctrl')?.classList.add('hide'));
    await checarPalco(page, b);
    await page.screenshot({ path: path.join(OUT, `pres_${b}.png`) });
  }
  /* ---- D-42: blocos padronizados (3 colunas iguais) e páginas de detalhe ---- */
  for (const b of [2, 3, 4]) {
    await page.goto(URL + '#/apresentacao/' + b); await page.waitForTimeout(250);
    const w = await page.evaluate(() => [...document.querySelector('.stage main.m3').children].map(c => Math.round(c.getBoundingClientRect().width)));
    const tit = await page.evaluate(() => [...document.querySelectorAll('.stage .hd a.lk')].map(a => a.textContent.replace('›', '').trim()));
    ok(w.length === 3 && Math.max(...w) - Math.min(...w) <= 2, `bloco ${b}: três colunas de mesma largura (${w.join(' / ')})`);
    ok(tit.includes('Indicadores') && tit.includes('Equipamentos e Sistemas – PFCEO') && tit.includes('Últimas 24h') && tit.includes('Serviços planejados hoje') && tit.includes('Canal Base x Bordo') && tit.includes('Resultados de Análises'), `bloco ${b}: campos padronizados com título clicável (${tit.join(' · ')})`);
    const dir = await page.evaluate(() => [...document.querySelector('.stage main.m3').children[2].querySelectorAll('.card .hd')].map(h => h.textContent.replace('›', '').trim()));
    ok(dir.length === 3 && /^Serviços planejados hoje/.test(dir[0]) && /^Canal Base x Bordo/.test(dir[1]) && /^Resultados de Análises/.test(dir[2]), `bloco ${b}: coluna direita com Serviços, Canal Base x Bordo e Resultados de Análises (D-52)`);
    for (const [t] of TOPS[b]) {
      await page.goto(URL + `#/apresentacao/${b}/${t}`); await page.waitForTimeout(200);
      await page.evaluate(() => document.querySelector('#ctrl')?.classList.add('hide'));
      await checarPalco(page, `${b}/${t}`);
      await page.screenshot({ path: path.join(OUT, `det_${b}_${t}.png`) });
    }
  }
  // R-05: nenhum elemento do palco usa classe de layout do app (colisão de nomes de classe)
  const colisoes = {};
  for (const r of ['1', '2', '3', '4', '5', ...Object.entries(TOPS).flatMap(([b, ts]) => ts.map(([t]) => b + '/' + t))]) {
    await page.goto(URL + '#/apresentacao/' + r); await page.waitForTimeout(120);
    const c = await page.evaluate(() => { const app = new Set(); for (const sh of document.styleSheets) for (const rule of sh.cssRules) { const sel = rule.selectorText; if (!sel) continue; for (const part of sel.split(',')) { const t = part.trim(); if (/^\.(stage|printroot|login)\b/.test(t)) continue; const m = /^\.([\w-]+)/.exec(t); if (m) app.add(m[1]); } }
      const ok = new Set(['ic', 'nw', 'sec', 'note']); const out = new Set(); document.querySelectorAll('.stage *').forEach(el => el.classList.forEach(k => { if (app.has(k) && !ok.has(k)) out.add(k); })); return [...out]; });
    if (c.length) colisoes[r] = c;
  }
  ok(!Object.keys(colisoes).length, `palco sem colisão com classes do app ${JSON.stringify(colisoes)}`);
  await page.goto(URL + '#/apresentacao/2/indicadores'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.querySelectorAll('.stage .w.eqg').length === 9 && document.querySelectorAll('.stage .w.eqg .eb').length === 23 && document.querySelectorAll('.stage .lge .eb').length === 5 && /Equipamentos · status/.test(document.querySelector('.stage').textContent)), 'COPROD · detalhe de indicadores: status individual dos equipamentos com legenda');
  await page.goto(URL + '#/apresentacao/2/pocos'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => { const c = document.querySelector('.stage .tbl.ops').closest('.card'); return c.querySelectorAll('.opr').length === 4 && [...c.querySelectorAll('.opr')].every(r => r.style.display !== 'none') && !/não exibid/.test(c.textContent); }), 'as 4 operações de exemplo aparecem inteiras no detalhe de poços');
  await page.goto(URL + '#/apresentacao/2'); await page.waitForTimeout(200);
  await page.click('.stage .hd a.lk:has-text("Queima projetada")'); await page.waitForTimeout(200);
  ok(page.url().endsWith('#/apresentacao/2/queima') && /Reserva de queima no mês/.test(await page.textContent('.stage')), 'clicar no título leva ao detalhe (Queima projetada)');
  await page.click('.stage a.dbtn:has-text("Tela COPROD")'); await page.waitForTimeout(200);
  ok(page.url().endsWith('#/apresentacao/2'), 'botão do detalhe volta à tela da coordenação');
  await page.goto(URL + '#/apresentacao/2/pocos'); await page.waitForTimeout(200);
  await page.click('.stage a.dbtn:has-text("Próximo")'); await page.waitForTimeout(200);
  ok(page.url().endsWith('#/apresentacao/3'), 'botão do detalhe avança para a próxima coordenação');
  await page.goto(URL + '#/apresentacao/3/pfceo'); await page.waitForTimeout(200); await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  ok(page.url().endsWith('#/apresentacao/3'), 'Esc no detalhe volta à tela da coordenação');
  const rq = await page.evaluate(() => {
    const r = reservaQueima(E, DIA), meta = VN(E, 'iuga.meta'), pp = VN(E, 'iuga.gas_prod_proj'), d = parseData(DIA);
    let P = 0, Q = 0, n = 0;   // soma independente: último valor D-1 gravado em cada REDIA do mês, dias 2..hoje
    for (let x = 2; x <= d.getDate(); x++) { const dia = DIA.slice(0, 8) + String(x).padStart(2, '0'); const v = {}; Store.registros(dia).forEach(g => { if (g.tipo === 'valor') v[g.payload.campo] = g.payload.valor; }); if (v['gas.prod_d1'] != null) { P += +v['gas.prod_d1']; n++; } if (v['queima.real_d1'] != null) Q += +v['queima.real_d1']; }
    const rest = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate() + 1, esp = (1 - meta / 100) * (P + pp * rest) - Q;
    return { r: Math.round(r.reserva), esp: Math.round(esp), P: r.Pacc, Pesp: P, iuga: +r.iugaMes.toFixed(4), iugaEsp: +((P - Q) / P * 100).toFixed(4), rest: r.restantes, restEsp: rest, dias: r.dias, n, fonte: r.fonteP };
  });
  ok(rq.r === rq.esp && rq.P === rq.Pesp && rq.iuga === rq.iugaEsp && rq.rest === rq.restEsp && rq.dias === rq.n && rq.fonte === 'soma', `D-43: acumulados = soma diária do SITOP; reserva e IUGA parcial (${JSON.stringify(rq)})`);
  const d43 = await page.evaluate(async () => {
    const ontem = addDias(DIA, -1), antes = E.mes.gas, vOntem = E.mes.dias.find(x => x.redia === ontem).gas;
    DIA = ontem; await Store.gravarLote([novoRegistro('valor', { campo: 'gas.prod_d1', valor: vOntem + 1000, origem: 'M' })]); /* D-67: dia anterior encerrado (ata) · correção direta no armazenamento */ DIA = '2026-10-09'; atualizarEstado();
    const corrigido = E.mes.gas - antes;
    DIA = addDias('2026-10-09', -3); await Store.gravarLote([novoRegistro('valor', { campo: 'queima.real_d1', valor: null, origem: 'M' })]); DIA = '2026-10-09'; atualizarEstado();
    const falta = E.mes.faltam.slice();
    await registrar('valor', { campo: 'iuga.gas_prod_mes', valor: 30000000, origem: 'M' }); atualizarEstado();
    const man = reservaQueima(E, DIA);
    await registrar('valor', { campo: 'iuga.gas_prod_mes', valor: null, origem: 'M' }); atualizarEstado();
    const volta = reservaQueima(E, DIA).fonteP;
    const dia1 = acumuladoMes('2026-11-01', x => Store.registros(x)).n;
    return { corrigido, falta, manP: man.Pacc, manF: man.fonteP, volta, dia1 };
  });
  ok(d43.corrigido === 1000, 'corrigir o gás D-1 de um dia anterior altera a soma do mês');
  ok(d43.falta.length === 1 && d43.falta[0] === '2026-10-05', `dia sem dado é sinalizado (${d43.falta.join(',')})`);
  ok(d43.manP === 30000000 && d43.manF === 'manual' && d43.volta === 'soma', 'correção manual do acumulado substitui a soma; apagar volta à soma');
  ok(d43.dia1 === 0, 'na REDIA do dia 1 o mês começa vazio (o D-1 é do mês anterior)');
  await page.goto(URL + '#/apresentacao/2/pocos'); await page.waitForTimeout(200);
  const cil = await page.evaluate(() => [...document.querySelectorAll('.stage .cil')].map(c => ({ prim: c.querySelector('.o.ab')?.closest('.tbl') ? [...c.querySelectorAll('.tbl .td')][0].textContent : null })));
  ok(cil.length === 2 && cil[0].prim === 'EX-GAS-0412' && cil[1].prim === 'EX-PVT-0107', `cilindros: o mais antigo disponível aparece primeiro (${JSON.stringify(cil)})`);
  ok(await page.evaluate(() => /Próximo teste de vazão/.test(document.querySelector('.stage').textContent)), 'detalhe de poços mostra o próximo teste de vazão');
  const ops = await page.evaluate(() => [...document.querySelectorAll('.stage .tbl.ops .opr')].map(r => r.querySelector('.td .o').textContent));
  ok(ops.length === 4 && ops[0] === 'Em curso' && ops[1] === 'Prevista' && ops[3] === 'Realizada', `detalhe de poços: campo Operações, em curso primeiro (${ops.join(' · ')})`);
  ok(await page.evaluate(() => /Embarcação \+ ROV/.test(document.querySelector('.stage .tbl.ops').textContent) && document.querySelectorAll('.stage .tbl.ops .w').length === 4), 'operações mostram apoio (embarcação/ROV) e o poço com seu status');
  const muitas = await page.evaluate(async () => { const base = L(E, 'pocos.operacoes'); const extra = Array.from({ length: 8 }, (_, k) => ({ poco: 'BUZ-088', operacao: 'Operação extra ' + (k + 1), tipo: 'Operação', situacao: 'Prevista', data: addDias(DIA, 10 + k), apoio: '—', demandante: '', obs: '' }));
    await registrar('lista', { campo: 'pocos.operacoes', itens: [...base, ...extra], origem: 'M', fonte: 'Manual' }); atualizarEstado(); return base; });
  await page.goto(URL + '#/apresentacao/2'); await page.waitForTimeout(150); await page.goto(URL + '#/apresentacao/2/pocos'); await page.waitForTimeout(250);
  await page.evaluate(() => document.querySelector('#ctrl')?.classList.add('hide'));
  await checarPalco(page, '2/pocos com 12 operações');
  ok(await page.evaluate(() => { const c = document.querySelector('.stage .tbl.ops').closest('.card'); return /não exibid/.test(c.textContent) && [...c.querySelectorAll('.opr')].filter(r => r.style.display === 'none').length > 0 && [...c.querySelectorAll('.tbl .w')].every(w => w.style.display !== 'none'); }), 'muitas operações: linhas inteiras saem com aviso “+N não exibidos”');
  await page.evaluate(async b => { await registrar('lista', { campo: 'pocos.operacoes', itens: b, origem: 'M', fonte: 'Manual' }); atualizarEstado(); }, muitas);
  await page.goto(URL + '#/curadoria/COPROD/m-operacoes'); await page.waitForTimeout(150);
  ok(await page.$('[data-lista="pocos.operacoes"]') !== null, 'curadoria da COPROD: aba Operações em poços para preenchimento');
  await page.goto(URL + '#/apresentacao/2'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => { const t = document.querySelector('.stage').textContent; return /Trem A/.test(t) && /Trem B/.test(t) && /Teste/.test(t) && /Próximo teste de vazão/.test(t) && /BUZ-112/.test(t); }), 'card de poços mostra os trens e o próximo teste');
  ok(await page.evaluate(() => { const t = document.querySelector('.stage').textContent; return /Acumulado no mês/.test(t) && /IUGA parcial do mês/.test(t) && /Reserva tática/.test(t) && /Projetada D/.test(t) && /Reserva por dia/.test(t) && !/por causa/.test(t); }), 'card “Queima projetada”: projetada × reserva por dia (m³/d) e o mês (acumulado, IUGA parcial, reserva tática)');
  await page.goto(URL + '#/apresentacao/1'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => { const c = document.querySelector('.stage .offa'); return c && /Offloading · TOP previsto/i.test(c.textContent) && /Maran Libra/.test(c.querySelector('.b').textContent) && !!c.querySelector('.tq2 > div') && /Ocupado/.test(c.textContent) && /Livre/.test(c.textContent) && /SITOP/.test(c.querySelector('.fte').textContent) && /Mar dentro da janela/.test(c.querySelector('.mto').textContent); }), 'abertura: offloading com TOP previsto, navio, janela de mar por extenso, barra ocupado × livre e fonte');
  ok(await page.evaluate(() => { const t = document.querySelector('.stage').textContent; return /3,9%/.test(t) && /679\s?m³/.test(t) && /Produzida descartada no mar: 0\s?m³/.test(t); }), 'abertura: água produzida reinjetada = 3,9% e descarte preservado (0 m³)');
  /* D-61 (proposta 4): tendência de 7 dias com os registros das REDIAs anteriores */
  const t4 = await page.evaluate(() => { const t = E.tend; const n = c => t[c].filter(p => p.valor != null).length; return { oleo: n('oleo.real'), iuga: n('iuga.real'), gas: n('gas.real'), agua: n('agua.real'), ult: t['oleo.real'].at(-1), spk: document.querySelectorAll('.stage .spk svg').length, ref: !!document.querySelector('.stage .spk svg line') }; });
  ok(t4.oleo === 7 && t4.iuga === 7 && t4.gas === 7 && t4.agua === 7 && t4.ult.redia === '2026-10-09' && t4.ult.valor === 26925 && t4.spk === 4 && t4.ref, `abertura: 4 sparklines de 7 dias (último ponto = realizado D-1 desta REDIA) com linha de referência (${JSON.stringify(t4)})`);
  /* D-61 (proposta 10): queima por classe no dia e acumulada no mês */
  const c10 = await page.evaluate(() => { const cl = E.classes, h = L(E, 'queima.causas'); return { dias: cl.dias, rot: cl.Rotina, ext: cl['Extraordinária'], hoje: h.map(classeQueima), semClasse: classeQueima({ evitavel: 'sim' }) }; });
  ok(c10.dias === 9 && c10.rot > 0 && c10.ext > 0 && c10.hoje.slice(0, 4).join() === 'Extraordinária,Rotina,Extraordinária,Rotina' && c10.semClasse === 'Extraordinária', `queima classificada rotina × extraordinária com acumulado do mês por classe (${JSON.stringify(c10)})`);
  await page.goto(URL + '#/apresentacao/2/queima'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const t = document.querySelector('.stage').textContent, g = document.querySelector('.stage .gq svg'); return /por causa e classe/.test(t) && /Rotina/.test(t) && /Extraordinária/.test(t) && !!g && g.querySelectorAll('path').length >= 2 && /IUGA acumulado do mês × trajetória/.test(t); }), 'detalhe da queima: classes no dia e no mês + gráfico do IUGA acumulado × meta × trajetória (D-61)');
  await page.goto(URL + '#/apresentacao/4'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const c = document.querySelector('.stage .pfc'), f = c.querySelector('.row2'); return f.classList.contains('pfs') && /Sistemas de segurança/.test(f.textContent) && /Detecção de fogo e gás/.test(f.textContent) && /Com restrição/.test(f.textContent) && /Tratamento de efluentes/.test(c.textContent); }), 'COMAN: sistemas de segurança na primeira linha do PFCEO, com o pior estado, e os desvios de processo em seguida (D-61)');
  /* D-62 · onda 2: segurança de processo na abertura, inibições, críticos, inspeções, peças e teste de vazão vencido */
  await page.goto(URL + '#/apresentacao/1'); await page.waitForTimeout(300);
  const sp2 = await page.evaluate(() => { const sp = segurancaProcesso(E, DIA), c = document.querySelector('.stage .segc'); return { sem: sp.sem, t12: sp.t12.length, t3: sp.t3.length, t4: sp.t4.length, inib: sp.inib.length, antiga: sp.maisAntiga?.dias, antSem: sp.maisAntiga?.sem, venc: sp.venc.length, v7: sp.v7.length, card: c?.dataset.seg, txt: c?.textContent.replace(/\s+/g, ' ') }; });
  ok(sp2.sem === 'nok' && sp2.t12 === 0 && sp2.t3 === 1 && sp2.t4 === 1 && sp2.inib === 2 && sp2.antiga === 4 && sp2.antSem === 'nok' && sp2.venc === 1 && sp2.v7 === 1 && sp2.card === 'nok' && /Segurança de processo · 24 h/.test(sp2.txt) && /2\s*eventos/.test(sp2.txt) && /2 inibições/.test(sp2.txt) && /1 vencido/.test(sp2.txt), `abertura: coluna Segurança de processo (eventos, inibições com a mais antiga, críticos vencidos) (${JSON.stringify(sp2)})`);
  ok(await page.evaluate(() => { const w = [...document.querySelectorAll('.stage .w.tv')].filter(x => !x.classList.contains('lg-tv')); return w.length === 1 && /BUZ-112/.test(w[0].textContent) && /vencido: 95 dias/.test(w[0].dataset.tip || w[0].title); }), 'abertura: poço com teste de vazão vencido (> periodicidade da UEP) marcado com atenção');
  await page.goto(URL + '#/apresentacao/2'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => /Teste de vazão vencido · 1/.test(document.querySelector('.stage .tvl')?.textContent || '') && /BUZ-112 95 d/.test(document.querySelector('.stage .tvl').textContent)), 'card de poços lista os testes de vazão vencidos');
  await page.goto(URL + '#/apresentacao/3'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const a = document.querySelector('.stage a.o.insp'); return !!a && /1 inspeção vencida/.test(a.textContent) && a.getAttribute('href') === '#/apresentacao/3/integridade'; }), 'COEMB: inspeções de integridade vencidas no card de tanques, com link para o detalhe');
  await page.goto(URL + '#/apresentacao/3/integridade'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const t = document.querySelector('.stage').textContent; const ins = inspecoesDe(E, DIA); return ins[0].item === 'Amarração · linha C-02' && ins[0].v.k === 'nok' && /Vencida há 5 d/.test(t) && /Vence em 20 d/.test(t) && /Executada/.test(t); }), 'detalhe de integridade: vencidas primeiro, janela de 30 dias e executadas');
  await page.goto(URL + '#/apresentacao/4'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const t = document.querySelector('.stage').textContent; return /Críticos de segurança vencidos\s*1/.test(t) && /1 vence em 7 d/.test(t) && /Peças críticas em falta\s*2/.test(t) && /1 em trânsito/.test(t); }), 'COMAN: críticos de segurança vencidos e peças em falta nos cards, com link para o detalhe');
  await page.goto(URL + '#/apresentacao/4/criticos'); await page.waitForTimeout(300);
  const cr2 = await page.evaluate(() => { const t = document.querySelector('.stage').textContent; const c = criticasDe(E, DIA), p = pecasDe(E); return { ks: c.map(x => x.v.k).join(), ps: p.map(x => x.situacao).join(), a: /Vencida há 3 d/.test(t), b: /Vence em 5 d/.test(t), c: /prev\. \d\d\/\d\d/.test(t) }; });
  ok(cr2.ks === 'nok,at,ok,ok' && cr2.ps === 'Em falta,Em falta,Em trânsito' && cr2.a && cr2.b && cr2.c, `detalhe de críticos e peças: vencidos primeiro, previsão de chegada das peças (${JSON.stringify(cr2)})`);
  await page.goto(URL + '#/curadoria/GEPLAT/dados'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const t = document.querySelector('.ed').textContent; return /Segurança de processo · eventos das 24 h/.test(t) && /Inibições e bypass/.test(t) && !!document.querySelector('[data-capturar="GEPLAT|lista:sms.eventos"]'); }), 'curadoria GEPLAT: listas de segurança de processo e inibições com Capturar dados (passagem de serviço)');
  ok(await page.evaluate(() => fonteDoCampo('sms.eventos') === 'PASSAGEM' && fonteDoCampo('man.criticas') === 'SAP' && fonteDoCampo('man.pecas') === 'SAP' && fonteDoCampo('insp.integridade') === 'INTEGRIDADE'), 'captura: fontes das listas novas (passagem, SAP PM/MM, plano de inspeção)');
  /* D-63 · onda 3 */
  const o3 = await page.evaluate(() => { const d = deferimentoDe(E), jm = janelaMeteo(E), es = estabilidade(E), mn = manobrasDe(E, DIA), p = L(E, 'pocos'), rec = E.rec; return { def: d.map(x => x.volume), defMes: E.def.porSistema[0]?.k, defTot: E.def.total, jm: jm.sem, hs: jm.hs.sem, es: es.sem, trim: es.trim, mnCabe: mn.cabe, mnTot: mn.total, pd: p.filter(x => pocoDesvio(x)?.abaixo).map(x => x.poco), custo: E.custo.itens.map(x => x.eq), custoTot: E.custo.total, rec: Object.values(rec).map(r => r.rot + ':' + r.n).sort(), t30: E.tend30['oleo.real'].filter(x => x.valor != null).length, fontes: [fonteDoCampo('meteo.hs'), fonteDoCampo('iuga.atp'), fonteDoCampo('man.backlog')] }; });
  ok(o3.def.join() === '620,380,150' && o3.defMes === 'Planta de processo' && o3.defTot > 1150 && o3.jm === 'ok' && o3.hs === 'ok' && o3.es === 'ok' && o3.trim === 0.5 && o3.mnCabe === true && o3.mnTot === 55000 && o3.pd.join() === 'BUZ-095,BUZ-130' && o3.custo.join() === 'TC-A,FGRU A' && o3.custoTot > 0 && o3.rec.some(r => /^FGRU A · Injection A:[3-9]/.test(r)) && o3.rec.some(r => /^UE-5121501:[3-9]/.test(r)) && o3.rec.length <= 8 && o3.t30 === 30 && o3.fontes.join() === 'METEO,ATIVO,SAP', `onda 3: deferimento + Pareto do mês, janela meteo, estabilidade, manobras × reserva, poços abaixo do potencial, custo da indisponibilidade, recorrências e tendência de 30 dias (${JSON.stringify(o3)})`);
  await page.goto(URL + '#/apresentacao/1'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => /97,41%/.test(document.querySelector('.stage .card.iuga').textContent) && !!document.querySelector('.stage .offa [data-meteo="ok"]') && document.querySelectorAll('.stage .w.wpd').length === 1 && /BUZ-095/.test(document.querySelector('.stage .w.wpd').textContent)), 'abertura: IUGA do ativo e do campo preenchidos, janela meteo no card de offloading e poço abaixo do potencial marcado');
  await page.goto(URL + '#/curadoria/COPROD/sugestoes'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const c = [...document.querySelectorAll('.chip.rec')]; return c.length >= 1 && /Recorrente ×3/.test(c[0].textContent); }), 'fila da curadoria marca a sugestão recorrente (mesma TAG em 3 REDIAs em 30 dias)');
  await page.goto(URL + '#/apresentacao/semana'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const t = document.querySelector('.stage').textContent; return /Visão semanal/.test(t) && /Tendências · 7 e 30 dias/.test(t) && document.querySelectorAll('.stage .sem-r').length === 5 && /Recorrências · 30 dias/.test(t) && /FGRU A · Injection A/.test(t) && /Itens a escalar/.test(t) && /vencidas/.test(t); }), 'visão semanal: tendências 7 × 30 dias, ações vencidas, recorrências e itens a escalar (D-63)');
  await checarPalco(page, 'semana');
  await page.goto(URL + '#/apresentacao/2/indicadores'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const t = document.querySelector('.stage').textContent; return /Perda de produção D-1/.test(t) && /Pareto do mês por sistema/.test(t) && /Cota de queima de Búzios/.test(t) && /Reserva do campo/.test(t); }), 'detalhe de indicadores da COPROD: perda de produção por causa e sistema, Pareto do mês, cota e reserva do campo');
  await page.goto(URL + '#/apresentacao/2/queima'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const t = document.querySelector('.stage').textContent; return /Manobras previstas × reserva tática/.test(t) && /Cabem/.test(t) && /Gás queimado por equipamento indisponível/.test(t) && /TC-A/.test(t); }), 'detalhe da queima: manobras × reserva tática e custo da indisponibilidade por equipamento');
  await page.goto(URL + '#/apresentacao/3/indicadores'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const t = document.querySelector('.stage').textContent; return /Janela meteo-oceanográfica/.test(t) && /Dentro da janela/.test(t) && /Lastro e estabilidade/.test(t) && /Dentro dos limites/.test(t); }), 'detalhe de indicadores da COEMB: janela meteo-oceanográfica e estabilidade com limites');
  await page.goto(URL + '#/apresentacao/4/indicadores'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const t = document.querySelector('.stage').textContent; return /Aderência ao plano/.test(t) && /82/.test(t) && /Backlog crítico/.test(t); }), 'detalhe de indicadores da COMAN: aderência ao plano e backlog');
  /* D-63 (proposta 30): histórico pesquisável */
  await page.goto(URL + '#/arquivo'); await page.waitForTimeout(400);
  await page.fill('#aq-q', 'FGRU A'); await page.click('[data-act="aq-buscar"]'); await page.waitForTimeout(500);
  const hs = await page.evaluate(() => ({ n: UI.arqRes.length, antigos: UI.arqRes.filter(r => r.data < DIA).length, ordem: UI.arqRes.every((r, i, a) => !i || a[i - 1].data >= r.data), linhas: document.querySelectorAll('.arq-g tbody tr').length }));
  ok(hs.n >= 3 && hs.antigos >= 2 && hs.ordem && hs.linhas === hs.n, `busca no Arquivo: TAG encontrada em REDIAs anteriores, mais recentes primeiro (${JSON.stringify(hs)})`);
  await page.click('[data-act="aq-limpar"]'); await page.waitForTimeout(200);
  await page.goto(URL + '#/apresentacao/1'); await page.waitForTimeout(300);
  const eqAb = await page.evaluate(() => { const st = document.querySelector('.stage'); const card = t => [...st.querySelectorAll('.card')].find(c => c.querySelector('.hd')?.textContent.includes(t)); return { grupos: st.querySelectorAll('.w.eqg').length, bul: st.querySelectorAll('.w.eqg .eb').length, injA: st.querySelector('.eb[aria-label="Injection A: Indisponível"]')?.className, fgruC: !!st.querySelector('.eb.eq-mn[aria-label="FGRU C: Em manutenção"]'), lim: !!st.querySelector('.eb.eq-lm[aria-label="Principal B: Limitado"]'), sb: !!st.querySelector('.eb.eq-sb[aria-label="VRU B: Stand By"]'), leg: [...st.querySelectorAll('.lge .eb')].map(e => e.textContent).join('|'), gas: card('Injeção de gás')?.querySelectorAll('.eqg').length, agua: card('Injeção de água')?.querySelectorAll('.eqg').length }; });
  ok(eqAb.grupos === 9 && eqAb.bul === 23 && eqAb.gas === 4 && eqAb.agua === 2 && /\beq-in\b/.test(eqAb.injA || '') && eqAb.fgruC && eqAb.lim && eqAb.sb, `abertura: um bullet de status por equipamento nos cards de IUGA, injeção de gás e de água (${eqAb.bul} bullets)`);
  ok(eqAb.leg === 'Operando|Stand By|Em manutenção|Indisponível|Limitado', `abertura: legenda dos 5 status de disponibilidade (${eqAb.leg})`);

  // teclado e cronômetro
  await page.goto(URL + '#/apresentacao/1'); await page.waitForTimeout(200);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200);
  ok(page.url().endsWith('#/apresentacao/2'), 'seta → avança para o bloco 2');
  await page.keyboard.press(' '); await page.waitForTimeout(2300);
  const tmr = await page.textContent('[data-tmr]'); ok(/^04:5[6-8]$/.test(tmr), `cronômetro corre (${tmr})`);
  await page.keyboard.press(' ');
  /* D-66: +1 minuto (até 3 por tela, ícones ao lado do cronômetro), pulso vermelho após 1 min de estouro e tela de tempo esgotado após 2 min */
  const t66 = await page.evaluate(() => { UI.pres.restante = 100; atualizarTimer(); return UI.pres.extra; });
  for (let k = 0; k < 4; k++) { await page.evaluate(() => mostrarCtrl()); await page.click('#ctrl [data-act="mais1"]', { force: true }).catch(() => {}); }
  await page.keyboard.press('+');
  const m1 = await page.evaluate(() => ({ extra: UI.pres.extra, rest: UI.pres.restante, on: document.querySelectorAll('.stage [data-tx] i.on').length, tot: document.querySelectorAll('.stage [data-tx] i').length, dis: document.querySelector('#ctrl [data-act="mais1"]').disabled, txt: document.querySelector('.stage [data-tx]').textContent.trim() }));
  ok(t66 === 0 && m1.extra === 3 && m1.rest === 280 && m1.on === 3 && m1.tot === 3 && m1.dis && m1.txt === '', `+1 min: soma 1 minuto por clique, no máximo 3 na tela; ícones sem texto ao lado do cronômetro (${JSON.stringify(m1)})`);
  const p1 = await page.evaluate(() => { UI.pres.restante = -60; atualizarTimer(); const a = document.querySelector('[data-tmr]').classList.contains('pulso'); UI.pres.restante = -61; atualizarTimer(); const el = document.querySelector('[data-tmr]'); return { a, b: el.classList.contains('pulso'), anim: getComputedStyle(el).animationDuration, esg: document.querySelector('#esg').hidden }; });
  ok(!p1.a && p1.b && p1.anim === '1s' && p1.esg, `cronômetro pulsa em vermelho (1 s) só depois de 1 minuto além do tempo (${JSON.stringify(p1)})`);
  await page.evaluate(() => { UI.pres.restante = -121; atualizarTimer(); }); await page.waitForTimeout(400);
  const e1 = await page.evaluate(() => { const e = document.querySelector('#esg'), r = e.getBoundingClientRect(); return { vis: !e.hidden, full: r.width >= innerWidth && r.height >= innerHeight, bg: getComputedStyle(e).backgroundColor, h: e.querySelector('h1').textContent, t: e.querySelector('[data-esg-t]').textContent }; });
  ok(e1.vis && e1.full && e1.bg === 'rgb(255, 255, 255)' && e1.h === 'Tempo esgotado' && e1.t === '+02:01', `com 2 minutos além do tempo, tela branca de tempo esgotado (${JSON.stringify(e1)})`);
  await page.click('#esg [data-act="zera"]'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => document.querySelector('#esg').hidden && UI.pres.restante === CFG.timeboxMin * 60 && UI.pres.extra === 0 && !!document.querySelector('.stage .scr')), 'Zerar volta para as telas da reunião, com o cronômetro e os acréscimos zerados');
  await page.evaluate(() => { UI.pres.extra = 2; }); await page.goto(URL + '#/apresentacao/3'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => UI.pres.extra === 0 && document.querySelectorAll('.stage [data-tx] i.on').length === 0), 'cada tela começa sem acréscimos de 1 minuto');
  /* D-66: dica nos semáforos diferentes de OK e valores abaixo da meta em vermelho (gradiente) */
  await page.goto(URL + '#/apresentacao/1'); await page.waitForTimeout(300);
  const tp = await page.evaluate(() => { const nok = [...document.querySelectorAll('.stage .hd .b.nok')].find(x => /Não OK/.test(x.textContent)), okp = document.querySelector('.stage .hd .b.ok'); return { nok: nok?.dataset.tip || '', ok: okp?.hasAttribute('data-tip'), n: document.querySelectorAll('.stage [data-tip]').length }; });
  ok(/^Não OK\n/.test(tp.nok) && /meta/.test(tp.nok) && /Regra/.test(tp.nok) && tp.ok === false && tp.n >= 8, `semáforos fora de OK levam dica com os dados e a regra; OK não leva (${tp.n} dicas)`);
  await page.hover('.stage .card.col6 .hd .b.nok'); await page.waitForTimeout(250);
  const dc = await page.evaluate(() => { const d = document.querySelector('#dica'); return { vis: !d.hidden, cls: d.className, txt: d.textContent }; });
  ok(dc.vis && /s-nok/.test(dc.cls) && /Injeção de gás D-1/.test(dc.txt) && /% da meta/.test(dc.txt), `ao parar o mouse, a dica explica o semáforo (${dc.txt.slice(0, 90)})`);
  await page.mouse.move(5, 5); await page.waitForTimeout(150);
  ok(await page.evaluate(() => document.querySelector('#dica').hidden), 'dica some ao tirar o mouse');
  const df = await page.evaluate(() => { const big = [...document.querySelectorAll('.stage .r2 .big')]; const cor = el => el.getAttribute('style') || ''; const g = big[2], o = big[0], iu = big[1]; const l = s => +(/hsl\([\d.]+,(\d+)%,(\d+)%\)/.exec(s) || [])[2]; return { gas: cor(g), oleo: cor(o), iu: cor(iu), lg: l(cor(g)), li: l(cor(iu)), spk: document.querySelectorAll('.stage .spk-def').length, verm: document.querySelectorAll('.stage .spk svg path[stroke^="url(#spk"]').length }; });
  ok(/hsl\(/.test(df.gas) && /hsl\(/.test(df.iu) && df.oleo === '' && df.lg < df.li && df.spk >= 2 && df.verm >= 2, `valores abaixo da meta em vermelho, mais forte quanto maior o déficit (gás 31% abaixo mais vivo que IUGA −0,65 p.p.); tendências com o trecho abaixo da meta em vermelho (${JSON.stringify(df)})`);

  /* ---- curadoria: aprovar a SDV ---- */
  await page.goto(URL + '#/curadoria/COPROD/sugestoes'); await page.waitForTimeout(200);
  const pend0 = await page.evaluate(() => pendentes(E, 'COPROD').length);
  await page.click('.it:has-text("SDV-1235818")'); await page.waitForTimeout(150);
  await page.check('input[name="f-sem"][value="at"]', { force: true });
  await page.fill('#f-ped', 'Apoio da automação da base');
  await page.click('[data-act="aprovar"]'); await page.waitForTimeout(200);
  const st1 = await page.evaluate(() => ({ pend: pendentes(E, 'COPROD').length, ap: aprovados(E, 'COPROD').length }));
  ok(st1.pend === pend0 - 1 && st1.ap === 1, `aprovação registrada (pendentes ${pend0}→${st1.pend}, aprovados ${st1.ap})`);
  // menu da curadoria: dados automáticos, sugestões, destaques da coordenação
  const menu = await page.$$eval('.side > a', as => as.slice(0, 3).map(a => a.textContent.replace(/\d+/g, '').trim()));
  ok(menu.join('|') === 'Dados automáticos|Sugestões|Destaques da coordenação', `ordem do menu da curadoria (${menu.join(' · ')})`);
  await page.goto(URL + '#/curadoria/COMAN'); await page.waitForTimeout(150);
  ok(await page.$('[data-campo]') !== null, 'curadoria abre em Dados automáticos');
  // aprovar com indicação para a abertura
  await page.goto(URL + '#/curadoria/COPROD/sugestoes'); await page.waitForTimeout(150);
  await page.click('.it:has-text("BUZ-095 reaberto")'); await page.waitForTimeout(150);
  await page.check('#f-ab'); await page.click('[data-act="aprovar"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => destaquesAbertura(E, 'COPROD').some(d => /BUZ-095/.test(d.titulo)) && destaquesDe(E, 'COPROD').some(d => /SDV-1235818/.test(d.titulo) && !d.abertura)), 'aprovado vai ao bloco; "muito importante" vai também à abertura');
  // destaque criado pelo coordenador
  await page.goto(URL + '#/curadoria/COMAN/destaques'); await page.waitForTimeout(150);
  await page.fill('#d-tit', 'Retorno da eletrocloradora de vante previsto para amanhã'); await page.fill('#d-tag', 'UE-5121501'); await page.check('input[name="d-sem"][value="ok"]', { force: true });
  await page.click('[data-act="salvar-dst"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => destaquesDe(E, 'COMAN').some(d => d.fonte === 'C' && /eletrocloradora/.test(d.titulo) && !d.abertura)), 'destaque criado pelo coordenador entra no bloco');
  await page.check('[data-ab]:not([data-ab=""]) >> nth=-1'); await page.waitForTimeout(200);
  const coman = await page.evaluate(() => destaquesAbertura(E, 'COMAN').map(d => d.titulo));
  ok(coman.some(t => /eletrocloradora/.test(t)), 'indicação para a abertura pela tabela de destaques');
  await page.click('[data-edt]'); await page.waitForTimeout(150); await page.fill('#d-ped', 'Envio do transformador reserva'); await page.click('[data-act="salvar-dst"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => destaquesDe(E, 'COMAN').find(d => d.fonte === 'C').pedido) === 'Envio do transformador reserva', 'editar destaque da coordenação');
  await page.goto(URL + '#/apresentacao/1'); await page.waitForTimeout(250);
  const ab = await page.textContent('.stage');
  ok(/BUZ-095 reaberto/.test(ab) && /eletrocloradora de vante previsto/.test(ab) && /Janela do offloading/.test(ab) && !/SDV-1235818/.test(ab), 'tela de abertura mostra só os destaques indicados');
  ok(await page.$('.stage img.marca-img') !== null, 'marca oficial no cabeçalho');
  await page.evaluate(() => document.querySelector('#ctrl')?.classList.add('hide')); await checarPalco(page, '1 (com destaques na abertura)'); await page.screenshot({ path: path.join(OUT, 'pres_1_destaques.png') });
  await page.goto(URL + '#/apresentacao/4'); await page.waitForTimeout(250);
  ok(/eletrocloradora de vante previsto/.test(await page.textContent('.stage')), 'destaque da coordenação aparece no bloco COMAN');
  await page.goto(URL + '#/curadoria/COMAN/destaques'); await page.waitForTimeout(150); await page.screenshot({ path: path.join(OUT, 'destaques.png'), fullPage: true });
  // recusar sem motivo e com motivo (COEMB)
  await page.goto(URL + '#/curadoria/COEMB/sugestoes'); await page.waitForTimeout(150);
  await page.click('[data-act="recusar"]'); await page.waitForTimeout(100);
  ok(await page.evaluate(() => E.sugestoes.filter(s => s.payload.coord === 'COEMB' && s.decisao).length) === 0, 'recusa exige motivo');
  await page.fill('#f-mot', 'Já tratado em demanda'); await page.click('[data-act="recusar"]'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => E.sugestoes.some(s => s.payload.coord === 'COEMB' && s.decisao?.payload.acao === 'recusar')), 'recusa com motivo registrada');
  // comentário da base
  await page.goto(URL + '#/curadoria/COMAN/sugestoes'); await page.waitForTimeout(150);
  await page.fill('#com', 'Contratada embarca amanhã'); await page.click('[data-act="comentar"]'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => Object.values(E.comentarios).flat().length) === 1, 'comentário registrado');
  // simular sugestão
  await page.goto(URL + '#/curadoria/COPROD/sugestoes'); await page.waitForTimeout(150);
  await page.click('[data-act="nova"]'); await page.fill('#n-tit', 'Teste de sugestão simulada'); await page.click('[data-act="criar-sug"]'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => E.sugestoes.some(s => s.payload.titulo === 'Teste de sugestão simulada')), 'sugestão simulada entra na fila');

  /* ---- dados automáticos: correção manual e restauração ---- */
  await page.goto(URL + '#/curadoria/COPROD/dados'); await page.waitForTimeout(200);
  await page.fill('[data-campo="oleo.real"]', '25000'); await page.press('[data-campo="oleo.real"]', 'Tab'); await page.waitForTimeout(250);
  let v = await page.evaluate(() => E.valores['oleo.real']); ok(v.valor === 25000 && v.origem === 'M', `correção manual (valor ${v.valor}, origem ${v.origem})`);
  await page.click('[data-rest="oleo.real"]'); await page.waitForTimeout(200);
  v = await page.evaluate(() => E.valores['oleo.real']); ok(v.valor === 26925 && v.origem === 'A', 'restaurar automático');
  // lista: adicionar poço (aba de preenchimento manual)
  await page.goto(URL + '#/curadoria/COPROD/m-pocos'); await page.waitForTimeout(200);
  await page.click('[data-lista="pocos"] [data-add]');
  const rows = await page.$$('[data-lista="pocos"] tbody tr'); const last = rows[rows.length - 1];
  await (await last.$('[data-k="poco"]')).fill('BUZ-201'); await (await last.$('[data-k="tipo"]')).selectOption('produtor'); await (await last.$('[data-k="status"]')).selectOption('fechado');
  await page.click('[data-lista="pocos"] [data-salvar]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => L(E, 'pocos').some(p => p.poco === 'BUZ-201')), 'lista de poços gravada');
  // trens: A até 5, B até 5, teste 1
  const nA0 = await page.evaluate(() => L(E, 'pocos').filter(p => p.trem === 'A').length);
  for (const pc of ['BUZ-088', 'BUZ-112', 'BUZ-130']) { const tr = await page.$(`[data-lista="pocos"] tbody tr:has(input[data-k="poco"][value="${pc}"])`); await (await tr.$('[data-k="trem"]')).selectOption('A'); }
  await page.click('[data-lista="pocos"] [data-salvar]'); await page.waitForTimeout(200);
  ok(await page.evaluate(n => L(E, 'pocos').filter(p => p.trem === 'A').length === n && !!document.querySelector('.toast.erro'), nA0), 'trem A recusa o 6º poço (limite de 5)');
  ok(await page.evaluate(() => validarTrens([{ poco: 'X', tipo: 'produtor', trem: 'Teste' }, { poco: 'Y', tipo: 'produtor', trem: 'Teste' }]) !== null && validarTrens([{ poco: 'Z', tipo: 'inj_agua', trem: 'A' }]) !== null), 'trem de teste aceita 1 poço; injetor não entra em trem');
  // D-46: itens sem captura automática em abas de preenchimento manual; Dados automáticos fica só com o automático
  await page.goto(URL + '#/curadoria/COPROD/dados'); await page.waitForTimeout(200);
  ok(await page.$('[data-campo="queima.acum_mes"]') && await page.$('[data-campo="gas.prod_d1"]') && !(await page.$('[data-campo="teste.proximo"]')) && !(await page.$('[data-lista="cilindros"]')) && !(await page.$('[data-lista="pocos"]')) && !(await page.$('[data-lista="pfceo.COPROD"]')), 'Dados automáticos sem os itens manuais');
  const menuMan = await page.evaluate(() => { const h = [...document.querySelectorAll('.side h4')].find(x => /Preenchimento manual/.test(x.textContent)); const out = []; let n = h?.nextElementSibling; while (n && n.tagName === 'A') { out.push(n.textContent.trim()); n = n.nextElementSibling; } return out; });
  ok(menuMan.join('|') === 'Poços e testes de vazão|Operações em poços|Cilindros de amostra', `menu da COPROD: grupo Preenchimento manual (${menuMan.join(' · ')})`);
  const abasMan = { GEPLAT: [['m-situacao', 'geplat.situacao']], COPROD: [['m-pocos', 'teste.proximo', 'pocos'], ['m-operacoes', null, 'pocos.operacoes'], ['m-cilindros', null, 'cilindros']], COEMB: [['m-navio', 'off.navio'], ['m-tanques', null, 'tq.atencao']], COMAN: [['m-manutencao', 'man.notas_if6', 'man.ind'], ['m-legais', null, 'legais']] };
  let abasOk = [];
  for (const [c, lst] of Object.entries(abasMan)) for (const [id, campo, lista] of lst) {
    await page.goto(URL + `#/curadoria/${c}/${id}`); await page.waitForTimeout(120);
    const okA = (!campo || !!(await page.$(`[data-campo="${campo}"]`))) && (!lista || !!(await page.$(`[data-lista="${lista}"]`))) && !!(await page.$('.ed a[href^="#/apresentacao"]')) && !!(await page.$(`.side a.on[href="#/curadoria/${c}/${id}"]`));
    if (!okA) abasOk.push(c + '/' + id);
  }
  ok(!abasOk.length, `abas de preenchimento manual abrem com seus campos e o link para a apresentação ${abasOk.join(',')}`);
  await page.goto(URL + '#/curadoria/COPROD/m-pocos'); await page.waitForTimeout(150);
  await page.fill('[data-campo="teste.proximo"]', 'BUZ-088'); await page.click('[data-grupo="Poços e testes"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => V(E, 'teste.proximo') === 'BUZ-088' && E.valores['teste.proximo'].origem === 'M'), 'gravar o próximo teste pela aba manual');
  await page.evaluate(async () => { await registrar('valor', { campo: 'teste.proximo', valor: 'BUZ-112', origem: 'M' }); atualizarEstado(); });

  /* ---- PFCEO na curadoria: piores primeiro e seleção leva o card para a tela ---- */
  await page.goto(URL + '#/curadoria/COPROD/pfceo'); await page.waitForTimeout(200);
  const ordemPf = await page.evaluate(() => pfceoDe(E, 'COPROD').map(i => PF_DISP.indexOf(i.disponibilidade)));
  ok(ordemPf.every((v, i) => i === 0 || ordemPf[i - 1] <= v), `PFCEO em ordem de disponibilidade, piores primeiro (${ordemPf.join(',')})`);
  ok(await page.evaluate(() => [...document.querySelectorAll('.side a')].map(a => a.textContent.replace(/\d+$/, '').trim()).indexOf('Equipamentos e Sistemas · PFCEO') === 3), 'menu da curadoria: PFCEO depois de Destaques da coordenação');
  await page.screenshot({ path: path.join(OUT, 'curadoria_pfceo.png'), fullPage: true });
  /* D-54: captura do PFCEO, lista rankeada, desvios aprovados automaticamente, normais só se incluídos, até 2 na abertura */
  await page.evaluate(() => { Captura.rapida = true; });
  await page.click('[data-capturar="COPROD|lista:pfceo.COPROD"]'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => { const r = UI.captura['COPROD|lista:pfceo.COPROD']; return r && r.passos.some(p => /PFCEO/.test(p.txt)) && r.faltando.length === 0 && !!document.querySelector('[data-capt="COPROD|lista:pfceo.COPROD"] .banner.ok'); }), 'PFCEO: botão Capturar dados importa os sistemas, com progresso e resultado');
  ok(await page.evaluate(() => { const ks = [...document.querySelectorAll('.pfk')].map(x => x.dataset.pfk), ord = pfceoDe(E, 'COPROD').map(PF.chave); return ks.length === ord.length && ks.every((k, i) => k === ord[i]) && document.querySelectorAll('.pf-resumo > div').length === 5; }), 'PFCEO: cards numa lista única, do pior estado ao normal, com contagem por situação');
  await page.goto(URL + '#/curadoria/COMAN/pfceo'); await page.waitForTimeout(200);
  const pfC = await page.evaluate(() => { const s = pfceoSelecao(E, 'COMAN'); return { sug: s.sugerida, n: s.itens.length, desv: s.todos.filter(PF.desvio).length, seg: s.seguranca.length, segNormalNaTela: s.itens.filter(i => PF.seguranca(i) && !PF.desvio(i)).length, primeiro: PF.seguranca(s.itens[0]), normalFora: !s.itens.some(i => i.funcao === 'Geração principal'), ab: s.abertura.length }; });
  ok(pfC.sug && pfC.n === 11 && pfC.desv === 8 && pfC.seg === 4 && pfC.segNormalNaTela === 3 && pfC.primeiro && pfC.normalFora && pfC.ab === 0, `PFCEO: desvios já aprovados para a tela, sistemas de segurança sempre na tela e primeiro (D-61), normal fica fora (${JSON.stringify(pfC)})`);
  ok(await page.$('.pfk:has-text("Sistema instrumentado") [data-pft]') === null && await page.$('.pfk:has-text("Sistema instrumentado") .chip') !== null, 'PFCEO: sistema de segurança não tem botão de retirar da tela');
  await page.click('.pfk:has-text("Geração principal") [data-pft]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => pfceoSelecao(E, 'COMAN').itens.some(i => i.funcao === 'Geração principal')), 'PFCEO: o coordenador pode incluir um sistema normal na tela');
  await page.click('.pfk:has-text("Ar comprimido") [data-pft]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !pfceoSelecao(E, 'COMAN').itens.some(i => i.funcao === 'Ar comprimido') && pfceoSelecao(E, 'COMAN').itens.length === 11), 'PFCEO: e retirar um sistema com desvio');
  await page.check('.pfk:has-text("Tratamento de efluentes") [data-pfab]'); await page.waitForTimeout(200);
  await page.check('.pfk:has-text("HVAC · AC-5252003A") [data-pfab]'); await page.waitForTimeout(200);
  await page.click('.pfk:has-text("Eletrocloração") [data-pfab]'); await page.waitForTimeout(200);
  const abC = await page.evaluate(() => pfceoSelecao(E, 'COMAN').abertura.map(i => i.funcao));
  ok(abC.length === 2 && abC.includes('Tratamento de efluentes') && !(await page.isChecked('.pfk:has-text("Eletrocloração") [data-pfab]')), `PFCEO: no máximo 2 por coordenação na abertura do GEPLAT (${abC.join(', ')})`);
  await page.goto(URL + '#/apresentacao/1'); await page.waitForTimeout(250);
  ok(await page.evaluate(() => { const c = [...document.querySelectorAll('.stage .card')].find(x => /Destaques e ameaças/.test(x.textContent)); return c && /PFCEO\s*Tratamento de efluentes/.test(c.textContent) && /PFCEO\s*HVAC/.test(c.textContent); }), 'abertura do GEPLAT mostra os sistemas do PFCEO destacados pela coordenação');
  await page.goto(URL + '#/apresentacao/4'); await page.waitForTimeout(200);
  ok(/Geração principal/.test(await page.textContent('.stage .pfc')) || /Geração principal/.test(await page.evaluate(() => pfceoSelecao(E, 'COMAN').itens.map(i => i.funcao).join())), 'tela da COMAN recebe o sistema normal incluído');
  /* D-54: Serviços do dia · captura das PTs planejadas no APLAT */
  await page.goto(URL + '#/curadoria/COPROD/servicos'); await page.waitForTimeout(200);
  const nSv0 = await page.evaluate(() => E.servicos.filter(s => s.payload.coord === 'COPROD').length);
  await page.click('[data-capturar="COPROD|lista:servicos.COPROD"]'); await page.waitForTimeout(600);
  const sv1 = await page.evaluate(() => { const l = E.servicos.filter(s => s.payload.coord === 'COPROD'); const nova = l.find(s => s.payload.titulo === 'Limpeza do filtro de água de injeção'); return { n: l.length, nova: nova && nova.payload.origem, fonte: nova?.payload.fonte, dup: l.length !== new Set(l.map(s => s.payload.titulo)).size, banner: !!document.querySelector('[data-capt="COPROD|lista:servicos.COPROD"] .banner.ok') }; });
  ok(sv1.n === nSv0 + 1 && sv1.nova === 'PT' && /APLAT/.test(sv1.fonte) && !sv1.dup && sv1.banner, `Serviços: Capturar dados traz as PTs planejadas do APLAT sem repetir as já listadas (${JSON.stringify(sv1)})`);
  await page.click('tr:has-text("Limpeza do filtro de água de injeção") [data-rm]'); await page.waitForTimeout(200);
  await page.click('[data-capturar="COPROD|lista:servicos.COPROD"]'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => !E.servicos.some(s => s.payload.titulo === 'Limpeza do filtro de água de injeção') && UI.captura['COPROD|lista:servicos.COPROD'].mantidosOcultos === 1), 'Serviços: PT ocultada pelo coordenador não volta na próxima captura');

  /* ---- serviços: limite de 4 na abertura ---- */
  await page.goto(URL + '#/curadoria/COPROD/servicos'); await page.waitForTimeout(150);
  for (const t of ['Atividade extra 1', 'Atividade extra 2', 'Atividade extra 3']) { await page.fill('#s-tit', t); await page.check('#s-ab'); await page.click('[data-act="add-srv"]'); await page.waitForTimeout(150); }
  const nAb = await page.evaluate(() => atividadesAbertura(E, 'COPROD').length);
  ok(nAb === 4, `máximo de 4 atividades na abertura respeitado (${nAb})`);
  await page.click('[data-down]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => E.servicos.filter(s => s.payload.coord === 'COPROD')[0].payload.titulo) === 'Verificação dos PSLL-1210712 e 1210716', 'reordenar serviço');

  /* ---- itens e demandas ---- */
  await page.goto(URL + '#/curadoria/COPROD/itens'); await page.waitForTimeout(150);
  await page.selectOption('#i-tipo', 'oportunidade'); await page.fill('#i-txt', 'Retorno da FGRU A reduz a queima'); await page.selectOption('#i-sem', 'ok'); await page.click('[data-act="add-item"]'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => itensDe(E, 'COPROD', 'oportunidade').length) === 1, 'oportunidade incluída');
  await page.goto(URL + '#/curadoria/GEPLAT/itens'); await page.waitForTimeout(150);
  await page.selectOption('#i-txt', 'Saúde'); await page.fill('#i-det', 'Campanha de vacinação a bordo'); await page.click('[data-act="add-item"]'); await page.waitForTimeout(150);
  /* D-61 (proposta 5): pauta extra com dono, prazo e ação → item do Canal Base x Bordo */
  const nDemAntes = await page.evaluate(() => E.demandas.length);
  await page.selectOption('#i-txt', 'Conformidade'); await page.fill('#i-det', 'Auditoria interna na semana que vem'); await page.fill('#i-dono', '4º GEPLAT'); await page.fill('#i-prazo', '2026-10-14');
  await page.fill('#i-acao', 'Enviar a lista de evidências da auditoria'); await page.click('#i-esc'); await page.click('[data-act="add-item"]'); await page.waitForTimeout(250);
  const pe5 = await page.evaluate(n => { const i = itensDe(E, 'GEPLAT', 'pauta_extra').find(x => x.payload.texto === 'Conformidade'), d = E.demandas.find(x => x.payload.pautaExtra === 'Conformidade'); return { dono: i?.payload.dono, prazo: i?.payload.prazo, esc: i?.payload.escalar, lig: i?.payload.demandaId === d?.id, dem: E.demandas.length - n, resp: d?.payload.responsavel, coord: d?.payload.coord, origem: d?.payload.origem }; }, nDemAntes);
  ok(pe5.dono === '4º GEPLAT' && pe5.prazo === '2026-10-14' && pe5.esc && pe5.lig && pe5.dem === 1 && pe5.resp === '4º GEPLAT' && pe5.coord === 'GEPLAT' && pe5.origem === 'C', `pauta extra com dono e prazo gera demanda no Canal Base x Bordo (${JSON.stringify(pe5)})`);
  await page.goto(URL + '#/apresentacao/1'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const t = document.querySelector('.stage .card.col2').textContent; return /4º GEPLAT · até \d\d\/\d\d/.test(t) && /Habitabilidade/.test(t); }), 'abertura: pauta extra mostra dono e prazo');
  /* D-64: destaque registrado também como ameaça (vai para a linha Ameaça da abertura) */
  await page.goto(URL + '#/curadoria/COEMB/destaques'); await page.waitForTimeout(150);
  const amAntes = await page.evaluate(() => itensDe(E, 'COEMB', 'ameaca').length);
  await page.fill('#d-tit', 'Falha SG-1223001A'); await page.click('input[name="d-sem"][value="ok"]'); await page.click('#d-am'); await page.click('[data-act="salvar-dst"]'); await page.waitForTimeout(300);
  const am64 = await page.evaluate(n => { const a = itensDe(E, 'COEMB', 'ameaca'); return { n: a.length - n, txt: a.at(-1)?.payload.texto, sem: a.at(-1)?.payload.semaforo, dst: destaquesDe(E, 'COEMB').some(d => d.titulo === 'Falha SG-1223001A'), nota: /Destaque não é ameaça/.test(document.querySelector('.ed').textContent) }; }, amAntes);
  ok(am64.n === 1 && am64.txt === 'Falha SG-1223001A' && am64.sem === 'at' && am64.dst && am64.nota, `destaque com "Registrar também como ameaça" cria o destaque e a ameaça (semáforo OK vira Atenção) (${JSON.stringify(am64)})`);
  ok(await page.evaluate(() => CFG.ativo === 'ATP-BUZ III' && mesclarCfg({ ativo: 'ATP-BUZ' }).ativo === 'ATP-BUZ III' && CAMPO['iuga.atp'].rot === 'IUGA do ATP-BUZ III'), 'nome do ativo: ATP-BUZ III no padrão, nos rótulos e nas configurações salvas com o nome antigo (D-64)');
  /* D-61 (proposta 7): selo "Escalar" no destaque e ordem (escalar primeiro) */
  await page.goto(URL + '#/curadoria/COPROD/destaques'); await page.waitForTimeout(150);
  await page.fill('#d-tit', 'Partida da Injection A depende de liberação da gerência'); await page.click('#d-esc'); await page.click('[data-act="salvar-dst"]'); await page.waitForTimeout(200);
  const esc7 = await page.evaluate(() => { const ds = destaquesDe(E, 'COPROD'); return { primeiro: ds[0]?.escalar === true && /liberação da gerência/.test(ds[0].titulo), n: escalados(E).length, chip: !!document.querySelector('.chip.esc') }; });
  ok(esc7.primeiro && esc7.n >= 2 && esc7.chip, `destaque marcado "Escalar" sobe para o topo e aparece na curadoria (${JSON.stringify(esc7)})`);
  await page.goto(URL + '#/apresentacao/2'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const d = document.querySelector('.stage .dq.esc'); return !!d && /Escalar/.test(d.textContent) && /liberação da gerência/.test(d.textContent); }), 'bloco COPROD: selo Escalar no destaque');
  await page.goto(URL + '#/apresentacao/5'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const t = document.querySelector('.stage').textContent; return /Decisões tomadas nesta REDIA/.test(t) && /a escalar/.test(t) && /Tempo por bloco/.test(t) && /Aprendizados do dia/.test(t) && /fechadas no prazo no mês/.test(t); }), 'fechamento: decisões, itens a escalar, tempo por bloco, aprendizados e taxa no prazo (D-61)');
  await checarPalco(page, '5 (com escalar)');
  await page.goto(URL + '#/curadoria/GEPLAT/aceite'); await page.waitForTimeout(150); await page.click('[data-act="aceite"]'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => E.aceites.length) === 1, 'aceite do GEPLAT registrado');

  /* ---- fechamento: congelar, apresentar, demandas, reabrir, ata ---- */
  // conclusão do preenchimento e congelamento pela tela Início
  await page.goto(URL + '#/inicio'); await page.waitForTimeout(150);
  await page.click('[data-act="congelar-ini"]'); await page.waitForTimeout(200);
  ok(await page.$('.mdl') !== null && /COPROD/.test(await page.textContent('.mdl')), 'congelar sem conclusões abre aviso com as coordenações pendentes');
  await page.screenshot({ path: path.join(OUT, 'congelar_aviso.png') });
  await page.click('[data-mdl="notificar"]'); await page.waitForTimeout(250);
  ok(await page.evaluate(() => !E.congelamento && E.notificacoes.length === 4), 'notificar não congela e registra a notificação para cada coordenação');
  await page.goto(URL + '#/curadoria/COMAN/dados'); await page.waitForTimeout(150);
  ok(await page.$('.banner.nt') !== null, 'notificação aparece na curadoria da coordenação');
  ok(/COPROD/.test(await page.textContent('.apph .ntf')), 'usuário COPROD vê no cabeçalho o aviso da própria coordenação');
  await page.click('[data-act="concluir"]'); await page.waitForTimeout(200);
  ok(await page.$('.mdl') !== null, 'concluir com sugestões pendentes pede confirmação');
  await page.click('[data-mdl="ok"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !!concluida(E, 'COMAN') && notificacoesAbertas(E, 'COMAN').length === 0), 'COMAN conclui o preenchimento');
  await page.goto(URL + '#/curadoria/COPROD/dados'); await page.waitForTimeout(150);
  await page.click('[data-act="concluir"]'); await page.waitForTimeout(200);
  if (await page.$('.mdl')) { await page.click('[data-mdl="ok"]'); await page.waitForTimeout(200); }
  await page.screenshot({ path: path.join(OUT, 'curadoria_concluida.png') });
  await page.click('[data-act="concluir"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !concluida(E, 'COPROD')), 'reabrir preenchimento');
  await page.click('[data-act="concluir"]'); await page.waitForTimeout(200); if (await page.$('.mdl')) { await page.click('[data-mdl="ok"]'); await page.waitForTimeout(200); }
  for (const c of ['COEMB', 'GEPLAT']) { await page.goto(URL + '#/curadoria/' + c + '/dados'); await page.waitForTimeout(150); await page.click('[data-act="concluir"]'); await page.waitForTimeout(200); if (await page.$('.mdl')) { await page.click('[data-mdl="ok"]'); await page.waitForTimeout(200); } }
  ok(await page.evaluate(() => naoConcluidas(E).length) === 0, 'todas as coordenações concluíram');
  await page.goto(URL + '#/inicio'); await page.waitForTimeout(150); await page.screenshot({ path: path.join(OUT, 'inicio_concluido.png'), fullPage: true });
  await page.click('[data-act="congelar-ini"]'); await page.waitForTimeout(250);
  ok(await page.$('.mdl') === null && await page.evaluate(() => !!E.congelamento), 'com todas concluídas, congela sem aviso');
  await page.click('[data-act="descongelar"]'); await page.waitForTimeout(150);
  await page.click('[data-mdl="ok"]'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => !!E.congelamento), 'descongelar exige motivo');
  await page.click('[data-act="descongelar"]'); await page.waitForTimeout(150);
  await page.fill('[data-mdl-in="motivo"]', 'Ajuste de dado'); await page.click('[data-mdl="ok"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !E.congelamento), 'descongelar pela tela Início');
  await page.goto(URL + '#/ata'); await page.waitForTimeout(150);
  await page.click('[data-act="congelar"]'); await page.waitForTimeout(250);
  ok(await page.evaluate(() => !!E.congelamento), 'pauta congelada');
  ok(await page.evaluate(() => { const S = estadoApresentacao(2); return !!S.selecoes['pfceo:COPROD'] && pfceoSelecao(S, 'COPROD').itens.length === pfceoSelecao(E, 'COPROD').itens.length; }), 'pauta congelada guarda a seleção do PFCEO');
  await page.goto(URL + '#/curadoria/COPROD/sugestoes'); await page.waitForTimeout(150);
  ok(await page.$('[data-act="aprovar"]') === null, 'curadoria bloqueada após congelar');
  await page.goto(URL + '#/ata'); await page.waitForTimeout(150);
  for (const [t, c] of [['Apoio para o retorno da FGRU A e da Injection A', 'COPROD'], ['Contator, disjuntor e PSVs do AC-5252003A', 'COMAN']]) { await page.fill('#d-tit', t); await page.fill('#d-resp', '4º ' + c); await page.selectOption('#d-coord', c); await page.click('[data-act="add-dem"]'); await page.waitForTimeout(150); }
  ok(await page.evaluate(() => E.demandas.filter(d => d.payload.dataRedia === DIA).length) === 3, 'demandas registradas na reunião (2 + a ação da pauta extra)');
  await page.click('[data-dst]:has-text("Encerrar")'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => E.demandas.some(d => d.payload.status === 'encerrada')), 'demanda encerrada');
  for (let b = 1; b <= 5; b++) { await page.goto(URL + '#/apresentacao/' + b); await page.waitForTimeout(200); await page.evaluate(() => document.querySelector('#ctrl')?.classList.add('hide')); await checarPalco(page, b + ' (congelada)'); await page.screenshot({ path: path.join(OUT, `cong_${b}.png`) }); }
  await page.goto(URL + '#/imprimir'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => document.querySelectorAll('.printroot .stage').length === 5 && window.__printed >= 1), 'impressão da pauta com 5 páginas');
  /* D-61 (propostas 25 e 27): decisões e aprendizados registram com a pauta congelada; o cronômetro mede o tempo por bloco */
  await page.goto(URL + '#/apresentacao/1'); await page.waitForTimeout(200); await page.click('[data-act="tmr"]'); await page.waitForTimeout(150);
  await page.evaluate(() => { UI.pres.inicioMs -= 400000; UI.pres.restante = 300 - 400; });   // simula 6:40 de apresentação do bloco 1
  await page.goto(URL + '#/apresentacao/2'); await page.waitForTimeout(300);
  await page.evaluate(() => { UI.pres.inicioMs -= 120000; UI.pres.restante = 180; });   // bloco 2: 2:00
  await page.goto(URL + '#/ata'); await page.waitForTimeout(400);
  const tb27 = await page.evaluate(() => { const t = temposBlocos(E); return { medidos: t.medidos, b1: t.linhas[0].segundos, e1: t.linhas[0].estouro, b2: t.linhas[1].segundos, e2: t.linhas[1].estouro, cong: !!E.congelamento }; });
  ok(tb27.cong && tb27.medidos === 2 && tb27.b1 >= 400 && tb27.b1 <= 405 && tb27.e1 >= 100 && tb27.b2 >= 120 && tb27.b2 <= 125 && tb27.e2 === 0, `tempo por bloco medido pelo cronômetro e gravado com a pauta congelada (${JSON.stringify(tb27)})`);
  ok(/\+1:4\d/.test(await page.textContent('.wrap')) && /Abertura · GEPLAT/.test(await page.textContent('.wrap')), 'tela Fechamento e ata mostra o estouro do bloco 1');
  await page.fill('#dc-txt', 'Manter a Injection A parada até a liberação da base'); await page.fill('#dc-por', 'GEOP'); await page.selectOption('#dc-coord', 'COPROD'); await page.click('[data-act="add-decisao"]'); await page.waitForTimeout(200);
  await page.fill('#ap-txt', 'Confirmar a janela do navio antes de programar o offloading'); await page.click('[data-act="add-aprendizado"]'); await page.waitForTimeout(200);
  const r25 = await page.evaluate(() => ({ dec: reuniaoDe(E, 'decisao').map(d => [d.payload.texto, d.payload.por, d.payload.coord]), apz: reuniaoDe(E, 'aprendizado').length, cong: !!E.congelamento }));
  ok(r25.cong && r25.dec.length === 1 && r25.dec[0][1] === 'GEOP' && r25.dec[0][2] === 'COPROD' && r25.apz === 2, `decisão (com quem decidiu) e aprendizado registrados com a pauta congelada (${JSON.stringify(r25)})`);
  ok(await page.evaluate(() => { const t = taxaPrazo(E, DIA); return t.n >= 1 && t.pct != null && t.porCoord.length >= 1 && t.porSentido.length >= 1; }), 'taxa de ações fechadas no prazo calculada por coordenação e sentido (D-61)');
  /* D-67: de acordo de cada responsável antes de fechar a ata */
  await page.goto(URL + '#/ata'); await page.waitForTimeout(200);
  const ac0 = await page.evaluate(() => ({ resp: situacaoAcordos().map(x => x.coord + ':' + x.chave), dis: document.querySelector('[data-act="fechar-ata"]').disabled, botoes: document.querySelectorAll('[data-acordo]').length, txt: motivoAtaFechamento() }));
  ok(ac0.resp.join() === 'GEPLAT:CP01,COPROD:CP01,COEMB:CP01,COMAN:CP01' && ac0.dis && ac0.botoes === 4 && /Aguardando o de acordo de: GEPLAT/.test(ac0.txt), `ata: responsáveis = quem concluiu cada coordenação; fechamento travado até o de acordo de todos (${JSON.stringify(ac0)})`);
  ok(await page.evaluate(async () => { try { await registrar('ata', { participantes: [] }); return false; } catch (e) { return e.codigo === 'ATA_SEM_ACORDO'; } }), 'regra do servidor (demonstração): ata sem o de acordo é recusada (ATA_SEM_ACORDO)');
  for (let k = 0; k < 4; k++) { await page.click('[data-acordo]'); await page.waitForTimeout(200); }
  ok(await page.evaluate(() => situacaoAcordos().every(x => x.acordo) && !document.querySelector('[data-act="fechar-ata"]').disabled && podeFecharAta()), 'com o de acordo dos 4 responsáveis, o botão Fechar ata é liberado');
  const nAtas = await page.evaluate(() => E.atas.length);
  const [dlp] = await Promise.all([page.waitForEvent('download', { timeout: 90000 }).catch(() => null), page.click('[data-act="ver-ata"]')]);
  ok(!!dlp && /_previa\.pdf$/.test(dlp.suggestedFilename()) && await page.evaluate(n => E.atas.length === n, nAtas), 'prévia da ata em PDF baixa sem registrar a ata');
  await page.fill('#mot-re', 'Correção de valor'); await page.click('[data-act="reabrir-pauta"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !E.congelamento), 'pauta reaberta com motivo');
  ok(await page.evaluate(() => situacaoAcordos().every(x => x.pendente) && !podeFecharAta()), 'reabrir a pauta invalida os de acordo anteriores');
  await page.screenshot({ path: path.join(OUT, 'ata_tela.png'), fullPage: true });
  await page.goto(URL + '#/curadoria/COPROD/sugestoes'); await page.waitForTimeout(150); await page.screenshot({ path: path.join(OUT, 'curadoria.png'), fullPage: true });
  await page.goto(URL + '#/curadoria/COPROD/dados'); await page.waitForTimeout(150); await page.screenshot({ path: path.join(OUT, 'dados.png') });
  await page.goto(URL + '#/config'); await page.waitForTimeout(150); await page.fill('#c-tb', '6');
  /* D-61 (propostas 24 e 13): metas de manutenção e limites das análises configuráveis por UEP */
  await page.fill('#mm-tab tr:has([data-mm-k][value="ICPMe"]) [data-mm-v]', '92'); await page.fill('[data-ll="lab.COPROD.bsw_oleo"][data-ll-k="max"]', '0.2'); await page.fill('[data-ll="lab.COPROD.h2s_gas"][data-ll-k="max"]', '10');
  await page.click('[data-act="salvar-cfg"]'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => CFG.timeboxMin) === 6, 'configuração salva');
  const cfg24 = await page.evaluate(() => { const ind = L(E, 'man.ind').find(i => i.ind === 'ICPMe'); const lab = labDe(E, 'COPROD'); return { meta: metaManutencao(ind), sem: Regras.manutencao(+ind.valor, metaManutencao(ind)), bsw: lab.find(a => a.k === 'bsw_oleo').sem, h2s: lab.find(a => a.k === 'h2s_gas').sem, h2sTxt: lab.find(a => a.k === 'h2s_gas').limTxt, so4: lab.find(a => a.k === 'so4_urs').sem }; });
  ok(cfg24.meta === 92 && cfg24.sem === 'nok' && cfg24.bsw === 'nok' && cfg24.h2s === 'ok' && cfg24.h2sTxt === '≤ 10' && cfg24.so4 === 'ok', `metas de manutenção e limites das análises vêm da configuração da UEP, com semáforo por faixa (${JSON.stringify(cfg24)})`);
  await page.goto(URL + '#/apresentacao/2'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => !!document.querySelector('.stage .an.an-nok') && /BSW do óleo tratado/.test(document.querySelector('.stage .an.an-nok').textContent)), 'card de análises destaca o resultado fora da especificação');
  /* D-65: enquadramento por corrente na abertura (BSW fora → óleo Desenquadrado) */
  await page.goto(URL + '#/apresentacao/1'); await page.waitForTimeout(300);
  const enq1 = await page.evaluate(() => ({ oleo: enquadramento(E, 'oleo').sem, gas: enquadramento(E, 'gas').sem, agua: enquadramento(E, 'agua').sem, el: [...document.querySelectorAll('.stage [data-enq]')].map(e => e.dataset.enq), txt: document.querySelector('.stage [data-enq^="oleo"]')?.textContent || '', tit: (e => e ? e.dataset.tip || e.title : '')(document.querySelector('.stage [data-enq^="oleo"]')) }));
  ok(enq1.oleo === 'nok' && enq1.gas === 'ok' && enq1.agua === 'ok' && enq1.el.join() === 'oleo:nok,gas:ok,agua:ok' && /Desenquadrado/.test(enq1.txt) && /BSW/.test(enq1.txt) && /fora da especificação/.test(enq1.tit), `abertura: enquadramento por corrente; BSW acima do limite deixa o óleo Desenquadrado, com o parâmetro e o motivo (${JSON.stringify(enq1)})`);
  await page.goto(URL + '#/config'); await page.waitForTimeout(150); await page.fill('[data-ll="lab.COPROD.bsw_oleo"][data-ll-k="max"]', '1'); await page.click('[data-act="salvar-cfg"]'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => enquadramento(E, 'oleo').sem === 'ok' && enquadramento(E, 'oleo').rot === 'Enquadrado'), 'com o BSW dentro do limite, o óleo volta a Enquadrado');
  /* D-65: incluir análise, tirar da tela, excluir e reincluir */
  await page.selectOption('#na-coord', 'COPROD'); await page.fill('#na-rot', 'Ferro na água de injeção'); await page.fill('#na-un', 'ppm'); await page.fill('#na-max', '0.5'); await page.selectOption('#na-cor', 'agua'); await page.click('#na-tela');
  await page.click('[data-act="lab-add"]'); await page.waitForTimeout(250);
  await page.uncheck('[data-lt="lab.COPROD.tog_agua"]'); await page.click('[data-lab-rm="lab.COEMB.agua_diesel"]'); await page.waitForTimeout(250);
  await page.click('[data-act="salvar-cfg"]'); await page.waitForTimeout(250);
  const nv = await page.evaluate(() => { const a = labLista('COPROD').find(x => /Ferro/.test(x.rot)); return { k: a?.k, id: a && `lab.COPROD.${a.k}`, campo: !!(a && CAMPO[`lab.COPROD.${a.k}`]), corr: a && labOpc(`lab.COPROD.${a.k}`).corrente, tela: a && labOpc(`lab.COPROD.${a.k}`).tela, tog: labOpc('lab.COPROD.tog_agua').tela, coemb: labLista('COEMB').some(x => x.k === 'agua_diesel'), rem: CFG.labRemovidas, agua: enquadramento(E, 'agua').sem }; });
  ok(nv.campo && nv.corr === 'agua' && nv.tela === false && nv.tog === false && !nv.coemb && nv.rem.includes('lab.COEMB.agua_diesel') && nv.agua === 'at', `Configuração: análise incluída (campo criado, enquadramento da água, fora da tela; sem resultado → água em Atenção), TOG fora da tela e água no diesel excluída (${JSON.stringify(nv)})`);
  await page.goto(URL + '#/curadoria/COPROD/dados'); await page.waitForTimeout(250);
  ok(await page.evaluate(id => !!document.getElementById('cp-' + id) && !document.getElementById('cp-lab.COEMB.agua_diesel'), nv.id), 'Dados automáticos: a análise incluída ganha campo para o resultado');
  await page.fill('#cp-' + nv.id.replace(/\./g, '\\.'), '0.2'); await page.press('#cp-' + nv.id.replace(/\./g, '\\.'), 'Tab'); await page.waitForTimeout(150);
  await page.fill('#cp-' + nv.id.replace(/\./g, '\\.') + '\\.data', '2026-10-09'); await page.press('#cp-' + nv.id.replace(/\./g, '\\.') + '\\.data', 'Tab'); await page.waitForTimeout(250);
  ok(await page.evaluate(() => enquadramento(E, 'agua').sem === 'ok'), 'com o resultado da análise incluída dentro do limite, a água injetada volta a Enquadrado');
  await page.goto(URL + '#/apresentacao/2'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => { const t = [...document.querySelectorAll('.stage .an .t1')].map(x => x.textContent).join('|'); return !/TOG da água produzida/.test(t) && !/Ferro/.test(t) && /BSW do óleo tratado/.test(t); }), 'card Resultados de Análises mostra só as análises marcadas "na tela"');
  await page.goto(URL + '#/apresentacao/3'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => !/Água no óleo diesel/.test(document.querySelector('.stage').textContent)), 'análise excluída sai da tela da coordenação');
  await page.goto(URL + '#/config'); await page.waitForTimeout(200); await page.click('[data-lab-re="lab.COEMB.agua_diesel"]'); await page.waitForTimeout(200); await page.check('[data-lt="lab.COPROD.tog_agua"]'); await page.click('[data-lab-rm="' + nv.id + '"]'); await page.waitForTimeout(200); await page.click('[data-act="salvar-cfg"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => labLista('COEMB').some(x => x.k === 'agua_diesel') && labOpc('lab.COPROD.tog_agua').tela && !labLista('COPROD').some(x => /Ferro/.test(x.rot))), 'reincluir a análise da lista-base, voltar à tela e excluir a análise incluída');
  /* D-65: histórico de 15 dias e Arquivo */
  const hst = await page.evaluate(() => { const dias = new Set(), atas = []; for (const r of Store.cache.values()) { if (r.payload?.historico) dias.add(r.data); if (r.tipo === 'ata' && r.payload.historico) atas.push(r.data); } return { dias: dias.size, atas: atas.length, min: [...dias].sort()[0] }; });
  ok(hst.atas === 15 && hst.min === '2026-09-24', `histórico de 15 dias gravado com o exemplo (REDIAs encerradas de 24/09 a 08/10) (${JSON.stringify(hst)})`);
  await page.goto(URL + '#/arquivo'); await page.waitForTimeout(500);
  const arq = await page.evaluate(() => ({ linhas: document.querySelectorAll('table.arq tbody tr').length, pdf: document.querySelectorAll('table.arq [data-arq-pdf]').length, so: [...document.querySelectorAll('table.arq tbody tr')].every(tr => /REDIA-P83-\d{8}/.test(tr.textContent)), busca: !!document.querySelector('#aq-q'), menuHist: !!document.querySelector('.apph nav a[href="#/historico"]') }));
  ok(arq.linhas === 15 && arq.pdf === 15 && arq.so && arq.busca && !arq.menuHist, `Arquivo: só as atas fechadas, com o código da REDIA e o PDF; busca no topo; sem a tela Histórico (${JSON.stringify(arq)})`);
  const [dlA] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }).catch(() => null), page.click('[data-arq-pdf="2026-10-08"]')]);
  await page.waitForTimeout(500);
  ok(!!dlA && /ata_REDIA-P83-08102026\.pdf/.test(dlA.suggestedFilename()) && await page.evaluate(() => DIA === '2026-10-09'), `Arquivo: Baixar PDF da ata arquivada e volta ao dia aberto (${dlA && dlA.suggestedFilename()})`);
  await page.fill('#aq-q', 'FGRU A'); await page.press('#aq-q', 'Enter'); await page.waitForTimeout(600);
  const abq = await page.evaluate(() => ({ n: UI.arqRes.length, lista: !!document.querySelector('table.arq'), grupos: document.querySelectorAll('.arq-g').length, ordem: UI.arqRes.every((r, i, a) => !i || a[i - 1].data >= r.data), pdf: document.querySelectorAll('.arq-g [data-arq-pdf]').length }));
  ok(abq.n >= 3 && !abq.lista && abq.grupos >= 2 && abq.ordem && abq.pdf >= 1, `Arquivo: com busca, a lista de atas some e aparecem os resultados por REDIA, mais recentes primeiro (${JSON.stringify(abq)})`);
  await page.selectOption('#aq-c', 'COMAN'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => UI.arqRes.every(r => r.payload.coord === 'COMAN')), 'filtro de coordenação restringe os resultados');
  await page.click('[data-act="aq-limpar"]'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.querySelectorAll('table.arq tbody tr').length === 15 && !document.querySelector('.arq-g') && document.querySelector('#aq-q').value === ''), 'Limpar filtros volta à lista de todas as atas');
  await page.goto(URL + '#/historico'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => ROTA_ATUAL.id === 'arquivo'), 'endereço antigo da tela Histórico abre o Arquivo');
  await page.goto(URL + '#/inicio'); await page.waitForTimeout(300);
  page.once('dialog', d => d.accept());
  await page.click('[data-act="historico15"]'); await page.waitForTimeout(200); await page.click('[data-mdl="ok"]'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => [...Store.cache.values()].filter(r => r.tipo === 'ata' && r.payload.historico).length === 15), 'Gerar histórico de novo não duplica: dias já encerrados ficam como estão');
  /* D-67: fechamento final · congelar, de acordo dos responsáveis, ata em PDF; depois, nada mais é alterado no dia */
  await page.goto(URL + '#/inicio'); await page.waitForTimeout(200); await page.click('[data-act="congelar-ini"]'); await page.waitForTimeout(250); if (await page.$('.mdl')) { await page.click('.mdl [data-mdl]:last-child'); await page.waitForTimeout(250); }
  await page.goto(URL + '#/ata'); await page.waitForTimeout(250);
  while (await page.$('[data-acordo]')) { await page.click('[data-acordo]'); await page.waitForTimeout(200); }
  await page.goto(URL + '#/ata'); await page.waitForTimeout(200);
  await page.fill('#at-part', 'GEPLAT de bordo\nCOPROD de bordo\n4º COPROD (base)'); await page.fill('#at-obs', 'Priorizar retorno da FGRU A.');
  /* D-55: ata em PDF = relatório (retrato) + print de todas as telas da apresentação (paisagem), capturadas no fechamento */
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90000 }).catch(() => null), page.click('[data-act="fechar-ata"]')]);
  ok(!!dl && /^ata_REDIA-P83-09102026\.pdf$/.test(dl.suggestedFilename()), `ata gerada em PDF e baixada no modo demonstração (${dl && dl.suggestedFilename()})`);
  if (dl) {
    const f = path.join(OUT, 'ata.pdf'); await dl.saveAs(f);
    const info = JSON.parse(execFileSync('python3', ['-c', `import pypdf,json,sys
r=pypdf.PdfReader(sys.argv[1]); pg=r.pages
land=[i+1 for i,p in enumerate(pg) if float(p.mediabox.width)>float(p.mediabox.height)]
print(json.dumps({'n':len(pg),'land':land,'p1':pg[0].extract_text(),'pl':pg[land[0]-1].extract_text() if land else '','imgs':sum(1 for i in land if b' Do' in pg[i-1].get_contents().get_data()),'titulo':r.metadata.title}))`, f]).toString());
    const nTel = await page.evaluate(() => telasDaAta().length);
    const infoTxt = JSON.parse(execFileSync('python3', ['-c', `import pypdf,json,sys
r=pypdf.PdfReader(sys.argv[1]); print(json.dumps(''.join(p.extract_text() for p in r.pages[:4])))`, f]).toString());
    ok(/Decisões tomadas na reunião/.test(infoTxt) && /GEOP/.test(infoTxt) && /Aprendizados do dia/.test(infoTxt) && /Tempo por bloco/.test(infoTxt) && /Abertura · GEPLAT/.test(infoTxt) && /fechadas no prazo/.test(infoTxt), 'PDF: relatório traz decisões, aprendizados, taxa no prazo e tempo por bloco (D-61)');
    ok(/Ata de sexta, 09\/10\/2026/.test(info.p1) && /código de integridade [0-9a-f]{8}/.test(info.p1) && /GEPLAT de bordo/.test(info.p1) && /Ata REDIA-P83-09102026/.test(info.titulo) && /Código REDIA-P83-09102026/.test(info.p1), 'PDF: relatório com data, pauta congelada e participantes');
    ok(nTel === 28 && info.land.length === nTel && info.imgs === nTel && info.land.every((p, k) => k === 0 || p === info.land[k - 1] + 1) && info.land[info.land.length - 1] === info.n, `PDF: depois do relatório, uma página em paisagem com o print de cada tela (${info.land.length} telas, ${info.n} páginas)`);
    ok(/Bloco 1 · GEPLAT · Abertura/.test(info.pl) && /Dados de referência: REDIA de 09\/10\/2026/.test(info.pl) && /realizado D-1 = 08\/10\/2026/.test(info.pl) && /Pauta congelada às .* código de integridade/.test(info.pl) && /capturada em 09\/10\/2026 às/.test(info.pl), 'PDF: cada tela com os dados de referência da REDIA e a hora da captura');
    ok(await page.evaluate(() => { const a = E.atas.at(-1).payload; return a.formato === 'pdf' && a.telas === 28 && a.paginas > 28; }), 'registro da ata guarda formato, páginas e telas');
  }
  const fim = await page.evaluate(async () => { let cod = ''; try { await registrar('item', { coord: 'COPROD', tipo: 'ameaca', texto: 'x', semaforo: 'at' }); } catch (e) { cod = e.codigo; } return { cod, bloq: bloqueado(), btn: !!document.querySelector('[data-act="fechar-ata"]'), codigo: E.atas[0].payload.codigo, acordos: E.atas[0].payload.acordos.length }; });
  ok(fim.cod === 'ATA_FECHADA' && fim.bloq && !fim.btn && fim.codigo === 'REDIA-P83-09102026' && fim.acordos === 4, `ata fechada: documento final com o código da REDIA e os de acordo; nada mais é gravado no dia (${JSON.stringify(fim)})`);
  await page.goto(URL + '#/arquivo'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => document.querySelectorAll('table.arq tbody tr').length === 16 && /REDIA-P83-09102026/.test(document.querySelector('table.arq tbody tr').textContent)), 'Arquivo: a ata fechada hoje entra no topo da lista');
  /* D-67: REDIA de hoje · só existe depois de "Iniciar elaboração" (código único) · preenchimento fictício (versão de teste) */
  /* D-68: Início sem calendário; dia com ata encerrada não oferece "Iniciar elaboração"; à meia-noite o novo dia passa a oferecer */
  const ontemR = await page.evaluate(async () => { const h = isoData(Relogio.agora()), o = addDias(h, -1); if (![...Store.cache.values()].some(r => r.data === o && r.tipo === 'ata')) await Store.gravarLote(montarHistorico(h, 1)); await abrirDia(o); return o; });
  await page.goto(URL + '#/inicio'); await page.waitForTimeout(300);
  const vd0 = await page.evaluate(() => ({ cal: !!document.querySelector('#dia') || !!document.querySelector('[data-act="dia"]'), ini: !!document.querySelector('[data-act="iniciar-redia"]'), cod: document.querySelector('.redia-id')?.textContent || '' }));
  ok(!vd0.cal && !vd0.ini && /REDIA-P83-\d{8}/.test(vd0.cod), `Início sem calendário/Abrir; com a ata do dia encerrada não aparece "Iniciar elaboração" (${JSON.stringify(vd0)})`);
  const hojeR = await page.evaluate(async o => { HOJE_VISTO = o; await viradaDoDia(); return DIA; }, ontemR); await page.waitForTimeout(300);
  ok(hojeR === await page.evaluate(() => isoData(Relogio.agora())) && await page.evaluate(() => !!document.querySelector('.g-dia [data-act="iniciar-redia"]')), 'virada da meia-noite: o Início passa ao novo dia e oferece "Iniciar elaboração"');
  await page.goto(URL + '#/curadoria/COPROD/dados'); await page.waitForTimeout(300);
  const g0 = await page.evaluate(async () => { const ok = await podeEditar('valor'); return { ok, banner: !!document.querySelector('.banner.ini-redia [data-act="iniciar-redia"]'), dis: !!document.querySelector('[data-act="capturar-todos"][disabled]') }; });
  ok(!g0.ok && g0.banner && g0.dis, `antes de "Iniciar elaboração" a curadoria fica bloqueada, com o botão para iniciar (${JSON.stringify(g0)})`);
  await page.goto(URL + '#/inicio'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => /Não iniciada/.test(document.querySelector('.ses').textContent) && document.querySelector('.ses').getBoundingClientRect().width > 1000 && document.querySelector('.tst h2').textContent === 'Funções da versão de teste' && !!document.querySelector('.tst [data-act="resetar"]') && !!document.querySelector('.tst [data-act="simular"]') && !document.querySelector('.g-dia [data-act="simular"]')), 'Início: sessão em barra no topo; funções de teste reunidas em "Funções da versão de teste"');
  ok(await page.evaluate(() => { const t = document.querySelector('.tst').getBoundingClientRect(), d = document.querySelector('.g-dia').getBoundingClientRect(); return t.top > d.bottom && t.right >= d.right - 2 && t.left > d.left + 200; }), 'Funções da versão de teste no canto inferior direito, abaixo de REDIA do dia e Situação das coordenações');
  await page.click('.g-dia [data-act="iniciar-redia"]'); await page.waitForTimeout(200); await page.click('[data-mdl="ok"]'); await page.waitForTimeout(400);
  const cod = await page.evaluate(() => ({ c: E.redia?.payload.codigo, ses: document.querySelector('.ses').textContent, dup: (() => { try { regrasDemo(novoRegistro('redia', {})); return ''; } catch (e) { return e.codigo; } })() }));
  ok(cod.c === 'REDIA-P83-' + hojeR.split('-').reverse().join('') && cod.ses.includes(cod.c) && cod.dup === 'REDIA_JA_INICIADA', `REDIA iniciada com código único REDIA-<UEP>-<DDMMAAAA>; segunda abertura recusada (${JSON.stringify({ c: cod.c, dup: cod.dup })})`);
  await page.click('[data-act="preencher"]'); await page.waitForTimeout(200); await page.click('[data-mdl="ok"]'); await page.waitForTimeout(800);
  const pf = await page.evaluate(() => ({ v: Object.keys(E.valores).length, l: Object.keys(E.listas).length, pend: COORDS.reduce((a, c) => a + pendentes(E, c).length, 0), concl: naoConcluidas(E).length, fic: [...Store.cache.values()].filter(r => r.data === DIA && r.payload?.ficticio).length, resp: responsaveisDe(regsDoDia()).map(x => x.coord + ':' + (x.chave || '-')).join() }));
  ok(pf.v > 80 && pf.l > 20 && pf.pend === 0 && pf.concl === 0 && pf.fic > 100 && pf.resp === 'GEPLAT:-', `preenchimento fictício: valores e listas de todas as coordenações, sugestões aprovadas e coordenações concluídas; marcado como fictício e fora do de acordo (${JSON.stringify(pf)})`);
  /* D-67: apresentação ao vivo · quem aciona controla; os demais acompanham, só com "Sair" */
  const p2 = await ctx.newPage(); await p2.goto(URL + '#/inicio'); await p2.waitForTimeout(500);
  await p2.fill('#lg-chave', 'cm01'); await p2.fill('#lg-senha', '1234'); await p2.click('.lg-btn'); await p2.waitForTimeout(700);
  await p2.evaluate(async h => { await abrirDia(h); location.hash = '#/curadoria/COMAN'; }, hojeR); await p2.waitForTimeout(500);
  await page.goto(URL + '#/inicio'); await page.waitForTimeout(300);
  await page.click('.apph [data-act="vivo-iniciar"]'); await page.waitForTimeout(1200);
  const hc = await page.evaluate(() => location.hash); const v1 = await p2.evaluate(hc => ({ hc, h: location.hash, seg: Vivo.seguindo, ctrl: Vivo.ctrl?.chave, off: document.querySelectorAll('#ctrl .btn.off').length, sair: [...document.querySelectorAll('#ctrl a.btn')].map(a => a.textContent), tip: document.querySelector('#ctrl .btn.off')?.dataset.tip || '' }), hc);
  ok(v1.h === v1.hc && v1.seg && v1.ctrl === 'CP01' && v1.off >= 10 && v1.sair.join() === 'Sair' && /Controle da reunião/.test(v1.tip) && /Usuário COPROD/.test(v1.tip), `ao vivo: quem estava na curadoria vai para a apresentação; só "Sair" ativo, demais comandos desabilitados com dica (${JSON.stringify({ ...v1, tip: v1.tip.slice(0, 40) })})`);
  await p2.hover('#ctrl .btn.off'); await p2.waitForTimeout(250);
  ok(await p2.evaluate(() => !document.querySelector('#dica').hidden && /conduzida por Usuário COPROD/.test(document.querySelector('#dica').textContent)), 'dica ao parar o mouse num comando desabilitado: o controle é de quem acionou o modo ao vivo');
  await page.click('#ctrl a[href="#/apresentacao/2"]', { force: true }); await page.waitForTimeout(400); await page.evaluate(() => { mostrarCtrl(); }); await page.click('#ctrl [data-act="mais1"]', { force: true }); await page.waitForTimeout(900);
  const v2 = await p2.evaluate(() => ({ h: location.hash, extra: UI.pres.extra, fichas: document.querySelectorAll('.stage [data-tx] i.on').length, k: (await_ => 0)() }));
  ok(v2.h === '#/apresentacao/2' && v2.extra === 1 && v2.fichas === 1, `quem assiste acompanha a troca de tela e o cronômetro de quem controla (${JSON.stringify(v2)})`);
  await p2.keyboard.press('ArrowRight'); await p2.waitForTimeout(300);
  ok(await p2.evaluate(() => location.hash === '#/apresentacao/2'), 'teclado de quem assiste não muda a tela');
  await p2.click('#ctrl a[data-act="vivo-sair"]'); await p2.waitForTimeout(400);
  const v3 = await p2.evaluate(() => ({ h: location.hash, seg: Vivo.seguindo, ativo: Vivo.ativo, b: document.querySelector('.apph [data-act="vivo-assistir"]')?.textContent || '' }));
  ok(v3.h === '#/inicio' && !v3.seg && v3.ativo && /assistir/.test(v3.b), `"Sair" deixa o modo ao vivo; o botão "Apresentação ao vivo · assistir" fica disponível (${JSON.stringify(v3)})`);
  await page.click('#ctrl a[href="#/apresentacao/4"]', { force: true }); await page.waitForTimeout(600);
  ok(await p2.evaluate(() => location.hash === '#/inicio'), 'fora do modo ao vivo, a tela de quem saiu não é mais levada');
  await p2.click('.apph [data-act="vivo-assistir"]'); await p2.waitForTimeout(500);
  ok(await p2.evaluate(() => location.hash === '#/apresentacao/4' && Vivo.seguindo), '"Assistir" volta a mostrar a tela de quem controla');
  await page.evaluate(() => mostrarCtrl()); await page.click('#ctrl [data-act="vivo-fim"]', { force: true }); await page.waitForTimeout(600);
  ok(await p2.evaluate(() => !Vivo.ativo && !Vivo.seguindo && !!document.querySelector('#ctrl [data-act="tmr"]')), 'encerrar o modo ao vivo devolve os comandos a todos');
  await p2.close();
  /* D-67: cabeçalho da apresentação com dia, data e hora atual; fichas de orelhão; cards de ações */
  await page.goto(URL + '#/apresentacao/semana'); await page.waitForTimeout(400);
  const hd = await page.evaluate(() => { const dt = document.querySelector('.stage .dt'); const t = document.querySelector('.stage .ac-tx'); const ov = [...document.querySelectorAll('.stage .tile')].map(x => x.scrollWidth <= x.clientWidth + 1 && x.scrollHeight <= x.clientHeight + 1); return { txt: dt.textContent, clk: dt.querySelector('[data-clk]')?.textContent, fn: parseFloat(getComputedStyle(dt.querySelector('.dt-n')).fontSize), sub: /SITOP|Realizado/.test(dt.textContent), tx: t && getComputedStyle(t).backgroundColor, cor: t && getComputedStyle(t).color, ov: ov.every(Boolean), ficha: !!document.querySelector('.stage [data-tx] svg rect') }; });
  ok(/\d\d\/\d\d\/\d{4}/.test(hd.txt) && /^\d\d:\d\d$/.test(hd.clk) && hd.fn >= 28 && !hd.sub && hd.tx === 'rgb(0, 133, 66)' && hd.cor === 'rgb(255, 255, 255)' && hd.ov && hd.ficha, `cabeçalho com dia, data e hora atual (fonte maior, sem "Realizado D-1 · SITOP"); card no prazo verde com fonte branca e sem estouro; fichas de orelhão (${JSON.stringify(hd)})`);
  await page.evaluate(async () => { await abrirDia('2026-10-09'); }); await page.goto(URL + '#/inicio'); await page.waitForTimeout(300);
  // persistência no navegador (recarregar)
  const antes = await page.evaluate(() => Store.cache.size);
  await page.reload(); await page.waitForTimeout(400);
  ok(await page.evaluate(() => Store.modo === 'memoria' && Store.cache.size) === antes, 'modo demonstração sobrevive ao recarregar');
  ok(await page.$('.apph') !== null, 'sessão mantida ao recarregar');
  ok(await page.evaluate(() => { const r = E.sugestoes.filter(s => !s.payload.simulado); const c = {}; for (const s of r) { const k = s.payload.coord + s.payload.passagem; c[k] = (c[k] || 0) + 1; } return ['GEPLAT', 'COPROD', 'COEMB', 'COMAN'].every(x => c[x + '06:00'] === 4 && c[x + '18:00'] === 3); }), 'exemplo: 4 sugestões das 06:00 e 3 das 18:00 por coordenação');
  ok(await page.evaluate(() => E.sugestoes.filter(s => s.payload.passagem === '18:00' && !s.payload.simulado).every(s => s.payload.dataPassagem === addDias(DIA, -1))), 'sugestões das 18:00 datadas do dia anterior');
  await page.click('a.sair'); await page.waitForTimeout(500);
  ok(await page.$('.login') !== null && await page.evaluate(() => USUARIO === null), 'sair encerra a sessão');
  await page.goto(URL + '#/ata'); await page.waitForTimeout(400);
  await page.fill('#lg-chave', 'SE01'); await page.fill('#lg-senha', '1234'); await page.click('.lg-btn'); await page.waitForTimeout(800);
  ok(page.url().endsWith('#/ata') && await page.evaluate(() => USUARIO.coord) === 'COEMB', 'após o login volta à tela pedida (SUEMB/COEMB → #/ata)');

  /* ---- R-01: congelar/descongelar trocando entre horário real e simulado ---- */
  const rc = await browser.newContext({ viewport: { width: 1600, height: 1000 } }); const q = await rc.newPage();
  q.on('pageerror', e => { erros.push('pageerror(relogio): ' + e.message); });
  await q.goto(URL); await q.waitForTimeout(700); await q.fill('#lg-chave', 'GP01'); await q.fill('#lg-senha', '1234'); await q.click('.lg-btn'); await q.waitForTimeout(500);
  await q.click('[data-act="exemplo"]'); await q.waitForTimeout(400);
  const cong = () => q.evaluate(() => !!E.congelamento);
  const congelarIni = async () => { await q.click('[data-act="congelar-ini"]'); await q.waitForTimeout(200); if (await q.$('.mdl')) { await q.click('[data-mdl="congelar"]'); await q.waitForTimeout(200); } };
  const descongelarIni = async () => { await q.click('[data-act="descongelar"]'); await q.waitForTimeout(150); await q.fill('[data-mdl-in="motivo"]', 'teste'); await q.click('[data-mdl="ok"]'); await q.waitForTimeout(200); };
  await congelarIni(); const c1 = await cong();
  await q.fill('#sim', '07:30'); await q.click('[data-act="simular"]'); await q.waitForTimeout(150);
  await descongelarIni(); const c2 = await cong();
  await congelarIni(); const c3 = await cong();
  await q.click('[data-act="real"]'); await q.waitForTimeout(150);
  await descongelarIni(); const c4 = await cong();
  ok(c1 && !c2 && c3 && !c4, `congelar/descongelar funciona com troca de horário real ↔ simulado (${[c1, c2, c3, c4].join(' ')})`);
  await q.fill('#sim', '06:15'); await q.click('[data-act="simular"]'); await q.waitForTimeout(150);
  ok(await q.evaluate(async () => { await salvarE('valor', { campo: 'oleo.real', valor: 11111, origem: 'M' }); return E.valores['oleo.real'].valor; }) === 11111, 'correção manual com horário simulado anterior não é sobrescrita');
  await q.reload(); await q.waitForTimeout(600);
  ok(await q.evaluate(() => !E.congelamento && E.valores['oleo.real'].valor === 11111), 'estado mantido após recarregar');
  ok(await q.evaluate(() => Regras.efop(0, 26869).sem === 'nok' && Regras.efop(null, 26869).sem === 'sd'), 'EFOP com produção 0 é Não OK (não “sem dado”)');
  /* ---- R-02: armazenamento do navegador cheio é avisado e nada é perdido em silêncio ---- */
  const r2 = await q.evaluate(async () => { const orig = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === 'redia.memoria.registros') throw new DOMException('cheio', 'QuotaExceededError'); return orig.call(this, k, v); };
    const n0 = Store.cache.size; await salvarE('valor', { campo: 'oleo.real', valor: 22222, origem: 'M' }); const r = { n: Store.cache.size - n0, v: E.valores['oleo.real'].valor, erro: !!document.querySelector('.toast.erro') }; Storage.prototype.setItem = orig; return r; });
  ok(r2.n === 0 && r2.v === 11111 && r2.erro, `armazenamento cheio: erro visível e registro não fica pela metade (${JSON.stringify(r2)})`);
  /* ---- D-52: resetar a demonstração ---- */
  await q.goto(URL + '#/inicio'); await q.waitForTimeout(300);
  await q.click('[data-act="resetar"]'); await q.waitForTimeout(200);
  const txtReset = await q.textContent('.mdl');
  await q.fill('[data-mdl-in="conf"]', 'apagar'); await q.click('[data-mdl="ok"]'); await q.waitForTimeout(300);
  const n1 = await q.evaluate(() => Store.cache.size);
  await q.click('[data-act="resetar"]'); await q.waitForTimeout(200); await q.fill('[data-mdl-in="conf"]', 'RESETAR'); await q.click('[data-mdl="ok"]'); await q.waitForTimeout(400);
  const n2 = await q.evaluate(() => ({ n: Store.cache.size, sug: E.sugestoes.length, ls: JSON.parse(localStorage.getItem('redia.memoria.registros') || '[]').length }));
  ok(/Não dá para desfazer/.test(txtReset) && /todos os registros/.test(txtReset) && n1 > 0, 'reset: aviso explica o contexto e exige digitar RESETAR');
  ok(n2.n === 0 && n2.sug === 0 && n2.ls === 0, `reset: apaga todos os registros da demonstração (${JSON.stringify(n2)})`);
  await rc.close();

  /* ---- deck de explicação publicado junto com o app ---- */
  const dk = await browser.newPage({ viewport: { width: 1920, height: 1080 } }); const falhas = [];
  dk.on('requestfailed', r => falhas.push(r.url())); dk.on('pageerror', e => falhas.push(e.message));
  /* página inicial (landing): raiz do site com acesso ao app e ao deck; endereços antigos do app seguem para /app/ */
  const lp = await browser.newPage({ viewport: { width: 1280, height: 800 } }); await lp.goto(srv.url + '/'); await lp.waitForTimeout(400);
  const ld = await lp.evaluate(() => ({ app: !!document.querySelector('a.op[href="app/"]'), deck: !!document.querySelector('a.op[href="apresentacao/"]'), app0: typeof APP === 'undefined', h: document.documentElement.scrollWidth <= innerWidth, v: /versão \d+\.\d+\.\d+/.test(document.querySelector('footer').textContent) }));
  ok(ld.app && ld.deck && ld.app0 && ld.h && ld.v, `landing na raiz: escolher entre o app e o deck (${JSON.stringify(ld)})`);
  await lp.click('a.op[href="app/"]'); await lp.waitForTimeout(500);
  ok(/\/app\/$/.test(lp.url()) && await lp.$('#lg-chave') !== null, 'landing › Entrar no app abre a tela de acesso'); await lp.close();
  const dk2 = await browser.newPage(); await dk2.goto(srv.url + '/#/curadoria/COPROD'); await dk2.waitForTimeout(500);
  ok(/\/app\/#\/curadoria\/COPROD$/.test(dk2.url()), 'endereço antigo do app (raiz + #/rota) segue para /app/'); await dk2.close();
  const http404 = []; dk.on('response', r => { if (r.status() >= 400) http404.push(r.status() + ' ' + r.url()); });
  await dk.goto(srv.url + '/apresentacao/#6'); await dk.waitForTimeout(600);
  const dkInfo = await dk.evaluate(() => ({ n: document.querySelectorAll('.sl').length, on: document.querySelector('.sl.on')?.dataset.t, imgs: [...document.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth > 0).length, total: document.querySelectorAll('img').length }));
  await dk.keyboard.press('ArrowRight'); await dk.waitForTimeout(150);
  const dkProx = await dk.evaluate(() => document.querySelector('.sl.on')?.dataset.t);
  ok(dkInfo.n === 20 && dkInfo.on === 'Curadoria' && dkProx === 'Dados com origem' && !falhas.length, `deck publicado em /apresentacao/ (20 slides, navegação por teclado e #n) ${falhas.join(' ')}`);
  await dk.goto(srv.url + '/apresentacao/#1'); await dk.waitForTimeout(1500);
  const capa = await dk.evaluate(async () => { const imgs = [...document.querySelectorAll('img')]; await Promise.all(imgs.map(i => i.decode().catch(() => null))); const v = document.querySelector('.capa video'); const bg = getComputedStyle(document.querySelector('.capa .bg')).backgroundImage.match(/url\("?([^")]+)/)?.[1]; return { ok: imgs.filter(i => i.complete && i.naturalWidth > 0).length, total: imgs.length, video: v ? v.readyState : -1, err: v?.error?.code || 0, bg: bg ? await new Promise(res => { const im = new Image(); im.onload = () => res(200); im.onerror = () => res(404); im.src = bg; }) : 0, texto: document.body.innerText }; });
  ok(capa.ok === capa.total && capa.total >= 20 && capa.video >= 2 && capa.bg === 200 && !http404.length, `deck: capa com vídeo, imagem de fundo, marca e todas as capturas carregadas (${capa.ok}/${capa.total} imagens, vídeo ${capa.video}, fundo ${capa.bg}) ${http404.join(' ')}`);
  ok(!/75 minutos/.test(capa.texto) && /versão 1\.4/.test(capa.texto), 'deck: sem "75 minutos" e com a versão atual');
  await dk.close();

  await browser.close(); await srv.fechar();
  console.log('\n' + (erros.length ? `${erros.length} FALHA(S):\n - ` + erros.join('\n - ') : 'TODOS OS TESTES PASSARAM'));
  process.exit(erros.length ? 1 : 0);
})();
