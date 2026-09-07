import { commitments, HISTORIES, isDecisionHistory, legalActions, nextHistory, playerToAct } from '../solver/kuhn';
import { validateArtifact, type SolutionArtifact } from '../solver/artifact';
import type { ComboStrategy, GameState, Provenance, StrategyCombo, StrategyNode, StrategyProvider } from './types';

export class SolutionUnavailableError extends Error {
  constructor() { super('No validated solution exists for this exact game state'); this.name = 'SolutionUnavailableError'; }
}

export class StaticDatasetProvider implements StrategyProvider {
  private readonly artifact: SolutionArtifact;
  constructor(artifact: SolutionArtifact) {
    validateArtifact(artifact);
    this.artifact = structuredClone(artifact);
  }

  get provenance(): Provenance {
    const { sourceType, solverVersion, version, generatedAt, accuracy } = this.artifact;
    return { sourceType, solverVersion, solutionVersion: version, generatedAt, accuracy: { ...accuracy } };
  }

  async hasSolution(state: GameState): Promise<boolean> {
    return state.game === 'kuhn' && HISTORIES.includes(state.history);
  }

  async getNode(state: GameState): Promise<StrategyNode> {
    if (state.game !== 'kuhn' || !await this.hasSolution(state)) throw new SolutionUnavailableError();
    const amounts = commitments(state.history);
    return { id: `kuhn:${state.history || 'root'}`, state: { ...state }, player: playerToAct(state.history),
      board: [], pot: amounts[0] + amounts[1], commitments: amounts,
      actions: legalActions(state.history), provenance: this.provenance,
      range: this.artifact.nodes.filter(node => node.history === state.history).map(node => ({
        combo: node.card, actions: node.actions.map(action => ({ ...action })), totalEV: node.totalEV,
      })),
    };
  }

  async getComboStrategy(state: GameState, combo: StrategyCombo): Promise<ComboStrategy> {
    if (combo.game !== 'kuhn') throw new SolutionUnavailableError();
    const result = (await this.getNode(state)).range.find(item => item.combo === combo.card);
    if (!result) throw new SolutionUnavailableError();
    return result;
  }

  async getRangeStrategy(state: GameState) {
    const node = await this.getNode(state);
    return { combos: node.range, provenance: node.provenance };
  }

  async getActionEVs(state: GameState, combo: StrategyCombo) {
    return (await this.getComboStrategy(state, combo)).actions;
  }

  async getNextNodes(state: GameState): Promise<StrategyNode[]> {
    const node = await this.getNode(state);
    const histories = node.actions.map(action => nextHistory(node.state.history, action)).filter(isDecisionHistory);
    return Promise.all(histories.map(history => this.getNode({ game: 'kuhn', history })));
  }
}
