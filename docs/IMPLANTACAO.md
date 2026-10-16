# Implantação da REDIA V1.0

Tempo estimado: 40 minutos na primeira vez. Os nomes dos menus do Supabase e do GitHub podem mudar um pouco entre versões dos painéis.

## 1. Base de dados (Supabase)

1. Em <https://supabase.com>, crie uma organização e um projeto:
   - nome: `redia-p83`;
   - região: **South America (São Paulo)**;
   - senha do banco: forte, guardada pelo administrador.
2. No projeto, abra **SQL Editor › New query**:
   - cole todo o conteúdo de `supabase/01_schema.sql` e clique em **Run**;
   - repita com `supabase/02_storage.sql`.

   Os dois arquivos podem ser rodados de novo sem problema.
3. Em **Authentication › Sign In / Providers**:
   - **desligue** "Allow new users to sign up". Só o administrador cadastra usuários. Mesmo que alguém se cadastre, sem perfil não lê nem grava nada;
   - no provedor **Email**, defina o mínimo de **8 caracteres** e, se houver a opção, exija letras e números;
   - a confirmação por e-mail pode ficar ligada: o script já cria os usuários confirmados e nenhum e-mail é enviado.
4. Em **Project Settings › API Keys**, anote:
   - **Project URL** (`https://xxxx.supabase.co`);
   - chave pública **anon** ou **publishable**: vai no app;
   - chave **secret** (ou a antiga service_role): só para o script de cadastro, no computador do administrador. **Nunca** coloque essa chave no GitHub, no app ou em e-mail.

## 2. Usuários

O login usa a **chave Petrobras** (4 caracteres). Por baixo, cada usuário do Supabase Auth tem um e-mail técnico `<chave>@redia.local`, que nunca recebe mensagens. Nome, posto, coordenação e UEP ficam na tabela `perfis`.

### Opção A · script em lote (recomendado)

1. Copie `supabase/usuarios_modelo.csv` para um arquivo **fora do repositório**, por exemplo `usuarios_P83.csv`. O `.gitignore` já bloqueia `usuarios_*.csv`.
2. Preencha uma linha por pessoa:
   - colunas `chave;nome;posto;admin`;
   - postos reconhecidos: GEOP, GEPLAT, GESTÃO, COPROD, SUPROD, ENG PROCESSAMENTO, ENG PETRÓLEO, COEMB, SUEMB, COMAN, SUEIN, SUMEC, ENG ELETRICISTA, ENG MECÂNICO;
   - `admin=sim` para quem administra (pode carregar dados de exemplo, simular horário e importar registros).
3. Confira antes de gravar:
   ```bash
   python tools/provisionar_usuarios.py usuarios_P83.csv --simular
   ```
4. Grave:
   ```bash
   export SUPABASE_URL=https://xxxx.supabase.co
   python tools/provisionar_usuarios.py usuarios_P83.csv
   ```
   - A chave secreta é pedida sem aparecer na tela.
   - O script gera `senhas_temporarias_<data>.csv`: entregue a senha a cada pessoa **individualmente** e apague o arquivo.
   - No primeiro acesso, o app obriga a trocar a senha temporária.
5. Use as opções conforme a situação:
   - para incluir pessoas depois, rode de novo com o CSV atualizado (quem já existe só tem o perfil atualizado);
   - para gerar senha nova para todos, use `--redefinir`.

### Opção B · manual pelo painel

Siga `supabase/03_perfis_modelo.sql`: crie o usuário em *Authentication › Users › Add user* e depois rode `select public.redia_vincular_perfil(...)` no SQL Editor.

### Manutenção

```sql
-- desativar quem saiu da unidade (os registros antigos mantêm a autoria)
update public.perfis set ativo = false where chave = 'ABC1';
-- obrigar nova troca de senha
update public.perfis set trocar_senha = true where chave = 'ABC1';
```

## 3. Publicação no GitHub Pages

1. No repositório do GitHub (`fabriciomartini/REDIA`), suba o conteúdo desta pasta:
   ```bash
   git clone https://github.com/fabriciomartini/REDIA.git && cd REDIA
   # copie aqui o conteúdo do pacote
   git add . && git commit -m "REDIA P-83 V1.0"
   git push origin main
   ```
2. Em **Settings › Pages › Build and deployment › Source**, escolha **GitHub Actions**.
3. Em **Settings › Secrets and variables › Actions › aba Variables**, crie:

   | Variável | Valor |
   |---|---|
   | `SUPABASE_URL` | `https://xxxx.supabase.co` |
   | `SUPABASE_ANON_KEY` | chave pública anon/publishable |
   | `REDIA_EMAIL_DOMINIO` | (opcional) só se mudar o padrão `redia.local` |
   | `REDIA_SEM_EXEMPLO` | (opcional) `1` para publicar sem os dados de exemplo |

4. Em **Actions › Publicar no GitHub Pages › Run workflow** (ou num novo push), o endereço aparece no resumo da execução: `https://fabriciomartini.github.io/REDIA/` (página inicial; o app fica em `/app/` e o deck em `/apresentacao/`). O deck de explicação do sistema fica em `https://fabriciomartini.github.io/REDIA/apresentacao/`.

> **Plano do GitHub:** no GitHub Free, o Pages só publica repositório público. Repositório privado com Pages exige plano pago, e restringir quem acessa o site só é possível no GitHub Enterprise Cloud. Confirme com a TIC o plano corporativo. A chave anon é pública por desenho: a proteção dos dados está no login e nas políticas de acesso da base (RLS), não no sigilo do site.

## 4. Primeiro teste

1. Abra o endereço e entre com a chave de um administrador e a senha temporária. Troque a senha quando o app pedir.
2. No **Início**, confira o painel **Base de dados** (Supabase) e o cabeçalho ("Nuvem · sincronizado hh:mm:ss").
3. (Administrador ou GEPLAT) Clique em **Carregar dados de exemplo**. Os registros ficam gravados na base, marcados como exemplo.
4. Em outro computador ou navegador, entre com outra chave: os mesmos dados aparecem.
5. Siga o [roteiro de testes](ROTEIRO_TESTES.md).

Para limpar dados de exemplo ou de teste (só o administrador da base, no SQL Editor):

```sql
delete from public.registros where uep = 'P-83' and payload->>'exemplo' = 'true';
-- tudo de um dia de teste:
delete from public.registros where uep = 'P-83' and data = '2026-10-14';
```

## 5. Hospedagem na rede interna (TIC)

O app é um conjunto de **arquivos estáticos**: não precisa de servidor de aplicação, Node, Python nem banco local.

1. Monte com as chaves:
   ```bash
   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_ANON_KEY=... python build.py
   ```
2. Copie a pasta `dist/` para qualquer servidor web (IIS, Apache, nginx ou SharePoint/servidor de arquivos com publicação HTTP).
3. Requisitos:
   - **HTTPS** no endereço interno;
   - saída liberada do navegador dos usuários para `https://xxxx.supabase.co` e `wss://xxxx.supabase.co` (o tempo real usa WebSocket; sem ele, o app segue com leitura a cada 15 s);
   - tipos MIME `.webm` (`video/webm`) e `.js` (`text/javascript`).
4. Cabeçalhos HTTP recomendados no servidor interno. O CSP já vem numa meta tag do `index.html`, mas `frame-ancestors` só vale como cabeçalho:
   ```
   Content-Security-Policy: frame-ancestors 'self'
   X-Content-Type-Options: nosniff
   Referrer-Policy: no-referrer
   ```
5. **Base também interna:** o Supabase pode ser instalado na infraestrutura da Petrobras (versão auto-hospedada em Docker). Basta rodar os mesmos SQL e montar o app com a `SUPABASE_URL` interna. Para `http`, o `build.py` só aceita `localhost`; use HTTPS.
6. **Arquivo único:** `python build.py --unico` gera `dist-unico/redia.html` com tudo embutido. Serve para homologação rápida ou para distribuir por pasta de rede, mas também precisa de HTTPS ou abertura local no Edge/Chrome.

## 6. Atualizar a versão

- **GitHub:** faça commit e push na `main`; o workflow publica em cerca de 1 minuto.
- **Servidor interno:** rode `build.py` de novo e substitua a pasta `dist/`. Os arquivos `app.js` e `app.css` levam um código de versão no endereço, então os navegadores não ficam com a versão antiga em cache.
- **Mudança na base:** rode o SQL atualizado no SQL Editor. Os scripts são idempotentes e não apagam dados.
