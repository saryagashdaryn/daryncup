'use client';
import {Shield,ChevronDown,Users} from 'lucide-react';
import {type Data,effectiveTeam,activePlayoffMatches,done} from '../lib/tournament';
export default function TeamRosters({data}:{data:Data}){
 const matches=[...data.rounds.flatMap(r=>r.matches),...activePlayoffMatches(data)].filter(done);
 return <section id="teams" className="panel team-rosters"><div className="panel-head"><h2>Командалар мен ойыншылар</h2><span className="pill">{data.teams.length} команда</span></div><p className="hint">Команданы басып, ойыншылар құрамын көріңіз.</p><div className="roster-grid">{data.teams.map(t=>{
 const players=data.players.filter(p=>effectiveTeam(data,p.id)===t.id).map(p=>({...p,total:p.base+matches.reduce((sum,m)=>sum+(m.goals[p.id]||0),0)})).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'kk'));
 return <details className="roster-card" key={t.id}><summary><span className="badge big" style={{color:t.color,background:t.color+'18'}}>{t.logo?<img src={t.logo} alt=""/>:<Shield size={30}/>}</span><span className="roster-title"><strong>{t.name}</strong><small><Users size={13}/>{players.length} ойыншы</small></span><ChevronDown className="roster-chevron" size={20}/><span className="roster-open">Құрамды көру</span></summary><div className="roster-content"><div className="roster-label"><span>Ойыншы</span><span>Гол</span></div>{players.map((p,i)=><div className="roster-player" key={p.id}><span className="roster-number">{i+1}</span><div><b>{p.name}</b>{p.team!==t.id&&<small>Трансфер · {data.teams.find(team=>team.id===p.team)?.name}</small>}</div><strong>{p.total}</strong></div>)}{!players.length&&<p className="empty">Ойыншылар құрамы әлі қосылмаған.</p>}</div></details>
 })}</div></section>
}
