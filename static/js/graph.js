'use strict';
let mode = 'add';
let nextId = 1;
let firstNode = null;
const status = document.getElementById('status');
const directed = document.getElementById('directed');
const cy = cytoscape({
  container: document.getElementById('cy'),
  elements: [],
  layout: {name: 'preset'},
  style: [
    {selector: 'node', style: {'background-color':'#345fd6','label':'data(label)','color':'#fff','text-valign':'center','text-halign':'center','font-size':15,'width':44,'height':44,'border-width':2,'border-color':'#fff'}},
    {selector: 'edge', style: {'width':3,'line-color':'#647da9','target-arrow-color':'#647da9','target-arrow-shape':'none','curve-style':'bezier','label':'data(weight)','font-size':14,'color':'#172c52','text-background-color':'#fff','text-background-opacity':1,'text-background-padding':'4px'}},
    {selector: 'edge.curved', style: {'curve-style':'unbundled-bezier','control-point-distances':'data(curveDistance)','control-point-weights':0.5}},
    {selector: 'edge.directed', style: {'target-arrow-shape':'triangle'}},
    {selector: ':selected', style: {'overlay-color':'#ffc857','overlay-opacity':0.25,'border-color':'#ff9f1c','line-color':'#ff9f1c','target-arrow-color':'#ff9f1c'}},
    {selector: 'edge.path-solution', style: {'line-color':'#dc2626','target-arrow-color':'#dc2626','width':7,'z-index':12}},
    {selector: 'edge.solution', style: {'line-color':'#16a34a','target-arrow-color':'#16a34a','width':6,'z-index':10}},
    {selector: 'node.traversal-node', style: {'background-color':'#16a34a'}},
    {selector: 'node.traversal-active', style: {'border-color':'#f59e0b','border-width':6}},
    {selector: 'edge.traversal-edge', style: {'line-color':'#16a34a','target-arrow-color':'#16a34a','width':6}},
    {selector: '.pending', style: {'border-color':'#16a34a','border-width':5}}
  ]
});
function setEdgeShape(edge, shape){
  edge.data('shape', shape);
  edge.toggleClass('curved', shape === 'curved');
  if(shape === 'curved' && !Number.isFinite(Number(edge.data('curveDistance')))) edge.data('curveDistance', 65);
}
// Control manual de curvatura: el punto naranja se arrastra perpendicularmente
// al segmento entre los centros de los nodos. No cambia la topología ni los pesos.
const curveHandle=document.createElement('div');
curveHandle.className='curve-handle';
curveHandle.title='Arrastra para ajustar la curva';
curveHandle.setAttribute('aria-label','Control de curvatura');
document.getElementById('cy').appendChild(curveHandle);
let editingCurve=null;
function curveGeometry(edge){
  const a=edge.source().renderedPosition(),b=edge.target().renderedPosition();
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
  if(len<0.01)return null;
  return {mx:(a.x+b.x)/2,my:(a.y+b.y)/2,nx:-dy/len,ny:dx/len};
}
function refreshCurveHandle(){
  const edge=cy.edges(':selected').filter(e=>e.hasClass('curved')).first();
  if(!edge.length || mode!=='move'){curveHandle.style.display='none';editingCurve=null;return;}
  const g=curveGeometry(edge);
  if(!g){curveHandle.style.display='none';return;}
  editingCurve=edge;
  const distance=Number(edge.data('curveDistance'))||0;
  // Cytoscape unbundled-bezier uses distance in graph coordinates.
  const px=g.mx+g.nx*distance*cy.zoom();
  const py=g.my+g.ny*distance*cy.zoom();
  curveHandle.style.left=`${px}px`;curveHandle.style.top=`${py}px`;
  curveHandle.style.display='block';
}
curveHandle.addEventListener('pointerdown',ev=>{
  if(!editingCurve)return;
  ev.preventDefault();ev.stopPropagation();
  curveHandle.setPointerCapture(ev.pointerId);
  curveHandle.classList.add('dragging');
});
curveHandle.addEventListener('pointermove',ev=>{
  if(!curveHandle.hasPointerCapture(ev.pointerId)||!editingCurve)return;
  ev.preventDefault();ev.stopPropagation();
  const rect=document.getElementById('cy').getBoundingClientRect();
  const g=curveGeometry(editingCurve);if(!g)return;
  const x=ev.clientX-rect.left,y=ev.clientY-rect.top;
  const distance=((x-g.mx)*g.nx+(y-g.my)*g.ny)/cy.zoom();
  editingCurve.data('curveDistance',Math.max(-1200,Math.min(1200,Math.round(distance))));
  refreshCurveHandle();
});
function finishCurveDrag(ev){
  if(curveHandle.hasPointerCapture(ev.pointerId))curveHandle.releasePointerCapture(ev.pointerId);
  curveHandle.classList.remove('dragging');
}
curveHandle.addEventListener('pointerup',finishCurveDrag);
curveHandle.addEventListener('pointercancel',finishCurveDrag);
cy.on('select unselect add remove data position pan zoom','node, edge',refreshCurveHandle);
cy.on('pan zoom',refreshCurveHandle);

function setStatus(message){status.textContent = message;}
function updateStats(){
  document.getElementById('stats').textContent = `Nodos: ${cy.nodes().length} | Aristas: ${cy.edges().length}`;
  const nodes=document.getElementById('node-list');
  const edges=document.getElementById('edge-list');
  nodes.replaceChildren(); edges.replaceChildren();
  if(!cy.nodes().length)nodes.textContent='Sin nodos';
  cy.nodes().forEach(n=>{const item=document.createElement('div');item.textContent=n.data('label')||n.id();nodes.appendChild(item);});
  if(!cy.edges().length)edges.textContent='Sin aristas';
  cy.edges().forEach(e=>{
    const item=document.createElement('div');
    const source=cy.getElementById(e.data('source'));
    const target=cy.getElementById(e.data('target'));
    item.textContent=`${source.data('label')||source.id()} ${directed.checked?'→':'—'} ${target.data('label')||target.id()} (peso: ${e.data('weight')})`;
    edges.appendChild(item);
  });
  document.getElementById('graph-type').textContent=`Tipo: ${directed.checked?'Dirigido':'No dirigido'}`;
}
function setMode(next){mode=next;firstNode?.removeClass('pending');firstNode=null;for(const [id,name] of [['add-mode','add'],['edge-mode','edge'],['move-mode','move']])document.getElementById(id).classList.toggle('active',name===mode);refreshCurveHandle();setStatus({add:'Haz clic en un espacio vacío para crear un nodo.',edge:'Selecciona el nodo de origen y luego el destino.',move:'Arrastra los nodos o selecciona elementos para eliminarlos.'}[mode]);}
document.getElementById('add-mode').onclick=()=>setMode('add');
document.getElementById('edge-mode').onclick=()=>setMode('edge');
document.getElementById('move-mode').onclick=()=>setMode('move');
cy.on('tap', event=>{
  if(event.target===cy && mode==='add'){
    const id=String(nextId++);
    cy.add({group:'nodes',data:{id,label:`N${id}`},position:event.position});
    updateStats();setStatus(`Nodo N${id} creado.`);
  }
});
cy.on('tap','node',event=>{
  if(mode!=='edge')return;
  const node=event.target;
  if(!firstNode){firstNode=node;node.addClass('pending');setStatus(`Origen: ${node.data('label')}. Selecciona el destino.`);return;}
  const source=firstNode;source.removeClass('pending');firstNode=null;
  if(source.id()===node.id()){setStatus('No se permiten lazos en esta primera versión.');return;}
  const isDirected=directed.checked;
  const duplicate=cy.edges().some(e=>e.data('source')===source.id()&&e.data('target')===node.id()||(!isDirected&&e.data('source')===node.id()&&e.data('target')===source.id()));
  if(duplicate){setStatus('Esa conexión ya existe.');return;}
  const answer=document.getElementById('weighted').checked ? prompt(`Peso de ${source.data('label')} → ${node.data('label')}:`,'1') : '1';
  if(answer===null){setStatus('Conexión cancelada.');return;}
  const weight=Number(answer.trim());
  if(answer.trim()===''||!Number.isFinite(weight)||Math.abs(weight)>1e12){setStatus('Peso inválido: introduce un número entre -10¹² y 10¹².');return;}
  const shape='straight';
  const newEdge=cy.add({group:'edges',data:{id:`e${Date.now()}_${Math.random().toString(36).slice(2,8)}`,source:source.id(),target:node.id(),weight,shape,curveDistance:65},classes:isDirected?'directed':''});
  setEdgeShape(newEdge,shape);
  updateStats();setStatus('Arista creada. Selecciona otro nodo de origen.');
});
directed.addEventListener('change',()=>{updateStats();cy.edges().toggleClass('directed',directed.checked);setStatus(directed.checked?'Grafo dirigido activado.':'Grafo no dirigido activado.');});
// Doble clic (o doble toque) sobre una arista en modo Mover / seleccionar:
// alterna recta y curva. El punto naranja permite ajustar la curva.
let lastEdgeTap=null;
cy.on('tap','edge',event=>{
  if(mode!=='move')return;
  const edge=event.target;
  const now=Date.now();
  if(lastEdgeTap && lastEdgeTap.id===edge.id() && now-lastEdgeTap.time<350){
    lastEdgeTap=null;
    const curved=edge.hasClass('curved');
    setEdgeShape(edge,curved?'straight':'curved');
    if(!curved && (!Number.isFinite(Number(edge.data('curveDistance'))) || Number(edge.data('curveDistance'))===0)){
      edge.data('curveDistance',65);
    }
    cy.elements().unselect();
    edge.select();
    refreshCurveHandle();
    setStatus(curved?'Arista recta. Haz doble clic para convertirla en curva.':'Arista curva. Arrastra el punto naranja para ajustar su forma.');
  }else{
    lastEdgeTap={id:edge.id(),time:now};
  }
});
document.getElementById('delete-selected').onclick=()=>{const count=cy.$(':selected').length;cy.$(':selected').remove();firstNode=null;updateStats();setStatus(count?`${count} elemento(s) eliminado(s).`:'Selecciona primero un nodo o una arista.');};
document.getElementById('clear').onclick=()=>{if(!cy.elements().length||confirm('¿Eliminar todo el grafo?')){cy.elements().remove();nextId=1;firstNode=null;updateStats();setStatus('Grafo vacío.');}};
document.getElementById('validate').onclick=async()=>{
  const nodes=cy.nodes().map(n=>({id:n.id()}));
  const edges=cy.edges().map(e=>({source:e.data('source'),target:e.data('target'),weight:e.data('weight')}));
  try{const response=await fetch('/api/graph/validate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nodes,edges,directed:directed.checked})});const data=await response.json();setStatus(response.ok?`Grafo validado: ${data.nodes} nodos y ${data.edges} aristas.`:`Error: ${data.error}`);}catch(error){setStatus('No se pudo procesar el grafo.');}
};
cy.on('add remove data','node, edge',updateStats);
updateStats();

// Fase 2: resolver y reproducir pasos del árbol de expansión.
let mstResult = null;
let mstResults = null;
let mstObjective = "min";
let currentStep = 0;
const resultPanel = document.getElementById('result');
function resetSolution(){
  stopPlayback();
  mstResult = null;
  mstResults = null;
  currentStep = 0;
  cy.edges().removeClass('solution');
  resultPanel.hidden = true;
}
cy.on('add remove data position', 'node, edge', resetSolution);
directed.addEventListener('change', resetSolution);
function showStep(){
  if(!mstResult)return;
  cy.edges().removeClass('solution');
  const steps = mstResult.steps;
  const ids = currentStep === 0 ? [] : steps[currentStep-1].selected_ids;
  for(const id of ids){const edge=cy.getElementById(id);if(edge.length)edge.addClass('solution');}
  document.getElementById('step-counter').textContent = `Paso ${currentStep} de ${steps.length}`;
  document.getElementById('step-prev').disabled = currentStep === 0;
  document.getElementById('step-next').disabled = currentStep === steps.length;
  document.querySelectorAll('#step-rows tr').forEach((row,i)=>row.classList.toggle('current',i===currentStep-1));
}
document.getElementById('step-prev').onclick=()=>{currentStep=Math.max(0,currentStep-1);showStep();};
document.getElementById('step-next').onclick=()=>{currentStep=Math.min(mstResult.steps.length,currentStep+1);showStep();};
document.getElementById('step-all').onclick=()=>{currentStep=mstResult.steps.length;showStep();};
function renderMstObjective(objective){
  if(!mstResults)return;
  stopPlayback();
  mstObjective=objective;
  mstResult=mstResults[objective];
  const data=mstResult;
  document.getElementById('mst-view-min').classList.toggle('active',objective==='min');
  document.getElementById('mst-view-max').classList.toggle('active',objective==='max');
  document.getElementById('result-total').textContent=`${objective==='min'?'Árbol mínimo':'Árbol máximo'}: peso total ${data.total_weight} | Aristas seleccionadas: ${data.edge_count}`;
  const tbody=document.getElementById('step-rows');tbody.replaceChildren();
  for(const step of data.steps){
    const row=document.createElement('tr');
    for(const value of [step.iteration,`${step.source} — ${step.target}`,step.weight,step.accepted?'Aceptada':'Descartada',step.reason]){
      const td=document.createElement('td');td.textContent=String(value);row.appendChild(td);
    }
    tbody.appendChild(row);
  }
  currentStep=0;showStep();
}
document.getElementById('mst-view-min').onclick=()=>renderMstObjective('min');
document.getElementById('mst-view-max').onclick=()=>renderMstObjective('max');
document.getElementById('solve').onclick=async()=>{
  resetSolution();
  const nodes=cy.nodes().map(n=>({id:n.id()}));
  const edges=cy.edges().map(e=>({id:e.id(),source:e.data('source'),target:e.data('target'),weight:e.data('weight')}));
  const payload={nodes,edges,directed:directed.checked,algorithm:document.getElementById('algorithm').value};
  try{
    const response=await fetch('/api/graph/mst/both',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await response.json();
    if(!response.ok){setStatus(`No se puede resolver: ${data.error||'Error desconocido'}`);return;}
    mstResults=data;
    document.getElementById('result-title').textContent=data.algorithm==='prim'?'Prim':'Kruskal';
    for(const objective of ['min','max']){
      // La respuesta incluye los IDs de las aristas elegidas: recuperamos sus pesos
      // directamente del grafo para mostrar la operación en el mismo orden.
      const selectedWeights = data[objective].selected_ids.map(id => {
        const edge = cy.getElementById(id);
        return edge.length ? Number(edge.data('weight')) : null;
      });
      const sumElement = document.getElementById(`mst-${objective}-sum`);
      sumElement.textContent = selectedWeights.every(weight => weight !== null && Number.isFinite(weight))
        ? `${selectedWeights.map((weight, index) => index > 0 && weight < 0 ? `(${weight})` : String(weight)).join(' + ')} = ${data[objective].total_weight}`
        : 'No se pudieron recuperar los pesos de todas las aristas.';
      document.getElementById(`mst-${objective}-total`).textContent=data[objective].total_weight;
      document.getElementById(`mst-${objective}-count`).textContent=`${data[objective].edge_count} aristas seleccionadas`;
    }
    resultPanel.hidden=false;
    renderMstObjective('min');
    setStatus(`Árbol mínimo: ${data.min.total_weight}. Árbol máximo: ${data.max.total_weight}. Selecciona el procedimiento que deseas visualizar.`);
  }catch(error){setStatus('No se pudo procesar el grafo.');}
};

// Fase 3: caminos mínimos. Se mantiene intacto el editor y el módulo MST.
let pathResult=null, pathStep=0;
const pathPanel=document.getElementById('path-result');
function refreshPathNodes(){
  for(const id of ['path-source','path-target']){
    const select=document.getElementById(id), old=select.value;
    select.replaceChildren();
    for(const node of cy.nodes()){
      const option=document.createElement('option');option.value=node.id();option.textContent=node.data('label');select.appendChild(option);
    }
    if([...select.options].some(o=>o.value===old))select.value=old;
  }
}
function resetPath(){stopPlayback();pathResult=null;pathStep=0;pathPanel.hidden=true;cy.edges().removeClass('path-solution');}
cy.on('add remove data','node, edge',()=>{refreshPathNodes();resetPath();});
directed.addEventListener('change',resetPath);
refreshPathNodes();
function showPathStep(){
  if(!pathResult)return;
  const steps=pathResult.steps,step=pathStep>0?steps[pathStep-1]:null;
  document.getElementById('path-counter').textContent=`Paso ${pathStep} de ${steps.length}`;
  document.getElementById('path-prev').disabled=pathStep===0;
  document.getElementById('path-next').disabled=pathStep===steps.length;
  document.getElementById('path-action').textContent=step?step.action:'Estado inicial: comienza la reproducción.';
  const body=document.getElementById('path-rows');body.replaceChildren();
  for(const [id,d] of Object.entries(step?.distances||{})){
    const tr=document.createElement('tr');for(const value of [cy.getElementById(id).data('label')||id,d===null?'∞':d]){
      const td=document.createElement('td');td.textContent=String(value);tr.appendChild(td);
    }body.appendChild(tr);
  }
  cy.edges().removeClass('path-solution');
  if(pathStep===steps.length){for(const id of pathResult.edge_ids){cy.getElementById(id).addClass('path-solution');}}
  else if(step){for(const id of step.selected_ids){cy.getElementById(id).addClass('path-solution');}}
}
document.getElementById('path-prev').onclick=()=>{pathStep=Math.max(0,pathStep-1);showPathStep();};
document.getElementById('path-next').onclick=()=>{pathStep=Math.min(pathResult.steps.length,pathStep+1);showPathStep();};
document.getElementById('path-all').onclick=()=>{pathStep=pathResult.steps.length;showPathStep();};
document.getElementById('solve-path').onclick=async()=>{
  resetPath();
  const payload={nodes:cy.nodes().map(n=>({id:n.id()})),edges:cy.edges().map(e=>({id:e.id(),source:e.data('source'),target:e.data('target'),weight:e.data('weight')})),directed:directed.checked,algorithm:document.getElementById('path-algorithm').value,source:document.getElementById('path-source').value,target:document.getElementById('path-target').value};
  try{
    const response=await fetch('/api/graph/shortest-path',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await response.json();if(!response.ok){setStatus(`No se puede resolver: ${data.error||'Error desconocido'}`);return;}
    pathResult=data;pathPanel.hidden=false;
    document.getElementById('path-title').textContent={'dijkstra':'Dijkstra','bellman_ford':'Bellman-Ford','floyd_warshall':'Floyd-Warshall'}[data.algorithm];
    document.getElementById('path-summary').textContent=data.distance===null?'No existe camino entre los nodos seleccionados.':`Distancia total: ${data.distance} | Ruta: ${data.path.map(id=>cy.getElementById(id).data('label')||id).join(' → ')}`;
    const matrix=document.getElementById('path-matrix');matrix.replaceChildren();
    if(data.matrix){const heading=document.createElement('h3');heading.textContent='Matriz final de distancias (todos los pares)';matrix.appendChild(heading);
      const table=document.createElement('table'),head=document.createElement('tr'),ids=Object.keys(data.matrix);
      for(const label of ['Desde / Hasta',...ids]){const th=document.createElement('th');th.textContent=label;head.appendChild(th);}table.appendChild(head);
      for(const i of ids){const tr=document.createElement('tr');for(const val of [i,...ids.map(j=>data.matrix[i][j]===null?'∞':data.matrix[i][j])]){const td=document.createElement('td');td.textContent=String(val);tr.appendChild(td);}table.appendChild(tr);}const wrap=document.createElement('div');wrap.className='table-wrap';wrap.appendChild(table);matrix.appendChild(wrap);
    }
    pathStep=0;showPathStep();setStatus('Camino mínimo calculado. Usa los controles para explorar el procedimiento.');
  }catch(err){setStatus('No se pudo calcular el resultado.');}
};

// Fase 4: BFS, DFS, ciclos y ordenamiento topológico.
let traversalResult=null, traversalStep=0;
const traversalPanel=document.getElementById('traversal-result');
const traversalAlgorithm=document.getElementById('traversal-algorithm');
function refreshTraversalNodes(){
  const select=document.getElementById('traversal-source'), old=select.value;
  select.replaceChildren();
  cy.nodes().forEach(n=>{const option=document.createElement('option');option.value=n.id();option.textContent=n.data('label');select.appendChild(option);});
  if([...select.options].some(o=>o.value===old))select.value=old;
}
function resetTraversal(){stopPlayback();traversalResult=null;traversalStep=0;traversalPanel.hidden=true;cy.elements().removeClass('traversal-edge traversal-node traversal-active');}
cy.on('add remove data','node, edge',()=>{refreshTraversalNodes();resetTraversal();});
directed.addEventListener('change',resetTraversal);
traversalAlgorithm.addEventListener('change',()=>{document.getElementById('traversal-source-field').hidden=!['bfs','dfs'].includes(traversalAlgorithm.value);resetTraversal();});
refreshTraversalNodes();
function showTraversalStep(){
  if(!traversalResult)return;
  const steps=traversalResult.steps,step=traversalStep?steps[traversalStep-1]:null;
  document.getElementById('traversal-counter').textContent=`Paso ${traversalStep} de ${steps.length}`;
  document.getElementById('traversal-prev').disabled=traversalStep===0;
  document.getElementById('traversal-next').disabled=traversalStep===steps.length;
  document.getElementById('traversal-action').textContent=step?.action||'Presiona Siguiente para iniciar.';
  cy.elements().removeClass('traversal-edge traversal-node traversal-active');
  (step?.visited||[]).forEach(id=>cy.getElementById(id).addClass('traversal-node'));
  (step?.edge_ids||[]).forEach(id=>cy.getElementById(id).addClass('traversal-edge'));
  if(step?.active)cy.getElementById(step.active).addClass('traversal-active');
  document.querySelectorAll('#traversal-rows tr').forEach((r,i)=>r.classList.toggle('current',i===traversalStep-1));
}
document.getElementById('traversal-prev').onclick=()=>{traversalStep=Math.max(0,traversalStep-1);showTraversalStep();};
document.getElementById('traversal-next').onclick=()=>{traversalStep=Math.min(traversalResult.steps.length,traversalStep+1);showTraversalStep();};
document.getElementById('traversal-all').onclick=()=>{traversalStep=traversalResult.steps.length;showTraversalStep();};
document.getElementById('solve-traversal').onclick=async()=>{
  resetTraversal();
  const payload={nodes:cy.nodes().map(n=>({id:n.id()})),edges:cy.edges().map(e=>({id:e.id(),source:e.data('source'),target:e.data('target'),weight:e.data('weight')})),directed:directed.checked,algorithm:traversalAlgorithm.value,source:document.getElementById('traversal-source').value};
  try{
    const response=await fetch('/api/graph/traversal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await response.json();if(!response.ok){setStatus(`No se puede analizar: ${data.error||'Error desconocido'}`);return;}
    traversalResult=data;traversalPanel.hidden=false;
    document.getElementById('traversal-title').textContent={bfs:'BFS',dfs:'DFS',cycles:'Detección de ciclos',topological:'Ordenamiento topológico'}[data.algorithm];
    const labels=data.order.map(id=>cy.getElementById(id).data('label')||id).join(' → ');
    document.getElementById('traversal-summary').textContent=`${data.message}${labels?' | Orden / recorrido: '+labels:''}`;
    const body=document.getElementById('traversal-rows');body.replaceChildren();
    data.steps.forEach(step=>{const tr=document.createElement('tr');[step.iteration,step.action,step.visited.map(id=>cy.getElementById(id).data('label')||id).join(', ')].forEach(v=>{const td=document.createElement('td');td.textContent=String(v);tr.appendChild(td);});body.appendChild(tr);});
    traversalStep=0;showTraversalStep();setStatus(data.message);
  }catch(error){setStatus('No se pudo calcular el resultado.');}
};

// Fase 5: reproducción automática centralizada para los tres visualizadores.
let playbackTimer=null;
let playbackName=null;
function stopPlayback(){
  if(playbackTimer!==null)clearInterval(playbackTimer);
  playbackTimer=null;playbackName=null;
  document.querySelectorAll('.auto-controls').forEach(el=>{
    el.querySelector('.auto-play').disabled=false;
    el.querySelector('.auto-pause').disabled=true;
    el.querySelector('.auto-state').textContent='En pausa / listo';
  });
}
const players={
  step:{get:()=>mstResult,index:()=>currentStep,max:()=>mstResult?.steps.length||0,advance:()=>{currentStep++;showStep();},restart:()=>{currentStep=0;showStep();}},
  path:{get:()=>pathResult,index:()=>pathStep,max:()=>pathResult?.steps.length||0,advance:()=>{pathStep++;showPathStep();},restart:()=>{pathStep=0;showPathStep();}},
  traversal:{get:()=>traversalResult,index:()=>traversalStep,max:()=>traversalResult?.steps.length||0,advance:()=>{traversalStep++;showTraversalStep();},restart:()=>{traversalStep=0;showTraversalStep();}}
};
function play(name){
  const player=players[name], controls=document.querySelector(`[data-player="${name}"]`);
  if(!player.get()){setStatus('Primero ejecuta un algoritmo para reproducir sus pasos.');return;}
  stopPlayback();
  if(player.index()>=player.max())player.restart();
  if(player.max()===0){setStatus('Este resultado no tiene iteraciones para animar.');return;}
  playbackName=name;
  controls.querySelector('.auto-play').disabled=true;
  controls.querySelector('.auto-pause').disabled=false;
  controls.querySelector('.auto-state').textContent='Reproduciendo…';
  const tick=()=>{
    if(player.index()>=player.max()){stopPlayback();controls.querySelector('.auto-state').textContent='Reproducción terminada';return;}
    player.advance();
    if(player.index()>=player.max()){stopPlayback();controls.querySelector('.auto-state').textContent='Reproducción terminada';}
  };
  tick();
  if(playbackName===name)playbackTimer=setInterval(tick,Number(controls.querySelector('.auto-speed').value));
}
document.querySelectorAll('.auto-controls').forEach(controls=>{
  const name=controls.dataset.player;
  controls.querySelector('.auto-play').addEventListener('click',()=>play(name));
  controls.querySelector('.auto-pause').addEventListener('click',stopPlayback);
  controls.querySelector('.auto-speed').addEventListener('change',()=>{if(playbackName===name)play(name);});
});
for(const id of ['step-prev','step-next','step-all','path-prev','path-next','path-all','traversal-prev','traversal-next','traversal-all']){
  document.getElementById(id).addEventListener('click',stopPlayback);
}
