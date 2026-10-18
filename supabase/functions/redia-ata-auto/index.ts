// REDIA Búzios · ata automática das 23:59 (D-75) · Supabase Edge Function ("Verify JWT" desligado)
// Versão de teste: todos os dias, às 23:59 (horário de Brasília), cada unidade ativa sem ata arquivada no dia recebe uma ata
// totalmente preenchida (dados fictícios onde estiver vazio), para manter a base do período de teste atualizada.
// Quem chama:
//   · o agendamento do banco (pg_cron, supabase/04_agendamento.sql) às 23:59 e às 00:10; sem credencial, a função só age
//     na janela de 23:55 a 00:15 de Brasília (fora dela, não faz nada) e só em dias sem ata;
//   · o administrador do sistema, pela Administração (com a sessão dele), para uma unidade e um dia (até hoje).
// O gerador é o mesmo do app (gerador.js, montado pelo build.py a partir de src/core.js e src/model.js).
// A gravação usa redia_sistema_gravar (só a chave do servidor), que marca a autoria como SISTEMA e registra na auditoria.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { gerarAtaAutomatica } from './gerador.js';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const resposta = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
function chaveServidor(): string {
  const legado = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legado) return legado;
  try { const k = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'); return String(k.default || Object.values(k)[0] || ''); } catch { return ''; }
}
/* data e minutos do dia em Brasília (sem horário de verão desde 2019) */
function agoraBrasilia() {
  const d = new Date(Date.now() - 3 * 3600 * 1000);
  return { iso: d.toISOString().slice(0, 10), min: d.getUTCHours() * 60 + d.getUTCMinutes() };
}
const addDias = (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { ...CORS, 'Access-Control-Allow-Headers': req.headers.get('access-control-request-headers') || CORS['Access-Control-Allow-Headers'] } });
  if (req.method !== 'POST') return resposta({ ok: false, mensagem: 'Use POST.' }, 405);
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, chaveServidor(), { auth: { persistSession: false } });
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { /* corpo vazio (agendamento) */ }
  const agora = agoraBrasilia();

  // quem chama: administrador do sistema (manual) ou agendamento (janela das 23:59)
  let dia = '', ueps: string[] | null = null, por = 'agendamento';
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: quem } = jwt ? await sb.auth.getUser(jwt) : { data: null };
  if (quem?.user) {
    const { data: adm } = await sb.from('perfis').select('chave, admin_sistema, ativo').eq('user_id', quem.user.id).maybeSingle();
    if (!adm?.admin_sistema || !adm.ativo) return resposta({ ok: false, mensagem: 'Só o administrador do sistema.' }, 403);
    dia = /^\d{4}-\d{2}-\d{2}$/.test(String(b.dia || '')) ? String(b.dia) : agora.iso;
    if (dia > agora.iso) return resposta({ ok: false, mensagem: 'Só até o dia de hoje.' }, 400);
    if (b.uep) ueps = [String(b.uep)];
    por = adm.chave;
  } else if (agora.min >= 23 * 60 + 55) dia = agora.iso;
  else if (agora.min <= 15) dia = addDias(agora.iso, -1);
  else return resposta({ ok: true, mensagem: 'Fora da janela das 23:59 (Brasília): nada a fazer.', feito: [] });

  const { data: unis } = await sb.from('unidades').select('uep, ativa').eq('ativa', true).order('ordem');
  const feito: unknown[] = [];
  for (const u of (unis || []).filter(x => !ueps || ueps.includes(x.uep))) {
    const { data: rows, error } = await sb.from('registros').select('id, tipo, data, uep, escopo, criado_em, gravado_em, autor, payload').eq('uep', u.uep).eq('data', dia).eq('escopo', 'dia');
    if (error) { feito.push({ uep: u.uep, erro: error.message }); continue; }
    if ((rows || []).some(r => r.tipo === 'ata')) { feito.push({ uep: u.uep, situacao: 'já tem ata' }); continue; }
    const { data: cfgRow } = await sb.from('uep_config').select('config').eq('uep', u.uep).maybeSingle();
    const regsDia = (rows || []).map(r => ({ v: 1, id: r.id, tipo: r.tipo, data: r.data, uep: r.uep, escopo: r.escopo, criadoEm: r.criado_em, gravadoEm: r.gravado_em, autor: r.autor, payload: r.payload }));
    const regs = gerarAtaAutomatica(u.uep, cfgRow?.config || {}, dia, regsDia);
    if (!regs.length) { feito.push({ uep: u.uep, situacao: 'nada a gerar' }); continue; }
    const { data: n, error: e2 } = await sb.rpc('redia_sistema_gravar', { p_uep: u.uep, p_data: dia, p_regs: regs });
    feito.push(e2 ? { uep: u.uep, erro: e2.message } : { uep: u.uep, situacao: 'ata gerada', registros: n });
  }
  return resposta({ ok: true, dia, por, feito });
});
