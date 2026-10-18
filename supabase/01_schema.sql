-- =====================================================================
-- REDIA P-83 · V1.0 · base de dados (Supabase / PostgreSQL 15+)
-- Rode este arquivo inteiro no SQL Editor do projeto Supabase.
-- Pode ser executado de novo: os comandos são idempotentes.
--
-- Modelo: os registros da REDIA são SÓ DE ACRÉSCIMO (event sourcing).
-- Nada é alterado ou apagado pelo app: uma correção é um registro novo.
-- O servidor carimba a hora oficial de gravação (gravado_em), a autoria
-- (a partir do perfil do usuário logado) e bloqueia alterações da
-- curadoria quando a pauta do dia está congelada (regra R-03 no servidor).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabelas
-- ---------------------------------------------------------------------

-- Perfil de acesso: liga o usuário do Supabase Auth à chave Petrobras,
-- ao posto e à coordenação. Preenchido pelo administrador (ver
-- tools/provisionar_usuarios.py ou a função redia_vincular_perfil).
create table if not exists public.perfis (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  chave        text not null unique check (chave ~ '^[A-Z0-9]{4}$'),
  nome         text not null check (length(nome) between 2 and 120),
  posto        text not null check (length(posto) between 2 and 40),
  coord        text not null check (coord in ('GEPLAT', 'COPROD', 'COEMB', 'COMAN')),
  uep          text not null default 'P-83' check (length(uep) between 2 and 20),
  admin        boolean not null default false,
  ativo        boolean not null default true,
  trocar_senha boolean not null default true,
  criado_em    timestamptz not null default now()
);
-- D-56: conta genérica de teste, usada por várias pessoas (uma por posto). Não força nem oferece troca de senha.
alter table public.perfis add column if not exists compartilhado boolean not null default false;

-- D-56: pedidos de "Esqueci a senha". Gravados só pela função do servidor (Edge Function redia-recuperar-senha),
-- que gera a senha temporária e a envia por e-mail ao administrador. A senha não fica guardada aqui.
create table if not exists public.pedidos_senha (
  id         bigint generated always as identity primary key,
  chave      text not null,
  uep        text,
  pedido_em  timestamptz not null default now(),
  situacao   text not null check (situacao in ('enviada', 'falha', 'ignorado')),
  detalhe    text
);
create index if not exists pedidos_senha_chave on public.pedidos_senha (chave, pedido_em desc);

-- D-70 · REDIA Búzios: unidades do campo e lotação dos usuários (um usuário pode ser lotado em várias unidades).
create table if not exists public.unidades (
  uep        text primary key check (length(uep) between 2 and 20),
  nome       text not null,
  ordem      integer not null default 0,
  ativa      boolean not null default true,
  situacao   text not null default 'operacao' check (situacao in ('operacao', 'comissionamento')),
  criado_em  timestamptz not null default now()
);
insert into public.unidades (uep, nome, ordem) values
  ('P-74', 'FPSO P-74', 1), ('P-75', 'FPSO P-75', 2), ('P-76', 'FPSO P-76', 3), ('P-77', 'FPSO P-77', 4), ('P-78', 'FPSO P-78', 5),
  ('P-79', 'FPSO P-79', 6), ('P-80', 'FPSO P-80', 7), ('P-82', 'FPSO P-82', 8), ('P-83', 'FPSO P-83', 9), ('P-91', 'FPSO P-91', 10)
on conflict (uep) do nothing;
alter table public.perfis add column if not exists admin_sistema boolean not null default false;   -- administrador do sistema (todas as unidades + Administração)
alter table public.perfis add column if not exists email text;                                     -- e-mail de contato (autocadastro, senha temporária)
alter table public.perfis add column if not exists revisado_em timestamptz;
alter table public.perfis add column if not exists proprietario boolean not null default false;   -- D-74: proprietário do sistema (nunca excluído, nunca perde o perfil de administrador); marcado no SQL Editor                        -- última revisão de acesso pelo administrador
create table if not exists public.lotacoes (
  user_id    uuid not null references public.perfis (user_id) on delete cascade,
  uep        text not null references public.unidades (uep),
  admin      boolean not null default false,   -- administrador da unidade (reset da demonstração, configuração, pedidos de senha)
  editor     boolean not null default false,   -- editor de telas da unidade (Studio)
  criado_em  timestamptz not null default now(),
  primary key (user_id, uep)
);
-- migração: cada perfil existente fica lotado na sua UEP (o administrador atual vira administrador da unidade)
insert into public.lotacoes (user_id, uep, admin)
  select p.user_id, p.uep, p.admin from public.perfis p join public.unidades u on u.uep = p.uep
on conflict (user_id, uep) do nothing;
-- trilha de auditoria da administração (quem alterou qual usuário, quando e o quê)
create table if not exists public.auditoria (
  seq        bigint generated always as identity primary key,
  em         timestamptz not null default now(),
  por        text,
  acao       text not null,
  alvo       text,
  detalhe    jsonb not null default '{}'::jsonb
);

-- Registros da REDIA (mesmo formato do protótipo v0.8, uma linha por registro).
create table if not exists public.registros (
  seq                bigint generated always as identity primary key,
  id                 text not null check (id ~ '^[a-z0-9]{8}$'),
  uep                text not null,
  data               date not null,
  escopo             text not null default 'dia' check (escopo in ('dia', 'demandas')),
  tipo               text not null check (tipo in ('sugestao', 'decisao', 'comentario', 'valor', 'lista', 'servico',
                       'item', 'demanda', 'atualiza', 'remove', 'aceite', 'congelamento', 'reabertura', 'anexo',
                       'ata', 'conclusao', 'notificacao', 'selecao', 'reuniao', 'redia', 'acordo')),
  criado_em          timestamptz not null default now(),   -- hora exibida (vem do app)
  gravado_em         timestamptz not null default now(),   -- hora oficial de gravação (carimbada pelo servidor)
  gravado_em_cliente text,                                  -- hora informada pelo app (auditoria / importação)
  autor_id           uuid not null default auth.uid(),
  autor_chave        text,
  autor              jsonb not null default '{}'::jsonb,
  payload            jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) < 2000000),
  unique (uep, id)
);
create index if not exists registros_uep_data_idx on public.registros (uep, data);
create index if not exists registros_uep_escopo_idx on public.registros (uep, escopo) where escopo = 'demandas';
create index if not exists registros_uep_seq_idx on public.registros (uep, seq);
-- D-61: tipo 'reuniao' (decisões, aprendizados e tempos medidos da reunião; permitido com a pauta congelada). Base já instalada: recria a restrição com o tipo novo.
do $$ begin
  if exists (select 1 from pg_constraint where conname = 'registros_tipo_check' and conrelid = 'public.registros'::regclass)
     and not exists (select 1 from pg_constraint where conname = 'registros_tipo_check' and conrelid = 'public.registros'::regclass and pg_get_constraintdef(oid) like '%acordo%') then
    alter table public.registros drop constraint registros_tipo_check;
    alter table public.registros add constraint registros_tipo_check check (tipo in ('sugestao', 'decisao', 'comentario', 'valor', 'lista', 'servico',
      'item', 'demanda', 'atualiza', 'remove', 'aceite', 'congelamento', 'reabertura', 'anexo', 'ata', 'conclusao', 'notificacao', 'selecao', 'reuniao', 'redia', 'acordo'));
  end if;
end $$;
create index if not exists registros_pauta_idx on public.registros (uep, data, gravado_em desc) where tipo in ('congelamento', 'reabertura');
-- D-67: uma REDIA por UEP e dia (registro 'redia' com o código único) e uma ata por dia (documento final, imutável)
-- (se a base já tiver mais de uma ata no mesmo dia, de versões anteriores, o índice da ata fica de fora; o gatilho segue barrando a 2ª ata)
create unique index if not exists registros_redia_unica on public.registros (uep, data) where tipo = 'redia' and escopo = 'dia';
do $$ begin
  if not exists (select 1 from public.registros where tipo = 'ata' and escopo = 'dia' group by uep, data having count(*) > 1) then
    create unique index if not exists registros_ata_unica on public.registros (uep, data) where tipo = 'ata' and escopo = 'dia';
  end if;
end $$;

-- Configuração da UEP (horários, limiares, pauta extra). Uma linha por UEP.
create table if not exists public.uep_config (
  uep            text primary key,
  config         jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  atualizado_em  timestamptz not null default now(),
  atualizado_por text
);
create table if not exists public.uep_config_hist (
  seq       bigint generated always as identity primary key,
  uep       text not null,
  config    jsonb not null,
  gravado_em timestamptz not null default now(),
  por       text
);

-- ---------------------------------------------------------------------
-- 2. Funções auxiliares
-- ---------------------------------------------------------------------

-- Coordenação a partir do posto (mesmo mapa do app: POSTO_COORD).
create or replace function public.redia_coord_do_posto(p_posto text) returns text
language sql immutable set search_path = public as $$
  select case upper(trim(p_posto))
    when 'GEOP' then 'GEPLAT' when 'GEPLAT' then 'GEPLAT' when 'GESTÃO' then 'GEPLAT' when 'GESTAO' then 'GEPLAT'
    when 'COPROD' then 'COPROD' when 'SUPROD' then 'COPROD' when 'ENG PROCESSAMENTO' then 'COPROD' when 'ENG PETRÓLEO' then 'COPROD' when 'ENG PETROLEO' then 'COPROD'
    when 'COEMB' then 'COEMB' when 'SUEMB' then 'COEMB'
    when 'COMAN' then 'COMAN' when 'SUEIN' then 'COMAN' when 'SUMEC' then 'COMAN' when 'ENG ELETRICISTA' then 'COMAN' when 'ENG MECÂNICO' then 'COMAN' when 'ENG MECANICO' then 'COMAN'
    else 'GEPLAT' end
$$;

-- UEP principal do usuário logado (compatibilidade).
create or replace function public.redia_uep_atual() returns text
language sql stable security definer set search_path = public as $$
  select p.uep from public.perfis p where p.user_id = auth.uid() and p.ativo
$$;
-- D-70: o usuário logado pode acessar a unidade? (lotado nela, ou administrador do sistema)
create or replace function public.redia_pode_uep(p_uep text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis p where p.user_id = auth.uid() and p.ativo
                   and (p.admin_sistema or exists (select 1 from public.lotacoes l where l.user_id = p.user_id and l.uep = p_uep)))
$$;
-- D-70: administrador da unidade (ou do sistema)
create or replace function public.redia_admin_uep(p_uep text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis p where p.user_id = auth.uid() and p.ativo
                   and (p.admin_sistema or exists (select 1 from public.lotacoes l where l.user_id = p.user_id and l.uep = p_uep and l.admin)))
$$;
create or replace function public.redia_admin_sistema() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis p where p.user_id = auth.uid() and p.ativo and p.admin_sistema)
$$;

-- Registro no formato JSON do app (mesmas chaves do protótipo).
create or replace function public.redia_json(r public.registros) returns jsonb
language sql stable set search_path = public as $$
  select case when r.escopo = 'demandas' then o else o - 'escopo' end
  from (select jsonb_build_object(
    'v', 1, 'id', r.id, 'tipo', r.tipo, 'data', to_char(r.data, 'YYYY-MM-DD'), 'uep', r.uep,
    'criadoEm', to_char(r.criado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'gravadoEm', to_char(r.gravado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'autor', r.autor, 'payload', r.payload, 'escopo', r.escopo, 'seq', r.seq) as o) x
$$;

-- D-67/D-68: código único da REDIA · REDIA-<UEP sem separadores>-<DDMMAAAA>, ex.: REDIA-P83-18102026
create or replace function public.redia_codigo(p_uep text, p_data date) returns text
language sql immutable set search_path = public as $$
  select 'REDIA-' || upper(regexp_replace(p_uep, '[^A-Za-z0-9]', '', 'g')) || '-' || to_char(p_data, 'DDMMYYYY')
$$;

-- D-67: responsáveis pelo "de acordo" da ata · por coordenação, quem concluiu o preenchimento (última conclusão)
-- ou, sem conclusão, quem fez a última alteração de curadoria da coordenação no dia (supervisor cobrindo o coordenador entra aqui).
-- Registros de exemplo não contam. Coordenação sem participação não precisa dar o de acordo (o GEPLAT, sempre).
create or replace function public.redia_responsaveis(p_uep text, p_data date) returns jsonb
language sql stable security invoker set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('coord', c.coord, 'chave', x.autor_chave, 'nome', x.autor ->> 'nome') order by c.ord), '[]'::jsonb)
  from (values ('GEPLAT', 1), ('COPROD', 2), ('COEMB', 3), ('COMAN', 4)) c(coord, ord)
  left join lateral (
    select r.autor_chave, r.autor from public.registros r
     where r.uep = p_uep and r.data = p_data and r.escopo = 'dia' and r.payload ->> 'coord' = c.coord
       and coalesce(r.payload ->> 'exemplo', 'false') <> 'true'
       and r.tipo in ('conclusao', 'decisao', 'item', 'selecao', 'servico', 'valor', 'lista', 'remove')
     order by (r.tipo = 'conclusao' and r.payload ->> 'concluido' = 'true') desc, r.seq desc limit 1) x on true
  where x.autor_chave is not null or c.coord = 'GEPLAT'
$$;

-- ---------------------------------------------------------------------
-- 3. Gatilho de gravação: autoria, hora oficial e pauta congelada
-- ---------------------------------------------------------------------
create or replace function public.redia_registros_antes_inserir() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p public.perfis;
  ult text;
  seq_cong bigint;
  falta text;
begin
  select * into p from public.perfis where user_id = auth.uid() and ativo;
  if not found then
    raise exception 'SEM_PERFIL' using errcode = 'P0001', hint = 'Usuário sem perfil ativo na REDIA.';
  end if;
  if not public.redia_pode_uep(new.uep) then   -- D-70: unidade em que o usuário está lotado (ou administrador do sistema)
    raise exception 'UEP_NAO_PERMITIDA' using errcode = 'P0001', hint = 'O registro é de uma unidade em que o usuário não está lotado.';
  end if;

  -- autoria vem do perfil (não do navegador)
  new.autor_id := auth.uid();
  new.autor_chave := p.chave;
  if new.payload -> 'exemplo' = 'true'::jsonb then
    -- dados de exemplo mantêm o rótulo fictício; a chave real fica em autor_chave
    new.autor := jsonb_build_object('nome', coalesce(new.autor ->> 'nome', 'Dados de exemplo'), 'chave', '', 'papel', coalesce(new.autor ->> 'papel', 'sistema'));
  else
    new.autor := jsonb_build_object('nome', p.nome, 'chave', p.chave, 'papel', p.posto);
  end if;

  -- R-03 no servidor: com a pauta congelada, só passam demanda, anexo, ata, reabertura, notificação e reunião (D-61).
  -- O bloqueio consultivo serializa congelamento × edição do mesmo dia (sem corrida entre sessões).
  if new.escopo = 'dia' then
    perform pg_advisory_xact_lock(hashtextextended(new.uep || '|' || new.data::text, 0));
    -- D-67: ata fechada = REDIA encerrada; nada mais entra no dia
    if exists (select 1 from public.registros r where r.uep = new.uep and r.data = new.data and r.escopo = 'dia' and r.tipo = 'ata') then
      raise exception 'ATA_FECHADA' using errcode = 'P0001', hint = 'A ata desta REDIA já foi fechada e arquivada; ela não pode mais ser alterada.';
    end if;
    -- D-67: a REDIA do dia nasce uma vez, com o código atribuído pelo servidor
    if new.tipo = 'redia' then
      if exists (select 1 from public.registros r where r.uep = new.uep and r.data = new.data and r.escopo = 'dia' and r.tipo = 'redia') then
        raise exception 'REDIA_JA_INICIADA' using errcode = 'P0001', hint = 'A REDIA deste dia já foi iniciada por outro usuário.';
      end if;
      new.payload := new.payload || jsonb_build_object('codigo', public.redia_codigo(new.uep, new.data));
    end if;
    -- D-67: "de acordo" só com a pauta congelada; a ata só fecha com o de acordo de todos os responsáveis, depois do último congelamento
    if new.tipo in ('acordo', 'ata') then
      select r.seq into seq_cong from public.registros r
       where r.uep = new.uep and r.data = new.data and r.escopo = 'dia' and r.tipo in ('congelamento', 'reabertura')
       order by r.gravado_em desc, r.seq desc limit 1;
      if seq_cong is null or not exists (select 1 from public.registros r where r.seq = seq_cong and r.tipo = 'congelamento') then
        raise exception 'PAUTA_NAO_CONGELADA' using errcode = 'P0001', hint = 'Congele a pauta antes do de acordo e do fechamento da ata.';
      end if;
      if new.tipo = 'ata' then
        select string_agg(x ->> 'coord', ', ') into falta
          from jsonb_array_elements(public.redia_responsaveis(new.uep, new.data)) x
         where not exists (select 1 from public.registros a where a.uep = new.uep and a.data = new.data and a.escopo = 'dia' and a.tipo = 'acordo'
                             and a.seq > seq_cong and a.payload ->> 'coord' = x ->> 'coord'
                             and (x ->> 'chave' is null or a.autor_chave = x ->> 'chave'));
        if falta is not null then
          raise exception 'ATA_SEM_ACORDO' using errcode = 'P0001', hint = 'Falta o de acordo de: ' || falta || '.';
        end if;
        new.payload := new.payload || jsonb_build_object('codigo', public.redia_codigo(new.uep, new.data));
      end if;
    end if;
    if new.tipo not in ('demanda', 'anexo', 'ata', 'reabertura', 'notificacao', 'reuniao', 'acordo') then
      select r.tipo into ult from public.registros r
       where r.uep = new.uep and r.data = new.data and r.escopo = 'dia' and r.tipo in ('congelamento', 'reabertura')
       order by r.gravado_em desc, r.seq desc limit 1;
      if ult = 'congelamento' then
        raise exception 'PAUTA_CONGELADA' using errcode = 'P0001', hint = 'A pauta deste dia está congelada.';
      end if;
    end if;
  end if;

  new.gravado_em := clock_timestamp();   -- hora oficial, depois do bloqueio (R-01)
  return new;
end $$;

drop trigger if exists registros_antes_inserir on public.registros;
create trigger registros_antes_inserir before insert on public.registros
  for each row execute function public.redia_registros_antes_inserir();

-- ---------------------------------------------------------------------
-- 4. Funções chamadas pelo app (RPC)
-- ---------------------------------------------------------------------

-- Perfil do usuário logado.
create or replace function public.redia_meu_perfil() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('chave', p.chave, 'nome', p.nome, 'posto', p.posto, 'coord', p.coord, 'uep', p.uep,
                            'admin', p.admin, 'adminSistema', p.admin_sistema, 'email', p.email,
                            'trocarSenha', p.trocar_senha and not p.compartilhado, 'compartilhado', p.compartilhado,
                            -- D-70: unidades acessíveis (lotações; administrador do sistema vê todas as unidades ativas)
                            'unidades', coalesce((select jsonb_agg(jsonb_build_object('uep', u.uep, 'nome', u.nome, 'situacao', u.situacao,
                                  'admin', coalesce(l.admin, false) or p.admin_sistema, 'editor', coalesce(l.editor, false), 'lotado', l.uep is not null) order by u.ordem)
                              from public.unidades u left join public.lotacoes l on l.uep = u.uep and l.user_id = p.user_id
                              where u.ativa and (p.admin_sistema or l.uep is not null)), '[]'::jsonb))
  from public.perfis p where p.user_id = auth.uid() and p.ativo
$$;

-- Marca a troca de senha do primeiro acesso como feita.
create or replace function public.redia_senha_trocada() returns void
language sql volatile security definer set search_path = public as $$
  update public.perfis set trocar_senha = false where user_id = auth.uid()
$$;

-- Registros do dia + demandas + valores e listas dos dias anteriores usados nos acumulados do mês (D-43), nas tendências
-- de 7 e 30 dias (D-61, D-63): só os campos pedidos em p_campos_mes, do início do mês ou de D-30 (o que vier antes);
-- e as sugestões e itens dos 30 dias anteriores, para a marca de recorrência (D-63).
create or replace function public.redia_carregar(p_uep text, p_data date, p_campos_mes text[] default '{}') returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'registros', coalesce((
      select jsonb_agg(public.redia_json(r) order by r.seq)
      from public.registros r
      where r.uep = p_uep and (
            (r.escopo = 'dia' and r.data = p_data)
         or  r.escopo = 'demandas'
         or (r.escopo = 'dia' and r.tipo in ('valor', 'lista') and r.data >= least(date_trunc('month', p_data)::date, p_data - 30) and r.data < p_data
             and r.payload ->> 'campo' = any (p_campos_mes))
         or (r.escopo = 'dia' and r.tipo in ('sugestao', 'item') and r.data >= p_data - 30 and r.data < p_data))), '[]'::jsonb),
    'seq', coalesce((select max(seq) from public.registros where uep = p_uep), 0))
$$;

-- D-63 (proposta 30): histórico pesquisável · busca por TAG, poço ou tema em todas as REDIAs anteriores da UEP.
-- Procura o texto nos registros de conteúdo (sugestões, itens, demandas, serviços, decisões da reunião e valores de texto),
-- mais recentes primeiro, até p_limite (máx. 300). Só leitura, com as mesmas políticas de acesso (RLS por UEP).
-- D-67: busca na área Arquivo, com filtros de período, coordenação e tipos; texto vazio vale quando há outro filtro.
drop function if exists public.redia_buscar(text, text, integer);
create or replace function public.redia_buscar(p_uep text, p_texto text, p_limite integer default 100, p_de date default null, p_ate date default null,
  p_coord text default null, p_tipos text[] default null) returns jsonb
language sql stable security invoker set search_path = public as $$
  select coalesce((
    select jsonb_agg(public.redia_json(x) order by x.data desc, x.seq desc)
    from (
      select r.* from public.registros r
      where r.uep = p_uep
        and (length(trim(coalesce(p_texto, ''))) >= 2 or p_de is not null or p_ate is not null or p_coord is not null or p_tipos is not null)
        and r.tipo = any (coalesce(p_tipos, array['sugestao', 'item', 'demanda', 'servico', 'reuniao', 'decisao', 'valor', 'lista']))
        and r.tipo in ('sugestao', 'item', 'demanda', 'servico', 'reuniao', 'decisao', 'valor', 'lista')
        and (p_de is null or r.data >= p_de) and (p_ate is null or r.data <= p_ate)
        and (p_coord is null or r.payload ->> 'coord' = p_coord)
        and (length(trim(coalesce(p_texto, ''))) < 2 or r.payload::text ilike '%' || replace(replace(trim(p_texto), '%', '\%'), '_', '\_') || '%')
      order by r.data desc, r.seq desc
      limit greatest(1, least(coalesce(p_limite, 100), 300))
    ) x), '[]'::jsonb)
$$;

-- D-65/D-67: arquivo das REDIAs · atas (o que a área Arquivo lista), aberturas (código) e congelamentos/reaberturas (para o histórico
-- de exemplo não gravar em dia já tratado), sem o retrato da pauta, mais recentes primeiro.
create or replace function public.redia_arquivo(p_uep text, p_limite integer default 400) returns jsonb
language sql stable security invoker set search_path = public as $$
  select coalesce((
    select jsonb_agg(x.j order by x.data desc, x.seq desc)
    from (
      select r.data, r.seq, (public.redia_json(r) - 'payload') || jsonb_build_object('payload', r.payload - 'snapshot') as j
      from public.registros r
      where r.uep = p_uep and r.escopo = 'dia' and r.tipo in ('ata', 'redia', 'congelamento', 'reabertura')
      order by r.data desc, r.seq desc
      limit greatest(1, least(coalesce(p_limite, 400), 2000))
    ) x), '[]'::jsonb)
$$;

-- Registros gravados depois de um número de sequência (sincronização incremental).
create or replace function public.redia_novos(p_uep text, p_seq bigint) returns jsonb
language sql stable security invoker set search_path = public as $$
  with n as (
    select r.* from public.registros r where r.uep = p_uep and r.seq > p_seq order by r.seq limit 2000
  )
  select jsonb_build_object(
    'registros', coalesce((select jsonb_agg(public.redia_json(n) order by n.seq) from n), '[]'::jsonb),
    'seq', coalesce((select max(seq) from n), p_seq),
    'max', coalesce((select max(seq) from public.registros where uep = p_uep), 0))   -- max < seq do app = base resetada (D-52)
$$;

-- Reset da demonstração (D-52): apaga TODOS os registros da UEP (sugestões, decisões, dados, demandas,
-- congelamentos, atas). Só o administrador da UEP. Usuários, perfis, configuração e arquivos do Storage ficam.
create or replace function public.redia_resetar(p_uep text) returns integer
language plpgsql volatile security definer set search_path = public as $$
declare p public.perfis; n integer;
begin
  select * into p from public.perfis where user_id = auth.uid() and ativo;
  if not found or not public.redia_admin_sistema() then   -- D-74: reset total só pelo administrador do sistema (área de administração)
    raise exception 'SEM_PERMISSAO_RESET' using errcode = 'P0001', hint = 'Só o administrador do sistema reseta todos os dados de teste.';
  end if;
  delete from public.registros where uep = p_uep;
  get diagnostics n = row_count;
  perform public.redia_auditar('teste.resetar_tudo', p_uep, jsonb_build_object('registros', n));
  return n;
end $$;

-- D-74: reseta só o preenchimento da REDIA de hoje da unidade (registros do dia; demandas do Canal Base x Bordo ficam)
-- quem pode: lotado na unidade com função de coordenador/GEPLAT, administrador da unidade ou do sistema
create or replace function public.redia_resetar_dia(p_uep text, p_data date) returns integer
language plpgsql volatile security definer set search_path = public as $$
declare p public.perfis; n integer;
begin
  select * into p from public.perfis where user_id = auth.uid() and ativo;
  if not found or not public.redia_pode_uep(p_uep)
     or not (public.redia_admin_uep(p_uep) or upper(p.posto) in ('GEOP', 'GEPLAT', 'GESTÃO', 'COPROD', 'COEMB', 'COMAN')) then
    raise exception 'SEM_PERMISSAO_RESET_DIA' using errcode = 'P0001', hint = 'Só coordenador, GEPLAT ou administrador resetam a REDIA do dia.';
  end if;
  if p_data <> (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'RESET_SO_HOJE' using errcode = 'P0001', hint = 'Só a REDIA do próprio dia pode ser resetada.';
  end if;
  delete from public.registros where uep = p_uep and data = p_data and escopo = 'dia';
  get diagnostics n = row_count;
  perform public.redia_auditar('teste.resetar_dia', p_uep, jsonb_build_object('data', p_data, 'registros', n));
  return n;
end $$;

-- D-56: últimos pedidos de nova senha da UEP (só administrador), para conferência no Início.
create or replace function public.redia_pedidos_senha(p_uep text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p public.perfis;
begin
  select * into p from public.perfis where user_id = auth.uid() and ativo;
  if not found or not public.redia_admin_uep(p_uep) then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('chave', x.chave, 'em', x.pedido_em, 'situacao', x.situacao) order by x.pedido_em desc)
    from (select * from public.pedidos_senha where uep = p_uep order by pedido_em desc limit 20) x), '[]'::jsonb);
end $$;

-- Grava um lote de registros (1 a 2000). Ignora ids já existentes (importação idempotente).
create or replace function public.redia_gravar(p_regs jsonb) returns jsonb
language plpgsql volatile security invoker set search_path = public as $$
declare
  r jsonb;
  novo public.registros;
  saida jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_regs) <> 'array' or jsonb_array_length(p_regs) = 0 or jsonb_array_length(p_regs) > 2000 then
    raise exception 'LOTE_INVALIDO' using errcode = 'P0001', hint = 'Envie de 1 a 2000 registros.';
  end if;
  for r in select value from jsonb_array_elements(p_regs) loop
    insert into public.registros (id, uep, data, escopo, tipo, criado_em, gravado_em_cliente, autor, payload)
    values (r ->> 'id', r ->> 'uep', (r ->> 'data')::date, coalesce(r ->> 'escopo', 'dia'), r ->> 'tipo',
            coalesce((r ->> 'criadoEm')::timestamptz, now()), r ->> 'gravadoEm', coalesce(r -> 'autor', '{}'::jsonb), r -> 'payload')
    on conflict (uep, id) do nothing
    returning * into novo;
    if found then saida := saida || jsonb_build_array(public.redia_json(novo)); end if;
  end loop;
  return saida;
end $$;

-- Configuração da UEP.
create or replace function public.redia_config_ler(p_uep text) returns jsonb
language sql stable security invoker set search_path = public as $$
  select c.config from public.uep_config c where c.uep = p_uep
$$;

create or replace function public.redia_config_salvar(p_uep text, p_config jsonb) returns void
language plpgsql volatile security definer set search_path = public as $$
declare p public.perfis;
begin
  select * into p from public.perfis where user_id = auth.uid() and ativo;
  if not found or not (public.redia_admin_uep(p_uep) or (p.coord = 'GEPLAT' and public.redia_pode_uep(p_uep) and not p.admin_sistema and exists (select 1 from public.lotacoes l where l.user_id = p.user_id and l.uep = p_uep))
                       or public.redia_admin_sistema()) then
    raise exception 'SEM_PERMISSAO' using errcode = 'P0001', hint = 'Só o GEPLAT ou o administrador alteram a configuração.';
  end if;
  if jsonb_typeof(p_config) <> 'object' then raise exception 'CONFIG_INVALIDA' using errcode = 'P0001'; end if;
  insert into public.uep_config (uep, config, atualizado_em, atualizado_por) values (p_uep, p_config, now(), p.chave)
    on conflict (uep) do update set config = excluded.config, atualizado_em = now(), atualizado_por = p.chave;
  insert into public.uep_config_hist (uep, config, por) values (p_uep, p_config, p.chave);
end $$;

-- Administração (rodar no SQL Editor, como postgres): liga um usuário do Auth a um perfil.
create or replace function public.redia_vincular_perfil(p_email text, p_chave text, p_nome text, p_posto text,
  p_uep text default 'P-83', p_admin boolean default false) returns text
language plpgsql volatile security definer set search_path = public as $$
declare u uuid;
begin
  select id into u from auth.users where lower(email) = lower(p_email);
  if u is null then raise exception 'Usuário % não existe no Authentication.', p_email; end if;
  insert into public.perfis (user_id, chave, nome, posto, coord, uep, admin)
  values (u, upper(p_chave), p_nome, upper(p_posto), public.redia_coord_do_posto(p_posto), p_uep, p_admin)
  on conflict (user_id) do update set chave = excluded.chave, nome = excluded.nome, posto = excluded.posto,
    coord = excluded.coord, uep = excluded.uep, admin = excluded.admin, ativo = true;
  insert into public.lotacoes (user_id, uep, admin) values (u, p_uep, p_admin)   -- D-70
    on conflict (user_id, uep) do update set admin = excluded.admin;
  return upper(p_chave) || ' → ' || public.redia_coord_do_posto(p_posto);
end $$;

-- ---------------------------------------------------------------------
-- 4b. Administração do sistema (D-70) · só administrador do sistema; tudo fica na auditoria
-- ---------------------------------------------------------------------
create table if not exists public.parametros (
  chave  text primary key,
  valor  jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now(),
  atualizado_por text
);
insert into public.parametros (chave, valor) values ('cadastro', '{"aberto": true, "aprovacao": false}'::jsonb) on conflict (chave) do nothing;
create table if not exists public.pedidos_cadastro (
  id         bigint generated always as identity primary key,
  chave      text not null,
  nome       text,
  email      text,
  uep        text,
  pedido_em  timestamptz not null default now(),
  situacao   text not null check (situacao in ('cadastrado', 'aguardando', 'falha', 'recusado', 'ignorado')),
  detalhe    text
);
alter table public.pedidos_cadastro add column if not exists posto text;     -- função informada no autocadastro
alter table public.pedidos_cadastro add column if not exists origem text;    -- resumo (hash) do endereço de origem, para limitar pedidos repetidos
create index if not exists pedidos_cadastro_origem on public.pedidos_cadastro (origem, pedido_em desc);

create or replace function public.redia_auditar(p_acao text, p_alvo text, p_detalhe jsonb) returns void
language sql volatile security definer set search_path = public as $$
  insert into public.auditoria (por, acao, alvo, detalhe) values ((select chave from public.perfis where user_id = auth.uid()), p_acao, p_alvo, coalesce(p_detalhe, '{}'::jsonb))
$$;
create or replace function public.redia_exigir_admin_sistema() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.redia_admin_sistema() then raise exception 'SEM_PERMISSAO_ADMIN' using errcode = 'P0001', hint = 'Só o administrador do sistema.'; end if;
end $$;

-- usuários com lotações, último acesso (Auth) e último registro na REDIA
create or replace function public.redia_admin_usuarios() returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
begin
  perform public.redia_exigir_admin_sistema();
  return coalesce((select jsonb_agg(jsonb_build_object('userId', p.user_id, 'chave', p.chave, 'nome', p.nome, 'posto', p.posto, 'coord', p.coord, 'email', p.email,
      'uep', p.uep, 'adminSistema', p.admin_sistema, 'proprietario', p.proprietario, 'ativo', p.ativo, 'compartilhado', p.compartilhado, 'trocarSenha', p.trocar_senha,
      'criadoEm', p.criado_em, 'revisadoEm', p.revisado_em, 'ultimoAcesso', u.last_sign_in_at,
      'ultimoRegistro', (select max(r.gravado_em) from public.registros r where r.autor_id = p.user_id),
      'lotacoes', coalesce((select jsonb_agg(jsonb_build_object('uep', l.uep, 'admin', l.admin, 'editor', l.editor) order by l.uep) from public.lotacoes l where l.user_id = p.user_id), '[]'::jsonb))
    order by p.chave) from public.perfis p left join auth.users u on u.id = p.user_id), '[]'::jsonb);
end $$;

-- grava perfil e lotações de um usuário existente (p: {userId, nome, posto, email, uep, adminSistema, ativo, compartilhado, trocarSenha, lotacoes:[{uep, admin, editor}]})
create or replace function public.redia_admin_salvar_usuario(p jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare u uuid := (p ->> 'userId')::uuid; antes jsonb; l jsonb; n_adm integer;
begin
  perform public.redia_exigir_admin_sistema();
  select to_jsonb(x) into antes from public.perfis x where x.user_id = u;
  if antes is null then raise exception 'USUARIO_INEXISTENTE' using errcode = 'P0001'; end if;
  if u = auth.uid() and (coalesce((p ->> 'adminSistema')::boolean, true) = false or coalesce((p ->> 'ativo')::boolean, true) = false) then
    raise exception 'AUTO_BLOQUEIO' using errcode = 'P0001', hint = 'Você não pode retirar o seu próprio perfil de administrador nem se desativar.';
  end if;
  if (antes ->> 'proprietario')::boolean and (coalesce((p ->> 'adminSistema')::boolean, true) = false or coalesce((p ->> 'ativo')::boolean, true) = false) then
    raise exception 'PROPRIETARIO' using errcode = 'P0001', hint = 'O proprietário do sistema não perde o perfil de administrador nem é desativado.';
  end if;
  if jsonb_typeof(p -> 'lotacoes') <> 'array' or jsonb_array_length(p -> 'lotacoes') = 0 then
    raise exception 'SEM_LOTACAO' using errcode = 'P0001', hint = 'O usuário precisa de ao menos uma unidade de lotação.';
  end if;
  update public.perfis set
    nome = coalesce(nullif(trim(p ->> 'nome'), ''), nome),
    posto = coalesce(nullif(upper(trim(p ->> 'posto')), ''), posto),
    coord = public.redia_coord_do_posto(coalesce(nullif(upper(trim(p ->> 'posto')), ''), posto)),
    email = nullif(trim(coalesce(p ->> 'email', email)), ''),
    admin_sistema = coalesce((p ->> 'adminSistema')::boolean, admin_sistema),
    ativo = coalesce((p ->> 'ativo')::boolean, ativo),
    compartilhado = coalesce((p ->> 'compartilhado')::boolean, compartilhado),
    trocar_senha = coalesce((p ->> 'trocarSenha')::boolean, trocar_senha)
  where user_id = u;
  delete from public.lotacoes where user_id = u;
  for l in select value from jsonb_array_elements(p -> 'lotacoes') loop
    insert into public.lotacoes (user_id, uep, admin, editor) values (u, l ->> 'uep', coalesce((l ->> 'admin')::boolean, false), coalesce((l ->> 'editor')::boolean, false));
  end loop;
  update public.perfis set uep = coalesce((select l2.uep from public.lotacoes l2 where l2.user_id = u and l2.uep = p ->> 'uep'), (select min(l3.uep) from public.lotacoes l3 where l3.user_id = u)),
    admin = exists (select 1 from public.lotacoes l4 where l4.user_id = u and l4.admin) where user_id = u;
  select count(*) into n_adm from public.perfis where admin_sistema and ativo;
  if n_adm = 0 then raise exception 'SEM_ADMIN' using errcode = 'P0001', hint = 'O sistema precisa de ao menos um administrador ativo.'; end if;
  perform public.redia_auditar('usuario.alterar', antes ->> 'chave', jsonb_build_object('antes', antes - 'user_id', 'depois', p - 'userId'));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.redia_admin_revisar(p_user uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.redia_exigir_admin_sistema();
  update public.perfis set revisado_em = now() where user_id = p_user;
  perform public.redia_auditar('usuario.revisar_acesso', (select chave from public.perfis where user_id = p_user), '{}'::jsonb);
end $$;

create or replace function public.redia_admin_auditoria(p_limite integer default 200) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.redia_exigir_admin_sistema();
  return coalesce((select jsonb_agg(to_jsonb(a) order by a.seq desc) from (select * from public.auditoria order by seq desc limit least(coalesce(p_limite, 200), 1000)) a), '[]'::jsonb);
end $$;

-- visão geral por unidade: usuários, registros, última REDIA, atas, pedidos
create or replace function public.redia_admin_resumo() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.redia_exigir_admin_sistema();
  return jsonb_build_object(
    'unidades', coalesce((select jsonb_agg(jsonb_build_object('uep', u.uep, 'nome', u.nome, 'ordem', u.ordem, 'ativa', u.ativa, 'situacao', u.situacao,
        'usuarios', (select count(*) from public.lotacoes l join public.perfis p on p.user_id = l.user_id and p.ativo where l.uep = u.uep),
        'editores', (select count(*) from public.lotacoes l where l.uep = u.uep and l.editor),
        'registros', (select count(*) from public.registros r where r.uep = u.uep),
        'ultimaRedia', (select max(r.data) from public.registros r where r.uep = u.uep and r.tipo = 'redia'),
        'atas', (select count(*) from public.registros r where r.uep = u.uep and r.tipo = 'ata')) order by u.ordem) from public.unidades u), '[]'::jsonb),
    'cadastro', (select valor from public.parametros where chave = 'cadastro'),
    'pedidosCadastro', coalesce((select jsonb_agg(to_jsonb(x) order by x.pedido_em desc) from (select * from public.pedidos_cadastro order by pedido_em desc limit 50) x), '[]'::jsonb),
    'pedidosSenha', coalesce((select jsonb_agg(to_jsonb(x) order by x.pedido_em desc) from (select * from public.pedidos_senha order by pedido_em desc limit 50) x), '[]'::jsonb));
end $$;

create or replace function public.redia_admin_salvar_unidade(p jsonb) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.redia_exigir_admin_sistema();
  update public.unidades set nome = coalesce(nullif(trim(p ->> 'nome'), ''), nome), ativa = coalesce((p ->> 'ativa')::boolean, ativa),
    situacao = coalesce(p ->> 'situacao', situacao) where uep = p ->> 'uep';
  perform public.redia_auditar('unidade.alterar', p ->> 'uep', p);
end $$;

create or replace function public.redia_admin_parametro(p_chave text, p_valor jsonb) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.redia_exigir_admin_sistema();
  insert into public.parametros (chave, valor, atualizado_em, atualizado_por) values (p_chave, p_valor, now(), (select chave from public.perfis where user_id = auth.uid()))
    on conflict (chave) do update set valor = excluded.valor, atualizado_em = now(), atualizado_por = excluded.atualizado_por;
  perform public.redia_auditar('parametro.alterar', p_chave, p_valor);
end $$;

-- ---------------------------------------------------------------------
-- 4c. Studio (D-73) · layout das telas por unidade, editado só por quem tem o perfil de editor da unidade
-- ---------------------------------------------------------------------
create table if not exists public.layouts (
  uep           text primary key references public.unidades (uep),
  publicado     jsonb not null default '{}'::jsonb check (jsonb_typeof(publicado) = 'object' and octet_length(publicado::text) < 200000),
  rascunho      jsonb check (rascunho is null or (jsonb_typeof(rascunho) = 'object' and octet_length(rascunho::text) < 200000)),
  versao        integer not null default 0,
  publicado_em  timestamptz,
  publicado_por text,
  rascunho_em   timestamptz,
  rascunho_por  text
);
create table if not exists public.layouts_hist (
  seq      bigint generated always as identity primary key,
  uep      text not null,
  versao   integer not null,
  layout   jsonb not null,
  em       timestamptz not null default now(),
  por      text,
  acao     text not null default 'publicar'
);
create or replace function public.redia_editor_uep(p_uep text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis p join public.lotacoes l on l.user_id = p.user_id
                 where p.user_id = auth.uid() and p.ativo and l.uep = p_uep and l.editor)
$$;
-- layout publicado (todos da unidade) + rascunho e histórico (só editores)
create or replace function public.redia_layout_ler(p_uep text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare l public.layouts; ed boolean := public.redia_editor_uep(p_uep);
begin
  if not public.redia_pode_uep(p_uep) then raise exception 'UEP_NAO_PERMITIDA' using errcode = 'P0001'; end if;
  select * into l from public.layouts where uep = p_uep;
  return jsonb_build_object('publicado', coalesce(l.publicado, '{}'::jsonb), 'versao', coalesce(l.versao, 0), 'publicadoEm', l.publicado_em, 'publicadoPor', l.publicado_por, 'editor', ed,
    'rascunho', case when ed then l.rascunho end, 'rascunhoEm', case when ed then l.rascunho_em end, 'rascunhoPor', case when ed then l.rascunho_por end,
    'hist', case when ed then coalesce((select jsonb_agg(jsonb_build_object('versao', h.versao, 'em', h.em, 'por', h.por, 'acao', h.acao) order by h.seq desc)
                                        from (select * from public.layouts_hist where uep = p_uep order by seq desc limit 30) h), '[]'::jsonb) else '[]'::jsonb end);
end $$;
-- salva o rascunho ou publica (p_publicar); publicar cria uma versão nova no histórico
create or replace function public.redia_layout_salvar(p_uep text, p_layout jsonb, p_publicar boolean default false) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare quem text := (select chave from public.perfis where user_id = auth.uid()); v integer;
begin
  if not public.redia_editor_uep(p_uep) then raise exception 'SEM_PERMISSAO_EDITOR' using errcode = 'P0001', hint = 'Só o editor da unidade usa o Studio.'; end if;
  if jsonb_typeof(p_layout) = 'null' then p_layout := null; end if;   -- null do JSON = sem rascunho
  if p_layout is not null and jsonb_typeof(p_layout) <> 'object' then raise exception 'LAYOUT_INVALIDO' using errcode = 'P0001'; end if;
  insert into public.layouts (uep) values (p_uep) on conflict (uep) do nothing;
  if p_publicar then
    update public.layouts set publicado = coalesce(p_layout, '{}'::jsonb), versao = versao + 1, publicado_em = now(), publicado_por = quem, rascunho = null, rascunho_em = null, rascunho_por = null
      where uep = p_uep returning versao into v;
    insert into public.layouts_hist (uep, versao, layout, por, acao) values (p_uep, v, coalesce(p_layout, '{}'::jsonb), quem, case when p_layout = '{}'::jsonb then 'padrao' else 'publicar' end);
    perform public.redia_auditar('layout.publicar', p_uep, jsonb_build_object('versao', v));
  else
    update public.layouts set rascunho = p_layout, rascunho_em = case when p_layout is null then null else now() end, rascunho_por = case when p_layout is null then null else quem end where uep = p_uep;
  end if;
  return public.redia_layout_ler(p_uep);
end $$;
-- republica uma versão anterior (vira uma versão nova)
create or replace function public.redia_layout_restaurar(p_uep text, p_versao integer) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare lay jsonb;
begin
  if not public.redia_editor_uep(p_uep) then raise exception 'SEM_PERMISSAO_EDITOR' using errcode = 'P0001'; end if;
  select layout into lay from public.layouts_hist where uep = p_uep and versao = p_versao order by seq desc limit 1;
  if lay is null then raise exception 'VERSAO_INEXISTENTE' using errcode = 'P0001'; end if;
  perform public.redia_layout_salvar(p_uep, lay, true);
  update public.layouts_hist set acao = 'restaurar v' || p_versao where seq = (select max(seq) from public.layouts_hist where uep = p_uep);
  perform public.redia_auditar('layout.restaurar', p_uep, jsonb_build_object('de', p_versao));
  return public.redia_layout_ler(p_uep);
end $$;

-- ---------------------------------------------------------------------
-- 5. Segurança: RLS e permissões
-- ---------------------------------------------------------------------
alter table public.perfis enable row level security;
alter table public.registros enable row level security;
alter table public.uep_config enable row level security;
alter table public.uep_config_hist enable row level security;

drop policy if exists perfis_proprio on public.perfis;
create policy perfis_proprio on public.perfis for select to authenticated using (user_id = auth.uid());

drop policy if exists registros_ler on public.registros;
create policy registros_ler on public.registros for select to authenticated using (public.redia_pode_uep(uep));

drop policy if exists registros_inserir on public.registros;
create policy registros_inserir on public.registros for insert to authenticated
  with check (public.redia_pode_uep(uep) and autor_id = auth.uid());
-- Sem políticas de UPDATE/DELETE: registros são só de acréscimo.

drop policy if exists uep_config_ler on public.uep_config;
create policy uep_config_ler on public.uep_config for select to authenticated using (public.redia_pode_uep(uep));
-- D-70: unidades (todos os logados leem a lista), lotações (cada um lê as suas) e auditoria (só servidor/funções)
alter table public.unidades enable row level security;
alter table public.lotacoes enable row level security;
alter table public.auditoria enable row level security;
drop policy if exists unidades_ler on public.unidades;
create policy unidades_ler on public.unidades for select to authenticated using (true);
drop policy if exists lotacoes_proprias on public.lotacoes;
create policy lotacoes_proprias on public.lotacoes for select to authenticated using (user_id = auth.uid());

-- Permissões de tabela (o Supabase concede tudo a anon/authenticated por padrão: retiramos)
revoke all on public.perfis, public.registros, public.uep_config, public.uep_config_hist, public.pedidos_senha, public.unidades, public.lotacoes, public.auditoria, public.parametros, public.pedidos_cadastro, public.layouts, public.layouts_hist from anon, authenticated;
alter table public.layouts enable row level security;        -- sem políticas: leitura e gravação só pelas funções redia_layout_*
alter table public.layouts_hist enable row level security;
alter table public.parametros enable row level security;
alter table public.pedidos_cadastro enable row level security;   -- sem políticas: só o servidor e as funções de administração
grant select on public.unidades, public.lotacoes to authenticated;
alter table public.pedidos_senha enable row level security;   -- sem políticas: só o servidor (service_role) lê e grava
grant select on public.perfis to authenticated;
grant select, insert on public.registros to authenticated;
grant select on public.uep_config to authenticated;

-- Funções: ninguém executa por padrão; o app (authenticated) só as do app.
revoke execute on function
  public.redia_coord_do_posto(text), public.redia_uep_atual(), public.redia_pode_uep(text), public.redia_admin_uep(text), public.redia_admin_sistema(), public.redia_json(public.registros),
  public.redia_registros_antes_inserir(), public.redia_meu_perfil(), public.redia_senha_trocada(),
  public.redia_carregar(text, date, text[]), public.redia_novos(text, bigint), public.redia_gravar(jsonb),
  public.redia_config_ler(text), public.redia_config_salvar(text, jsonb), public.redia_resetar(text), public.redia_resetar_dia(text, date),
  public.redia_vincular_perfil(text, text, text, text, text, boolean), public.redia_pedidos_senha(text), public.redia_buscar(text, text, integer, date, date, text, text[]), public.redia_arquivo(text, integer), public.redia_codigo(text, date), public.redia_responsaveis(text, date)
    , public.redia_auditar(text, text, jsonb), public.redia_exigir_admin_sistema(), public.redia_admin_usuarios(), public.redia_admin_salvar_usuario(jsonb), public.redia_admin_revisar(uuid), public.redia_admin_auditoria(integer), public.redia_admin_resumo(), public.redia_admin_salvar_unidade(jsonb), public.redia_admin_parametro(text, jsonb)
    , public.redia_editor_uep(text), public.redia_layout_ler(text), public.redia_layout_salvar(text, jsonb, boolean), public.redia_layout_restaurar(text, integer)
  from public, anon, authenticated;
grant execute on function
  public.redia_uep_atual(), public.redia_pode_uep(text), public.redia_admin_uep(text), public.redia_admin_sistema(), public.redia_json(public.registros), public.redia_meu_perfil(), public.redia_senha_trocada(),
  public.redia_carregar(text, date, text[]), public.redia_novos(text, bigint), public.redia_gravar(jsonb),
  public.redia_config_ler(text), public.redia_config_salvar(text, jsonb), public.redia_resetar(text), public.redia_resetar_dia(text, date),
  public.redia_pedidos_senha(text), public.redia_buscar(text, text, integer, date, date, text, text[]), public.redia_arquivo(text, integer), public.redia_codigo(text, date), public.redia_responsaveis(text, date)
    , public.redia_admin_usuarios(), public.redia_admin_salvar_usuario(jsonb), public.redia_admin_revisar(uuid), public.redia_admin_auditoria(integer), public.redia_admin_resumo(), public.redia_admin_salvar_unidade(jsonb), public.redia_admin_parametro(text, jsonb)
    , public.redia_editor_uep(text), public.redia_layout_ler(text), public.redia_layout_salvar(text, jsonb, boolean), public.redia_layout_restaurar(text, integer)
  to authenticated;

-- ---------------------------------------------------------------------
-- 6. Tempo real: o app recebe um aviso a cada registro novo da sua UEP
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'registros') then
    execute 'alter publication supabase_realtime add table public.registros';
  end if;
end $$;
