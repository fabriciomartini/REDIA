# Histórico de versões

## 1.0.0 · piloto (2026-10-14)

Versão web com base de dados na nuvem. Telas, regras e indicadores iguais aos do protótipo v0.8.2.

### Base de dados e acesso

- Base PostgreSQL no **Supabase** (`supabase/01_schema.sql`):
  - registros só de acréscimo, com RLS por UEP;
  - autoria e hora oficial carimbadas pelo servidor;
  - congelamento da pauta garantido também no servidor, com bloqueio contra corrida entre sessões;
  - configuração da UEP na base, com histórico.
- **Login** por chave + senha pessoal (Supabase Auth), com troca obrigatória da senha temporária e opção "Alterar senha".
- **Perfis** (nome, posto, coordenação, UEP, administrador) só na base, cadastrados pelo script `tools/provisionar_usuarios.py`. A lista de chaves saiu do código.

### Funcionamento do app

- **Tempo real** e sincronização incremental: o que uma coordenação grava aparece para as outras em segundos.
- **Arquivos** (pauta congelada, ata, transcrição) no Storage, com botão **Baixar**.
- Na nuvem, cada login abre a REDIA do dia; simular horário e carregar exemplo ficam restritos ao administrador e ao GEPLAT.
- **Modo demonstração** com usuários fictícios (GP01, CP01, CE01, CM01 · senha 1234) quando não há configuração do Supabase.
- Importação de exportações do protótipo (idempotente, guarda o autor original).

### Montagem, publicação e testes

- **Montagem web** (`build.py`):
  - arquivos separados e com cache controlado, CSP restrita e supabase-js servido junto (sem CDN);
  - opção de arquivo único;
  - opção `REDIA_SEM_EXEMPLO=1`.
- **Publicação** automática no GitHub Pages (`.github/workflows/publicar.yml`).
- **Testes automatizados:** SQL/RLS, cadastro, ponta a ponta (demonstração e nuvem simulada) e telas móveis.

### Apresentação do sistema

- Deck de explicação do sistema em HTML (`apresentacao/`, 17 slides), publicado junto com o app em `<site>/apresentacao/`, com navegação por teclado e toque e saída em PDF.

### Removido em relação à v0.8.2

- Modo pasta compartilhada (OneDrive/SharePoint) e ponte de arquivos com tablet/celular: na versão web, todos os dispositivos acessam a base diretamente. A v0.8.2 continua disponível como versão de pasta.
