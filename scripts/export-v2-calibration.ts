import { readFileSync, writeFileSync } from 'node:fs';
import { generateRiverGame } from '../src/solver/river-model';
import { verifyRiverProfile } from '../src/verification/river-best-response';
import { preflopContext, preflopInfo } from '../src/domain/preflop-definition';
import { exactPreflopEquity, verifyPreflopProfile } from '../src/verification/preflop-best-response';
import type { FiniteGame, GameNode, BehavioralProfile } from '../src/verification/exact-best-response';

const hero = preflopContext().conditioning!.ranges[0].combos;
const branches = [];
for (const h of hero) for (const v of hero) {
  if (h.cards.some(c => v.cards.includes(c))) continue;
  const terminal = (x: number): GameNode => ({ kind: 'terminal', payoff: [x, -x] });
  const child: GameNode = { kind: 'decision', player: 0, informationSet: preflopInfo('BTN', h.cards), actions: [
    { id: 'fold', child: terminal(-.5) }, { id: 'jam', child: { kind: 'decision', player: 1, informationSet: preflopInfo('BB', v.cards), actions: [
      { id: 'fold', child: terminal(2) }, { id: 'call', child: terminal(29 * exactPreflopEquity(h.cards, v.cards) - 14) },
    ] } },
  ] };
  branches.push({ probability: 1, child });
}
const preflop: FiniteGame = { players: 2, utilityUnit: 'BB_PER_HAND', root: { kind: 'chance', branches: branches.map(b => ({ ...b, probability: 1 / branches.length })) } };
function exportCase(name: string, game: FiniteGame, profile: BehavioralProfile, expected: unknown) {
  if (game.root.kind !== 'chance') throw new Error('Chance root required');
  const branches = game.root.branches;
  if (branches.some(b => Math.abs(b.probability - 1 / branches.length) > 1e-12)) throw new Error('Calibration requires uniform legal deals');
  const keys = [new Set<string>(), new Set<string>()];
  const scan = (n: GameNode) => { if (n.kind === 'decision') { keys[n.player].add(n.informationSet.split(':')[1]); n.actions.forEach(a => scan(a.child)); } };
  branches.forEach(b => scan(b.child));
  const types = keys.map(k => [...k].sort());
  const nodes: { actor: number; street: number; edges: number[]; payoff: number[] }[] = [];
  const oracle: Record<string, number[]> = {}, data: number[][] = [], probabilities: number[] = [];
  const build = (n: GameNode): number => {
    const id = nodes.length; nodes.push({ actor: n.kind === 'decision' ? n.player : -1, street: 0, edges: [], payoff: [0, 0, 0] });
    if (n.kind === 'decision') nodes[id].edges = n.actions.map(a => build(a.child));
    else if (n.kind !== 'terminal') throw new Error('Unexpected nested chance');
    return id;
  };
  build(branches[0].child);
  const offsets: number[] = []; let size = 0;
  nodes.forEach(n => { offsets.push(size); if (n.actor >= 0) size += 169 * n.edges.length; });
  probabilities.push(...Array(size).fill(0));
  nodes.forEach((n, i) => { if (n.actor >= 0) for (let k = 0; k < 169 * n.edges.length; k++) probabilities[offsets[i] + k] = 1 / n.edges.length; });
  branches.forEach((branch, w) => {
    data.push([0, 0, 0, 0, 0]);
    const fill = (id: number, n: GameNode) => {
      if (n.kind === 'terminal') { (oracle[id] ??= Array(branches.length).fill(0))[w] = n.payoff[0]; return; }
      if (n.kind !== 'decision') throw new Error('Nested chance');
      const type = types[n.player].indexOf(n.informationSet.split(':')[1]); data[w][n.player] = type;
      n.actions.forEach((a, j) => { probabilities[offsets[id] + type * n.actions.length + j] = profile[n.informationSet][a.id]; fill(nodes[id].edges[j], a.child); });
    };
    fill(0, branch.child);
  });
  return { name, model: { nodes, calibrationExpectedRootTypes: types[0].map((_, i) => i) }, data, oracle, profile: probabilities, expected };
}
const riverProfile = JSON.parse(readFileSync('data/solutions/river-lp.json', 'utf8')).fullProfile as BehavioralProfile;
const preflopProfile = JSON.parse(readFileSync('data/solutions/preflop-15-1.json', 'utf8')).fullProfile as BehavioralProfile;
writeFileSync('output/v2-calibration-input.json', JSON.stringify([
  exportCase('EXISTING_VERIFIED_RIVER', generateRiverGame(), riverProfile, verifyRiverProfile(riverProfile).report),
  exportCase('EXISTING_CONDITIONAL_HU', preflop, preflopProfile, verifyPreflopProfile(preflopProfile).report),
]));
