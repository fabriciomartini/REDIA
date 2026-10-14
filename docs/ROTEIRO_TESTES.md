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
| 2.2 | Corrigir um valor manualmente | Aparece como "M" com seu nome, também para os outros usuários em segundos |
| 2.3 | Sugestões: aprovar uma, marcar outra como "Abertura", recusar uma | Fila atualiza; o item aprovado vai para o bloco; "Abertura" leva à tela do GEPLAT |
| 2.4 | Destaques da coordenação: criar um item | Aparece no bloco da coordenação |
| 2.5 | PFCEO: selecionar equipamentos | Card da apresentação mostra a seleção, piores primeiro |
| 2.6 | Serviços do dia, Ameaças/oportunidades, Demandas | Gravam e aparecem na apresentação |
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
| 6.2 | Fechar a ata | Arquivo gravado na base; botão **Baixar arquivo da ata** |
| 6.3 | Imprimir / salvar PDF da pauta | Uma página 16:9 por bloco |

## 7. Configuração

| # | Passo | Esperado |
|---|---|---|
| 7.1 | COPROD/COEMB/COMAN abrem Configuração | Somente leitura |
| 7.2 | GEPLAT altera o tempo por bloco e salva | Vale para todos após recarregar |

## Registro do resultado

| Coordenação | Testador (chave) | Dispositivos | Data | Resultado | Issues |
|---|---|---|---|---|---|
| GEPLAT | | | | | |
| COPROD | | | | | |
| COEMB | | | | | |
| COMAN | | | | | |
