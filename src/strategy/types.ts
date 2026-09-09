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
export interface StrategyProvider<State = GameState, Combo = StrategyCombo, Node = StrategyNode, Range = RangeStrategy, ComboResult = ComboStrategy, Action = ActionEV> {
  getNode(state: State): Promise<Node>;
  getComboStrategy(state: State, combo: Combo): Promise<ComboResult>;
  getRangeStrategy(state: State): Promise<Range>;
  getActionEVs(state: State, combo: Combo): Promise<Action[]>;
  getNextNodes(state: State): Promise<Node[]>;
  hasSolution(state: State): Promise<boolean>;
}
