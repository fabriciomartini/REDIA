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

### Contas genéricas de teste (uma por posto)

Para o período de testes e demonstração há uma conta genérica por posto, em `tools/genericos_teste_P83.csv`:

| Chave | Posto | Coordenação |
|---|---|---|
| TGEO | GEOP | GEPLAT |
| TGPL | GEPLAT | GEPLAT |
| TCPR | COPROD | COPROD |
| TCMN | COMAN | COMAN |
| TCEB | COEMB | COEMB |
| TSPR | SUPROD (supervisor) | COPROD |
| TSEB | SUEMB (supervisor) | COEMB |
| TSEI | SUEIN (supervisor) | COMAN |
| TSMC | SUMEC (supervisor) | COMAN |

No seu computador, na pasta do REDIA:

```bash
export SUPABASE_URL=https://xxxxxxxx.supabase.co        # no Windows: set SUPABASE_URL=...
python tools/provisionar_usuarios.py tools/genericos_teste_P83.csv --compartilhado --senha-fixa
```

- O script pede a chave **secret** e a **senha única** (duas vezes), sem mostrá-las. A senha não fica em arquivo nem no repositório; distribua-a só a quem vai testar.
- Contas compartilhadas não pedem troca de senha nem mostram "Alterar senha" (a senha é comum a todos do posto).
- Se alguma chave já pertencer a um usuário pessoal, o script não mexe nela e avisa.

## 6. Primeiro teste conjunto (5 min)

1. Abra o site, clique em **Entrar no app** e entre com a chave do administrador e a senha temporária. Troque a senha quando o app pedir.
2. O Início deve mostrar o painel **Base de dados · Supabase**, e o cabeçalho, "Nuvem · sincronizado hh:mm:ss · tempo real".
3. Clique em **Carregar dados de exemplo**. Só o administrador e o GEPLAT veem esse botão.
4. Em outro computador ou celular, entre com a chave de um coordenador. Os mesmos dados devem aparecer.
5. O coordenador aprova uma sugestão. Em segundos, ela aparece na tela do administrador.
6. Continue pelo roteiro em `docs/ROTEIRO_TESTES.md`.

## 7. Esqueci a senha (envio da senha temporária ao administrador)

Na tela de acesso, **Esqueci a senha** pede a chave. A função do servidor gera uma senha temporária e a **envia ao e-mail do administrador**, que a repassa ao usuário. A senha só é trocada depois que o e-mail sai. Um pedido por chave a cada 15 minutos.

1. **Conta de envio (Resend, gratuita):** crie a conta em <https://resend.com> com o **mesmo e-mail que vai receber as senhas**. Sem domínio próprio, o Resend só entrega para o e-mail da conta, o que basta aqui. Em **API Keys**, crie uma chave com permissão **Sending access**.
2. **Segredos no Supabase:** abra **Edge Functions** › **Secrets** e crie:
   - `RESEND_API_KEY` = a chave do Resend;
   - `REDIA_EMAIL_ADMIN` = o e-mail que recebe as senhas temporárias.
3. **Função:** em **Edge Functions** › **Deploy a new function** › **Via Editor**, use o nome `redia-recuperar-senha`, cole o conteúdo de `supabase/functions/redia-recuperar-senha/index.ts` e publique. Nos detalhes da função, **desligue "Verify JWT"**: a tela de acesso chama a função antes do login.
4. **Teste:** na tela de acesso, clique em **Esqueci a senha** e informe uma chave de teste. O e-mail chega em segundos; o Início do administrador mostra o pedido em **Pedidos de nova senha**.

> A chave do Resend e a secret do Supabase ficam só nos segredos do Supabase. Nunca no app, no GitHub ou em conversa.

## 8. REDIA Búzios · autocadastro e administração (V2.0)

A V2.0 atende as 10 plataformas de Búzios. Cada usuário é lotado em uma ou mais unidades; o **administrador do sistema** cuida de usuários, lotações, papéis, unidades e do autocadastro na tela **Administração**; o **editor** de cada unidade ajusta as telas no **Studio**.

1. **Base:** reaplique `supabase/00_instalar_tudo.sql` (cria `unidades`, `lotacoes`, `auditoria`, `parametros`, `pedidos_cadastro`, `layouts` e as funções `redia_admin_*` e `redia_layout_*`; lota cada perfil existente na própria unidade).
2. **Administrador do sistema:** no SQL Editor, como `postgres`, marque a(s) sua(s) chave(s):
   `update public.perfis set admin_sistema = true where chave = '<CHAVE>';`
   Para ser também editor de todas as unidades: `insert into public.lotacoes (user_id, uep, admin, editor) select user_id, u.uep, true, true from public.perfis, public.unidades u where chave = '<CHAVE>' on conflict (user_id, uep) do update set admin = true, editor = true;`
3. **Funções:** publique, como no passo 7.3:
   - `redia-cadastro` (autocadastro da tela de acesso) com **"Verify JWT" desligado**;
   - `redia-admin` (criar usuário, redefinir senha, aprovar autocadastro, importar contas de teste) também com **"Verify JWT" desligado**: a própria função valida a sessão do usuário (Auth) e confere se ele é administrador do sistema.
   As duas usam os mesmos segredos do passo 7. Opcionais: `REDIA_APP_URL` (endereço do app no e-mail) e `REDIA_EMAIL_DE` (remetente).
4. **E-mail ao usuário:** sem domínio verificado, o Resend só entrega ao e-mail da própria conta. Até verificar um domínio (ou usar outro serviço aprovado pela TIC), a senha provisória do autocadastro vai ao **e-mail do administrador**, que a repassa; na Administração, a senha de um usuário criado sem e-mail aparece uma vez na tela.
5. **Contas de teste das novas plataformas:** na Administração › Usuários › **Importar contas de teste** (13 funções por unidade, senha única digitada por você) ou `python tools/provisionar_usuarios.py tools/testes_buzios.csv --compartilhado --senha-fixa`.

## Se algo não funcionar

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Site continua em "Modo demonstração" | Variáveis não criadas ou publicação não refeita | Conferir o passo 4 e rodar o workflow de novo |
| "Chave ou senha incorreta" | E-mail do usuário diferente de `chave@redia.local` ou senha errada | Conferir em Authentication › Users |
| "Sua chave não tem perfil ativo na REDIA" | Faltou o `redia_vincular_perfil` | Rodar o SQL do passo 5A |
| "Sem conexão com a base de dados" | Rede corporativa bloqueando `*.supabase.co` | Testar fora da rede Petrobras e pedir liberação à TIC |
| Cabeçalho sem "tempo real" | WebSocket bloqueado pelo proxy | O app segue funcionando, com atualização a cada 15 s |
| "A recuperação de senha ainda não está configurada" | Faltam os segredos do passo 7 | Criar `RESEND_API_KEY` e `REDIA_EMAIL_ADMIN` |
| "A recuperação de senha ainda não está instalada" | Função não publicada | Passo 7.3 |
| "Esta função ainda não está instalada na base (redia-cadastro)" | Função do autocadastro não publicada | Passo 8.3 |
| "Só o administrador do sistema" | Perfil sem `admin_sistema` | Passo 8.2 |
| Projeto pausado | Plano gratuito pausa após cerca de 7 dias sem uso | Supabase › projeto › **Resume project** |

Para limpar os dados de teste:

- **No app (v1.1):** o administrador clica em **Resetar demonstração** no Início e confirma digitando RESETAR. Apaga todos os registros da UEP; perfis, senhas e configuração ficam.
- **No SQL Editor**, só o exemplo:

```sql
delete from public.registros where uep = 'P-83' and payload->>'exemplo' = 'true';
```

> Atualização de versão: rode de novo o `supabase/00_instalar_tudo.sql` (é idempotente). Na v1.1 ele criou `redia_resetar`; na v1.5, a coluna `perfis.compartilhado`, a tabela `pedidos_senha` e a função `redia_pedidos_senha`; na v1.7, o tipo de registro `reuniao` e a `redia_carregar` com os 7 dias anteriores (tendências); na v1.9, `redia_carregar` com 30 dias (tendências e recorrência) e a função `redia_buscar` (histórico); na v1.10, a função `redia_arquivo` (tela Arquivo); na v1.12, os tipos `redia` e `acordo`, o código único da REDIA (`redia_codigo`), o de acordo dos responsáveis (`redia_responsaveis`), a ata imutável e a busca com filtros (`redia_buscar`). A apresentação ao vivo usa o canal de transmissão (Broadcast) do Realtime do Supabase, sem tabela nova.

> Use só dados de exemplo até a aprovação da TIC/SI para dados operacionais reais (docs/SEGURANCA.md).
