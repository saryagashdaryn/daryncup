import {headers} from 'next/headers';
import {env} from 'cloudflare:workers';
import {validSession} from '../lib/admin-auth';
export async function canManageTournament(){return validSession((await headers()).get('cookie'),env.ADMIN_PASSWORD);}
