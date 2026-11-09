// Passwords live only in Cloudflare secrets. No ChatGPT headers are trusted.
export const COOKIE_NAME='__Host-daryn-admin';
export const SESSION_SECONDS=8*60*60;
const encoder=new TextEncoder();
export function authConfigured(secret:unknown):secret is string{return typeof secret==='string'&&secret.length>=16&&secret.length<=256;}
function hex(bytes:ArrayBuffer){return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');}
async function key(secret:string){return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function passwordsEqual(a:string,b:string){const digests=await Promise.all([a,b].map(v=>crypto.subtle.digest('SHA-256',encoder.encode(v))));const x=new Uint8Array(digests[0]),y=new Uint8Array(digests[1]);let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;}
export async function issueSession(secret:string,now=Date.now()){
 if(!authConfigured(secret))throw Error('Admin password not configured');
 const expiry=Math.floor(now/1000)+SESSION_SECONDS;
 const nonce=hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
 const value=`${expiry}.${nonce}`;
 return `${value}.${hex(await crypto.subtle.sign('HMAC',await key(secret),encoder.encode(value)))}`;
}
export async function validSession(cookieHeader:string|null,secret:unknown,now=Date.now()){
 if(!authConfigured(secret))return false;
 const cookies=(cookieHeader||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(COOKIE_NAME+'='));
 if(cookies.length!==1)return false;
 const value=cookies[0].slice(COOKIE_NAME.length+1);
 if(!/^\d{10}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(value))return false;
 const [expiry,nonce,sig]=value.split('.');const seconds=Math.floor(now/1000);
 if(+expiry<=seconds||+expiry>seconds+SESSION_SECONDS)return false;
 const bytes=Uint8Array.from(sig.match(/../g)!,v=>parseInt(v,16));
 return crypto.subtle.verify('HMAC',await key(secret),bytes,encoder.encode(`${expiry}.${nonce}`));
}
export function sessionCookie(value:string,maxAge=SESSION_SECONDS){return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${maxAge}; Secure; HttpOnly; SameSite=Strict`;}
export function sameOrigin(request:Request){return request.headers.get('Origin')===new URL(request.url).origin;}
