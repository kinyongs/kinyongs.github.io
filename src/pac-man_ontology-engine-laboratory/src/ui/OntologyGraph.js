export class OntologyGraph {
  render(canvas, ontology, { detailed = false, diagnostics = {} } = {}) {
    const ratio = devicePixelRatio || 1, context = canvas.getContext('2d'), width = canvas.clientWidth, height = canvas.clientHeight;
    canvas.width = width * ratio; canvas.height = height * ratio; context.scale(ratio, ratio);
    const topology = ontology.objects.get('topology'), threat = ontology.objects.get('threat-field'), safe = ontology.objects.get('safe-zone-summary'), escape = ontology.objects.get('escape-route-summary'), food = ontology.objects.get('food-cluster-summary'), player = ontology.query({ type: 'Player' })[0], ghosts = ontology.query({ type: 'Ghost' }), semanticGoal = ontology.objects.get('planning-goal'), semanticSafety = ontology.objects.get('safety-envelope'), semanticPath = ontology.objects.get('time-expanded-path'), semanticProgress = ontology.objects.get('progress-state'), progress = diagnostics.progressPlan;
    const summaryNodes = [
      ['game', 'Game', `tick ${threat?.tick ?? 0}`, '#37d5ff'], ['maze', 'Maze', `${topology?.counts?.walkable || 0} cells`, '#6c8cff'], ['topology', 'Topology', 'static · cached', '#56e39f'],
      ['threat', 'ThreatField', `${Math.max(0, (threat?.ghostReachableSets?.length || 1) - 1)} tick horizon`, '#ff568d'], ['network', 'Junction/Corridor', `${topology?.counts?.junctions || 0}/${topology?.counts?.corridors || 0}`, '#56e39f'],
      ['zones', 'Zone/Bottleneck', `${topology?.counts?.zones || 0}/${topology?.counts?.bottlenecks || 0}`, '#56e39f'], ['safe', 'SafeZone', `${safe?.count || 0} · max ${safe?.largestSize || 0}`, '#f3ce36'],
      ['escape', 'EscapeRoute', `${escape?.count || 0} junctions`, '#f3ce36'], ['food', 'FoodCluster', `${food?.count || 0} · ${food?.remainingFood || 0} food`, '#c98cff'],
      ['actors', 'Actors', `P ${player?.score || 0} · G ${ghosts.length}`, '#37d5ff'], ['events', 'Events', `${ontology.events.length} stored`, '#738097']
    ];
    const detailNodes = detailed ? [
      ['shield', 'Safety Shield', `${semanticSafety?.viableDirections?.length || 0} viable`, '#ff665f'], ['goal', 'Persistent Goal', semanticGoal?.targetId || 'waiting', '#f3ce36'],
      ['timepath', 'Time Path', `${semanticPath?.steps?.length || 0} states`, '#37d5ff'], ['progress', 'Progress', `stall ${semanticProgress?.stagnation || 0}/${semanticProgress?.detourBudget || 0}`, '#56e39f'],
      ['tabu', 'Cycle Guard', `${semanticProgress?.tabuRecords || 0} records`, '#c98cff'], ['responses', 'Ghost Responses', `${diagnostics.plans?.[0]?.robust?.possibleResponses || 0} combos`, '#ff568d'],
      ['candidates', 'Candidates', `${diagnostics.plans?.length || 0} actions`, '#6c8cff'], ['macro', 'Macro Intent', diagnostics.macroAction?.type || 'waiting', '#f3ce36']
    ] : [];
    const rawNodes = detailed ? [...summaryNodes.slice(0, 4), ...detailNodes, ...summaryNodes.slice(4)] : summaryNodes;
    const columns = detailed ? 4 : 3, rows = Math.ceil(rawNodes.length / columns), marginX = 6, top = 18, cellWidth = (width - marginX * 2) / columns, cellHeight = (height - top - 8) / rows;
    const nodes = rawNodes.map((node, index) => ({ id: node[0], label: node[1], sub: node[2], color: node[3], x: marginX + cellWidth * (index % columns + .5), y: top + cellHeight * (Math.floor(index / columns) + .5) }));
    const edgePairs = detailed ? [['game', 'maze'], ['maze', 'topology'], ['maze', 'threat'], ['threat', 'shield'], ['shield', 'goal'], ['goal', 'timepath'], ['timepath', 'progress'], ['progress', 'tabu'], ['threat', 'responses'], ['responses', 'candidates'], ['candidates', 'macro'], ['topology', 'network'], ['topology', 'zones'], ['threat', 'safe'], ['safe', 'escape'], ['threat', 'food'], ['game', 'actors'], ['game', 'events']] : [['game', 'maze'], ['maze', 'topology'], ['maze', 'threat'], ['topology', 'network'], ['topology', 'zones'], ['threat', 'safe'], ['safe', 'escape'], ['threat', 'food'], ['game', 'actors'], ['game', 'events']];
    context.clearRect(0, 0, width, height); context.textAlign = 'center';
    for (const [from, to] of edgePairs) { const a = nodes.find(node => node.id === from), b = nodes.find(node => node.id === to); if (!a || !b) continue; context.strokeStyle = '#344156'; context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke(); }
    const nodeWidth = Math.min(detailed ? 70 : 86, cellWidth - 5), nodeHeight = detailed ? 25 : 29;
    for (const node of nodes) { context.shadowColor = node.color; context.shadowBlur = 6; context.fillStyle = '#111925'; context.strokeStyle = node.color; context.beginPath(); context.roundRect(node.x - nodeWidth / 2, node.y - nodeHeight / 2, nodeWidth, nodeHeight, 5); context.fill(); context.stroke(); context.shadowBlur = 0; context.fillStyle = '#e6edf7'; context.font = `600 ${detailed ? 7 : 8}px system-ui`; context.fillText(this.trim(node.label, detailed ? 16 : 20), node.x, node.y - 1); context.fillStyle = '#738097'; context.font = `${detailed ? 6 : 7}px monospace`; context.fillText(this.trim(node.sub, detailed ? 18 : 24), node.x, node.y + 8); }
  }
  trim(value, max) { const text = String(value ?? ''); return text.length > max ? `${text.slice(0, max - 1)}…` : text; }
}
