import { canonicalizeCards, type Combo, type Suit, type Card } from './cards';
import { canonicalJson } from './canonical';
import type { PublicEvent, TablePosition } from './strategy-context';

export type InformationEncoding = 'PHYSICAL' | 'GLOBAL_SUIT_ISOMORPHISM_V1';
const preflopObservations = new Map<string, { hole: Combo; deals: Card[][] }>();
/** Lossless global suit renaming for a full-prior game with no fixed dead cards.
 * Groups preserve flop/turn/river chronology. Never canonicalize cards or streets
 * independently: that would erase flush blockers and violate perfect recall.
 */
export function encodedInformationKey(seat: TablePosition, hole: Combo, history: PublicEvent[],
  encoding: InformationEncoding = 'PHYSICAL', cache?: Map<string, { hole: Combo; deals: Card[][] }>): string {
  if (encoding === 'PHYSICAL') return canonicalJson({ seat, hole, history });
  if (encoding !== 'GLOBAL_SUIT_ISOMORPHISM_V1') throw new Error('Unknown information encoding.');
  const deals = history.filter(e => e.type === 'DEAL').map(e => e.cards);
  const observation = hole.join('') + '|' + deals.map(d => d.join('')).join('|');
  const observations = deals.length === 0 ? preflopObservations : cache;
  let mapped = observations?.get(observation);
  if (!mapped) {
    const canonical = canonicalizeCards([hole, ...deals]);
    mapped = { hole: canonical.groups[0] as unknown as Combo, deals: deals.map(cards => cards.map(c => `${c[0]}${canonical.toCanonical[c[1] as Suit]}` as Card).sort()) };
    observations?.set(observation, mapped);
  }
  let index = 0;
  return canonicalJson({ seat, hole: mapped.hole,
    history: history.map(e => e.type === 'DEAL' ? { type: 'DEAL', cards: mapped!.deals[index++] } : e) });
}
