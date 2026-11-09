import {getChatGPTUser} from './chatgpt-auth';
export async function canManageTournament(){const user=await getChatGPTUser();return !!user&&user.email.toLowerCase()==='amanzhol_dastan_9@bilimclass.kz';}
