import Dashboard from './dashboard';
import {canManageTournament} from './permissions';
export const dynamic='force-dynamic';
export default async function Page(){return <Dashboard canEdit={await canManageTournament()}/>}
