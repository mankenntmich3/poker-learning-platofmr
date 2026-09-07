export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const;
export const SUITS = ['s', 'h', 'd', 'c'] as const;
export type Rank = (typeof RANKS)[number];
export type Suit = (typeof SUITS)[number];
export type Card = `${Rank}${Suit}`;
export type Combo = readonly [Card, Card];
export type HandClass = string;

export function parseCard(value: string): Card {
  if (!/^[AKQJT2-9][shdc]$/.test(value)) throw new Error(`Invalid card: ${value}`);
  return value as Card;
}

export function createDeck(): Card[] {
  return RANKS.flatMap(rank => SUITS.map(suit => `${rank}${suit}` as Card));
}

export function assertUniqueCards(cards: readonly Card[]): void {
  cards.forEach(parseCard);
  if (new Set(cards).size !== cards.length) throw new Error('Duplicate cards are not legal');
}

function cardOrder(card: Card): number {
  return RANKS.indexOf(card[0] as Rank) * 4 + SUITS.indexOf(card[1] as Suit);
}

export function createCombo(first: string, second: string): Combo {
  const cards = [parseCard(first), parseCard(second)] as [Card, Card];
  assertUniqueCards(cards);
  return cards.sort((a, b) => cardOrder(a) - cardOrder(b));
}

export function allCombos(blocked: readonly Card[] = []): Combo[] {
  assertUniqueCards(blocked);
  const deck = createDeck().filter(card => !blocked.includes(card));
  const combos: Combo[] = [];
  for (let i = 0; i < deck.length; i++) {
    for (let j = i + 1; j < deck.length; j++) combos.push([deck[i]!, deck[j]!]);
  }
  return combos;
}

export function getHandClass(combo: Combo): HandClass {
  const [first, second] = createCombo(...combo);
  return first[0] === second[0] ? `${first[0]}${second[0]}`
    : `${first[0]}${second[0]}${first[1] === second[1] ? 's' : 'o'}`;
}

/** Row-major matrix: suited above the diagonal; offsuit below. */
export function allHandClasses(): HandClass[] {
  return RANKS.flatMap((row, i) => RANKS.map((col, j) => i === j ? `${row}${col}`
    : i < j ? `${row}${col}s` : `${col}${row}o`));
}

export function combosForClass(handClass: HandClass, blocked: readonly Card[] = []): Combo[] {
  if (!allHandClasses().includes(handClass)) throw new Error(`Invalid hand class: ${handClass}`);
  return allCombos(blocked).filter(combo => getHandClass(combo) === handClass);
}

function permutations<T>(items: readonly T[]): T[][] {
  if (!items.length) return [[]];
  return items.flatMap((item, index) => permutations(items.filter((_, i) => index !== i)).map(rest => [item, ...rest]));
}

export const SUIT_PERMUTATIONS = permutations(SUITS);

/** Exhaustive global suit canonicalization. Groups preserve semantic boundaries:
 * board, hero cards, villain cards/range entry. Cards inside each group are unordered.
 * Use separate groups for flop/turn/river when preserving street chronology matters.
 * Never canonicalize board and hole cards independently.
 */
export function canonicalizeCards(groups: readonly (readonly Card[])[]): {
  key: string; groups: Card[][]; toCanonical: Record<Suit, Suit>; toReal: Record<Suit, Suit>;
} {
  assertUniqueCards(groups.flat());
  let best: ReturnType<typeof canonicalizeCards> | undefined;
  for (const permutation of SUIT_PERMUTATIONS) {
    const toCanonical = Object.fromEntries(SUITS.map((suit, i) => [suit, permutation[i]!])) as Record<Suit, Suit>;
    const mapped = groups.map(group => group.map(card => `${card[0]}${toCanonical[card[1] as Suit]}` as Card)
      .sort((a, b) => cardOrder(a) - cardOrder(b)));
    const key = mapped.map(group => group.join('')).join('|');
    if (!best || key < best.key) best = {
      key, groups: mapped, toCanonical,
      toReal: Object.fromEntries(SUITS.map(suit => [toCanonical[suit], suit])) as Record<Suit, Suit>,
    };
  }
  return best!;
}

export function boardTexture(board: readonly Card[]): string[] {
  if (board.length < 3 || board.length > 5) throw new Error('A board needs 3–5 cards');
  assertUniqueCards(board);
  const ranks = board.map(card => card[0] as Rank);
  const suitCount = new Set(board.map(card => card[1])).size;
  const values = [...new Set(ranks.map(rank => 14 - RANKS.indexOf(rank)))].sort((a, b) => a - b);
  const tags = [suitCount === 1 ? 'monotone' : suitCount === 2 ? 'two-tone' : 'rainbow'];
  if (new Set(ranks).size < board.length) tags.push('paired');
  const straightValues = values.includes(14) ? [1, ...values] : values;
  const connected = straightValues.some((low, index) => straightValues.slice(index).filter(value => value <= low + 4).length >= 3);
  tags.push(connected ? 'connected' : 'disconnected');
  tags.push(values.at(-1)! >= 11 ? 'high' : 'low');
  if (ranks.includes('A')) tags.push('ace-high');
  else if (ranks.includes('K')) tags.push('king-high');
  return tags;
}
