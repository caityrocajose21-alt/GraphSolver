'use strict';
/* Motor local de GraphSolver: sustituye las siete rutas Flask, sin comunicaciones de red. */
(() => {
  const fail = message => { throw Error(message); };
  const number = x => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= 1e12;
  const check = (test, message) => {if (!test) fail(message);};
  function basic(d, maxN=500, maxE=20000){
    check(d && Array.isArray(d.nodes) && Array.isArray(d.edges), 'Nodos y aristas deben ser listas.');
    check(d.nodes.length<=maxN && d.edges.length<=maxE,'El grafo supera el límite de tamaño permitido.');
    const ids=d.nodes.map(n=>n?.id);
    check(ids.every(id=>typeof id==='string'&&id.length>0)&&new Set(ids).size===ids.length,'Identificadores de nodos inválidos o duplicados.');
    const idset=new Set(ids),eids=new Set();
    for(const e of d.edges){
      check(e && idset.has(e.source) && idset.has(e.target),'Una arista contiene extremos inexistentes.');
      check(number(e.weight),'Peso inválido.');
      if(e.id!==undefined){check(typeof e.id==='string' && e.id.length>0 && !eids.has(e.id),'Identificador de arista inválido o duplicado.');eids.add(e.id);}
    }
    return ids;
  }
  function validate(d){
    check(d && Array.isArray(d.nodes)&&Array.isArray(d.edges),'Formato de grafo inválido');
    const ids=d.nodes.map(n=>n?.id);check(new Set(ids).size===ids.length && ids.every(x=>x!==undefined),'Los nodos deben tener identificadores únicos');
    for(const e of d.edges){check(ids.includes(e?.source)&&ids.includes(e?.target),'Hay una arista con extremos inexistentes');check(number(e.weight),'Todos los pesos deben ser números válidos');}
    return {valid:true,nodes:ids.length,edges:d.edges.length};
  }
  function mst(d){
    const ids=basic(d);check(ids.length>0,'Agrega al menos un nodo.');
    check(['prim','kruskal'].includes(d.algorithm)&&['min','max'].includes(d.objective),'Algoritmo u objetivo inválido.');
    check(d.directed===false,'Prim y Kruskal requieren un grafo no dirigido.');
    check(d.edges.every(e=>e.source!==e.target&&typeof e.id==='string'),'Las aristas deben unir nodos existentes y distintos.');
    const ordered=d.edges.map((e,i)=>({...e,order:i}));
    const sort=(a,b)=>(d.objective==='min'?1:-1)*(a.weight-b.weight)||a.order-b.order;
    const chosen=[],steps=[];
    const record=(e,accepted,reason)=>steps.push({iteration:steps.length+1,edge_id:e.id,source:e.source,target:e.target,weight:e.weight,accepted,reason,selected_ids:chosen.map(x=>x.id)});
    if(d.algorithm==='kruskal'){
      const parent=new Map(ids.map(x=>[x,x]));const rank=new Map(ids.map(x=>[x,0]));
      const root=x=>{while(parent.get(x)!==x){parent.set(x,parent.get(parent.get(x)));x=parent.get(x);}return x;};
      for(const e of ordered.sort(sort)){
        let a=root(e.source),b=root(e.target),accepted=a!==b;
        if(accepted){if(rank.get(a)<rank.get(b))[a,b]=[b,a];parent.set(b,a);if(rank.get(a)===rank.get(b))rank.set(a,rank.get(a)+1);chosen.push(e);}
        record(e,accepted,accepted?'Se agrega sin formar un ciclo.':'Se descarta porque formaría un ciclo.');
        if(chosen.length===ids.length-1)break;
      }
    } else {
      const visited=new Set([ids[0]]);
      while(visited.size<ids.length){const options=ordered.filter(e=>visited.has(e.source)!==visited.has(e.target)).sort(sort);if(!options.length)break;
        const e=options[0];visited.add(e.source);visited.add(e.target);chosen.push(e);record(e,true,'Se elige la mejor arista que conecta un nodo nuevo.');
      }
    }
    check(chosen.length===ids.length-1,'El grafo no es conexo: no existe un árbol que cubra todos los nodos.');
    return {algorithm:d.algorithm,objective:d.objective,total_weight:chosen.reduce((s,e)=>s+e.weight,0),selected_ids:chosen.map(e=>e.id),steps,node_count:ids.length,edge_count:chosen.length};
  }
  function paths(d){
    check(['dijkstra','bellman_ford','floyd_warshall'].includes(d.algorithm),'Algoritmo inválido.');
    check(typeof d.directed==='boolean','Formato de grafo inválido.');
    const ids=basic(d,150,5000);check(ids.length>0,'Agrega al menos un nodo.');
    const {source,target}=d;check(ids.includes(source)&&ids.includes(target),'Selecciona un origen y un destino válidos.');
    check(d.edges.every(e=>e.source!==e.target && e.id),'Arista con identificador o extremos inválidos.');
    const arcs=d.edges.flatMap(e=>d.directed?[e]:[e,{...e,source:e.target,target:e.source}]);
    if(d.algorithm==='dijkstra')check(arcs.every(e=>e.weight>=0),'Dijkstra no admite pesos negativos.');
    const steps=[];
    const snap=(action,dist,selected_ids=[])=>steps.push({iteration:steps.length+1,action,distances:Object.fromEntries(ids.map(id=>[id,Number.isFinite(dist[id])?Number(dist[id].toFixed(8)):null])),selected_ids});
    const route=prev=>{if(source===target)return [[source],[]];if(!prev[target])return [[],[]];let cur=target,p=[cur],chosen=[],seen=new Set();while(cur!==source){if(seen.has(cur)||!prev[cur])return [[],[]];seen.add(cur);const [u,eid]=prev[cur];p.push(u);chosen.push(eid);cur=u;}return [p.reverse(),chosen.reverse()];};
    let dist=Object.fromEntries(ids.map(x=>[x,Infinity]));dist[source]=0;let prev={};
    if(d.algorithm==='dijkstra'){
      const adj=Object.fromEntries(ids.map(id=>[id,[]]));arcs.forEach(e=>adj[e.source].push(e));
      const heap=[[0,source]],done=new Set();snap('Inicializar origen con distancia 0.',dist);
      while(heap.length){heap.sort((a,b)=>a[0]-b[0]||a[1].localeCompare(b[1]));const [dv,u]=heap.shift();if(done.has(u))continue;done.add(u);snap(`Visitar ${u} con distancia ${dv}.`,dist);
        for(const e of adj[u])if(dv+e.weight<dist[e.target]){dist[e.target]=dv+e.weight;prev[e.target]=[u,e.id];heap.push([dist[e.target],e.target]);snap(`Relajar ${u} → ${e.target} (peso ${e.weight}).`,dist,[e.id]);}
      }
    }else if(d.algorithm==='bellman_ford'){
      snap('Inicializar distancias.',dist);
      for(let i=0;i<ids.length-1;i++){let changed=false;for(const e of arcs)if(Number.isFinite(dist[e.source])&&dist[e.source]+e.weight<dist[e.target]){dist[e.target]=dist[e.source]+e.weight;prev[e.target]=[e.source,e.id];changed=true;snap(`Iteración ${i+1}: relajar ${e.source} → ${e.target}.`,dist,[e.id]);}if(!changed)break;}
      check(!arcs.some(e=>Number.isFinite(dist[e.source])&&dist[e.source]+e.weight<dist[e.target]),'Existe un ciclo negativo alcanzable desde el origen; no hay distancias mínimas definidas.');
    }else{
      const dm=Object.fromEntries(ids.map(i=>[i,Object.fromEntries(ids.map(j=>[j,i===j?0:Infinity]))]));const nxt=Object.fromEntries(ids.map(i=>[i,{}]));
      for(const e of arcs)if(e.weight<dm[e.source][e.target]){dm[e.source][e.target]=e.weight;nxt[e.source][e.target]=[e.target,e.id];}
      for(const k of ids){for(const i of ids)for(const j of ids)if(Number.isFinite(dm[i][k])&&Number.isFinite(dm[k][j])&&dm[i][k]+dm[k][j]<dm[i][j]){dm[i][j]=dm[i][k]+dm[k][j];nxt[i][j]=nxt[i][k];}snap(`Usar ${k} como vértice intermedio.`,dm[source]);}
      check(!ids.some(k=>dm[k][k]<0&&Number.isFinite(dm[source][k])&&Number.isFinite(dm[k][target])),'Existe un ciclo negativo que afecta al camino solicitado.');
      dist=dm[source];let p=[],selected=[];
      if(Number.isFinite(dist[target])){let cur=source;p=[cur];for(let i=0;i<=ids.length&&cur!==target;i++){const item=nxt[cur][target];check(item,'No se pudo reconstruir el camino.');cur=item[0];p.push(cur);selected.push(item[1]);}check(p.at(-1)===target,'No se pudo reconstruir el camino.');}
      return {algorithm:d.algorithm,source,target,distance:Number.isFinite(dist[target])?Number(dist[target].toFixed(8)):null,path:p,edge_ids:selected,steps,matrix:Object.fromEntries(ids.map(i=>[i,Object.fromEntries(ids.map(j=>[j,Number.isFinite(dm[i][j])?Number(dm[i][j].toFixed(8)):null]))]))};
    }
    const [path,edge_ids]=route(prev);
    return {algorithm:d.algorithm,source,target,distance:Number.isFinite(dist[target])?Number(dist[target].toFixed(8)):null,path,edge_ids,steps};
  }
  function traversal(d){
    check(['bfs','dfs','cycles','topological'].includes(d.algorithm),'Algoritmo no reconocido.');
    const ids=basic(d,500,10000),adj=Object.fromEntries(ids.map(id=>[id,[]]));
    for(const e of d.edges){adj[e.source].push([e.target,e.id]);if(!d.directed)adj[e.target].push([e.source,e.id]);}
    const steps=[];const record=(action,visited,edge_ids=[],active=null)=>steps.push({iteration:steps.length+1,action,visited:[...visited],edge_ids:[...edge_ids],active});
    if(['bfs','dfs'].includes(d.algorithm)){
      check(ids.includes(d.source),'Selecciona un nodo de inicio válido.');const seen=new Set([d.source]),order=[],tree=[];
      if(d.algorithm==='bfs'){
        const queue=[d.source];record(`Encolar nodo inicial ${d.source}`,[],[],d.source);
        while(queue.length){const u=queue.shift();order.push(u);record(`Visitar ${u}`,order,tree,u);for(const [v,eid] of adj[u])if(!seen.has(v)){seen.add(v);queue.push(v);tree.push(eid);record(`Descubrir ${v} desde ${u} y encolarlo`,order,tree,v);}}
      }else{
        record(`Iniciar DFS en ${d.source}`,[],[],d.source);const stack=[[d.source,0]];order.push(d.source);record(`Visitar ${d.source}`,order,tree,d.source);
        while(stack.length){const top=stack.at(-1),u=top[0];if(top[1]>=adj[u].length){stack.pop();continue;}const [v,eid]=adj[u][top[1]++];if(!seen.has(v)){seen.add(v);tree.push(eid);record(`Explorar arista ${u} → ${v}`,order,tree,v);order.push(v);record(`Visitar ${v}`,order,tree,v);stack.push([v,0]);}}
      }
      return {algorithm:d.algorithm,steps,order,edge_ids:tree,message:`Se visitaron ${order.length} de ${ids.length} nodos desde ${d.source}.`};
    }
    if(d.algorithm==='topological'){
      check(d.directed,'El ordenamiento topológico requiere un grafo dirigido.');const indeg=Object.fromEntries(ids.map(x=>[x,0]));for(const u of ids)for(const [v] of adj[u])indeg[v]++;
      const queue=ids.filter(x=>indeg[x]===0),order=[];record('Inicializar nodos con grado de entrada cero',order);
      while(queue.length){const u=queue.shift();order.push(u);record(`Extraer ${u} (grado de entrada cero)`,order,[],u);for(const [v] of adj[u])if(--indeg[v]===0){queue.push(v);record(`El nodo ${v} ahora tiene grado de entrada cero`,order,[],v);}}
      const has_cycle=order.length!==ids.length;if(has_cycle)record('Se detectó un ciclo: no existe ordenamiento topológico',order);
      return {algorithm:d.algorithm,steps,order,edge_ids:[],has_cycle,message:has_cycle?'El grafo contiene un ciclo; no existe ordenamiento topológico.':'Ordenamiento topológico encontrado.'};
    }
    const state=Object.fromEntries(ids.map(x=>[x,0])),parentEdge={},parentNode={};let cycle_edges=[],cycle_nodes=[];
    for(const root of ids){if(state[root])continue;state[root]=1;record(`Iniciar búsqueda desde ${root}`,ids.filter(x=>state[x]),[],root);const stack=[[root,0]];
      while(stack.length&&!cycle_edges.length){const top=stack.at(-1),u=top[0];if(top[1]>=adj[u].length){state[u]=2;stack.pop();continue;}const [v,eid]=adj[u][top[1]++];if(!d.directed&&parentEdge[u]===eid)continue;
        if(state[v]===0){parentEdge[v]=eid;parentNode[v]=u;state[v]=1;record(`Explorar ${u} → ${v}`,ids.filter(x=>state[x]),[],v);stack.push([v,0]);}
        else if(state[v]===1){cycle_edges=[eid];cycle_nodes=[v];let x=u;while(x!==v){cycle_nodes.push(x);if(!parentEdge[x])break;cycle_edges.push(parentEdge[x]);x=parentNode[x];}cycle_nodes.push(v);record('Ciclo detectado',ids.filter(x=>state[x]),cycle_edges,v);}
      }
      if(cycle_edges.length)break;
    }
    if(!cycle_edges.length)record('Búsqueda terminada: no hay ciclos',ids);
    return {algorithm:d.algorithm,steps,order:cycle_nodes,edge_ids:cycle_edges,has_cycle:!!cycle_edges.length,message:cycle_edges.length?'Se encontró un ciclo.':'No se encontraron ciclos.'};
  }
  const matrixNum=v=>{check(number(v),'Los pesos deben ser números finitos entre -10¹² y 10¹².');return v;};
  function toMatrices(d){
    check(typeof d.directed==='boolean','Estructura del grafo inválida.');const ids=basic(d,30,400),index=Object.fromEntries(ids.map((x,i)=>[x,i]));
    const adjacency=ids.map(()=>ids.map(()=>null)),incidence=ids.map(()=>d.edges.map(()=>0)),seen=new Set(),labels=d.nodes.map(n=>String(n.label||n.id)),edge_labels=[],weights=[];
    d.edges.forEach((e,k)=>{const a=index[e.source],b=index[e.target];check(a!==b,'Las matrices de esta versión no admiten lazos.');const key=d.directed?`${a}|${b}`:[a,b].sort((x,y)=>x-y).join('|');check(!seen.has(key),'No se admiten aristas paralelas.');seen.add(key);const w=matrixNum(e.weight);adjacency[a][b]=w;if(!d.directed)adjacency[b][a]=w;incidence[a][k]=d.directed?-1:1;incidence[b][k]=1;edge_labels.push(e.id||`e${k+1}`);weights.push(w);});
    return {labels,directed:d.directed,adjacency,incidence,edge_labels,weights};
  }
  function fromMatrix(d){
    check(['adjacency','incidence'].includes(d.kind)&&typeof d.directed==='boolean','Tipo de matriz o dirección inválidos.');
    const m=d.matrix;check(Array.isArray(m)&&m.length>=1&&m.length<=30&&m.every(Array.isArray),'La matriz debe contener entre 1 y 30 filas.');const n=m.length;
    const labels=d.labels||Array.from({length:n},(_,i)=>`N${i+1}`);check(Array.isArray(labels)&&labels.length===n&&labels.every(x=>typeof x==='string'&&x.trim()),'Las etiquetas de los nodos no son válidas.');
    const nodes=labels.map((label,i)=>({id:String(i+1),label})),edges=[];const add=(a,b,weight)=>edges.push({id:`e${edges.length+1}`,source:String(a+1),target:String(b+1),weight});
    if(d.kind==='adjacency'){
      check(m.every(row=>row.length===n),'La matriz de adyacencia debe ser cuadrada.');
      for(let i=0;i<n;i++)for(let j=0;j<n;j++){const v=m[i][j];if(v!==null)matrixNum(v);if(i===j)check(v===null||v===0,'No se admiten lazos en la diagonal.');if(!d.directed)check(v===m[j][i],'La matriz no dirigida debe ser simétrica.');}
      for(let i=0;i<n;i++)for(let j=0;j<n;j++){if(i===j||(!d.directed&&j<i))continue;const w=m[i][j];if(w!==null&&(w!==0||d.zero_is_edge))add(i,j,w);}
    }else{
      const cols=m[0].length;check(cols<=400&&m.every(row=>row.length===cols),'La matriz de incidencia debe ser rectangular (máximo 400 columnas).');const weights=d.weights||Array(cols).fill(1);check(Array.isArray(weights)&&weights.length===cols,'La cantidad de pesos no coincide con las aristas.');
      for(let j=0;j<cols;j++){const col=m.map(row=>row[j]);check(col.every(v=>Number.isInteger(v)&&[-1,0,1].includes(v)),'La incidencia solo admite -1, 0 y 1.');let a,b;
        if(d.directed){check(col.filter(v=>v===-1).length===1&&col.filter(v=>v===1).length===1,`Columna ${j+1}: debe tener un -1 y un +1.`);a=col.indexOf(-1);b=col.indexOf(1);}
        else{check(col.filter(v=>v===1).length===2&&!col.includes(-1),`Columna ${j+1}: debe tener exactamente dos unos.`);[a,b]=col.map((v,i)=>v===1?i:-1).filter(x=>x>=0);}
        add(a,b,matrixNum(weights[j]));
      }
    }
    check(edges.length<=400,'Demasiadas aristas.');const seen=new Set();for(const e of edges){const key=d.directed?`${e.source}|${e.target}`:[e.source,e.target].sort().join('|');check(!seen.has(key),'La matriz contiene aristas paralelas.');seen.add(key);}
    return {nodes,edges,directed:d.directed};
  }
  const handlers={'/api/graph/validate':validate,'/api/graph/mst/both':d=>{const min=mst({...d,objective:'min'}),max=mst({...d,objective:'max'});return {algorithm:min.algorithm,min,max};},'/api/graph/mst':mst,'/api/graph/shortest-path':paths,'/api/graph/traversal':traversal,'/api/graph/matrices':toMatrices,'/api/graph/from-matrix':fromMatrix};
  window.GraphSolverAlgorithms={validate,mst,paths,traversal,toMatrices,fromMatrix};
  // Mantiene sin cambios las llamadas de los módulos originales a sus antiguas rutas.
  const nativeFetch=window.fetch.bind(window);
  window.fetch=(resource,options={})=>{
    const url=typeof resource==='string'?resource:resource?.url;
    if(!Object.prototype.hasOwnProperty.call(handlers,url))return nativeFetch(resource,options);
    try{const result=handlers[url](JSON.parse(options.body||'{}'));return Promise.resolve({ok:true,status:200,json:async()=>result});}
    catch(error){return Promise.resolve({ok:false,status:400,json:async()=>({error:error.message})});}
  };
})();
