export type Team={id:string,name:string,color:string,logo?:string};
export type Player={id:string,name:string,team:string,base:number};
export type Match={id:string,a:string,b:string,sa:string,sb:string,goals:Record<string,number>,cards?:Record<string,{yellow:number,red:number}>,notes?:Record<string,string>,number?:number,cycle?:number};
export type Round={id:string,name:string,date:string,start:string,matches:Match[]};
export type Knockout=Match&{pa:string,pb:string};
export type Bid={team:string,price:number};
export type Transfer={player:string,from:string,to:string,price:number,consent:boolean};
export type Auction={basePrices:Record<string,number>,bids:Record<string,Bid>,transfers:Transfer[]};
export type Data={teams:Team[],players:Player[],rounds:Round[],demo:boolean,format?:string,archivedRounds?:Round[],playoffs?:Record<string,Knockout>,auction?:Auction};
export const done=(m:Match)=>m.sa!==''&&m.sb!=='';
export function normalizeTournament(input:Data):Data{const d=structuredClone(input);if(d.rounds.length>7){d.archivedRounds=[...(d.archivedRounds||[]),...d.rounds.slice(7)];d.rounds=d.rounds.slice(0,7)}if(d.format!=='seven-round-playoffs-v1'){if(d.rounds[6])d.rounds[6].date='2026-11-05';d.format='seven-round-playoffs-v1'}return d;}
export function leagueTable(d:Data){const rows=d.teams.map(t=>({...t,p:0,w:0,draw:0,l:0,gf:0,ga:0,pts:0}));d.rounds.slice(0,7).forEach(r=>r.matches.forEach(m=>{if(!done(m))return;const a=rows.find(t=>t.id===m.a),b=rows.find(t=>t.id===m.b);if(!a||!b)return;const x=+m.sa,y=+m.sb;a.p++;b.p++;a.gf+=x;a.ga+=y;b.gf+=y;b.ga+=x;if(x>y){a.w++;b.l++;a.pts+=3}else if(x<y){b.w++;a.l++;b.pts+=3}else{a.draw++;b.draw++;a.pts++;b.pts++}}));return rows.sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.name.localeCompare(b.name));}
export function leagueComplete(d:Data){return d.teams.length===8&&d.rounds.length===7&&d.rounds.every(r=>r.matches.length===4&&r.matches.every(done)&&new Set(r.matches.flatMap(m=>[m.a,m.b])).size===8);}
export function winner(m:Knockout|undefined){if(!m||!done(m))return null;if(+m.sa!==+m.sb)return +m.sa>+m.sb?m.a:m.b;if(m.pa===''||m.pb===''||+m.pa===+m.pb)return null;return +m.pa>+m.pb?m.a:m.b;}
export function bracket(d:Data){const ready=leagueComplete(d),table=leagueTable(d);const result:(key:string,a:string|undefined,b:string|undefined)=>Knockout|undefined=(key,a,b)=>{if(!a||!b)return;const old=d.playoffs?.[key];return old?.a===a&&old?.b===b?old:{id:key,a,b,sa:'',sb:'',pa:'',pb:'',goals:{}}};const sf1=result('sf1',ready?table[0]?.id:undefined,ready?table[3]?.id:undefined),sf2=result('sf2',ready?table[1]?.id:undefined,ready?table[2]?.id:undefined);const w1=winner(sf1),w2=winner(sf2);const final=result('final',w1||undefined,w2||undefined),third=result('third',w1&&sf1?(w1===sf1.a?sf1.b:sf1.a):undefined,w2&&sf2?(w2===sf2.a?sf2.b:sf2.a):undefined);return {ready,table,sf1,sf2,third,final};}
export function activePlayoffMatches(d:Data){const b=bracket(d);return [b.sf1,b.sf2,b.third,b.final].filter((m):m is Knockout=>!!m);}
export function normalizePlayoffResults(d:Data){const b=bracket(d);const next:Record<string,Knockout>={};for(const key of ['sf1','sf2','third','final'] as const){const m=b[key],old=d.playoffs?.[key];if(m&&old?.a===m.a&&old?.b===m.b){next[key]=m;if(m.sa!==m.sb){next[key]={...m,pa:'',pb:''}}}}return {...d,playoffs:next};}

export const AUCTION_BUDGET=20000,AUCTION_LIMIT=3,AUCTION_STEP=500;
export function leagueGoals(d:Data,pid:string){return (d.players.find(p=>p.id===pid)?.base||0)+d.rounds.slice(0,7).flatMap(r=>r.matches).filter(done).reduce((sum,m)=>sum+(m.goals[pid]||0),0)}
export function startingPrice(goals:number){return goals===0?1000:goals<=2?2000:goals<=4?3000:goals<=6?4000:5000;}
export function auctionState(d:Data):Auction{return d.auction||{basePrices:{},bids:{},transfers:[]};}
export function playoffStarted(d:Data){return Object.values(d.playoffs||{}).some(m=>m.sa!==''||m.sb!=='');}
export function auctionPlayers(d:Data){const ids=new Set(leagueTable(d).slice(4,8).map(t=>t.id));return d.players.filter(p=>ids.has(p.team)).map(p=>({...p,goals:leagueGoals(d,p.id),price:auctionState(d).basePrices[p.id]??startingPrice(leagueGoals(d,p.id))})).sort((a,b)=>b.goals-a.goals||a.name.localeCompare(b.name));}
export function teamBudget(d:Data,team:string){const a=auctionState(d),bought=a.transfers.filter(t=>t.to===team),sold=new Set(a.transfers.map(t=>t.player)),pending=Object.entries(a.bids).filter(([pid,b])=>b.team===team&&!sold.has(pid));const spent=bought.reduce((s,t)=>s+t.price,0),reserved=pending.reduce((s,[,b])=>s+b.price,0);return {spent,reserved,remaining:AUCTION_BUDGET-spent-reserved,count:bought.length,pending:pending.length};}
export function effectiveTeam(d:Data,pid:string){return auctionState(d).transfers.find(t=>t.player===pid)?.to||d.players.find(p=>p.id===pid)?.team||'';}
export function guaranteedEliminated(d:Data,tid:string){if(leagueComplete(d))return leagueTable(d).slice(4).some(t=>t.id===tid);const table=leagueTable(d),pending=d.rounds.slice(0,7).flatMap(r=>r.matches).filter(m=>!done(m));if(d.rounds.length!==7||pending.length>8)return table.filter(t=>t.pts>(table.find(t=>t.id===tid)?.pts||0)+3*pending.filter(m=>m.a===tid||m.b===tid).length).length>=4;const points=new Map(table.map(t=>[t.id,t.pts]));function possible(i:number):boolean{if(i===pending.length){const score=points.get(tid)||0;return [...points.values()].filter(n=>n>score).length<4}const m=pending[i],a=points.get(m.a)||0,b=points.get(m.b)||0;for(const [x,y] of [[3,0],[1,1],[0,3]]){points.set(m.a,a+x);points.set(m.b,b+y);if(possible(i+1)){points.set(m.a,a);points.set(m.b,b);return true}}points.set(m.a,a);points.set(m.b,b);return false}return !possible(0);}
export function validateAuction(d:Data,previous?:Data):string|null{
 const a=auctionState(d),ready=leagueComplete(d),table=leagueTable(d),buyers=new Set(table.slice(0,4).map(t=>t.id)),eligible=new Map(auctionPlayers(d).map(p=>[p.id,p]));
 if((Object.keys(a.bids).length||a.transfers.length)&&!ready)return '7 турдың барлық нәтижесі сақталғанша ұсыныс пен трансферді бекіту жабық.';
 if(previous&&playoffStarted(previous)&&JSON.stringify(auctionState(previous))!==JSON.stringify(a))return 'Плей-офф басталды. Трансфер аукционы жабық.';
 const validPrice=(n:number)=>Number.isInteger(n)&&n>=500&&n<=AUCTION_BUDGET&&n%AUCTION_STEP===0;
 for(const [pid,n] of Object.entries(a.basePrices))if(!d.players.some(p=>p.id===pid)||!validPrice(n))return 'Бастапқы баға 500 ₸ қадамымен 500–20 000 ₸ аралығында болуы керек.';
 const sold=new Set<string>();for(const t of a.transfers){const p=eligible.get(t.player);if(!p||p.team!==t.from||!buyers.has(t.to)||sold.has(t.player)||!t.consent||!validPrice(t.price)||t.price<p.price)return 'Трансфер деректері жарамсыз: ойыншы, команда, баға немесе келісімді тексеріңіз.';sold.add(t.player);}
 for(const [pid,b] of Object.entries(a.bids)){const p=eligible.get(pid);if(!p||sold.has(pid)||!buyers.has(b.team)||!validPrice(b.price)||b.price<p.price)return 'Ұсынылған бағаны және сатып алушы команданы тексеріңіз.';const old=previous?.auction?.bids[pid];if(old&&(old.team!==b.team||old.price!==b.price)&&b.price<old.price+AUCTION_STEP)return 'Келесі ұсыныс кемінде 500 ₸ жоғары болуы керек.';}
 for(const t of a.transfers){const old=previous?.auction?.bids[t.player];if(old&&!previous?.auction?.transfers.some(v=>v.player===t.player)&&(old.team!==t.to||old.price!==t.price))return 'Трансфер соңғы ұсынысқа сәйкес болуы керек.';}
 for(const tid of buyers){const b=teamBudget(d,tid);if(b.remaining<0)return 'Команданың 20 000 виртуалды ₸ бюджеті жеткіліксіз.';if(b.count+b.pending>AUCTION_LIMIT)return 'Әр командаға ең көбі 3 жаңа ойыншы, соның ішінде белсенді ұсыныстар.';}
 return null;
}
