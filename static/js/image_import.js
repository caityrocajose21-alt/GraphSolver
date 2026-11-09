'use strict';
(() => {
 const $=id=>document.getElementById(id), canvas=$('image-import-canvas'),ctx=canvas.getContext('2d');
 const state={image:null,nodes:[],edges:[],tool:'node',pending:null,selected:null};
 const msg=t=>$('image-import-message').textContent=t;
 function draw(){const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);if(state.image)ctx.drawImage(state.image,0,0,w,h);
  state.edges.forEach((e,i)=>{const a=state.nodes[e.a],b=state.nodes[e.b];if(!a||!b)return;ctx.strokeStyle='#10b981';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();const x=(a.x+b.x)/2,y=(a.y+b.y)/2;ctx.font='bold 16px sans-serif';ctx.fillStyle='#fff';ctx.fillRect(x-19,y-17,38,22);ctx.fillStyle='#065f46';ctx.fillText(String(e.weight),x-12,y);});
  state.nodes.forEach((n,i)=>{ctx.beginPath();ctx.arc(n.x,n.y,17,0,Math.PI*2);ctx.fillStyle=i===state.pending?'#f59e0b':'#2563eb';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='white';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText(n.label,n.x,n.y+5);});ctx.textAlign='start';
  $('image-import-count').textContent=`${state.nodes.length} nodos · ${state.edges.length} aristas`;
 }
 function renderList(){const area=$('image-import-list');area.replaceChildren();state.edges.forEach((e,i)=>{const row=document.createElement('div');row.className='import-edge-row';const label=document.createElement('span');label.textContent=`${state.nodes[e.a]?.label} — ${state.nodes[e.b]?.label}`;const input=document.createElement('input');input.type='number';input.step='any';input.value=e.weight;input.setAttribute('aria-label','Peso de arista');input.onchange=()=>{if(Number.isFinite(Number(input.value))){e.weight=Number(input.value);draw();}};const del=document.createElement('button');del.textContent='×';del.title='Eliminar arista';del.onclick=()=>{state.edges.splice(i,1);renderList();draw();};row.append(label,input,del);area.appendChild(row);});}
 function setTool(tool){state.tool=tool;state.pending=null;document.querySelectorAll('[data-image-tool]').forEach(b=>b.classList.toggle('active',b.dataset.imageTool===tool));draw();}
 document.querySelectorAll('[data-image-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.imageTool));
 const openImporter=()=>{$('image-import-dialog').hidden=false;};
 $('image-import-open').onclick=openImporter;
 $('image-import-open-header').onclick=openImporter;
 $('image-import-gallery').onclick=()=>{$('image-import-file').click();};
 $('image-import-camera').onclick=()=>{$('image-import-camera-file').click();};
 $('image-import-close').onclick=()=>{$('image-import-dialog').hidden=true;};
 function loadSelectedImage(ev){const file=ev.target.files?.[0];if(!file)return;if(!file.type.startsWith('image/')){msg('Selecciona una imagen válida.');return;}const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);state.image=img;const scale=Math.min(1,1000/img.width,850/img.height);canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);state.nodes=[];state.edges=[];state.pending=null;renderList();draw();msg('Imagen cargada. Usa Detectar nodos (experimental) o marca los nodos manualmente.');};img.onerror=()=>{URL.revokeObjectURL(url);msg('No se pudo abrir la imagen.');};img.src=url;}
 $('image-import-file').addEventListener('change',loadSelectedImage);
 $('image-import-camera-file').addEventListener('change',loadSelectedImage);
 function nearest(x,y){let best=-1,dist=26;state.nodes.forEach((n,i)=>{const d=Math.hypot(n.x-x,n.y-y);if(d<dist){best=i;dist=d;}});return best;}
 canvas.addEventListener('click',ev=>{if(!state.image)return;const rect=canvas.getBoundingClientRect(),x=(ev.clientX-rect.left)*canvas.width/rect.width,y=(ev.clientY-rect.top)*canvas.height/rect.height;const i=nearest(x,y);
  if(state.tool==='node'){if(i>=0)return;const label=prompt('Nombre del nodo:',String.fromCharCode(65+state.nodes.length%26)+(state.nodes.length>=26?Math.floor(state.nodes.length/26):''));if(label===null)return;state.nodes.push({x,y,label:label.trim()||`N${state.nodes.length+1}`});}
  else if(state.tool==='edge'){if(i<0){msg('Toca el centro de un nodo.');return;}if(state.pending===null){state.pending=i;msg('Selecciona el nodo de destino.');}else{if(state.pending!==i){if(!state.edges.some(e=>(e.a===i&&e.b===state.pending)||(e.b===i&&e.a===state.pending))){state.edges.push({a:state.pending,b:i,weight:1});renderList();}}state.pending=null;msg('Arista creada. Ajusta su peso en la lista.');}}
  else if(state.tool==='delete'&&i>=0){state.nodes.splice(i,1);state.edges=state.edges.filter(e=>e.a!==i&&e.b!==i).map(e=>({...e,a:e.a>i?e.a-1:e.a,b:e.b>i?e.b-1:e.b}));renderList();}draw();});
 $('image-import-reset').onclick=()=>{state.nodes=[];state.edges=[];state.pending=null;renderList();draw();};
 // Heuristic for detecting dark circular outlines: radial sampling with nonmaximum suppression.
 $('image-import-detect').onclick=()=>{if(!state.image)return msg('Primero carga una imagen.');const w=canvas.width,h=canvas.height;const data=ctx.getImageData(0,0,w,h).data;const dark=(x,y)=>{x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=w||y>=h)return false;const k=(y*w+x)*4;return (data[k]*.299+data[k+1]*.587+data[k+2]*.114)<125;};
  const candidates=[];const step=Math.max(6,Math.round(Math.min(w,h)/100));const radii=[12,16,20,25,30,38,46,56,70].filter(r=>r<Math.min(w,h)/5);
  for(let y=70;y<h-20;y+=step)for(let x=20;x<w-20;x+=step){let best=0;for(const r of radii){let hits=0;for(let a=0;a<24;a++){const t=a*Math.PI/12;if(dark(x+Math.cos(t)*r,y+Math.sin(t)*r))hits++;}best=Math.max(best,hits/24);}if(best>=.77)candidates.push({x,y,score:best});}
  candidates.sort((a,b)=>b.score-a.score);let count=0;for(const c of candidates){if(state.nodes.length>=50)break;if(nearest(c.x,c.y)>=0)continue;if(state.nodes.some(n=>Math.hypot(n.x-c.x,n.y-c.y)<34))continue;state.nodes.push({x:c.x,y:c.y,label:`N${state.nodes.length+1}`});count++;}draw();msg(count?`Se detectaron ${count} posibles nodos. Verifica su posición y agrega las aristas manualmente.`:'No se detectaron círculos con suficiente confianza. Marca los nodos manualmente.');};
 $('image-import-apply').onclick=()=>{if(!state.nodes.length)return msg('Marca al menos un nodo.');if(cy.elements().length&&!confirm('¿Reemplazar el grafo actual por el importado?'))return;cy.elements().remove();let maxId=0;state.nodes.forEach((n,i)=>{const id=`img_${i+1}`;cy.add({group:'nodes',data:{id,label:n.label},position:{x:n.x,y:n.y}});maxId++;});state.edges.forEach((e,i)=>{cy.add({group:'edges',data:{id:`img_edge_${i}`,source:`img_${e.a+1}`,target:`img_${e.b+1}`,weight:e.weight,shape:'straight',curveDistance:65}});});cy.fit(cy.elements(),40);nextId=Math.max(nextId,maxId+1);updateStats();$('image-import-dialog').hidden=true;setMode('move');setStatus(`Grafo importado: ${state.nodes.length} nodos y ${state.edges.length} aristas. Ya puedes resolverlo.`);};
})();
