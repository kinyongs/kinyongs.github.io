(() => {
  // src/engine/semantic/Ontology.js
  var uid = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  var Ontology = class _Ontology {
    constructor() {
      this.objects = /* @__PURE__ */ new Map();
      this.relationships = /* @__PURE__ */ new Map();
      this.events = [];
      this.version = 0;
    }
    createObject(type, props = {}, id = uid()) {
      const o = { id, type, ...structuredClone(props) };
      this.objects.set(id, o);
      this.version++;
      return o;
    }
    deleteObject(id) {
      this.objects.delete(id);
      for (const [k, r] of this.relationships) if (r.from === id || r.to === id) this.relationships.delete(k);
      this.version++;
    }
    createRelationship(type, from, to, props = {}) {
      const id = `${type}:${from}:${to}`;
      const r = { id, type, from, to, ...props };
      this.relationships.set(id, r);
      return r;
    }
    clearRelationships(type) {
      for (const [k, r] of this.relationships) if (!type || r.type === type) this.relationships.delete(k);
    }
    storeEvent(type, payload = {}) {
      const e = this.createObject("Event", { eventType: type, tick: payload.tick ?? 0, payload });
      this.events.push(e);
      return e;
    }
    query({ type, where } = {}) {
      return [...this.objects.values()].filter((o) => (!type || o.type === type) && (!where || where(o)));
    }
    snapshot() {
      return { version: this.version, objects: structuredClone([...this.objects.values()]), relationships: structuredClone([...this.relationships.values()]), events: structuredClone(this.events) };
    }
    clone({ includeEvents = true, shareTypes = [] } = {}) {
      const n = new _Ontology(), shared = new Set(shareTypes);
      for (const o of this.objects.values()) {
        if (!includeEvents && o.type === "Event") continue;
        n.objects.set(o.id, shared.has(o.type) ? o : structuredClone(o));
      }
      for (const r of this.relationships.values()) if (n.objects.has(r.from) || n.objects.has(r.to)) n.relationships.set(r.id, structuredClone(r));
      n.events = includeEvents ? structuredClone(this.events) : [];
      n.version = this.version;
      return n;
    }
  };

  // src/engine/kinetic/ActionAPI.js
  var ActionAPI = class {
    constructor(engine2) {
      this.engine = engine2;
      this.actions = /* @__PURE__ */ new Map();
      this.history = [];
      this.queue = [];
    }
    register(type, handler) {
      this.actions.set(type, handler);
    }
    enqueue(action) {
      this.queue.push(action);
    }
    execute(action, { simulation = false } = {}) {
      const def = this.actions.get(action.type);
      if (!def) throw Error(`Unknown action: ${action.type}`);
      const ctx = { ontology: this.engine.ontology, engine: this.engine, action };
      const started = performance.now();
      const valid = def.validate?.(ctx) ?? true;
      if (!valid) return { ok: false, reason: "validation" };
      const result = def.mutate(ctx) || {};
      const event = this.engine.ontology.storeEvent(result.eventType || `${action.type}Event`, { tick: this.engine.tick, action, ...result });
      this.engine.plugin.recompute?.(this.engine);
      const record = { tick: this.engine.tick, action, event, duration: performance.now() - started, simulation };
      if (!simulation) this.history.unshift(record);
      this.engine.notify();
      return { ok: true, ...record };
    }
  };

  // src/engine/simulation/SimulationAPI.js
  var SimulationAPI = class {
    constructor(engine2) {
      this.engine = engine2;
    }
    withClone(run) {
      const real = this.engine.ontology;
      this.engine.ontology = real.clone({ includeEvents: false, shareTypes: ["Maze", "TopologyModel", "JunctionNetwork", "CorridorNetwork", "BottleneckSet", "Zone"] });
      try {
        return run(this.engine);
      } finally {
        this.engine.ontology = real;
      }
    }
  };

  // src/engine/Engine.js
  var Engine = class {
    constructor(plugin2, { seed = 1 } = {}) {
      this.plugin = plugin2;
      this.seed = seed >>> 0;
      this.tick = 0;
      this.mode = "pause";
      this.listeners = /* @__PURE__ */ new Set();
      this.ontology = new Ontology();
      this.actions = new ActionAPI(this);
      this.simulation = new SimulationAPI(this);
      this.diagnostics = { plans: [], recommendation: null, simulations: 0, reasoning: [] };
      plugin2.install(this);
    }
    init() {
      this.plugin.initialize(this, this.seed);
      this.notify();
    }
    onChange(fn) {
      this.listeners.add(fn);
    }
    notify() {
      this.listeners.forEach((fn) => fn(this));
    }
    step() {
      const started = performance.now();
      const action = this.plugin.nextAction(this);
      if (!action) return;
      this.tick++;
      this.diagnostics.recommendation = action;
      this.actions.execute(action);
      this.diagnostics.executionTime = performance.now() - started;
      this.plugin.afterAction?.(this);
    }
    start(ms = 220) {
      this.mode = "auto";
      clearInterval(this.timer);
      this.timer = setInterval(() => this.step(), ms);
      this.notify();
    }
    pause() {
      this.mode = "pause";
      clearInterval(this.timer);
      this.notify();
    }
    reset(seed = this.seed) {
      this.pause();
      this.seed = seed >>> 0;
      this.tick = 0;
      this.ontology = new Ontology();
      this.actions = new ActionAPI(this);
      this.simulation = new SimulationAPI(this);
      this.diagnostics = { plans: [], recommendation: null, simulations: 0, reasoning: [] };
      this.plugin.install(this);
      this.init();
    }
  };

  // src/engine/plugin/PluginLoader.js
  var PluginLoader = class {
    static load(plugin2, options) {
      if (!plugin2?.install || !plugin2?.initialize) throw Error("Invalid domain plugin");
      const e = new Engine(plugin2, options);
      e.init();
      return e;
    }
  };

  // src/plugins/pacman/random.js
  var SeededRandom = class {
    constructor(seed = 1) {
      this.state = seed >>> 0 || 1;
    }
    next() {
      let x = this.state;
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      this.state = x >>> 0;
      return this.state / 4294967296;
    }
    pickWeighted(items) {
      let t = items.reduce((s, x) => s + x.weight, 0), r = this.next() * t;
      for (const x of items) {
        r -= x.weight;
        if (r <= 0) return x.value;
      }
      return items.at(-1).value;
    }
  };

  // src/plugins/pacman/maze/RandomMazeGenerator.js
  var CARDINAL = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  var RandomMazeGenerator = class {
    generate(width = 21, height = 19, seed = 1) {
      width |= 1;
      height |= 1;
      const rng = new SeededRandom(seed), grid = Array.from({ length: height }, () => Array(width).fill(1)), stack = [[1, 1]], dirs = [[2, 0], [-2, 0], [0, 2], [0, -2]];
      grid[1][1] = 0;
      while (stack.length) {
        const [x, y] = stack.at(-1), next = dirs.map(([dx2, dy2]) => [x + dx2, y + dy2, dx2, dy2]).filter(([nx2, ny2]) => nx2 > 0 && ny2 > 0 && nx2 < width - 1 && ny2 < height - 1 && grid[ny2][nx2]).sort(() => rng.next() - 0.5)[0];
        if (!next) {
          stack.pop();
          continue;
        }
        const [nx, ny, dx, dy] = next;
        grid[y + dy / 2][x + dx / 2] = grid[ny][nx] = 0;
        stack.push([nx, ny]);
      }
      this.braidDeadEnds(grid, width, height, rng, 0.82);
      for (let i = 0; i < Math.floor(width * height * 0.12); i++) {
        const x = 1 + Math.floor(rng.next() * (width - 2)), y = 1 + Math.floor(rng.next() * (height - 2));
        if (grid[y][x] && CARDINAL.filter(([dx, dy]) => grid[y + dy]?.[x + dx] === 0).length >= 2) grid[y][x] = 0;
      }
      return { width, height, grid, generator: "BraidedRandomMazeGenerator", escapeBias: 0.82 };
    }
    braidDeadEnds(grid, width, height, rng, ratio) {
      const dead = [];
      for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) if (grid[y][x] === 0 && CARDINAL.filter(([dx, dy]) => grid[y + dy]?.[x + dx] === 0).length === 1) dead.push([x, y]);
      for (const [x, y] of dead) if (rng.next() < ratio) {
        const options = [[2, 0], [-2, 0], [0, 2], [0, -2]].filter(([dx, dy]) => x + dx > 0 && y + dy > 0 && x + dx < width - 1 && y + dy < height - 1 && grid[y + dy][x + dx] === 0 && grid[y + dy / 2][x + dx / 2] === 1);
        if (options.length) {
          const [dx, dy] = options[Math.floor(rng.next() * options.length)];
          grid[y + dy / 2][x + dx / 2] = 0;
        }
      }
    }
  };

  // src/plugins/pacman/planner/GhostPlanner.js
  var DIRS = [["UP", 0, -1], ["DOWN", 0, 1], ["LEFT", -1, 0], ["RIGHT", 1, 0]];
  var OPPOSITE = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
  var GhostPlanner = class {
    constructor(rng) {
      this.rng = rng;
      this.memory = /* @__PURE__ */ new Map();
    }
    recommend(engine2, ghost) {
      const world = engine2.ontology, player = world.query({ type: "Player" })[0], maze = world.query({ type: "Maze" })[0], power = player.powerTicks > 0;
      const mem = this.memory.get(ghost.id) || { visits: {}, roamTarget: null, roamTicks: 0, lastDirection: null };
      if (!mem.roamTarget || mem.roamTicks <= 0 || ghost.x === mem.roamTarget.x && ghost.y === mem.roamTarget.y) {
        const cells = [];
        for (let y = 1; y < maze.height - 1; y++) for (let x = 1; x < maze.width - 1; x++) if (maze.grid[y][x] === 0) cells.push({ x, y });
        mem.roamTarget = cells[Math.floor(this.rng.next() * cells.length)];
        mem.roamTicks = 24 + Math.floor(this.rng.next() * 28);
      }
      const candidates = DIRS.filter(([, dx, dy]) => maze.grid[ghost.y + dy]?.[ghost.x + dx] === 0).map(([direction2, dx, dy]) => {
        const nx = ghost.x + dx, ny = ghost.y + dy, playerDist = Math.abs(nx - player.x) + Math.abs(ny - player.y), roamDist = Math.abs(nx - mem.roamTarget.x) + Math.abs(ny - mem.roamTarget.y), exits = DIRS.filter(([, a, b]) => maze.grid[ny + b]?.[nx + a] === 0).length, visits = mem.visits[`${nx},${ny}`] || 0;
        const pursue = power ? playerDist : -playerDist * 0.7, score = pursue - roamDist * 0.42 + exits * 0.7 - visits * 1.8 + this.rng.next() * 1.5;
        return { direction: direction2, score, weight: Math.exp(score * 0.42), nx, ny };
      });
      const usable = candidates.length > 1 ? candidates.map((c) => ({ ...c, weight: c.weight * (OPPOSITE[mem.lastDirection] === c.direction ? 0.18 : 1) })) : candidates;
      const direction = this.rng.pickWeighted(usable.map((c) => ({ value: c.direction, weight: c.weight }))), chosen = usable.find((c) => c.direction === direction);
      mem.lastDirection = direction;
      mem.roamTicks--;
      if (chosen) mem.visits[`${chosen.nx},${chosen.ny}`] = (mem.visits[`${chosen.nx},${chosen.ny}`] || 0) + 1;
      if (Object.keys(mem.visits).length > 80) for (const k of Object.keys(mem.visits)) mem.visits[k] *= 0.6;
      this.memory.set(ghost.id, mem);
      return { action: { type: "moveGhost", id: ghost.id, direction }, candidates, reason: power ? "evade + roam across maze" : "pursue + anti-loop roaming" };
    }
  };

  // src/plugins/pacman/planner/MonteCarloPlanner.js
  var DIRS2 = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] };
  var key = (x, y) => `${x},${y}`;
  var parts = () => ({ food: 0, escape: 0, danger: 0, revisit: 0, time: 0, completion: 0 });
  var DEFAULT_WEIGHTS = Object.freeze({ food: 1, targetFood: 1, escape: 1, danger: 1, revisit: 1, time: 1, completion: 1, foodBias: 1, escapeBias: 1, adjacentFood: 1, pathGuide: 1, repeatAvoidance: 1 });
  var MonteCarloPlanner = class _MonteCarloPlanner {
    constructor(rng, { rollouts = 96, depth = 22, weights = {} } = {}) {
      this.rng = rng;
      this.rollouts = rollouts;
      this.depth = depth;
      this.weights = { ...DEFAULT_WEIGHTS, ..._MonteCarloPlanner.activeWeights, ...weights };
      this.transposition = /* @__PURE__ */ new Map();
      this.cacheHits = 0;
    }
    recommend(engine2, { targetKeys = /* @__PURE__ */ new Set() } = {}) {
      const root = engine2.ontology, maze = root.query({ type: "Maze" })[0], p = root.query({ type: "Player" })[0], legal = this.legal(maze, p.x, p.y).map((x) => x.direction), rootKey = this.worldKey(root), prior = this.transposition.get(rootKey), stats = new Map(legal.map((d) => {
        const old = prior?.[d];
        if (old) {
          this.cacheHits++;
          const n = Math.min(old.visits, 12), components = Object.fromEntries(Object.entries(old.average || parts()).map(([k, v]) => [k, v * n]));
          return [d, { direction: d, visits: n, total: old.mean * n, safe: old.safety * n, collisions: (1 - old.safety) * n, best: old.best, outcomes: old.outcomes.slice(-12), components }];
        }
        return [d, { direction: d, visits: 0, total: 0, safe: 0, collisions: 0, best: -Infinity, outcomes: [], components: parts() }];
      })), trail = [];
      for (let i = 0; i < this.rollouts; i++) {
        const unexplored = legal.find((d) => !stats.get(d).visits), direction = unexplored || this.selectUCB(stats, i + 1), world = root.clone({ includeEvents: false, shareTypes: ["Maze", "TopologyModel", "JunctionNetwork", "CorridorNetwork", "BottleneckSet", "Zone"] }), result = this.rollout(world, direction, targetKeys), s = stats.get(direction);
        s.visits++;
        s.total += result.reward;
        s.outcomes.push(result.reward);
        s.safe += result.safe ? 1 : 0;
        s.collisions += result.safe ? 0 : 1;
        s.best = Math.max(s.best, result.reward);
        for (const k of Object.keys(s.components)) s.components[k] += result.components[k];
        if (i < 12 || i % 8 === 7 || i === this.rollouts - 1) trail.push({ iteration: i + 1, chosen: direction, reward: result.reward, leader: this.leader(stats) });
      }
      const plans = [...stats.values()].map((s) => ({ ...s, score: s.total / s.visits, cvar: this.cvar(s.outcomes, 0.2), safety: s.safe / s.visits, confidence: s.visits / (this.rollouts + (prior ? Math.min(12, s.visits) : 0)), average: Object.fromEntries(Object.entries(s.components).map(([k, v]) => [k, v / s.visits])) })).sort((a, b) => b.safety - a.safety || b.cvar - a.cvar || b.score - a.score), explanation = this.explain(plans[0], plans[1]);
      this.transposition.set(rootKey, Object.fromEntries(plans.map((p2) => [p2.direction, { visits: p2.visits, mean: p2.score, safety: p2.safety, best: p2.best, outcomes: p2.outcomes.slice(-20), average: p2.average }])));
      if (this.transposition.size > 400) this.transposition.delete(this.transposition.keys().next().value);
      return { direction: plans[0]?.direction || legal[0], plans, trail, simulations: this.rollouts, depth: this.depth, explanation, cacheHits: this.cacheHits, tableSize: this.transposition.size };
    }
    worldKey(world) {
      const p = world.query({ type: "Player" })[0], g = world.query({ type: "Ghost" }).map((x) => `${x.x},${x.y}`).join("|"), foods = world.query({ where: (o) => o.type === "Pellet" || o.type === "PowerPellet" });
      let hash = 2166136261;
      for (const f of foods) {
        hash ^= f.x * 31 + f.y;
        hash = Math.imul(hash, 16777619);
      }
      return `${p.x},${p.y}/${g}/${foods.length}/${hash >>> 0}`;
    }
    legal(maze, x, y) {
      return Object.entries(DIRS2).filter(([, [dx, dy]]) => maze.grid[y + dy]?.[x + dx] === 0).map(([direction, [dx, dy]]) => ({ direction, x: x + dx, y: y + dy }));
    }
    selectUCB(stats, total) {
      return [...stats.values()].sort((a, b) => this.ucb(b, total) - this.ucb(a, total))[0].direction;
    }
    ucb(s, total) {
      const collisionRisk = s.collisions / s.visits;
      return s.total / s.visits - collisionRisk * 25e4 + 2.1 * Math.sqrt(Math.log(total) / s.visits);
    }
    cvar(outcomes, ratio) {
      const sorted = [...outcomes].sort((a, b) => a - b), n = Math.max(1, Math.ceil(sorted.length * ratio));
      return sorted.slice(0, n).reduce((a, b) => a + b, 0) / n;
    }
    leader(stats) {
      return [...stats.values()].filter((s) => s.visits).sort((a, b) => b.safe / b.visits - a.safe / a.visits || b.total / b.visits - a.total / a.visits)[0]?.direction || "\u2014";
    }
    explain(best, next) {
      if (!best) return "\uC774\uB3D9 \uAC00\uB2A5\uD55C \uBC29\uD5A5\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.";
      const a = best.average, why = [];
      if (best.safety === 1) why.push("\uBAA8\uB4E0 \uD45C\uBCF8\uC5D0\uC11C \uCDA9\uB3CC \uC5C6\uC74C");
      else why.push(`\uC0DD\uC874\uC728 ${(best.safety * 100).toFixed(0)}%`);
      why.push(`\uCD5C\uC545 20% \uAE30\uB300\uAC12 ${best.cvar.toFixed(0)}`);
      if (a.food > Math.max(8, Math.abs(a.escape))) why.push("\uBA39\uC774 \uD68D\uB4DD \uD6A8\uC728 \uC6B0\uC138");
      if (a.escape > 8) why.push("\uACE0\uC2A4\uD2B8\uC640 \uAC70\uB9AC \uD655\uBCF4");
      const gap = next ? `\uCC28\uC120\uBCF4\uB2E4 CVaR ${(best.cvar - next.cvar).toFixed(0)}, \uD3C9\uADE0 ${(best.score - next.score).toFixed(0)} \uC6B0\uC138` : "\uC720\uC77C\uD55C \uC774\uB3D9 \uBC29\uD5A5";
      return `${best.direction} \uC120\uD0DD: ${why.join(" \xB7 ")}. ${gap}.`;
    }
    rollout(world, firstDirection, targetKeys) {
      const maze = world.query({ type: "Maze" })[0], player = world.query({ type: "Player" })[0], ghosts = world.query({ type: "Ghost" }).map((g) => ({ ...g })), foods = new Set(world.query({ where: (o) => o.type === "Pellet" || o.type === "PowerPellet" }).map((f) => key(f.x, f.y)));
      let px = player.x, py = player.y, direction = firstDirection, reward = 0, visited = /* @__PURE__ */ new Map(), components = parts();
      for (let depth = 0; depth < this.depth; depth++) {
        const oldP = { x: px, y: py }, oldGhosts = ghosts.map((g) => ({ x: g.x, y: g.y })), [dx, dy] = DIRS2[direction];
        px += dx;
        py += dy;
        const ghostNext = ghosts.map((g) => this.simulateGhostMove(maze, g, oldP));
        for (let i = 0; i < ghosts.length; i++) {
          ghosts[i].x = ghostNext[i].x;
          ghosts[i].y = ghostNext[i].y;
        }
        const collision = ghosts.some((g, i) => g.x === px && g.y === py || oldGhosts[i].x === px && oldGhosts[i].y === py && g.x === oldP.x && g.y === oldP.y);
        if (collision) return { reward: -1e6 - depth * 1e3, safe: false, components };
        const time = -2 * this.weights.time;
        reward += time;
        components.time += time;
        const k = key(px, py);
        visited.set(k, (visited.get(k) || 0) + 1);
        if (foods.delete(k)) {
          const v = 40 * this.weights.food + (this.depth - depth) * 3 * this.weights.food + (targetKeys.has(k) ? 35 * this.weights.targetFood : 0);
          reward += v;
          components.food += v;
        }
        if (!foods.size) {
          const v = (2e3 - depth * 20) * this.weights.completion;
          components.completion += v;
          return { reward: reward + v, safe: true, components };
        }
        const oldNear = Math.min(...oldGhosts.map((g) => Math.abs(g.x - oldP.x) + Math.abs(g.y - oldP.y))), near = Math.min(...ghosts.map((g) => Math.abs(g.x - px) + Math.abs(g.y - py)));
        if (near <= 5) {
          const escape = (near - oldNear) * 32 * this.weights.escape, danger = -Math.pow(6 - near, 2) * 9 * this.weights.danger;
          reward += escape + danger;
          components.escape += escape;
          components.danger += danger;
        }
        const revisit = -(visited.get(k) - 1) * 9 * this.weights.revisit;
        reward += revisit;
        components.revisit += revisit;
        const moves = this.legal(maze, px, py);
        if (!moves.length) break;
        const weighted = moves.map((m) => {
          const futureNear = Math.min(...ghosts.map((g) => Math.abs(g.x - m.x) + Math.abs(g.y - m.y))), escape = near <= 5 ? (futureNear - near) * 12 * this.weights.escapeBias : 0;
          return { value: m.direction, weight: Math.max(0.05, 1 + (foods.has(key(m.x, m.y)) ? 9 * this.weights.foodBias : 0) + escape + futureNear * 0.8 - (visited.get(key(m.x, m.y)) || 0) * 3 * this.weights.revisit) };
        });
        direction = this.rng.pickWeighted(weighted);
      }
      const remaining = -foods.size * 0.08 * this.weights.food;
      return { reward: reward + remaining, safe: true, components };
    }
    simulateGhostMove(maze, ghost, player) {
      const moves = this.legal(maze, ghost.x, ghost.y);
      if (!moves.length) return { x: ghost.x, y: ghost.y };
      return this.rng.pickWeighted(moves.map((m) => ({ value: m, weight: Math.exp(-(Math.abs(m.x - player.x) + Math.abs(m.y - player.y)) * 0.48) + 0.12 })));
    }
  };

  // src/plugins/pacman/planner/SafetyAnalyzer.js
  var DIRS3 = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] };
  var MOVES = Object.values(DIRS3);
  var key2 = (x, y) => `${x},${y}`;
  var SafetyAnalyzer = class {
    analyze(ontology, direction, horizon = 10) {
      const maze = ontology.query({ type: "Maze" })[0], p = ontology.query({ type: "Player" })[0], [dx, dy] = DIRS3[direction], start = { x: p.x + dx, y: p.y + dy }, shared = ontology.objects.get("threat-field")?.ghostArrival, ghostArrival = shared || Object.fromEntries(this.ghostArrivalMap(ontology, maze)), topology = ontology.objects.get("topology"), firstDanger = ghostArrival[key2(start.x, start.y)] ?? Infinity;
      if (firstDanger <= 1) return { direction, survival: 0, safeArea: 0, junctions: 0, minGhost: firstDanger, score: -1e5 };
      let frontier = [start], seen = /* @__PURE__ */ new Set([key2(start.x, start.y)]), junctions = 0, survival = 1;
      for (let t = 2; t <= horizon; t++) {
        const next = /* @__PURE__ */ new Map();
        for (const pos of frontier) for (const [mx, my] of MOVES) {
          const x = pos.x + mx, y = pos.y + my, k = key2(x, y), arrival = ghostArrival[k] ?? Infinity;
          if (maze.grid[y]?.[x] !== 0 || arrival <= t) continue;
          next.set(k, { x, y });
          seen.add(k);
        }
        frontier = [...next.values()];
        if (!frontier.length) break;
        survival = t;
        for (const pos of frontier) {
          const k = key2(pos.x, pos.y), isJunction = topology?.kindByCell?.[k] === "junction";
          if (isJunction) junctions++;
        }
      }
      const minGhost = Math.min(...ontology.query({ type: "Ghost" }).map((g) => Math.abs(g.x - start.x) + Math.abs(g.y - start.y))), startKey = key2(start.x, start.y), startKind = topology?.kindByCell?.[startKey] || "unknown", bottlenecks = new Set((topology?.bottlenecks || []).map((b) => key2(b.x, b.y))), bottleneckAhead = [...seen].some((k) => bottlenecks.has(k)), trapRisk = (startKind === "corridor" && junctions === 0 ? 2 : 0) + (bottleneckAhead ? 2 : 0), score = survival * 1e3 + seen.size * 8 + junctions * 3 + minGhost * 5 - trapRisk * 250;
      return { direction, survival, safeArea: seen.size, junctions, minGhost, startKind, bottleneckAhead, trapRisk, score };
    }
    ghostArrivalMap(ontology, maze) {
      const dist = /* @__PURE__ */ new Map(), queue = ontology.query({ type: "Ghost" }).map((g) => ({ x: g.x, y: g.y, d: 0 }));
      for (const g of queue) dist.set(key2(g.x, g.y), 0);
      for (let i = 0; i < queue.length; i++) {
        const cur = queue[i];
        for (const [dx, dy] of MOVES) {
          const x = cur.x + dx, y = cur.y + dy, k = key2(x, y);
          if (maze.grid[y]?.[x] !== 0 || dist.has(k)) continue;
          dist.set(k, cur.d + 1);
          queue.push({ x, y, d: cur.d + 1 });
        }
      }
      return dist;
    }
  };

  // src/plugins/pacman/planner/FoodClusterPlanner.js
  var MOVES2 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  var key3 = (x, y) => `${x},${y}`;
  var FoodClusterPlanner = class {
    select(ontology) {
      const maze = ontology.query({ type: "Maze" })[0], player = ontology.query({ type: "Player" })[0], foods = ontology.query({ where: (o) => o.type === "Pellet" || o.type === "PowerPellet" }), ghosts = ontology.query({ type: "Ghost" }), field = ontology.objects.get("threat-field"), distance = field?.playerArrival ? new Map(Object.entries(field.playerArrival)) : this.distanceMap(maze, player), groups = /* @__PURE__ */ new Map();
      for (const f of foods) {
        const id = `${Math.floor(f.x / 5)},${Math.floor(f.y / 5)}`;
        if (!groups.has(id)) groups.set(id, []);
        groups.get(id).push(f);
      }
      const topology = ontology.objects.get("topology"), clusters = [...groups.entries()].map(([id, items]) => {
        const reachable = items.map((f) => distance.get(key3(f.x, f.y)) ?? 999), travel = Math.min(...reachable), ghostMargin = Math.min(...items.map((f) => (field?.ghostArrival?.[key3(f.x, f.y)] ?? Math.min(...ghosts.map((g) => Math.abs(g.x - f.x) + Math.abs(g.y - f.y)))) - (distance.get(key3(f.x, f.y)) ?? 999))), junctions = items.filter((f) => topology?.kindByCell?.[key3(f.x, f.y)] === "junction").length, density = items.length / (travel + 1), safe = ghostMargin > 1, utility = (safe ? 5e3 : 0) + Math.min(ghostMargin, 10) * 90 + junctions * 45 + density * 120 - travel * 8;
        return { id, items, count: items.length, travel, ghostMargin, junctions, density, utility, safe };
      }).filter((c) => c.travel < 999).sort((a, b) => b.safe - a.safe || b.utility - a.utility), selected = clusters[0];
      const safeSelected = clusters.find((c) => c.safe);
      return { selected: safeSelected || null, clusters, targetKeys: new Set((safeSelected?.items || []).map((f) => key3(f.x, f.y))), explanation: safeSelected ? `\uBAA9\uD45C \uAD6C\uC5ED ${safeSelected.id}: \uBA39\uC774 ${safeSelected.count}\uAC1C, \uB3C4\uCC29 ${safeSelected.travel}\uD2F1, \uACE0\uC2A4\uD2B8 \uB3C4\uCC29 \uC5EC\uC720 ${safeSelected.ghostMargin}\uD2F1, \uD0C8\uCD9C \uAD50\uCC28\uB85C ${safeSelected.junctions}\uAC1C.` : "\uC548\uC804\uD55C \uBA39\uC774 \uAD6C\uC5ED\uC774 \uC5C6\uC5B4 \uC774\uBC88 \uD2F1\uC740 \uBA39\uC774\uBCF4\uB2E4 \uD0C8\uCD9C\uACFC \uC0DD\uC874\uC744 \uC6B0\uC120\uD569\uB2C8\uB2E4." };
    }
    distanceMap(maze, start) {
      const dist = /* @__PURE__ */ new Map([[key3(start.x, start.y), 0]]), q = [{ x: start.x, y: start.y }];
      for (let i = 0; i < q.length; i++) {
        const p = q[i], d = dist.get(key3(p.x, p.y));
        for (const [dx, dy] of MOVES2) {
          const x = p.x + dx, y = p.y + dy, k = key3(x, y);
          if (maze.grid[y]?.[x] !== 0 || dist.has(k)) continue;
          dist.set(k, d + 1);
          q.push({ x, y });
        }
      }
      return dist;
    }
  };

  // src/plugins/pacman/planner/ExactFoodPathPlanner.js
  var MOVES3 = [["UP", 0, -1], ["DOWN", 0, 1], ["LEFT", -1, 0], ["RIGHT", 1, 0]];
  var key4 = (x, y) => `${x},${y}`;
  var ExactFoodPathPlanner = class {
    plan(ontology, { targetKeys = /* @__PURE__ */ new Set(), recentKeys = [], preferredId = null } = {}) {
      const maze = ontology.query({ type: "Maze" })[0], player = ontology.query({ type: "Player" })[0], all = ontology.query({ where: (o) => o.type === "Pellet" || o.type === "PowerPellet" }), remaining = all.length, candidates = remaining <= 5 ? all : all.filter((f) => targetKeys.has(key4(f.x, f.y))), preferred = candidates.find((f) => f.id === preferredId), targets = preferred ? [preferred] : candidates;
      if (!targets.length) return { target: null, path: [], direction: null, distance: Infinity, remaining };
      const targetMap = new Map(targets.map((f) => [key4(f.x, f.y), f])), ghosts = ontology.query({ type: "Ghost" }), field = ontology.objects.get("threat-field"), recentCount = new Map(recentKeys.map((k) => [k, recentKeys.filter((x) => x === k).length])), startKey = key4(player.x, player.y), cost = /* @__PURE__ */ new Map([[startKey, 0]]), previous = /* @__PURE__ */ new Map(), queue = [{ x: player.x, y: player.y, cost: 0 }];
      let goal = null;
      while (queue.length) {
        queue.sort((a, b) => a.cost - b.cost);
        const cur = queue.shift(), ck = key4(cur.x, cur.y);
        if (cur.cost !== cost.get(ck)) continue;
        if (targetMap.has(ck)) {
          goal = cur;
          break;
        }
        for (const [direction, dx, dy] of MOVES3) {
          const x = cur.x + dx, y = cur.y + dy, k = key4(x, y);
          if (maze.grid[y]?.[x] !== 0) continue;
          const ghostDistance = field?.ghostArrival?.[k] ?? Math.min(...ghosts.map((g) => Math.abs(g.x - x) + Math.abs(g.y - y))), danger = Math.max(0, 6 - ghostDistance) * 2.8, repeat = (recentCount.get(k) || 0) * 5, next = cur.cost + 1 + danger + repeat;
          if (next < (cost.get(k) ?? Infinity)) {
            cost.set(k, next);
            previous.set(k, { from: ck, direction, x, y });
            queue.push({ x, y, cost: next });
          }
        }
      }
      if (!goal) return { target: null, path: [], direction: null, distance: Infinity, remaining };
      const path = [];
      let cursor = key4(goal.x, goal.y);
      while (cursor !== startKey) {
        const step = previous.get(cursor);
        if (!step) break;
        path.unshift({ direction: step.direction, x: step.x, y: step.y });
        cursor = step.from;
      }
      return { target: targetMap.get(key4(goal.x, goal.y)), path, direction: path[0]?.direction || null, distance: path.length, cost: goal.cost, remaining, mode: remaining <= 5 ? "FINAL PELLET HUNT" : "CLUSTER TARGET" };
    }
  };

  // src/plugins/pacman/planner/RobustSafetyAnalyzer.js
  var DIRS4 = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0], STAY: [0, 0] };
  var MOVES4 = Object.entries(DIRS4).filter(([d]) => d !== "STAY");
  var RobustSafetyAnalyzer = class {
    evaluate(ontology, playerDirection) {
      const maze = ontology.query({ type: "Maze" })[0], p = ontology.query({ type: "Player" })[0], [dx, dy] = DIRS4[playerDirection], next = { x: p.x + dx, y: p.y + dy };
      if (maze.grid[next.y]?.[next.x] !== 0) return { robustSafe: false, collisionRisk: 1, threateningGhosts: [], possibleResponses: 0 };
      let survivalProbability = 1, possibleResponses = 1;
      const threateningGhosts = [];
      for (const g of ontology.query({ type: "Ghost" })) {
        const legal = MOVES4.filter(([, [gx, gy]]) => maze.grid[g.y + gy]?.[g.x + gx] === 0), colliding = legal.filter(([, [gx, gy]]) => {
          const gn = { x: g.x + gx, y: g.y + gy };
          return gn.x === next.x && gn.y === next.y || g.x === next.x && g.y === next.y && gn.x === p.x && gn.y === p.y;
        });
        const risk = legal.length ? colliding.length / legal.length : 0;
        possibleResponses *= Math.max(1, legal.length);
        survivalProbability *= 1 - risk;
        if (colliding.length) threateningGhosts.push({ id: g.id, colliding: colliding.map((x) => x[0]), legal: legal.map((x) => x[0]), risk });
      }
      return { robustSafe: threateningGhosts.length === 0, collisionRisk: 1 - survivalProbability, threateningGhosts, possibleResponses };
    }
  };

  // src/plugins/pacman/planner/MacroActionPlanner.js
  var MacroActionPlanner = class {
    create({ exact, selectedPlan, foodTarget }) {
      if (!selectedPlan) return { type: "SURVIVE", label: "Find any survivable move", path: [] };
      if (exact?.target) {
        const final = exact.mode === "FINAL PELLET HUNT";
        return { type: final ? "HUNT_FINAL_PELLET" : "GO_TO_FOOD", label: `${final ? "Final hunt" : "Food route"} \u2192 ${exact.target.id}`, targetId: exact.target.id, path: exact.path.map((p) => p.direction), remaining: exact.distance };
      }
      if (selectedPlan.strategic?.junctions > 0) return { type: "ESCAPE_TO_JUNCTION", label: "Move toward a safe junction", path: [selectedPlan.direction] };
      return { type: "EXPAND_SAFE_AREA", label: `Expand safe area${foodTarget ? ` near zone ${foodTarget.id}` : ""}`, path: [selectedPlan.direction] };
    }
  };

  // src/plugins/pacman/planner/ConstrainedProgressPlanner.js
  var MOVES5 = [["UP", 0, -1], ["DOWN", 0, 1], ["LEFT", -1, 0], ["RIGHT", 1, 0]];
  var key5 = (x, y) => `${x},${y}`;
  var ConstrainedProgressPlanner = class {
    constructor({ horizon = 12, detourBudget = 6 } = {}) {
      this.horizon = horizon;
      this.detourBudget = detourBudget;
      this.reset();
    }
    reset() {
      this.goalId = null;
      this.lastDistance = Infinity;
      this.stagnation = 0;
      this.replans = 0;
      this.stateActions = /* @__PURE__ */ new Map();
      this.lastDecision = null;
    }
    recommend(ontology, plans, proposedTarget) {
      const foods = ontology.query({ where: (object) => object.type === "Pellet" || object.type === "PowerPellet" });
      const player = ontology.query({ type: "Player" })[0];
      let goal = foods.find((food) => food.id === this.goalId);
      if (!goal) goal = proposedTarget && foods.find((food) => food.id === proposedTarget.id);
      if (!goal) goal = this.closestFood(ontology, foods);
      if (!goal) return { selected: plans[0], mode: "COMPLETE", goal: null, path: [], progress: 0 };
      if (goal.id !== this.goalId) {
        this.goalId = goal.id;
        this.lastDistance = Infinity;
        this.stagnation = 0;
      }
      let route = this.timeExpandedPath(ontology, goal);
      const distance = route.length || this.staticDistance(ontology, player, goal);
      if (distance < this.lastDistance) this.stagnation = 0;
      else if (Number.isFinite(this.lastDistance)) this.stagnation++;
      this.lastDistance = distance;
      if ((!route.length || this.stagnation > this.detourBudget) && foods.length > 1) {
        const alternatives = foods.filter((food) => food.id !== goal.id).map((food) => ({ food, path: this.timeExpandedPath(ontology, food) })).filter((item) => item.path.length).sort((a, b) => a.path.length - b.path.length);
        if (alternatives.length) {
          goal = alternatives[0].food;
          route = alternatives[0].path;
          this.goalId = goal.id;
          this.lastDistance = route.length;
          this.stagnation = 0;
          this.replans++;
        }
      }
      const viable = plans.filter((plan) => plan.robust.robustSafe && plan.strategic.survival >= Math.max(2, Math.max(...plans.map((item) => item.strategic.survival)) - 1));
      const adjacentFood = viable.find((plan) => foods.some((food) => food.x === player.x + this.delta(plan.direction)[0] && food.y === player.y + this.delta(plan.direction)[1]));
      const routePlan = viable.find((plan) => plan.direction === route[0]?.direction);
      const stateKey = `${player.x},${player.y}/${this.goalId}/${foods.length}`;
      const allowed = (plan) => !this.isTabu(stateKey, plan.direction) || viable.length === 1;
      let selected = [adjacentFood, routePlan, ...viable, ...plans].find((plan) => plan && allowed(plan)) || plans[0];
      const mode = adjacentFood === selected ? "SAFE_ADJACENT_FOOD" : routePlan === selected ? "PERSISTENT_ROUTE" : viable.includes(selected) ? "SAFE_DETOUR" : "NO_GUARANTEE";
      this.remember(stateKey, selected.direction);
      this.lastDecision = { mode, goalId: goal.id, goal: { x: goal.x, y: goal.y }, path: route.slice(0, this.horizon), distance, stagnation: this.stagnation, detourBudget: this.detourBudget, replans: this.replans, tabuRecords: this.stateActions.size, viableDirections: viable.map((plan) => plan.direction), selectedDirection: selected.direction };
      return { selected, ...this.lastDecision };
    }
    timeExpandedPath(ontology, target) {
      const maze = ontology.query({ type: "Maze" })[0];
      const player = ontology.query({ type: "Player" })[0];
      const reachable = ontology.objects.get("threat-field")?.ghostReachableSets || [];
      const queue = [{ x: player.x, y: player.y, tick: 0, path: [] }];
      const seen = /* @__PURE__ */ new Set([`${player.x},${player.y},0`]);
      for (let index = 0; index < queue.length; index++) {
        const current = queue[index];
        if (current.x === target.x && current.y === target.y) return current.path;
        if (current.tick >= this.horizon) continue;
        const nextTick = current.tick + 1;
        const threats = new Set(reachable[Math.min(nextTick, reachable.length - 1)] || []);
        for (const [direction, dx, dy] of MOVES5) {
          const x = current.x + dx, y = current.y + dy, state = `${x},${y},${nextTick}`;
          if (maze.grid[y]?.[x] !== 0 || threats.has(key5(x, y)) || seen.has(state)) continue;
          seen.add(state);
          queue.push({ x, y, tick: nextTick, path: [...current.path, { direction, x, y, tick: nextTick }] });
        }
      }
      return [];
    }
    closestFood(ontology, foods) {
      const player = ontology.query({ type: "Player" })[0];
      return [...foods].sort((a, b) => Math.abs(a.x - player.x) + Math.abs(a.y - player.y) - Math.abs(b.x - player.x) - Math.abs(b.y - player.y))[0];
    }
    staticDistance(ontology, start, target) {
      const maze = ontology.query({ type: "Maze" })[0], queue = [{ x: start.x, y: start.y, d: 0 }], seen = /* @__PURE__ */ new Set([key5(start.x, start.y)]);
      for (let index = 0; index < queue.length; index++) {
        const current = queue[index];
        if (current.x === target.x && current.y === target.y) return current.d;
        for (const [, dx, dy] of MOVES5) {
          const x = current.x + dx, y = current.y + dy, k = key5(x, y);
          if (maze.grid[y]?.[x] !== 0 || seen.has(k)) continue;
          seen.add(k);
          queue.push({ x, y, d: current.d + 1 });
        }
      }
      return Infinity;
    }
    delta(direction) {
      const move = MOVES5.find((item) => item[0] === direction);
      return move ? [move[1], move[2]] : [0, 0];
    }
    isTabu(state, direction) {
      return (this.stateActions.get(state)?.get(direction) || 0) >= 2;
    }
    remember(state, direction) {
      if (!this.stateActions.has(state)) this.stateActions.set(state, /* @__PURE__ */ new Map());
      const actions = this.stateActions.get(state);
      actions.set(direction, (actions.get(direction) || 0) + 1);
      if (this.stateActions.size > 80) this.stateActions.delete(this.stateActions.keys().next().value);
    }
  };

  // src/engine/semantic/MazeTopologyIndex.js
  var MOVES6 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  var key6 = (x, y) => `${x},${y}`;
  var MazeTopologyIndex = class {
    build(maze) {
      const cells = [], degree = /* @__PURE__ */ new Map();
      for (let y = 1; y < maze.height - 1; y++) for (let x = 1; x < maze.width - 1; x++) if (maze.grid[y][x] === 0) {
        const d = MOVES6.filter(([dx, dy]) => maze.grid[y + dy]?.[x + dx] === 0).length;
        cells.push({ x, y });
        degree.set(key6(x, y), d);
      }
      const junctions = cells.filter((c) => degree.get(key6(c.x, c.y)) >= 3), bottlenecks = this.articulationPoints(maze, cells), corridors = this.corridorComponents(maze, cells, degree), zones = this.zonesWithoutBottlenecks(maze, cells, new Set(bottlenecks.map((c) => key6(c.x, c.y))));
      return { kindByCell: Object.fromEntries(cells.map((c) => {
        const k = key6(c.x, c.y), d = degree.get(k);
        return [k, d >= 3 ? "junction" : d === 2 ? "corridor" : "endpoint"];
      })), degreeByCell: Object.fromEntries(degree), junctions, bottlenecks, corridors, zones, counts: { walkable: cells.length, junctions: junctions.length, corridors: corridors.length, zones: zones.length, bottlenecks: bottlenecks.length } };
    }
    articulationPoints(maze, cells) {
      const disc = /* @__PURE__ */ new Map(), low = /* @__PURE__ */ new Map(), parent = /* @__PURE__ */ new Map(), points = /* @__PURE__ */ new Set();
      let time = 0;
      const dfs = (x, y) => {
        const k = key6(x, y);
        disc.set(k, ++time);
        low.set(k, time);
        let children = 0;
        for (const [dx, dy] of MOVES6) {
          const nx = x + dx, ny = y + dy, nk = key6(nx, ny);
          if (maze.grid[ny]?.[nx] !== 0) continue;
          if (!disc.has(nk)) {
            children++;
            parent.set(nk, k);
            dfs(nx, ny);
            low.set(k, Math.min(low.get(k), low.get(nk)));
            if (!parent.has(k) && children > 1) points.add(k);
            if (parent.has(k) && low.get(nk) >= disc.get(k)) points.add(k);
          } else if (parent.get(k) !== nk) low.set(k, Math.min(low.get(k), disc.get(nk)));
        }
      };
      if (cells[0]) dfs(cells[0].x, cells[0].y);
      return [...points].map((k) => {
        const [x, y] = k.split(",").map(Number);
        return { x, y };
      });
    }
    corridorComponents(maze, cells, degree) {
      const corridor = new Set(cells.filter((c) => degree.get(key6(c.x, c.y)) === 2).map((c) => key6(c.x, c.y))), seen = /* @__PURE__ */ new Set(), result = [];
      for (const start of corridor) if (!seen.has(start)) {
        const q = [start], members = [];
        seen.add(start);
        for (let i = 0; i < q.length; i++) {
          const k = q[i], [x, y] = k.split(",").map(Number);
          members.push({ x, y });
          for (const [dx, dy] of MOVES6) {
            const nk = key6(x + dx, y + dy);
            if (corridor.has(nk) && !seen.has(nk)) {
              seen.add(nk);
              q.push(nk);
            }
          }
        }
        result.push({ id: `corridor-${result.length + 1}`, length: members.length, cells: members });
      }
      return result;
    }
    zonesWithoutBottlenecks(maze, cells, blocked) {
      const seen = /* @__PURE__ */ new Set(), result = [];
      for (const c of cells) {
        const start = key6(c.x, c.y);
        if (blocked.has(start) || seen.has(start)) continue;
        const q = [c], members = [];
        seen.add(start);
        for (let i = 0; i < q.length; i++) {
          const p = q[i];
          members.push(p);
          for (const [dx, dy] of MOVES6) {
            const x = p.x + dx, y = p.y + dy, k = key6(x, y);
            if (maze.grid[y]?.[x] === 0 && !blocked.has(k) && !seen.has(k)) {
              seen.add(k);
              q.push({ x, y });
            }
          }
        }
        result.push({ id: `zone-${result.length + 1}`, size: members.length, cells: members });
      }
      return result;
    }
  };

  // src/engine/semantic/SemanticAnalysisService.js
  var MOVES7 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  var key7 = (x, y) => `${x},${y}`;
  var SemanticAnalysisService = class {
    install(ontology, maze) {
      const topology = new MazeTopologyIndex().build(maze);
      ontology.createObject("TopologyModel", { ...topology }, "topology");
      ontology.createRelationship("describes", "topology", "maze");
      ontology.createObject("JunctionNetwork", { count: topology.counts.junctions }, "junction-network");
      ontology.createObject("CorridorNetwork", { count: topology.counts.corridors }, "corridor-network");
      ontology.createObject("BottleneckSet", { count: topology.counts.bottlenecks }, "bottleneck-set");
      ontology.createRelationship("contains", "topology", "junction-network");
      ontology.createRelationship("contains", "topology", "corridor-network");
      ontology.createRelationship("contains", "topology", "bottleneck-set");
      for (const z of topology.zones) ontology.createObject("Zone", { size: z.size, cellKeys: z.cells.map((c) => key7(c.x, c.y)) }, z.id);
      for (const z of topology.zones) ontology.createRelationship("contains", "topology", z.id);
      ontology.createObject("ThreatField", { tick: -1, ghostArrival: {}, playerArrival: {}, safetyMargin: {}, safeCellCount: 0, safeZoneCount: 0 }, "threat-field");
      ontology.createObject("SafeZoneSummary", { count: 0, largestSize: 0 }, "safe-zone-summary");
      ontology.createObject("EscapeRouteSummary", { count: 0 }, "escape-route-summary");
      ontology.createObject("FoodClusterSummary", { count: 0, remainingFood: 0 }, "food-cluster-summary");
      ontology.createRelationship("derivedFrom", "threat-field", "maze");
      ontology.createRelationship("produces", "threat-field", "safe-zone-summary");
      ontology.createRelationship("produces", "threat-field", "escape-route-summary");
      ontology.createRelationship("informs", "threat-field", "food-cluster-summary");
      return topology;
    }
    update(ontology, tick) {
      const maze = ontology.query({ type: "Maze" })[0], player = ontology.query({ type: "Player" })[0], ghosts = ontology.query({ type: "Ghost" }), ghostArrival = this.multiSourceDistance(maze, ghosts), playerArrival = this.multiSourceDistance(maze, [player]), safetyMargin = {}, ghostReachableSets = this.reachableSets(maze, ghosts, Math.min(12, 6 + ghosts.length));
      let safeCellCount = 0;
      for (const [k, pd] of Object.entries(playerArrival)) {
        const margin = (ghostArrival[k] ?? 999) - pd;
        safetyMargin[k] = margin;
        if (margin > 1) safeCellCount++;
      }
      const safeZones = this.safeComponents(maze, safetyMargin), field = ontology.objects.get("threat-field");
      Object.assign(field, { tick, ghostArrival, playerArrival, safetyMargin, ghostReachableSets, safeCellCount, safeZoneCount: safeZones.length, minPlayerMargin: safetyMargin[key7(player.x, player.y)] ?? 0 });
      const summary = ontology.objects.get("safe-zone-summary");
      Object.assign(summary, { count: safeZones.length, largestSize: Math.max(0, ...safeZones.map((z) => z.length)), tick });
      const escape = ontology.objects.get("escape-route-summary"), topology = ontology.objects.get("topology"), nearSafeJunctions = topology.junctions.filter((j) => (safetyMargin[key7(j.x, j.y)] ?? -99) > 1).length;
      Object.assign(escape, { count: nearSafeJunctions, tick });
      const foods = ontology.query({ where: (o) => o.type === "Pellet" || o.type === "PowerPellet" }), clusters = new Set(foods.map((f) => `${Math.floor(f.x / 5)},${Math.floor(f.y / 5)}`));
      Object.assign(ontology.objects.get("food-cluster-summary"), { count: clusters.size, remainingFood: foods.length, tick });
      return field;
    }
    reachableSets(maze, sources, horizon) {
      let frontier = new Set(sources.map((s) => key7(s.x, s.y))), reachable = new Set(frontier), sets = [...Array(horizon + 1)];
      sets[0] = [...frontier];
      for (let t = 1; t <= horizon; t++) {
        const next = /* @__PURE__ */ new Set();
        for (const k of frontier) {
          const [x, y] = k.split(",").map(Number);
          for (const [dx, dy] of MOVES7) if (maze.grid[y + dy]?.[x + dx] === 0) next.add(key7(x + dx, y + dy));
        }
        for (const k of next) reachable.add(k);
        sets[t] = [...reachable];
        frontier = next;
      }
      return sets;
    }
    multiSourceDistance(maze, sources) {
      const dist = {}, q = [];
      for (const s of sources) {
        const k = key7(s.x, s.y);
        if (dist[k] !== void 0) continue;
        dist[k] = 0;
        q.push({ x: s.x, y: s.y });
      }
      for (let i = 0; i < q.length; i++) {
        const p = q[i], d = dist[key7(p.x, p.y)];
        for (const [dx, dy] of MOVES7) {
          const x = p.x + dx, y = p.y + dy, k = key7(x, y);
          if (maze.grid[y]?.[x] !== 0 || dist[k] !== void 0) continue;
          dist[k] = d + 1;
          q.push({ x, y });
        }
      }
      return dist;
    }
    safeComponents(maze, margins) {
      const safe = new Set(Object.keys(margins).filter((k) => margins[k] > 1)), seen = /* @__PURE__ */ new Set(), out = [];
      for (const start of safe) if (!seen.has(start)) {
        const q = [start], group = [];
        seen.add(start);
        for (let i = 0; i < q.length; i++) {
          const k = q[i], [x, y] = k.split(",").map(Number);
          group.push(k);
          for (const [dx, dy] of MOVES7) {
            const nk = key7(x + dx, y + dy);
            if (safe.has(nk) && !seen.has(nk)) {
              seen.add(nk);
              q.push(nk);
            }
          }
        }
        out.push(group);
      }
      return out;
    }
  };

  // src/plugins/pacman/PacmanPlugin.js
  var D = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0], STAY: [0, 0] };
  var PacmanPlugin = class {
    constructor({ ghostCount = 5, rollouts = 96, planDepth = 22, weights = {} } = {}) {
      this.name = "Pac-Man Demonstration";
      this.mazeGenerator = new RandomMazeGenerator();
      this.ghostCount = ghostCount;
      this.rollouts = rollouts;
      this.planDepth = planDepth;
      this.weights = { ...weights };
      MonteCarloPlanner.activeWeights = this.weights;
    }
    applyWeights(weights) {
      this.weights = { ...weights };
      MonteCarloPlanner.activeWeights = this.weights;
      if (this.playerPlanner) {
        Object.assign(this.playerPlanner.weights, this.weights);
        this.playerPlanner.transposition.clear();
      }
    }
    install(engine2) {
      engine2.actions.register("gameOver", { validate: () => true, mutate: ({ ontology, action }) => {
        ontology.objects.get("game").status = "gameover";
        ontology.query({ type: "Player" })[0].lives = 0;
        return { eventType: "GameOverEvent", reason: action.reason || "No collision-free move" };
      } });
      engine2.actions.register("advanceTick", {
        validate: ({ ontology, action }) => {
          const p = ontology.query({ type: "Player" })[0], m = ontology.query({ type: "Maze" })[0], [dx, dy] = D[action.playerDirection] || [0, 0];
          return p && m?.grid[p.y + dy]?.[p.x + dx] === 0 && action.ghostMoves?.length === ontology.query({ type: "Ghost" }).length;
        },
        mutate: ({ ontology, action }) => {
          const p = ontology.query({ type: "Player" })[0], ghosts = ontology.query({ type: "Ghost" }), oldP = { x: p.x, y: p.y }, oldG = ghosts.map((g) => ({ x: g.x, y: g.y })), [dx, dy] = D[action.playerDirection];
          p.x += dx;
          p.y += dy;
          if (action.playerDirection !== "STAY") p.direction = action.playerDirection;
          ghosts.forEach((ghost, index) => {
            const [gx, gy] = D[action.ghostMoves[index].direction];
            ghost.x += gx;
            ghost.y += gy;
            ghost.direction = action.ghostMoves[index].direction;
          });
          const collision = ghosts.some((ghost, index) => ghost.x === p.x && ghost.y === p.y || oldG[index].x === p.x && oldG[index].y === p.y && ghost.x === oldP.x && ghost.y === oldP.y);
          if (collision) {
            ontology.objects.get("game").status = "gameover";
            p.lives = 0;
            return { eventType: "GameOverEvent", reason: "Ghost collision", playerDirection: action.playerDirection, ghostMoves: action.ghostMoves.map((move) => move.direction), collision: true };
          }
          const eaten = ontology.query({ where: (object) => (object.type === "Pellet" || object.type === "PowerPellet") && object.x === p.x && object.y === p.y })[0];
          if (eaten) {
            ontology.deleteObject(eaten.id);
            p.score += eaten.type === "PowerPellet" ? 50 : 10;
          }
          if (!ontology.query({ where: (object) => object.type === "Pellet" || object.type === "PowerPellet" }).length) ontology.objects.get("game").status = "complete";
          return { eventType: "TickEvent", playerDirection: action.playerDirection, ghostMoves: action.ghostMoves.map((move) => move.direction), eatenId: eaten?.id || null, collision: false, status: ontology.objects.get("game").status };
        }
      });
    }
    initialize(engine2, seed) {
      this.playerRng = new SeededRandom((seed ^ 2654435769) >>> 0);
      this.ghostRng = new SeededRandom((seed ^ 2246822507) >>> 0);
      this.ghostPlanner = new GhostPlanner(this.ghostRng);
      this.playerPlanner = new MonteCarloPlanner(this.playerRng, { rollouts: this.rollouts, depth: this.planDepth, weights: this.weights });
      this.safetyAnalyzer = new SafetyAnalyzer();
      this.robustSafety = new RobustSafetyAnalyzer();
      this.macroPlanner = new MacroActionPlanner();
      this.progressPlanner = new ConstrainedProgressPlanner({ horizon: Math.min(14, Math.max(8, this.planDepth)), detourBudget: 6 });
      this.foodPlanner = new FoodClusterPlanner();
      this.exactFoodPlanner = new ExactFoodPathPlanner();
      this.semanticAnalysis = new SemanticAnalysisService();
      this.recentPlayerPositions = [];
      this.lockedFoodId = null;
      const ontology = engine2.ontology, maze = this.mazeGenerator.generate(23, 21, seed);
      ontology.createObject("Game", { status: "running", level: 1 }, "game");
      ontology.createObject("Maze", maze, "maze");
      ontology.createRelationship("contains", "game", "maze");
      const player = ontology.createObject("Player", { x: 1, y: 1, score: 0, lives: 1, direction: "RIGHT" }, "player");
      ontology.createRelationship("locatedIn", player.id, "maze");
      let foodIndex = 0;
      const cells = [];
      for (let y = 1; y < maze.height - 1; y++) for (let x = 1; x < maze.width - 1; x++) if (maze.grid[y][x] === 0) {
        cells.push({ x, y });
        if (!(x === 1 && y === 1)) {
          const power = x === 1 && y === maze.height - 2 || x === maze.width - 2 && y === 1, food = ontology.createObject(power ? "PowerPellet" : "Pellet", { x, y }, `food-${foodIndex++}`);
          ontology.createRelationship("locatedIn", food.id, "maze");
        }
      }
      const far = cells.filter((cell) => Math.abs(cell.x - 1) + Math.abs(cell.y - 1) > Math.floor((maze.width + maze.height) * 0.35));
      for (let index = 0; index < this.ghostCount; index++) {
        const spot = far[Math.floor(index * far.length / this.ghostCount)] || far[index % far.length], ghost = ontology.createObject("Ghost", { x: spot.x, y: spot.y, homeX: spot.x, homeY: spot.y, direction: "LEFT", color: ["#ff568d", "#37d5ff", "#ff9f43", "#c98cff", "#56e39f", "#ff665f", "#8da2ff", "#f38fff"][index % 8] }, `ghost-${index + 1}`);
        ontology.createRelationship("locatedIn", ghost.id, "maze");
      }
      this.semanticAnalysis.install(ontology, maze);
      ontology.createObject("PlanningGoal", { status: "waiting" }, "planning-goal");
      ontology.createObject("SafetyEnvelope", { viableDirections: [] }, "safety-envelope");
      ontology.createObject("TimeExpandedPath", { steps: [] }, "time-expanded-path");
      ontology.createObject("ProgressState", { stagnation: 0, detourBudget: 6, tabuRecords: 0 }, "progress-state");
      ontology.createRelationship("constrains", "safety-envelope", "planning-goal");
      ontology.createRelationship("targets", "planning-goal", "time-expanded-path");
      ontology.createRelationship("measures", "progress-state", "time-expanded-path");
      this.recompute(engine2);
      ontology.storeEvent("SpawnEvent", { tick: 0, domain: "pacman", seed, ghostCount: this.ghostCount, rollouts: this.rollouts, planDepth: this.planDepth, randomStreams: ["player-private", "ghost-private"] });
    }
    recompute(engine2) {
      const ontology = engine2.ontology, maze = ontology.query({ type: "Maze" })[0];
      ontology.clearRelationships("adjacent");
      ontology.clearRelationships("collidedWith");
      for (const actor of ontology.query({ where: (object) => object.type === "Player" || object.type === "Ghost" })) for (const [direction, [dx, dy]] of Object.entries(D)) if (direction !== "STAY" && maze.grid[actor.y + dy]?.[actor.x + dx] === 0) ontology.createRelationship("adjacent", actor.id, `cell:${actor.x + dx},${actor.y + dy}`, { direction });
      this.semanticAnalysis?.update(ontology, engine2.tick);
      this.syncPlanningSemantics(ontology, engine2.diagnostics.progressPlan);
    }
    syncPlanningSemantics(ontology, progress) {
      if (!progress) return;
      Object.assign(ontology.objects.get("planning-goal"), { status: progress.mode, targetId: progress.goalId, target: progress.goal, distance: progress.distance });
      Object.assign(ontology.objects.get("safety-envelope"), { viableDirections: progress.viableDirections, guaranteed: progress.mode !== "NO_GUARANTEE", tick: ontology.objects.get("threat-field")?.tick });
      Object.assign(ontology.objects.get("time-expanded-path"), { steps: progress.path, horizon: this.progressPlanner.horizon, targetId: progress.goalId });
      Object.assign(ontology.objects.get("progress-state"), { stagnation: progress.stagnation, detourBudget: progress.detourBudget, replans: progress.replans, tabuRecords: progress.tabuRecords });
    }
    nextAction(engine2) {
      if (engine2.ontology.objects.get("game").status !== "running") return null;
      const ontology = engine2.ontology, target = this.foodPlanner.select(ontology), exact = this.exactFoodPlanner.plan(ontology, { targetKeys: target.targetKeys, recentKeys: this.recentPlayerPositions, preferredId: this.progressPlanner.goalId || this.lockedFoodId });
      const mc = this.playerPlanner.recommend(engine2, { targetKeys: target.targetKeys }), player = ontology.query({ type: "Player" })[0], foods = new Set(ontology.query({ where: (object) => object.type === "Pellet" || object.type === "PowerPellet" }).map((food) => `${food.x},${food.y}`)), recentCount = /* @__PURE__ */ new Map();
      for (const position of this.recentPlayerPositions) recentCount.set(position, (recentCount.get(position) || 0) + 1);
      const analyzed = mc.plans.map((plan) => {
        const [dx, dy] = D[plan.direction], nextKey = `${player.x + dx},${player.y + dy}`;
        return { ...plan, strategic: this.safetyAnalyzer.analyze(ontology, plan.direction, Math.min(12, this.planDepth)), robust: this.robustSafety.evaluate(ontology, plan.direction), nextKey, repeat: recentCount.get(nextKey) || 0, adjacentFood: foods.has(nextKey), guided: plan.direction === exact.direction };
      });
      const maxSurvival = Math.max(...analyzed.map((plan) => plan.strategic.survival));
      analyzed.sort((a, b) => this.comparePlans(a, b, maxSurvival));
      const progress = this.progressPlanner.recommend(ontology, analyzed, exact.target);
      let selected = progress.selected, fallback = progress.mode === "NO_GUARANTEE";
      if (!selected) {
        const stay = this.robustSafety.evaluate(ontology, "STAY");
        selected = { direction: "STAY", robust: stay, strategic: { survival: 1, safeArea: 1, junctions: 0, trapRisk: 0 }, score: 0, cvar: 0, safety: 1, average: { food: 0, escape: 0, danger: 0 }, visits: 0, repeat: 1 };
        fallback = !stay.robustSafe;
      }
      this.lockedFoodId = progress.goalId;
      const macro = this.macroPlanner.create({ exact: { ...exact, target: ontology.objects.get(progress.goalId) || exact.target }, selectedPlan: selected, foodTarget: target.selected });
      Object.assign(engine2.diagnostics, { currentPlanner: "Safety Shield + Persistent Goal + Time-expanded Path", ghostMovesLocked: null, foodTarget: target.selected, exactFoodTarget: exact, macroAction: macro, progressPlan: progress, plans: analyzed.map((plan) => ({ name: `Player ${plan.direction}`, direction: plan.direction, score: plan.score, cvar: plan.cvar, visits: plan.visits, confidence: plan.confidence, safety: plan.safety, average: plan.average, collisions: plan.collisions, strategic: plan.strategic, robust: plan.robust, repeat: plan.repeat, adjacentFood: plan.adjacentFood, guided: plan.guided })), mcTrail: mc.trail, lastSimulationCount: mc.simulations, depth: mc.depth });
      engine2.diagnostics.simulations += mc.simulations;
      engine2.diagnostics.reasoning = [`Safety shield: ${progress.viableDirections?.join(", ") || "no guaranteed direction"}`, `Persistent goal: ${progress.goalId || "none"}`, `Progress mode: ${progress.mode}`, `Stagnation: ${progress.stagnation || 0}/${progress.detourBudget || 0}`];
      engine2.diagnostics.selectionReason = `${selected.direction} \uC120\uD0DD: ${progress.mode} \xB7 \uBAA9\uD45C ${progress.goalId || "\uC5C6\uC74C"} \xB7 \uAC70\uB9AC ${Number.isFinite(progress.distance) ? progress.distance : "\u221E"} \xB7 \uC815\uCCB4 ${progress.stagnation || 0}/${progress.detourBudget || 0}. \uC2E4\uC81C \uACE0\uC2A4\uD2B8 \uC120\uD0DD\uC740 \uC544\uC9C1 \uBE44\uACF5\uAC1C.${fallback ? " \uC548\uC804 \uBCF4\uC7A5 \uBD88\uAC00; \uCDA9\uB3CC \uC2DC Game Over." : ""}`;
      const ghosts = ontology.query({ type: "Ghost" }), ghostMoves = ghosts.map((ghost) => this.ghostPlanner.recommend(engine2, ghost)).map((plan, index) => ({ id: ghosts[index].id, direction: plan.action.direction }));
      return { type: "advanceTick", playerDirection: selected.direction, ghostMoves };
    }
    comparePlans(a, b, maxSurvival) {
      if (a.robust.robustSafe !== b.robust.robustSafe) return b.robust.robustSafe - a.robust.robustSafe;
      if (a.robust.collisionRisk !== b.robust.collisionRisk) return a.robust.collisionRisk - b.robust.collisionRisk;
      if (Math.abs(a.strategic.survival - b.strategic.survival) > 1) return b.strategic.survival - a.strategic.survival;
      const nearA = a.strategic.survival >= maxSurvival - 1, nearB = b.strategic.survival >= maxSurvival - 1;
      if (nearA !== nearB) return nearB - nearA;
      if (a.strategic.trapRisk !== b.strategic.trapRisk) return a.strategic.trapRisk - b.strategic.trapRisk;
      return this.planUtility(b) - this.planUtility(a);
    }
    planUtility(plan) {
      const w = this.playerPlanner.weights;
      return (plan.adjacentFood ? 100 * w.adjacentFood : 0) + (plan.guided ? 55 * w.pathGuide : 0) - plan.repeat * 45 * w.repeatAvoidance + plan.strategic.safeArea * 0.5 + plan.safety * 1e3 + plan.cvar * 1e-3 + plan.score * 5e-4;
    }
    afterAction(engine2) {
      const ontology = engine2.ontology, game = ontology.objects.get("game"), player = ontology.query({ type: "Player" })[0];
      this.recentPlayerPositions.push(`${player.x},${player.y}`);
      if (this.recentPlayerPositions.length > 16) this.recentPlayerPositions.shift();
      if (this.lockedFoodId && !ontology.objects.has(this.lockedFoodId)) this.lockedFoodId = null;
      if (this.progressPlanner.goalId && !ontology.objects.has(this.progressPlanner.goalId)) {
        this.progressPlanner.goalId = null;
        Object.assign(ontology.objects.get("planning-goal"), { status: "achieved", targetId: null, distance: 0 });
        Object.assign(ontology.objects.get("time-expanded-path"), { steps: [], targetId: null });
      }
      if (game.status !== "running") engine2.pause();
      else if (engine2.mode === "pause") engine2.notify();
    }
  };

  // src/plugins/pacman/PacmanVisualization.js
  var ANGLE = { RIGHT: 0, DOWN: Math.PI / 2, LEFT: Math.PI, UP: -Math.PI / 2 };
  var PacmanVisualization = class {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
    }
    render(engine2) {
      const c = this.ctx, o = engine2.ontology, m = o.query({ type: "Maze" })[0];
      if (!m) return;
      const s = Math.min(this.canvas.width / m.width, this.canvas.height / m.height), ox = (this.canvas.width - m.width * s) / 2, oy = (this.canvas.height - m.height * s) / 2;
      c.fillStyle = "#070a0e";
      c.fillRect(0, 0, this.canvas.width, this.canvas.height);
      for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) if (m.grid[y][x]) {
        c.fillStyle = "#17233a";
        c.fillRect(ox + x * s + 1, oy + y * s + 1, s - 2, s - 2);
        c.strokeStyle = "#2f61a8";
        c.strokeRect(ox + x * s + 2, oy + y * s + 2, s - 4, s - 4);
      }
      for (const f of o.query({ where: (x) => x.type === "Pellet" || x.type === "PowerPellet" })) {
        c.beginPath();
        c.fillStyle = f.type === "PowerPellet" ? "#f7f3c6" : "#bdc6d4";
        c.arc(ox + (f.x + 0.5) * s, oy + (f.y + 0.5) * s, f.type === "PowerPellet" ? s * 0.2 : s * 0.07, 0, Math.PI * 2);
        c.fill();
      }
      const p = o.query({ type: "Player" })[0], a = ANGLE[p.direction] ?? 0, mouth = 0.36;
      c.beginPath();
      c.fillStyle = "#f3ce36";
      c.moveTo(ox + (p.x + 0.5) * s, oy + (p.y + 0.5) * s);
      c.arc(ox + (p.x + 0.5) * s, oy + (p.y + 0.5) * s, s * 0.39, a + mouth, a + Math.PI * 2 - mouth);
      c.closePath();
      c.fill();
      for (const g of o.query({ type: "Ghost" })) {
        c.beginPath();
        c.fillStyle = g.color;
        c.arc(ox + (g.x + 0.5) * s, oy + (g.y + 0.45) * s, s * 0.36, Math.PI, 0);
        c.lineTo(ox + (g.x + 0.86) * s, oy + (g.y + 0.82) * s);
        c.lineTo(ox + (g.x + 0.14) * s, oy + (g.y + 0.82) * s);
        c.fill();
        c.fillStyle = "#fff";
        c.fillRect(ox + (g.x + 0.29) * s, oy + (g.y + 0.38) * s, s * 0.13, s * 0.15);
        c.fillRect(ox + (g.x + 0.58) * s, oy + (g.y + 0.38) * s, s * 0.13, s * 0.15);
      }
    }
  };

  // src/ui/OntologyGraph.js
  var OntologyGraph = class {
    render(canvas, ontology, { detailed = false, diagnostics = {} } = {}) {
      const ratio = devicePixelRatio || 1, context = canvas.getContext("2d"), width = canvas.clientWidth, height = canvas.clientHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.scale(ratio, ratio);
      const topology = ontology.objects.get("topology"), threat = ontology.objects.get("threat-field"), safe = ontology.objects.get("safe-zone-summary"), escape = ontology.objects.get("escape-route-summary"), food = ontology.objects.get("food-cluster-summary"), player = ontology.query({ type: "Player" })[0], ghosts = ontology.query({ type: "Ghost" }), semanticGoal = ontology.objects.get("planning-goal"), semanticSafety = ontology.objects.get("safety-envelope"), semanticPath = ontology.objects.get("time-expanded-path"), semanticProgress = ontology.objects.get("progress-state"), progress = diagnostics.progressPlan;
      const summaryNodes = [
        ["game", "Game", `tick ${threat?.tick ?? 0}`, "#37d5ff"],
        ["maze", "Maze", `${topology?.counts?.walkable || 0} cells`, "#6c8cff"],
        ["topology", "Topology", "static \xB7 cached", "#56e39f"],
        ["threat", "ThreatField", `${Math.max(0, (threat?.ghostReachableSets?.length || 1) - 1)} tick horizon`, "#ff568d"],
        ["network", "Junction/Corridor", `${topology?.counts?.junctions || 0}/${topology?.counts?.corridors || 0}`, "#56e39f"],
        ["zones", "Zone/Bottleneck", `${topology?.counts?.zones || 0}/${topology?.counts?.bottlenecks || 0}`, "#56e39f"],
        ["safe", "SafeZone", `${safe?.count || 0} \xB7 max ${safe?.largestSize || 0}`, "#f3ce36"],
        ["escape", "EscapeRoute", `${escape?.count || 0} junctions`, "#f3ce36"],
        ["food", "FoodCluster", `${food?.count || 0} \xB7 ${food?.remainingFood || 0} food`, "#c98cff"],
        ["actors", "Actors", `P ${player?.score || 0} \xB7 G ${ghosts.length}`, "#37d5ff"],
        ["events", "Events", `${ontology.events.length} stored`, "#738097"]
      ];
      const detailNodes = detailed ? [
        ["shield", "Safety Shield", `${semanticSafety?.viableDirections?.length || 0} viable`, "#ff665f"],
        ["goal", "Persistent Goal", semanticGoal?.targetId || "waiting", "#f3ce36"],
        ["timepath", "Time Path", `${semanticPath?.steps?.length || 0} states`, "#37d5ff"],
        ["progress", "Progress", `stall ${semanticProgress?.stagnation || 0}/${semanticProgress?.detourBudget || 0}`, "#56e39f"],
        ["tabu", "Cycle Guard", `${semanticProgress?.tabuRecords || 0} records`, "#c98cff"],
        ["responses", "Ghost Responses", `${diagnostics.plans?.[0]?.robust?.possibleResponses || 0} combos`, "#ff568d"],
        ["candidates", "Candidates", `${diagnostics.plans?.length || 0} actions`, "#6c8cff"],
        ["macro", "Macro Intent", diagnostics.macroAction?.type || "waiting", "#f3ce36"]
      ] : [];
      const rawNodes = detailed ? [...summaryNodes.slice(0, 4), ...detailNodes, ...summaryNodes.slice(4)] : summaryNodes;
      const columns = detailed ? 4 : 3, rows = Math.ceil(rawNodes.length / columns), marginX = 6, top = 18, cellWidth = (width - marginX * 2) / columns, cellHeight = (height - top - 8) / rows;
      const nodes = rawNodes.map((node, index) => ({ id: node[0], label: node[1], sub: node[2], color: node[3], x: marginX + cellWidth * (index % columns + 0.5), y: top + cellHeight * (Math.floor(index / columns) + 0.5) }));
      const edgePairs = detailed ? [["game", "maze"], ["maze", "topology"], ["maze", "threat"], ["threat", "shield"], ["shield", "goal"], ["goal", "timepath"], ["timepath", "progress"], ["progress", "tabu"], ["threat", "responses"], ["responses", "candidates"], ["candidates", "macro"], ["topology", "network"], ["topology", "zones"], ["threat", "safe"], ["safe", "escape"], ["threat", "food"], ["game", "actors"], ["game", "events"]] : [["game", "maze"], ["maze", "topology"], ["maze", "threat"], ["topology", "network"], ["topology", "zones"], ["threat", "safe"], ["safe", "escape"], ["threat", "food"], ["game", "actors"], ["game", "events"]];
      context.clearRect(0, 0, width, height);
      context.textAlign = "center";
      for (const [from, to] of edgePairs) {
        const a = nodes.find((node) => node.id === from), b = nodes.find((node) => node.id === to);
        if (!a || !b) continue;
        context.strokeStyle = "#344156";
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      }
      const nodeWidth = Math.min(detailed ? 70 : 86, cellWidth - 5), nodeHeight = detailed ? 25 : 29;
      for (const node of nodes) {
        context.shadowColor = node.color;
        context.shadowBlur = 6;
        context.fillStyle = "#111925";
        context.strokeStyle = node.color;
        context.beginPath();
        context.roundRect(node.x - nodeWidth / 2, node.y - nodeHeight / 2, nodeWidth, nodeHeight, 5);
        context.fill();
        context.stroke();
        context.shadowBlur = 0;
        context.fillStyle = "#e6edf7";
        context.font = `600 ${detailed ? 7 : 8}px system-ui`;
        context.fillText(this.trim(node.label, detailed ? 16 : 20), node.x, node.y - 1);
        context.fillStyle = "#738097";
        context.font = `${detailed ? 6 : 7}px monospace`;
        context.fillText(this.trim(node.sub, detailed ? 18 : 24), node.x, node.y + 8);
      }
    }
    trim(value, max) {
      const text = String(value ?? "");
      return text.length > max ? `${text.slice(0, max - 1)}\u2026` : text;
    }
  };

  // src/ui/Dashboard.js
  var esc = (value) => String(value ?? "").replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char]);
  var pct = (value) => `${((value ?? 0) * 100).toFixed(0)}%`;
  var Dashboard = class {
    constructor(engine2, visual) {
      this.engine = engine2;
      this.visual = visual;
      this.graph = new OntologyGraph();
      this.tab = "graph";
      document.querySelectorAll("[data-tab]").forEach((button) => {
        button.onclick = () => {
          this.tab = button.dataset.tab;
          document.querySelectorAll("[data-tab]").forEach((item) => item.classList.toggle("active", item === button));
          this.render();
        };
      });
    }
    render() {
      const engine2 = this.engine;
      this.visual.render(engine2);
      document.querySelector("#status").textContent = engine2.mode.toUpperCase();
      this.renderSemantic(engine2.ontology);
      this.renderDynamic(engine2);
      this.renderKinetic(engine2);
      this.renderDebug(engine2);
    }
    renderSemantic(ontology) {
      const body = document.querySelector("#semanticBody");
      if (this.tab === "graph") {
        body.innerHTML = '<canvas class="ontology-graph"></canvas>';
        this.graph.render(body.querySelector("canvas"), ontology, { detailed: this.engine.mode === "pause", diagnostics: this.engine.diagnostics });
      }
      if (this.tab === "objects") body.innerHTML = `<table><tr><th>ID</th><th>TYPE</th><th>STATE</th></tr>${[...ontology.objects.values()].slice(-120).map((object) => `<tr><td class="id">${esc(object.id)}</td><td class="type">${object.eventType || object.type}</td><td>${esc(object.x != null ? `(${object.x},${object.y})` : object.status || object.score || "\u2014")}</td></tr>`).join("")}</table>`;
      if (this.tab === "relationships") body.innerHTML = `<table><tr><th>TYPE</th><th>FROM \u2192 TO</th></tr>${[...ontology.relationships.values()].map((r) => `<tr><td class="type">${r.type}</td><td>${esc(r.from)} \u2192 ${esc(r.to)}</td></tr>`).join("")}</table>`;
      if (this.tab === "events") body.innerHTML = ontology.events.slice().reverse().map((event) => `<div class="event"><b>${event.eventType}</b> \xB7 tick ${event.tick}<br>${esc(event.payload?.action?.type || event.payload?.outcome || "ontology")}</div>`).join("");
    }
    renderDynamic(engine2) {
      const diagnostics = engine2.diagnostics;
      const plans = diagnostics.plans || [];
      const trail = diagnostics.mcTrail || [];
      const best = plans[0];
      const exact = diagnostics.exactFoodTarget;
      const target = diagnostics.foodTarget;
      const macro = diagnostics.macroAction;
      const progress = diagnostics.progressPlan;
      const recommendation = diagnostics.recommendation;
      document.querySelector("#dynamicBody").innerHTML = `
      <div class="card"><div class="label">Active planner</div><div class="value">${esc(diagnostics.currentPlanner || "waiting")}<span class="score">${diagnostics.lastSimulationCount || 0} runs \xD7 ${diagnostics.depth || 0} ticks</span></div></div>
      ${macro ? `<div class="card intent"><div class="label">Macro intent</div><div class="value">${esc(macro.type)}</div><div class="plan-meta">${esc(macro.label || "")}${macro.targetId ? ` \xB7 target ${esc(macro.targetId)}` : ""}</div></div>` : ""}
      ${progress ? `<div class="card"><div class="label">Constrained progress</div><div class="value">${esc(progress.mode)} \xB7 ${esc(progress.goalId)}</div><div class="plan-meta">\uAC70\uB9AC ${Number.isFinite(progress.distance) ? progress.distance : "\u221E"} \xB7 \uC815\uCCB4 ${progress.stagnation}/${progress.detourBudget} \xB7 \uC7AC\uACC4\uD68D ${progress.replans}<br>\uC548\uC804 \uD589\uB3D9: ${progress.viableDirections.join(", ") || "\uC5C6\uC74C"} \xB7 \uC2DC\uAC04\uCD95 \uACBD\uB85C: ${progress.path.slice(0, 8).map((step) => step.direction[0]).join(" \u2192 ") || "\uC548\uC804\uD55C \uACBD\uB85C \uC5C6\uC74C"}</div></div>` : ""}
      ${exact?.target ? `<div class="card"><div class="label">${esc(exact.mode)}</div><div class="value">${esc(exact.target.id)} \xB7 ${exact.distance} ticks away</div><div class="plan-meta">\uB2E4\uC74C \uACBD\uB85C: ${exact.path.slice(0, 8).map((step) => step.direction[0]).join(" \u2192 ")}</div></div>` : target ? `<div class="card"><div class="label">Food cluster target</div><div class="value">Zone ${target.id} \xB7 ${target.count} pellets</div></div>` : ""}
      <div class="card"><div class="label">Why this move?</div><div class="value">${esc(diagnostics.selectionReason || "\uCCAB \uD2F1\uC744 \uC2E4\uD589\uD558\uBA74 \uC120\uD0DD \uC774\uC720\uAC00 \uD45C\uC2DC\uB429\uB2C8\uB2E4.")}</div>${best?.average ? `<div class="plan-meta">\uBA39\uC774 +${best.average.food.toFixed(1)} \xB7 \uB3C4\uC8FC ${best.average.escape.toFixed(1)} \xB7 \uC704\uD5D8 ${best.average.danger.toFixed(1)} \xB7 CVaR ${best.cvar?.toFixed(0)}</div>` : ""}</div>
      <div class="card"><div class="label">Recommended simultaneous tick</div><div class="value">${esc(recommendation?.type || "waiting")} ${esc(recommendation?.playerDirection || "")}</div><div class="plan-meta">\uD329\uB9E8\uC740 \uAC00\uB2A5\uD55C \uACE0\uC2A4\uD2B8 \uC751\uB2F5\uB9CC \uD3C9\uAC00\uD558\uBA70, \uC2E4\uC81C \uACE0\uC2A4\uD2B8 \uC120\uD0DD\uC740 \uC774 \uACB0\uC815 \uB4A4\uC5D0 \uB3C5\uB9BD\uC801\uC73C\uB85C \uCD94\uCCA8\uB429\uB2C8\uB2E4.</div></div>
      ${plans.map((plan, index) => `<div class="card"><span class="score">${Number(plan.score).toFixed(1)}</span><div class="label">Candidate ${index + 1}</div><div class="value">${esc(plan.name)} ${plan.adjacentFood ? "\xB7 PELLET" : ""} ${plan.guided ? "\xB7 PATH" : ""} ${plan.repeat ? `\xB7 REPEAT ${plan.repeat}` : ""}</div><div class="plan-meta">${plan.robust?.robustSafe ? "ROBUST SAFE" : `\uCDA9\uB3CC \uC704\uD5D8 ${pct(plan.robust?.collisionRisk)}`} \xB7 \uAC00\uB2A5\uD55C \uACE0\uC2A4\uD2B8 \uC751\uB2F5 ${plan.robust?.possibleResponses ?? 0}<br>${plan.visits ? `\uC0DD\uC874 ${plan.strategic?.survival ?? 0}\uD2F1 \xB7 \uC601\uC5ED ${plan.strategic?.safeArea ?? 0} \xB7 MC\uC548\uC804 ${pct(plan.safety)} \xB7 \uCD5C\uC54520% ${plan.cvar.toFixed(0)} \xB7 \uBA39\uC774 ${plan.average.food.toFixed(0)}` : ""}</div><div class="bar"><i style="width:${Math.max(6, 100 * (plan.safety ?? plan.confidence ?? 0))}%"></i></div></div>`).join("")}
      ${trail.length ? `<div class="label">Choice evolution \xB7 sampled \u2192 safe leader</div><div class="mc-trail">${trail.map((step, index) => `<div class="mc-step ${index === trail.length - 1 ? "lead" : ""}">#${step.iteration}<b>${step.chosen[0]}\u2192${step.leader[0]}</b>${step.reward <= -999999 ? "X" : step.reward.toFixed(0)}</div>`).join("")}</div>` : ""}`;
    }
    renderKinetic(engine2) {
      document.querySelector("#kineticBody").innerHTML = `<div class="card"><div class="label">Action queue</div><div class="value">${engine2.actions.queue.length} pending</div></div>${engine2.actions.history.slice(0, 8).map((item) => `<div class="event"><b>${item.action.type}</b> P:${item.action.playerDirection || item.action.direction || ""}<span class="score">${item.duration.toFixed(2)} ms</span><br>Ghosts: ${(item.action.ghostMoves || []).map((move) => move.direction[0]).join(" \xB7 ") || "\u2014"} \u2192 ${item.event.eventType}</div>`).join("")}`;
    }
    renderDebug(engine2) {
      const ontology = engine2.ontology;
      const memory = performance.memory ? `${(performance.memory.usedJSHeapSize / 1048576).toFixed(1)} MB` : "browser n/a";
      const cache = engine2.plugin?.playerPlanner;
      const optimization = engine2.diagnostics.optimization;
      const weights = optimization?.weights || engine2.plugin?.weights || {};
      const optimizationHtml = optimization ? `<div class="card benchmark"><div class="label">End-to-end optimized \xB7 ${optimization.generations} generations</div><div class="value">\uC644\uC8FC ${pct(optimization.metrics.completionRate)} \xB7 \uB05D \uAD6C\uAC04 ${pct(optimization.metrics.endgameRate)} \xB7 \uC0DD\uC874 ${pct(optimization.metrics.survivalRate)}</div><div class="plan-meta">\uD3C9\uADE0 \uB0A8\uC740 \uBA39\uC774 ${optimization.metrics.avgRemaining.toFixed(1)} \xB7 \uD3C9\uADE0 ${optimization.metrics.avgTicks.toFixed(0)}/${optimization.metrics.maxTicks} ticks<br>${Object.entries(weights).map(([key8, value]) => `${key8} ${value.toFixed(2)}`).join(" \xB7 ")}<br>${optimization.history.map((item) => `G${item.generation} \uC644\uC8FC${pct(item.completionRate)} \uB05D${pct(item.endgameRate)} \uB0A8\uC74C${item.avgRemaining.toFixed(1)}`).join(" \u2192 ")}</div></div>` : "";
      document.querySelector("#debugBody").innerHTML = `<div class="metrics">${[["TICK", engine2.tick], ["SEED", engine2.seed], ["OBJECTS", ontology.objects.size], ["RELATIONS", ontology.relationships.size], ["EVENTS", ontology.events.length], ["EXECUTION", `${(engine2.diagnostics.executionTime || 0).toFixed(2)}ms`]].map(([key8, value]) => `<div class="metric"><span class="label">${key8}</span><strong>${value}</strong></div>`).join("")}</div>${optimizationHtml}<div class="log"><b>planner://</b> Robust Monte Carlo + optimized weights<br><b>safety://</b> hard constraint; never traded for reward<br><b>weights://</b> ${Object.keys(weights).length ? "optimized profile active" : "default profile"}<br><b>ghost-model://</b> reachable sets; actual action hidden until commit<br><b>cache://</b> ${cache?.cacheHits || 0} hits \xB7 ${cache?.transposition?.size || 0} states<br><b>simulation://</b> ${engine2.diagnostics.simulations || 0} cloned futures<br><b>memory://</b> ${memory}<br>${(engine2.diagnostics.reasoning || []).map((reason) => `<b>reason://</b> ${esc(reason)}<br>`).join("")}</div>`;
    }
  };

  // src/plugins/pacman/benchmark/BenchmarkRunner.js
  var BenchmarkRunner = class {
    async run({ baseSeed = 1, seeds = 2, ghostCount = 5, maxTicks = 600, rollouts = 6, planDepth = 6, weights = {}, onSeed, onTick } = {}) {
      const results = [];
      for (let index = 0; index < seeds; index++) {
        const engine2 = new Engine(new PacmanPlugin({ ghostCount, rollouts, planDepth, weights }), { seed: baseSeed + index * 7919 >>> 0 });
        engine2.init();
        const initial = engine2.ontology.query({ where: (object) => object.type === "Pellet" || object.type === "PowerPellet" }).length;
        const positions = [];
        let ticks = 0, planningMs = 0, endgameTick = null;
        for (; ticks < maxTicks && engine2.ontology.objects.get("game").status === "running"; ticks++) {
          engine2.step();
          planningMs += engine2.diagnostics.executionTime || 0;
          const player = engine2.ontology.query({ type: "Player" })[0];
          positions.push(`${player.x},${player.y}`);
          const remainingNow = engine2.ontology.query({ where: (object) => object.type === "Pellet" || object.type === "PowerPellet" }).length;
          if (endgameTick == null && remainingNow <= 5) endgameTick = ticks + 1;
          if ((ticks + 1) % 20 === 0) {
            onTick?.({ seed: index + 1, seeds, tick: ticks + 1, maxTicks, remaining: remainingNow });
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }
        let oscillations = 0;
        for (let n = 3; n < positions.length; n++) if (positions[n] === positions[n - 2] && positions[n - 1] === positions[n - 3]) oscillations++;
        const remaining = engine2.ontology.query({ where: (object) => object.type === "Pellet" || object.type === "PowerPellet" }).length;
        results.push({ status: engine2.ontology.objects.get("game").status, ticks, initial, remaining, eaten: initial - remaining, eatenRatio: (initial - remaining) / initial, foodPerTick: (initial - remaining) / Math.max(1, ticks), oscillations, endgameReached: endgameTick != null, endgameTick, planningMs: planningMs / Math.max(1, ticks) });
        onSeed?.(index + 1, seeds);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      const completed = results.filter((result) => result.status === "complete").length, gameovers = results.filter((result) => result.status === "gameover").length, capped = results.filter((result) => result.status === "running").length;
      const average = (key8) => results.reduce((sum, result) => sum + result[key8], 0) / results.length;
      return { seeds, completed, gameovers, capped, completionRate: completed / seeds, survivalRate: (seeds - gameovers) / seeds, endgameRate: results.filter((result) => result.endgameReached).length / seeds, avgTicks: average("ticks"), avgRemaining: average("remaining"), eatenRatio: average("eatenRatio"), foodPerTick: average("foodPerTick"), oscillations: average("oscillations"), planningMs: average("planningMs"), maxTicks, results };
    }
  };

  // src/plugins/pacman/benchmark/WeightOptimizer.js
  var KEYS = ["food", "targetFood", "escape", "danger", "revisit", "time", "completion", "foodBias", "escapeBias", "adjacentFood", "pathGuide", "repeatAvoidance"];
  var clamp = (value) => Math.max(0.25, Math.min(3, value));
  var WeightOptimizer = class {
    constructor() {
      this.runner = new BenchmarkRunner();
    }
    async optimize({ baseSeed = 1, ghostCount = 5, generations = 2, populationSize = 3, seeds = 2, maxTicks = 600, initialWeights = {}, onProgress } = {}) {
      let randomState = (baseSeed ^ 2738958700) >>> 0;
      const random = () => (randomState = Math.imul(randomState, 1664525) + 1013904223 >>> 0) / 4294967296;
      const baseline = { ...DEFAULT_WEIGHTS, ...initialWeights };
      let population = [baseline, ...Array.from({ length: populationSize - 1 }, () => this.mutate(baseline, 0.55, random))];
      const history = [];
      let best = null;
      for (let generation = 1; generation <= generations; generation++) {
        const evaluated = [];
        for (let candidate = 0; candidate < population.length; candidate++) {
          onProgress?.({ generation, generations, candidate: candidate + 1, populationSize, phase: "evaluating" });
          const metrics = await this.runner.run({ baseSeed, seeds, ghostCount, maxTicks, rollouts: 6, planDepth: 6, weights: population[candidate], onTick: (state) => onProgress?.({ generation, generations, candidate: candidate + 1, populationSize, phase: "end-to-end", ...state }) });
          const fitness = this.fitness(metrics);
          evaluated.push({ weights: population[candidate], metrics, fitness, feasible: metrics.gameovers === 0 });
        }
        evaluated.sort((a, b) => b.fitness - a.fitness);
        if (!best || evaluated[0].fitness > best.fitness) best = evaluated[0];
        history.push({ generation, bestFitness: evaluated[0].fitness, survivalRate: evaluated[0].metrics.survivalRate, completionRate: evaluated[0].metrics.completionRate, endgameRate: evaluated[0].metrics.endgameRate, eatenRatio: evaluated[0].metrics.eatenRatio, avgRemaining: evaluated[0].metrics.avgRemaining, weights: evaluated[0].weights });
        const elite = evaluated.slice(0, 2).map((item) => item.weights);
        population = [elite[0], elite[1] || elite[0]];
        while (population.length < populationSize) population.push(this.mutate(elite[Math.floor(random() * elite.length)], 0.38 / generation, random));
      }
      return { ...best, baseline, history, generations, populationSize, seeds, applied: true };
    }
    fitness(metrics) {
      const safetyPenalty = metrics.gameovers * 2e6;
      const completion = metrics.completionRate * 1e6;
      const endgame = metrics.endgameRate * 25e4;
      const remaining = metrics.eatenRatio * 1e5;
      const completionSpeed = metrics.completed ? -metrics.avgTicks * 80 : 0;
      return -safetyPenalty + completion + endgame + remaining + metrics.foodPerTick * 4e3 + completionSpeed - metrics.oscillations * 180 - metrics.planningMs * 0.2;
    }
    mutate(source, scale, random) {
      return Object.fromEntries(KEYS.map((key8) => [key8, clamp((source[key8] ?? 1) * Math.exp((random() * 2 - 1) * scale))]));
    }
  };

  // src/main.js
  var clamp2 = (value, min, max, fallback) => Math.max(min, Math.min(max, +value || fallback));
  var plugin = new PacmanPlugin({ ghostCount: +document.querySelector("#ghostCount").value, rollouts: +document.querySelector("#rollouts").value, planDepth: +document.querySelector("#planDepth").value });
  var engine = PluginLoader.load(plugin, { seed: +document.querySelector("#seed").value });
  var dashboard = new Dashboard(engine, new PacmanVisualization(document.querySelector("#maze")));
  engine.onChange(() => dashboard.render());
  dashboard.render();
  document.querySelector("#step").onclick = () => engine.step();
  var autoSpeed = () => +document.querySelector("#autoSpeed").value;
  document.querySelector("#auto").onclick = () => engine.start(autoSpeed());
  document.querySelector("#autoSpeed").onchange = () => {
    if (engine.mode === "auto") engine.start(autoSpeed());
  };
  document.querySelector("#pause").onclick = () => engine.pause();
  document.querySelector("#reset").onclick = () => {
    plugin.ghostCount = clamp2(document.querySelector("#ghostCount").value, 1, 8, 5);
    plugin.rollouts = clamp2(document.querySelector("#rollouts").value, 16, 512, 96);
    plugin.planDepth = clamp2(document.querySelector("#planDepth").value, 4, 60, 22);
    document.querySelector("#ghostCount").value = plugin.ghostCount;
    document.querySelector("#rollouts").value = plugin.rollouts;
    document.querySelector("#planDepth").value = plugin.planDepth;
    engine.reset(+document.querySelector("#seed").value);
  };
  document.querySelector("#benchmark").onclick = async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    engine.pause();
    try {
      const result = await new WeightOptimizer().optimize({
        baseSeed: +document.querySelector("#seed").value,
        ghostCount: plugin.ghostCount,
        initialWeights: plugin.weights,
        onProgress: (progress) => {
          button.textContent = progress.tick ? `G${progress.generation} C${progress.candidate} \xB7 S${progress.seed} T${progress.tick} F${progress.remaining}` : `OPT ${progress.generation}/${progress.generations} \xB7 ${progress.candidate}/${progress.populationSize}`;
        }
      });
      plugin.applyWeights(result.weights);
      engine.reset(+document.querySelector("#seed").value);
      engine.diagnostics.optimization = result;
      dashboard.render();
    } catch (error) {
      engine.diagnostics.reasoning = [`Weight optimization failed: ${error.message}`];
      dashboard.render();
    } finally {
      button.disabled = false;
      button.textContent = "OPTIMIZE WEIGHTS";
    }
  };
  document.querySelector("#legend").innerHTML = '<span><i class="dot" style="background:#f3ce36"></i>Player</span><span><i class="dot" style="background:#ff568d"></i>Ghost Planner</span><span><i class="dot" style="background:#bdc6d4"></i>Ontology Object</span>';
})();
