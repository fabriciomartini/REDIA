-- =====================================================================
-- REDIA Búzios · D-75 · agendamento da ata automática (versão de teste)
-- Rode no SQL Editor do Supabase (uma vez; pode rodar de novo). Precisa das extensões pg_cron e pg_net.
-- Às 23:59 e às 00:10 de Brasília (02:59 e 03:10 UTC), chama a Edge Function redia-ata-auto, que gera a ata
-- dos dias sem ata arquivada em cada unidade ativa. A função só age na janela de 23:55 a 00:15 e em dias sem ata.
-- Para parar: select cron.unschedule('redia-ata-auto-2359'); select cron.unschedule('redia-ata-auto-0010');
-- =====================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobname) from cron.job where jobname in ('redia-ata-auto-2359', 'redia-ata-auto-0010');
select cron.schedule('redia-ata-auto-2359', '59 2 * * *', $$
  select net.http_post(url := 'https://jflqzcjeyggzghglwavj.supabase.co/functions/v1/redia-ata-auto',
                       headers := '{"Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb, timeout_milliseconds := 60000)
$$);
select cron.schedule('redia-ata-auto-0010', '10 3 * * *', $$
  select net.http_post(url := 'https://jflqzcjeyggzghglwavj.supabase.co/functions/v1/redia-ata-auto',
                       headers := '{"Content-Type": "application/json"}'::jsonb, body := '{}'::jsonb, timeout_milliseconds := 60000)
$$);
select jobname, schedule, active from cron.job where jobname like 'redia-ata-auto%';
