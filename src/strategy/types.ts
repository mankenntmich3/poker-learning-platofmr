export type KuhnCard = 'J' | 'Q' | 'K';
export type KuhnAction = 'check' | 'bet' | 'fold' | 'call';
export type KuhnHistory = '' | 'x' | 'b' | 'xb';
export type SourceType = 'DEMO' | 'COMPUTED' | 'IMPORTED' | 'LICENSED' | 'APPROXIMATED';
export interface Provenance {
  sourceType: SourceType;
  solverVersion: string;
  solutionVersion: string;
  generatedAt: string;
  accuracy: { metric: 'exploitability'; value: number; unit: 'ante/hand'; target: number };
}
export interface ActionEV {
  action: KuhnAction;
  frequency: number;
  ev: number;
}
export type GameState = { game: 'kuhn'; history: KuhnHistory } | { game: 'nlhe'; [key: string]: unknown };
export type StrategyCombo = { game: 'kuhn'; card: KuhnCard } | { game: 'nlhe'; cards: readonly string[] };
export interface ComboStrategy { combo: KuhnCard; actions: ActionEV[]; totalEV: number }
export interface StrategyNode {
  id: string;
  state: { game: 'kuhn'; history: KuhnHistory };
  player: 0 | 1;
  board: string[];
  pot: number;
  commitments: [number, number];
  actions: KuhnAction[];
  range: ComboStrategy[];
  provenance: Provenance;
}
export interface RangeStrategy { combos: ComboStrategy[]; provenance: Provenance }
export interface StrategyProvider {
  getNode(state: GameState): Promise<StrategyNode>;
  getComboStrategy(state: GameState, combo: StrategyCombo): Promise<ComboStrategy>;
  getRangeStrategy(state: GameState): Promise<RangeStrategy>;
  getActionEVs(state: GameState, combo: StrategyCombo): Promise<ActionEV[]>;
  getNextNodes(state: GameState): Promise<StrategyNode[]>;
  hasSolution(state: GameState): Promise<boolean>;
}
