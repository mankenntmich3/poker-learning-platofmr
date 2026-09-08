import type { KuhnCard } from '../strategy/types';
import type { StrategyProfile } from './kuhn';

/** Independent exhaustive normal-form evaluator. Each player has six information
 * sets, hence 64 pure policies. A policy shares the same choice across all deals
 * in an information set; it never chooses using the unseen opponent card.
 * This intentionally does not call the CFR traversal or its terminal evaluator.
 */
export function assessStrategy(profile: StrategyProfile): {
  bestResponseValues: [number, number]; nashConv: number; exploitability: number;
} {
  const cards: KuhnCard[] = ['J', 'Q', 'K'];
  const bestResponseValues: [number, number] = [-Infinity, -Infinity];
  for (const player of [0, 1] as const) {
    for (let policy = 0; policy < 64; policy++) {
      let value = 0;
      for (let first = 0; first < 3; first++) for (let second = 0; second < 3; second++) {
        if (first === second) continue;
        const win = first > second ? 1 : -1;
        const probability = (actor: 0 | 1, cardIndex: number, history: string, ownStage: number) => {
          if (player === actor) return (policy >> (cardIndex * 2 + ownStage)) & 1;
          return profile[`${cards[cardIndex]!}:${history || 'root'}`]![1];
        };
        const openBet = probability(0, first, '', 0);
        const callBet = probability(1, second, 'b', 0);
        const betAfterCheck = probability(1, second, 'x', 1);
        const callAfterCheckBet = probability(0, first, 'xb', 1);
        const betBranch = (1 - callBet) + callBet * 2 * win;
        const checkBranch = (1 - betAfterCheck) * win
          + betAfterCheck * ((1 - callAfterCheckBet) * -1 + callAfterCheckBet * 2 * win);
        const playerZeroValue = openBet * betBranch + (1 - openBet) * checkBranch;
        value += playerZeroValue * (player === 0 ? 1 : -1) / 6;
      }
      bestResponseValues[player] = Math.max(bestResponseValues[player], value);
    }
  }
  const nashConv = Math.max(0, bestResponseValues[0] + bestResponseValues[1]);
  return { bestResponseValues, nashConv, exploitability: nashConv / 2 };
}
