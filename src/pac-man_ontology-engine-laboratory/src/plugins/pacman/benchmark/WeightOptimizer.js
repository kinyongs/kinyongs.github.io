import { BenchmarkRunner } from './BenchmarkRunner.js';
import { DEFAULT_WEIGHTS } from '../planner/MonteCarloPlanner.js';

const KEYS = ['food', 'targetFood', 'escape', 'danger', 'revisit', 'time', 'completion', 'foodBias', 'escapeBias', 'adjacentFood', 'pathGuide', 'repeatAvoidance'];
const clamp = value => Math.max(0.25, Math.min(3, value));

export class WeightOptimizer {
  constructor() { this.runner = new BenchmarkRunner(); }

  async optimize({ baseSeed = 1, ghostCount = 5, generations = 2, populationSize = 3, seeds = 2, maxTicks = 600, initialWeights = {}, onProgress } = {}) {
    let randomState = (baseSeed ^ 0xa341316c) >>> 0;
    const random = () => ((randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0) / 4294967296);
    const baseline = { ...DEFAULT_WEIGHTS, ...initialWeights };
    let population = [baseline, ...Array.from({ length: populationSize - 1 }, () => this.mutate(baseline, 0.55, random))];
    const history = [];
    let best = null;

    for (let generation = 1; generation <= generations; generation++) {
      const evaluated = [];
      for (let candidate = 0; candidate < population.length; candidate++) {
        onProgress?.({ generation, generations, candidate: candidate + 1, populationSize, phase: 'evaluating' });
        const metrics = await this.runner.run({ baseSeed, seeds, ghostCount, maxTicks, rollouts: 6, planDepth: 6, weights: population[candidate], onTick: state => onProgress?.({ generation, generations, candidate: candidate + 1, populationSize, phase: 'end-to-end', ...state }) });
        const fitness = this.fitness(metrics);
        evaluated.push({ weights: population[candidate], metrics, fitness, feasible: metrics.gameovers === 0 });
      }
      evaluated.sort((a, b) => b.fitness - a.fitness);
      if (!best || evaluated[0].fitness > best.fitness) best = evaluated[0];
      history.push({ generation, bestFitness: evaluated[0].fitness, survivalRate: evaluated[0].metrics.survivalRate, completionRate: evaluated[0].metrics.completionRate, endgameRate: evaluated[0].metrics.endgameRate, eatenRatio: evaluated[0].metrics.eatenRatio, avgRemaining: evaluated[0].metrics.avgRemaining, weights: evaluated[0].weights });
      const elite = evaluated.slice(0, 2).map(item => item.weights);
      population = [elite[0], elite[1] || elite[0]];
      while (population.length < populationSize) population.push(this.mutate(elite[Math.floor(random() * elite.length)], 0.38 / generation, random));
    }
    return { ...best, baseline, history, generations, populationSize, seeds, applied: true };
  }

  fitness(metrics) {
    // Safety is a constraint: any death is penalized before efficiency can matter.
    const safetyPenalty = metrics.gameovers * 2_000_000;
    const completion = metrics.completionRate * 1_000_000;
    const endgame = metrics.endgameRate * 250_000;
    const remaining = metrics.eatenRatio * 100_000;
    const completionSpeed = metrics.completed ? -metrics.avgTicks * 80 : 0;
    return -safetyPenalty + completion + endgame + remaining + metrics.foodPerTick * 4_000 + completionSpeed - metrics.oscillations * 180 - metrics.planningMs * 0.2;
  }

  mutate(source, scale, random) {
    return Object.fromEntries(KEYS.map(key => [key, clamp((source[key] ?? 1) * Math.exp((random() * 2 - 1) * scale))]));
  }
}
