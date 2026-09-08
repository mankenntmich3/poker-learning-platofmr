import { describe, expect, it } from 'vitest';
import { allCombos, allHandClasses, boardTexture, canonicalizeCards, combosForClass, createCombo, createDeck,
  getHandClass, parseCard, SUITS, SUIT_PERMUTATIONS, type Card, type Suit } from '../../src/domain/cards';

describe('52-card Hold’em domain', () => {
  it('parses strict canonical cards and enumerates exactly 52 distinct cards', () => {
    expect(new Set(createDeck()).size).toBe(52);
    expect(parseCard('As')).toBe('As');
    for (const invalid of ['as', '10h', 'Ax', '', 'Joker']) expect(() => parseCard(invalid)).toThrow('Invalid card');
  });
  it('enumerates 1326 legal unordered combos, with no reversals or duplicate cards', () => {
    const combos = allCombos();
    expect(combos).toHaveLength(1326);
    expect(new Set(combos.map(combo => combo.join(''))).size).toBe(1326);
    expect(combos.every(([a, b]) => a !== b)).toBe(true);
    expect(createCombo('Kh', 'As')).toEqual(createCombo('As', 'Kh'));
    expect(() => createCombo('As', 'As')).toThrow('Duplicate');
  });
  it('aggregates actual combos into exactly 169 classes, with 6/4/12 multiplicities', () => {
    const classes = allHandClasses();
    expect(new Set(classes).size).toBe(169);
    expect(classes[0]).toBe('AA');
    expect(classes[1]).toBe('AKs');
    expect(classes[13]).toBe('AKo');
    const grouped = new Map<string, number>();
    for (const combo of allCombos()) grouped.set(getHandClass(combo), (grouped.get(getHandClass(combo)) ?? 0) + 1);
    for (const hand of classes) expect(grouped.get(hand)).toBe(hand.length === 2 ? 6 : hand.endsWith('s') ? 4 : 12);
    expect(combosForClass('AA')).toHaveLength(6);
    expect(combosForClass('AKs')).toHaveLength(4);
    expect(combosForClass('AKo')).toHaveLength(12);
    expect(() => combosForClass('KAs')).toThrow('Invalid hand class');
  });
  it('applies card removal to concrete combos without changing class semantics', () => {
    expect(allCombos(['As'])).toHaveLength(1275);
    expect(allCombos(['As', 'Kh', 'Qd'])).toHaveLength(1176);
    expect(combosForClass('AA', ['As'])).toHaveLength(3);
    expect(combosForClass('AKs', ['As'])).toHaveLength(3);
    expect(allCombos(['As']).every(combo => !combo.includes('As'))).toBe(true);
    expect(() => allCombos(['As', 'As'])).toThrow('Duplicate');
  });
});

describe('global suit canonicalization', () => {
  const groups: Card[][] = [['As', 'Kd', '8s'], ['Qs', 'Jh'], ['7c', '7d']];
  it('is invariant under all 24 global suit permutations while retaining every semantic group', () => {
    const original = canonicalizeCards(groups);
    expect(SUIT_PERMUTATIONS).toHaveLength(24);
    for (const permutation of SUIT_PERMUTATIONS) {
      const mapping = Object.fromEntries(SUITS.map((suit, index) => [suit, permutation[index]!])) as Record<Suit, Suit>;
      const renamed = groups.map(group => group.map(card => `${card[0]}${mapping[card[1] as Suit]}` as Card));
      expect(canonicalizeCards(renamed).key).toBe(original.key);
    }
  });
  it('provides an inverse mapping that round-trips every original group', () => {
    const canonical = canonicalizeCards(groups);
    const restored = canonical.groups.map(group => group.map(card => `${card[0]}${canonical.toReal[card[1] as Suit]}`).sort());
    expect(restored).toEqual(groups.map(group => [...group].sort()));
    expect(canonicalizeCards(groups.map(group => [...group].reverse())).key).toBe(canonical.key);
  });
  it('distinguishes flush blockers, group boundaries, and later street cards', () => {
    expect(canonicalizeCards([['As', 'Ks', '8d'], ['Qs', 'Jh']]).key)
      .not.toBe(canonicalizeCards([['As', 'Ks', '8d'], ['Qh', 'Js']]).key);
    expect(canonicalizeCards([['As', 'Kd', '8s'], ['Qh'], ['Jc']]).key)
      .not.toBe(canonicalizeCards([['As', 'Kd', '8s'], ['Jc'], ['Qh']]).key);
    expect(() => canonicalizeCards([['As', 'Ks', '8d'], ['As', 'Jh']])).toThrow('Duplicate');
  });
  it('classifies supported board textures and wheel connectivity', () => {
    expect(boardTexture(['As', '2s', '3s'])).toEqual(['monotone', 'connected', 'high', 'ace-high']);
    expect(boardTexture(['Ks', 'Kh', '4d'])).toEqual(['rainbow', 'paired', 'disconnected', 'high', 'king-high']);
    expect(boardTexture(['9s', '8s', '7h'])).toEqual(['two-tone', 'connected', 'low']);
    expect(() => boardTexture(['As'])).toThrow('3–5');
  });
});
