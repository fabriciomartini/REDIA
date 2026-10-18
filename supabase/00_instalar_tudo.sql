-- REDIA P-83 · V1.0 · INSTALAÇÃO COMPLETA (01_schema.sql + 02_storage.sql numa colagem só)
-- Supabase › SQL Editor › New query › cole tudo › Run. Pode rodar de novo sem perder dados.

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

-- UEP do usuário logado (usada nas políticas de acesso).
create or replace function public.redia_uep_atual() returns text
language sql stable security definer set search_path = public as $$
  select p.uep from public.perfis p where p.user_id = auth.uid() and p.ativo
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
  if new.uep is distinct from p.uep then
    raise exception 'UEP_NAO_PERMITIDA' using errcode = 'P0001', hint = 'O registro é de outra UEP.';
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
                            'admin', p.admin, 'trocarSenha', p.trocar_senha and not p.compartilhado, 'compartilhado', p.compartilhado)
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
  if not found or p.uep <> p_uep or not p.admin then
    raise exception 'SEM_PERMISSAO_RESET' using errcode = 'P0001', hint = 'Só o administrador da UEP reseta a demonstração.';
  end if;
  delete from public.registros where uep = p_uep;
  get diagnostics n = row_count;
  return n;
end $$;

-- D-56: últimos pedidos de nova senha da UEP (só administrador), para conferência no Início.
create or replace function public.redia_pedidos_senha(p_uep text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p public.perfis;
begin
  select * into p from public.perfis where user_id = auth.uid() and ativo;
  if not found or p.uep <> p_uep or not p.admin then return '[]'::jsonb; end if;
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
  if not found or p.uep <> p_uep or not (p.admin or p.coord = 'GEPLAT') then
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
  return upper(p_chave) || ' → ' || public.redia_coord_do_posto(p_posto);
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
create policy registros_ler on public.registros for select to authenticated using (uep = public.redia_uep_atual());

drop policy if exists registros_inserir on public.registros;
create policy registros_inserir on public.registros for insert to authenticated
  with check (uep = public.redia_uep_atual() and autor_id = auth.uid());
-- Sem políticas de UPDATE/DELETE: registros são só de acréscimo.

drop policy if exists uep_config_ler on public.uep_config;
create policy uep_config_ler on public.uep_config for select to authenticated using (uep = public.redia_uep_atual());

-- Permissões de tabela (o Supabase concede tudo a anon/authenticated por padrão: retiramos)
revoke all on public.perfis, public.registros, public.uep_config, public.uep_config_hist, public.pedidos_senha from anon, authenticated;
alter table public.pedidos_senha enable row level security;   -- sem políticas: só o servidor (service_role) lê e grava
grant select on public.perfis to authenticated;
grant select, insert on public.registros to authenticated;
grant select on public.uep_config to authenticated;

-- Funções: ninguém executa por padrão; o app (authenticated) só as do app.
revoke execute on function
  public.redia_coord_do_posto(text), public.redia_uep_atual(), public.redia_json(public.registros),
  public.redia_registros_antes_inserir(), public.redia_meu_perfil(), public.redia_senha_trocada(),
  public.redia_carregar(text, date, text[]), public.redia_novos(text, bigint), public.redia_gravar(jsonb),
  public.redia_config_ler(text), public.redia_config_salvar(text, jsonb), public.redia_resetar(text),
  public.redia_vincular_perfil(text, text, text, text, text, boolean), public.redia_pedidos_senha(text), public.redia_buscar(text, text, integer, date, date, text, text[]), public.redia_arquivo(text, integer), public.redia_codigo(text, date), public.redia_responsaveis(text, date)
  from public, anon, authenticated;
grant execute on function
  public.redia_uep_atual(), public.redia_json(public.registros), public.redia_meu_perfil(), public.redia_senha_trocada(),
  public.redia_carregar(text, date, text[]), public.redia_novos(text, bigint), public.redia_gravar(jsonb),
  public.redia_config_ler(text), public.redia_config_salvar(text, jsonb), public.redia_resetar(text),
  public.redia_pedidos_senha(text), public.redia_buscar(text, text, integer, date, date, text, text[]), public.redia_arquivo(text, integer), public.redia_codigo(text, date), public.redia_responsaveis(text, date)
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

-- =====================================================================
-- REDIA P-83 · V1.0 · arquivos (Supabase Storage)
-- Rode depois do 01_schema.sql. Cria o bucket privado "redia" para a
-- pauta congelada (JSON), a ata (HTML) e a transcrição do Teams.
-- Caminho dos arquivos: <UEP>/<AAAA>/<MM>/<DD>/<nome>
-- Só de acréscimo: o app nunca sobrescreve nem apaga arquivos.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('redia', 'redia', false, 26214400)          -- 25 MB por arquivo
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists redia_arquivos_ler on storage.objects;
create policy redia_arquivos_ler on storage.objects for select to authenticated
  using (bucket_id = 'redia' and (storage.foldername(name))[1] = public.redia_uep_atual());

drop policy if exists redia_arquivos_enviar on storage.objects;
create policy redia_arquivos_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'redia' and (storage.foldername(name))[1] = public.redia_uep_atual());
-- Sem UPDATE/DELETE para o app.
