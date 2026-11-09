import workbook from '../../../data/daryn-import-20261104.json';
import {normalizeTournament,normalizePlayoffResults,type Data} from '../../../lib/tournament';
// Seed only an empty database. Existing results and admin edits are never replaced.
export async function applyWorkbookImport(db:D1Database){
 const current=await db.prepare('SELECT id FROM tournaments WHERE id=?').bind('daryn').first();
 if(current)return;
 const data=normalizePlayoffResults(normalizeTournament(structuredClone(workbook) as Data));
 await db.prepare('INSERT OR IGNORE INTO tournaments (id,data,revision) VALUES (?,?,0)').bind('daryn',JSON.stringify(data)).run();
}
