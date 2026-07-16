import { Engine } from '../../../engine/Engine.js';
import { PacmanPlugin } from '../PacmanPlugin.js';

export class BenchmarkRunner {
  async run({ baseSeed = 1, seeds = 2, ghostCount = 5, maxTicks = 600, rollouts = 6, planDepth = 6, weights = {}, onSeed, onTick } = {}) {
    const results = [];
    for (let index = 0; index < seeds; index++) {
      const engine = new Engine(new PacmanPlugin({ ghostCount, rollouts, planDepth, weights }), { seed: (baseSeed + index * 7919) >>> 0 });
      engine.init();
      const initial = engine.ontology.query({ where: object => object.type === 'Pellet' || object.type === 'PowerPellet' }).length;
      const positions = [];
      let ticks = 0, planningMs = 0, endgameTick = null;
      for (; ticks < maxTicks && engine.ontology.objects.get('game').status === 'running'; ticks++) {
        engine.step();
        planningMs += engine.diagnostics.executionTime || 0;
        const player = engine.ontology.query({ type: 'Player' })[0];
        positions.push(`${player.x},${player.y}`);
        const remainingNow = engine.ontology.query({ where: object => object.type === 'Pellet' || object.type === 'PowerPellet' }).length;
        if (endgameTick == null && remainingNow <= 5) endgameTick = ticks + 1;
        if ((ticks + 1) % 20 === 0) { onTick?.({ seed: index + 1, seeds, tick: ticks + 1, maxTicks, remaining: remainingNow }); await new Promise(resolve => setTimeout(resolve, 0)); }
      }
      let oscillations = 0;
      for (let n = 3; n < positions.length; n++) if (positions[n] === positions[n - 2] && positions[n - 1] === positions[n - 3]) oscillations++;
      const remaining = engine.ontology.query({ where: object => object.type === 'Pellet' || object.type === 'PowerPellet' }).length;
      results.push({ status: engine.ontology.objects.get('game').status, ticks, initial, remaining, eaten: initial - remaining, eatenRatio: (initial - remaining) / initial, foodPerTick: (initial - remaining) / Math.max(1, ticks), oscillations, endgameReached: endgameTick != null, endgameTick, planningMs: planningMs / Math.max(1, ticks) });
      onSeed?.(index + 1, seeds);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    const completed = results.filter(result => result.status === 'complete').length, gameovers = results.filter(result => result.status === 'gameover').length, capped = results.filter(result => result.status === 'running').length;
    const average = key => results.reduce((sum, result) => sum + result[key], 0) / results.length;
    return { seeds, completed, gameovers, capped, completionRate: completed / seeds, survivalRate: (seeds - gameovers) / seeds, endgameRate: results.filter(result => result.endgameReached).length / seeds, avgTicks: average('ticks'), avgRemaining: average('remaining'), eatenRatio: average('eatenRatio'), foodPerTick: average('foodPerTick'), oscillations: average('oscillations'), planningMs: average('planningMs'), maxTicks, results };
  }
}
