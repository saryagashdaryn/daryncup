import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {authConfigured,COOKIE_NAME,issueSession,passwordsEqual,SESSION_SECONDS,sessionCookie,validSession,sameOrigin} from '../lib/admin-auth.ts';
const load=async(file,transform=s=>s)=>import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(transform(readFileSync(new URL(file,import.meta.url),'utf8')))).toString('base64'));
const secret='test-only-organizer-password-45';const now=Date.now();
assert.equal(authConfigured(undefined),false);assert.equal(authConfigured('short'),false);
assert.equal(await passwordsEqual(secret,secret),true);assert.equal(await passwordsEqual(secret,'incorrect'),false);
const token=await issueSession(secret,now),cookie=COOKIE_NAME+'='+token;
assert.equal(await validSession(cookie,secret,now),true);
assert.equal(await validSession(cookie,secret,now+SESSION_SECONDS*1000),false);
assert.equal(await validSession(cookie,'a-different-password-12345',now),false);
assert.equal(await validSession(cookie.slice(0,-1)+(cookie.endsWith('a')?'b':'a'),secret,now),false);
assert.equal(await validSession(cookie+'; '+cookie,secret,now),false);
assert.equal(await validSession(null,secret,now),false);
assert.match(sessionCookie(token),/Secure; HttpOnly; SameSite=Strict/);
assert.match(sessionCookie('',0),/Max-Age=0/);
assert.equal(sameOrigin(new Request('https://cup.example/api/state',{headers:{Origin:'https://evil.example'}})),false);
const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../migrations/0001_tournaments.sql',import.meta.url),'utf8'));
const DB={
 prepare(query){return {
  bind(...args){const statement=sql.prepare(query);return {
   async first(){return statement.get(...args)||null},
   async run(){const result=statement.run(...args);return {meta:{changes:result.changes}}}
  }}
 }}
};
const {handleAuth}=await load('../worker/auth.ts',s=>s.replace("'../lib/admin-auth'",JSON.stringify(new URL('../lib/admin-auth.ts',import.meta.url).href)));
const request=(password='wrong',origin='https://cup.example',ip='192.0.2.1')=>new Request('https://cup.example/api/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded','CF-Connecting-IP':ip},body:new URLSearchParams({password})});
assert.equal(await handleAuth(new Request('https://cup.example/'),{}),null);
assert.equal((await handleAuth(new Request('https://cup.example/login'),{})).status,503);
assert.equal((await handleAuth(request(secret),{DB})).status,503);
assert.equal((await handleAuth(request(secret,'https://evil.example'),{ADMIN_PASSWORD:secret,DB})).status,403);
const login=await handleAuth(request(secret),{ADMIN_PASSWORD:secret,DB});assert.equal(login.status,303);assert.equal(login.headers.get('Location'),'/');assert.equal(await validSession(login.headers.get('set-cookie').split(';')[0],secret),true);
assert.equal((await handleAuth(request('incorrect'),{ADMIN_PASSWORD:secret,DB})).status,401);
for(let i=0;i<9;i++)await handleAuth(request('incorrect','https://cup.example','192.0.2.2'),{ADMIN_PASSWORD:secret,DB});
assert.equal((await handleAuth(request('incorrect','https://cup.example','192.0.2.2'),{ADMIN_PASSWORD:secret,DB})).status,401);
assert.equal((await handleAuth(request(secret,'https://cup.example','192.0.2.2'),{ADMIN_PASSWORD:secret,DB})).status,429);
assert.equal((await handleAuth(new Request('https://cup.example/api/auth/logout'),{ADMIN_PASSWORD:secret,DB})).status,405);
const logout=await handleAuth(new Request('https://cup.example/api/auth/logout',{method:'POST',headers:{Origin:'https://cup.example'}}),{ADMIN_PASSWORD:secret,DB});assert.equal(logout.status,303);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
const tournament=await load('../lib/tournament.ts');
const workbook=JSON.parse(readFileSync(new URL('../data/daryn-import-20261104.json',import.meta.url),'utf8'));
// Run the real initializer against SQLite via a D1-compatible adapter.
const initializer=readFileSync(new URL('../app/api/state/workbook-import.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
const tournamentURL='data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(readFileSync(new URL('../lib/tournament.ts',import.meta.url),'utf8'))).toString('base64');
const moduleSource='import {normalizeTournament,normalizePlayoffResults} from '+JSON.stringify(tournamentURL)+'; const workbook='+JSON.stringify(workbook)+';\n'+stripTypeScriptTypes(initializer);
const {applyWorkbookImport}=await import('data:text/javascript;base64,'+Buffer.from(moduleSource).toString('base64'));
await Promise.all([applyWorkbookImport(DB),applyWorkbookImport(DB)]);
let row=sql.prepare('SELECT * FROM tournaments WHERE id=?').get('daryn');const seeded=JSON.parse(row.data);
assert.equal(seeded.teams.length,8);assert.equal(seeded.players.length,53);assert.equal(seeded.rounds.length,7);assert.equal(seeded.archivedRounds.length,7);
sql.prepare('UPDATE tournaments SET data=?,revision=12 WHERE id=?').run(JSON.stringify({...seeded,demo:false,custom:'preserve-edits'}),'daryn');
await applyWorkbookImport(DB);row=sql.prepare('SELECT * FROM tournaments WHERE id=?').get('daryn');assert.equal(row.revision,12);assert.equal(JSON.parse(row.data).custom,'preserve-edits');
console.log('PASS: signed sessions, tamper/expiry/password rotation, no anonymous login, origin checks, login/logout, persistent rate limit, concurrent initial seed and preserved edits.');
