import { SIX_MAX_POSITIONS, type Position } from '@/domain/chips';
import type { Card, Combo } from '@/domain/cards';
import type { SourceType } from '@/strategy/types';

export const STACK_DEPTHS = [10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200] as const;
export const SCENARIOS = ['rfi', 'vs-open', 'vs-3bet', 'flop-srp'] as const;
export type NlheScenario = typeof SCENARIOS[number];
export type NlheAction = 'fold' | 'call' | 'raise' | 'check' | 'bet';
export interface NlheConfig { game: 'nlhe'; format: '6max-cash'; stackBb: number; hero: Position; villain: Position | null; scenario: NlheScenario }
export const DEFAULT_NLHE: NlheConfig = { game: 'nlhe', format: '6max-cash', stackBb: 100, hero: 'BTN', villain: null, scenario: 'rfi' };
export const POSTFLOP_CONFIG: NlheConfig = { game: 'nlhe', format: '6max-cash', stackBb: 100, hero: 'BTN', villain: 'BB', scenario: 'flop-srp' };
export const SCENARIO_LABELS: Record<NlheScenario, string> = { rfi: 'RFI · Alle folden zu dir', 'vs-open': 'Gegen ein Open-Raise', 'vs-3bet': 'Nach deinem Open gegen eine 3-Bet', 'flop-srp': 'Flop · BTN gegen BB' };
export interface NlheProvenance {
  sourceType: SourceType; solutionVersion: string; solverVersion: string | null; generatedAt: string;
  method: string; accuracy: { status: 'unmeasured'; metric: null; value: null }; license: string;
  assumptions: string[]; limitations: string[];
}
export interface NlheActionInfo { id: NlheAction; label: string; toBb: number | null; allIn: boolean }
export interface NlheFrequency { action: NlheAction; frequency: number; ev: number | null }
export interface NlheClassStrategy { handClass: string; combos: number; reach: number; actions: NlheFrequency[] }
export interface NlheComboStrategy { cards: Combo; handClass: string; reach: number; actions: NlheFrequency[] }
export interface NlheNode {
  id: string; config: NlheConfig; potBb: number; toCallBb: number; investedBb: number;
  board: Card[]; context: string; actions: NlheActionInfo[]; classes: NlheClassStrategy[];
  provenance: NlheProvenance; related: NlheConfig[];
}
export interface NlheRange extends NlheNode { combos: NlheComboStrategy[] }
export interface NlheQuestion { id: string; ordinal: number; cards: Combo; handClass: string; villainRange?: { handClass: string; combos: number; weight: number }[] }
export interface NlheFeedback {
  questionId: string; chosenAction: NlheAction; chosenFrequency: number; inPolicy: boolean;
  actions: NlheFrequency[]; regret: number | null; explanation: string; provenance: NlheProvenance;
}
export interface NlheSession {
  id: string; spot: Omit<NlheNode, 'classes' | 'related'>; question: NlheQuestion;
  feedback: NlheFeedback | null; answered: number; limit: number; complete: boolean;
}
export interface NlheProgress {
  decisions: number; preflop: number; postflop: number; completedSessions: number;
  daily: { date: string; decisions: number }[];
  recent: { id: string; label: string; detail: string; createdAt: string }[];
  sessions: { id: string; label: string; answered: number; complete: boolean }[];
}

export function possibleVillains(config: Pick<NlheConfig, 'hero' | 'scenario'>): Position[] {
  const index = SIX_MAX_POSITIONS.indexOf(config.hero);
  if (config.scenario === 'vs-open') return SIX_MAX_POSITIONS.slice(0, index);
  if (config.scenario === 'vs-3bet') return SIX_MAX_POSITIONS.slice(index + 1);
  return config.scenario === 'flop-srp' ? ['BB'] : [];
}
export function validNlheConfig(config: NlheConfig): boolean {
  if (config.game !== 'nlhe' || config.format !== '6max-cash' || !Number.isFinite(config.stackBb)
    || config.stackBb < 10 || config.stackBb > 500 || Math.abs(Math.round(config.stackBb * 100) - config.stackBb * 100) > 1e-8
    || !SIX_MAX_POSITIONS.includes(config.hero) || !SCENARIOS.includes(config.scenario)) return false;
  if (config.scenario === 'flop-srp') return config.stackBb === 100 && config.hero === 'BTN' && config.villain === 'BB';
  if (config.scenario === 'rfi') return config.hero !== 'BB' && config.villain === null;
  return config.villain !== null && possibleVillains(config).includes(config.villain);
}
export function configSearch(config: NlheConfig): string {
  return new URLSearchParams({ stack: String(config.stackBb), hero: config.hero, scenario: config.scenario, ...(config.villain ? { villain: config.villain } : {}) }).toString();
}
export function configFromSearch(search: URLSearchParams): NlheConfig {
  const scenario = (search.get('scenario') || 'rfi') as NlheScenario;
  const config: NlheConfig = { ...DEFAULT_NLHE, stackBb: Number(search.get('stack') || 100), hero: (search.get('hero') || 'BTN') as Position,
    scenario, villain: (search.get('villain') || (scenario === 'flop-srp' ? 'BB' : null)) as Position | null };
  if (!validNlheConfig(config)) throw new Error('Diese Position und Vorgeschichte passen nicht zusammen.');
  return config;
}
export function spotLabel(config: NlheConfig): string {
  return `${config.stackBb} BB · ${config.hero}${config.villain ? ` vs ${config.villain}` : ''} · ${config.scenario === 'rfi' ? 'RFI' : config.scenario === 'vs-open' ? 'vs Open' : config.scenario === 'vs-3bet' ? 'vs 3-Bet' : 'Flop SRP'}`;
}
