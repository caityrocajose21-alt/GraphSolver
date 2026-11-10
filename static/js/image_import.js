'use strict';
(() => {
 const $=id=>document.getElementById(id), canvas=$('image-import-canvas'),ctx=canvas.getContext('2d');
 const state={image:null,nodes:[],edges:[],tool:'node',pending:null,selected:null,aiImported:false};
 const msg=t=>$('image-import-message').textContent=t;
 function draw(){const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);if(state.image)ctx.drawImage(state.image,0,0,w,h);
  state.edges.forEach((e,i)=>{const a=state.nodes[e.a],b=state.nodes[e.b];if(!a||!b)return;ctx.strokeStyle='#10b981';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();const x=(a.x+b.x)/2,y=(a.y+b.y)/2;ctx.font='bold 16px sans-serif';ctx.fillStyle='#fff';ctx.fillRect(x-19,y-17,38,22);ctx.fillStyle='#065f46';ctx.fillText(e.weight===null?'?':String(e.weight),x-12,y);});
  state.nodes.forEach((n,i)=>{ctx.beginPath();ctx.arc(n.x,n.y,17,0,Math.PI*2);ctx.fillStyle=i===state.pending?'#f59e0b':'#2563eb';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='white';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText(n.label,n.x,n.y+5);});ctx.textAlign='start';
  $('image-import-count').textContent=`${state.nodes.length} nodos · ${state.edges.length} aristas`;
 }
 function renderList(){const area=$('image-import-list');area.replaceChildren();state.nodes.forEach((n,i)=>{const row=document.createElement('div');row.className='import-edge-row';const label=document.createElement('span');label.textContent=`Nodo ${i+1}`;const input=document.createElement('input');input.value=n.label;input.setAttribute('aria-label',`Nombre del nodo ${i+1}`);input.onchange=()=>{n.label=input.value.trim()||String(i+1);draw();renderList();};row.append(label,input);area.appendChild(row);});state.edges.forEach((e,i)=>{const row=document.createElement('div');row.className='import-edge-row';const label=document.createElement('span');label.textContent=`${state.nodes[e.a]?.label} — ${state.nodes[e.b]?.label}`;const input=document.createElement('input');input.type='number';input.step='any';input.value=e.weight??'';input.placeholder='Sin peso';input.setAttribute('aria-label','Peso de arista');input.setAttribute('aria-invalid',e.weight===null?'true':'false');input.onchange=()=>{const v=input.value.trim();e.weight=v!==''&&Number.isFinite(Number(v))?Number(v):null;input.setAttribute('aria-invalid',e.weight===null?'true':'false');draw();};const del=document.createElement('button');del.textContent='×';del.title='Eliminar arista';del.onclick=()=>{state.edges.splice(i,1);renderList();draw();};row.append(label,input,del);area.appendChild(row);});}
 function setTool(tool){state.tool=tool;state.pending=null;document.querySelectorAll('[data-image-tool]').forEach(b=>b.classList.toggle('active',b.dataset.imageTool===tool));draw();}
 document.querySelectorAll('[data-image-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.imageTool));
 const openImporter=()=>{$('image-import-dialog').hidden=false;};
 $('image-import-open-header').onclick=openImporter;
 $('image-import-gallery').onclick=()=>{$('image-import-file').click();};
 $('image-import-camera').onclick=()=>{$('image-import-camera-file').click();};
 $('image-import-close').onclick=()=>{$('image-import-dialog').hidden=true;};
 function loadSelectedImage(ev){const file=ev.target.files?.[0];if(!file)return;if(!file.type.startsWith('image/')){msg('Selecciona una imagen válida.');return;}const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);state.image=img;const scale=Math.min(1,1000/img.width,850/img.height);canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);state.nodes=[];state.edges=[];state.pending=null;state.aiImported=false;renderList();draw();msg('Imagen cargada. Analizando nodos y conexiones…');detectGraph();};img.onerror=()=>{URL.revokeObjectURL(url);msg('No se pudo abrir la imagen.');};img.src=url;}
 $('image-import-file').addEventListener('change',loadSelectedImage);
 $('image-import-camera-file').addEventListener('change',loadSelectedImage);
 function nearest(x,y){let best=-1,dist=26;state.nodes.forEach((n,i)=>{const d=Math.hypot(n.x-x,n.y-y);if(d<dist){best=i;dist=d;}});return best;}
 canvas.addEventListener('click',ev=>{if(!state.image)return;const rect=canvas.getBoundingClientRect(),x=(ev.clientX-rect.left)*canvas.width/rect.width,y=(ev.clientY-rect.top)*canvas.height/rect.height;const i=nearest(x,y);
  if(state.tool==='node'){if(i>=0)return;const label=prompt('Nombre del nodo:',String.fromCharCode(65+state.nodes.length%26)+(state.nodes.length>=26?Math.floor(state.nodes.length/26):''));if(label===null)return;state.nodes.push({x,y,label:label.trim()||`N${state.nodes.length+1}`});renderList();}
  else if(state.tool==='edge'){if(i<0){msg('Toca el centro de un nodo.');return;}if(state.pending===null){state.pending=i;msg('Selecciona el nodo de destino.');}else{if(state.pending!==i){if(!state.edges.some(e=>(e.a===i&&e.b===state.pending)||(e.b===i&&e.a===state.pending))){state.edges.push({a:state.pending,b:i,weight:1});renderList();}}state.pending=null;msg('Arista creada. Ajusta su peso en la lista.');}}
  else if(state.tool==='delete'&&i>=0){state.nodes.splice(i,1);state.edges=state.edges.filter(e=>e.a!==i&&e.b!==i).map(e=>({...e,a:e.a>i?e.a-1:e.a,b:e.b>i?e.b-1:e.b}));renderList();}draw();});
 $('image-import-reset').onclick=()=>{state.nodes=[];state.edges=[];state.pending=null;renderList();draw();};
 // Analiza siempre los píxeles originales, no las marcas del editor.
 function imagePixels(){const off=document.createElement('canvas');off.width=canvas.width;off.height=canvas.height;const c=off.getContext('2d',{willReadFrequently:true});c.drawImage(state.image,0,0,off.width,off.height);return {data:c.getImageData(0,0,off.width,off.height).data,w:off.width,h:off.height};}
 function detectGraph(){
  if(!state.image){msg('Primero carga una imagen.');return;}
  const {data,w,h}=imagePixels(),size=w*h;
  const luminance=new Uint8Array(size),colored=new Uint8Array(size);
  for(let k=0;k<size;k++){
   const r=data[k*4],g=data[k*4+1],b=data[k*4+2];
   luminance[k]=Math.round(.299*r+.587*g+.114*b);
   // Admitir celeste poco saturado, azul, verde y círculos coloreados.
   const max=Math.max(r,g,b),min=Math.min(r,g,b);
   colored[k]=(max-min>18&&max>85&&luminance[k]>65&&
     ((b>r+12&&g>r+8)||(r>g+18&&r>b+18)||(g>r+14&&g>b+8)))?1:0;
  }
  const seen=new Uint8Array(size),components=[];
  // Componentes de color: usar una cola de índices sin recrear arreglos por píxel.
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const root=y*w+x;if(!colored[root]||seen[root])continue;
   const queue=[root];seen[root]=1;
   let sx=0,sy=0,n=0,minx=x,maxx=x,miny=y,maxy=y;
   for(let head=0;head<queue.length;head++){
    const v=queue[head],vx=v%w,vy=(v/w)|0;
    sx+=vx;sy+=vy;n++;minx=Math.min(minx,vx);maxx=Math.max(maxx,vx);miny=Math.min(miny,vy);maxy=Math.max(maxy,vy);
    if(vx>0&&colored[v-1]&&!seen[v-1]){seen[v-1]=1;queue.push(v-1);}
    if(vx<w-1&&colored[v+1]&&!seen[v+1]){seen[v+1]=1;queue.push(v+1);}
    if(vy>0&&colored[v-w]&&!seen[v-w]){seen[v-w]=1;queue.push(v-w);}
    if(vy<h-1&&colored[v+w]&&!seen[v+w]){seen[v+w]=1;queue.push(v+w);}
   }
   const bw=maxx-minx+1,bh=maxy-miny+1,area=bw*bh;
   if(n>=18&&bw>=7&&bh>=7&&bw/bh>.62&&bw/bh<1.5&&n/area>.28&&bw<w*.15&&bh<h*.15)
    components.push({x:sx/n,y:sy/n,r:Math.max(bw,bh)/2,score:n/area,kind:'color'});
  }
  // Para nodos sin relleno (grafos dibujados a mano), buscar anillos oscuros.
  // Se exige cobertura angular, no solo una línea que atraviese la región.
  const candidates=[];
  const angles=Array.from({length:20},(_,i)=>[Math.cos(i*Math.PI/10),Math.sin(i*Math.PI/10)]);
  const getLum=(x,y)=>luminance[Math.max(0,Math.min(h-1,Math.round(y)))*w+Math.max(0,Math.min(w-1,Math.round(x)))];
  const maxR=Math.min(31,Math.round(Math.min(w,h)/17));
  for(let r=6;r<=maxR;r+=2){
   for(let y=r+2;y<h-r-2;y+=3)for(let x=r+2;x<w-r-2;x+=3){
    // Evitar duplicar círculos ya identificados por su relleno.
    if(components.some(c=>Math.hypot(c.x-x,c.y-y)<c.r+4))continue;
    let ring=0,outer=0,inner=0,covered=0;
    for(const [dx,dy] of angles){
     const edge=Math.min(getLum(x+dx*r,y+dy*r),getLum(x+dx*(r-1),y+dy*(r-1)));
     const outside=getLum(x+dx*(r+3),y+dy*(r+3));
     const inside=getLum(x+dx*(r*.55),y+dy*(r*.55));
     if(edge<175&&edge+12<outside){ring++;if(edge+8<inside)covered++;}
     outer+=outside;inner+=inside;
    }
    if(ring>=13&&covered>=10&&outer/20>125&&inner/20>95){
     const score=ring+covered*.5;
     if(score>=19)candidates.push({x,y,r,score,kind:'outline'});
    }
   }
  }
  const picked=[];
  [...components,...candidates].sort((a,b)=>b.score-a.score).forEach(c=>{
   if(picked.length>=60)return;
   if(picked.some(n=>Math.hypot(n.x-c.x,n.y-c.y)<Math.max(9,Math.min(n.r,c.r)*1.3)))return;
   picked.push(c);
  });
  if(!picked.length){state.nodes=[];state.edges=[];renderList();draw();msg(`No se encontraron círculos en la imagen (${w}×${h}). Puedes marcar los nodos manualmente y conectar sus aristas.`);return;}
  picked.sort((a,b)=>a.y-b.y||a.x-b.x);
  state.nodes=picked.map((n,i)=>({x:n.x,y:n.y,label:String(i+1),r:n.r}));state.edges=[];state.pending=null;
  // Medir continuidad de la línea con un umbral adaptado al fondo de la foto.
  const dark=(x,y)=>getLum(x,y)<205;
  for(let i=0;i<state.nodes.length;i++)for(let j=i+1;j<state.nodes.length;j++){
   const a=state.nodes[i],b=state.nodes[j],len=Math.hypot(b.x-a.x,b.y-a.y);if(len<20)continue;
   const dx=-(b.y-a.y)/len,dy=(b.x-a.x)/len;
   let valid=0,hits=0,blocked=0;const count=Math.max(25,Math.ceil(len/2));
   for(let t=0;t<=count;t++){
    const u=t/count,x=a.x+(b.x-a.x)*u,y=a.y+(b.y-a.y)*u;
    if(Math.hypot(x-a.x,y-a.y)<a.r+3||Math.hypot(x-b.x,y-b.y)<b.r+3)continue;
    if(state.nodes.some((n,k)=>k!==i&&k!==j&&Math.hypot(n.x-x,n.y-y)<n.r+3)){blocked++;continue;}
    valid++;
    if(dark(x,y)||dark(x+dx*2,y+dy*2)||dark(x-dx*2,y-dy*2))hits++;
   }
   if(valid>=8&&valid/count>.38&&hits/valid>.67&&blocked/count<.25)
    state.edges.push({a:i,b:j,weight:1});
  }
  renderList();draw();msg(`Detección experimental: ${state.nodes.length} nodos y ${state.edges.length} posibles aristas. Revisa las marcas y corrige los pesos antes de importar; los pesos predeterminados son 1.`);
 }
 // Reconocimiento multimodal mediante API externa: las credenciales viven SOLO en el servidor.
 const aiUrl=$('image-ai-url'),aiBtn=$('image-ai-analyze');
 try{aiUrl.value=localStorage.getItem('graphsolver_ai_url')||'';}catch(_e){}
 aiUrl.addEventListener('change',()=>{try{localStorage.setItem('graphsolver_ai_url',aiUrl.value.trim());}catch(_e){}});
 function sanitizeAI(data){
  if(!data||!Array.isArray(data.nodes)||!Array.isArray(data.edges))throw new Error('La IA no devolvió nodos y aristas válidos.');
  if(data.nodes.length>100||data.edges.length>500)throw new Error('El grafo excede el límite de seguridad.');
  const ids=new Map(),nodes=[];
  for(const n of data.nodes){const id=String(n.id??'').trim();if(!id||ids.has(id))throw new Error('Hay identificadores de nodos vacíos o repetidos.');
   const x=Number(n.x),y=Number(n.y);if(!Number.isFinite(x)||!Number.isFinite(y))throw new Error('La IA no devolvió posiciones válidas.');
   ids.set(id,nodes.length);nodes.push({x:Math.max(0,Math.min(canvas.width,x*canvas.width)),y:Math.max(0,Math.min(canvas.height,y*canvas.height)),label:String(n.label||id).slice(0,40),r:18});}
  const edges=[],seen=new Set();for(const e of data.edges){const a=ids.get(String(e.source)),b=ids.get(String(e.target));if(a===undefined||b===undefined||a===b)continue;
   const key=[Math.min(a,b),Math.max(a,b)].join(':');if(seen.has(key))continue;seen.add(key);
   const w=e.weight===null||e.weight===undefined||e.weight===''?null:Number(e.weight);
   edges.push({a,b,weight:w!==null&&Number.isFinite(w)?w:null});}
  return {nodes,edges};
 }
 aiBtn.addEventListener('click',async()=>{
  if(!state.image){msg('Primero sube una imagen desde la galería o cámara.');return;}
  const base=aiUrl.value.trim().replace(/\/+$/,'');let u;
  try{u=new URL(base);if(u.protocol!=='https:'&&u.hostname!=='localhost'&&u.hostname!=='127.0.0.1')throw Error();}catch(_e){msg('Introduce una URL HTTPS válida de tu API en Render.');return;}
  aiBtn.disabled=true;msg('Analizando imagen con IA… puede tardar unos segundos.');
  try{
   const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('No se pudo preparar la imagen.')),'image/jpeg',.88));
   // El canvas puede contener marcas: generamos la imagen original sin superposiciones.
   const clean=document.createElement('canvas');clean.width=canvas.width;clean.height=canvas.height;clean.getContext('2d').drawImage(state.image,0,0,clean.width,clean.height);
   const cleanBlob=await new Promise((resolve,reject)=>clean.toBlob(b=>b?resolve(b):reject(new Error('No se pudo preparar la imagen.')),'image/jpeg',.9));
   const body=new FormData();body.append('image',cleanBlob,'grafo.jpg');
   const response=await fetch(base+'/analyze',{method:'POST',body});
   let payload;try{payload=await response.json();}catch(_e){throw new Error('Respuesta no válida del servidor.');}
   if(!response.ok)throw new Error(typeof payload.detail==='string'?payload.detail:'Error del servicio de IA ('+response.status+').');
   const result=sanitizeAI(payload);state.nodes=result.nodes;state.edges=result.edges;state.pending=null;state.aiImported=true;
   renderList();draw();
   const missing=state.edges.filter(e=>e.weight===null).length;
   msg(`IA: ${state.nodes.length} nodos y ${state.edges.length} aristas propuestas. ${missing} pesos sin identificar. Comprueba cuidadosamente todas las conexiones y etiquetas antes de importar.`);
  }catch(err){msg('No se pudo analizar: '+err.message+' Revisa la URL, conexión y configuración CORS del servidor.');}
  finally{aiBtn.disabled=false;}
 });
 // OCR opcional: Tesseract se carga solamente al solicitar reconocimiento.
 let ocrLoading=null;
 function loadOCR(){
  if(window.Tesseract)return Promise.resolve(window.Tesseract);
  if(ocrLoading)return ocrLoading;
  ocrLoading=new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
   script.onload=()=>window.Tesseract?resolve(window.Tesseract):reject(new Error('OCR no disponible'));
   script.onerror=()=>reject(new Error('No se pudo cargar el motor OCR. Revisa tu conexión.'));
   document.head.appendChild(script);
  }).catch(e=>{ocrLoading=null;throw e;});
  return ocrLoading;
 }
 function cropImage(x,y,ww,hh,scale=4){
  const c=document.createElement('canvas');c.width=Math.max(1,Math.round(ww*scale));c.height=Math.max(1,Math.round(hh*scale));
  const cc=c.getContext('2d',{willReadFrequently:true});cc.fillStyle='#fff';cc.fillRect(0,0,c.width,c.height);
  cc.imageSmoothingEnabled=true;cc.imageSmoothingQuality='high';
  cc.drawImage(state.image,x*state.image.width/canvas.width,y*state.image.height/canvas.height,ww*state.image.width/canvas.width,hh*state.image.height/canvas.height,0,0,c.width,c.height);
  return c;
 }
 function parseOCR(result){
  const raw=(result?.data?.text||'').replace(/[,]/g,'.').trim();
  const matches=raw.match(/-?\d+(?:\.\d+)?/g)||[];
  const conf=result?.data?.confidence??0;
  return matches.length===1&&conf>=35?{value:matches[0],confidence:conf}:null;
 }
 async function recognizeNumbers(){
  if(!state.image)return msg('Primero selecciona una fotografía.');
  if(!state.nodes.length)return msg('Primero pulsa «Detectar nodos y aristas» o agrega nodos manualmente.');
  const btn=$('image-import-ocr');btn.disabled=true;
  let worker;
  try{
   msg('Cargando OCR… requiere conexión a internet la primera vez.');
   const T=await loadOCR();worker=await T.createWorker('eng');
   await worker.setParameters({tessedit_char_whitelist:'0123456789.-',tessedit_pageseg_mode:T.PSM?.SINGLE_WORD||'8'});
   let recognizedNodes=0,recognizedWeights=0;
   for(let i=0;i<state.nodes.length;i++){
    const n=state.nodes[i],r=Math.max(12,Math.min(n.r||19,32));
    const c=cropImage(n.x-r*.8,n.y-r*.7,r*1.6,r*1.4);
    const v=parseOCR(await worker.recognize(c));
    if(v){n.label=v.value;recognizedNodes++;}
    msg(`Leyendo etiquetas: ${i+1}/${state.nodes.length}…`);
   }
   for(let i=0;i<state.edges.length;i++){
    const e=state.edges[i],a=state.nodes[e.a],b=state.nodes[e.b];
    // La etiqueta de peso suele estar cerca del centro de la arista.
    // Evitamos asignar números cuando el recorte contiene otro nodo.
    const x=(a.x+b.x)/2,y=(a.y+b.y)/2;
    if(state.nodes.some((n,k)=>k!==e.a&&k!==e.b&&Math.hypot(n.x-x,n.y-y)<(n.r||18)+22))continue;
    const c=cropImage(x-24,y-23,48,46);
    const v=parseOCR(await worker.recognize(c));
    if(v){e.weight=Number(v.value);e.ocrVerified=true;recognizedWeights++;}
    msg(`Leyendo pesos: ${i+1}/${state.edges.length}…`);
   }
   renderList();draw();
   msg(`OCR terminado: ${recognizedNodes}/${state.nodes.length} etiquetas y ${recognizedWeights}/${state.edges.length} pesos detectados. Verifica TODOS los valores antes de resolver; los pesos no reconocidos siguen en 1 como valor provisional.`);
  }catch(err){msg(`No se pudo completar el OCR: ${err.message}. Puedes editar los datos manualmente.`);}
  finally{if(worker)await worker.terminate();btn.disabled=false;}
 }
 $('image-import-ocr').onclick=recognizeNumbers;
 $('image-import-detect').onclick=detectGraph;
 $('image-import-apply').onclick=()=>{if(!state.nodes.length)return msg('Marca al menos un nodo.');if(state.edges.some(e=>e.weight===null)){msg('Hay aristas sin peso reconocido. Completa los pesos antes de importar o confirma el modo no ponderado.');return;}if(cy.elements().length&&!confirm('¿Reemplazar el grafo actual por el importado?'))return;cy.elements().remove();let maxId=0;state.nodes.forEach((n,i)=>{const id=`img_${i+1}`;cy.add({group:'nodes',data:{id,label:n.label},position:{x:n.x,y:n.y}});maxId++;});state.edges.forEach((e,i)=>{cy.add({group:'edges',data:{id:`img_edge_${i}`,source:`img_${e.a+1}`,target:`img_${e.b+1}`,weight:e.weight,shape:'straight',curveDistance:65}});});cy.fit(cy.elements(),40);nextId=Math.max(nextId,maxId+1);updateStats();$('image-import-dialog').hidden=true;setMode('move');setStatus(`Grafo importado: ${state.nodes.length} nodos y ${state.edges.length} aristas. Ya puedes resolverlo.`);};
})();
