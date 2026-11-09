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
 function renderList(){const area=$('image-import-list');area.replaceChildren();state.nodes.forEach((n,i)=>{const row=document.createElement('div');row.className='import-edge-row';const label=document.createElement('span');label.textContent=`Nodo ${i+1}`;const input=document.createElement('input');input.value=n.label;input.setAttribute('aria-label',`Nombre del nodo ${i+1}`);input.onchange=()=>{n.label=input.value.trim()||String(i+1);draw();renderList();};row.append(label,input);area.appendChild(row);});state.edges.forEach((e,i)=>{const row=document.createElement('div');row.className='import-edge-row';const label=document.createElement('span');label.textContent=`${state.nodes[e.a]?.label} — ${state.nodes[e.b]?.label}`;const input=document.createElement('input');input.type='number';input.step='any';input.value=e.weight;input.setAttribute('aria-label','Peso de arista');input.onchange=()=>{if(Number.isFinite(Number(input.value))){e.weight=Number(input.value);draw();}};const del=document.createElement('button');del.textContent='×';del.title='Eliminar arista';del.onclick=()=>{state.edges.splice(i,1);renderList();draw();};row.append(label,input,del);area.appendChild(row);});}
 function setTool(tool){state.tool=tool;state.pending=null;document.querySelectorAll('[data-image-tool]').forEach(b=>b.classList.toggle('active',b.dataset.imageTool===tool));draw();}
 document.querySelectorAll('[data-image-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.imageTool));
 const openImporter=()=>{$('image-import-dialog').hidden=false;};
 $('image-import-open-header').onclick=openImporter;
 $('image-import-gallery').onclick=()=>{$('image-import-file').click();};
 $('image-import-camera').onclick=()=>{$('image-import-camera-file').click();};
 $('image-import-close').onclick=()=>{$('image-import-dialog').hidden=true;};
 function loadSelectedImage(ev){const file=ev.target.files?.[0];if(!file)return;if(!file.type.startsWith('image/')){msg('Selecciona una imagen válida.');return;}const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);state.image=img;const scale=Math.min(1,1000/img.width,850/img.height);canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);state.nodes=[];state.edges=[];state.pending=null;renderList();draw();msg('Imagen cargada. Analizando nodos y conexiones…');detectGraph();};img.onerror=()=>{URL.revokeObjectURL(url);msg('No se pudo abrir la imagen.');};img.src=url;}
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
  const {data,w,h}=imagePixels();const seen=new Uint8Array(w*h);const components=[];
  // Detectar regiones azules/cian saturadas (nodos rellenos como los del ejemplo).
  const isNode=(idx)=>{const k=idx*4,r=data[k],g=data[k+1],b=data[k+2];return b>105&&b>r*1.17&&g>r*1.18&&g>75&&b>g*.82&&Math.max(r,g,b)-Math.min(r,g,b)>32;};
  for(let y=0;y<h;y+=1)for(let x=0;x<w;x+=1){const root=y*w+x;if(seen[root]||!isNode(root))continue;const q=[root];seen[root]=1;let minx=x,maxx=x,miny=y,maxy=y,sx=0,sy=0,n=0;
   for(let head=0;head<q.length;head++){const v=q[head],vx=v%w,vy=(v/w)|0;n++;sx+=vx;sy+=vy;minx=Math.min(minx,vx);maxx=Math.max(maxx,vx);miny=Math.min(miny,vy);maxy=Math.max(maxy,vy);
    for(const z of [v-1,v+1,v-w,v+w]){if(z<0||z>=w||seen[z])continue;const zx=z%w,zy=(z/w)|0;if(Math.abs(zx-vx)+Math.abs(zy-vy)!==1)continue;if(isNode(z)){seen[z]=1;q.push(z);}}
   }
   const bw=maxx-minx+1,bh=maxy-miny+1,area=bw*bh;
   if(n>=65&&bw>=12&&bh>=12&&bw/bh>.55&&bw/bh<1.65&&n/area>.28&&n/area<.97&&bw<w*.23&&bh<h*.23)components.push({x:sx/n,y:sy/n,r:Math.max(bw,bh)/2,area:n});
  }
  components.sort((a,b)=>b.area-a.area);const picked=[];for(const c of components){if(picked.length>=60)break;if(picked.some(n=>Math.hypot(n.x-c.x,n.y-c.y)<Math.max(n.r,c.r)*1.4))continue;picked.push(c);}
  if(!picked.length){msg('No detecté nodos de color. Para grafos dibujados a mano, agrega nodos y conexiones manualmente.');return;}
  picked.sort((a,b)=>a.y-b.y||a.x-b.x);
  state.nodes=picked.map((n,i)=>({x:n.x,y:n.y,label:String(i+1),r:n.r}));state.edges=[];state.pending=null;
  // Evaluar segmentos rectos oscuros entre cada par de centros, evitando círculos y cruces.
  const gray=(x,y)=>{x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=w||y>=h)return 255;const k=(y*w+x)*4;return data[k]*.299+data[k+1]*.587+data[k+2]*.114;};
  for(let i=0;i<state.nodes.length;i++)for(let j=i+1;j<state.nodes.length;j++){
   const a=state.nodes[i],b=state.nodes[j],len=Math.hypot(b.x-a.x,b.y-a.y);if(len<25)continue;
   let valid=0,hits=0,blocks=0;const count=Math.max(20,Math.round(len/2));
   for(let t=0;t<=count;t++){const u=t/count,x=a.x+(b.x-a.x)*u,y=a.y+(b.y-a.y)*u;
    if(Math.hypot(x-a.x,y-a.y)<a.r+5||Math.hypot(x-b.x,y-b.y)<b.r+5)continue;
    if(state.nodes.some((n,k)=>k!==i&&k!==j&&Math.hypot(x-n.x,y-n.y)<n.r+5)){blocks++;continue;}
    valid++;const dx=-(b.y-a.y)/len,dy=(b.x-a.x)/len;
    if(Math.min(gray(x,y),gray(x+dx*1.5,y+dy*1.5),gray(x-dx*1.5,y-dy*1.5))<185)hits++;
   }
   if(valid>=10&&valid/count>.43&&hits/valid>.69&&blocks/count<.3)state.edges.push({a:i,b:j,weight:1});
  }
  renderList();draw();msg(`Detecté ${state.nodes.length} nodos y ${state.edges.length} posibles aristas. IMPORTANTE: las etiquetas son provisionales y los pesos valen 1; revisa y corrige antes de resolver.`);
 }
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
 $('image-import-apply').onclick=()=>{if(!state.nodes.length)return msg('Marca al menos un nodo.');if(cy.elements().length&&!confirm('¿Reemplazar el grafo actual por el importado?'))return;cy.elements().remove();let maxId=0;state.nodes.forEach((n,i)=>{const id=`img_${i+1}`;cy.add({group:'nodes',data:{id,label:n.label},position:{x:n.x,y:n.y}});maxId++;});state.edges.forEach((e,i)=>{cy.add({group:'edges',data:{id:`img_edge_${i}`,source:`img_${e.a+1}`,target:`img_${e.b+1}`,weight:e.weight,shape:'straight',curveDistance:65}});});cy.fit(cy.elements(),40);nextId=Math.max(nextId,maxId+1);updateStats();$('image-import-dialog').hidden=true;setMode('move');setStatus(`Grafo importado: ${state.nodes.length} nodos y ${state.edges.length} aristas. Ya puedes resolverlo.`);};
})();
