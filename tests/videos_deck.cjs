// Grava as animações do cronômetro usadas no deck completo (apresentacao/img/*.webm), a partir do app no modo demonstração.
//  · anim_tempo_esgotado: contagem → alerta no último minuto → pulso vermelho após 1 min além → "Tempo esgotado" após 2 min → Zerar
//  · anim_mais1: +1 min três vezes (fichas de orelhão) até o limite da tela
// Os quadros são capturas reais da tela (≈10 por segundo); os saltos de tempo aparecem na própria imagem ("avanço").
// Uso: node tests/videos_deck.cjs  (precisa de ffmpeg; monta o app em tests/.saida/videos)
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path'), fs = require('fs');
const P = __dirname, DIST = path.join(P, '.saida', 'videos'), IMG = path.join(P, '..', 'apresentacao', 'img'), TMP = path.join(P, 'out', 'videos');
const DIA = '2026-10-16';
fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP, { recursive: true });
if (!process.env.SEM_BUILD) execFileSync('python3', [path.join(P, '..', 'build.py'), '--saida', DIST], { stdio: 'inherit', env: { ...process.env, SUPABASE_URL: '', SUPABASE_ANON_KEY: '' } });
const fecharAviso = async p => { const b = await p.waitForSelector('[data-mdl="entendi"]', { timeout: 2500 }).catch(() => null); if (b) { await b.click(); await p.waitForTimeout(150); } };
const W = 1600, H = 900;

/* cursor desenhado na página (a captura de tela não mostra o mouse) e faixa de "avanço" nos saltos de tempo */
const EXTRAS = `
#cur{position:fixed;left:0;top:0;width:34px;height:34px;z-index:99999;pointer-events:none;transform:translate(-200px,-200px);transition:transform .55s cubic-bezier(.3,.7,.3,1)}
#cur svg{filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))}
#cur i{position:absolute;left:-14px;top:-14px;width:28px;height:28px;border-radius:50%;border:4px solid #FDC82F;opacity:0}
#cur.clk i{animation:clk .5s ease-out}
@keyframes clk{0%{transform:scale(.3);opacity:1}100%{transform:scale(2.2);opacity:0}}
#ff{position:fixed;left:50%;top:44%;transform:translate(-50%,-50%);z-index:99998;background:rgba(17,17,17,.88);color:#fff;font:800 34px Arial,sans-serif;padding:18px 34px;border-left:10px solid #FDC82F;display:none;pointer-events:none}
#ff small{display:block;font:600 20px Arial,sans-serif;color:#ddd;margin-top:4px}`;
async function instalarExtras(p) {
  await p.addStyleTag({ content: EXTRAS + '#toasts{display:none!important}' });
  await p.evaluate(() => { const c = document.createElement('div'); c.id = 'cur'; c.innerHTML = '<i></i><svg width="34" height="34" viewBox="0 0 24 24"><path d="M3 2l7 19 2.6-7.4L20 11z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>'; document.body.appendChild(c); const f = document.createElement('div'); f.id = 'ff'; document.body.appendChild(f); });
}
const cursor = (p, x, y) => Promise.all([p.evaluate(([x, y]) => { const c = document.getElementById('cur') || (() => { return null; })(); if (c) c.style.transform = `translate(${x}px,${y}px)`; }, [x, y]), p.mouse.move(x, y, { steps: 6 })]);
async function clicar(p, sel) {
  const r = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, sel);
  if (!r) throw new Error('sem ' + sel);
  await cursor(p, r.x, r.y); await p.waitForTimeout(700);
  await p.evaluate(() => { const c = document.getElementById('cur'); c.classList.remove('clk'); void c.offsetWidth; c.classList.add('clk'); });
  await p.click(sel); await p.waitForTimeout(150);
  await p.evaluate(() => { if (!document.getElementById('cur')) { /* rerender apagou: recria */ } });
}
const faixa = (p, txt, sub = '') => p.evaluate(([t, s]) => { const f = document.getElementById('ff'); if (!f) return; f.innerHTML = t + (s ? `<small>${s}</small>` : ''); f.style.display = t ? 'block' : 'none'; }, [txt, sub]);

/* gravação: captura contínua de quadros enquanto o roteiro roda; marcas de tempo para as legendas do deck */
async function gravar(p, nome, roteiro) {
  const dir = path.join(TMP, nome); fs.mkdirSync(dir); const quadros = []; let rodando = true; const t0 = Date.now(); const marcas = [];
  const loop = (async () => { let i = 0; while (rodando) { const f = path.join(dir, String(i++).padStart(5, '0') + '.jpg'); try { await p.screenshot({ path: f, type: 'jpeg', quality: 90 }); quadros.push({ f, t: Date.now() - t0 }); } catch { } } })();
  await roteiro(rot => marcas.push({ t: (Date.now() - t0) / 1000, rot }));
  rodando = false; await loop;
  // concat do ffmpeg com a duração real de cada quadro
  const lista = quadros.map((q, i) => `file '${q.f}'\nduration ${(((quadros[i + 1]?.t ?? q.t + 100) - q.t) / 1000).toFixed(3)}`).join('\n') + `\nfile '${quadros[quadros.length - 1].f}'\n`;
  fs.writeFileSync(path.join(dir, 'lista.txt'), lista);
  const saida = path.join(IMG, nome + '.webm');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'lista.txt'), '-vf', `fps=25,scale=${W}:${H}`, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '34', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '4', '-pix_fmt', 'yuv420p', '-an', saida]);
  execFileSync('python3', ['-c', `from PIL import Image; Image.open(${JSON.stringify(quadros[0].f)}).convert('RGB').save(${JSON.stringify(path.join(IMG, nome + '.jpg'))}, quality=84)`]);
  const dur = quadros[quadros.length - 1].t / 1000;
  console.log('ok', nome + '.webm', dur.toFixed(1) + ' s', (fs.statSync(saida).size / 1e6).toFixed(1) + ' MB', JSON.stringify(marcas.map(m => [+m.t.toFixed(1), m.rot])));
  return { dur, marcas };
}

(async () => {
  const { iniciarServidor } = await import('./servidor.mjs');
  const srv = await iniciarServidor({ estatico: DIST }); const U = srv.url + '/app/index.html';
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: W, height: H } })).newPage();
  await p.goto(U); await p.waitForTimeout(800); await p.fill('#lg-chave', 'GP01'); await p.fill('#lg-senha', '1234'); await p.click('.lg-btn'); await p.waitForTimeout(700); await fecharAviso(p);
  await p.evaluate(async dia => { await abrirDia(dia); Relogio.simular('08:50'); if (!E.sugestoes.length) await carregarExemplo(dia); atualizarEstado(); rerender(); }, DIA);
  const ir = async h => { await p.goto(U + h); await p.waitForTimeout(500); await instalarExtras(p); };
  const timer = (restante, rodando = true) => p.evaluate(([r, on]) => { const P = UI.pres; P.restante = r; P.extra = 0; P.rodando = on; P.ult = Date.now(); atualizarTimer(); }, [restante, rodando]);
  const meta = {};

  /* 1) tempo esgotado (bloco 2 · COPROD) */
  await ir('#/apresentacao/2'); await cursor(p, 1500, 860); await p.waitForTimeout(3500);   // barra de comandos se recolhe
  meta.esgotado = await gravar(p, 'anim_tempo_esgotado', async marca => {
    marca('Cronômetro da tela correndo (tempo configurado para a COPROD)'); await timer(13); await p.waitForTimeout(4200);
    marca('Último minuto: o cronômetro fica amarelo'); await p.waitForTimeout(5600);
    marca('Passou do tempo: o estouro conta para cima (+)'); await p.waitForTimeout(3200);
    await faixa(p, '⏩ avanço de 50 s', 'para chegar a 1 minuto além do tempo'); await timer(-55); await p.waitForTimeout(1300); await faixa(p, '');
    marca('1 minuto além: o cronômetro pulsa em vermelho'); await p.waitForTimeout(6800);
    await faixa(p, '⏩ avanço de 50 s', 'para chegar a 2 minutos além do tempo'); await timer(-116); await p.waitForTimeout(1300); await faixa(p, '');
    await p.waitForTimeout(3600);
    marca('2 minutos além: tela branca de "Tempo esgotado", com o estouro correndo'); await p.waitForTimeout(5200);
    marca('Saídas: Zerar e voltar, +1 min ou Próximo bloco'); await p.waitForTimeout(800);
    await clicar(p, '#esg [data-act="zera"]'); await instalarExtras(p); await cursor(p, 1150, 640);
    marca('Zerar: volta à tela da reunião com o tempo da tela'); await p.waitForTimeout(3200);
  });

  /* 2) +1 min (bloco 3 · COEMB): três acréscimos por tela, fichas de orelhão ao lado do cronômetro */
  await ir('#/apresentacao/3'); await timer(28); await cursor(p, 800, 700); await p.waitForTimeout(600);
  meta.mais1 = await gravar(p, 'anim_mais1', async marca => {
    marca('Faltam poucos segundos para o fim do tempo da tela'); await cursor(p, 820, 820); await p.waitForTimeout(2600);
    marca('1º acréscimo: +1 min e a 1ª ficha fica dourada'); await clicar(p, '#ctrl [data-act="mais1"]'); await p.waitForTimeout(2600);
    marca('2º acréscimo: mais 1 minuto'); await clicar(p, '#ctrl [data-act="mais1"]'); await p.waitForTimeout(2600);
    marca('3º acréscimo: limite da tela, botão desabilitado'); await clicar(p, '#ctrl [data-act="mais1"]'); await p.waitForTimeout(2400);
    await cursor(p, 1360, 70); await p.waitForTimeout(1200);
    marca('As fichas mostram os acréscimos usados; o tempo medido guarda quantos foram'); await p.evaluate(() => { document.querySelector('#ctrl')?.classList.add('hide'); }); await p.waitForTimeout(3800);
  });
  fs.writeFileSync(path.join(IMG, 'anim_marcas.json'), JSON.stringify(meta, null, 1));
  await b.close(); await srv.fechar();
})();
