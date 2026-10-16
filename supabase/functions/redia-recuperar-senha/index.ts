// REDIA P-83 · "Esqueci a senha" (D-56) · Supabase Edge Function
// O usuário informa a chave na tela de login. A função:
//   1) confere se a chave tem perfil ativo (a resposta é sempre a mesma, para não revelar quem existe);
//   2) limita a um pedido a cada 15 minutos por chave;
//   3) gera uma senha temporária e ENVIA POR E-MAIL ao administrador (que repassa ao usuário);
//   4) só depois do envio confirmado troca a senha e marca a troca obrigatória no próximo acesso.
// Se o e-mail falhar, a senha atual continua valendo.
//
// Segredos (Supabase › Edge Functions › Secrets), definidos pelo administrador:
//   RESEND_API_KEY      chave da conta Resend (envio do e-mail)
//   REDIA_EMAIL_ADMIN   e-mail que recebe as senhas temporárias
//   REDIA_EMAIL_DE      remetente (opcional; padrão "REDIA P-83 <onboarding@resend.dev>")
// SUPABASE_URL e a chave do servidor (SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_SECRET_KEYS) já existem no ambiente das Edge Functions (não vão para o app).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const resposta = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const PADRAO = { ok: true, mensagem: 'Pedido registrado. Se a chave estiver cadastrada, o administrador recebe a nova senha temporária e a repassa a você.' };

function senhaTemporaria(): string {
  const alfa = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789', b = new Uint8Array(10);
  crypto.getRandomValues(b);
  let s = Array.from(b, x => alfa[x % alfa.length]).join('');
  if (!/\d/.test(s)) s = s.slice(0, 9) + '7';
  if (!/[A-Za-z]/.test(s)) s = 'R' + s.slice(1);
  return s;
}

/* chave do servidor: a antiga service_role ou a primeira chave secreta nova (sb_secret_…) do ambiente da função */
function chaveServidor(): string {
  const legado = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legado) return legado;
  try { const k = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'); return String(k.default || Object.values(k)[0] || ''); } catch { return ''; }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resposta({ ok: false, mensagem: 'Use POST.' }, 405);
  let chave = '';
  try { chave = String((await req.json())?.chave || '').trim().toUpperCase(); } catch { /* corpo inválido */ }
  if (!/^[A-Z0-9]{4}$/.test(chave)) return resposta({ ok: false, mensagem: 'Informe a chave com 4 letras ou números.' }, 400);

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, chaveServidor(), { auth: { persistSession: false } });
  const registrar = (situacao: string, detalhe: string, uep: string | null = null) => sb.from('pedidos_senha').insert({ chave, uep, situacao, detalhe });

  const { data: perfil } = await sb.from('perfis').select('user_id, chave, nome, posto, uep, ativo, compartilhado').eq('chave', chave).maybeSingle();
  if (!perfil || !perfil.ativo) { await registrar('ignorado', 'chave sem perfil ativo'); return resposta(PADRAO); }

  const desde = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count } = await sb.from('pedidos_senha').select('id', { count: 'exact', head: true }).eq('chave', chave).eq('situacao', 'enviada').gte('pedido_em', desde);
  if ((count || 0) > 0) { await registrar('ignorado', 'novo pedido em menos de 15 min', perfil.uep); return resposta(PADRAO); }

  const apiKey = Deno.env.get('RESEND_API_KEY'), para = Deno.env.get('REDIA_EMAIL_ADMIN');
  if (!apiKey || !para) { await registrar('falha', 'envio de e-mail não configurado', perfil.uep); return resposta({ ok: false, mensagem: 'A recuperação de senha ainda não está configurada. Procure o administrador da REDIA.' }, 503); }

  const senha = senhaTemporaria(), quando = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const texto = [
    `Pedido de nova senha na REDIA ${perfil.uep} · ${quando}`, '',
    `Chave: ${perfil.chave}`, `Nome: ${perfil.nome}`, `Posto: ${perfil.posto}`, '',
    `Senha temporária: ${senha}`, '',
    perfil.compartilhado ? 'Atenção: esta é uma conta genérica de teste, usada por várias pessoas. A nova senha vale para todos que usam esta chave.' : 'No próximo acesso, o app pede que o usuário crie uma senha pessoal.',
    '', 'Repasse a senha só ao usuário, por um canal individual. Se você não reconhece este pedido, ignore: a senha anterior deixa de valer, mas ninguém além de você recebeu a nova.',
  ].join('\n');
  const envio = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: Deno.env.get('REDIA_EMAIL_DE') || 'REDIA P-83 <onboarding@resend.dev>', to: [para], subject: `REDIA · nova senha temporária · ${perfil.chave}`, text: texto }),
  });
  if (!envio.ok) { await registrar('falha', `e-mail não enviado (${envio.status})`, perfil.uep); return resposta({ ok: false, mensagem: 'Não foi possível enviar o pedido agora. Tente mais tarde ou procure o administrador.' }, 502); }

  const { error } = await sb.auth.admin.updateUserById(perfil.user_id, { password: senha });
  if (error) { await registrar('falha', 'senha não atualizada: ' + error.message, perfil.uep); return resposta({ ok: false, mensagem: 'Não foi possível concluir o pedido. Procure o administrador.' }, 500); }
  await sb.from('perfis').update({ trocar_senha: !perfil.compartilhado }).eq('user_id', perfil.user_id);
  await registrar('enviada', 'senha temporária enviada ao administrador', perfil.uep);
  return resposta(PADRAO);
});
