import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Evaluation, SolutionSummary, TrainingSpot } from '../shared/contracts';
import { commitments, HISTORIES, infoKey, KUHN_CARDS, legalActions, playerToAct } from '../solver/kuhn';
import type { SolutionArtifact } from '../solver/artifact';
import { FileSolutionStorage } from './storage';
import { StaticDatasetProvider } from './provider';
import type { KuhnAction, KuhnCard, KuhnHistory } from './types';

const ACTION_LABELS: Record<KuhnAction, string> = { check: 'Check', bet: 'Bet 1', fold: 'Fold', call: 'Call 1' };
let library: Promise<{ artifact: SolutionArtifact; provider: StaticDatasetProvider }> | undefined;

async function loadLibrary() {
  if (!library) library = (async () => {
    const index = JSON.parse(await readFile(path.join(process.cwd(), 'data', 'solutions', 'index.json'), 'utf8')) as {
      id: string; version: string; checksum: string;
    };
    const artifact = await new FileSolutionStorage().read(index.version);
    if (artifact.checksum !== index.checksum || artifact.id !== index.id) throw new Error('Solution index integrity failure');
    return { artifact, provider: new StaticDatasetProvider(artifact) };
  })().catch(error => { library = undefined; throw error; });
  return library;
}

function context(history: KuhnHistory): string {
  if (history === '') return 'Beide Spieler zahlen 1 Ante. Du eröffnest. Check oder Bet 1?';
  if (history === 'x') return 'Spieler 1 hat gecheckt. Du kannst checken oder 1 Ante setzen.';
  if (history === 'b') return 'Spieler 1 setzt 1 Ante. Fold oder Call 1?';
  return 'Du hast gecheckt, Spieler 2 setzt 1 Ante. Fold oder Call 1?';
}

function resolveSpot(spotId: string): { card: KuhnCard; history: KuhnHistory } {
  for (const history of HISTORIES) for (const card of KUHN_CARDS) {
    if (spotId === `kuhn:${infoKey(card, history)}`) return { card, history };
  }
  throw new Error('Unknown training spot');
}

/** Deliberately contains neither hidden opponent cards nor strategy/EV answers. */
export async function getTrainingSpots(): Promise<TrainingSpot[]> {
  const { artifact } = await loadLibrary();
  // Start with the medium-card bluff-catcher, then cover every information set.
  const histories: KuhnHistory[] = ['b', '', 'x', 'xb'];
  const cards: KuhnCard[] = ['Q', 'J', 'K'];
  return histories.flatMap(history => cards.map(card => {
    const amounts = commitments(history);
    return { id: `kuhn:${infoKey(card, history)}`, game: 'KUHN', card, history,
      position: `Spieler ${playerToAct(history) + 1}`, pot: amounts[0] + amounts[1],
      actions: legalActions(history).map(action => ({ id: action, label: ACTION_LABELS[action] })),
      context: context(history), solutionId: artifact.id, solutionVersion: artifact.version, sourceType: 'COMPUTED' };
  }));
}

export async function evaluateDecision(spotId: string, action: string, expectedVersion?: string): Promise<Evaluation> {
  const spot = resolveSpot(spotId);
  if (!(legalActions(spot.history) as string[]).includes(action)) throw new Error('Illegal training action');
  const { artifact, provider } = await loadLibrary();
  if (expectedVersion !== undefined && expectedVersion !== artifact.version) throw new Error('Solution version mismatch');
  const values = await provider.getActionEVs({ game: 'kuhn', history: spot.history }, { game: 'kuhn', card: spot.card });
  const chosen = values.find(value => value.action === action)!;
  const bestEv = Math.max(...values.map(value => value.ev));
  const regret = Math.max(0, bestEv - chosen.ev);
  const observation = regret < 0.01 ? 'Die Aktion liegt innerhalb von 0,01 Ante der besten berechneten Aktion.'
    : `Die Aktion verliert in diesem Informationszustand ${regret.toFixed(3)} Ante gegenüber der besten berechneten Aktion.`;
  return { spotId, chosenAction: action, regret, bestEv, chosenEv: chosen.ev,
    actions: values.map(value => ({ ...value, label: ACTION_LABELS[value.action] })),
    explanation: `${observation} Die EVs mitteln über die möglichen gegnerischen Karten, gewichtet nach der bisherigen Strategie. `
      + 'Gemischte Frequenzen sind keine Richtig/Falsch-Vorgabe. EV ist der Nettogewinn der ganzen Hand inklusive Ante; kleine Unterschiede bleiben bei einer Näherungslösung möglich.',
    sourceType: 'COMPUTED', solutionId: artifact.id, solutionVersion: artifact.version,
    exploitability: artifact.accuracy.value, unit: 'Ante/Hand' };
}

export async function getSolutionSummary(): Promise<SolutionSummary> {
  const { artifact } = await loadLibrary();
  return { id: artifact.id, version: artifact.version, sourceType: 'COMPUTED', game: 'Kuhn Poker · 3 Karten',
    solverVersion: artifact.solverVersion, iterations: artifact.iterations, exploitability: artifact.accuracy.value,
    generatedAt: artifact.generatedAt, nodeCount: artifact.nodes.length, checksum: artifact.checksum, expectedValue: artifact.expectedValue };
}

export async function getStrategyNode(spotId: string) {
  const spot = resolveSpot(spotId);
  return (await loadLibrary()).provider.getNode({ game: 'kuhn', history: spot.history });
}
