# Histórico de versões

## 1.2.0 · D-53 (2026-10-16)

- **Página inicial** na raiz do site: escolha entre **Acessar o app** (agora em `/app/`) e **Conhecer o sistema** (deck em `/apresentacao/`). Endereços antigos do app com `#/…` seguem para `/app/`.
- **Dados automáticos sem botões Salvar e Adicionar linha:** o que a captura encontra entra confirmado (A); um valor digitado grava ao sair do campo, vira M com autor e horário, e o destaque de falha some. Nas listas, a linha em branco do fim serve para incluir. As abas de preenchimento manual e do PFCEO não mudaram.
- **Equipamentos com status individual** (compressores de gás, recuperação de gás, bombas de injeção de água): uma linha e uma caixa de seleção por equipamento (Operando, Stand By, Em manutenção, Indisponível, Limitado). **Capturar dados** traz o status da passagem de serviço do posto que opera o equipamento (modo simulado até a integração, I-13).
- **Abertura (GEPLAT) e detalhe de indicadores da COPROD:** um bullet por equipamento, com forma e cor por status e legenda.

## 1.1.0 · D-52 (2026-10-15)

- **Exemplo:** ao carregar os dados de demonstração, todas as sugestões dos supervisores chegam às caixas de entrada das curadorias **sem classificação**.
- **Resetar demonstração** (Início): apaga todos os registros da UEP inseridos por usuários e testadores, após aviso e confirmação digitada (RESETAR). Na nuvem, só o administrador vê o botão; o servidor confere (`redia_resetar`). Perfis, senhas e configuração permanecem. As outras sessões percebem o reset e limpam a tela.
- **Capturar dados** em cada bloco da aba Dados automáticos: barra de progresso e etapas por sistema de origem (BDO, SITOP, Metas, eplab); alerta para o que não foi encontrado, com pedido de preenchimento manual; valor manual existente é mantido. Os conectores rodam em **modo simulado** até a liberação das integrações (I-01, I-02, I-05, I-51).
- **Canal Base x Bordo** substitui "Demandas da base" nas telas das coordenações: só os principais tópicos, sem placar.
- **Resultados de análises** (eplab) na 3ª coluna das telas das coordenações: 5 parâmetros por coordenação (provisórios), com a data do resultado, destacada quando a análise passa da periodicidade. Campos e captura também na aba Dados automáticos; nova aba de detalhe "Análises".

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
