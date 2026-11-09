import {authConfigured,COOKIE_NAME,issueSession,passwordsEqual,sameOrigin,sessionCookie,validSession} from '../lib/admin-auth';
type AuthEnv={ADMIN_PASSWORD?:string,DB?:D1Database};
const htmlHeaders={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Frame-Options':'DENY','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"};
function page(message='',status=200){return new Response(`<!doctype html><html lang="kk"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Daryn Cup — ұйымдастырушы</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#101814;color:#f5f7f2;font:16px system-ui}main{width:min(420px,92vw);padding:32px;background:#18251d;border:1px solid #344739;border-radius:24px}h1{color:#c8f36a}p{line-height:1.6;color:#c4cec5}label,input,button{display:block;width:100%}input{margin:12px 0 20px;padding:14px;border:1px solid #52634f;border-radius:10px;background:#101814;color:white;font:inherit}button{padding:14px;background:#c8f36a;color:#101814;border:0;border-radius:10px;font:700 16px system-ui;cursor:pointer}a{color:#c8f36a}.error{color:#ffb7a8}</style><main><h1>DARYN CUP</h1><h2>Ұйымдастырушының кіруі</h2><p>Турнирді басқару үшін құпиясөзді енгізіңіз.</p>${message?`<p class="error" role="alert">${message}</p>`:''}<form method="post" action="/api/auth/login"><label for="password">Құпиясөз</label><input id="password" name="password" type="password" autocomplete="current-password" required minlength="16" maxlength="256"><button>Кіру</button></form><p><a href="/">← Турнирді көру</a></p></main></html>`,{status,headers:htmlHeaders});}
export async function handleAuth(request:Request,env:AuthEnv):Promise<Response|null>{
 const path=new URL(request.url).pathname;
 if(!['/login','/api/auth/login','/api/auth/logout'].includes(path))return null;
 if(path==='/login'){
  if(request.method!=='GET')return new Response('Method not allowed',{status:405});
  if(await validSession(request.headers.get('cookie'),env.ADMIN_PASSWORD))return Response.redirect(new URL('/',request.url),303);
  return page(authConfigured(env.ADMIN_PASSWORD)?'':'Кіру әлі бапталмаған. Cloudflare ішінде ADMIN_PASSWORD құпиясын орнатыңыз.',authConfigured(env.ADMIN_PASSWORD)?200:503);
 }
 if(request.method!=='POST')return new Response('Method not allowed',{status:405,headers:{Allow:'POST'}});
 if(!sameOrigin(request))return new Response('Forbidden',{status:403});
 if(path==='/api/auth/logout')return new Response(null,{status:303,headers:{Location:'/', 'Set-Cookie':sessionCookie('',0),'Cache-Control':'no-store'}});
 if(!authConfigured(env.ADMIN_PASSWORD)||!env.DB)return page('Кіру әлі бапталмаған.',503);
 if(!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded'))return new Response('Unsupported content type',{status:415});
 if(Number(request.headers.get('Content-Length')||0)>2048)return page('Сұрау тым үлкен.',413);
 // Count login attempts atomically in D1, shared across Worker isolates.
 const now=Math.floor(Date.now()/1000);const ip=request.headers.get('CF-Connecting-IP')||'unknown';
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip));
 const bucket=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('')+':'+Math.floor(now/900);
 const row=await env.DB.prepare('INSERT INTO auth_attempts (bucket,attempts,expires) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1 RETURNING attempts').bind(bucket,now+1800).first<{attempts:number}>();
 await env.DB.prepare('DELETE FROM auth_attempts WHERE expires < ?').bind(now).run();
 if(!row||row.attempts>10)return page('Тым көп әрекет. 15 минуттан кейін қайталаңыз.',429);
 const text=await request.text();if(text.length>2048)return page('Сұрау тым үлкен.',413);
 const password=new URLSearchParams(text).get('password')||'';
 if(password.length>256||!await passwordsEqual(password,env.ADMIN_PASSWORD))return page('Құпиясөз қате.',401);
 return new Response(null,{status:303,headers:{Location:'/', 'Set-Cookie':sessionCookie(await issueSession(env.ADMIN_PASSWORD)),'Cache-Control':'no-store'}});
}
