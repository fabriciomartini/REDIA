// Gera as capturas de tela usadas no deck (apresentacao/img) a partir do app montado no modo demonstração.
// Uso: node tests/prints_deck.cjs   (monta o app em tests/.saida/prints e grava os JPG em apresentacao/img)
const { chromium } = require('playwright');
const fecharAviso = async p => { const b = await p.waitForSelector('[data-mdl="entendi"]', { timeout: 2500 }).catch(() => null); if (b) { await b.click(); await p.waitForTimeout(150); } };   // D-71: aviso de protótipo depois de cada login
const { execFileSync } = require('child_process');
const path = require('path'), fs = require('fs');
const P = __dirname, DIST = path.join(P, '.saida', 'prints'), IMG = path.join(P, '..', 'apresentacao', 'img'), TMP = path.join(P, 'out', 'prints');
fs.mkdirSync(TMP, { recursive: true });
execFileSync('python3', [path.join(P, '..', 'build.py'), '--saida', DIST], { stdio: 'inherit', env: { ...process.env, SUPABASE_URL: '', SUPABASE_ANON_KEY: '' } });
const jpg = (png, nome, w = 1600, h = 900) => execFileSync('python3', ['-c', `from PIL import Image; im=Image.open(${JSON.stringify(png)}).convert('RGB'); im=im.resize((${w},${h}), Image.LANCZOS) if im.size!=(${w},${h}) else im; im.save(${JSON.stringify(path.join(IMG, nome))}, quality=86, optimize=True)`]);
(async () => {
  const { iniciarServidor } = await import('./servidor.mjs');
  const srv = await iniciarServidor({ estatico: DIST }); const U = srv.url + '/app/index.html';
  const b = await chromium.launch();
  const entrar = async (p, chave) => {
    await p.goto(U); await p.waitForTimeout(800);
    await p.fill('#lg-chave', chave); await p.fill('#lg-senha', '1234'); await p.click('.lg-btn'); await p.waitForTimeout(700); await fecharAviso(p);
    await p.evaluate(async () => { await abrirDia('2026-10-09'); Relogio.simular('07:30'); if (!E.sugestoes.length) await carregarExemplo('2026-10-09'); atualizarEstado(); Captura.rapida = true; rerender(); });
  };
  const foto = async (p, nome, opts = {}) => { await p.addStyleTag({ content: '#toasts,#ctrl{display:none!important}' }); const f = path.join(TMP, nome.replace('.jpg', '.png')); await p.screenshot({ path: f, ...opts }); jpg(f, nome, opts.w, opts.h); console.log('ok', nome); };
  const topo = async (p, sel) => { await p.evaluate(s => { const el = document.querySelector(s); if (el) { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -16); } }, sel); await p.waitForTimeout(200); };

  /* curadoria (1600×900) */
  const c = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  await entrar(c, 'CP01');
  await c.goto(U + '#/curadoria/COPROD/sugestoes'); await c.waitForTimeout(300); await foto(c, 'curadoria.jpg');
  await c.goto(U + '#/curadoria/COPROD/dados'); await c.waitForTimeout(300);
  await c.click('[data-capturar="COPROD|IUGA e queima"]'); await c.waitForTimeout(700);
  await topo(c, '[data-bloco="COPROD|IUGA e queima"]'); await foto(c, 'dados.jpg');
  await c.click('[data-capturar="COPROD|Compressores de gás"]'); await c.waitForTimeout(700);
  await topo(c, '[data-bloco="COPROD|Compressores de gás"]'); await foto(c, 'equipamentos.jpg');
  await c.goto(U + '#/curadoria/COPROD/pfceo'); await c.waitForTimeout(300);
  await c.click('[data-capturar="COPROD|lista:pfceo.COPROD"]'); await c.waitForTimeout(700); await c.evaluate(() => scrollTo(0, 0)); await foto(c, 'pfceo.jpg');

  /* apresentação (1920×1080 → 1600×900) */
  const s = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await entrar(s, 'GP01');
  await s.evaluate(async () => { for (const [campo, valor] of [['iuga.atp', 97.1], ['iuga.buzios', 97.45], ['eq.gas.co2.b', 'Stand By']]) await registrar('valor', { campo, valor, origem: 'M', fonte: 'Manual' }); atualizarEstado(); });
  for (const [r, n] of [['1', 'pres_1'], ['2', 'pres_2'], ['2/pocos', 'pres_2_pocos'], ['4/analises', 'pres_4_analises']]) {
    await s.goto(U + '#/apresentacao/' + r); await s.waitForTimeout(400); await s.evaluate(() => document.querySelector('#ctrl')?.classList.add('hide')); await foto(s, n + '.jpg');
  }
  /* congelar e ata (1600×900) */
  await c.goto(U + '#/inicio'); await c.waitForTimeout(300); await c.click('[data-act="congelar-ini"]'); await c.waitForTimeout(300); await foto(c, 'congelar_aviso.jpg');
  await c.click('[data-mdl="congelar"]'); await c.waitForTimeout(500);
  await c.goto(U + '#/ata'); await c.waitForTimeout(300);
  await c.fill('#d-tit', 'Apoio para o retorno da FGRU A e da Injection A'); await c.fill('#d-resp', '4º COPROD'); await c.selectOption('#d-coord', 'COPROD'); await c.click('[data-act="add-dem"]'); await c.waitForTimeout(300);
  await c.fill('#at-part', 'GEPLAT de bordo\nCOPROD de bordo\nCOEMB de bordo\nCOMAN de bordo\n4º COPROD (base)'); await c.fill('#at-obs', 'Priorizar o retorno da FGRU A e da Injection A.');
  while (await c.$('[data-acordo]')) { await c.click('[data-acordo]'); await c.waitForTimeout(250); }   // D-67: de acordo dos responsáveis
  await c.evaluate(async () => { for (const x of situacaoAcordos().filter(y => y.pendente)) await registrar('acordo', { coord: x.coord }); atualizarEstado(); rerender(); }); await c.waitForTimeout(300);   // responsável sem usuário nesta sessão (ex.: GEPLAT)
  /* ata em PDF (D-55): progresso da geração e páginas do PDF */
  await c.evaluate(() => document.querySelector('[data-act="fechar-ata"]').scrollIntoView({ block: 'center' }));
  const [dl] = await Promise.all([c.waitForEvent('download', { timeout: 120000 }), (async () => { await c.click('[data-act="fechar-ata"]'); await c.waitForFunction(() => /tela (8|9|1\d) de/.test(document.querySelector('.ata-prog')?.textContent || ''), null, { timeout: 60000 }); const f = path.join(TMP, 'ata_gerando.png'); await c.screenshot({ path: f }); jpg(f, 'ata_gerando.jpg'); console.log('ok ata_gerando.jpg'); })()]);
  const pdf = path.join(TMP, 'ata.pdf'); await dl.saveAs(pdf);
  execFileSync('pdftoppm', ['-r', '110', '-png', '-f', '1', '-l', '1', pdf, path.join(TMP, 'ata_p')]);
  execFileSync('pdftoppm', ['-r', '110', '-png', '-f', '4', '-l', '4', pdf, path.join(TMP, 'ata_p')]);
  const pg = n => fs.readdirSync(TMP).find(f => new RegExp('^ata_p-0*' + n + '\\.png$').test(f));
  execFileSync('python3', ['-c', `from PIL import Image; Image.open(${JSON.stringify(path.join(TMP, pg(1)))}).convert('RGB').save(${JSON.stringify(path.join(IMG, 'ata_pdf_relatorio.jpg'))}, quality=88)`]);
  execFileSync('python3', ['-c', `from PIL import Image; Image.open(${JSON.stringify(path.join(TMP, pg(4)))}).convert('RGB').save(${JSON.stringify(path.join(IMG, 'ata_pdf_tela.jpg'))}, quality=88)`]);
  console.log('ok ata_pdf_relatorio.jpg, ata_pdf_tela.jpg');

  /* celular (390×844, escala 1,5 → 585×1266) */
  const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true })).newPage();
  await entrar(m, 'CP01');
  await m.goto(U + '#/curadoria/COPROD/sugestoes'); await m.waitForTimeout(400); await foto(m, 'celular_fila.jpg', { w: 585, h: 1266 });
  await m.click('[data-sel]'); await m.waitForTimeout(400); await foto(m, 'celular_editor.jpg', { w: 585, h: 1266 });

  await b.close(); await srv.fechar();
})();
