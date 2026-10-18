// REDIA Búzios · ações de administração que exigem o Auth (D-72) · Supabase Edge Function (com JWT do usuário logado)
// Só o ADMINISTRADOR DO SISTEMA (perfis.admin_sistema) pode chamar. Ações:
//   criar      { chave, nome, posto, email?, lotacoes:[{uep, admin, editor}], adminSistema?, compartilhado?, senha? }
//   redefinir  { userId, senha? }                     · gera senha provisória (ou usa a senha informada) e exige troca no 1º acesso
//   aprovar    { pedidoId }                           · aprova um pedido de autocadastro (quando a aprovação está ligada)
//   recusar    { pedidoId, motivo? }
//   importar   { usuarios:[{chave, nome, posto, uep}], senha }   · contas de teste compartilhadas (senha única digitada pelo administrador)
// Senha provisória: vai por e-mail ao usuário quando há e-mail e o envio funciona; senão, volta UMA VEZ para a tela do administrador.
// Tudo vai para a auditoria (sem senha). A chave do servidor fica só no ambiente da função.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const resposta = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const POSTO_COORD: Record<string, string> = {
  'GEOP': 'GEPLAT', 'GEPLAT': 'GEPLAT', 'GESTÃO': 'GEPLAT', 'COPROD': 'COPROD', 'SUPROD': 'COPROD', 'ENG PROCESSAMENTO': 'COPROD', 'ENG PETRÓLEO': 'COPROD',
  'COEMB': 'COEMB', 'SUEMB': 'COEMB', 'COMAN': 'COMAN', 'SUEIN': 'COMAN', 'SUMEC': 'COMAN', 'ENG ELETRICISTA': 'COMAN', 'ENG MECÂNICO': 'COMAN',
};
type Lot = { uep: string; admin?: boolean; editor?: boolean };

function senhaTemporaria(): string {
  const alfa = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789', b = new Uint8Array(10);
  crypto.getRandomValues(b);
  let s = Array.from(b, x => alfa[x % alfa.length]).join('');
  if (!/\d/.test(s)) s = s.slice(0, 9) + '7';
  if (!/[A-Za-z]/.test(s)) s = 'R' + s.slice(1);
  return s;
}
const senhaOk = (s: string) => s.length >= 8 && /\d/.test(s) && /[A-Za-z]/.test(s);
function chaveServidor(): string {
  const legado = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legado) return legado;
  try { const k = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'); return String(k.default || Object.values(k)[0] || ''); } catch { return ''; }
}
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
const textoSenha = (p: { chave: string; nome: string }, senha: string) => [
  `Olá, ${p.nome.split(' ')[0]}. Esta é a sua senha provisória da REDIA Búzios.`, '',
  `Chave: ${p.chave}`, `Senha provisória: ${senha}`, '', `Acesso: ${Deno.env.get('REDIA_APP_URL') || 'https://fabriciomartini.github.io/REDIA/app/'}`, '',
  'No primeiro acesso, o app pede que você crie uma senha pessoal. NÃO use a sua senha Petrobras: este é um ambiente de teste de um sistema em desenvolvimento (prova de conceito).',
].join('\n');

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { ...CORS, 'Access-Control-Allow-Headers': req.headers.get('access-control-request-headers') || CORS['Access-Control-Allow-Headers'] } });
  if (req.method !== 'POST') return resposta({ ok: false, mensagem: 'Use POST.' }, 405);
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, chaveServidor(), { auth: { persistSession: false } });

  // quem chama: precisa ser administrador do sistema e estar ativo
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: quem } = await sb.auth.getUser(jwt);
  if (!quem?.user) return resposta({ ok: false, mensagem: 'Sessão expirada. Entre de novo.' }, 401);
  const { data: adm } = await sb.from('perfis').select('chave, admin_sistema, ativo').eq('user_id', quem.user.id).maybeSingle();
  if (!adm?.admin_sistema || !adm.ativo) return resposta({ ok: false, mensagem: 'Só o administrador do sistema.' }, 403);
  const auditar = (acao: string, alvo: string, detalhe: Record<string, unknown>) => sb.from('auditoria').insert({ por: adm.chave, acao, alvo, detalhe });

  let b: Record<string, any> = {};
  try { b = await req.json(); } catch { /* corpo inválido */ }
  const dominio = Deno.env.get('REDIA_EMAIL_DOMINIO') || 'redia.local';
  const { data: unis } = await sb.from('unidades').select('uep');
  const UEPS = new Set((unis || []).map(u => u.uep));

  /* cria auth + perfil + lotações; desfaz o Auth se o perfil falhar */
  async function criar(p: { chave: string; nome: string; posto: string; email?: string; lotacoes: Lot[]; adminSistema?: boolean; compartilhado?: boolean }, senha: string, trocar: boolean) {
    const chave = String(p.chave || '').trim().toUpperCase(), nome = String(p.nome || '').trim(), posto = String(p.posto || '').trim().toUpperCase();
    const lot = (p.lotacoes || []).filter(l => UEPS.has(l.uep));
    if (!/^[A-Z0-9]{4}$/.test(chave)) return { erro: 'chave inválida' };
    if (nome.length < 2) return { erro: 'nome' };
    if (!POSTO_COORD[posto]) return { erro: 'função inválida' };
    if (!lot.length) return { erro: 'sem unidade de lotação' };
    const { data: ja } = await sb.from('perfis').select('user_id').eq('chave', chave).maybeSingle();
    if (ja) return { erro: 'chave já cadastrada', existe: true };
    const { data: cri, error } = await sb.auth.admin.createUser({ email: `${chave.toLowerCase()}@${dominio}`, password: senha, email_confirm: true, user_metadata: { chave } });
    if (error || !cri?.user) return { erro: 'Auth: ' + (error?.message || '') };
    const uid = cri.user.id;
    const { error: e2 } = await sb.from('perfis').insert({ user_id: uid, chave, nome, posto, coord: POSTO_COORD[posto], uep: lot[0].uep, email: p.email ? String(p.email).trim().toLowerCase() : null,
      admin: lot.some(l => l.admin), admin_sistema: !!p.adminSistema, ativo: true, trocar_senha: trocar, compartilhado: !!p.compartilhado });
    if (e2) { await sb.auth.admin.deleteUser(uid); return { erro: 'perfil: ' + e2.message }; }
    const { error: e3 } = await sb.from('lotacoes').insert(lot.map(l => ({ user_id: uid, uep: l.uep, admin: !!l.admin, editor: !!l.editor })));
    if (e3) { await sb.auth.admin.deleteUser(uid); return { erro: 'lotação: ' + e3.message }; }
    return { uid, chave, nome };
  }
  /* senha provisória: e-mail ao usuário; sem e-mail ou com falha, devolve para a tela do administrador (uma vez) */
  async function entregar(p: { chave: string; nome: string; email?: string | null }, senha: string) {
    if (p.email && await enviarEmail(p.email, `REDIA Búzios · senha provisória · ${p.chave}`, textoSenha(p, senha))) return { envio: 'usuario' };
    return { envio: 'tela', senhaTemporaria: senha };
  }

  switch (b.acao) {
    case 'criar': {
      const fixa = b.senha ? String(b.senha) : '';
      if (fixa && !senhaOk(fixa)) return resposta({ ok: false, mensagem: 'A senha precisa ter ao menos 8 caracteres, com letras e números.' }, 400);
      const senha = fixa || senhaTemporaria();
      const r = await criar(b as any, senha, !b.compartilhado);
      if ('erro' in r) return resposta({ ok: false, mensagem: r.existe ? 'Esta chave já está cadastrada.' : 'Não foi possível criar o usuário: ' + r.erro }, r.existe ? 409 : 400);
      const ent = fixa ? { envio: 'definida' } : await entregar({ chave: r.chave, nome: r.nome, email: b.email }, senha);
      await auditar('usuario.criar', r.chave, { posto: b.posto, lotacoes: b.lotacoes, adminSistema: !!b.adminSistema, compartilhado: !!b.compartilhado, envio: ent.envio });
      return resposta({ ok: true, ...ent });
    }
    case 'redefinir': {
      const { data: p } = await sb.from('perfis').select('user_id, chave, nome, email, compartilhado').eq('user_id', String(b.userId || '')).maybeSingle();
      if (!p) return resposta({ ok: false, mensagem: 'Usuário não encontrado.' }, 404);
      const fixa = b.senha ? String(b.senha) : '';
      if (fixa && !senhaOk(fixa)) return resposta({ ok: false, mensagem: 'A senha precisa ter ao menos 8 caracteres, com letras e números.' }, 400);
      const senha = fixa || senhaTemporaria();
      const { error } = await sb.auth.admin.updateUserById(p.user_id, { password: senha });
      if (error) return resposta({ ok: false, mensagem: 'Senha não alterada: ' + error.message }, 500);
      await sb.from('perfis').update({ trocar_senha: !p.compartilhado }).eq('user_id', p.user_id);
      const ent = fixa ? { envio: 'definida' } : await entregar(p, senha);
      await auditar('usuario.redefinir_senha', p.chave, { envio: ent.envio });
      return resposta({ ok: true, ...ent });
    }
    case 'aprovar': {
      const { data: q } = await sb.from('pedidos_cadastro').select('*').eq('id', Number(b.pedidoId)).eq('situacao', 'aguardando').maybeSingle();
      if (!q) return resposta({ ok: false, mensagem: 'Pedido não encontrado ou já tratado.' }, 404);
      const senha = senhaTemporaria();
      const r = await criar({ chave: q.chave, nome: q.nome, posto: q.posto || 'GEPLAT', email: q.email, lotacoes: [{ uep: q.uep }] }, senha, true);
      if ('erro' in r) { await sb.from('pedidos_cadastro').update({ situacao: 'falha', detalhe: 'aprovação: ' + r.erro }).eq('id', q.id); return resposta({ ok: false, mensagem: 'Não foi possível criar o usuário: ' + r.erro }, 400); }
      const ent = await entregar({ chave: r.chave, nome: r.nome, email: q.email }, senha);
      await sb.from('pedidos_cadastro').update({ situacao: 'cadastrado', detalhe: `aprovado por ${adm.chave} · envio ${ent.envio}` }).eq('id', q.id);
      await auditar('cadastro.aprovar', r.chave, { uep: q.uep, envio: ent.envio });
      return resposta({ ok: true, ...ent });
    }
    case 'recusar': {
      const { data: q } = await sb.from('pedidos_cadastro').update({ situacao: 'recusado', detalhe: `recusado por ${adm.chave}${b.motivo ? ' · ' + String(b.motivo).slice(0, 200) : ''}` }).eq('id', Number(b.pedidoId)).eq('situacao', 'aguardando').select('chave').maybeSingle();
      if (!q) return resposta({ ok: false, mensagem: 'Pedido não encontrado ou já tratado.' }, 404);
      await auditar('cadastro.recusar', q.chave, { motivo: b.motivo || '' });
      return resposta({ ok: true });
    }
    case 'importar': {
      const senha = String(b.senha || ''), us = Array.isArray(b.usuarios) ? b.usuarios.slice(0, 300) : [];
      if (!senhaOk(senha)) return resposta({ ok: false, mensagem: 'A senha única precisa ter ao menos 8 caracteres, com letras e números.' }, 400);
      const res = { criados: 0, existentes: 0, erros: [] as string[] };
      for (const u of us) {
        const r = await criar({ chave: u.chave, nome: u.nome, posto: u.posto, lotacoes: [{ uep: u.uep }], compartilhado: true }, senha, false);
        if ('erro' in r) { if (r.existe) res.existentes++; else res.erros.push(`${u.chave}: ${r.erro}`); } else res.criados++;
      }
      await auditar('usuario.importar', `${us.length} linhas`, { criados: res.criados, existentes: res.existentes, erros: res.erros.length });
      return resposta({ ok: true, ...res });
    }
    default: return resposta({ ok: false, mensagem: 'Ação desconhecida.' }, 400);
  }
});
