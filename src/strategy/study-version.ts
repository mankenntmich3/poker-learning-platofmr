import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
let pending:Promise<string>|undefined;
/** Content identity covers every rule which affects reach, cards, sizes and actions. */
export function studyVersion():Promise<string>{
  if(!pending)pending=Promise.all(['src/domain/study.ts','src/domain/analysis.ts','src/strategy/sizing-approximation.ts','src/strategy/study-provider.ts'].map(file=>readFile(path.join(process.cwd(),file),'utf8')))
    .then(files=>`study-v2-${createHash('sha256').update(files.map(text=>text.replace(/\r\n/g,'\n')).join('\n')).digest('hex').slice(0,16)}`).catch(error=>{pending=undefined;throw error;});
  return pending;
}
