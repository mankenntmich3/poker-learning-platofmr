import type { KuhnAction, KuhnCard, KuhnHistory } from '../strategy/types';

export const KUHN_CARDS: KuhnCard[] = ['J', 'Q', 'K'];
export const HISTORIES: KuhnHistory[] = ['', 'x', 'b', 'xb'];
export const DEALS: [KuhnCard, KuhnCard][] = KUHN_CARDS.flatMap(first =>
  KUHN_CARDS.filter(second => second !== first).map(second => [first, second] as [KuhnCard, KuhnCard]));
export const KUHN_CONFIG = {
  game: 'kuhn', players: 2, cards: ['J', 'Q', 'K'], ante: 1, bet: 1,
  maxBets: 1, rake: 0, chance: 'uniform ordered deals without replacement',
} as const;
export type Probabilities = [number, number];
export type StrategyProfile = Record<string, Probabilities>;
export const SOLVER_VERSION = 'kuhn-full-tree-cfr/1.0.0';

export function playerToAct(history: KuhnHistory): 0 | 1 {
  return history === '' || history === 'xb' ? 0 : 1;
}

export function legalActions(history: KuhnHistory): [KuhnAction, KuhnAction] {
  return history === 'b' || history === 'xb' ? ['fold', 'call'] : ['check', 'bet'];
}

export function nextHistory(history: KuhnHistory, action: KuhnAction): string {
  if (!legalActions(history).includes(action)) throw new Error('Illegal action');
  return history + ({ check: 'x', bet: 'b', fold: 'f', call: 'c' } as const)[action];
}

export function isDecisionHistory(history: string): history is KuhnHistory {
  return (HISTORIES as string[]).includes(history);
}

export function infoKey(card: KuhnCard, history: KuhnHistory): string {
  return `${card}:${history || 'root'}`;
}

/** Net terminal payoff for player 0, including ante and every contribution. */
export function terminalUtility(deal: readonly [KuhnCard, KuhnCard], history: string): number | null {
  if (deal[0] === deal[1] || !KUHN_CARDS.includes(deal[0]) || !KUHN_CARDS.includes(deal[1])) throw new Error('Invalid Kuhn deal');
  if (history === 'bf') return 1;
  if (history === 'xbf') return -1;
  if (history === 'xx' || history === 'bc' || history === 'xbc') {
    return (KUHN_CARDS.indexOf(deal[0]) > KUHN_CARDS.indexOf(deal[1]) ? 1 : -1)
      * (history === 'xx' ? 1 : 2);
  }
  if (!isDecisionHistory(history)) throw new Error(`Invalid history: ${history}`);
  return null;
}

export function commitments(history: KuhnHistory): [number, number] {
  if (history === 'b') return [2, 1];
  if (history === 'xb') return [1, 2];
  return [1, 1];
}

export function profileValue(profile: StrategyProfile, deal: [KuhnCard, KuhnCard], history = ''): number {
  const terminal = terminalUtility(deal, history);
  if (terminal !== null) return terminal;
  if (!isDecisionHistory(history)) throw new Error('Invalid history');
  const player = playerToAct(history);
  const probabilities = profile[infoKey(deal[player], history)]!;
  return legalActions(history).reduce((total, action, i) => total + probabilities[i]!
    * profileValue(profile, deal, nextHistory(history, action)), 0);
}

export function expectedValue(profile: StrategyProfile): number {
  return DEALS.reduce((total, deal) => total + profileValue(profile, deal) / DEALS.length, 0);
}

/** Deterministic simultaneous-update CFR: all six deals are enumerated each iteration.
 * Regrets use opponent/chance reach; the average strategy uses own-player reach.
 * Freezing the profile per iteration avoids traversal-order update bias.
 */
export function solveKuhn(iterations: number): StrategyProfile {
  if (!Number.isSafeInteger(iterations) || iterations < 1 || iterations > 10_000_000) {
    throw new Error('Iterations must be an integer between 1 and 10,000,000');
  }
  const keys = HISTORIES.flatMap(history => KUHN_CARDS.map(card => infoKey(card, history)));
  const zeros = () => Object.fromEntries(keys.map(key => [key, [0, 0]])) as StrategyProfile;
  const regrets = zeros();
  const strategySum = zeros();
  for (let iteration = 0; iteration < iterations; iteration++) {
    const profile: StrategyProfile = {};
    for (const key of keys) {
      const positive = regrets[key]!.map(value => Math.max(0, value));
      const sum = positive[0]! + positive[1]!;
      profile[key] = sum > 0 ? [positive[0]! / sum, positive[1]! / sum] : [0.5, 0.5];
    }
    const delta = zeros();
    const traverse = (deal: [KuhnCard, KuhnCard], history: string, reach: [number, number]): number => {
      const terminal = terminalUtility(deal, history);
      if (terminal !== null) return terminal;
      if (!isDecisionHistory(history)) throw new Error('Invalid tree');
      const player = playerToAct(history);
      const key = infoKey(deal[player], history);
      const strategy = profile[key]!;
      const utilities = legalActions(history).map((action, index) => {
        const nextReach: [number, number] = [...reach];
        nextReach[player] *= strategy[index]!;
        return traverse(deal, nextHistory(history, action), nextReach);
      });
      const utility = strategy[0] * utilities[0]! + strategy[1] * utilities[1]!;
      for (let index = 0; index < 2; index++) {
        delta[key]![index]! += (player === 0 ? 1 : -1) * reach[1 - player]!
          * (utilities[index]! - utility) / DEALS.length;
        strategySum[key]![index]! += reach[player] * strategy[index]! / DEALS.length;
      }
      return utility;
    };
    for (const deal of DEALS) traverse(deal, '', [1, 1]);
    for (const key of keys) for (let action = 0; action < 2; action++) regrets[key]![action]! += delta[key]![action]!;
  }
  return Object.fromEntries(keys.map(key => {
    const values = strategySum[key]!;
    const sum = values[0] + values[1];
    return [key, sum ? [values[0] / sum, values[1] / sum] : [0.5, 0.5]];
  }));
}

/** Information-set EV: integrates unseen opponent cards with their policy reach.
 * No sampled or privileged opponent card is accepted by this API.
 */
export function conditionalActionValues(profile: StrategyProfile, card: KuhnCard, history: KuhnHistory): Probabilities {
  const hero = playerToAct(history);
  const opponent = 1 - hero;
  const candidates = KUHN_CARDS.filter(other => other !== card).map(other => {
    const deal: [KuhnCard, KuhnCard] = hero === 0 ? [card, other] : [other, card];
    let weight = 0.5;
    let prefix = '';
    for (const token of history) {
      if (!isDecisionHistory(prefix)) throw new Error('Invalid history');
      if (playerToAct(prefix) === opponent) {
        const actionIndex = token === 'b' || token === 'c' ? 1 : 0;
        weight *= profile[infoKey(other, prefix)]![actionIndex]!;
      }
      prefix += token;
    }
    return { deal, weight };
  });
  const reach = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  if (reach <= 0) throw new Error('Unreachable information set: conditional EV is undefined');
  return legalActions(history).map(action => candidates.reduce((sum, candidate) => sum
    + candidate.weight / reach * profileValue(profile, candidate.deal, nextHistory(history, action))
    * (hero === 0 ? 1 : -1), 0)) as Probabilities;
}

export function treeDescription() {
  return HISTORIES.map(history => ({ history, player: playerToAct(history), commitments: commitments(history),
    actions: legalActions(history).map(action => ({ action, next: nextHistory(history, action) })) }));
}
