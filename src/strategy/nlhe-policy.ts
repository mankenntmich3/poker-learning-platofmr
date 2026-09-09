import { allCombos, allHandClasses, getHandClass, RANKS, type Card, type Combo, type Rank } from '@/domain/cards';
import { evaluateHoldem } from '@/domain/holdem';
import { POSTFLOP_CONFIG, possibleVillains, validNlheConfig, type NlheActionInfo, type NlheClassStrategy, type NlheConfig, type NlheRange, type NlheProvenance } from '@/shared/nlhe';

export interface NlhePolicy {
  algorithm: string; authorship: string;
  openCoverage: Record<string, number>; vsOpenContinue: Record<string, number>; vsOpenRaise: Record<string, number>;
  vs3betContinue: number; vs3betRaise: number; mixStep: number; boundaryCombos: number;
}
export const STARTING_COMBOS = allCombos();
const CLASS_COMBOS = new Map(allHandClasses().map(hand => [hand, STARTING_COMBOS.filter(c => getHandClass(c) === hand)]));
const clamp = (x: number, low = 0, high = 1) => Math.max(low, Math.min(high, x));
const roundMix = (x: number, step: number) => clamp(Math.round(x / step) * step);

/** Original hand-ordering heuristic, NOT equity, EV, or a GTO solve. */
function handScore(hand: string, stack: number): number {
  const high = 14 - RANKS.indexOf(hand[0] as Rank); const low = 14 - RANKS.indexOf(hand[1] as Rank);
  const deep = clamp(Math.log2(stack / 30), -2, 3);
  if (high === low) return 38 + high * 3 + deep * (14 - high) * 0.32;
  const suited = hand.endsWith('s'); const gap = high - low - 1;
  const broadway = low >= 10 ? 7 : 0;
  const connector = suited ? Math.max(0, 5 - gap * 2) * (1.1 + deep * 0.25) : 0;
  return high * 2.1 + low * 1.4 + broadway + (suited ? 6 + deep * 1.4 : 0) + connector
    + (high === 14 ? 5 + (low <= 5 && suited ? 3 : 0) : 0) - (gap >= 5 ? 3 : 0);
}

function band(hand: string, ordered: string[], targetCombos: number, policy: NlhePolicy): number {
  let before = 0;
  for (const candidate of ordered) {
    const count = CLASS_COMBOS.get(candidate)!.length;
    if (candidate === hand) return roundMix((targetCombos - before - count / 2) / policy.boundaryCombos + 0.5, policy.mixStep);
    before += count;
  }
  throw new Error('Unknown starting hand');
}

function preflopRows(config: NlheConfig, policy: NlhePolicy): NlheClassStrategy[] {
  const classes = allHandClasses();
  const order = [...classes].sort((a, b) => handScore(b, config.stackBb) - handScore(a, config.stackBb) || a.localeCompare(b));
  const depth = clamp(Math.log2(config.stackBb / 100), -3.5, 2.5);
  const openTarget = (position: string) => 1326 * clamp(policy.openCoverage[position] + depth * 0.008, 0.1, 0.55);
  const opener = config.villain || 'BTN';
  const bb = config.hero === 'BB'; const sb = config.hero === 'SB';
  return classes.map(handClass => {
    const open = config.hero === 'BB' ? 0 : band(handClass, order, openTarget(config.hero), policy);
    let fold: number; let call = 0; let raise: number; let reach = 1;
    if (config.scenario === 'rfi') { raise = open; fold = 1 - raise; }
    else if (config.scenario === 'vs-open') {
      // The BB closes action and has already posted a full blind. Earlier seats face squeeze risk.
      const continueTarget = 1326 * clamp(policy.vsOpenContinue[opener] * (bb ? 2.0 : sb ? 1.1 : 1) + depth * 0.006, 0.08, 0.62);
      const continueFrequency = band(handClass, order, continueTarget, policy);
      const raiseTarget = 1326 * policy.vsOpenRaise[opener] * (sb ? 1.35 : 1);
      raise = Math.min(continueFrequency, band(handClass, order, raiseTarget, policy));
      // Some suited wheel aces are pedagogical blocker candidates at deeper stacks.
      if (/^A[2-5]s$/.test(handClass) && config.stackBb >= 40 && continueFrequency > 0) raise = Math.max(raise, Math.min(0.25, continueFrequency));
      call = continueFrequency - raise; fold = 1 - continueFrequency;
    } else {
      reach = open;
      const original = openTarget(config.hero);
      const continueFrequency = band(handClass, order, original * (policy.vs3betContinue + Math.max(0, depth) * 0.025), policy);
      raise = Math.min(continueFrequency, band(handClass, order, original * (policy.vs3betRaise + (config.stackBb <= 25 ? 0.12 : 0)), policy));
      call = continueFrequency - raise; fold = 1 - continueFrequency;
    }
    return { handClass, combos: CLASS_COMBOS.get(handClass)!.length, reach,
      actions: [{ action: 'fold', frequency: fold, ev: null }, ...(config.scenario !== 'rfi' ? [{ action: 'call' as const, frequency: call, ev: null }] : []), { action: 'raise', frequency: raise, ev: null }] };
  });
}

function situation(config: NlheConfig): { potBb: number; investedBb: number; toCallBb: number; actions: NlheActionInfo[]; context: string; board: Card[] } {
  const blind = config.hero === 'BB' ? 1 : config.hero === 'SB' ? 0.5 : 0;
  const open = (position: string) => position === 'SB' ? 3 : 2.5;
  const action = (id: NlheActionInfo['id'], label: string, toBb: number | null): NlheActionInfo => ({ id, label, toBb, allIn: toBb === config.stackBb });
  if (config.scenario === 'flop-srp') return { potBb: 5.5, investedBb: 2.5, toCallBb: 0, board: ['As', '7d', '2c'],
    actions: [action('check', 'Check', null), action('bet', 'Bet 1,8 BB', 1.8)],
    context: 'BTN eröffnet auf 2,5 BB. SB foldet, BB callt. Flop A♠ 7♦ 2♣: BB checkt zu dir. 97,5 BB verbleiben; eine Betgröße von 1,8 BB.' };
  if (config.scenario === 'rfi') return { potBb: 1.5, investedBb: blind, toCallBb: 1 - blind, board: [],
    actions: [action('fold', 'Fold', null), action('raise', `Raise auf ${open(config.hero)} BB`, open(config.hero))],
    context: `Alle Positionen vor ${config.hero} haben gefoldet. Du eröffnest mit einer Raise/Fold-Lernrange. Blinds: 0,5 / 1 BB.` };
  const villainOpen = open(config.villain!);
  if (config.scenario === 'vs-open') {
    const size = Math.min(config.stackBb, (config.hero === 'BB' || config.hero === 'SB') ? 11 : 9);
    return { potBb: 1.5 + villainOpen - (config.villain === 'SB' ? 0.5 : 0), investedBb: blind, toCallBb: villainOpen - blind, board: [],
      actions: [action('fold', 'Fold', null), action('call', `Call ${villainOpen - blind} BB`, villainOpen), action('raise', size === config.stackBb ? `All-in ${size} BB` : `3-Bet auf ${size} BB`, size)],
      context: `${config.villain} eröffnet auf ${villainOpen} BB. Alle dazwischen folden. ${config.hero} entscheidet; keine Caller oder Squeeze-Situation.` };
  }
  const heroOpen = open(config.hero);
  const threebet = Math.min(config.stackBb, (config.villain === 'SB' || config.villain === 'BB') ? 11 : 9);
  const villainBlind = config.villain === 'BB' ? 1 : config.villain === 'SB' ? 0.5 : 0;
  const fourbet = Math.min(config.stackBb, Math.max(threebet * 2.3, threebet * 2 - heroOpen));
  return { potBb: 1.5 + heroOpen - blind + threebet - villainBlind, investedBb: heroOpen, toCallBb: threebet - heroOpen, board: [],
    actions: [action('fold', 'Fold', null), action('call', `Call ${threebet - heroOpen} BB`, threebet),
      ...(threebet < config.stackBb ? [action('raise', fourbet === config.stackBb ? `All-in ${fourbet} BB` : `4-Bet auf ${Math.round(fourbet * 100) / 100} BB`, Math.round(fourbet * 100) / 100)] : [])],
    context: `${config.hero} eröffnet auf ${heroOpen} BB, ${config.villain} erhöht auf ${threebet} BB. Alle anderen folden. Nur Hände aus deiner vorherigen Opening-Range erreichen diesen Spot.` };
}

export function buildNlheRange(config: NlheConfig, policy: NlhePolicy, provenance: NlheProvenance): NlheRange {
  if (!validNlheConfig(config)) throw new Error('Invalid NLHE configuration');
  const spot = situation(config);
  let classes = preflopRows(config.scenario === 'flop-srp' ? { ...config, scenario: 'rfi', villain: null } : config, policy);
  let combos = (config.scenario === 'flop-srp' ? allCombos(spot.board) : STARTING_COMBOS).map(cards => {
    const handClass = getHandClass(cards); const row = classes.find(c => c.handClass === handClass)!;
    let actions = row.actions.map(a => ({ ...a })); let reach = row.reach;
    if (config.scenario === 'flop-srp') {
      reach = row.actions.find(a => a.action === 'raise')!.frequency;
      const value = evaluateHoldem([...cards, ...spot.board]);
      const topPair = cards.some(c => c[0] === 'A');
      const bet = value.category >= 2 ? 0.75 : topPair ? (cards.some(c => ['K', 'Q', 'J', 'T'].includes(c[0])) ? 0.75 : 0.5) : 0.25;
      actions = [{ action: 'check', frequency: 1 - bet, ev: null }, { action: 'bet', frequency: bet, ev: null }];
    } else if (!spot.actions.some(a => a.id === 'raise')) {
      // Facing an all-in: raising is illegal, so this simplified model moves its continue mass to call.
      actions = actions.filter(a => a.action !== 'raise').map(a => a.action === 'call' ? { ...a, frequency: a.frequency + row.actions.find(x => x.action === 'raise')!.frequency } : a);
    }
    return { cards: cards as Combo, handClass, reach, actions };
  });
  // Per-class view is a combo-weighted average, including board card removal.
  classes = allHandClasses().map(handClass => {
    const group = combos.filter(c => c.handClass === handClass);
    return { handClass, combos: group.length, reach: group.length ? group.reduce((n, c) => n + c.reach, 0) / group.length : 0,
      actions: spot.actions.map(a => ({ action: a.id, frequency: group.length ? group.reduce((n, c) => n + c.actions.find(x => x.action === a.id)!.frequency, 0) / group.length : 0, ev: null })) };
  });
  // Own the result; callers cannot mutate globally cached starting combinations.
  combos = combos.map(c => ({ ...c, cards: [...c.cards] as Combo }));
  const related: NlheConfig[] = config.scenario === 'rfi' ? possibleVillains({ ...config, scenario: 'vs-3bet' }).map(villain => ({ ...config, scenario: 'vs-3bet', villain }))
    : config.scenario === 'vs-3bet' ? [{ ...config, scenario: 'rfi', villain: null }]
      : config.scenario === 'vs-open' ? [{ ...config, hero: config.villain!, villain: null, scenario: 'rfi' }] : [{ ...POSTFLOP_CONFIG, scenario: 'vs-open', hero: 'BB', villain: 'BTN' }];
  return { id: `nlhe:${config.stackBb}:${config.hero}:${config.scenario}:${config.villain || '-'}`, config: { ...config }, ...spot, classes, combos, provenance: structuredClone(provenance), related };
}

export function validateNlheRange(range: NlheRange): void {
  if (range.classes.length !== 169 || range.combos.length !== (range.board.length ? 1176 : 1326)) throw new Error('Incomplete NLHE coverage');
  for (const combo of range.combos) {
    if (combo.cards.some(c => range.board.includes(c)) || combo.reach < 0 || combo.reach > 1) throw new Error('Invalid card removal/reach');
    if (Math.abs(combo.actions.reduce((n, a) => n + a.frequency, 0) - 1) > 1e-9
      || combo.actions.some(a => !Number.isFinite(a.frequency) || a.frequency < 0 || a.frequency > 1 || a.ev !== null || !range.actions.some(legal => legal.id === a.action))) throw new Error('Invalid frequency/action');
  }
  if (range.provenance.sourceType !== 'APPROXIMATED' || range.provenance.accuracy.value !== null) throw new Error('Heuristic cannot claim measured GTO accuracy');
}
