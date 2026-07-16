import { PluginLoader } from './engine/plugin/PluginLoader.js';
import { PacmanPlugin } from './plugins/pacman/PacmanPlugin.js';
import { PacmanVisualization } from './plugins/pacman/PacmanVisualization.js';
import { Dashboard } from './ui/Dashboard.js';
import { WeightOptimizer } from './plugins/pacman/benchmark/WeightOptimizer.js';

const clamp = (value, min, max, fallback) => Math.max(min, Math.min(max, +value || fallback));
const plugin = new PacmanPlugin({ ghostCount: +document.querySelector('#ghostCount').value, rollouts: +document.querySelector('#rollouts').value, planDepth: +document.querySelector('#planDepth').value });
const engine = PluginLoader.load(plugin, { seed: +document.querySelector('#seed').value });
const dashboard = new Dashboard(engine, new PacmanVisualization(document.querySelector('#maze')));
engine.onChange(() => dashboard.render());
dashboard.render();

document.querySelector('#step').onclick = () => engine.step();
const autoSpeed = () => +document.querySelector('#autoSpeed').value;
document.querySelector('#auto').onclick = () => engine.start(autoSpeed());
document.querySelector('#autoSpeed').onchange = () => { if (engine.mode === 'auto') engine.start(autoSpeed()); };
document.querySelector('#pause').onclick = () => engine.pause();
document.querySelector('#reset').onclick = () => {
  plugin.ghostCount = clamp(document.querySelector('#ghostCount').value, 1, 8, 5);
  plugin.rollouts = clamp(document.querySelector('#rollouts').value, 16, 512, 96);
  plugin.planDepth = clamp(document.querySelector('#planDepth').value, 4, 60, 22);
  document.querySelector('#ghostCount').value = plugin.ghostCount;
  document.querySelector('#rollouts').value = plugin.rollouts;
  document.querySelector('#planDepth').value = plugin.planDepth;
  engine.reset(+document.querySelector('#seed').value);
};

document.querySelector('#benchmark').onclick = async event => {
  const button = event.currentTarget;
  button.disabled = true;
  engine.pause();
  try {
    const result = await new WeightOptimizer().optimize({
      baseSeed: +document.querySelector('#seed').value,
      ghostCount: plugin.ghostCount,
      initialWeights: plugin.weights,
      onProgress: progress => { button.textContent = progress.tick ? `G${progress.generation} C${progress.candidate} · S${progress.seed} T${progress.tick} F${progress.remaining}` : `OPT ${progress.generation}/${progress.generations} · ${progress.candidate}/${progress.populationSize}`; }
    });
    plugin.applyWeights(result.weights);
    engine.reset(+document.querySelector('#seed').value);
    engine.diagnostics.optimization = result;
    dashboard.render();
  } catch (error) {
    engine.diagnostics.reasoning = [`Weight optimization failed: ${error.message}`];
    dashboard.render();
  } finally {
    button.disabled = false;
    button.textContent = 'OPTIMIZE WEIGHTS';
  }
};

document.querySelector('#legend').innerHTML = '<span><i class="dot" style="background:#f3ce36"></i>Player</span><span><i class="dot" style="background:#ff568d"></i>Ghost Planner</span><span><i class="dot" style="background:#bdc6d4"></i>Ontology Object</span>';
