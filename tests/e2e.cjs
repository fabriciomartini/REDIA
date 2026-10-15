// Teste ponta a ponta da REDIA V1.0 no modo demonstração (versão web servida por HTTP).
// Uso: node e2e.cjs   (monta o app em tests/.saida/demo e sobe um servidor local)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const P = __dirname, OUT = path.join(P, 'out', 'demo'); fs.mkdirSync(OUT, { recursive: true });
const DIST = path.join(P, '.saida', 'demo');
execFileSync('python3', [path.join(P, '..', 'build.py'), '--saida', DIST], { stdio: 'inherit', env: { ...process.env, SUPABASE_URL: '', SUPABASE_ANON_KEY: '' } });
let URL = '';
const erros = [];
const TOPS = { 2: [['indicadores'], ['queima'], ['pocos'], ['pfceo'], ['ultimas24'], ['servicos']], 3: [['indicadores'], ['utilidades'], ['tanques'], ['pfceo'], ['ultimas24'], ['servicos']], 4: [['indicadores'], ['geracao'], ['legais'], ['pfceo'], ['ultimas24'], ['servicos']] };
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
    while ((n = w.nextNode())) { if (!n.textContent.trim()) continue; const r = document.createRange(); r.selectNodeContents(n); for (const rc of r.getClientRects()) if (rc.width > 1 && rc.height > 1) runs.push({ el: n.parentElement, rc, t: n.textContent.trim().slice(0, 25) }); }
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
  URL = srv.url + '/index.html';
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
  await page.fill('#lg-senha', '1234'); await page.click('.lg-btn'); await page.waitForTimeout(800);
  const u = await page.evaluate(() => USUARIO);
  ok(u && u.posto === 'COPROD' && u.coord === 'COPROD' && u.chave === 'CP01' && page.url().endsWith('#/inicio'), `login com chave e senha genérica (${u && u.posto}/${u && u.coord})`);
  ok(await page.evaluate(() => Store.modo === 'memoria' && !MODO_NUVEM), 'sem config.js do Supabase, abre direto no modo demonstração');
  ok(await page.evaluate(() => typeof ACESSO === 'undefined' && Object.keys(ACESSO_DEMO).every(c => /^[A-Z]{2}01$/.test(c)) && Object.values(ACESSO_DEMO).every(a => /\(demo\)$/.test(a.nome))), 'demonstração só com usuários fictícios (sem lista de chaves reais no código)');
  await page.fill('#dia', '2026-10-09'); await page.click('[data-act="dia"]'); await page.waitForTimeout(200);
  await page.fill('#sim', '07:30'); await page.click('[data-act="simular"]'); await page.waitForTimeout(100);
  await page.click('[data-act="exemplo"]'); await page.waitForTimeout(400);
  const nReg = await page.evaluate(() => Store.cache.size);
  ok(nReg > 80, `exemplo carregado (${nReg} registros)`);
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
    ok(tit.includes('Indicadores') && tit.includes('Equipamentos e Sistemas – PFCEO') && tit.includes('Últimas 24h') && tit.includes('Serviços planejados hoje') && tit.includes('Demandas para a base'), `bloco ${b}: campos padronizados com título clicável (${tit.join(' · ')})`);
    const dir = await page.evaluate(() => [...document.querySelector('.stage main.m3').children[2].querySelectorAll('.card .hd')].map(h => h.textContent.replace('›', '').trim()));
    ok(dir.length === 2 && /^Serviços planejados hoje/.test(dir[0]) && /^Demandas para a base/.test(dir[1]), `bloco ${b}: coluna direita só com Serviços e Demandas`);
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
    DIA = ontem; await registrar('valor', { campo: 'gas.prod_d1', valor: vOntem + 1000, origem: 'M' }); DIA = '2026-10-09'; atualizarEstado();
    const corrigido = E.mes.gas - antes;
    DIA = addDias('2026-10-09', -3); await registrar('valor', { campo: 'queima.real_d1', valor: null, origem: 'M' }); DIA = '2026-10-09'; atualizarEstado();
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
  ok(await page.evaluate(() => { const t = document.querySelector('.stage').textContent; return /Acumulado no mês/.test(t) && /IUGA parcial do mês/.test(t) && /Reserva no mês/.test(t) && /Projetada D/.test(t) && /Reserva por dia/.test(t) && !/por causa/.test(t); }), 'card “Queima projetada”: projetada × reserva por dia (m³/d) e o mês (acumulado, IUGA parcial, reserva)');
  await page.goto(URL + '#/apresentacao/1'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => { const c = [...document.querySelectorAll('.stage .card')].find(x => /Previsão de TOP/.test(x.textContent)); return c && /Offloading · Previsão de TOP/.test(c.textContent) && /Maran Libra/.test(c.querySelector('.b').textContent) && !!c.querySelector('.tq2 > div') && /Ocupado/.test(c.textContent) && /livre/.test(c.textContent); }), 'abertura: offloading com “Previsão de TOP”, navio designado e barra ocupado × livre');
  ok(await page.evaluate(() => { const t = document.querySelector('.stage').textContent; return /3,9%/.test(t) && /679\s?m³/.test(t) && /Produzida descartada no mar: 0\s?m³/.test(t); }), 'abertura: água produzida reinjetada = 3,9% e descarte preservado (0 m³)');

  // teclado e cronômetro
  await page.goto(URL + '#/apresentacao/1'); await page.waitForTimeout(200);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200);
  ok(page.url().endsWith('#/apresentacao/2'), 'seta → avança para o bloco 2');
  await page.keyboard.press(' '); await page.waitForTimeout(2300);
  const tmr = await page.textContent('[data-tmr]'); ok(/^04:5[6-8]$/.test(tmr), `cronômetro corre (${tmr})`);
  await page.keyboard.press(' ');

  /* ---- curadoria: aprovar a SDV ---- */
  await page.goto(URL + '#/curadoria/COPROD/sugestoes'); await page.waitForTimeout(200);
  const pend0 = await page.evaluate(() => pendentes(E, 'COPROD').length);
  await page.click('.it:has-text("SDV-1235818")'); await page.waitForTimeout(150);
  await page.check('input[name="f-sem"][value="at"]', { force: true });
  await page.fill('#f-ped', 'Apoio da automação da base');
  await page.click('[data-act="aprovar"]'); await page.waitForTimeout(200);
  const st1 = await page.evaluate(() => ({ pend: pendentes(E, 'COPROD').length, ap: aprovados(E, 'COPROD').length }));
  ok(st1.pend === pend0 - 1 && st1.ap === 3, `aprovação registrada (pendentes ${pend0}→${st1.pend}, aprovados ${st1.ap})`);
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
  await page.fill('[data-campo="oleo.real"]', '25000'); await page.click('[data-grupo="Produção de óleo"]'); await page.waitForTimeout(200);
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
  await page.click('.pfk:has-text("Bombas de injeção de água") [data-pf]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => pfceoSelecao(E, 'COPROD').itens.some(i => /Bombas de injeção/.test(i.funcao))), 'levar para a tela grava a seleção');
  await page.goto(URL + '#/apresentacao/2'); await page.waitForTimeout(200);
  ok(/Bombas de injeção de água/.test(await page.textContent('.stage .pfc')), 'card PFCEO da tela da COPROD mostra o sistema selecionado');
  await page.goto(URL + '#/curadoria/COPROD/pfceo'); await page.waitForTimeout(200);
  await page.click('.pfsel .pfk:has-text("Bombas de injeção de água") [data-pf]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !pfceoSelecao(E, 'COPROD').itens.some(i => /Bombas de injeção/.test(i.funcao))), 'retirar da tela');
  await page.goto(URL + '#/curadoria/COMAN/pfceo'); await page.waitForTimeout(200);
  const sug = await page.evaluate(() => pfceoSelecao(E, 'COMAN'));
  await page.click('[data-act="pf-confirmar"]'); await page.waitForTimeout(200);
  ok(sug.sugerida && sug.itens.length === 6 && await page.evaluate(() => !pfceoSelecao(E, 'COMAN').sugerida && pfceoSelecao(E, 'COMAN').itens.length === 6), 'seleção automática (indisponíveis e com restrição) e confirmação');

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
  ok(await page.evaluate(() => E.demandas.filter(d => d.payload.dataRedia === DIA).length) === 2, 'demandas registradas na reunião');
  await page.click('[data-dst]:has-text("Encerrar")'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => E.demandas.some(d => d.payload.status === 'encerrada')), 'demanda encerrada');
  for (let b = 1; b <= 5; b++) { await page.goto(URL + '#/apresentacao/' + b); await page.waitForTimeout(200); await page.evaluate(() => document.querySelector('#ctrl')?.classList.add('hide')); await checarPalco(page, b + ' (congelada)'); await page.screenshot({ path: path.join(OUT, `cong_${b}.png`) }); }
  await page.goto(URL + '#/imprimir'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => document.querySelectorAll('.printroot .stage').length === 5 && window.__printed >= 1), 'impressão da pauta com 5 páginas');
  await page.goto(URL + '#/ata'); await page.waitForTimeout(200);
  await page.fill('#at-part', 'GEPLAT de bordo\nCOPROD de bordo\n4º COPROD (base)'); await page.fill('#at-obs', 'Priorizar retorno da FGRU A.');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 3000 }).catch(() => null), page.click('[data-act="fechar-ata"]')]);
  ok(!!dl, 'ata gerada e baixada no modo demonstração');
  if (dl) { const f = path.join(OUT, 'ata.html'); await dl.saveAs(f); const t = fs.readFileSync(f, 'utf8'); ok(/Ata de sexta, 09\/10\/2026/.test(t) && /Apoio para o retorno da FGRU A/.test(t) && /código de integridade [0-9a-f]{8}/.test(t), 'conteúdo da ata (data, demandas, código de integridade)'); }
  await page.click('[data-act="ver-ata"]'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => /Ata de sexta/.test(document.querySelector('#ifr-ata').contentDocument?.body?.innerText || '')), 'ata renderizada para impressão');
  await page.fill('#mot-re', 'Correção de valor'); await page.click('[data-act="reabrir-pauta"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !E.congelamento), 'pauta reaberta com motivo');
  await page.screenshot({ path: path.join(OUT, 'ata_tela.png'), fullPage: true });
  await page.goto(URL + '#/curadoria/COPROD/sugestoes'); await page.waitForTimeout(150); await page.screenshot({ path: path.join(OUT, 'curadoria.png'), fullPage: true });
  await page.goto(URL + '#/curadoria/COPROD/dados'); await page.waitForTimeout(150); await page.screenshot({ path: path.join(OUT, 'dados.png') });
  await page.goto(URL + '#/config'); await page.waitForTimeout(150); await page.fill('#c-tb', '6'); await page.click('[data-act="salvar-cfg"]'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => CFG.timeboxMin) === 6, 'configuração salva');
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
  await rc.close();

  /* ---- deck de explicação publicado junto com o app ---- */
  const dk = await browser.newPage({ viewport: { width: 1920, height: 1080 } }); const falhas = [];
  dk.on('requestfailed', r => falhas.push(r.url())); dk.on('pageerror', e => falhas.push(e.message));
  await dk.goto(srv.url + '/apresentacao/#6'); await dk.waitForTimeout(600);
  const dkInfo = await dk.evaluate(() => ({ n: document.querySelectorAll('.sl').length, on: document.querySelector('.sl.on')?.dataset.t, imgs: [...document.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth > 0).length, total: document.querySelectorAll('img').length }));
  await dk.keyboard.press('ArrowRight'); await dk.waitForTimeout(150);
  const dkProx = await dk.evaluate(() => document.querySelector('.sl.on')?.dataset.t);
  ok(dkInfo.n === 17 && dkInfo.on === 'Curadoria' && dkProx === 'Dados com origem' && !falhas.length, `deck publicado em /apresentacao/ (17 slides, navegação por teclado e #n) ${falhas.join(' ')}`);
  await dk.close();

  await browser.close(); await srv.fechar();
  console.log('\n' + (erros.length ? `${erros.length} FALHA(S):\n - ` + erros.join('\n - ') : 'TODOS OS TESTES PASSARAM'));
  process.exit(erros.length ? 1 : 0);
})();
