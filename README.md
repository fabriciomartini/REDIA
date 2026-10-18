# REDIA Búzios · V2.0

Sistema da **Reunião Diária (REDIA)** entre a equipe de bordo e a base de operações em terra das plataformas do campo de Búzios: **P-74, P-75, P-76, P-77, P-78, P-79, P-80, P-82, P-83 e P-91**. O fluxo tem quatro etapas: **Coleta → Curadoria → Apresentação → Ata**.

A V2.0 replica a REDIA da P-83 (piloto) para as 10 unidades: cada usuário é lotado em uma ou mais unidades e só edita e consulta o histórico delas; o **administrador do sistema** gerencia usuários, lotações, papéis, unidades, autocadastro e auditoria; o **editor** de cada unidade ajusta as telas da própria REDIA no **Studio**, sem mudar o código.

A V1.0 é a versão web do protótipo v0.8.2. As telas e as regras ficaram iguais. Mudaram a gravação dos dados (agora numa base PostgreSQL no **Supabase**), o acesso (chave + senha pessoal) e a hospedagem (**GitHub Pages** ou um servidor web interno).

> **Uso interno Petrobras · versão piloto para testes.**
> Use o repositório como **privado**. Grave dados operacionais reais só depois de a TIC/Segurança da Informação aprovar a hospedagem e a base de dados (ver [docs/SEGURANCA.md](docs/SEGURANCA.md)).

## Como funciona

| Camada | Onde fica | Observação |
|---|---|---|
| App (HTML, CSS, JS) | GitHub Pages ou servidor web interno | arquivos estáticos montados por `build.py`; nenhum servidor de aplicação |
| Login | Supabase Auth | chave Petrobras + senha pessoal; troca obrigatória da senha temporária no 1º acesso |
| Dados da REDIA | Supabase · tabela `registros` | registros só de acréscimo; o servidor carimba autoria e hora oficial e recusa a curadoria com a pauta congelada |
| Arquivos | Supabase Storage · bucket `redia` | pauta congelada (JSON), ata (HTML), transcrição do Teams |
| Atualização entre usuários | tempo real do Supabase + leitura periódica | o que uma coordenação grava aparece para as outras em segundos |

Sem as chaves do Supabase, o mesmo app abre em **modo demonstração**, com usuários fictícios (contas de teste por unidade, ex.: GP74, CP80, CM83; GP01 e CP01 na P-83; AD01 = administrador do sistema; senha 1234) e dados guardados só no navegador.

## Começo rápido

1. **Base de dados:** crie um projeto no Supabase e rode `supabase/01_schema.sql` e `supabase/02_storage.sql` no SQL Editor.
2. **Usuários:** preencha um CSV no formato de `supabase/usuarios_modelo.csv` e rode `python tools/provisionar_usuarios.py seu_arquivo.csv`.
3. **Publicação:** suba este repositório no GitHub (privado). Em *Settings › Pages*, escolha **GitHub Actions**. Em *Settings › Secrets and variables › Actions › Variables*, crie `SUPABASE_URL` e `SUPABASE_ANON_KEY`. A cada push na `main`, o site é montado e publicado.

O passo a passo completo, inclusive a hospedagem na rede interna, está em **[docs/IMPLANTACAO.md](docs/IMPLANTACAO.md)**.

## Endereços depois da publicação

| O quê | Endereço |
|---|---|
| Página inicial (escolha entre o app e o deck) | `https://fabriciomartini.github.io/REDIA/` |
| App | `https://fabriciomartini.github.io/REDIA/app/` (endereços antigos com `#/…` seguem para cá) |
| Deck de explicação do sistema | `https://fabriciomartini.github.io/REDIA/apresentacao/` (setas ou toque para navegar, F para tela cheia, Ctrl+P para PDF) |

Sem as variáveis do Supabase, o app publicado roda em **modo demonstração**: qualquer pessoa testa o fluxo completo com as chaves de teste (ex.: GP74, CP80, GP01, AD01) e a senha 1234, e cada navegador guarda os próprios dados. Para várias pessoas trabalharem no mesmo dia e na mesma pauta, ligue o site à base Supabase (variáveis `SUPABASE_URL` e `SUPABASE_ANON_KEY`).

## Estrutura

```
├─ src/                 código do app (core, nuvem, model, stage, detalhe, admin, studio, views, app.css)
├─ assets/              vídeo e imagem da tela de acesso, marca Petrobras
├─ apresentacao/        deck de explicação do sistema (HTML), publicado em <site>/apresentacao/
├─ vendor/              supabase-js 2.112.4 (MIT), servido junto com o app
├─ supabase/            01_schema.sql · 02_storage.sql · 03_perfis_modelo.sql · usuarios_modelo.csv · functions/ (recuperar-senha, cadastro, admin, ata-auto) · 04_agendamento.sql
├─ tools/               provisionar_usuarios.py (cadastro em lote no Supabase) · testes_buzios.csv (contas de teste)
├─ tests/               SQL/RLS, cadastro, ponta a ponta (demonstração e nuvem simulada), telas móveis
├─ docs/                implantação, segurança, arquitetura, roteiro de testes
├─ .github/workflows/   publicar.yml (GitHub Pages) · testes.yml
└─ build.py             monta dist/ (web) ou dist-unico/redia.html (arquivo único)
```

## Montar localmente

```bash
python build.py                       # dist/ em modo demonstração
SUPABASE_URL=https://xxxx.supabase.co SUPABASE_ANON_KEY=... python build.py   # dist/ ligado ao Supabase
python build.py --unico               # dist-unico/redia.html (tudo num arquivo só)
python -m http.server 8000 -d dist    # abrir http://localhost:8000
```

`REDIA_SEM_EXEMPLO=1` retira da montagem os dados de exemplo, que derivam de material da P-75.

## Testes

```bash
cd tests && npm install && npx playwright install chromium && npm run todos
```

O comando roda cinco conjuntos de testes:

| Conjunto | O que verifica |
|---|---|
| SQL/RLS (97) | schema em PostgreSQL local (PGlite), lotação por unidade, administração e Studio |
| Cadastro (11) | script de cadastro de usuários e lista de contas de teste de Búzios |
| Ponta a ponta, demonstração (326) | fluxo completo no modo demonstração e o deck publicado |
| Ponta a ponta, nuvem (85) | fluxo completo contra um Supabase simulado que roda o mesmo schema |
| Telas móveis (60) | smartphone, tablet e notebook |

## Documentos

- [docs/CONFIGURAR_SUPABASE.md](docs/CONFIGURAR_SUPABASE.md): passo a passo para ligar o site ao Supabase
- [docs/IMPLANTACAO.md](docs/IMPLANTACAO.md): Supabase, usuários, GitHub Pages e servidor interno
- [docs/SEGURANCA.md](docs/SEGURANCA.md): modelo de acesso, o que é público e o que nunca pode ser, pendências com a TIC
- [docs/ARQUITETURA.md](docs/ARQUITETURA.md): modelo de dados, sincronização, congelamento e arquivos
- [docs/ROTEIRO_TESTES.md](docs/ROTEIRO_TESTES.md): roteiro do piloto por coordenação
- [CHANGELOG.md](CHANGELOG.md)

Desenvolvimento: Breno Martins e Fabricio Martini.
