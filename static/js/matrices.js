'use strict';
// El módulo reutiliza `cy`, `directed`, `setStatus` y `updateStats` de graph.js.
(() => {
  const $ = id => document.getElementById(id);
  const panel=$('matrix-panel'), kind=$('matrix-kind'), dir=$('matrix-directed');
  let labels=[], matrix=[], weights=[];
  const message = s => {$('matrix-error').textContent=s;};
  async function post(url, body){
    const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await r.json();if(!r.ok)throw Error(data.error||'Error del servidor');return data;
  }
  function build(n,m=0){
    labels=Array.from({length:n},(_,i)=>`N${i+1}`);
    matrix=Array.from({length:n},()=>Array.from({length:kind.value==='adjacency'?n:m},()=>null));
    if(kind.value==='incidence')matrix=matrix.map(r=>r.map(()=>0));
    weights=Array.from({length:m},()=>1);render();
  }
  function render(){
    panel.hidden=false;message('');
    $('matrix-columns-field').hidden=kind.value!=='incidence';
    $('matrix-caption').textContent=kind.value==='adjacency'?'Matriz de adyacencia (vacío = sin arista)':'Matriz de incidencia (-1 salida, +1 llegada en dirigido)';
    $('matrix-size').value=labels.length;
    if(kind.value==='incidence')$('matrix-columns').value=matrix[0]?.length||0;
    const table=document.createElement('table'),thead=document.createElement('thead'),h=document.createElement('tr');
    const blank=document.createElement('th');blank.textContent='Vértice';h.appendChild(blank);
    const cols=matrix[0]?.length||0;
    for(let j=0;j<cols;j++){const th=document.createElement('th');th.textContent=kind.value==='adjacency'?labels[j]:`e${j+1}`;h.appendChild(th);}
    thead.appendChild(h);table.appendChild(thead);
    const tbody=document.createElement('tbody');
    for(let i=0;i<labels.length;i++){
      const tr=document.createElement('tr'), th=document.createElement('th');
      const labelInput=document.createElement('input');labelInput.value=labels[i];labelInput.className='matrix-label';
      labelInput.setAttribute('aria-label',`Nombre del vértice ${i+1}`);
      labelInput.onchange=()=>{labels[i]=labelInput.value.trim()||`N${i+1}`;render();};th.appendChild(labelInput);tr.appendChild(th);
      for(let j=0;j<cols;j++){
        const td=document.createElement('td'),inp=document.createElement('input');inp.type='number';inp.step='any';inp.className='matrix-cell';
        inp.value=matrix[i][j]===null?'':String(matrix[i][j]);
        inp.setAttribute('aria-label',`Fila ${i+1} columna ${j+1}`);
        inp.onchange=()=>{const v=inp.value.trim();matrix[i][j]=v===''?null:Number(v);};
        td.appendChild(inp);tr.appendChild(td);
      }tbody.appendChild(tr);
    }
    table.appendChild(tbody);$('matrix-grid').replaceChildren(table);
    const wrap=$('matrix-weights');wrap.replaceChildren();
    if(kind.value==='incidence'&&cols){
      const text=document.createElement('p');text.textContent='Pesos de las aristas (en el orden de las columnas):';wrap.appendChild(text);
      const row=document.createElement('div');row.className='matrix-weight-row';
      weights.forEach((w,j)=>{const l=document.createElement('label');l.textContent=`e${j+1} `;const inp=document.createElement('input');inp.type='number';inp.step='any';inp.value=w;inp.onchange=()=>{weights[j]=Number(inp.value);};l.appendChild(inp);row.appendChild(l);});wrap.appendChild(row);
    }
  }
  function payload(){return {kind:kind.value,directed:dir.checked,matrix,labels,weights,zero_is_edge:true};}
  async function refresh(){
    try{
      const result=await post('/api/graph/matrices',{nodes:cy.nodes().map(n=>({id:n.id(),label:n.data('label')})),edges:cy.edges().map(e=>({id:e.id(),source:e.data('source'),target:e.data('target'),weight:e.data('weight')})),directed:directed.checked});
      labels=result.labels;dir.checked=result.directed;
      matrix=kind.value==='adjacency'?result.adjacency:result.incidence;
      weights=result.weights;render();panel.scrollIntoView({behavior:'smooth',block:'start'});
      setStatus('Matrices generadas desde el grafo actual. Puedes editarlas.');
    }catch(e){panel.hidden=false;message(e.message);setStatus(e.message);}
  }
  $('matrix-refresh').onclick=refresh;
  $('matrix-load').onclick=()=>{panel.hidden=false;panel.scrollIntoView({behavior:'smooth'});};
  kind.onchange=()=>{const n=Number($('matrix-size').value)||4;build(Math.min(30,Math.max(1,n)),Number($('matrix-columns').value)||0);};
  $('matrix-new').onclick=()=>{const n=Number($('matrix-size').value),m=Number($('matrix-columns').value);
    if(!Number.isInteger(n)||n<1||n>30||!Number.isInteger(m)||m<0||m>400){message('Introduce entre 1 y 30 vértices y hasta 400 aristas.');return;}
    build(n,m);
  };
  $('matrix-apply').onclick=async()=>{
    try{
      // En la diagonal se usa vacío para indicar que no hay lazos.
      const result=await post('/api/graph/from-matrix',payload());
      if(!confirm('¿Reemplazar el grafo actual por el generado desde la matriz?'))return;
      cy.elements().remove();directed.checked=result.directed;
      const n=result.nodes.length;
      result.nodes.forEach((node,i)=>cy.add({group:'nodes',data:node,position:{x:250+170*Math.cos(2*Math.PI*i/n),y:230+170*Math.sin(2*Math.PI*i/n)}}));
      result.edges.forEach(edge=>cy.add({group:'edges',data:edge,classes:result.directed?'directed':''}));
      nextId=n+1;firstNode=null;updateStats();cy.fit(undefined,45);
      setStatus(`Grafo generado desde matriz: ${n} vértices y ${result.edges.length} aristas. Ya puedes resolverlo.`);
      message('Grafo generado correctamente.');
    }catch(e){message(e.message);setStatus(`Matriz inválida: ${e.message}`);}
  };
  $('matrix-export').onclick=()=>{
    const header=['Vértice',...Array.from({length:matrix[0]?.length||0},(_,j)=>kind.value==='adjacency'?labels[j]:`e${j+1}`)];
    const rows=[header,...matrix.map((r,i)=>[labels[i],...r.map(v=>v===null?'':v)])];
    if(kind.value==='incidence')rows.push(['Peso',...weights]);
    const csv='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download=`graphsolver_${kind.value}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
  };
})();
