// REDIA Búzios · autocadastro de usuário (D-72) · Supabase Edge Function (sem JWT: chamada da tela de login)
// O novo usuário informa chave, nome, e-mail, unidade de lotação e função. A função:
//   1) valida os dados (chave = 4 letras ou números; unidade ativa; e-mail válido);
//   2) respeita os parâmetros da Administração (autocadastro aberto? exige aprovação do administrador?);
//   3) limita pedidos repetidos (por origem, chave e e-mail);
//   4) cria o usuário no Auth com SENHA PROVISÓRIA, o perfil e a lotação na unidade, com troca de senha obrigatória no 1º acesso;
//   5) envia a senha provisória ao e-mail informado. Se o envio ao usuário não for possível (ex.: domínio do remetente ainda não
//      verificado no Resend), envia ao e-mail do administrador, que a repassa. Se nenhum envio der certo, desfaz o cadastro.
// A senha não fica guardada em lugar nenhum além do Auth (hash). Tudo vai para pedidos_cadastro e auditoria.
//
// Segredos (Supabase › Edge Functions › Secrets), definidos pelo administrador (os mesmos da redia-recuperar-senha):
//   RESEND_API_KEY      chave da conta Resend (envio do e-mail)
//   REDIA_EMAIL_ADMIN   e-mail do administrador (cópia de segurança do envio)
//   REDIA_EMAIL_DE      remetente (opcional; padrão "REDIA Búzios <onboarding@resend.dev>")
//   REDIA_APP_URL       endereço do app no e-mail (opcional)
//   REDIA_EMAIL_DOMINIO domínio técnico dos usuários (opcional; padrão redia.local, igual ao config do app)
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const resposta = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const POSTO_COORD: Record<string, string> = {
  'GEOP': 'GEPLAT', 'GEPLAT': 'GEPLAT', 'COPROD': 'COPROD', 'SUPROD': 'COPROD', 'ENG PROCESSAMENTO': 'COPROD', 'ENG PETRÓLEO': 'COPROD',
  'COEMB': 'COEMB', 'SUEMB': 'COEMB', 'COMAN': 'COMAN', 'SUEIN': 'COMAN', 'SUMEC': 'COMAN', 'ENG ELETRICISTA': 'COMAN', 'ENG MECÂNICO': 'COMAN',
};

function senhaTemporaria(): string {
  const alfa = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789', b = new Uint8Array(10);
  crypto.getRandomValues(b);
  let s = Array.from(b, x => alfa[x % alfa.length]).join('');
  if (!/\d/.test(s)) s = s.slice(0, 9) + '7';
  if (!/[A-Za-z]/.test(s)) s = 'R' + s.slice(1);
  return s;
}
function chaveServidor(): string {
  const legado = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legado) return legado;
  try { const k = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'); return String(k.default || Object.values(k)[0] || ''); } catch { return ''; }
}
async function resumo(txt: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('redia:' + txt));
  return Array.from(new Uint8Array(h).slice(0, 8), b => b.toString(16).padStart(2, '0')).join('');
}
const mascarar = (e: string) => e.replace(/^(.).*(@.*)$/, (_m, a, d) => a + '•••' + d);
async function enviarEmail(para: string, assunto: string, texto: string): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey || !para) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: Deno.env.get('REDIA_EMAIL_DE') || 'REDIA Búzios <onboarding@resend.dev>', to: [para], subject: assunto, text: texto }),
    });
    return r.ok;
  } catch { return false; }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { ...CORS, 'Access-Control-Allow-Headers': req.headers.get('access-control-request-headers') || CORS['Access-Control-Allow-Headers'] } });
  if (req.method !== 'POST') return resposta({ ok: false, mensagem: 'Use POST.' }, 405);
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { /* corpo inválido */ }
  const chave = String(b.chave || '').trim().toUpperCase(), nome = String(b.nome || '').trim().replace(/\s+/g, ' ');
  const email = String(b.email || '').trim().toLowerCase(), uep = String(b.uep || '').trim().toUpperCase(), posto = String(b.posto || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(chave)) return resposta({ ok: false, mensagem: 'A chave precisa ter exatamente 4 letras ou números.' }, 400);
  if (nome.length < 2 || nome.length > 120) return resposta({ ok: false, mensagem: 'Informe o nome (2 a 120 caracteres).' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 160) return resposta({ ok: false, mensagem: 'Informe um e-mail válido.' }, 400);
  if (!POSTO_COORD[posto]) return resposta({ ok: false, mensagem: 'Selecione a sua função.' }, 400);

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, chaveServidor(), { auth: { persistSession: false } });
  const origem = await resumo(req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('cf-connecting-ip') || 'desconhecida');
  const registrar = (situacao: string, detalhe: string) => sb.from('pedidos_cadastro').insert({ chave, nome, email, uep, posto, situacao, detalhe, origem });
  const auditar = (acao: string, detalhe: Record<string, unknown>) => sb.from('auditoria').insert({ por: 'autocadastro', acao, alvo: chave, detalhe });

  const { data: par } = await sb.from('parametros').select('valor').eq('chave', 'cadastro').maybeSingle();
  const cfg = { aberto: true, aprovacao: false, ...(par?.valor || {}) } as { aberto: boolean; aprovacao: boolean };
  if (!cfg.aberto) return resposta({ ok: false, mensagem: 'O autocadastro está fechado no momento. Procure o administrador da REDIA.' }, 403);

  const { data: un } = await sb.from('unidades').select('uep, nome, ativa').eq('uep', uep).maybeSingle();
  if (!un || !un.ativa) return resposta({ ok: false, mensagem: 'Selecione uma unidade válida.' }, 400);

  const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: nOrig } = await sb.from('pedidos_cadastro').select('id', { count: 'exact', head: true }).eq('origem', origem).gte('pedido_em', desde);
  const { count: nMail } = await sb.from('pedidos_cadastro').select('id', { count: 'exact', head: true }).eq('email', email).gte('pedido_em', desde);
  if ((nOrig || 0) >= 5 || (nMail || 0) >= 3) { await registrar('ignorado', 'limite de pedidos por hora'); return resposta({ ok: false, mensagem: 'Muitos pedidos em pouco tempo. Tente de novo mais tarde.' }, 429); }

  const { data: existe } = await sb.from('perfis').select('user_id').eq('chave', chave).maybeSingle();
  if (existe) { await registrar('ignorado', 'chave já cadastrada'); return resposta({ ok: false, mensagem: 'Esta chave já está cadastrada. Se esqueceu a senha, use “Esqueci a senha”.' }, 409); }

  if (cfg.aprovacao) {
    const { data: pend } = await sb.from('pedidos_cadastro').select('id').eq('chave', chave).eq('situacao', 'aguardando').maybeSingle();
    if (!pend) await registrar('aguardando', 'aguardando aprovação do administrador');
    return resposta({ ok: true, mensagem: 'Pedido de cadastro enviado. Depois da aprovação do administrador, a senha provisória chega no e-mail informado.' });
  }

  const senha = senhaTemporaria(), dominio = Deno.env.get('REDIA_EMAIL_DOMINIO') || 'redia.local';
  const { data: cri, error: e1 } = await sb.auth.admin.createUser({ email: `${chave.toLowerCase()}@${dominio}`, password: senha, email_confirm: true, user_metadata: { chave, origem: 'autocadastro' } });
  if (e1 || !cri?.user) { await registrar('falha', 'usuário não criado no Auth: ' + (e1?.message || '')); return resposta({ ok: false, mensagem: 'Não foi possível concluir o cadastro. Procure o administrador da REDIA.' }, 500); }
  const uid = cri.user.id;
  const desfazer = async (motivo: string) => { await sb.auth.admin.deleteUser(uid); await registrar('falha', motivo); };
  const { error: e2 } = await sb.from('perfis').insert({ user_id: uid, chave, nome, posto, coord: POSTO_COORD[posto], uep, email, admin: false, ativo: true, trocar_senha: true, compartilhado: false });
  if (e2) { await desfazer('perfil não gravado: ' + e2.message); return resposta({ ok: false, mensagem: 'Não foi possível concluir o cadastro. Procure o administrador da REDIA.' }, 500); }
  const { error: e3 } = await sb.from('lotacoes').insert({ user_id: uid, uep, admin: false, editor: false });
  if (e3) { await desfazer('lotação não gravada: ' + e3.message); return resposta({ ok: false, mensagem: 'Não foi possível concluir o cadastro. Procure o administrador da REDIA.' }, 500); }

  const app = Deno.env.get('REDIA_APP_URL') || 'https://fabriciomartini.github.io/REDIA/app/';
  const corpo = (paraAdmin: boolean) => [
    paraAdmin ? `Autocadastro na REDIA Búzios: o envio ao e-mail informado (${email}) não foi possível. Repasse a senha provisória só ao usuário, por um canal individual.` : `Olá, ${nome.split(' ')[0]}. O seu cadastro na REDIA Búzios foi feito.`, '',
    `Chave: ${chave}`, `Nome: ${nome}`, `Unidade: ${un.nome} (${uep})`, `Função: ${posto}`, '',
    `Senha provisória: ${senha}`, '', `Acesso: ${app}`, '',
    'No primeiro acesso, o app pede que você crie uma senha pessoal. NÃO use a sua senha Petrobras: este é um ambiente de teste de um sistema em desenvolvimento (prova de conceito).',
    'Todas as informações e os valores exibidos no sistema são fictícios, gerados para os testes.',
  ].join('\n');
  let destino = '';
  if (await enviarEmail(email, `REDIA Búzios · senha provisória · ${chave}`, corpo(false))) destino = 'usuario';
  else if (await enviarEmail(Deno.env.get('REDIA_EMAIL_ADMIN') || '', `REDIA Búzios · autocadastro · senha provisória · ${chave}`, corpo(true))) destino = 'admin';
  if (!destino) { await desfazer('e-mail não enviado (usuário nem administrador)'); return resposta({ ok: false, mensagem: 'Não foi possível enviar a senha provisória agora. O cadastro não foi feito: tente mais tarde ou procure o administrador.' }, 502); }

  await registrar('cadastrado', destino === 'usuario' ? 'senha provisória enviada ao usuário' : 'senha provisória enviada ao administrador');
  await auditar('usuario.autocadastro', { uep, posto, envio: destino });
  return resposta({ ok: true, envio: destino, mensagem: destino === 'usuario'
    ? `Cadastro feito. A senha provisória foi enviada para ${mascarar(email)}. No primeiro acesso, troque a senha.`
    : 'Cadastro feito. O envio ao seu e-mail ainda não está disponível: a senha provisória foi enviada ao administrador da REDIA, que a repassa a você.' });
});
