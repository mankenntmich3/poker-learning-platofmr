import type { Card } from '@/domain/cards';
import type { ComboAction } from '@/solver/verified-solution';
export type VerifiedMode='action'|'recall';
export type VerifiedSelection='range'|'smart'|'due'|'weaknesses'|'mixed';
export interface VerifiedFeedback {
  category:'Dominant Action'|'Valid Mixed Action'|'Low-Frequency Action'|'Zero-Frequency Error'|'Frequency Recall';
  score:number;evLossBb:number|null;chosenFrequency:number|null;actions:ComboAction[];
}
export interface VerifiedQuestion {id:string;combo:[Card,Card];mode:VerifiedMode;feedback:VerifiedFeedback|null;action?:string}
export interface VerifiedMastery {combo:string;mode:VerifiedMode;attempts:number;mastery:number;dueAt:string;lastScore:number}
export interface VerifiedProgress {decisions:number;mastery:number|null;due:number;items:VerifiedMastery[];recent:{id:string;combo:string;mode:VerifiedMode;feedback:VerifiedFeedback;answeredAt:string}[]}
