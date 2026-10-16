#!/usr/bin/env python3
"""REDIA P-83 · V1.0 · cadastro de usuários no Supabase a partir de um CSV.

Para cada linha do CSV (chave;nome;posto;admin):
  1. cria o usuário no Supabase Auth (e-mail técnico <chave>@<domínio>, já confirmado) com senha temporária;
  2. grava/atualiza o perfil na tabela public.perfis (coordenação deduzida do posto);
  3. escreve as senhas temporárias num CSV LOCAL para entrega individual (cada um troca no 1º acesso).

Uso (no computador do administrador, nunca no navegador nem no GitHub):
  python tools/provisionar_usuarios.py usuarios_P83.csv
  python tools/provisionar_usuarios.py usuarios_P83.csv --simular        (só mostra o que faria)
  python tools/provisionar_usuarios.py usuarios_P83.csv --redefinir      (gera senha nova para quem já existe)

Contas genéricas de teste (D-56), uma por posto, usadas por várias pessoas no período de testes:
  python tools/provisionar_usuarios.py tools/genericos_teste_P83.csv --compartilhado --senha-fixa
  --senha-fixa pede (sem mostrar) uma senha única para todas as linhas; não grava CSV de senhas.
  --compartilhado marca o perfil como conta compartilhada: o app não força nem oferece troca de senha.
  Por segurança, --compartilhado nunca altera um usuário que já existe e não é conta compartilhada.

Variáveis de ambiente:
  SUPABASE_URL                  https://<projeto>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY     chave secreta (Settings › API Keys: "secret" sb_secret_… ou a antiga service_role). Se faltar, o script pede.
  REDIA_EMAIL_DOMINIO           domínio técnico dos e-mails (padrão redia.local, igual ao config do app)
  REDIA_UEP                     UEP dos perfis (padrão P-83)
  REDIA_SENHA_FIXA              senha usada com --senha-fixa (se faltar, o script pede)

A chave service_role dá acesso total à base: não grave em arquivo, não envie por e-mail e não coloque no repositório.
Só usa a biblioteca padrão do Python 3.8+.
"""
import argparse, csv, datetime, getpass, json, os, secrets, string, sys, urllib.error, urllib.request

POSTO_COORD = {
    'GEOP': 'GEPLAT', 'GEPLAT': 'GEPLAT', 'GESTÃO': 'GEPLAT', 'GESTAO': 'GEPLAT',
    'COPROD': 'COPROD', 'SUPROD': 'COPROD', 'ENG PROCESSAMENTO': 'COPROD', 'ENG PETRÓLEO': 'COPROD', 'ENG PETROLEO': 'COPROD',
    'COEMB': 'COEMB', 'SUEMB': 'COEMB',
    'COMAN': 'COMAN', 'SUEIN': 'COMAN', 'SUMEC': 'COMAN', 'ENG ELETRICISTA': 'COMAN', 'ENG MECÂNICO': 'COMAN', 'ENG MECANICO': 'COMAN',
}
SIM = {'sim', 's', 'x', '1', 'true', 'admin'}


def senha_temporaria(n=12):
    alfa = string.ascii_letters + string.digits
    while True:
        s = ''.join(secrets.choice(alfa) for _ in range(n))
        if any(c.isdigit() for c in s) and any(c.isalpha() for c in s):
            return s


class Supabase:
    def __init__(self, url, chave):
        self.url, self.chave = url.rstrip('/'), chave

    def req(self, metodo, rota, corpo=None, extra=None):
        h = {'apikey': self.chave, 'Content-Type': 'application/json'}
        if not self.chave.startswith('sb_'):          # chave antiga (JWT service_role) também vai no Authorization
            h['Authorization'] = 'Bearer ' + self.chave
        h.update(extra or {})
        dados = json.dumps(corpo).encode() if corpo is not None else None
        r = urllib.request.Request(self.url + rota, data=dados, method=metodo, headers=h)
        try:
            with urllib.request.urlopen(r, timeout=30) as resp:
                txt = resp.read().decode() or 'null'
                return resp.status, json.loads(txt)
        except urllib.error.HTTPError as e:
            txt = e.read().decode()
            try:
                return e.code, json.loads(txt)
            except ValueError:
                return e.code, {'msg': txt}

    def achar_usuario(self, email):
        pagina = 1
        while True:
            st, o = self.req('GET', f'/auth/v1/admin/users?page={pagina}&per_page=1000')
            if st != 200:
                raise RuntimeError(f'listar usuários: {st} {o}')
            us = o.get('users', []) if isinstance(o, dict) else o
            for u in us:
                if (u.get('email') or '').lower() == email.lower():
                    return u
            if len(us) < 1000:
                return None
            pagina += 1


def ler_csv(arq):
    with open(arq, encoding='utf-8-sig', newline='') as f:
        amostra = f.read(2048); f.seek(0)
        sep = ';' if amostra.count(';') >= amostra.count(',') else ','
        linhas = []
        for i, l in enumerate(csv.DictReader(f, delimiter=sep), start=2):
            l = {(k or '').strip().lower(): (v or '').strip() for k, v in l.items()}
            chave, nome, posto = l.get('chave', '').upper(), l.get('nome', ''), l.get('posto', '').upper()
            if not chave and not nome:
                continue
            if len(chave) != 4 or not chave.isalnum():
                sys.exit(f'Linha {i}: chave inválida "{chave}" (4 letras/números).')
            if len(nome) < 2 or not posto:
                sys.exit(f'Linha {i}: informe nome e posto.')
            if posto not in POSTO_COORD:
                print(f'  aviso linha {i}: posto "{posto}" não reconhecido → coordenação GEPLAT')
            linhas.append({'chave': chave, 'nome': nome, 'posto': posto, 'coord': POSTO_COORD.get(posto, 'GEPLAT'),
                           'admin': l.get('admin', '').lower() in SIM})
    if len({x['chave'] for x in linhas}) != len(linhas):
        sys.exit('Há chaves repetidas no CSV.')
    return linhas


def main():
    a = argparse.ArgumentParser(description='Cadastra usuários da REDIA no Supabase')
    a.add_argument('csv', help='CSV com colunas chave;nome;posto;admin')
    a.add_argument('--simular', action='store_true', help='não grava nada; só mostra')
    a.add_argument('--redefinir', action='store_true', help='gera senha temporária nova também para quem já existe')
    a.add_argument('--saida', help='CSV de senhas temporárias (padrão: senhas_temporarias_<data>.csv)')
    a.add_argument('--compartilhado', action='store_true', help='contas genéricas de teste: sem troca de senha; não altera usuários pessoais existentes')
    a.add_argument('--senha-fixa', action='store_true', help='usa a mesma senha (digitada) para todas as linhas')
    x = a.parse_args()

    linhas = ler_csv(x.csv)
    dominio = os.environ.get('REDIA_EMAIL_DOMINIO', 'redia.local').strip()
    uep = os.environ.get('REDIA_UEP', 'P-83').strip()
    print(f'{len(linhas)} usuário(s) · UEP {uep} · e-mails <chave>@{dominio}')
    if x.simular:
        for l in linhas:
            print(f"  {l['chave']}  {l['posto']:<18} → {l['coord']:<6} {'admin' if l['admin'] else ''}  {l['nome']}")
        return
    url = os.environ.get('SUPABASE_URL') or input('SUPABASE_URL: ').strip()
    chave = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or getpass.getpass('Chave service_role (não aparece ao digitar): ').strip()
    sb = Supabase(url, chave)
    fixa = None
    if x.senha_fixa:
        fixa = os.environ.get('REDIA_SENHA_FIXA') or getpass.getpass('Senha única para estes usuários (não aparece): ')
        if not os.environ.get('REDIA_SENHA_FIXA') and getpass.getpass('Repita a senha: ') != fixa:
            sys.exit('As senhas não conferem.')
        if len(fixa) < 8 or not any(c.isdigit() for c in fixa) or not any(c.isalpha() for c in fixa):
            sys.exit('A senha precisa ter ao menos 8 caracteres, com letras e números.')
    senhas, falhas = [], 0
    for l in linhas:
        email = f"{l['chave'].lower()}@{dominio}"
        senha = fixa or senha_temporaria()
        st, o = sb.req('POST', '/auth/v1/admin/users', {'email': email, 'password': senha, 'email_confirm': True, 'user_metadata': {'chave': l['chave']}})
        novo = st in (200, 201)
        if novo:
            uid = o.get('id') or o.get('user', {}).get('id')
        elif st == 422 or 'already' in json.dumps(o).lower():
            u = sb.achar_usuario(email)
            if not u:
                print(f"  {l['chave']}: ERRO usuário existe mas não foi encontrado"); falhas += 1; continue
            uid = u['id']
            if x.compartilhado:
                st3, o3 = sb.req('GET', f'/rest/v1/perfis?user_id=eq.{uid}&select=compartilhado')
                if st3 == 200 and o3 and not o3[0].get('compartilhado'):
                    print(f"  {l['chave']}: IGNORADO · já existe um usuário pessoal com esta chave (escolha outra chave genérica)"); falhas += 1; continue
            if x.redefinir:
                st2, o2 = sb.req('PUT', f'/auth/v1/admin/users/{uid}', {'password': senha})
                if st2 not in (200, 201):
                    print(f"  {l['chave']}: ERRO ao redefinir senha: {st2} {o2}"); falhas += 1; continue
            else:
                senha = None
        else:
            print(f"  {l['chave']}: ERRO ao criar usuário: {st} {o}"); falhas += 1; continue
        perfil = {'user_id': uid, 'chave': l['chave'], 'nome': l['nome'], 'posto': l['posto'], 'coord': l['coord'], 'uep': uep, 'admin': l['admin'], 'ativo': True}
        if senha:
            perfil['trocar_senha'] = not x.compartilhado
        if x.compartilhado:
            perfil['compartilhado'] = True
            perfil['trocar_senha'] = False
        st, o = sb.req('POST', '/rest/v1/perfis?on_conflict=user_id', perfil, {'Prefer': 'resolution=merge-duplicates,return=minimal'})
        if st not in (200, 201, 204):
            print(f"  {l['chave']}: ERRO ao gravar perfil: {st} {o}"); falhas += 1; continue
        print(f"  {l['chave']}: {'criado' if novo else 'atualizado'} · {l['coord']}{' · admin' if l['admin'] else ''}{(' · senha única definida' if fixa else ' · senha temporária gerada') if senha else ''}{' · conta compartilhada' if x.compartilhado else ''}")
        if senha and not fixa:
            senhas.append((l['chave'], l['nome'], senha))
    if senhas:
        saida = x.saida or f'senhas_temporarias_{datetime.date.today().isoformat()}.csv'
        with open(saida, 'w', encoding='utf-8-sig', newline='') as f:
            w = csv.writer(f, delimiter=';'); w.writerow(['chave', 'nome', 'senha_temporaria'])
            w.writerows(senhas)
        print(f'\nSenhas temporárias em {saida}: entregue a cada pessoa individualmente e APAGUE o arquivo depois.')
    print(f'Concluído: {len(linhas) - falhas} ok, {falhas} com erro.')
    sys.exit(1 if falhas else 0)


if __name__ == '__main__':
    main()
