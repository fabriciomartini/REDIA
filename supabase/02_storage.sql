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
  using (bucket_id = 'redia' and public.redia_pode_uep((storage.foldername(name))[1]));

drop policy if exists redia_arquivos_enviar on storage.objects;
create policy redia_arquivos_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'redia' and public.redia_pode_uep((storage.foldername(name))[1]));
-- Sem UPDATE/DELETE para o app.
