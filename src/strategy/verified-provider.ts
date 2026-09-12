import type { StrategyProvider } from './types';
import type { StrategyContext } from '@/domain/strategy-context';
import type { VerifiedSolutionArtifact,ComboSolution,ComboAction } from '@/solver/verified-solution';
import type { Database } from '@/server/db';
import { findExactVerifiedSolution } from '@/server/solution-registry';
import { createCombo } from '@/domain/cards';

export interface VerifiedSpot {context:StrategyContext;treeSha256:string}
/** Same StrategyProvider contract as other games, with exact NLHE domain types. */
export class VerifiedStrategyProvider implements StrategyProvider<VerifiedSpot,readonly [string,string],VerifiedSolutionArtifact,ComboSolution[],ComboSolution,ComboAction> {
  constructor(private readonly db:Database){}
  async getNode(spot:VerifiedSpot){const a=await findExactVerifiedSolution(this.db,spot.context,spot.treeSha256);if(!a)throw new Error('Verified solution unavailable for this exact context.');return a;}
  async hasSolution(spot:VerifiedSpot){return (await findExactVerifiedSolution(this.db,spot.context,spot.treeSha256))!==null;}
  async getComboStrategy(spot:VerifiedSpot,cards:readonly [string,string]){const key=createCombo(...cards).join(''),row=(await this.getNode(spot)).strategies.find(r=>createCombo(...r.combo).join('')===key && r.reach>0);if(!row)throw new Error('Combo outside solved support.');return row;}
  async getRangeStrategy(spot:VerifiedSpot){return (await this.getNode(spot)).strategies;}
  async getActionEVs(spot:VerifiedSpot,cards:readonly [string,string]){return (await this.getComboStrategy(spot,cards)).actions;}
  async getNextNodes():Promise<VerifiedSolutionArtifact[]>{return []; /* No child artifact published. */}
}
