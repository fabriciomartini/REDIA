#!/usr/bin/env python3
"""REDIA Búzios · V1.0 · montagem do app.

Uso:
  python build.py                 → dist/          versão web (GitHub Pages / servidor interno)
  python build.py --unico         → dist-unico/redia.html   arquivo único (tudo embutido)
  python build.py --saida pasta   → muda a pasta de saída

Conexão com o Supabase (sem ela, o app abre em modo demonstração):
  variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY (opcionais: REDIA_EMAIL_DOMINIO, REDIA_TEMPO_REAL=0)
  ou o arquivo config.local.json na raiz (não versionado), no formato de config.example.json.
  REDIA_SEM_EXEMPLO=1 retira os dados de exemplo (derivados de material da P-75) da montagem.
Só usa a biblioteca padrão do Python 3.8+.
"""
import re
import argparse, base64, hashlib, json, os, shutil, sys
from urllib.parse import urlparse

P = os.path.dirname(os.path.abspath(__file__))
VENDOR_SUPABASE = 'supabase-2.112.4.min.js'
FONTES_JS = ['core.js', 'nuvem.js', 'model.js', 'captura.js', 'stage.js', 'detalhe.js', 'ata_pdf.js', 'admin.js', 'studio.js', 'views.js']
VENDOR_PDF = ['modern-screenshot-4.7.0.umd.js', 'jspdf-4.2.1.umd.min.js', 'jspdf-autotable-5.0.7.min.js']   # ata em PDF (D-55), carregados só ao gerar a ata


def ler(*partes, modo='r'):
    with open(os.path.join(P, *partes), modo, **({} if 'b' in modo else {'encoding': 'utf8'})) as f:
        return f.read()


def configuracao():
    cfg = {'supabaseUrl': '', 'supabaseAnonKey': '', 'emailDominio': 'redia.local', 'tempoReal': True}
    local = os.path.join(P, 'config.local.json')
    if os.path.exists(local):
        with open(local, encoding='utf8') as f:
            cfg.update({k: v for k, v in json.load(f).items() if not k.startswith('_')})
    env = {'SUPABASE_URL': 'supabaseUrl', 'SUPABASE_ANON_KEY': 'supabaseAnonKey', 'REDIA_EMAIL_DOMINIO': 'emailDominio'}
    for k, c in env.items():
        if os.environ.get(k):
            cfg[c] = os.environ[k].strip()
    if os.environ.get('REDIA_TEMPO_REAL') is not None and os.environ.get('REDIA_TEMPO_REAL') != '':
        cfg['tempoReal'] = os.environ['REDIA_TEMPO_REAL'] not in ('0', 'false', 'nao', 'não')
    cfg['supabaseUrl'] = cfg['supabaseUrl'].rstrip('/')
    if cfg['supabaseUrl']:
        u = urlparse(cfg['supabaseUrl'])
        if u.scheme not in ('https', 'http') or not u.netloc:
            sys.exit('SUPABASE_URL inválida: ' + cfg['supabaseUrl'])
        if u.scheme == 'http' and u.hostname not in ('127.0.0.1', 'localhost'):
            sys.exit('Use https na SUPABASE_URL (http só para testes locais).')
        if not cfg['supabaseAnonKey']:
            sys.exit('Falta SUPABASE_ANON_KEY (chave pública "anon"). Nunca use a chave service_role no app.')
        if cfg['supabaseAnonKey'].startswith('sb_secret_') or 'service_role' in _payload_jwt(cfg['supabaseAnonKey']):
            sys.exit('A chave informada é a service_role. Use a chave pública "anon"/"publishable".')
    return cfg


def _payload_jwt(chave):
    try:
        p = chave.split('.')[1]
        return base64.urlsafe_b64decode(p + '=' * (-len(p) % 4)).decode('utf8', 'ignore')
    except Exception:
        return ''


def csp(cfg, unico):
    conn = "'self'"   # 'self': a captura das telas da ata (D-55) lê as imagens do próprio site
    if cfg['supabaseUrl']:
        u = urlparse(cfg['supabaseUrl'])
        ws = ('wss' if u.scheme == 'https' else 'ws') + '://' + u.netloc
        conn = f"'self' {u.scheme}://{u.netloc} {ws}"
    if unico:
        return (f"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; "
                f"frame-src 'self' blob:; media-src blob: data:; connect-src {conn}; base-uri 'none'; form-action 'none'")
    return (f"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; "
            f"frame-src 'self' blob:; media-src 'self' blob: data:; connect-src {conn}; manifest-src 'self'; base-uri 'none'; form-action 'none'")


ICONE = "data:image/svg+xml," + "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23008542'/%3E%3Cpath d='M18 50V14h16c8 0 12 4 12 11 0 5-3 9-8 10l9 15h-8l-8-14h-6v14z M25 30h8c4 0 6-2 6-5s-2-5-6-5h-8z' fill='%23fff'/%3E%3Crect x='18' y='54' width='28' height='4' fill='%23FDC82F'/%3E%3C/svg%3E"


def gerar_gerador_ata():
    """D-75: supabase/functions/redia-ata-auto/gerador.js = core.js + model.js do app como módulo, sem navegador (Deno)."""
    cab = ("// GERADO por build.py a partir de src/core.js e src/model.js (D-75) · não editar à mão\n"
           "// Roda na Edge Function redia-ata-auto: o mesmo gerador de dados fictícios do app, sem navegador.\n"
           "const window = globalThis; const location = { search: '' };\n")
    fim = ("\nexport function gerarAtaAutomatica(uep, cfg, iso, regsDia) {\n"
           "  CFG = mesclarCfg(cfg || {}); CFG.uep = uep;\n"
           "  return montarAtaAutomatica(iso, regsDia || []);\n}\n")
    txt = cab + ler('src', 'core.js') + '\n' + ler('src', 'model.js') + fim
    destino = os.path.join(P, 'supabase', 'functions', 'redia-ata-auto', 'gerador.js')
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    if not os.path.exists(destino) or open(destino, encoding='utf-8').read() != txt:
        with open(destino, 'w', encoding='utf-8') as f: f.write(txt)


def montar(saida, unico):
    cfg = configuracao()
    nuvem = bool(cfg['supabaseUrl'])
    css = ler('src', 'app.css')
    js = '\n'.join(ler('src', f) for f in FONTES_JS)
    sem_exemplo = os.environ.get('REDIA_SEM_EXEMPLO', '') not in ('', '0', 'false')
    if sem_exemplo:   # site sem os dados de exemplo (derivados de material da P-75)
        i, j = js.index('/* EXEMPLO-INICIO */'), js.index('/* EXEMPLO-FIM */') + len('/* EXEMPLO-FIM */')
        js = js[:i] + "const EXEMPLO_DISPONIVEL = false;\nfunction montarExemplo() { return []; }\nasync function carregarExemplo() { throw new Error('Dados de exemplo não incluídos nesta montagem.'); }\nfunction montarAtaAutomatica() { return []; }" + js[j:]
    gerar_gerador_ata()   # D-75: módulo da ata automática para a Edge Function (mesmo código do app)
    cfg_js = 'window.REDIA_CONFIG = ' + json.dumps(cfg, ensure_ascii=False) + ';\n'
    supa = ler('vendor', VENDOR_SUPABASE) if nuvem else ''
    head = f'''<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="{csp(cfg, unico)}">
<meta name="referrer" content="no-referrer">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#008542">
<title>REDIA Búzios</title>
<link rel="icon" href="{ICONE}">'''
    if os.path.isdir(saida):
        shutil.rmtree(saida)
    os.makedirs(saida)
    if unico:
        b64 = lambda f: base64.b64encode(ler('assets', f, modo='rb')).decode()
        midia = (f'<script type="application/octet-stream" id="redia-poster">{b64("poster.jpg")}</script>\n'
                 f'<script type="application/octet-stream" id="redia-marca">{b64("petrobras.png")}</script>\n'
                 f'<script type="application/octet-stream" id="redia-video">{b64("intro.webm")}</script>')
        html = f'''<!doctype html>
<html lang="pt-BR">
<head>
{head}
<style>
{css}
</style>
</head>
<body>
<div id="app"></div>
<div id="toasts" aria-live="polite"></div>
{midia}
<script>
{cfg_js}</script>
{f"<script>{chr(10)}{supa}{chr(10)}</script>" if nuvem else ""}
{''.join(f"<script>{chr(10)}{ler('vendor', v)}{chr(10)}</script>" for v in VENDOR_PDF)}
<script>
{js}
</script>
</body>
</html>
'''
        dest = os.path.join(saida, 'redia.html')
        with open(dest, 'w', encoding='utf8') as f:
            f.write(html)
        print(f'{dest}  {len(html.encode()) // 1024} kB  ·  {"nuvem: " + cfg["supabaseUrl"] if nuvem else "modo demonstração"}')
        return
    v = hashlib.sha256((css + js + cfg_js).encode()).hexdigest()[:10]
    html = f'''<!doctype html>
<html lang="pt-BR">
<head>
{head}
<link rel="stylesheet" href="app.css?v={v}">
<link rel="preload" as="image" href="assets/poster.jpg">
</head>
<body>
<div id="app"></div>
<div id="toasts" aria-live="polite"></div>
<noscript><p style="font:16px Arial;padding:24px">A REDIA precisa de JavaScript habilitado no navegador.</p></noscript>
<script src="config.js?v={v}"></script>
{f'<script src="vendor/{VENDOR_SUPABASE}"></script>' if nuvem else ''}
<script src="app.js?v={v}"></script>
</body>
</html>
'''
    app = os.path.join(saida, 'app')   # o app fica em <site>/app/; a raiz abre a página inicial (landing)
    os.makedirs(app)
    arquivos = {'index.html': html, 'app.css': css, 'app.js': "/* REDIA Búzios · gerado por build.py */\n" + js, 'config.js': cfg_js}
    for nome, conteudo in arquivos.items():
        with open(os.path.join(app, nome), 'w', encoding='utf8') as f:
            f.write(conteudo)
    shutil.copytree(os.path.join(P, 'assets'), os.path.join(app, 'assets'))
    os.makedirs(os.path.join(app, 'vendor'))
    for v in VENDOR_PDF + ([VENDOR_SUPABASE] if nuvem else []):
        shutil.copy(os.path.join(P, 'vendor', v), os.path.join(app, 'vendor', v))
    versao = re.search(r"versao:\s*'([^']+)'", ler('src', 'core.js')).group(1)
    landing = ler('landing', 'index.html').replace('{{VERSAO}}', versao).replace('{{MODO}}', 'Base de dados na nuvem · login individual' if nuvem else 'Modo demonstração')
    raiz = {'index.html': landing, 'robots.txt': 'User-agent: *\nDisallow: /\n', '.nojekyll': ''}
    for nome, conteudo in raiz.items():
        with open(os.path.join(saida, nome), 'w', encoding='utf8') as f:
            f.write(conteudo)
    for nome in os.listdir(os.path.join(P, 'landing')):
        if nome != 'index.html':
            shutil.copy(os.path.join(P, 'landing', nome), os.path.join(saida, nome))
    if os.path.isdir(os.path.join(P, 'apresentacao')):   # deck de explicação do sistema, publicado em <site>/apresentacao/
        shutil.copytree(os.path.join(P, 'apresentacao'), os.path.join(saida, 'apresentacao'))
        shutil.copytree(os.path.join(P, 'assets'), os.path.join(saida, 'apresentacao', 'assets'))   # marca, imagem e vídeo da capa: o deck não depende do caminho do app
    total = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(saida) for f in fs)
    print(f'{saida}/  {total // 1024} kB  ·  {"nuvem: " + cfg["supabaseUrl"] if nuvem else "modo demonstração"}{"  ·  sem dados de exemplo" if sem_exemplo else ""}')


if __name__ == '__main__':
    a = argparse.ArgumentParser(description='Monta a REDIA Búzios V1.0')
    a.add_argument('--unico', action='store_true', help='gera um único arquivo HTML com tudo embutido')
    a.add_argument('--saida', help='pasta de saída (padrão: dist ou dist-unico)')
    x = a.parse_args()
    montar(os.path.abspath(x.saida or os.path.join(P, 'dist-unico' if x.unico else 'dist')), x.unico)
