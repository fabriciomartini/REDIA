# Segurança da REDIA V1.0

## Modelo de acesso

| Camada | Controle |
|---|---|
| Login | Supabase Auth com chave + senha pessoal (mín. 8 caracteres, letras e números, sem a chave). A senha temporária é trocada no 1º acesso. A sessão vale só para a aba (sessionStorage) e acaba ao fechar o navegador ou em "Sair". |
| Perfil | Tabela `perfis`, preenchida só pelo administrador. Sem perfil ativo, o usuário não lê nem grava nada, mesmo que tenha conta no Auth. |
| Leitura | RLS: cada usuário lê só os registros, a configuração e os arquivos da **própria UEP**, e só o próprio perfil. |
| Gravação | RLS + gatilho no servidor: só INSERT na UEP do usuário. A **autoria** (nome, chave, posto) vem do perfil, não do navegador. A **hora oficial** (`gravado_em`) vem do relógio do servidor. |
| Alteração e exclusão | Não existem para o app: sem permissão de UPDATE/DELETE em `registros` e sem políticas para isso. Uma correção é um registro novo; o histórico fica completo. |
| Pauta congelada | O servidor recusa qualquer alteração de curadoria do dia congelado (`PAUTA_CONGELADA`). Um bloqueio por UEP+dia serializa congelamento e edição, então duas sessões não "furam" o congelamento. |
| Configuração da UEP | Só GEPLAT ou administrador alteram (função `redia_config_salvar`), com histórico em `uep_config_hist`. |
| Arquivos | Bucket privado `redia`, pasta por UEP, só envio e leitura (sem sobrescrever nem apagar). |
| Anônimo | Sem permissão em tabelas e funções. Os testes automatizados conferem isso. |

## O que é público e o que nunca pode ser

| Item | Pode ficar no app/GitHub? |
|---|---|
| `SUPABASE_URL` e chave **anon/publishable** | Sim, por desenho do Supabase. A proteção está no login e na RLS. |
| Chave **secret / service_role** | **Nunca.** Dá acesso total. Só no computador do administrador, ao rodar o script de cadastro. O `build.py` recusa montar com ela. |
| Lista de chaves e nomes dos usuários | **Não.** Fica só na tabela `perfis` da base. O CSV de cadastro fica fora do repositório (bloqueado no `.gitignore`). |
| Senhas temporárias | **Não.** Entrega individual; apagar o CSV depois. |
| Dados operacionais reais | Só na base, e só depois da aprovação da TIC/SI (ver abaixo). |
| Dados de exemplo | Derivam de material da P-75 (TAGs, eventos), sem nomes de pessoas. Para site acessível fora da rede, avalie publicar com `REDIA_SEM_EXEMPLO=1`. |

## Pendências para a TIC e a Segurança da Informação

1. **Classificação da informação:** os dados da REDIA são de uso interno. É preciso aprovação para guardá-los num serviço de nuvem de terceiros (Supabase, região São Paulo) ou definir a hospedagem interna da base (Supabase auto-hospedado ou equivalente).
2. **Hospedagem do app:** GitHub Pages (endereço público, mesmo com repositório privado, salvo no GitHub Enterprise Cloud com controle de acesso) ou servidor web interno com HTTPS.
3. **Login corporativo:** a V1.0 usa senha própria da REDIA. A integração com o login Petrobras (SSO via SAML/Microsoft Entra ID) é possível no Supabase a partir do plano Pro e depende da TIC.
4. **LGPD:** a base guarda nome, chave e posto dos usuários e a autoria de cada registro. É preciso definir o responsável, o prazo de retenção e o descadastro (`ativo = false`).
5. **Cópias de segurança:** o plano Free do Supabase não oferece restauração pontual e pausa o projeto após cerca de 7 dias sem uso. Para operação, recomenda-se plano pago ou base interna, com backup definido. Para guardar uma cópia manual: **Início › Exportar registros (JSON)**.
6. **Transcrição do Teams:** a V1.0 só anexa o arquivo baixado manualmente. A integração automática depende de liberação.
7. **Revisão de acesso:** conferir periodicamente a tabela `perfis` (quem está ativo e quem é administrador).

## Boas práticas no piloto

- Repositório **privado**, com poucos colaboradores.
- Não cole dados reais, nomes, telefones ou matrículas em *issues* do GitHub.
- Para limpar dados de teste, use o SQL Editor (só o administrador da base); o app não apaga.
- Ao encerrar o piloto: desative os perfis de teste e troque as chaves do projeto se alguma tiver sido exposta.
