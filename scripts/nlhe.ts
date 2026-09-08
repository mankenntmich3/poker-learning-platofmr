import { publishNlhePolicy } from '../src/solver/nlhe-artifact';
publishNlhePolicy().then(result => console.log(JSON.stringify({ version: result.artifact.version, source: 'APPROXIMATED', validatedSpots: result.validatedSpots, validation: 'Structural/legality checks only; GTO accuracy and EV are not measured.' }, null, 2)))
  .catch((error: unknown) => { console.error(error); process.exitCode = 1; });
