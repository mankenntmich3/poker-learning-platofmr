import { DEFAULT_STUDY,studyUrl,type StudySpot } from '@/domain/study';
import type { Combo } from '@/domain/cards';
import type { NlheConfig } from './nlhe';

/** Explicit call continuation; RFI assumes BB calls and all other players fold. */
export function preflopStudyUrl(config:NlheConfig,heroHand:Combo):string {
  const villain=config.villain??'BB',opener=config.scenario==='vs-open'?villain:config.hero;
  const openBb=config.openBb??(opener==='SB'?3:2.5);
  const threeBetBb=config.threeBetBb??Math.min(config.stackBb,openBb*(['SB','BB'].includes(config.scenario==='vs-open'?config.hero:villain)?4:3));
  const fourBetBb=config.fourBetBb??Math.min(config.stackBb,Math.max(threeBetBb*2.2,2*threeBetBb-openBb));
  const spot:StudySpot={schema:2,config:{...DEFAULT_STUDY,stackBb:config.stackBb,hero:config.hero,villain,opener,openBb,threeBetBb,fourBetBb,line:config.scenario==='vs-3bet'?'3bet':'srp'},heroHand,events:[]};
  return studyUrl(spot);
}
