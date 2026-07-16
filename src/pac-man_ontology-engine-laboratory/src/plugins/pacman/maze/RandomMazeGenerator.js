import{SeededRandom}from'../random.js';
const CARDINAL=[[1,0],[-1,0],[0,1],[0,-1]];
export class RandomMazeGenerator{
  generate(width=21,height=19,seed=1){width|=1;height|=1;const rng=new SeededRandom(seed),grid=Array.from({length:height},()=>Array(width).fill(1)),stack=[[1,1]],dirs=[[2,0],[-2,0],[0,2],[0,-2]];grid[1][1]=0;
    while(stack.length){const[x,y]=stack.at(-1),next=dirs.map(([dx,dy])=>[x+dx,y+dy,dx,dy]).filter(([nx,ny])=>nx>0&&ny>0&&nx<width-1&&ny<height-1&&grid[ny][nx]).sort(()=>rng.next()-.5)[0];if(!next){stack.pop();continue}const[nx,ny,dx,dy]=next;grid[y+dy/2][x+dx/2]=grid[ny][nx]=0;stack.push([nx,ny])}
    this.braidDeadEnds(grid,width,height,rng,.82);
    for(let i=0;i<Math.floor(width*height*.12);i++){const x=1+Math.floor(rng.next()*(width-2)),y=1+Math.floor(rng.next()*(height-2));if(grid[y][x]&&CARDINAL.filter(([dx,dy])=>grid[y+dy]?.[x+dx]===0).length>=2)grid[y][x]=0}
    return{width,height,grid,generator:'BraidedRandomMazeGenerator',escapeBias:.82}}
  braidDeadEnds(grid,width,height,rng,ratio){const dead=[];for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++)if(grid[y][x]===0&&CARDINAL.filter(([dx,dy])=>grid[y+dy]?.[x+dx]===0).length===1)dead.push([x,y]);for(const[x,y]of dead)if(rng.next()<ratio){const options=[[2,0],[-2,0],[0,2],[0,-2]].filter(([dx,dy])=>x+dx>0&&y+dy>0&&x+dx<width-1&&y+dy<height-1&&grid[y+dy][x+dx]===0&&grid[y+dy/2][x+dx/2]===1);if(options.length){const[dx,dy]=options[Math.floor(rng.next()*options.length)];grid[y+dy/2][x+dx/2]=0}}}
}
