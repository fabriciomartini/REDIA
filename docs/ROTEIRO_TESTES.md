# Roteiro de testes do piloto · REDIA V1.0

**Objetivo:** validar o fluxo completo na nuvem com usuários reais de cada coordenação, usando **dados de exemplo** (sem dados operacionais reais até a aprovação da TIC).

Registre cada problema como *issue* no GitHub (modelo "Problema ou sugestão no piloto"), com tela, passos e dispositivo.

## Preparação (administrador)

- [ ] Base criada e SQL rodado (`01_schema.sql`, `02_storage.sql`).
- [ ] Cadastro público desligado no Auth.
- [ ] Usuários do piloto cadastrados (ao menos 1 por coordenação + 1 SUPROD/SUEMB/SUEIN) e senhas entregues individualmente.
- [ ] Site publicado (GitHub Pages ou servidor interno) com `SUPABASE_URL` e `SUPABASE_ANON_KEY`.
- [ ] Dia de teste escolhido. O GEPLAT ou o administrador carrega os **dados de exemplo** no Início.

## 1. Acesso (todos)

| # | Passo | Esperado |
|---|---|---|
| 1.1 | Entrar com a chave e uma senha errada | "Chave ou senha incorreta." |
| 1.2 | Entrar com a senha temporária | Pede a troca de senha; recusa senhas diferentes, curtas ou com a chave |
| 1.3 | Trocar a senha e entrar | Início com nome, chave, posto e coordenação corretos |
| 1.4 | Recarregar a página (F5) | Continua logado |
| 1.5 | Fechar o navegador e abrir de novo | Pede login |
| 1.6 | Início › Alterar senha | Troca a senha; o próximo login usa a nova |

## 2. Curadoria (cada coordenação, até 08:40 no ensaio)

| # | Passo | Esperado |
|---|---|---|
| 2.1 | Abrir minha curadoria › Dados automáticos | Valores com origem, fonte e hora |
| 2.1a | Clicar em **Capturar dados** num bloco (ex.: IUGA e queima; Compressores de gás; Resultados de análises) | Barra de progresso por etapa; o que foi encontrado entra confirmado (A); alerta lista o que não foi encontrado. Hoje os conectores rodam em modo **simulado** |
| 2.1c | Digitar o valor que faltou (ou corrigir um capturado) e clicar em outro campo | Grava sozinho, sem botão Salvar: vira M com seu nome e horário e o destaque some |
| 2.1e | COPROD › Dados automáticos › IUGA e queima: alterar a margem da reserva tática (ex.: 0,3) | Abertura e tela da COPROD recalculam a reserva tática; com o IUGA do mês abaixo da meta, aparecem a queima máxima diária, o IUGA diário mínimo e as origens evitáveis (detalhe da queima) |
| 2.1d | Compressores, recuperação de gás e bombas: mudar o status de um equipamento | Abertura (GEPLAT) e detalhe de indicadores da COPROD mostram o bullet do equipamento no novo status |
| 2.1b | Resultados de análises: conferir a data de cada resultado | Data em destaque ("Atrasada · N dias") quando passa da periodicidade |
| 2.2 | Corrigir um valor manualmente | Aparece como "M" com seu nome, também para os outros usuários em segundos |
| 2.3 | Sugestões: aprovar uma, marcar outra como "Abertura", recusar uma | Fila atualiza; o item aprovado vai para o bloco; "Abertura" leva à tela do GEPLAT |
| 2.4 | Destaques da coordenação: criar um item | Aparece no bloco da coordenação |
| 2.5 | PFCEO: **Capturar dados**, conferir a lista do pior ao normal; incluir um sistema normal, retirar um com desvio e marcar até 2 para a abertura | Desvios já aparecem no card da coordenação; os marcados aparecem em Destaques e ameaças da abertura do GEPLAT |
| 2.6 | Serviços do dia (**Capturar dados** do APLAT), Ameaças/oportunidades, Canal Base x Bordo | Gravam e aparecem na apresentação |
| 2.7 | Preenchimento manual (poços, operações, cilindros, navio, tanques, etc.) | Gravam e aparecem no detalhe |
| 2.8 | Concluir preenchimento | Início mostra "Concluído hh:mm" para a coordenação |
| 2.9 | Repetir 2.2 a 2.6 em **tablet ou celular** | Telas sem rolagem lateral; botões fáceis de tocar |

## 3. Trabalho simultâneo (2 ou mais pessoas ao mesmo tempo)

| # | Passo | Esperado |
|---|---|---|
| 3.1 | Duas pessoas da mesma coordenação editam itens diferentes | As duas alterações ficam; cada uma com seu autor |
| 3.2 | Enquanto alguém digita, outra pessoa grava | Aviso "Há registros novos…", sem perder o texto em edição |
| 3.3 | Cabeçalho | "Nuvem · sincronizado hh:mm:ss · tempo real" |

## 4. Congelamento (GEPLAT)

| # | Passo | Esperado |
|---|---|---|
| 4.1 | Congelar com coordenação pendente › Notificar | A coordenação vê a notificação na curadoria |
| 4.2 | Congelar mesmo assim | "Pauta congelada"; curadoria bloqueada para todos |
| 4.3 | Outro usuário, com a tela aberta desde antes, tenta alterar | "A pauta… foi congelada…": a alteração **não** é gravada |
| 4.4 | Registrar uma demanda com a pauta congelada | Grava normalmente |
| 4.5 | Descongelar (com motivo) | Curadoria volta a gravar |

## 5. Apresentação (sala de reunião / Teams)

| # | Passo | Esperado |
|---|---|---|
| 5.1 | Abrir a apresentação em tela cheia (F) nas TVs | Blocos 1 a 5 legíveis à distância, sem cortes |
| 5.2 | Setas / números / clique no título do card | Navega entre blocos e detalhes |
| 5.3 | Alguém grava durante a reunião (pauta descongelada) | Tela atualiza em segundos |

## 6. Fechamento e ata

| # | Passo | Esperado |
|---|---|---|
| 6.1 | Anexar a transcrição do Teams (.docx/.vtt) | "Transcrição anexada"; botão **Baixar** funciona |
| 6.2 | Fechar a ata (**Fechar ata e gerar PDF**) | Barra de progresso; PDF gravado na base (botão **Baixar arquivo da ata**) com o relatório e, em seguida, uma página em paisagem para cada tela da apresentação, com os dados de referência da REDIA |
| 6.3 | Imprimir / salvar PDF da pauta | Uma página 16:9 por bloco |
| 6.4 | Registrar uma decisão (com quem decidiu) e um aprendizado com a pauta congelada | Aparecem na tela Fechamento (bloco 5) e no PDF da ata |
| 6.5 | Apresentar com o cronômetro ligado e trocar de bloco | "Tempo por bloco" mostra previsto × medido × estouro no Fechamento e na ata |
| 6.6 | Pauta extra do GEPLAT com dono, prazo e ação | Dono e prazo na abertura; a ação vira demanda no Canal Base x Bordo |
| 6.7 | Marcar um destaque como "Escalar" | Selo na abertura/bloco, item no topo e listado no Fechamento como pendente de decisão |

## 7. Configuração

| # | Passo | Esperado |
|---|---|---|
| 7.1 | COPROD/COEMB/COMAN abrem Configuração | Somente leitura |
| 7.2 | GEPLAT altera o tempo por bloco e salva | Vale para todos após recarregar |
| 7.3 | GEPLAT altera a meta de um indicador de manutenção e um limite de análise | COMAN: semáforo do indicador muda; análise com resultado fora do limite fica Não OK |
| 7.4 | GEPLAT altera a periodicidade do teste de vazão (ex.: 30 dias) | Abertura e card de poços passam a marcar os poços com teste vencido |

## 8. Segurança de processo e vencimentos (v1.8)

| # | Passo | Esperado |
|---|---|---|
| 8.1 | GEPLAT › Dados automáticos › Capturar dados em "Segurança de processo" e "Inibições e bypass" | Abertura: coluna "Segurança de processo · 24 h" com eventos, inibições e críticos vencidos |
| 8.2 | Incluir uma inibição com data de 4 dias atrás | Coluna fica Não OK; ata lista a inibição com os dias |
| 8.3 | COMAN › Dados automáticos › "Itens de segurança crítica" com um vencimento passado | Card Indicadores mostra 1 vencido; detalhe Críticos e peças com "Vencida há N d" |
| 8.4 | COEMB › Dados automáticos › "Inspeções de integridade" | Card Tanques em atenção mostra o resumo; detalhe Integridade lista por vencimento |

## Registro do resultado

| Coordenação | Testador (chave) | Dispositivos | Data | Resultado | Issues |
|---|---|---|---|---|---|
| GEPLAT | | | | | |
| COPROD | | | | | |
| COEMB | | | | | |
| COMAN | | | | | |
