import 'dotenv/config';
import cron from 'node-cron';
import {runDailyCampaign} from './campaign.js';
const expression=process.env.DAILY_CRON||'0 7 * * *';
if(!cron.validate(expression))throw new Error('DAILY_CRON inválido');
cron.schedule(expression,async()=>{try{console.log(await runDailyCampaign())}catch(e){console.error('Execução diária falhou:',e)}},{timezone:process.env.TZ||'America/Sao_Paulo'});
console.log('Worker ativo:',expression,process.env.TZ||'America/Sao_Paulo');
