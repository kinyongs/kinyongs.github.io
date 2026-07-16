const MOVES = [['UP', 0, -1], ['DOWN', 0, 1], ['LEFT', -1, 0], ['RIGHT', 1, 0]];
const key = (x, y) => `${x},${y}`;

export class ConstrainedProgressPlanner {
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
    this.stateActions = new Map();
    this.lastDecision = null;
  }

  recommend(ontology, plans, proposedTarget) {
    const foods = ontology.query({ where: object => object.type === 'Pellet' || object.type === 'PowerPellet' });
    const player = ontology.query({ type: 'Player' })[0];
    let goal = foods.find(food => food.id === this.goalId);
    if (!goal) goal = proposedTarget && foods.find(food => food.id === proposedTarget.id);
    if (!goal) goal = this.closestFood(ontology, foods);
    if (!goal) return { selected: plans[0], mode: 'COMPLETE', goal: null, path: [], progress: 0 };

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
      const alternatives = foods.filter(food => food.id !== goal.id).map(food => ({ food, path: this.timeExpandedPath(ontology, food) })).filter(item => item.path.length).sort((a, b) => a.path.length - b.path.length);
      if (alternatives.length) {
        goal = alternatives[0].food;
        route = alternatives[0].path;
        this.goalId = goal.id;
        this.lastDistance = route.length;
        this.stagnation = 0;
        this.replans++;
      }
    }

    const viable = plans.filter(plan => plan.robust.robustSafe && plan.strategic.survival >= Math.max(2, Math.max(...plans.map(item => item.strategic.survival)) - 1));
    const adjacentFood = viable.find(plan => foods.some(food => food.x === player.x + this.delta(plan.direction)[0] && food.y === player.y + this.delta(plan.direction)[1]));
    const routePlan = viable.find(plan => plan.direction === route[0]?.direction);
    const stateKey = `${player.x},${player.y}/${this.goalId}/${foods.length}`;
    const allowed = plan => !this.isTabu(stateKey, plan.direction) || viable.length === 1;
    let selected = [adjacentFood, routePlan, ...viable, ...plans].find(plan => plan && allowed(plan)) || plans[0];
    const mode = adjacentFood === selected ? 'SAFE_ADJACENT_FOOD' : routePlan === selected ? 'PERSISTENT_ROUTE' : viable.includes(selected) ? 'SAFE_DETOUR' : 'NO_GUARANTEE';
    this.remember(stateKey, selected.direction);
    this.lastDecision = { mode, goalId: goal.id, goal: { x: goal.x, y: goal.y }, path: route.slice(0, this.horizon), distance, stagnation: this.stagnation, detourBudget: this.detourBudget, replans: this.replans, tabuRecords: this.stateActions.size, viableDirections: viable.map(plan => plan.direction), selectedDirection: selected.direction };
    return { selected, ...this.lastDecision };
  }

  timeExpandedPath(ontology, target) {
    const maze = ontology.query({ type: 'Maze' })[0];
    const player = ontology.query({ type: 'Player' })[0];
    const reachable = ontology.objects.get('threat-field')?.ghostReachableSets || [];
    const queue = [{ x: player.x, y: player.y, tick: 0, path: [] }];
    const seen = new Set([`${player.x},${player.y},0`]);
    for (let index = 0; index < queue.length; index++) {
      const current = queue[index];
      if (current.x === target.x && current.y === target.y) return current.path;
      if (current.tick >= this.horizon) continue;
      const nextTick = current.tick + 1;
      const threats = new Set(reachable[Math.min(nextTick, reachable.length - 1)] || []);
      for (const [direction, dx, dy] of MOVES) {
        const x = current.x + dx, y = current.y + dy, state = `${x},${y},${nextTick}`;
        if (maze.grid[y]?.[x] !== 0 || threats.has(key(x, y)) || seen.has(state)) continue;
        seen.add(state);
        queue.push({ x, y, tick: nextTick, path: [...current.path, { direction, x, y, tick: nextTick }] });
      }
    }
    return [];
  }

  closestFood(ontology, foods) {
    const player = ontology.query({ type: 'Player' })[0];
    return [...foods].sort((a, b) => Math.abs(a.x - player.x) + Math.abs(a.y - player.y) - Math.abs(b.x - player.x) - Math.abs(b.y - player.y))[0];
  }

  staticDistance(ontology, start, target) {
    const maze = ontology.query({ type: 'Maze' })[0], queue = [{ x: start.x, y: start.y, d: 0 }], seen = new Set([key(start.x, start.y)]);
    for (let index = 0; index < queue.length; index++) { const current = queue[index]; if (current.x === target.x && current.y === target.y) return current.d; for (const [, dx, dy] of MOVES) { const x = current.x + dx, y = current.y + dy, k = key(x, y); if (maze.grid[y]?.[x] !== 0 || seen.has(k)) continue; seen.add(k); queue.push({ x, y, d: current.d + 1 }); } }
    return Infinity;
  }

  delta(direction) { const move = MOVES.find(item => item[0] === direction); return move ? [move[1], move[2]] : [0, 0]; }
  isTabu(state, direction) { return (this.stateActions.get(state)?.get(direction) || 0) >= 2; }
  remember(state, direction) { if (!this.stateActions.has(state)) this.stateActions.set(state, new Map()); const actions = this.stateActions.get(state); actions.set(direction, (actions.get(direction) || 0) + 1); if (this.stateActions.size > 80) this.stateActions.delete(this.stateActions.keys().next().value); }
}
