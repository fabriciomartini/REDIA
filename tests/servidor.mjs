// Servidor local de testes: serve o app montado (dist) e, opcionalmente, simula o Supabase
// (Auth, RPC do PostgREST e Storage) sobre um PostgreSQL local (PGlite) com o MESMO schema
// de supabase/01_schema.sql. Só para testes automatizados: não use em produção.
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, randomBytes } from 'node:crypto';

const P = path.dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webm': 'video/webm', '.txt': 'text/plain' };
export const CHAVE_SERVICO_TESTE = 'service-teste';
const TIPOS_ARG = { p_regs: 'jsonb', p_config: 'jsonb', p_campos_mes: 'text[]', p_seq: 'bigint', p_data: 'date', p_uep: 'text', p_texto: 'text', p_limite: 'integer' };

export async function iniciarServidor({ estatico, porta = 0, supabase = false, emailAdmin = 'admin@exemplo.test' } = {}) {
  let db = null;
  const tokens = new Map();      // access_token -> { uid, email, exp }
  const refresh = new Map();     // refresh_token -> uid
  const emails = [];   // e-mails simulados da recuperação de senha
  const arquivos = new Map();    // 'redia/<caminho>' -> { tipo, dados }
  const chamadas = [];           // registro das chamadas (para os testes)
  if (supabase) {
    const { PGlite } = await import('@electric-sql/pglite');
    db = new PGlite();
    await db.exec(readFileSync(path.join(P, 'supabase-stub.sql'), 'utf8'));
    await db.exec(readFileSync(path.join(P, '..', 'supabase', '01_schema.sql'), 'utf8'));
  }
  let fila = Promise.resolve();
  const serial = fn => (fila = fila.then(fn, fn));   // PGlite tem uma conexão: uma operação por vez

  const b64u = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  function emitir(u) {
    const agora = Math.floor(Date.now() / 1000), exp = agora + 3600;
    const access = `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u({ sub: u.id, email: u.email, role: 'authenticated', aud: 'authenticated', iat: agora, exp, session_id: randomUUID() })}.${randomBytes(16).toString('base64url')}`;
    const rt = randomBytes(18).toString('base64url');
    tokens.set(access, { uid: u.id, email: u.email, exp }); refresh.set(rt, u.id);
    return { access_token: access, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: rt, user: usuarioJson(u) };
  }
  const usuarioJson = u => ({ id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, email_confirmed_at: '2026-01-01T00:00:00Z', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' });
  function quem(req) {
    const a = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const t = tokens.get(a);
    return t && t.exp > Date.now() / 1000 ? t : null;
  }
  async function comoUsuario(uid, sql, params) {
    return db.transaction(async tx => {
      await tx.query('set local role authenticated');
      await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid, role: 'authenticated' })]);
      return tx.query(sql, params);
    });
  }
  const corpo = req => new Promise((res, rej) => { const c = []; req.on('data', d => c.push(d)); req.on('end', () => res(Buffer.concat(c))); req.on('error', rej); });
  const json = (res, st, o, extra = {}) => { res.writeHead(st, { 'content-type': 'application/json', ...extra }); res.end(o === undefined ? '' : JSON.stringify(o)); };

  async function api(req, res, url) {
    const rota = url.pathname;
    chamadas.push(req.method + ' ' + rota);
    // ---------------- Admin (chave service_role: só o script de cadastro usa) ----------------
    const servico = (req.headers.authorization || '') === 'Bearer ' + CHAVE_SERVICO_TESTE;
    if (rota.startsWith('/auth/v1/admin/users')) {
      if (!servico) return json(res, 401, { msg: 'This endpoint requires a valid service_role key' });
      const id = rota.split('/')[5];
      if (req.method === 'POST' && !id) {
        const b = JSON.parse((await corpo(req)).toString() || '{}');
        const ex = await serial(() => db.query('select id from auth.users where lower(email) = lower($1)', [b.email]));
        if (ex.rows.length) return json(res, 422, { code: 422, error_code: 'email_exists', msg: 'A user with this email address has already been registered' });
        const u = { id: randomUUID(), email: b.email };
        await serial(() => db.query('insert into auth.users (id, email, senha) values ($1, $2, $3)', [u.id, u.email, b.password]));
        return json(res, 200, usuarioJson(u));
      }
      if (req.method === 'GET') { const r = await serial(() => db.query('select id, email from auth.users order by email')); return json(res, 200, { users: r.rows.map(usuarioJson) }); }
      if (req.method === 'PUT' && id) { const b = JSON.parse((await corpo(req)).toString() || '{}'); await serial(() => db.query('update auth.users set senha = $1 where id = $2', [b.password, id])); return json(res, 200, usuarioJson({ id, email: '' })); }
    }
    if (rota === '/rest/v1/perfis' && req.method === 'GET') {
      if (!servico) return json(res, 401, { code: '42501', message: 'permission denied for table perfis' });
      const uid = (url.searchParams.get('user_id') || '').replace(/^eq\./, '');
      const r = await serial(() => db.query('select chave, compartilhado, trocar_senha from public.perfis where user_id = $1', [uid]));
      return json(res, 200, r.rows);
    }
    // ---------------- Edge Function "Esqueci a senha" (D-56): mesma lógica de supabase/functions/redia-recuperar-senha ----------------
    if (rota === '/functions/v1/redia-recuperar-senha' && req.method === 'POST') {
      let chave = ''; try { chave = String(JSON.parse((await corpo(req)).toString() || '{}').chave || '').trim().toUpperCase(); } catch { }
      if (!/^[A-Z0-9]{4}$/.test(chave)) return json(res, 400, { ok: false, mensagem: 'Informe a chave com 4 letras ou números.' });
      const PADRAO = { ok: true, mensagem: 'Pedido registrado. Se a chave estiver cadastrada, o administrador recebe a nova senha temporária e a repassa a você.' };
      const reg = (sit, det, uep = null) => serial(() => db.query('insert into public.pedidos_senha (chave, uep, situacao, detalhe) values ($1, $2, $3, $4)', [chave, uep, sit, det]));
      const p = (await serial(() => db.query('select * from public.perfis where chave = $1', [chave]))).rows[0];
      if (!p || !p.ativo) { await reg('ignorado', 'chave sem perfil ativo'); return json(res, 200, PADRAO); }
      const rec = (await serial(() => db.query(`select count(*)::int n from public.pedidos_senha where chave = $1 and situacao = 'enviada' and pedido_em > now() - interval '15 minutes'`, [chave]))).rows[0].n;
      if (rec) { await reg('ignorado', 'novo pedido em menos de 15 min', p.uep); return json(res, 200, PADRAO); }
      if (!emailAdmin) { await reg('falha', 'envio de e-mail não configurado', p.uep); return json(res, 503, { ok: false, mensagem: 'A recuperação de senha ainda não está configurada. Procure o administrador da REDIA.' }); }
      const senha = 'Tmp' + randomUUID().replace(/-/g, '').slice(0, 7) + '9';
      emails.push({ para: emailAdmin, chave, senha, compartilhado: p.compartilhado });
      await serial(() => db.query('update auth.users set senha = $1 where id = $2', [senha, p.user_id]));
      await serial(() => db.query('update public.perfis set trocar_senha = $1 where user_id = $2', [!p.compartilhado, p.user_id]));
      await reg('enviada', 'senha temporária enviada ao administrador', p.uep);
      return json(res, 200, PADRAO);
    }
    if (rota === '/rest/v1/perfis' && req.method === 'POST') {
      if (!servico) return json(res, 401, { code: '42501', message: 'permission denied for table perfis' });
      const b = JSON.parse((await corpo(req)).toString() || '{}');
      const cols = Object.keys(b), vals = cols.map(k => b[k]);
      await serial(() => db.query(`insert into public.perfis (${cols.join(',')}) values (${cols.map((_, i) => '$' + (i + 1)).join(',')})
        on conflict (user_id) do update set ${cols.filter(c => c !== 'user_id').map(c => `${c} = excluded.${c}`).join(', ')}`, vals));
      res.writeHead(201); return res.end();
    }
    // ---------------- Auth ----------------
    if (rota === '/auth/v1/token' && req.method === 'POST') {
      const b = JSON.parse((await corpo(req)).toString() || '{}');
      if (url.searchParams.get('grant_type') === 'password') {
        const r = await serial(() => db.query('select id, email, senha from auth.users where lower(email) = lower($1)', [b.email || '']));
        const u = r.rows[0];
        if (!u || u.senha !== b.password) return json(res, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials', error: 'invalid_grant', error_description: 'Invalid login credentials' });
        return json(res, 200, emitir(u));
      }
      if (url.searchParams.get('grant_type') === 'refresh_token') {
        const uid = refresh.get(b.refresh_token); if (!uid) return json(res, 400, { error: 'invalid_grant', error_description: 'Invalid Refresh Token' });
        const r = await serial(() => db.query('select id, email from auth.users where id = $1', [uid]));
        return json(res, 200, emitir(r.rows[0]));
      }
    }
    if (rota === '/auth/v1/user') {
      const t = quem(req); if (!t) return json(res, 401, { code: 401, msg: 'invalid JWT' });
      if (req.method === 'PUT') {
        const b = JSON.parse((await corpo(req)).toString() || '{}');
        if (b.password) {
          const atual = (await serial(() => db.query('select senha from auth.users where id = $1', [t.uid]))).rows[0].senha;
          if (atual === b.password) return json(res, 422, { code: 422, error_code: 'same_password', msg: 'New password should be different from the old password.' });
          if (b.password.length < 6) return json(res, 422, { code: 422, error_code: 'weak_password', msg: 'Password should be at least 6 characters.' });
          await serial(() => db.query('update auth.users set senha = $1 where id = $2', [b.password, t.uid]));
        }
      }
      const r = await serial(() => db.query('select id, email from auth.users where id = $1', [t.uid]));
      return json(res, 200, usuarioJson(r.rows[0]));
    }
    if (rota === '/auth/v1/logout') { const a = (req.headers.authorization || '').replace(/^Bearer\s+/i, ''); tokens.delete(a); res.writeHead(204); return res.end(); }
    // ---------------- PostgREST (só RPC redia_*) ----------------
    const mr = /^\/rest\/v1\/rpc\/(redia_[a-z_]+)$/.exec(rota);
    if (mr && req.method === 'POST') {
      const t = quem(req); if (!t) return json(res, 401, { code: 'PGRST301', message: 'JWT expired', details: null, hint: null });
      const args = JSON.parse((await corpo(req)).toString() || '{}');
      const nomes = Object.keys(args), valores = [];
      const lista = nomes.map((k, i) => {
        const tp = TIPOS_ARG[k] || 'text'; const v = args[k];
        if (tp === 'text[]') { valores.push(JSON.stringify(v || [])); return `${k} => array(select jsonb_array_elements_text($${i + 1}::jsonb))`; }
        valores.push(tp === 'jsonb' ? JSON.stringify(v) : v === null ? null : String(v)); return `${k} => $${i + 1}::${tp}`;
      }).join(', ');
      try {
        const r = await serial(() => comoUsuario(t.uid, `select public.${mr[1]}(${lista}) as r`, valores));
        const v = r.rows[0]?.r;
        if (v === undefined || v === null || v === '') { if (/senha_trocada/.test(mr[1])) { res.writeHead(204); return res.end(); } return json(res, 200, null); }
        return json(res, 200, v);
      } catch (e) {
        const negado = /permission denied/.test(e.message);
        return json(res, negado ? 403 : 400, { code: negado ? '42501' : (e.code || 'P0001'), message: e.message, details: null, hint: e.hint || null });
      }
    }
    // ---------------- Storage (bucket "redia") ----------------
    const ms = /^\/storage\/v1\/object\/(?:authenticated\/)?(redia)\/(.+)$/.exec(rota);
    if (ms) {
      const t = quem(req); if (!t) return json(res, 400, { statusCode: '403', error: 'Unauthorized', message: 'invalid JWT' });
      const caminho = decodeURIComponent(ms[2]);
      const uep = (await serial(() => comoUsuario(t.uid, 'select public.redia_uep_atual() as u', []))).rows[0].u;
      if (caminho.split('/')[0] !== uep) return json(res, 400, { statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' });
      const chave = 'redia/' + caminho;
      if (req.method === 'POST' || req.method === 'PUT') {
        if (arquivos.has(chave)) return json(res, 400, { statusCode: '409', error: 'Duplicate', message: 'The resource already exists' });
        arquivos.set(chave, { tipo: req.headers['content-type'] || 'application/octet-stream', dados: await corpo(req) });
        return json(res, 200, { Key: chave, Id: randomUUID() });
      }
      if (req.method === 'GET') {
        const a = arquivos.get(chave); if (!a) return json(res, 400, { statusCode: '404', error: 'not_found', message: 'Object not found' });
        res.writeHead(200, { 'content-type': a.tipo }); return res.end(a.dados);
      }
    }
    json(res, 404, { message: 'rota não simulada: ' + req.method + ' ' + rota });
  }

  function estaticoArq(req, res, url) {
    let f = decodeURIComponent(url.pathname); if (f.endsWith('/')) f += 'index.html';
    const arq = path.join(estatico, path.normalize(f).replace(/^(\.\.[/\\])+/, ''));
    if (!arq.startsWith(estatico) || !existsSync(arq) || statSync(arq).isDirectory()) { res.writeHead(404); return res.end('não encontrado'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(arq)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(readFileSync(arq));
  }

  const srv = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    try {
      if (supabase && /^\/(auth|rest|storage|realtime|functions)\/v1\//.test(url.pathname)) return await api(req, res, url);
      estaticoArq(req, res, url);
    } catch (e) { console.error('servidor:', e); json(res, 500, { message: e.message }); }
  });
  await new Promise(r => srv.listen(porta, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  return {
    url: base, db, arquivos, chamadas, emails,
    async criarUsuario(chave, senha, nome, posto, { uep = 'P-83', admin = false, trocarSenha = true, semPerfil = false, compartilhado = false } = {}) {
      const id = randomUUID(), email = chave.toLowerCase() + '@redia.local';
      await serial(() => db.query('insert into auth.users (id, email, senha) values ($1, $2, $3)', [id, email, senha]));
      if (!semPerfil) {
        await serial(() => db.query('select public.redia_vincular_perfil($1, $2, $3, $4, $5, $6)', [email, chave, nome, posto, uep, admin]));
        if (!trocarSenha) await serial(() => db.query('update public.perfis set trocar_senha = false where user_id = $1', [id]));
        if (compartilhado) await serial(() => db.query('update public.perfis set compartilhado = true, trocar_senha = false where user_id = $1', [id]));
      }
      return id;
    },
    sql: (q, p) => serial(() => db.query(q, p)),
    fechar: () => new Promise(r => srv.close(r)),
  };
}
