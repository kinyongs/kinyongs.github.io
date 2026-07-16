const DIRS=[['UP',0,-1],['DOWN',0,1],['LEFT',-1,0],['RIGHT',1,0]],OPPOSITE={UP:'DOWN',DOWN:'UP',LEFT:'RIGHT',RIGHT:'LEFT'};
export class GhostPlanner{
  constructor(rng){this.rng=rng;this.memory=new Map}
  recommend(engine,ghost){
    const world=engine.ontology,player=world.query({type:'Player'})[0],maze=world.query({type:'Maze'})[0],power=player.powerTicks>0;
    const mem=this.memory.get(ghost.id)||{visits:{},roamTarget:null,roamTicks:0,lastDirection:null};
    if(!mem.roamTarget||mem.roamTicks<=0||ghost.x===mem.roamTarget.x&&ghost.y===mem.roamTarget.y){const cells=[];for(let y=1;y<maze.height-1;y++)for(let x=1;x<maze.width-1;x++)if(maze.grid[y][x]===0)cells.push({x,y});mem.roamTarget=cells[Math.floor(this.rng.next()*cells.length)];mem.roamTicks=24+Math.floor(this.rng.next()*28)}
    const candidates=DIRS.filter(([,dx,dy])=>maze.grid[ghost.y+dy]?.[ghost.x+dx]===0).map(([direction,dx,dy])=>{const nx=ghost.x+dx,ny=ghost.y+dy,playerDist=Math.abs(nx-player.x)+Math.abs(ny-player.y),roamDist=Math.abs(nx-mem.roamTarget.x)+Math.abs(ny-mem.roamTarget.y),exits=DIRS.filter(([,a,b])=>maze.grid[ny+b]?.[nx+a]===0).length,visits=mem.visits[`${nx},${ny}`]||0;const pursue=power?playerDist:-playerDist*.7,score=pursue-roamDist*.42+exits*.7-visits*1.8+this.rng.next()*1.5;return{direction,score,weight:Math.exp(score*.42),nx,ny}});
    const usable=candidates.length>1?candidates.map(c=>({...c,weight:c.weight*(OPPOSITE[mem.lastDirection]===c.direction ? .18 : 1)})):candidates;
    const direction=this.rng.pickWeighted(usable.map(c=>({value:c.direction,weight:c.weight}))),chosen=usable.find(c=>c.direction===direction);
    mem.lastDirection=direction;mem.roamTicks--;if(chosen)mem.visits[`${chosen.nx},${chosen.ny}`]=(mem.visits[`${chosen.nx},${chosen.ny}`]||0)+1;
    if(Object.keys(mem.visits).length>80)for(const k of Object.keys(mem.visits))mem.visits[k]*=.6;
    this.memory.set(ghost.id,mem);
    return{action:{type:'moveGhost',id:ghost.id,direction},candidates,reason:power?'evade + roam across maze':'pursue + anti-loop roaming'};
  }
}
