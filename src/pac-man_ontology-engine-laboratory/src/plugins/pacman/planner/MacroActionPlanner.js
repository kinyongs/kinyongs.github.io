export class MacroActionPlanner{
  create({exact,selectedPlan,foodTarget}){if(!selectedPlan)return{type:'SURVIVE',label:'Find any survivable move',path:[]};if(exact?.target){const final=exact.mode==='FINAL PELLET HUNT';return{type:final?'HUNT_FINAL_PELLET':'GO_TO_FOOD',label:`${final?'Final hunt':'Food route'} → ${exact.target.id}`,targetId:exact.target.id,path:exact.path.map(p=>p.direction),remaining:exact.distance}}
    if(selectedPlan.strategic?.junctions>0)return{type:'ESCAPE_TO_JUNCTION',label:'Move toward a safe junction',path:[selectedPlan.direction]};return{type:'EXPAND_SAFE_AREA',label:`Expand safe area${foodTarget?` near zone ${foodTarget.id}`:''}`,path:[selectedPlan.direction]}}
}
