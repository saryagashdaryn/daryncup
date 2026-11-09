import emblems from '../../../data/team-emblems.json';
export function withTeamEmblems<T extends {teams:{name:string,logo?:string}[]}>(data:T):T{
 const logos:Record<string,string>=emblems;
 for(const team of data.teams){const name=team.name.replace('🌀','').replace(/\s+/g,' ').trim();if(!team.logo&&logos[name])team.logo=logos[name];}
 return data;
}
