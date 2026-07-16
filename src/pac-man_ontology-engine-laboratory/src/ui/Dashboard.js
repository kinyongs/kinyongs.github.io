import { OntologyGraph } from './OntologyGraph.js';

const esc = value => String(value ?? '').replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]));
const pct = value => `${((value ?? 0) * 100).toFixed(0)}%`;

export class Dashboard {
  constructor(engine, visual) {
    this.engine = engine;
    this.visual = visual;
    this.graph = new OntologyGraph();
    this.tab = 'graph';
    document.querySelectorAll('[data-tab]').forEach(button => {
      button.onclick = () => {
        this.tab = button.dataset.tab;
        document.querySelectorAll('[data-tab]').forEach(item => item.classList.toggle('active', item === button));
        this.render();
      };
    });
  }

  render() {
    const engine = this.engine;
    this.visual.render(engine);
    document.querySelector('#status').textContent = engine.mode.toUpperCase();
    this.renderSemantic(engine.ontology);
    this.renderDynamic(engine);
    this.renderKinetic(engine);
    this.renderDebug(engine);
  }

  renderSemantic(ontology) {
    const body = document.querySelector('#semanticBody');
    if (this.tab === 'graph') {
      body.innerHTML = '<canvas class="ontology-graph"></canvas>';
      this.graph.render(body.querySelector('canvas'), ontology, { detailed: this.engine.mode === 'pause', diagnostics: this.engine.diagnostics });
    }
    if (this.tab === 'objects') body.innerHTML = `<table><tr><th>ID</th><th>TYPE</th><th>STATE</th></tr>${[...ontology.objects.values()].slice(-120).map(object => `<tr><td class="id">${esc(object.id)}</td><td class="type">${object.eventType || object.type}</td><td>${esc(object.x != null ? `(${object.x},${object.y})` : object.status || object.score || '—')}</td></tr>`).join('')}</table>`;
    if (this.tab === 'relationships') body.innerHTML = `<table><tr><th>TYPE</th><th>FROM → TO</th></tr>${[...ontology.relationships.values()].map(r => `<tr><td class="type">${r.type}</td><td>${esc(r.from)} → ${esc(r.to)}</td></tr>`).join('')}</table>`;
    if (this.tab === 'events') body.innerHTML = ontology.events.slice().reverse().map(event => `<div class="event"><b>${event.eventType}</b> · tick ${event.tick}<br>${esc(event.payload?.action?.type || event.payload?.outcome || 'ontology')}</div>`).join('');
  }

  renderDynamic(engine) {
    const diagnostics = engine.diagnostics;
    const plans = diagnostics.plans || [];
    const trail = diagnostics.mcTrail || [];
    const best = plans[0];
    const exact = diagnostics.exactFoodTarget;
    const target = diagnostics.foodTarget;
    const macro = diagnostics.macroAction;
    const progress = diagnostics.progressPlan;
    const recommendation = diagnostics.recommendation;
    document.querySelector('#dynamicBody').innerHTML = `
      <div class="card"><div class="label">Active planner</div><div class="value">${esc(diagnostics.currentPlanner || 'waiting')}<span class="score">${diagnostics.lastSimulationCount || 0} runs × ${diagnostics.depth || 0} ticks</span></div></div>
      ${macro ? `<div class="card intent"><div class="label">Macro intent</div><div class="value">${esc(macro.type)}</div><div class="plan-meta">${esc(macro.label || '')}${macro.targetId ? ` · target ${esc(macro.targetId)}` : ''}</div></div>` : ''}
      ${progress ? `<div class="card"><div class="label">Constrained progress</div><div class="value">${esc(progress.mode)} · ${esc(progress.goalId)}</div><div class="plan-meta">거리 ${Number.isFinite(progress.distance) ? progress.distance : '∞'} · 정체 ${progress.stagnation}/${progress.detourBudget} · 재계획 ${progress.replans}<br>안전 행동: ${progress.viableDirections.join(', ') || '없음'} · 시간축 경로: ${progress.path.slice(0, 8).map(step => step.direction[0]).join(' → ') || '안전한 경로 없음'}</div></div>` : ''}
      ${exact?.target ? `<div class="card"><div class="label">${esc(exact.mode)}</div><div class="value">${esc(exact.target.id)} · ${exact.distance} ticks away</div><div class="plan-meta">다음 경로: ${exact.path.slice(0, 8).map(step => step.direction[0]).join(' → ')}</div></div>` : target ? `<div class="card"><div class="label">Food cluster target</div><div class="value">Zone ${target.id} · ${target.count} pellets</div></div>` : ''}
      <div class="card"><div class="label">Why this move?</div><div class="value">${esc(diagnostics.selectionReason || '첫 틱을 실행하면 선택 이유가 표시됩니다.')}</div>${best?.average ? `<div class="plan-meta">먹이 +${best.average.food.toFixed(1)} · 도주 ${best.average.escape.toFixed(1)} · 위험 ${best.average.danger.toFixed(1)} · CVaR ${best.cvar?.toFixed(0)}</div>` : ''}</div>
      <div class="card"><div class="label">Recommended simultaneous tick</div><div class="value">${esc(recommendation?.type || 'waiting')} ${esc(recommendation?.playerDirection || '')}</div><div class="plan-meta">팩맨은 가능한 고스트 응답만 평가하며, 실제 고스트 선택은 이 결정 뒤에 독립적으로 추첨됩니다.</div></div>
      ${plans.map((plan, index) => `<div class="card"><span class="score">${Number(plan.score).toFixed(1)}</span><div class="label">Candidate ${index + 1}</div><div class="value">${esc(plan.name)} ${plan.adjacentFood ? '· PELLET' : ''} ${plan.guided ? '· PATH' : ''} ${plan.repeat ? `· REPEAT ${plan.repeat}` : ''}</div><div class="plan-meta">${plan.robust?.robustSafe ? 'ROBUST SAFE' : `충돌 위험 ${pct(plan.robust?.collisionRisk)}`} · 가능한 고스트 응답 ${plan.robust?.possibleResponses ?? 0}<br>${plan.visits ? `생존 ${plan.strategic?.survival ?? 0}틱 · 영역 ${plan.strategic?.safeArea ?? 0} · MC안전 ${pct(plan.safety)} · 최악20% ${plan.cvar.toFixed(0)} · 먹이 ${plan.average.food.toFixed(0)}` : ''}</div><div class="bar"><i style="width:${Math.max(6, 100 * (plan.safety ?? plan.confidence ?? 0))}%"></i></div></div>`).join('')}
      ${trail.length ? `<div class="label">Choice evolution · sampled → safe leader</div><div class="mc-trail">${trail.map((step, index) => `<div class="mc-step ${index === trail.length - 1 ? 'lead' : ''}">#${step.iteration}<b>${step.chosen[0]}→${step.leader[0]}</b>${step.reward <= -999999 ? 'X' : step.reward.toFixed(0)}</div>`).join('')}</div>` : ''}`;
  }

  renderKinetic(engine) {
    document.querySelector('#kineticBody').innerHTML = `<div class="card"><div class="label">Action queue</div><div class="value">${engine.actions.queue.length} pending</div></div>${engine.actions.history.slice(0, 8).map(item => `<div class="event"><b>${item.action.type}</b> P:${item.action.playerDirection || item.action.direction || ''}<span class="score">${item.duration.toFixed(2)} ms</span><br>Ghosts: ${(item.action.ghostMoves || []).map(move => move.direction[0]).join(' · ') || '—'} → ${item.event.eventType}</div>`).join('')}`;
  }

  renderDebug(engine) {
    const ontology = engine.ontology;
    const memory = performance.memory ? `${(performance.memory.usedJSHeapSize / 1048576).toFixed(1)} MB` : 'browser n/a';
    const cache = engine.plugin?.playerPlanner;
    const optimization = engine.diagnostics.optimization;
    const weights = optimization?.weights || engine.plugin?.weights || {};
    const optimizationHtml = optimization ? `<div class="card benchmark"><div class="label">End-to-end optimized · ${optimization.generations} generations</div><div class="value">완주 ${pct(optimization.metrics.completionRate)} · 끝 구간 ${pct(optimization.metrics.endgameRate)} · 생존 ${pct(optimization.metrics.survivalRate)}</div><div class="plan-meta">평균 남은 먹이 ${optimization.metrics.avgRemaining.toFixed(1)} · 평균 ${optimization.metrics.avgTicks.toFixed(0)}/${optimization.metrics.maxTicks} ticks<br>${Object.entries(weights).map(([key, value]) => `${key} ${value.toFixed(2)}`).join(' · ')}<br>${optimization.history.map(item => `G${item.generation} 완주${pct(item.completionRate)} 끝${pct(item.endgameRate)} 남음${item.avgRemaining.toFixed(1)}`).join(' → ')}</div></div>` : '';
    document.querySelector('#debugBody').innerHTML = `<div class="metrics">${[['TICK', engine.tick], ['SEED', engine.seed], ['OBJECTS', ontology.objects.size], ['RELATIONS', ontology.relationships.size], ['EVENTS', ontology.events.length], ['EXECUTION', `${(engine.diagnostics.executionTime || 0).toFixed(2)}ms`]].map(([key, value]) => `<div class="metric"><span class="label">${key}</span><strong>${value}</strong></div>`).join('')}</div>${optimizationHtml}<div class="log"><b>planner://</b> Robust Monte Carlo + optimized weights<br><b>safety://</b> hard constraint; never traded for reward<br><b>weights://</b> ${Object.keys(weights).length ? 'optimized profile active' : 'default profile'}<br><b>ghost-model://</b> reachable sets; actual action hidden until commit<br><b>cache://</b> ${cache?.cacheHits || 0} hits · ${cache?.transposition?.size || 0} states<br><b>simulation://</b> ${engine.diagnostics.simulations || 0} cloned futures<br><b>memory://</b> ${memory}<br>${(engine.diagnostics.reasoning || []).map(reason => `<b>reason://</b> ${esc(reason)}<br>`).join('')}</div>`;
  }
}
