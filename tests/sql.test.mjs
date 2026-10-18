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
await db.query(`insert into public.unidades (uep, nome, ordem) values ('P-99', 'Unidade de teste', 99) on conflict do nothing`);   // D-70: unidade fora de Búzios só para o teste de isolamento
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
ok(datas.includes('2026-10-03:gas.prod_d1') && !datas.includes('2026-10-03:oleo.real') && datas.includes('2026-09-30:gas.prod_d1') && !datas.some(d => d.startsWith('2026-10-15')), 'carga traz o dia, as demandas e só os campos pedidos dos dias anteriores (mês ou 30 dias), nunca de dias futuros');
ok(car.seq >= car.registros[car.registros.length - 1].seq, 'carga devolve a sequência para a sincronização incremental');
const nov = (await como(U.cp, `select public.redia_novos('P-83', $1) as r`, [car.seq - 2])).rows[0].r;
ok(nov.registros.length === 2 && nov.seq === car.seq, 'redia_novos traz só o que entrou depois da sequência');
// D-61: tendência de 7 dias atravessa a virada do mês e traz listas (queima.causas) dos dias anteriores
await gravar(U.cp, [reg('valor', { campo: 'oleo.real', valor: 7 }, { data: '2026-09-28' }), reg('valor', { campo: 'oleo.real', valor: 6 }, { data: '2026-08-25' }), reg('lista', { campo: 'queima.causas', itens: [{ causa: 'x', valor: 1, classe: 'Rotina' }] }, { data: '2026-09-29' }), reg('sugestao', { coord: 'COPROD', titulo: 'FGRU A fora', tag: 'FGRU A' }, { data: '2026-09-20' })]);
const car2 = (await como(U.cp, `select public.redia_carregar('P-83', '2026-10-01', array['oleo.real', 'queima.causas']) as r`)).rows[0].r;
const d2 = car2.registros.map(r => r.data + ':' + (r.payload.campo || r.tipo));
ok(d2.includes('2026-09-28:oleo.real') && d2.includes('2026-09-29:queima.causas') && !d2.includes('2026-08-25:oleo.real') && d2.includes('2026-09-20:sugestao'), 'carga traz valores, listas e sugestões dos 30 dias anteriores mesmo no início do mês (D-61, D-63)');
// D-63 (proposta 30): busca no histórico
const bus = (await como(U.cp, `select public.redia_buscar('P-83', 'fgru a', 50) as r`)).rows[0].r;
ok(Array.isArray(bus) && bus.some(r => r.tipo === 'sugestao' && r.data === '2026-09-20') && bus.every(r => r.uep === 'P-83'), 'redia_buscar encontra registros antigos por texto (TAG), só da UEP do usuário');
ok((await como(U.cp, `select public.redia_buscar('P-83', 'f', 50) as r`)).rows[0].r.length === 0, 'redia_buscar ignora texto com menos de 2 caracteres');
ok((await como(U.outra, `select public.redia_buscar('P-83', 'fgru', 50) as r`)).rows[0].r.length === 0, 'redia_buscar de outra UEP não vê os registros (RLS)');
// D-65: arquivo das REDIAs (atas e congelamentos de todos os dias, sem o retrato da pauta)
const arq = (await como(U.cp, `select public.redia_arquivo('P-83', 100) as r`)).rows[0].r;
ok(Array.isArray(arq) && arq.length >= 2 && arq.every(r => ['ata', 'redia', 'congelamento', 'reabertura'].includes(r.tipo)) && arq.every(r => !('snapshot' in r.payload)) && arq.every((r, i) => !i || arq[i - 1].data >= r.data), 'redia_arquivo lista congelamentos/reaberturas/atas por data, sem o retrato da pauta');
ok((await como(U.outra, `select public.redia_arquivo('P-83', 100) as r`)).rows[0].r.length === 0, 'redia_arquivo de outra UEP não vê nada (RLS)');
// D-67: REDIA com código único, de acordo dos responsáveis e ata imutável (dia 2026-10-20)
const D = { data: '2026-10-20' };
const rd = await gravar(U.gp, [reg('redia', { codigo: 'FORJADO', coord: 'GEPLAT' }, D)]);
ok(rd[0].payload.codigo === 'REDIA-P83-20102026', 'REDIA iniciada recebe o código do servidor (REDIA-<UEP>-<DDMMAAAA>), não o enviado pelo app');
ok(/REDIA_JA_INICIADA/.test(await falha(U.cp, `select public.redia_gravar($1::jsonb)`, [JSON.stringify([reg('redia', {}, D)])]) || ''), 'segunda REDIA no mesmo dia é recusada');
await gravar(U.cp, [reg('conclusao', { coord: 'COPROD', concluido: true }, D), reg('item', { coord: 'COEMB', tipo: 'ameaca', texto: 'x' }, D)]);
await gravar(U.em, [reg('decisao', { coord: 'COEMB', alvo: 'x', acao: 'aprovar' }, D), reg('valor', { coord: 'COMAN', campo: 'man.x', valor: 1, exemplo: true }, D)]);
const resp = (await como(U.gp, `select public.redia_responsaveis('P-83', '2026-10-20') as r`)).rows[0].r;
ok(JSON.stringify(resp.map(x => x.coord + ':' + (x.chave || '-'))) === JSON.stringify(['GEPLAT:-', 'COPROD:CP01', 'COEMB:CE01']), `responsáveis pelo de acordo: quem concluiu (COPROD), a última alteração (COEMB, supervisor); exemplo não conta; GEPLAT sempre (${JSON.stringify(resp)})`);
ok(/PAUTA_NAO_CONGELADA/.test(await falha(U.cp, `select public.redia_gravar($1::jsonb)`, [JSON.stringify([reg('acordo', { coord: 'COPROD' }, D)])]) || ''), 'de acordo antes do congelamento é recusado');
await gravar(U.gp, [reg('congelamento', { snapshot: {}, hash: 'h' }, D)]);
await gravar(U.cp, [reg('acordo', { coord: 'COPROD' }, D)]);
await gravar(U.gp, [reg('acordo', { coord: 'GEPLAT' }, D), reg('acordo', { coord: 'COEMB' }, D)]);   // de acordo da COEMB dado por outra pessoa não vale
ok(/ATA_SEM_ACORDO/.test(await falha(U.gp, `select public.redia_gravar($1::jsonb)`, [JSON.stringify([reg('ata', { participantes: [] }, D)])]) || ''), 'ata sem o de acordo do responsável da COEMB (de acordo dado por outro usuário não vale) é recusada');
await gravar(U.em, [reg('acordo', { coord: 'COEMB' }, D)]);
const at = await gravar(U.gp, [reg('ata', { participantes: ['a'] }, D)]);
ok(at.length === 1 && at[0].payload.codigo === 'REDIA-P83-20102026', 'com o de acordo de todos, a ata fecha com o código da REDIA');
ok(/ATA_FECHADA/.test(await falha(U.gp, `select public.redia_gravar($1::jsonb)`, [JSON.stringify([reg('ata', { participantes: [] }, D)])]) || '') && /ATA_FECHADA/.test(await falha(U.cp, `select public.redia_gravar($1::jsonb)`, [JSON.stringify([reg('reuniao', { tipo: 'decisao', texto: 'x' }, D)])]) || '') && /ATA_FECHADA/.test(await falha(U.gp, `select public.redia_gravar($1::jsonb)`, [JSON.stringify([reg('reabertura', { motivo: 'x' }, D)])]) || ''), 'ata fechada: nada mais entra no dia (nova ata, reunião, reabertura)');
ok((await gravar(U.cp, [reg('demanda', { titulo: 'depois da ata', status: 'aberta' }, { ...D, escopo: 'demandas' })])).length === 1, 'demandas (escopo próprio) seguem liberadas depois da ata');
const bf = (await como(U.cp, `select public.redia_buscar('P-83', '', 50, '2026-10-20', '2026-10-20', 'COEMB', array['item']) as r`)).rows[0].r;
ok(bf.length === 1 && bf[0].tipo === 'item' && bf[0].payload.coord === 'COEMB', 'redia_buscar com filtros de período, coordenação e tipo, sem texto (D-67)');
const arq2 = (await como(U.cp, `select public.redia_arquivo('P-83', 100) as r`)).rows[0].r;
ok(arq2.some(r => r.tipo === 'ata' && r.payload.codigo === 'REDIA-P83-20102026') && arq2.some(r => r.tipo === 'redia'), 'redia_arquivo traz a ata (com o código) e a abertura da REDIA');

// D-70 · REDIA Búzios: lotação por unidade, administrador do sistema e administração
ok((await db.query(`select count(*)::int n from public.unidades where uep in ('P-74','P-75','P-76','P-77','P-78','P-79','P-80','P-82','P-83','P-91')`)).rows[0].n === 10, 'as 10 unidades de Búzios estão cadastradas');
ok((await db.query(`select count(*)::int n from public.lotacoes l join public.perfis p using (user_id) where p.chave in ('CP01','GP01') and l.uep = 'P-83'`)).rows[0].n === 2, 'perfis existentes ficam lotados na própria unidade (migração)');
const r74 = reg('valor', { campo: 'oleo.real', valor: 1 }, { uep: 'P-74', data: '2026-10-21' });
ok(/UEP_NAO_PERMITIDA|row-level/.test(await falha(U.cp, `select public.redia_gravar($1::jsonb)`, [JSON.stringify([r74])]) || ''), 'usuário lotado só na P-83 não grava na P-74');
await db.query(`insert into public.lotacoes (user_id, uep) values ('${U.cp}', 'P-74')`);
ok((await gravar(U.cp, [r74])).length === 1 && (await como(U.cp, `select count(*)::int n from public.registros where uep = 'P-74'`)).rows[0].n === 1, 'com lotação na P-74, o mesmo usuário grava e lê a P-74');
ok((await como(U.em, `select count(*)::int n from public.registros where uep = 'P-74'`)).rows[0].n === 0, 'usuário sem lotação na P-74 não vê os registros dela (RLS)');
const mp = (await como(U.cp, `select public.redia_meu_perfil() as p`)).rows[0].p;
ok(mp.unidades.map(u => u.uep).join() === 'P-74,P-83' && mp.adminSistema === false, `perfil traz as unidades de lotação (${mp.unidades.map(u => u.uep).join()})`);
ok(/SEM_PERMISSAO_ADMIN/.test(await falha(U.gp, `select public.redia_admin_usuarios()`) || ''), 'administrador da unidade não acessa a administração do sistema');
await db.query(`update public.perfis set admin_sistema = true where chave = 'GP01'`);
const mpa = (await como(U.gp, `select public.redia_meu_perfil() as p`)).rows[0].p;
ok(mpa.adminSistema && mpa.unidades.length >= 10 && (await como(U.gp, `select count(*)::int n from public.registros where uep = 'P-74'`)).rows[0].n === 1, 'administrador do sistema vê todas as unidades e os registros de cada uma');
const lu = (await como(U.gp, `select public.redia_admin_usuarios() as r`)).rows[0].r;
const ucp = lu.find(x => x.chave === 'CP01');
ok(lu.length >= 4 && ucp.lotacoes.map(l => l.uep).join() === 'P-74,P-83', 'administração lista usuários com as lotações');
await como(U.gp, `select public.redia_admin_salvar_usuario($1::jsonb)`, [JSON.stringify({ userId: U.cp, nome: 'Usuário COPROD', posto: 'COPROD', lotacoes: [{ uep: 'P-75', editor: true }, { uep: 'P-83' }], uep: 'P-75' })]);
const ucp2 = (await como(U.gp, `select public.redia_admin_usuarios() as r`)).rows[0].r.find(x => x.chave === 'CP01');
ok(ucp2.lotacoes.map(l => l.uep + (l.editor ? '*' : '')).join() === 'P-75*,P-83' && ucp2.uep === 'P-75' && ucp2.posto === 'COPROD', 'administrador do sistema altera posto, lotações e o papel de editor por unidade');
ok(/AUTO_BLOQUEIO/.test(await falha(U.gp, `select public.redia_admin_salvar_usuario($1::jsonb)`, [JSON.stringify({ userId: U.gp, adminSistema: false, lotacoes: [{ uep: 'P-83' }] })]) || ''), 'administrador não retira o próprio perfil de administrador');
ok(/SEM_LOTACAO/.test(await falha(U.gp, `select public.redia_admin_salvar_usuario($1::jsonb)`, [JSON.stringify({ userId: U.cp, lotacoes: [] })]) || ''), 'usuário precisa de ao menos uma unidade de lotação');
await como(U.gp, `select public.redia_admin_revisar($1::uuid)`, [U.cp]);
const au = (await como(U.gp, `select public.redia_admin_auditoria(50) as r`)).rows[0].r;
ok(au.some(a => a.acao === 'usuario.alterar' && a.alvo === 'CP01' && a.por === 'GP01') && au.some(a => a.acao === 'usuario.revisar_acesso'), 'alterações e revisões de acesso ficam na auditoria (quem, quando, o quê)');
const rs = (await como(U.gp, `select public.redia_admin_resumo() as r`)).rows[0].r;
ok(rs.unidades.length >= 10 && rs.cadastro.aberto === true && rs.unidades.find(u => u.uep === 'P-75').editores === 1, 'resumo por unidade (usuários, editores, registros) e parâmetros do autocadastro');
await como(U.gp, `select public.redia_admin_salvar_unidade($1::jsonb)`, [JSON.stringify({ uep: 'P-91', situacao: 'comissionamento' })]);
ok((await db.query(`select situacao from public.unidades where uep = 'P-91'`)).rows[0].situacao === 'comissionamento', 'administrador marca a unidade "em comissionamento"');
await db.query(`update public.perfis set admin_sistema = false where chave = 'GP01'`);
// D-73 · Studio: layout por unidade, só o editor da unidade salva e publica; todos da unidade leem o publicado
ok(/SEM_PERMISSAO_EDITOR/.test(await falha(U.gp, `select public.redia_layout_salvar('P-75', '{"v":1}'::jsonb, true)`) || ''), 'Studio: quem não é editor da unidade não publica layout');
const lay = { v: 1, telas: { abertura: { cards: { pob: { oculto: true } }, rotulos: { Meta: 'Alvo' } } } };
let lr = (await como(U.cp, `select public.redia_layout_salvar('P-75', $1::jsonb, false) as r`, [JSON.stringify(lay)])).rows[0].r;
ok(lr.versao === 0 && lr.rascunho?.telas?.abertura && lr.editor === true, 'Studio: editor salva o rascunho (sem publicar)');
lr = (await como(U.cp, `select public.redia_layout_salvar('P-75', $1::jsonb, true) as r`, [JSON.stringify(lay)])).rows[0].r;
ok(lr.versao === 1 && lr.publicado.telas.abertura.rotulos.Meta === 'Alvo' && lr.rascunho === null && lr.hist.length === 1, 'Studio: publicar cria a versão 1 e limpa o rascunho');
await como(U.cp, `select public.redia_layout_salvar('P-75', '{}'::jsonb, true)`);
lr = (await como(U.cp, `select public.redia_layout_restaurar('P-75', 1) as r`)).rows[0].r;
ok(lr.versao === 3 && lr.publicado.telas.abertura.cards.pob.oculto === true && /restaurar v1/.test(lr.hist[0].acao), 'Studio: restaurar a versão 1 republica como versão 3');
await db.query(`insert into public.lotacoes (user_id, uep) values ('${U.em}', 'P-75')`);
const le = (await como(U.em, `select public.redia_layout_ler('P-75') as r`)).rows[0].r;
ok(le.versao === 3 && le.editor === false && le.rascunho === null && le.hist.length === 0, 'Studio: usuário lotado (não editor) lê só o layout publicado');
ok(/UEP_NAO_PERMITIDA/.test(await falha(U.outra, `select public.redia_layout_ler('P-75')`) || ''), 'Studio: usuário de outra unidade não lê o layout');
ok(/permission denied/.test(await falha(U.cp, `select * from public.layouts`) || ''), 'Studio: tabela de layouts não é lida direto (só pelas funções)');
ok((await db.query(`select count(*)::int n from public.auditoria where acao in ('layout.publicar', 'layout.restaurar') and alvo = 'P-75'`)).rows[0].n === 4, 'Studio: publicações e restauração ficam na auditoria');
await db.query(`delete from public.layouts_hist where uep = 'P-75'`); await db.query(`delete from public.layouts where uep = 'P-75'`);
await db.query(`delete from public.lotacoes where uep in ('P-74','P-75')`); await db.query(`update public.perfis set uep = 'P-83' where chave = 'CP01'`);

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
