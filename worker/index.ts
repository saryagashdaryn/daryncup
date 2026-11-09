import handler from 'vinext/server/fetch-handler';
import {handleAuth} from './auth';
export default {
 async fetch(request:Request,env:Cloudflare.Env,ctx:ExecutionContext){
  try{
   const auth=await handleAuth(request,env);if(auth)return auth;
   const response=await handler.fetch(request,env,ctx);
   // HTML varies with the admin cookie: never cache an authenticated dashboard.
   const headers=new Headers(response.headers);
   if(headers.get('Content-Type')?.includes('text/html')||new URL(request.url).pathname.startsWith('/api/'))headers.set('Cache-Control','private, no-store');
   headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','strict-origin-when-cross-origin');
   return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  }catch(error){console.error('Request failed',error);return new Response('Қызмет уақытша қолжетімсіз. Кейін қайталаңыз.',{status:503,headers:{'Cache-Control':'no-store'}});}
 }
};
