// Gera as capturas de tela dos decks (apresentacao/img) a partir do app montado no modo demonstração.
// Uso: node tests/prints_deck.cjs   (monta o app em tests/.saida/prints e grava os JPG em apresentacao/img)
// As animações do cronômetro (tempo esgotado e +1 min) saem de tests/videos_deck.cjs.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path'), fs = require('fs');
const P = __dirname, DIST = path.join(P, '.saida', 'prints'), IMG = path.join(P, '..', 'apresentacao', 'img'), TMP = path.join(P, 'out', 'prints');
const DIA = '2026-10-16';   // sexta-feira: dia da visão semanal no padrão
fs.mkdirSync(TMP, { recursive: true }); fs.mkdirSync(IMG, { recursive: true });
const SO = process.argv.slice(2);   // opcional: só os grupos indicados (ex.: node prints_deck.cjs adm pres)
const quero = g => !SO.length || SO.includes(g);
if (!process.env.SEM_BUILD) execFileSync('python3', [path.join(P, '..', 'build.py'), '--saida', DIST], { stdio: 'inherit', env: { ...process.env, SUPABASE_URL: '', SUPABASE_ANON_KEY: '' } });
const jpg = (png, nome, w = 1600, h = 900) => execFileSync('python3', ['-c', `from PIL import Image; im=Image.open(${JSON.stringify(png)}).convert('RGB'); im=im.resize((${w},${h}), Image.LANCZOS) if im.size!=(${w},${h}) else im; im.save(${JSON.stringify(path.join(IMG, nome))}, quality=86, optimize=True)`]);
const fecharAviso = async p => { const b = await p.waitForSelector('[data-mdl="entendi"]', { timeout: 2500 }).catch(() => null); if (b) { await b.click(); await p.waitForTimeout(150); } };   // D-71: aviso de protótipo depois de cada login
(async () => {
  const { iniciarServidor } = await import('./servidor.mjs');
  const srv = await iniciarServidor({ estatico: DIST }); const U = srv.url + '/app/index.html';
  const b = await chromium.launch();
  const login = async (p, chave) => { await p.goto(U); await p.waitForTimeout(800); await p.fill('#lg-chave', chave); await p.fill('#lg-senha', '1234'); await p.click('.lg-btn'); await p.waitForTimeout(700); await fecharAviso(p); };
  const preparar = async p => { await p.evaluate(async dia => { await abrirDia(dia); Relogio.simular('07:30'); if (!E.sugestoes.length) await carregarExemplo(dia); atualizarEstado(); Captura.rapida = true; rerender(); }, DIA); await p.waitForTimeout(300); };
  const entrar = async (p, chave) => { await login(p, chave); await preparar(p); };
  const foto = async (p, nome, opts = {}) => { await p.addStyleTag({ content: '#toasts{display:none!important}' + (opts.ctrl ? '' : '#ctrl{display:none!important}') }); const f = path.join(TMP, nome.replace('.jpg', '.png')); await p.screenshot({ path: f, ...opts }); jpg(f, nome, opts.w, opts.h); console.log('ok', nome); };
  const topo = async (p, sel, folga = 16) => { await p.evaluate(([s, f]) => { const el = document.querySelector(s); if (el) { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -f); } }, [sel, folga]); await p.waitForTimeout(200); };
  const ctx = (w, h, extra = {}) => b.newContext({ viewport: { width: w, height: h }, ...extra }).then(c => c.newPage());

  /* acesso: login, autocadastro, aviso de protótipo, escolha da unidade, administração e Studio (AD01, lotado nas 10 unidades) */
  if (quero('adm')) {
    const a = await ctx(1600, 900);
    const semCredito = () => a.addStyleTag({ content: '.lg-dev{visibility:hidden!important}' });   // créditos com nomes de pessoas ficam fora dos decks
    await a.goto(U); await a.waitForTimeout(900); await semCredito(); await foto(a, 'login.jpg');
    await a.click('[data-act="cadastrar"]'); await a.waitForTimeout(400); await semCredito(); await foto(a, 'cadastro.jpg');
    await a.goto(U); await a.waitForTimeout(800); await a.fill('#lg-chave', 'AD01'); await a.fill('#lg-senha', '1234'); await a.click('.lg-btn');
    await a.waitForSelector('[data-mdl="entendi"]', { timeout: 4000 }).catch(() => null); await a.waitForTimeout(300); await foto(a, 'aviso_prototipo.jpg'); await fecharAviso(a);
    await a.waitForTimeout(400); await foto(a, 'unidades.jpg');
    await a.goto(U + '#/admin'); await a.waitForTimeout(500); await foto(a, 'admin_painel.jpg');
    for (const [aba, nome] of [['usuarios', 'admin_usuarios.jpg'], ['testes', 'admin_testes.jpg'], ['praticas', 'admin_praticas.jpg']]) { await a.click(`[data-aba="${aba}"]`); await a.waitForTimeout(500); await a.evaluate(() => scrollTo(0, 0)); await foto(a, nome); }
    await a.click('[data-aba="usuarios"]'); await a.waitForTimeout(400); await a.evaluate(() => { const b = [...document.querySelectorAll('[data-ex]')][0]?.closest('tr')?.querySelector('[data-ed]'); b?.click(); }); await a.waitForTimeout(500); await foto(a, 'admin_editar.jpg');   // D-74: editar e excluir conta
    await a.keyboard.press('Escape').catch(() => {}); await a.evaluate(() => document.querySelector('[data-mdl="cancelar"]')?.click()); await a.waitForTimeout(200);
    await a.click('[data-uep="P-83"]').catch(() => {}); await a.goto(U + '#/unidades'); await a.waitForTimeout(300); await a.click('[data-uep="P-83"]'); await a.waitForTimeout(600); await preparar(a);
    await a.goto(U + '#/studio'); await a.waitForTimeout(700); await foto(a, 'studio.jpg');
    await a.context().close();
  }

  /* curadoria (1600×900) */
  const c = await ctx(1600, 900);
  await entrar(c, 'CP01');
  if (quero('cur')) {
    await c.goto(U + '#/curadoria/COPROD/sugestoes'); await c.waitForTimeout(300); await foto(c, 'curadoria.jpg');
    await c.goto(U + '#/curadoria/COPROD/dados'); await c.waitForTimeout(300);
    await c.click('[data-capturar="COPROD|IUGA e queima"]'); await c.waitForTimeout(700);
    await topo(c, '[data-bloco="COPROD|IUGA e queima"]'); await foto(c, 'dados.jpg');
    await c.click('[data-capturar="COPROD|Compressores de gás"]'); await c.waitForTimeout(700);
    await topo(c, '[data-bloco="COPROD|Compressores de gás"]'); await foto(c, 'equipamentos.jpg');
    await c.goto(U + '#/curadoria/COPROD/pfceo'); await c.waitForTimeout(300);
    await c.click('[data-capturar="COPROD|lista:pfceo.COPROD"]'); await c.waitForTimeout(700); await c.evaluate(() => scrollTo(0, 0)); await foto(c, 'pfceo.jpg');
    await c.goto(U + '#/curadoria/COPROD/demandas'); await c.waitForTimeout(400); await foto(c, 'canal.jpg');
    await c.goto(U + '#/curadoria/COPROD/itens'); await c.waitForTimeout(400); await foto(c, 'ameacas.jpg');
    await c.goto(U + '#/inicio'); await c.waitForTimeout(500); await foto(c, 'inicio.jpg');
    await c.evaluate(() => document.querySelector('.mais-b')?.click()); await c.waitForTimeout(300); await foto(c, 'inicio_mais.jpg', { clip: { x: 0, y: 0, width: 1600, height: 450 }, w: 1600, h: 450 });   // D-74: cabeçalho com o menu "Mais"
    await c.goto(U + '#/config'); await c.waitForTimeout(400);
    { const r = await c.evaluate(() => { const h = [...document.querySelectorAll('h3')].find(x => /Tempo de exibição de cada tela/.test(x.textContent)), n = document.querySelector('.tb-telas').nextElementSibling, a = h.getBoundingClientRect(), z = n.getBoundingClientRect(), p = h.closest('.pn').getBoundingClientRect(); return { x: Math.round(p.x), y: Math.round(a.y + scrollY - 12), width: Math.round(p.width), height: Math.round(z.bottom - a.y + 24) }; });
      await foto(c, 'config_tempos.jpg', { fullPage: true, clip: r, w: r.width, h: r.height }); }   // D-77: só a seção do tempo das telas
    { const r = await c.evaluate(() => { const h = [...document.querySelectorAll('h3')].find(x => /telas de detalhe/.test(x.textContent)), n = document.querySelector('.tb-dets').nextElementSibling, a = h.getBoundingClientRect(), z = n.getBoundingClientRect(), p = h.closest('.pn').getBoundingClientRect(); return { x: Math.round(p.x), y: Math.round(a.y + scrollY - 12), width: Math.round(p.width), height: Math.round(z.bottom - a.y + 24) }; });
      await foto(c, 'config_detalhes.jpg', { fullPage: true, clip: r, w: r.width, h: r.height }); }   // D-78: só a seção dos detalhes
  }

  /* apresentação (1920×1080 → 1600×900) */
  if (quero('pres')) {
    const s = await ctx(1920, 1080);
    await entrar(s, 'GP01');
    await s.evaluate(async () => { for (const [campo, valor] of [['iuga.atp', 97.1], ['iuga.buzios', 97.45], ['eq.gas.co2.b', 'Stand By']]) await registrar('valor', { campo, valor, origem: 'M', fonte: 'Manual' }); atualizarEstado(); });
    for (const [r, n] of [['1', 'pres_1'], ['2', 'pres_2'], ['3', 'pres_3'], ['4', 'pres_4'], ['5', 'pres_5'], ['2/pocos', 'pres_2_pocos'], ['2/queima', 'pres_2_queima'], ['2/indicadores', 'pres_2_indicadores'], ['3/integridade', 'pres_3_integridade'], ['4/analises', 'pres_4_analises'], ['semana', 'pres_semana']]) {
      await s.goto(U + '#/apresentacao/' + r); await s.waitForTimeout(450); await foto(s, n + '.jpg');
    }
    /* dica de semáforo (D-66) */
    await s.goto(U + '#/apresentacao/1'); await s.waitForTimeout(400);
    const alvo = await s.$('.stage [data-tip-sem="nok"], .stage [data-tip-sem="at"]'); if (alvo) { await alvo.hover(); await s.waitForTimeout(500); await foto(s, 'pres_dica.jpg'); }
    await s.context().close();
  }

  /* apresentação ao vivo: confirmação e contagem regressiva (1600×900) */
  if (quero('vivo')) {
    const v = await ctx(1600, 900); await entrar(v, 'GP01');
    await v.goto(U + '#/inicio'); await v.waitForTimeout(400);
    await v.click('[data-act="vivo-iniciar"]'); await v.waitForTimeout(400); await foto(v, 'vivo_modal.jpg');
    await v.click('[data-mdl="ok"]'); await v.waitForTimeout(1700); await foto(v, 'vivo_contagem.jpg');
    await v.context().close();
  }

  /* congelar, fechamento, ata em PDF e arquivo (1600×900) */
  if (quero('ata')) {
    await c.goto(U + '#/inicio'); await c.waitForTimeout(300); await c.click('[data-act="congelar-ini"]'); await c.waitForTimeout(300); await foto(c, 'congelar_aviso.jpg');
    await c.click('[data-mdl="congelar"]'); await c.waitForTimeout(500);
    await c.goto(U + '#/ata'); await c.waitForTimeout(300);
    await c.fill('#d-tit', 'Apoio para o retorno da FGRU A e da Injection A'); await c.fill('#d-resp', '4º COPROD'); await c.selectOption('#d-coord', 'COPROD'); await c.click('[data-act="add-dem"]'); await c.waitForTimeout(300);
    await c.fill('#at-part', 'GEPLAT de bordo\nCOPROD de bordo\nCOEMB de bordo\nCOMAN de bordo\n4º COPROD (base)'); await c.fill('#at-obs', 'Priorizar o retorno da FGRU A e da Injection A.');
    await c.evaluate(() => scrollTo(0, 0)); await c.waitForTimeout(200); await foto(c, 'ata_tela.jpg');
    while (await c.$('[data-acordo]')) { await c.click('[data-acordo]'); await c.waitForTimeout(250); }   // D-67: de acordo dos responsáveis
    await c.evaluate(async () => { for (const x of situacaoAcordos().filter(y => y.pendente)) await registrar('acordo', { coord: x.coord }); atualizarEstado(); rerender(); }); await c.waitForTimeout(300);
    await c.evaluate(() => document.querySelector('[data-acd]').closest('section,.pn,div').scrollIntoView({ block: 'center' })); await c.waitForTimeout(200); await foto(c, 'acordo.jpg');
    await c.evaluate(() => document.querySelector('[data-act="fechar-ata"]').scrollIntoView({ block: 'center' }));
    const [dl] = await Promise.all([c.waitForEvent('download', { timeout: 120000 }), (async () => { await c.click('[data-act="fechar-ata"]'); await c.waitForFunction(() => /tela (8|9|1\d) de/.test(document.querySelector('.ata-prog')?.textContent || ''), null, { timeout: 60000 }); const f = path.join(TMP, 'ata_gerando.png'); await c.screenshot({ path: f }); jpg(f, 'ata_gerando.jpg'); console.log('ok ata_gerando.jpg'); })()]);
    const pdf = path.join(TMP, 'ata.pdf'); await dl.saveAs(pdf);
    for (const f of fs.readdirSync(TMP).filter(f => /^ata_p-/.test(f))) fs.unlinkSync(path.join(TMP, f));
    execFileSync('pdftoppm', ['-r', '110', '-png', '-f', '1', '-l', '1', pdf, path.join(TMP, 'ata_p')]);
    const info = execFileSync('pdfinfo', ['-f', '1', '-l', '60', pdf]).toString(), pais = (info.match(/Page\s+(\d+) size:\s+([\d.]+) x ([\d.]+)/g) || []).map(l => l.match(/Page\s+(\d+) size:\s+([\d.]+) x ([\d.]+)/)).find(m => +m[2] > +m[3]);
    const pTela = pais ? +pais[1] : 4;   // primeira página em paisagem = primeira tela da apresentação
    execFileSync('pdftoppm', ['-r', '110', '-png', '-f', String(pTela), '-l', String(pTela), pdf, path.join(TMP, 'ata_p')]);
    const pg = n => fs.readdirSync(TMP).find(f => new RegExp('^ata_p-0*' + n + '\\.png$').test(f));
    execFileSync('python3', ['-c', `from PIL import Image; Image.open(${JSON.stringify(path.join(TMP, pg(1)))}).convert('RGB').save(${JSON.stringify(path.join(IMG, 'ata_pdf_relatorio.jpg'))}, quality=88)`]);
    execFileSync('python3', ['-c', `from PIL import Image; Image.open(${JSON.stringify(path.join(TMP, pg(pTela)))}).convert('RGB').save(${JSON.stringify(path.join(IMG, 'ata_pdf_tela.jpg'))}, quality=88)`]);
    console.log('ok ata_pdf_relatorio.jpg, ata_pdf_tela.jpg');
    await c.goto(U + '#/arquivo'); await c.waitForTimeout(600); await foto(c, 'arquivo.jpg');
  }

  /* celular (390×844, escala 1,5 → 585×1266) */
  if (quero('cel')) {
    const m = await ctx(390, 844, { deviceScaleFactor: 1.5, isMobile: true, hasTouch: true });
    await entrar(m, 'CP01');
    await m.goto(U + '#/curadoria/COPROD/sugestoes'); await m.waitForTimeout(400); await foto(m, 'celular_fila.jpg', { w: 585, h: 1266 });
    await m.click('[data-sel]'); await m.waitForTimeout(400); await foto(m, 'celular_editor.jpg', { w: 585, h: 1266 });
  }
  await b.close(); await srv.fechar();
})();
