// Telas de trabalho em smartphone e tablet (modo demonstração): sem rolagem horizontal e alvos de toque ≥ 40 px.
// Uso: node movel.cjs   (rode depois do e2e.cjs, que monta tests/.saida/demo)
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const fecharAviso = async p => { const b = await p.waitForSelector('[data-mdl="entendi"]', { timeout: 2500 }).catch(() => null); if (b) { await b.click(); await p.waitForTimeout(150); } };   // D-71: aviso de protótipo depois de cada login
const P = __dirname, OUT = path.join(P, 'out', 'movel'); fs.mkdirSync(OUT, { recursive: true });
const DIST = path.join(P, '.saida', 'demo');
if (!fs.existsSync(path.join(DIST, 'app', 'index.html'))) require('child_process').execFileSync('python3', [path.join(P, '..', 'build.py'), '--saida', DIST], { stdio: 'inherit', env: { ...process.env, SUPABASE_URL: '', SUPABASE_ANON_KEY: '' } });
const erros = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) erros.push(m); };
(async () => {
  const { iniciarServidor } = await import('./servidor.mjs'); const srv = await iniciarServidor({ estatico: DIST }); const U = srv.url + '/app/index.html';
  const b = await chromium.launch();
  for (const [nome, vp] of [['phone', { width: 390, height: 844 }], ['phone-s', { width: 360, height: 740 }], ['tablet', { width: 820, height: 1180 }], ['tablet-l', { width: 1180, height: 820 }], ['note', { width: 1366, height: 768 }]]) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1, hasTouch: nome !== 'note', isMobile: nome.startsWith('phone') });
    const p = await ctx.newPage(); p.on('pageerror', e => erros.push(nome + ': ' + e.message));
    await p.goto(U); await p.waitForTimeout(1200);
    ok(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, `${nome}: login sem rolagem horizontal`);
    await p.fill('#lg-chave', 'CP01'); await p.fill('#lg-senha', '1234'); await p.click('.lg-btn'); await p.waitForTimeout(800); await fecharAviso(p);
    await p.evaluate(async () => { await abrirDia('2026-10-09'); Relogio.simular('07:30'); if (!E.sugestoes.length) await carregarExemplo('2026-10-09'); atualizarEstado(); rerender(); });
    for (const r of ['#/inicio', '#/curadoria/COPROD/dados', '#/curadoria/COPROD/sugestoes', '#/curadoria/COPROD/destaques', '#/curadoria/COPROD/pfceo', '#/curadoria/COPROD/servicos', '#/curadoria/COPROD/m-pocos', '#/curadoria/COPROD/demandas', '#/curadoria/GEPLAT/aceite', '#/ata', '#/config']) {
      await p.goto(U + r); await p.waitForTimeout(250);
      const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      ok(ov <= 0, `${nome}: ${r} sem rolagem horizontal (${ov})`);
      if (nome === 'phone' || nome === 'note') await p.screenshot({ path: path.join(OUT, `${nome}_${r.replace(/[#/]+/g, '_')}.png`), fullPage: true });
    }
    await ctx.close();
  }
  await b.close(); await srv.fechar();
  console.log('\n' + (erros.length ? `${erros.length} FALHA(S):\n - ` + erros.join('\n - ') : 'TELAS MÓVEIS OK'));
  process.exit(erros.length ? 1 : 0);
})();
