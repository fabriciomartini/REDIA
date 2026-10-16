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

-- Registros da REDIA (mesmo formato do protótipo v0.8, uma linha por registro).
create table if not exists public.registros (
  seq                bigint generated always as identity primary key,
  id                 text not null check (id ~ '^[a-z0-9]{8}$'),
  uep                text not null,
  data               date not null,
  escopo             text not null default 'dia' check (escopo in ('dia', 'demandas')),
  tipo               text not null check (tipo in ('sugestao', 'decisao', 'comentario', 'valor', 'lista', 'servico',
                       'item', 'demanda', 'atualiza', 'remove', 'aceite', 'congelamento', 'reabertura', 'anexo',
                       'ata', 'conclusao', 'notificacao', 'selecao')),
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
create index if not exists registros_pauta_idx on public.registros (uep, data, gravado_em desc) where tipo in ('congelamento', 'reabertura');

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

-- ---------------------------------------------------------------------
-- 3. Gatilho de gravação: autoria, hora oficial e pauta congelada
-- ---------------------------------------------------------------------
create or replace function public.redia_registros_antes_inserir() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p public.perfis;
  ult text;
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

  -- R-03 no servidor: com a pauta congelada, só passam demanda, anexo, ata, reabertura e notificação.
  -- O bloqueio consultivo serializa congelamento × edição do mesmo dia (sem corrida entre sessões).
  if new.escopo = 'dia' then
    perform pg_advisory_xact_lock(hashtextextended(new.uep || '|' || new.data::text, 0));
    if new.tipo not in ('demanda', 'anexo', 'ata', 'reabertura', 'notificacao') then
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
                            'admin', p.admin, 'trocarSenha', p.trocar_senha)
  from public.perfis p where p.user_id = auth.uid() and p.ativo
$$;

-- Marca a troca de senha do primeiro acesso como feita.
create or replace function public.redia_senha_trocada() returns void
language sql volatile security definer set search_path = public as $$
  update public.perfis set trocar_senha = false where user_id = auth.uid()
$$;

-- Registros do dia + demandas + valores do mês usados nos acumulados (D-43).
create or replace function public.redia_carregar(p_uep text, p_data date, p_campos_mes text[] default '{}') returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'registros', coalesce((
      select jsonb_agg(public.redia_json(r) order by r.seq)
      from public.registros r
      where r.uep = p_uep and (
            (r.escopo = 'dia' and r.data = p_data)
         or  r.escopo = 'demandas'
         or (r.escopo = 'dia' and r.tipo = 'valor' and r.data >= date_trunc('month', p_data)::date and r.data < p_data
             and r.payload ->> 'campo' = any (p_campos_mes)))), '[]'::jsonb),
    'seq', coalesce((select max(seq) from public.registros where uep = p_uep), 0))
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
revoke all on public.perfis, public.registros, public.uep_config, public.uep_config_hist from anon, authenticated;
grant select on public.perfis to authenticated;
grant select, insert on public.registros to authenticated;
grant select on public.uep_config to authenticated;

-- Funções: ninguém executa por padrão; o app (authenticated) só as do app.
revoke execute on function
  public.redia_coord_do_posto(text), public.redia_uep_atual(), public.redia_json(public.registros),
  public.redia_registros_antes_inserir(), public.redia_meu_perfil(), public.redia_senha_trocada(),
  public.redia_carregar(text, date, text[]), public.redia_novos(text, bigint), public.redia_gravar(jsonb),
  public.redia_config_ler(text), public.redia_config_salvar(text, jsonb), public.redia_resetar(text),
  public.redia_vincular_perfil(text, text, text, text, text, boolean)
  from public, anon, authenticated;
grant execute on function
  public.redia_uep_atual(), public.redia_json(public.registros), public.redia_meu_perfil(), public.redia_senha_trocada(),
  public.redia_carregar(text, date, text[]), public.redia_novos(text, bigint), public.redia_gravar(jsonb),
  public.redia_config_ler(text), public.redia_config_salvar(text, jsonb), public.redia_resetar(text)
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
