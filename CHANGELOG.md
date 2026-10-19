# Histórico de versões

## 2.3.0 · D-77 (2026-10-18)

- **Configuração › Tempo de exibição de cada tela:** um campo por tela da apresentação (Abertura · GEPLAT, COPROD, COEMB, COMAN, Fechamento), em minutos (de 0,5 a 60), com o total da apresentação comparado à janela da REDIA (início–fim). Cada tela abre com o seu cronômetro; o "Tempo esgotado", os acréscimos de +1 min, o tempo medido por bloco (Fechamento, ata e PDF) e o ao vivo usam o tempo da tela. A visão semanal usa o tempo da tela em que é aberta. Sem valor salvo, cada tela usa o tempo padrão anterior (5 min).

## 2.2.1 · correção R-52 (2026-10-18)

- **Ao vivo com dois computadores:** a contagem de 5 s chegava aos outros usuários como um horário absoluto do relógio de quem iniciou; se o relógio do outro computador estivesse atrasado (ex.: 50 min), a contagem mostrava mais de 3000 s. O mesmo valia para o cronômetro de quem assiste e para "assumir o controle". Agora vai a duração (5 s), contada no relógio de quem recebe; o cronômetro chega pronto, sem desconto pelo relógio do outro computador; quem assume o controle fica sempre à frente de quem controlava. Teste novo com o relógio do segundo usuário 50 min atrasado.

## 2.2.0 · D-75 (2026-10-18)

- **Ata automática das 23:59 (versão de teste):** todos os dias às 23:59 (Brasília), cada unidade sem ata arquivada recebe uma ata totalmente preenchida, para manter a base do período de teste atualizada. Se a REDIA não foi iniciada, ela é aberta e preenchida com o gerador do exemplo; se foi iniciada e não encerrada, só o que está vazio é preenchido (se a pauta ainda não estiver congelada), as sugestões pendentes são aprovadas, as coordenações concluídas, a pauta congelada, o de acordo registrado e a ata fechada. Tudo marcado como fictício e "automática", com autoria SISTEMA e registro na auditoria.
  - Nuvem: Edge Function `redia-ata-auto` (gerador montado pelo build.py a partir do código do app) agendada pelo banco (`supabase/04_agendamento.sql`, pg_cron às 23:59 e 00:10); sem credencial, só age na janela das 23:55–00:15. Gravação pela função `redia_sistema_gravar`, que só a chave do servidor executa.
  - Demonstração: às 23:59 com o app aberto ou na próxima abertura (dias desde o primeiro uso, até 30).
  - Administração › Dados de teste: "Gerar a ata automática de hoje agora", para testar.
- **Resetar a REDIA de hoje:** liberado também para supervisores (SUPROD, SUEMB, SUEIN, SUMEC); apaga também a ata do dia, se já fechada.
- Base: **reaplicar `supabase/00_instalar_tudo.sql`**, rodar `supabase/04_agendamento.sql` e publicar a Edge Function `redia-ata-auto` (index.ts + gerador.js).

## 2.1.0 · D-74 (2026-10-18)

- **Administração › Usuários · excluir conta:** botão Excluir na lista e no editor do usuário, com confirmação digitando a chave. Exclui acesso, perfil e lotações; registros e atas guardam o nome do autor; a exclusão fica na auditoria. A conta do **proprietário do sistema** (`perfis.proprietario`) nunca é excluída, desativada nem perde o perfil de administrador, nem a própria conta de quem exclui.
- **Cabeçalho corrigido (erros da 2.0):** o título quebrava em 4 linhas ("REDIA Búzios · P-80 · 2.0.0") e os itens novos (Studio, Administração, selo da unidade) empurravam "Ao vivo" e "Sair" para baixo da forma verde em telas até 1366 px. Agora: título numa linha, unidade em selo próprio, **Configuração, Studio e Administração no menu "Mais"**, "Ao vivo" compacto e Fechamento/Arquivo no "Mais" abaixo de 1180 px. Teste automático em 1920, 1366 e 1100 px.
- **Início reorganizado:** coluna principal com REDIA do dia e Situação das coordenações; coluna lateral com Funções da versão de teste e pedidos de senha (sem espaço vazio); sem "Sair" e "Ao vivo" repetidos; atalho para o Arquivo.
- **Resetar a REDIA de hoje** nas Funções da versão de teste: apaga só os registros do dia (demandas e outros dias ficam); coordenador, GEPLAT ou administrador; só o próprio dia.
- **Administração › Dados de teste:** o reset total e o histórico de 15 dias saíram do Início e ficam só com o administrador do sistema, por unidade.
- Base: **reaplicar `supabase/00_instalar_tudo.sql`** e republicar a Edge Function `redia-admin`.

## 2.0.0 · D-70 a D-73 · REDIA Búzios (2026-10-18)

- **REDIA Búzios:** o sistema passa a atender as 10 plataformas do campo de Búzios (P-74, P-75, P-76, P-77, P-78, P-79, P-80, P-82, P-83 e P-91). Todas as telas da P-83 valem para as demais, mudando só as referências à unidade (cabeçalho, código REDIA-‹UEP›-‹DDMMAAAA›, ata, PDF). Na tela de acesso, só **Búzios** sobre REDIA, alinhado ao R.
- **Lotação por unidade:** cada usuário é lotado em uma ou mais unidades e só edita e consulta o histórico delas (a base recusa o resto). Lotado numa só, entra direto; em mais de uma, escolhe a unidade ao entrar (**Trocar unidade** no cabeçalho). Os usuários atuais ficam lotados na P-83.
- **Administração do sistema** (só administrador do sistema): painel com indicadores e situação por unidade; usuários com busca e filtros (unidade, papel, situação), edição de função, e-mail, lotações e papéis por unidade (administrador da unidade, editor do Studio), conta ativa/compartilhada, troca de senha, **redefinir senha**, **marcar acesso revisado**, **novo usuário**, **importar contas de teste**, **exportar CSV** (sem senhas); unidades (nome, situação "Em comissionamento", ativa); autocadastro (aberto, com aprovação) e pedidos; auditoria; **Boas práticas** com a situação atual (menor privilégio, revisão a cada 90 dias, contas sem uso há 60 dias, contas compartilhadas, separação de funções, auditoria, MFA pendente, autocadastro controlado, editor por unidade). O administrador não retira o próprio perfil e o sistema exige ao menos um administrador ativo.
- **Autocadastro:** "Cadastrar-se" na tela de acesso (chave de 4 letras ou números, nome, e-mail, unidade e função) com **Cadastrar e receber senha provisória**. Troca obrigatória no 1º acesso, com alerta para **não usar a senha Petrobras**.
- **Aviso de protótipo** depois de cada login: sistema em desenvolvimento, dados fictícios gerados por IA.
- **Apresentação ao vivo:** popup de confirmação antes de iniciar e contagem regressiva animada de 5 s para quem aciona e para todos os logados na unidade (quem aciona pode cancelar).
- **Visão semanal · Canal Base x Bordo:** os três cards de ações no padrão Apple (cores do sistema, símbolos, número grande e legenda; anel de progresso no prazo com a marca da referência de 80%).
- **Studio de telas** (só editores da unidade): mostrar/ocultar cards, renomear títulos, mudar a ordem na mesma coluna, destacar com cor e renomear rótulos de campos, com prévia ao vivo; rascunho, publicar (versões com histórico e restauração) e auditoria. O layout publicado vale para todos da unidade, na apresentação e na ata em PDF.
- Base: **reaplicar `supabase/00_instalar_tudo.sql`** e publicar as Edge Functions `redia-cadastro` e `redia-admin` (ver docs/CONFIGURAR_SUPABASE.md, passo 8).

## 1.12.2 · D-69 (2026-10-18)

- **Correção · Preencher a REDIA aberta (fictício):** na base, o botão não gravava nada. O gerador do exemplo monta também valores dos dias anteriores (acumulados do mês e tendências); num dia ainda vazio, esses valores entravam no lote, e a base recusava o lote inteiro porque aqueles dias já estão encerrados (ata fechada ou pauta congelada). Agora o preenchimento grava só no dia aberto. Teste novo na nuvem com dia vazio.

## 1.12.1 · D-68 (2026-10-18)

- **Início:** sai o calendário e o botão "Abrir" do card REDIA do dia; o card mostra sempre o dia corrente (dias anteriores ficam no Arquivo). O login abre a REDIA de hoje também no modo demonstração.
- **Virada do dia:** às 00:00, quem está na REDIA do dia passa automaticamente para o novo dia, que oferece **Iniciar elaboração**. Com a REDIA do dia já realizada e a ata encerrada, o botão não aparece.
- **Código da REDIA com data em ddmmaaaa:** REDIA-‹UEP›-‹DDMMAAAA›, ex.: REDIA-P83-18102026. Base: **reaplicar `supabase/00_instalar_tudo.sql`**.

## 1.12.0 · D-67 (2026-10-18)

- **REDIA do dia como objeto único e rastreável:** a REDIA só existe depois de **Iniciar elaboração**, clicado por um coordenador ou pelo GEPLAT no próprio dia (a partir da meia-noite). Ela recebe o código **REDIA-‹UEP›-‹AAAAMMDD›** (ex.: REDIA-P83-20261018), atribuído pela base; uma por UEP e dia. Todos os usuários passam a editar a REDIA aberta; antes disso, a curadoria fica bloqueada (as sugestões das passagens continuam chegando). O código aparece no Início, na ata, no PDF e no Arquivo.
- **De acordo para o fechamento da ata:** cada coordenador e o GEPLAT que participaram do preenchimento dão o de acordo depois do congelamento da pauta (responsável = quem concluiu o preenchimento da coordenação ou, sem conclusão, quem fez a última alteração de curadoria — o supervisor que cobriu o coordenador entra aqui). O botão **Fechar ata e gerar PDF** só é liberado com todos os de acordo; uma reabertura da pauta invalida os anteriores. A ata fechada vai para a base e **não pode mais ser alterada**: nada mais entra no dia (a base recusa).
- **Arquivo:** lista só as atas fechadas (código, data, de acordo, participantes, **Baixar PDF da ata**). A tela **Histórico** saiu: a busca agora fica no topo do Arquivo (texto, período, coordenação e tipo de conteúdo); com busca ou filtro, a lista de atas dá lugar aos resultados agrupados por REDIA, e **Limpar filtros** volta à lista.
- **Início reorganizado:** sessão numa barra no topo (usuário, REDIA do dia com o código, armazenamento e ações); REDIA do dia e Situação das coordenações logo abaixo; **Funções da versão de teste** no canto inferior direito, com tudo o que é só de teste (carregar exemplo, histórico de 15 dias, simular horário, exportar/importar, resetar) e o novo **Preencher a REDIA aberta (fictício)**, que gera valores para todos os campos vazios das coordenações e do GEPLAT, aprova as sugestões pendentes e conclui o preenchimento.
- **Apresentação ao vivo:** quem aciona passa a controlar; os demais usuários logados (Início, Curadoria ou Apresentação) vão para a apresentação e acompanham a troca de telas e o cronômetro. Quem assiste tem só **Sair** ativo; os demais comandos ficam visíveis e desabilitados, com dica de quem tem o controle. **Apresentação ao vivo · assistir** volta a acompanhar; quem controla pode encerrar, e outro usuário pode assumir o controle.
- **Fichas de orelhão** no lugar dos ícones de +1 minuto (15% maiores).
- **Cabeçalho da apresentação:** dia, data e **hora atual** em fonte maior, no lugar de "Realizado D-1 · SITOP".
- **Cards de ações (visão semanal e fechamento):** número em cima e rótulo embaixo (o "43% no prazo" não cabia lado a lado). Vencidas em vermelho, vencem hoje em amarelo, no prazo em verde com fonte branca; com zero, o card de alerta fica neutro; a taxa no prazo mostra o selo "abaixo de 80%" quando for o caso.
- Base: **reaplicar `supabase/00_instalar_tudo.sql`**.

## 1.11.0 · D-66 (2026-10-17)

- **Capturar todos os dados:** botão no topo da aba Dados automáticos de cada coordenação, que roda a captura de todos os blocos da página em sequência (progresso geral, resultado em cada bloco e resumo no topo). O botão de cada bloco continua.
- **Dica nos semáforos diferentes de OK:** ao parar o mouse (ou focar com o teclado) sobre um semáforo em Atenção, Não OK ou Sem dado, aparece uma dica com os dados que levaram ao estado e a regra aplicada (ex.: injeção de gás 3.791 de 5.500 Mm³/d, 68,9% da meta, regra 98%/90%). Vale para a abertura, as telas das coordenações, os detalhes, a visão semanal e o fechamento; semáforos dados na curadoria mostram quem definiu, a origem e o impacto. Semáforo OK não tem dica.
- **Abaixo da meta em vermelho:** valores abaixo da meta, do potencial ou da referência (números grandes, % da meta, projetado, IUGA do ativo/campo/mês, indicadores da COPROD e da manutenção, médias da visão semanal) ficam em vermelho, num gradiente que fica mais vivo e forte quanto maior o déficit (cor cheia a 15% abaixo, ou 1,5 p.p. no IUGA). Nas tendências, o trecho abaixo da meta é redesenhado em vermelho no mesmo gradiente e o último ponto e a variação ganham a cor.
- **Cronômetro:** depois de 1 minuto além do tempo do bloco, pulsa em vermelho (1 s entre o vermelho forte e o fraco); depois de 2 minutos, a tela fica branca com o aviso **"Tempo esgotado"**, o estouro correndo e as saídas: *Zerar e voltar à apresentação*, *+1 min* e *Próximo bloco*. **Zerar** volta às telas da reunião.
- **+1 min** na barra de comandos (e tecla +): soma 1 minuto ao cronômetro, até 3 vezes por tela; três ícones ao lado do cronômetro mostram os acréscimos usados (preenchidos) e disponíveis (vazados). O tempo registrado por bloco guarda o número de acréscimos.

## 1.10.0 · D-65 (2026-10-17)

- **POB e Offloading (abertura):** leitura revista. POB com número grande, barra de ocupação (Atenção a partir de 95%, Não OK acima da capacidade), "a bordo de N" e vagas; fonte em etiqueta própria no cabeçalho. Offloading com título "Offloading · TOP previsto", data e navio na mesma linha (navio "a confirmar" quando não confirmado), barra do tanque e legenda "Ocupado X (%) · Livre Y m³".
- **Enquadramento por corrente:** os cards Produção (óleo), Injeção de gás e Injeção de água mostram uma linha "Enquadramento" com semáforo e texto: *Desenquadrado* se alguma análise da corrente está fora da especificação; *Atenção* se está perto do limite, sem resultado ou atrasada; *Enquadrado* se todas estão dentro; os parâmetros que entram aparecem na linha (detalhes no título).
- **Análises (eplab) na Configuração:** tabela com limites, caixa **Na tela** (vai ou não para o card Resultados de Análises da coordenação) e **Enquadramento** (não entra, óleo, gás injetado ou água injetada) por análise; **Incluir análise** (coordenação, nome, unidade, casas, periodicidade, limites, corrente) e **Excluir/Reincluir** análises. A análise incluída ganha campo em Dados automáticos. Novas análises-base de exemplo: O₂ dissolvido na água de injeção e água no gás de injeção (limites PREMISSA).
- **Semáforos com texto:** a janela meteo-oceanográfica passa a dizer "Mar dentro da janela / perto do limite / fora da janela" e o parâmetro mais próximo do limite (ex.: "Hs 1,8/2,5 m"); a coluna Segurança de processo ganha a palavra de status e as contagens; análises fora/perto do limite mostram "Fora"/"Limite"; chips de sistemas auxiliares e de segurança com o status no título.
- **Histórico de 15 dias:** o exemplo passa a trazer 15 REDIAs encerradas antes do dia aberto (valores, listas, curadoria, demandas, tempos da reunião, pauta congelada e ata), para tendências, recorrência, visão semanal e Arquivo. Na nuvem, o administrador grava pelo botão **Gerar histórico de 15 dias** (Início); dias que já têm pauta congelada ou ata não são alterados.
- **Arquivo:** tela nova no menu com uma linha por REDIA (pauta congelada, reaberturas, ata, participantes), filtro por mês, **Baixar PDF arquivado** (quando a ata foi arquivada com PDF), **Gerar PDF** (remonta a ata do dia) e **Abrir REDIA**.
- Base: nova função `redia_arquivo`. **Reaplicar `supabase/00_instalar_tudo.sql`.**

## 1.9.1 · D-64 (2026-10-17)

- **"Perda de produção"** no lugar de "Deferimento de produção" (rótulos da lista, do detalhe da COPROD e dos textos); o campo interno `oleo.deferimento` não muda.
- **ATP-BUZ III** em todas as ocorrências do nome do ativo (padrão da configuração, rótulo do IUGA do ativo, fonte "Dados do ativo"); configurações já salvas com "ATP-BUZ" (base ou navegador) são corrigidas ao carregar.
- **Destaques e ameaças (abertura):** a linha "Ameaça" vem da aba *Ameaças e oportunidades*, não dos destaques. Para evitar a confusão, a aba Destaques explica isso e ganha a caixa **"Registrar também como ameaça da coordenação"**, que cria a ameaça com o mesmo texto e semáforo (OK vira Atenção); a linha vazia passa a dizer "Sem ameaça registrada pela <coordenação>".

## 1.9.0 · D-63 (2026-10-17) · onda 3 das propostas de boas práticas

Fecha as 30 propostas aprovadas. Campos novos com captura simulada (BDO/SITOP, SAP PM, dados do ativo, meteo-oceanografia); regras e limites são PREMISSA, configuráveis por UEP.

- **Deferimento de produção por causa e sistema (8):** lista D-1 (causa, sistema de uma lista fechada, volume) e **Pareto do mês por sistema** no detalhe de Indicadores da COPROD.
- **Indicadores do ativo e do campo (6):** IUGA do ATP-BUZ e de Búzios, **cota de queima do campo** no mês, acumulado e reserva do campo (detalhe de Indicadores da COPROD; valores na abertura quando capturados).
- **Potencial por poço (9):** colunas potencial e vazão estimada D-1 na lista de poços; poço abaixo do potencial (mais de 10% abaixo, configurável) ganha marca própria na abertura e no card de poços; detalhe de poços mostra vazão/potencial e a perda total.
- **Manobras previstas × reserva tática (11):** lista de manobras com queima estimada; o card de reserva tática informa se cabem na reserva e o saldo.
- **Custo da indisponibilidade (15):** coluna "equipamento" nas causas de queima; gás queimado por equipamento indisponível somado no mês (detalhe da queima).
- **Janela meteo-oceanográfica (16):** Hs, vento, corrente e tendência × limites do offloading; semáforo no card de offloading da abertura, linha "Mar · estabilidade" na COEMB e cards no detalhe.
- **Lastro e estabilidade (19):** calados, trim e banda × limites (detalhe da COEMB e linha no card).
- **Aderência ao plano e backlog (20):** aderência da semana, backlog total e crítico (card e detalhe de Indicadores da COMAN).
- **Visão semanal (28):** tela própria (`#/apresentacao/semana`, botão "Semana" nos controles, marcada no dia configurado): tendências de 7 e 30 dias, ações vencidas e no prazo, itens a escalar e recorrências. Não entra na ata diária.
- **Recorrência automática (29):** mesma TAG (sugestões/itens), causa evitável ou equipamento da queima em 3 REDIAs nos últimos 30 dias (configurável) ganha o selo "Recorrente ×N" na fila da curadoria, nos destaques e na abertura; lista na visão semanal.
- **Histórico pesquisável (30):** tela **Histórico** no menu: busca por TAG, poço ou tema em todas as REDIAs anteriores (função `redia_buscar` na base; no modo demonstração, o que está no navegador), com "Abrir REDIA".
- Base: `redia_carregar` passa a trazer valores/listas dos 30 dias anteriores e as sugestões/itens de 30 dias (recorrência); nova função `redia_buscar`. **Reaplicar `supabase/00_instalar_tudo.sql`.**
- Configuração: limites do offloading e da estabilidade, desvio de potencial por poço, recorrência (vezes e janela) e dia da visão semanal.

## 1.8.0 · D-62 (2026-10-17) · onda 2 das propostas de boas práticas

Listas novas com **captura simulada** (passagem de serviço, SAP PM/MM e plano de inspeção) até as integrações; campos e regras são PREMISSA a validar com cada coordenação.

- **Segurança de processo · 24 h (1, 2, 3, 21)** na abertura, ao lado dos "dias sem" e antes da produção: eventos das 24 h classificados pela API RP 754 (Tier 1/2, Tier 3 = demanda a sistema de segurança, Tier 4 = barreira degradada), **inibições e bypass ativos** (com a mais antiga e alerta por tempo: Atenção a partir de 1 dia, Não OK a partir de 3) e **itens críticos de segurança vencidos** (preventivas e testes de SIS, F&G, dilúvio e ESD). Listas na curadoria do GEPLAT (eventos e inibições) e da COMAN (críticos); seção própria na ata.
- **COMAN:** linha "Críticos de segurança vencidos · vencem em 7 d" nos Indicadores, "Peças críticas em falta (23)" em Órgãos legais e suprimentos e nova página de detalhe **Críticos e peças** (vencidos primeiro; peças com previsão de chegada).
- **COEMB · Inspeções de integridade (17):** tanques, casco, amarração e turret com última, próxima e situação (vencida / vence em 30 dias / programada / executada); resumo no card Tanques em atenção e nova página de detalhe **Integridade**.
- **Teste de vazão por poço (14):** poço produtor com teste vencido (dias desde o último > periodicidade da UEP, padrão 90 dias) ganha o símbolo de atenção na abertura e no card de poços, que lista os vencidos; periodicidade na Configuração.
- **Limites legais da água potável e do descarte (18):** cobertos pela mecânica de limites de especificação da v1.7 (cloro, turbidez e TOG do slop já com semáforo).
- Configuração: periodicidade do teste de vazão, dias de inibição para Atenção/Não OK e janela das inspeções.
- Ata em PDF: 28 telas (duas páginas de detalhe novas). Abas de detalhe: "PFCEO" no lugar do nome longo (título completo na página).

## 1.7.0 · D-61 (2026-10-17) · onda 1 das propostas de boas práticas

Primeira das três ondas de implementação das 30 propostas aprovadas na análise das telas (documento "Propostas de melhoria com base em boas práticas"). Nenhuma integração nova: tudo usa registros que já existem na base.

- **Tendência de 7 dias (4):** sparklines na abertura em Produção, IUGA, Injeção de gás e Injeção de água, com a linha de referência (potencial ou meta) e a variação do período. Os pontos são os realizados D-1 gravados nas REDIAs anteriores; `redia_carregar` passa a trazer os campos de tendência dos 7 dias anteriores (também na virada do mês).
- **Pauta extra com dono e prazo (5):** o tema da plataforma leva dono (função) e prazo, exibidos na abertura; com uma ação preenchida, o sistema registra também a demanda no Canal Base x Bordo (GEPLAT, origem C), ligada ao tema.
- **Escalonamento (7):** destaques (aprovados ou criados) e temas da pauta extra podem ser marcados "Escalar · precisa de decisão do GEOP ou da gerência": ganham o selo, sobem para o topo do bloco e da abertura e aparecem no Fechamento e na ata como pendentes de decisão.
- **Queima rotina × extraordinária (10):** coluna "Classe" em Queima projetada D por causa (sem classe, evitável = extraordinária); acumulado do mês por classe no card da COPROD e no detalhe da queima (soma das listas diárias do mês).
- **Gráfico do IUGA acumulado (12):** no detalhe da queima, IUGA acumulado dia a dia contra a meta, com a projeção no ritmo atual e, abaixo da meta, a trajetória com a queima máxima diária que ainda fecha o mês na meta. Não coube no card da tela COPROD sem esconder os poços (ver 40_Pendencias).
- **Limites de especificação nas análises (13):** mínimo e máximo por parâmetro na Configuração da UEP; o resultado ganha semáforo por faixa (fora = Não OK; a menos de 10% da faixa = Atenção), além da data. Valores iniciais são referências públicas a confirmar (PREMISSA): BSW e salinidade do óleo, TOG da água produzida e do slop, cloro e turbidez da água potável.
- **Sistemas de segurança no PFCEO (22):** coluna "Sistema de segurança" nas listas do PFCEO; os marcados ficam sempre na tela, na primeira linha do card (com o pior estado entre eles), antes dos desvios de processo. Exemplo da COMAN: SIS/ESD, F&G, dilúvio e geração de emergência.
- **Metas de manutenção por UEP (24):** tabela "Metas dos indicadores de manutenção" na Configuração; a linha do indicador usa a própria meta ou, vazia, a da UEP.
- **Decisões e aprendizados (25):** no Fechamento e ata, "Decisões tomadas na reunião" (texto, quem decidiu, coordenação) separadas das demandas, e "Aprendizados do dia". Entram na tela Fechamento e no PDF da ata. Novo tipo de registro `reuniao`, aceito com a pauta congelada (durante e após a REDIA).
- **Taxa de ações no prazo (26):** percentual de demandas do mês fechadas até o prazo, por coordenação e sentido, no Fechamento (tela e ata).
- **Agenda fixa e timebox medido (27):** itens de segurança sobem na ordem dos destaques (depois dos escalados); o cronômetro da apresentação registra início, fim, duração e estouro de cada bloco (ao trocar de bloco ou sair), exibidos no Fechamento e na ata.
- Base: `redia_carregar` traz valores e listas (`p_campos_mes`) do início do mês ou de D-7, o que vier antes; restrição de tipos inclui `reuniao`. Reaplicar `supabase/00_instalar_tudo.sql`.
- Deck: capturas de tela regeneradas.

## 1.6.0 · D-57 (2026-10-17)

- **Reserva tática do IUGA** (abertura do GEPLAT e tela da COPROD): volume que ainda pode ser queimado, além do ritmo atual, fechando o mês com IUGA ≥ meta + margem. Cálculo: (IUGA do mês − meta − margem) × produção de gás projetada do mês (acumulado até D-1 + produção diária × dias restantes; projeção do SITOP ou média do mês). Margem de segurança padrão de 0,1 p.p., ajustável na curadoria da COPROD (campo "Margem de segurança da reserva tática").
- **Recuperação do IUGA** quando o mês está abaixo da meta: queima máxima por dia nos dias restantes para fechar na meta, IUGA diário mínimo necessário, redução frente à queima atual e as **origens evitáveis** a trabalhar (maiores primeiro, com quanto cada uma cobre da redução). Se a meta não for mais alcançável, mostra o melhor IUGA possível no mês.
- Tela da COPROD: no card Queima projetada, o terceiro indicador passa a ser a reserva tática (ou a queima máxima para recuperar); "Reserva no mês" continua no detalhe da queima, que ganha o card de reserva tática/recuperação.

## 1.5.0 · D-56 (2026-10-16)

- **Contas genéricas de teste**, uma por posto: GEOP (TGEO), GEPLAT (TGPL), COPROD (TCPR), COMAN (TCMN), COEMB (TCEB) e supervisores SUPROD (TSPR), SUEMB (TSEB), SUEIN (TSEI) e SUMEC (TSMC), em `tools/genericos_teste_P83.csv`. São cadastradas pelo administrador com `provisionar_usuarios.py --compartilhado --senha-fixa`: a senha única é digitada na hora e não fica em arquivo nem no repositório. Conta compartilhada não pede troca de senha nem oferece "Alterar senha".
- **Esqueci a senha** na tela de acesso: o usuário informa a chave; a Edge Function `redia-recuperar-senha` gera uma senha temporária, envia ao e-mail do administrador (Resend) e só então troca a senha. A resposta não revela se a chave existe; um pedido por chave a cada 15 minutos; se o e-mail falhar, a senha atual continua valendo. No próximo acesso, o app pede uma senha pessoal (exceto contas genéricas).
- Base: coluna `perfis.compartilhado`, tabela `pedidos_senha` (só o servidor grava) e função `redia_pedidos_senha` (administrador acompanha os pedidos no Início).

## 1.4.0 · D-55 (2026-10-16)

- **Ata em PDF**, gerada no navegador ao **Fechar ata e gerar PDF**: relatório em retrato (texto pesquisável) com participantes, situação, indicadores, destaques (inclusive PFCEO na abertura), ameaças, atividades, pauta extra, demandas, decisões, transcrição e índice das telas.
- **Anexo com o print de todas as telas da apresentação** (5 blocos + 21 páginas de detalhe), capturadas no momento do fechamento a partir da pauta congelada, uma por página em **paisagem**, com os dados de referência: data da REDIA, D-1 e D, código de integridade da pauta, horário das capturas automáticas, quem gerou e quando.
- Barra de progresso durante a captura; **Baixar prévia em PDF** confere o arquivo sem registrar a ata. Na base compartilhada, o PDF vai para os arquivos da REDIA (Storage).
- Bibliotecas servidas com o app, carregadas só ao gerar a ata: jsPDF 4.2.1, jsPDF-AutoTable 5.0.7 e modern-screenshot 4.7.0 (licenças MIT em `vendor/`). A política de segurança passa a permitir `connect-src 'self'` (leitura das imagens do próprio site na captura).
- Deck: slide novo "Ata em PDF" e slide de fechamento atualizado, com prints da função.

## 1.3.0 · D-54 (2026-10-16)

- **Serviços do dia:** botão **Capturar dados** traz do APLAT as permissões de trabalho planejadas para o dia na coordenação (origem PT). As já listadas e as ocultadas pelo coordenador não se repetem.
- **PFCEO:** botão **Capturar dados** importa o PFCEO; os sistemas viram cards numa **lista de entrada do pior estado ao normal** (operando ou parado), com contagem por situação. Os sistemas **com desvio** ficam aprovados automaticamente para a tela PFCEO da coordenação; os **normais** só entram se o coordenador incluir. Até **2 por coordenação** vão para a abertura do GEPLAT, em Destaques e ameaças.
- **Revisão das telas:** menu e aba "Demandas" da curadoria passam a "Canal Base x Bordo"; a lista "Captura automática" do menu inclui as listas capturadas (PFCEO); o texto de situação do cabeçalho não passa mais por baixo da forma verde.
- **Deck:** conteúdo atualizado até a v1.3 (captura automática, equipamentos, PFCEO, Canal Base x Bordo, análises, piloto na base compartilhada), novas capturas de tela (`tests/prints_deck.cjs`), sem a menção aos "75 minutos". Corrigida a capa: marca, imagem e vídeo voltam a aparecer (o deck agora tem os próprios arquivos em `apresentacao/assets/` e libera o vídeo na política de segurança).

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
