// Testes do schema Supabase (01_schema.sql) em PostgreSQL local (PGlite):
// RLS, autoria, hora oficial, registros só de acréscimo e pauta congelada no servidor.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const P = path.dirname(fileURLToPath(import.meta.url));
const erros = [];
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) erros.push(m); };

const db = new PGlite();
await db.exec(readFileSync(path.join(P, 'supabase-stub.sql'), 'utf8'));
await db.exec(readFileSync(path.join(P, '..', 'supabase', '01_schema.sql'), 'utf8'));
await db.exec(readFileSync(path.join(P, '..', 'supabase', '01_schema.sql'), 'utf8'));   // idempotente
ok(true, 'schema aplicado duas vezes sem erro (idempotente)');

const U = { cp: '00000000-0000-0000-0000-0000000000a1', gp: '00000000-0000-0000-0000-0000000000a2', em: '00000000-0000-0000-0000-0000000000a3', outra: '00000000-0000-0000-0000-0000000000b1', semPerfil: '00000000-0000-0000-0000-0000000000c1' };
await db.exec(`insert into auth.users (id, email) values
  ('${U.cp}','cp01@redia.local'),('${U.gp}','gp01@redia.local'),('${U.em}','ce01@redia.local'),('${U.outra}','xx01@redia.local'),('${U.semPerfil}','zz01@redia.local')`);
const r0 = await db.query(`select public.redia_vincular_perfil('CP01@redia.local','cp01','Usuário COPROD','SUPROD') as r`);
ok(r0.rows[0].r === 'CP01 → COPROD', 'redia_vincular_perfil mapeia SUPROD → COPROD');
await db.query(`select public.redia_vincular_perfil('gp01@redia.local','GP01','Usuário GEPLAT','GEPLAT','P-83',true)`);
await db.query(`select public.redia_vincular_perfil('ce01@redia.local','CE01','Usuário COEMB','SUEMB')`);
await db.query(`select public.redia_vincular_perfil('xx01@redia.local','XX01','Usuário outra UEP','COMAN','P-99')`);

async function como(uid, sql, params = []) {
  return db.transaction(async tx => {
    await tx.query(`set local role authenticated`);
    await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid, role: 'authenticated' })]);
    return tx.query(sql, params);
  });
}
async function falha(uid, sql, params = []) { try { await como(uid, sql, params); return null; } catch (e) { return e.message; } }
let n = 0;
const reg = (tipo, payload, extra = {}) => ({ v: 1, id: ('t' + String(++n).padStart(7, '0')), tipo, data: '2026-10-14', uep: 'P-83', criadoEm: '2026-10-14T10:00:00.000Z', gravadoEm: '2026-10-14T10:00:00.000Z', autor: { nome: 'Forjado', chave: 'ZZZZ', papel: 'GEOP' }, payload, ...extra });
const gravar = (uid, regs) => como(uid, `select public.redia_gravar($1::jsonb) as r`, [JSON.stringify(regs)]).then(x => x.rows[0].r);

// perfil
const pf = (await como(U.cp, `select public.redia_meu_perfil() as p`)).rows[0].p;
ok(pf.chave === 'CP01' && pf.coord === 'COPROD' && pf.uep === 'P-83' && pf.trocarSenha === true, 'redia_meu_perfil devolve chave, coordenação, UEP e troca de senha pendente');
await como(U.cp, `select public.redia_senha_trocada()`);
ok((await como(U.cp, `select public.redia_meu_perfil() as p`)).rows[0].p.trocarSenha === false, 'troca de senha registrada');
ok((await como(U.semPerfil, `select public.redia_meu_perfil() as p`)).rows[0].p === null, 'usuário sem perfil não tem perfil');

// gravação, autoria e hora oficial
const g1 = await gravar(U.cp, [reg('valor', { campo: 'oleo.real', valor: 26925 }), reg('valor', { campo: 'iuga.real', valor: 96.3 })]);
ok(g1.length === 2 && g1[0].autor.nome === 'Usuário COPROD' && g1[0].autor.chave === 'CP01' && g1[0].autor.papel === 'SUPROD', 'autoria vem do perfil, não do navegador (autor forjado ignorado)');
ok(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(g1[0].gravadoEm) && g1[0].gravadoEm !== '2026-10-14T10:00:00.000Z' && g1[1].gravadoEm > g1[0].gravadoEm, `hora oficial carimbada pelo servidor em ordem (${g1[0].gravadoEm})`);
ok(g1[0].criadoEm === '2026-10-14T10:00:00.000Z' && g1[0].escopo === undefined && g1[0].seq > 0, 'formato do registro igual ao do app (criadoEm, sem escopo no dia, seq)');
const gx = await gravar(U.cp, [reg('valor', { campo: 'oleo.potencial', valor: 1, exemplo: true }, { autor: { nome: 'Dados de exemplo', papel: 'sistema' } })]);
ok(gx[0].autor.nome === 'Dados de exemplo' && gx[0].autor.chave === '', 'dado de exemplo mantém o rótulo fictício');
const ac = (await db.query(`select autor_chave from public.registros where id = $1`, [gx[0].id])).rows[0].autor_chave;
ok(ac === 'CP01', 'mesmo no exemplo, a chave real fica gravada em autor_chave');

// idempotência
const dup = await gravar(U.cp, [{ ...reg('valor', { campo: 'x', valor: 1 }), id: g1[0].id }]);
ok(dup.length === 0, 'id repetido é ignorado (importação idempotente)');
n--;

// isolamento por UEP e permissões
ok(/UEP_NAO_PERMITIDA|row-level/.test(await falha(U.cp, `select public.redia_gravar($1::jsonb)`, [JSON.stringify([reg('valor', { campo: 'a', valor: 1 }, { uep: 'P-99' })])]) || ''), 'não grava registro de outra UEP');
ok(/SEM_PERFIL/.test(await falha(U.semPerfil, `select public.redia_gravar($1::jsonb)`, [JSON.stringify([reg('valor', { campo: 'a', valor: 1 })])]) || ''), 'usuário sem perfil não grava');
const lidoOutra = (await como(U.outra, `select public.redia_carregar('P-83', '2026-10-14', '{}') as r`)).rows[0].r;
ok(lidoOutra.registros.length === 0, 'usuário de outra UEP não lê os registros da P-83');
const direto = (await como(U.outra, `select count(*)::int as n from public.registros`)).rows[0].n;
ok(direto === 0, 'RLS também vale na leitura direta da tabela');
ok(/permission denied/.test(await falha(U.cp, `update public.registros set payload = '{}'::jsonb`) || ''), 'UPDATE negado (só acréscimo)');
ok(/permission denied/.test(await falha(U.cp, `delete from public.registros`) || ''), 'DELETE negado (só acréscimo)');
ok(/permission denied/.test(await falha(U.cp, `insert into public.perfis (user_id, chave, nome, posto, coord) values ('${U.semPerfil}','ZZ01','x','GEOP','GEPLAT')`) || ''), 'usuário não cria perfil');
ok(/permission denied/.test(await falha(U.cp, `update public.perfis set admin = true`) || ''), 'usuário não se torna administrador');
ok(/permission denied/.test(await falha(U.cp, `select public.redia_vincular_perfil('zz01@redia.local','ZZ01','x','GEOP')`) || ''), 'usuário não executa a função de administração');
const outrosPerfis = (await como(U.cp, `select count(*)::int as n from public.perfis`)).rows[0].n;
ok(outrosPerfis === 1, 'cada usuário só vê o próprio perfil');
await db.exec(`set role anon`);
let anonErr = null; try { await db.query(`select public.redia_carregar('P-83','2026-10-14','{}')`); } catch (e) { anonErr = e.message; }
await db.exec(`reset role`);
ok(/permission denied/.test(anonErr || ''), 'anônimo (sem login) não executa as funções');

// pauta congelada (R-03 no servidor)
await gravar(U.gp, [reg('congelamento', { snapshot: {}, hash: 'abc' })]);
ok(/PAUTA_CONGELADA/.test(await falha(U.cp, `select public.redia_gravar($1::jsonb)`, [JSON.stringify([reg('valor', { campo: 'oleo.real', valor: 1 })])]) || ''), 'com a pauta congelada, a curadoria é recusada pelo servidor');
ok(/PAUTA_CONGELADA/.test(await falha(U.gp, `select public.redia_gravar($1::jsonb)`, [JSON.stringify([reg('congelamento', { snapshot: {}, hash: 'x' })])]) || ''), 'congelar duas vezes é recusado');
const okCong = await gravar(U.cp, [reg('demanda', { titulo: 'x', status: 'aberta' }, { escopo: 'demandas' }), reg('notificacao', { coord: 'COPROD' }), reg('anexo', { tipo: 'transcricao' }), reg('atualiza', { alvo: 'x', campos: {} }, { escopo: 'demandas' })]);
ok(okCong.length === 4 && okCong[0].escopo === 'demandas', 'demanda, notificação, anexo e status de demanda passam com a pauta congelada');
ok((await gravar(U.cp, [reg('reuniao', { tipo: 'decisao', texto: 'teste', por: 'GEOP' })])).length === 1, 'registro da reunião (decisão/aprendizado/tempo) passa com a pauta congelada (D-61)');
const outroDia = await gravar(U.cp, [reg('valor', { campo: 'oleo.real', valor: 2 }, { data: '2026-10-15' })]);
ok(outroDia.length === 1, 'o congelamento vale só para o dia congelado');
await gravar(U.gp, [reg('reabertura', { motivo: 'teste' })]);
ok((await gravar(U.cp, [reg('valor', { campo: 'oleo.real', valor: 3 })])).length === 1, 'depois da reabertura, a curadoria volta a gravar');

// carga do dia + acumulados do mês
await gravar(U.cp, [reg('valor', { campo: 'gas.prod_d1', valor: 5 }, { data: '2026-10-03' }), reg('valor', { campo: 'oleo.real', valor: 5 }, { data: '2026-10-03' }), reg('valor', { campo: 'gas.prod_d1', valor: 9 }, { data: '2026-09-30' })]);
const car = (await como(U.cp, `select public.redia_carregar('P-83', '2026-10-14', array['gas.prod_d1']) as r`)).rows[0].r;
const datas = car.registros.map(r => r.data + ':' + (r.payload.campo || r.tipo));
ok(datas.includes('2026-10-03:gas.prod_d1') && !datas.includes('2026-10-03:oleo.real') && !datas.includes('2026-09-30:gas.prod_d1') && !datas.some(d => d.startsWith('2026-10-15')), 'carga traz o dia, as demandas e só os campos de acumulado do próprio mês');
ok(car.seq >= car.registros[car.registros.length - 1].seq, 'carga devolve a sequência para a sincronização incremental');
const nov = (await como(U.cp, `select public.redia_novos('P-83', $1) as r`, [car.seq - 2])).rows[0].r;
ok(nov.registros.length === 2 && nov.seq === car.seq, 'redia_novos traz só o que entrou depois da sequência');
// D-61: tendência de 7 dias atravessa a virada do mês e traz listas (queima.causas) dos dias anteriores
await gravar(U.cp, [reg('valor', { campo: 'oleo.real', valor: 7 }, { data: '2026-09-28' }), reg('valor', { campo: 'oleo.real', valor: 6 }, { data: '2026-09-23' }), reg('lista', { campo: 'queima.causas', itens: [{ causa: 'x', valor: 1, classe: 'Rotina' }] }, { data: '2026-09-29' })]);
const car2 = (await como(U.cp, `select public.redia_carregar('P-83', '2026-10-01', array['oleo.real', 'queima.causas']) as r`)).rows[0].r;
const d2 = car2.registros.map(r => r.data + ':' + (r.payload.campo || r.tipo));
ok(d2.includes('2026-09-28:oleo.real') && d2.includes('2026-09-29:queima.causas') && !d2.includes('2026-09-23:oleo.real'), 'carga traz valores e listas dos 7 dias anteriores mesmo no início do mês (D-61)');

// configuração
ok(/SEM_PERMISSAO/.test(await falha(U.cp, `select public.redia_config_salvar('P-83', '{"timeboxMin":6}'::jsonb)`) || ''), 'COPROD não altera a configuração da UEP');
await como(U.gp, `select public.redia_config_salvar('P-83', '{"timeboxMin":6}'::jsonb)`);
ok((await como(U.cp, `select public.redia_config_ler('P-83') as c`)).rows[0].c.timeboxMin === 6, 'GEPLAT salva e todos da UEP leem a configuração');
ok((await como(U.outra, `select public.redia_config_ler('P-83') as c`)).rows[0].c === null, 'outra UEP não lê a configuração da P-83');

// lote inválido
ok(/LOTE_INVALIDO/.test(await falha(U.cp, `select public.redia_gravar('[]'::jsonb)`) || ''), 'lote vazio recusado');
ok(/violates check|tipo/.test(await falha(U.cp, `select public.redia_gravar($1::jsonb)`, [JSON.stringify([reg('invasao', {})])]) || ''), 'tipo de registro desconhecido recusado');

// reset da demonstração (D-52)
ok(/SEM_PERMISSAO_RESET/.test(await falha(U.cp, `select public.redia_resetar('P-83')`) || ''), 'reset: só o administrador da UEP pode resetar');
ok(/SEM_PERMISSAO_RESET/.test(await falha(U.gp, `select public.redia_resetar('P-99')`) || ''), 'reset: administrador não reseta outra UEP');
const antesP99 = (await db.query(`select count(*)::int n from public.registros where uep = 'P-99'`)).rows[0].n;
const seqAntes = (await como(U.cp, `select public.redia_carregar('P-83', '2026-10-14', '{}') as r`)).rows[0].r.seq;
const apagados = (await como(U.gp, `select public.redia_resetar('P-83') as n`)).rows[0].n;
const restantes = (await db.query(`select count(*)::int n from public.registros where uep = 'P-83'`)).rows[0].n;
ok(apagados > 10 && restantes === 0 && (await db.query(`select count(*)::int n from public.registros where uep = 'P-99'`)).rows[0].n === antesP99, `reset apaga só os registros da UEP (${apagados} apagados)`);
const pos = (await como(U.cp, `select public.redia_novos('P-83', $1) as r`, [seqAntes])).rows[0].r;
ok(pos.max === 0 && pos.max < seqAntes, 'redia_novos devolve max menor que a sequência do app: outras sessões detectam o reset');
ok((await como(U.cp, `select public.redia_meu_perfil() as p`)).rows[0].p.chave === 'CP01' && (await como(U.cp, `select public.redia_config_ler('P-83') as c`)).rows[0].c.timeboxMin === 6, 'reset mantém perfis e configuração');
ok((await gravar(U.cp, [reg('valor', { campo: 'oleo.real', valor: 1 })])).length === 1, 'depois do reset, a REDIA volta a gravar normalmente');

// contas genéricas e pedidos de nova senha (D-56)
await db.query(`update public.perfis set compartilhado = true, trocar_senha = true where user_id = $1`, [U.cp]);
const pfc = (await como(U.cp, `select public.redia_meu_perfil() as p`)).rows[0].p;
ok(pfc.compartilhado === true && pfc.trocarSenha === false, 'conta compartilhada: perfil avisa o app e nunca pede troca de senha');
await db.query(`update public.perfis set compartilhado = false, trocar_senha = false where user_id = $1`, [U.cp]);
await db.query(`insert into public.pedidos_senha (chave, uep, situacao, detalhe) values ('CP01', 'P-83', 'enviada', 'teste'), ('XX01', 'P-99', 'falha', 'teste')`);
ok(/permission denied/.test(await falha(U.gp, `select * from public.pedidos_senha`) || ''), 'pedidos de senha não são lidos direto da tabela por usuários');
ok(/permission denied/.test(await falha(U.cp, `insert into public.pedidos_senha (chave, situacao) values ('CP01', 'enviada')`) || ''), 'usuário não grava pedido de senha direto (só a função do servidor)');
const pdAdm = (await como(U.gp, `select public.redia_pedidos_senha('P-83') as r`)).rows[0].r, pdCp = (await como(U.cp, `select public.redia_pedidos_senha('P-83') as r`)).rows[0].r;
ok(pdAdm.length === 1 && pdAdm[0].chave === 'CP01' && pdAdm[0].situacao === 'enviada' && pdCp.length === 0, 'administrador vê os pedidos da própria UEP; demais usuários não veem');

console.log(`\n${erros.length ? 'FALHAS: ' + erros.length : 'Todos os testes SQL passaram.'}`);
process.exit(erros.length ? 1 : 0);
