# Strategy data and reproducibility

## Available data

The library contains one self-computed game configuration, `kuhn-3card-ante1-bet1`, and the immutable version `cfr1-100000-e359ca83dfee`. There are twelve card/history information sets. All strategy frequencies and EVs displayed by the Kuhn trainer originate from this artifact. There are **no NLHE GTO solutions, third-party strategy databases, licensed strategy imports, or fabricated solver values** in this milestone.

The range explorer's 169 cells aggregate all 1,326 real two-card Hold’em combinations. They show card-combination properties, not computed fold/call/raise frequencies. These combinatorial facts should not be labeled as solver strategy.

## Artifact schema v1

`src/solver/artifact.ts` defines and validates `SolutionArtifact`.

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Format contract, currently 1 |
| `id`, `version` | Fixed game identity and immutable policy version |
| `sourceType` | `COMPUTED` for this worker's artifacts |
| `solverVersion` | `kuhn-full-tree-cfr/1.0.0` |
| `generatedAt` | Actual original generation time |
| `config` / `configHash` | Explicit game/rules and canonical SHA-256 digest |
| `rangeHash` | Digest of the six ordered chance deals and their probability |
| `treeHash` | Digest of legal public nodes, actions and transitions |
| `iterations`, `computeTimeMs` | Executed CFR iterations and measured original runtime |
| `accuracy` | Independently computed exploitability, NashConv, threshold and unit |
| `expectedValue` | Average strategy profile's player-0 net payoff |
| `profile` | Two legal-action probabilities per private-card/public-history information set |
| `nodes` | Card, history, acting player, action frequencies/EVs and total EV |
| `checksum` | SHA-256 over canonical artifact JSON excluding the checksum field itself |

The version includes the algorithm generation, iteration count and the first twelve hex digits of the normalized policy's SHA-256 hash. Configuration is fixed and separately checked; a changed game or incompatible schema requires a new identity/version scheme. Metadata is immutable too: changing the generation timestamp cannot silently replace an existing published version. The full checksum is the integrity anchor; the shortened version suffix is a convenient identifier, not a security signature.

Canonical hashing recursively sorts object keys and preserves array order. All numbers must be finite, all frequencies must lie within [0, 1], and each policy must sum to one within numerical tolerance. No rounding is applied to stored frequencies or EVs. The UI may round its presentation.

## Validation and publication

Every artifact is validated on creation, publication and load. Validation checks:

- Schema, game identity, solver version, timestamp and numeric metadata.
- Full checksum plus independent configuration, chance-range, tree and policy version hashes.
- Exactly twelve unique legal information sets with the correct player and legal actions.
- Finite normalized policies and matching node frequencies.
- Action EVs recomputed from opponent information-set reach; total EV recomputed from the mixture.
- Independently recomputed best-response exploitability, correct units, fixed publication threshold and adequate convergence.
- Recomputed expected game value.

Altered EVs or accuracy values are rejected even when a caller recalculates the file checksum. SHA-256 detects corruption; it is not an authenticated signature against someone who can rewrite all repository data and code. Production object access controls, signed publication, backup policy and restore testing remain separate work.

`FileSolutionStorage` rejects unsafe version names and refuses overwrite. The local worker writes a completed object before atomically changing `index.json`; a failed future solve leaves the current index intact. The facade also checks that index ID/checksum match the artifact. Tiny Kuhn data is loaded and validated once per process; responses expose only the requested data. New published indexes are picked up on a process restart. A scalable library will need version-keyed object/range caches and node/chunk indexes before storing larger games.

`latest-job.json` records the original initial computation. `jobs/<configuration-job-id>.json` uses the durable worker's current format. Revalidating/adopting the original artifact preserves its original timestamp and measured computation time.

## API boundary

The browser receives answer-free `TrainingSpot` objects. These contain the player's own card, public situation, legal actions, and provenance identity. The server evaluates submitted actions with the published provider and returns `Evaluation` with exact artifact version, conditional EVs and regret. The submitted solution version must match the version used for evaluation; a stale page cannot silently be graded against a new solution. `getStrategyNode` returns the public decision node with its full three-card strategy range. No private opponent deal is revealed or accepted as an EV input.

The generic internal provenance union supports `DEMO`, `COMPUTED`, `IMPORTED`, `LICENSED`, and `APPROXIMATED`; it does not imply that all those sources have implemented providers. The current public training contract only accepts `COMPUTED`. Additional source categories need explicit UI attribution, validation rules and licensing records before use.

## Cards, ranges and suit equivalence

Cards use canonical strings such as `As`, `Kh`, and `Td`. A concrete Hold’em combo is an unordered pair of distinct cards. Pairs have six combinations, suited classes four, offsuit classes twelve. Blocked cards are removed at the concrete-combo level before aggregation.

`canonicalizeCards(groups)` enumerates all 24 global suit permutations, sorts cards inside each supplied semantic group and chooses the minimum canonical key. It returns both forward and inverse suit mappings. Supply public board and private-card groups together: independently canonicalizing the board and each hand would lose flush/blocker relationships. Supply flop, turn and river as separate groups when street chronology matters. Arbitrary weighted ranges and every part of a future game configuration must participate in its solution identity; board canonicalization alone is never sufficient for an NLHE lookup.

Current texture tags are coarse descriptive labels, suitable for the initial card-learning surface. They do not provide strategy, equity or tactical advice. On later streets their suit-count classification is descriptive rather than a full flush-draw taxonomy.

## Scaling decisions

The current artifact is small readable JSON to permit direct audits and reproducibility. Compression, binary strategy arrays, Zstandard, MessagePack, Arrow and chunked object indexes are not implemented or benchmarked here. Benchmark against actual future NLHE data before selecting a binary format. Relational storage should hold metadata, users, decisions and indexes; large trees and arrays belong in durable versioned object storage. Retain referenced historical artifacts so persisted analyses remain reproducible.
