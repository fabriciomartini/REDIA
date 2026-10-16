# Ligar a REDIA ao Supabase (trabalho conjunto das coordenações)

Tempo: cerca de 20 minutos. Ao final, o site `https://fabriciomartini.github.io/REDIA/` deixa o modo demonstração. Todos passam a gravar na mesma base, com login individual.

## 1. Criar o projeto (5 min)

1. Entre em <https://supabase.com/dashboard> (pode usar a conta do GitHub) e clique em **New project**.
2. Preencha:
   - **Name:** `redia-p83`;
   - **Database password:** gere uma senha forte e guarde com você;
   - **Region:** **South America (São Paulo)**.
3. Clique em **Create new project** e aguarde 1 a 2 minutos, até o painel abrir.

## 2. Instalar a base (2 min)

1. No menu lateral, abra **SQL Editor** › **New query**.
2. No GitHub, abra `supabase/00_instalar_tudo.sql`, clique em **Raw**, selecione tudo e copie.
3. Cole no editor do Supabase e clique em **Run**. Deve aparecer "Success. No rows returned".
4. Confira em **Table Editor**: devem existir as tabelas `perfis`, `registros`, `uep_config` e `uep_config_hist`.

## 3. Fechar o cadastro público (1 min)

1. Abra **Authentication** › **Sign In / Providers**.
2. Desligue **Allow new users to sign up** e salve.
3. Ainda em **Sign In / Providers**, no provedor **Email**, se houver o campo, defina **Minimum password length = 8**.

## 4. Ligar o site à base (3 min)

1. No Supabase, abra **Project Settings** › **API Keys**. Mantenha a aba aberta.
2. No GitHub, abra **REDIA** › **Settings** › **Secrets and variables** › **Actions** › aba **Variables** › **New repository variable** e crie as duas variáveis:

   | Nome | Valor (do Supabase) |
   |---|---|
   | `SUPABASE_URL` | **Project URL**, no formato `https://xxxxxxxx.supabase.co` |
   | `SUPABASE_ANON_KEY` | chave **anon public** ou **publishable** |

   > Nunca use a chave **secret** / **service_role** no GitHub. A montagem recusa essa chave.

3. Abra **Actions** › **Publicar no GitHub Pages** › **Run workflow**. Ou peça ao Claude para publicar.

## 5. Cadastrar os usuários

Cada pessoa precisa de **dois cadastros**: um usuário no Auth e um perfil na REDIA. Escolha uma das opções abaixo.

### Opção A · pelo painel (sem instalar nada; bom para começar com poucas pessoas)

Para cada pessoa:

1. Abra **Authentication** › **Users** › **Add user** › **Create new user** e preencha:
   - **Email:** `chave@redia.local`, com a chave em minúsculas (ex.: `urpq@redia.local`);
   - **Password:** uma senha temporária, que a pessoa troca no primeiro acesso;
   - marque **Auto Confirm User**.
2. No **SQL Editor**, rode uma linha por pessoa:

   ```sql
   select public.redia_vincular_perfil('urpq@redia.local', 'URPQ', 'Nome Sobrenome', 'COPROD', 'P-83', true);  -- true = administrador
   select public.redia_vincular_perfil('abc1@redia.local', 'ABC1', 'Nome Sobrenome', 'SUEMB',  'P-83');
   ```

   Postos aceitos: GEOP, GEPLAT, GESTÃO, COPROD, SUPROD, ENG PROCESSAMENTO, ENG PETRÓLEO, COEMB, SUEMB, COMAN, SUEIN, SUMEC, ENG ELETRICISTA, ENG MECÂNICO. A coordenação sai do posto.

**Para o piloto, cadastre ao menos:** 1 GEPLAT (administrador), 1 COPROD, 1 COEMB e 1 COMAN.

### Opção B · em lote pelo script (todos de uma vez)

No seu computador, com Python 3 instalado:

```bash
git clone https://github.com/fabriciomartini/REDIA.git && cd REDIA
python tools/provisionar_usuarios.py usuarios_P83_PRIVADO.csv --simular   # confere o mapa posto → coordenação
set SUPABASE_URL=https://xxxxxxxx.supabase.co                             # no Mac/Linux: export SUPABASE_URL=...
python tools/provisionar_usuarios.py usuarios_P83_PRIVADO.csv
```

- O script pede a chave **secret** (Project Settings › API Keys), sem mostrá-la na tela. Ela fica só no seu computador.
- No fim, gera `senhas_temporarias_<data>.csv`. Entregue a senha a cada pessoa individualmente e apague o arquivo.
- Não suba o CSV de usuários nem o de senhas para o GitHub. O `.gitignore` já bloqueia os dois.

## 6. Primeiro teste conjunto (5 min)

1. Abra o site, clique em **Entrar no app** e entre com a chave do administrador e a senha temporária. Troque a senha quando o app pedir.
2. O Início deve mostrar o painel **Base de dados · Supabase**, e o cabeçalho, "Nuvem · sincronizado hh:mm:ss · tempo real".
3. Clique em **Carregar dados de exemplo**. Só o administrador e o GEPLAT veem esse botão.
4. Em outro computador ou celular, entre com a chave de um coordenador. Os mesmos dados devem aparecer.
5. O coordenador aprova uma sugestão. Em segundos, ela aparece na tela do administrador.
6. Continue pelo roteiro em `docs/ROTEIRO_TESTES.md`.

## Se algo não funcionar

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Site continua em "Modo demonstração" | Variáveis não criadas ou publicação não refeita | Conferir o passo 4 e rodar o workflow de novo |
| "Chave ou senha incorreta" | E-mail do usuário diferente de `chave@redia.local` ou senha errada | Conferir em Authentication › Users |
| "Sua chave não tem perfil ativo na REDIA" | Faltou o `redia_vincular_perfil` | Rodar o SQL do passo 5A |
| "Sem conexão com a base de dados" | Rede corporativa bloqueando `*.supabase.co` | Testar fora da rede Petrobras e pedir liberação à TIC |
| Cabeçalho sem "tempo real" | WebSocket bloqueado pelo proxy | O app segue funcionando, com atualização a cada 15 s |
| Projeto pausado | Plano gratuito pausa após cerca de 7 dias sem uso | Supabase › projeto › **Resume project** |

Para limpar os dados de teste:

- **No app (v1.1):** o administrador clica em **Resetar demonstração** no Início e confirma digitando RESETAR. Apaga todos os registros da UEP; perfis, senhas e configuração ficam.
- **No SQL Editor**, só o exemplo:

```sql
delete from public.registros where uep = 'P-83' and payload->>'exemplo' = 'true';
```

> Atualização para a v1.1: rode de novo o `supabase/00_instalar_tudo.sql` (é idempotente). Ele cria a função `redia_resetar`.

> Use só dados de exemplo até a aprovação da TIC/SI para dados operacionais reais (docs/SEGURANCA.md).
