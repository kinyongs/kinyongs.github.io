import { RandomMazeGenerator } from './maze/RandomMazeGenerator.js';
import { SeededRandom } from './random.js';
import { GhostPlanner } from './planner/GhostPlanner.js';
import { MonteCarloPlanner } from './planner/MonteCarloPlanner.js';
import { SafetyAnalyzer } from './planner/SafetyAnalyzer.js';
import { FoodClusterPlanner } from './planner/FoodClusterPlanner.js';
import { ExactFoodPathPlanner } from './planner/ExactFoodPathPlanner.js';
import { RobustSafetyAnalyzer } from './planner/RobustSafetyAnalyzer.js';
import { MacroActionPlanner } from './planner/MacroActionPlanner.js';
import { ConstrainedProgressPlanner } from './planner/ConstrainedProgressPlanner.js';
import { SemanticAnalysisService } from '../../engine/semantic/SemanticAnalysisService.js';

const D = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0], STAY: [0, 0] };

export class PacmanPlugin {
  constructor({ ghostCount = 5, rollouts = 96, planDepth = 22, weights = {} } = {}) {
    this.name = 'Pac-Man Demonstration';
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
    if (this.playerPlanner) { Object.assign(this.playerPlanner.weights, this.weights); this.playerPlanner.transposition.clear(); }
  }

  install(engine) {
    engine.actions.register('gameOver', { validate: () => true, mutate: ({ ontology, action }) => { ontology.objects.get('game').status = 'gameover'; ontology.query({ type: 'Player' })[0].lives = 0; return { eventType: 'GameOverEvent', reason: action.reason || 'No collision-free move' }; } });
    engine.actions.register('advanceTick', {
      validate: ({ ontology, action }) => { const p = ontology.query({ type: 'Player' })[0], m = ontology.query({ type: 'Maze' })[0], [dx, dy] = D[action.playerDirection] || [0, 0]; return p && m?.grid[p.y + dy]?.[p.x + dx] === 0 && action.ghostMoves?.length === ontology.query({ type: 'Ghost' }).length; },
      mutate: ({ ontology, action }) => {
        const p = ontology.query({ type: 'Player' })[0], ghosts = ontology.query({ type: 'Ghost' }), oldP = { x: p.x, y: p.y }, oldG = ghosts.map(g => ({ x: g.x, y: g.y })), [dx, dy] = D[action.playerDirection];
        p.x += dx; p.y += dy; if (action.playerDirection !== 'STAY') p.direction = action.playerDirection;
        ghosts.forEach((ghost, index) => { const [gx, gy] = D[action.ghostMoves[index].direction]; ghost.x += gx; ghost.y += gy; ghost.direction = action.ghostMoves[index].direction; });
        const collision = ghosts.some((ghost, index) => ghost.x === p.x && ghost.y === p.y || oldG[index].x === p.x && oldG[index].y === p.y && ghost.x === oldP.x && ghost.y === oldP.y);
        if (collision) { ontology.objects.get('game').status = 'gameover'; p.lives = 0; return { eventType: 'GameOverEvent', reason: 'Ghost collision', playerDirection: action.playerDirection, ghostMoves: action.ghostMoves.map(move => move.direction), collision: true }; }
        const eaten = ontology.query({ where: object => (object.type === 'Pellet' || object.type === 'PowerPellet') && object.x === p.x && object.y === p.y })[0];
        if (eaten) { ontology.deleteObject(eaten.id); p.score += eaten.type === 'PowerPellet' ? 50 : 10; }
        if (!ontology.query({ where: object => object.type === 'Pellet' || object.type === 'PowerPellet' }).length) ontology.objects.get('game').status = 'complete';
        return { eventType: 'TickEvent', playerDirection: action.playerDirection, ghostMoves: action.ghostMoves.map(move => move.direction), eatenId: eaten?.id || null, collision: false, status: ontology.objects.get('game').status };
      }
    });
  }

  initialize(engine, seed) {
    this.playerRng = new SeededRandom((seed ^ 0x9e3779b9) >>> 0);
    this.ghostRng = new SeededRandom((seed ^ 0x85ebca6b) >>> 0);
    this.ghostPlanner = new GhostPlanner(this.ghostRng);
    this.playerPlanner = new MonteCarloPlanner(this.playerRng, { rollouts: this.rollouts, depth: this.planDepth, weights: this.weights });
    this.safetyAnalyzer = new SafetyAnalyzer(); this.robustSafety = new RobustSafetyAnalyzer(); this.macroPlanner = new MacroActionPlanner();
    this.progressPlanner = new ConstrainedProgressPlanner({ horizon: Math.min(14, Math.max(8, this.planDepth)), detourBudget: 6 });
    this.foodPlanner = new FoodClusterPlanner(); this.exactFoodPlanner = new ExactFoodPathPlanner(); this.semanticAnalysis = new SemanticAnalysisService();
    this.recentPlayerPositions = []; this.lockedFoodId = null;
    const ontology = engine.ontology, maze = this.mazeGenerator.generate(23, 21, seed);
    ontology.createObject('Game', { status: 'running', level: 1 }, 'game'); ontology.createObject('Maze', maze, 'maze'); ontology.createRelationship('contains', 'game', 'maze');
    const player = ontology.createObject('Player', { x: 1, y: 1, score: 0, lives: 1, direction: 'RIGHT' }, 'player'); ontology.createRelationship('locatedIn', player.id, 'maze');
    let foodIndex = 0; const cells = [];
    for (let y = 1; y < maze.height - 1; y++) for (let x = 1; x < maze.width - 1; x++) if (maze.grid[y][x] === 0) { cells.push({ x, y }); if (!(x === 1 && y === 1)) { const power = x === 1 && y === maze.height - 2 || x === maze.width - 2 && y === 1, food = ontology.createObject(power ? 'PowerPellet' : 'Pellet', { x, y }, `food-${foodIndex++}`); ontology.createRelationship('locatedIn', food.id, 'maze'); } }
    const far = cells.filter(cell => Math.abs(cell.x - 1) + Math.abs(cell.y - 1) > Math.floor((maze.width + maze.height) * .35));
    for (let index = 0; index < this.ghostCount; index++) { const spot = far[Math.floor(index * far.length / this.ghostCount)] || far[index % far.length], ghost = ontology.createObject('Ghost', { x: spot.x, y: spot.y, homeX: spot.x, homeY: spot.y, direction: 'LEFT', color: ['#ff568d', '#37d5ff', '#ff9f43', '#c98cff', '#56e39f', '#ff665f', '#8da2ff', '#f38fff'][index % 8] }, `ghost-${index + 1}`); ontology.createRelationship('locatedIn', ghost.id, 'maze'); }
    this.semanticAnalysis.install(ontology, maze);
    ontology.createObject('PlanningGoal', { status: 'waiting' }, 'planning-goal');
    ontology.createObject('SafetyEnvelope', { viableDirections: [] }, 'safety-envelope');
    ontology.createObject('TimeExpandedPath', { steps: [] }, 'time-expanded-path');
    ontology.createObject('ProgressState', { stagnation: 0, detourBudget: 6, tabuRecords: 0 }, 'progress-state');
    ontology.createRelationship('constrains', 'safety-envelope', 'planning-goal'); ontology.createRelationship('targets', 'planning-goal', 'time-expanded-path'); ontology.createRelationship('measures', 'progress-state', 'time-expanded-path');
    this.recompute(engine);
    ontology.storeEvent('SpawnEvent', { tick: 0, domain: 'pacman', seed, ghostCount: this.ghostCount, rollouts: this.rollouts, planDepth: this.planDepth, randomStreams: ['player-private', 'ghost-private'] });
  }

  recompute(engine) {
    const ontology = engine.ontology, maze = ontology.query({ type: 'Maze' })[0]; ontology.clearRelationships('adjacent'); ontology.clearRelationships('collidedWith');
    for (const actor of ontology.query({ where: object => object.type === 'Player' || object.type === 'Ghost' })) for (const [direction, [dx, dy]] of Object.entries(D)) if (direction !== 'STAY' && maze.grid[actor.y + dy]?.[actor.x + dx] === 0) ontology.createRelationship('adjacent', actor.id, `cell:${actor.x + dx},${actor.y + dy}`, { direction });
    this.semanticAnalysis?.update(ontology, engine.tick);
    this.syncPlanningSemantics(ontology, engine.diagnostics.progressPlan);
  }

  syncPlanningSemantics(ontology, progress) {
    if (!progress) return;
    Object.assign(ontology.objects.get('planning-goal'), { status: progress.mode, targetId: progress.goalId, target: progress.goal, distance: progress.distance });
    Object.assign(ontology.objects.get('safety-envelope'), { viableDirections: progress.viableDirections, guaranteed: progress.mode !== 'NO_GUARANTEE', tick: ontology.objects.get('threat-field')?.tick });
    Object.assign(ontology.objects.get('time-expanded-path'), { steps: progress.path, horizon: this.progressPlanner.horizon, targetId: progress.goalId });
    Object.assign(ontology.objects.get('progress-state'), { stagnation: progress.stagnation, detourBudget: progress.detourBudget, replans: progress.replans, tabuRecords: progress.tabuRecords });
  }

  nextAction(engine) {
    if (engine.ontology.objects.get('game').status !== 'running') return null;
    const ontology = engine.ontology, target = this.foodPlanner.select(ontology), exact = this.exactFoodPlanner.plan(ontology, { targetKeys: target.targetKeys, recentKeys: this.recentPlayerPositions, preferredId: this.progressPlanner.goalId || this.lockedFoodId });
    const mc = this.playerPlanner.recommend(engine, { targetKeys: target.targetKeys }), player = ontology.query({ type: 'Player' })[0], foods = new Set(ontology.query({ where: object => object.type === 'Pellet' || object.type === 'PowerPellet' }).map(food => `${food.x},${food.y}`)), recentCount = new Map();
    for (const position of this.recentPlayerPositions) recentCount.set(position, (recentCount.get(position) || 0) + 1);
    const analyzed = mc.plans.map(plan => { const [dx, dy] = D[plan.direction], nextKey = `${player.x + dx},${player.y + dy}`; return { ...plan, strategic: this.safetyAnalyzer.analyze(ontology, plan.direction, Math.min(12, this.planDepth)), robust: this.robustSafety.evaluate(ontology, plan.direction), nextKey, repeat: recentCount.get(nextKey) || 0, adjacentFood: foods.has(nextKey), guided: plan.direction === exact.direction }; });
    const maxSurvival = Math.max(...analyzed.map(plan => plan.strategic.survival)); analyzed.sort((a, b) => this.comparePlans(a, b, maxSurvival));
    const progress = this.progressPlanner.recommend(ontology, analyzed, exact.target); let selected = progress.selected, fallback = progress.mode === 'NO_GUARANTEE';
    if (!selected) { const stay = this.robustSafety.evaluate(ontology, 'STAY'); selected = { direction: 'STAY', robust: stay, strategic: { survival: 1, safeArea: 1, junctions: 0, trapRisk: 0 }, score: 0, cvar: 0, safety: 1, average: { food: 0, escape: 0, danger: 0 }, visits: 0, repeat: 1 }; fallback = !stay.robustSafe; }
    this.lockedFoodId = progress.goalId;
    const macro = this.macroPlanner.create({ exact: { ...exact, target: ontology.objects.get(progress.goalId) || exact.target }, selectedPlan: selected, foodTarget: target.selected });
    Object.assign(engine.diagnostics, { currentPlanner: 'Safety Shield + Persistent Goal + Time-expanded Path', ghostMovesLocked: null, foodTarget: target.selected, exactFoodTarget: exact, macroAction: macro, progressPlan: progress, plans: analyzed.map(plan => ({ name: `Player ${plan.direction}`, direction: plan.direction, score: plan.score, cvar: plan.cvar, visits: plan.visits, confidence: plan.confidence, safety: plan.safety, average: plan.average, collisions: plan.collisions, strategic: plan.strategic, robust: plan.robust, repeat: plan.repeat, adjacentFood: plan.adjacentFood, guided: plan.guided })), mcTrail: mc.trail, lastSimulationCount: mc.simulations, depth: mc.depth });
    engine.diagnostics.simulations += mc.simulations;
    engine.diagnostics.reasoning = [`Safety shield: ${progress.viableDirections?.join(', ') || 'no guaranteed direction'}`, `Persistent goal: ${progress.goalId || 'none'}`, `Progress mode: ${progress.mode}`, `Stagnation: ${progress.stagnation || 0}/${progress.detourBudget || 0}`];
    engine.diagnostics.selectionReason = `${selected.direction} 선택: ${progress.mode} · 목표 ${progress.goalId || '없음'} · 거리 ${Number.isFinite(progress.distance) ? progress.distance : '∞'} · 정체 ${progress.stagnation || 0}/${progress.detourBudget || 0}. 실제 고스트 선택은 아직 비공개.${fallback ? ' 안전 보장 불가; 충돌 시 Game Over.' : ''}`;
    const ghosts = ontology.query({ type: 'Ghost' }), ghostMoves = ghosts.map(ghost => this.ghostPlanner.recommend(engine, ghost)).map((plan, index) => ({ id: ghosts[index].id, direction: plan.action.direction }));
    return { type: 'advanceTick', playerDirection: selected.direction, ghostMoves };
  }

  comparePlans(a, b, maxSurvival) { if (a.robust.robustSafe !== b.robust.robustSafe) return b.robust.robustSafe - a.robust.robustSafe; if (a.robust.collisionRisk !== b.robust.collisionRisk) return a.robust.collisionRisk - b.robust.collisionRisk; if (Math.abs(a.strategic.survival - b.strategic.survival) > 1) return b.strategic.survival - a.strategic.survival; const nearA = a.strategic.survival >= maxSurvival - 1, nearB = b.strategic.survival >= maxSurvival - 1; if (nearA !== nearB) return nearB - nearA; if (a.strategic.trapRisk !== b.strategic.trapRisk) return a.strategic.trapRisk - b.strategic.trapRisk; return this.planUtility(b) - this.planUtility(a); }
  planUtility(plan) { const w = this.playerPlanner.weights; return (plan.adjacentFood ? 100 * w.adjacentFood : 0) + (plan.guided ? 55 * w.pathGuide : 0) - plan.repeat * 45 * w.repeatAvoidance + plan.strategic.safeArea * .5 + plan.safety * 1000 + plan.cvar * .001 + plan.score * .0005; }
  afterAction(engine) {
    const ontology = engine.ontology, game = ontology.objects.get('game'), player = ontology.query({ type: 'Player' })[0];
    this.recentPlayerPositions.push(`${player.x},${player.y}`); if (this.recentPlayerPositions.length > 16) this.recentPlayerPositions.shift();
    if (this.lockedFoodId && !ontology.objects.has(this.lockedFoodId)) this.lockedFoodId = null;
    if (this.progressPlanner.goalId && !ontology.objects.has(this.progressPlanner.goalId)) { this.progressPlanner.goalId = null; Object.assign(ontology.objects.get('planning-goal'), { status: 'achieved', targetId: null, distance: 0 }); Object.assign(ontology.objects.get('time-expanded-path'), { steps: [], targetId: null }); }
    if (game.status !== 'running') engine.pause(); else if (engine.mode === 'pause') engine.notify();
  }
}
