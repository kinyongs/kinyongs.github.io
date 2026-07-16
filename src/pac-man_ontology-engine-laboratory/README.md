# Ontology Engine Laboratory

A framework-free HTML/CSS/JavaScript laboratory for exploring Semantic, Kinetic and Dynamic layers. Pac-Man is a demonstration domain plugin; the engine contains no Pac-Man rules.

## Run

Extract the ZIP file and double-click `index.html`. The standalone build runs directly in the browser without Python or a local server.

The files under `src/` retain the reusable ES6 module architecture. `app.js` is the browser-ready standalone bundle generated from those modules.

## Invariants

- UI reads Ontology and never writes it.
- Actions are the only real-world mutation gate.
- Every executed action stores an Event object.
- Planners recommend only one first action.
- Simulation uses cloned Ontologies.
- Seeded, independent player/ghost random streams enable identical replay.

## Extension points

Implement a domain plugin with `install(engine)`, `initialize(engine, seed)`, `nextAction(engine)` and optional `recompute(engine)`. Supply independent planner, maze generator and visualization implementations.

## Current demonstration

- Aggregated ontology graph for core objects and relationships
- Direction-aware Pac-Man rendering
- Monte Carlo player planner with 96 rollouts, depth 22, UCB selection, visible choice evolution, hard collision rejection, fast-food reward, and close-range escape reward
- One `advanceTick` Action moves Pac-Man and every ghost simultaneously and stores one `TickEvent`
- Adjustable ghost count from 1 to 8
- Adjustable Monte Carlo rollout count (16–512) and planning horizon (4–60 ticks)
- Reward explanation split into safety, food speed, escape distance, danger, revisit, time, and completion components
- Braided maze generation removes most dead ends and adds looped escape routes
- Hybrid time-expanded safety analysis ranks survival horizon, reachable safe area, and junction access before Monte Carlo food efficiency
- Risk-sensitive MCTS compares survival probability and worst-case 20% CVaR before average reward
- Food cluster planning selects a safe pellet zone using travel time, ghost-arrival margin, density, and junction access; unsafe zones are ignored
- Exact food path planning locks onto one pellet, follows a danger-weighted path, and prefers an adjacent pellet when safety is comparable
- Recent-position memory penalizes repeated cells and suppresses meaningless A-B-A-B oscillation
- With five or fewer pellets, `FINAL PELLET HUNT` bypasses clustering and tracks every remaining pellet individually
- `MazeTopologyIndex` computes junctions, corridors, zones, and articulation bottlenecks once when a maze is generated
- A shared `ThreatField` computes player arrival, ghost arrival, and safety margins once per real tick for all planners
- Player and ghost planners use separate deterministic random streams. Pac-Man first chooses against the set of possible ghost responses; only then does the ghost planner privately sample its actual moves.
- Pac-Man never reads the sampled ghost moves. If the independently chosen simultaneous actions collide, the normal rule resolver produces `GameOverEvent`.
- `ThreatField` includes cumulative ghost-reachable cell sets for each future tick so planners can reason about uncertainty without predicting a single privileged route.
- Robust one-tick maximin filtering ranks actions safe against every legal ghost response before comparing risk-sensitive Monte Carlo scores.
- Semantic macro-actions (`HUNT_FINAL_PELLET`, `GO_TO_FOOD`, `ESCAPE_TO_JUNCTION`, `EXPAND_SAFE_AREA`, `SURVIVE`) preserve a longer-lived intent above individual moves.
- A constrained progress planner applies a safety shield first, retains one food goal, searches `(x, y, tick)` paths outside ghost-reachable sets, allows only a bounded detour, and replans only after progress stalls.
- Repeated state/action pairs become temporarily tabu; the restriction is bypassed when it would remove the only viable survival action.
- `PlanningGoal`, `SafetyEnvelope`, `TimeExpandedPath`, and `ProgressState` are derived Semantic Layer objects updated through the post-Action recomputation lifecycle.
- The Semantic graph stays aggregated in AUTO mode and expands in PAUSE/STEP mode to expose the safety envelope, persistent goal, time path, progress budget, cycle guard, response set, candidates, and macro intent.
- A bounded transposition table reuses Monte Carlo evidence when the same world state is revisited and reports cache hits in the Debug panel.
- `OPTIMIZE WEIGHTS` runs an end-to-end deterministic evolutionary search over food, target-food, escape, danger, revisit, time, completion, and rollout-policy weights. Every candidate now runs until completion, game-over, or a 600-tick safety cap instead of using an early-game sample.
- Each candidate is evaluated on the same seed set. Game-over is treated as a hard constraint penalty before completion, food progress, efficiency, oscillation, and planning time are compared.
- The winning profile is immediately applied to the real player planner, its search cache is cleared, and generation history plus exact weights are shown in Debug Console. Re-running optimization continues from the active profile.
- AUTO speed can be changed live among 0.5×, 1×, 2×, 4×, and MAX without resetting the game.
- Corridor isolation and articulation bottlenecks contribute directly to the safety planner's trap risk
- If no robust-safe action exists, Pac-Man chooses the lowest-risk fallback; an actual collision ends the game instead of altering ghost movement.
- The ontology graph displays aggregate semantic objects instead of rendering hundreds of cell-level relationships
- Simulation clones exclude Event history and structurally share immutable Maze/Topology/Zone data
- Emergency `STAY` and non-terminal `SafetyStopEvent` allow replanning instead of freezing the game permanently
- Probabilistic anti-loop ghost planner with changing roam targets across the connected maze
