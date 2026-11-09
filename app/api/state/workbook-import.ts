import workbook from '../../../data/daryn-import-20261104.json';
const marker='import:DAryn-CUP-20261104';
const norm=(s:string)=>s.replace('🌀','').replace(/\s+/g,' ').trim();
// One authorized workbook import, guarded against later user edits. The previous
// row is retained in the same table for recovery; no schema changes at runtime.
export async function applyWorkbookImport(db:D1Database){
 const done=await db.prepare('SELECT id FROM tournaments WHERE id=?').bind(marker).first();if(done)return;
 const current=await db.prepare('SELECT data,revision FROM tournaments WHERE id=?').bind('daryn').first<{data:string,revision:number}>();
 if(!current||current.revision!==3)throw Error('Excel импортын орындау мүмкін болмады: сайттағы деректер өзгерген.');
 const old=JSON.parse(current.data);const data=structuredClone(workbook);
 for(const t of data.teams){const existing=old.teams?.find((v:{name:string})=>norm(v.name)===norm(t.name));if(existing?.logo)(t as any).logo=existing.logo;if(existing?.color)t.color=existing.color;}
 const payload=JSON.stringify(data);
 await db.batch([
 db.prepare('INSERT OR IGNORE INTO tournaments (id,data,revision) SELECT ?,data,revision FROM tournaments WHERE id=? AND revision=3').bind(marker+':backup','daryn'),
 db.prepare('UPDATE tournaments SET data=?,revision=revision+1 WHERE id=? AND revision=3 AND NOT EXISTS (SELECT 1 FROM tournaments WHERE id=?)').bind(payload,'daryn',marker),
 db.prepare('INSERT OR IGNORE INTO tournaments (id,data,revision) SELECT ?,?,0 FROM tournaments WHERE id=? AND revision=4 AND data=?').bind(marker,JSON.stringify({source:'DAryn CUP.xlsx',teams:8,players:53,rounds:14,matches:56}),'daryn',payload)
 ]);
 const result=await db.prepare('SELECT id FROM tournaments WHERE id=?').bind(marker).first();if(!result)throw Error('Импорт кезінде деректер өзгерген.');
}
