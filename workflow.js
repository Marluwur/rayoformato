/* RayoFormato - Flujos de trabajo PDF: encadena herramientas y las aplica en el navegador (pdf-lib + pdf.js) */
(function(){
var PDFWORKER='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
var KEY='rf-flujos',MAXSTEPS=12;
var $=function(id){return document.getElementById(id)};
var fIn=$('wf-file'),drop=$('wf-drop'),fl=$('wf-files'),stepsEl=$('wf-steps'),addSel=$('wf-add'),run=$('wf-run'),out=$('wf-out'),savedEl=$('wf-saved'),nameIn=$('wf-name'),linkOut=$('wf-linkout');
var files=[],steps=[];

/* ---------- catalogo de pasos ---------- */
var POS=[['bc','Abajo, centro'],['br','Abajo, derecha'],['bl','Abajo, izquierda'],['tc','Arriba, centro'],['tr','Arriba, derecha'],['tl','Arriba, izquierda']];
var T={
 reorder:{n:'Ordenar páginas',f:[['pages','text','Nuevo orden (ej. 3, 1, 2)','',true]]},
 delete:{n:'Eliminar páginas',f:[['pages','text','Páginas a eliminar (ej. 2, 5-7)','',true]]},
 extract:{n:'Extraer páginas',f:[['pages','text','Páginas a conservar (ej. 1-3)','',true]]},
 rotate:{n:'Rotar',f:[['deg','select','Girar','90',[['90','90° a la derecha'],['180','180°'],['270','90° a la izquierda']]],['pages','text','Páginas (vacío = todas)','']]},
 number:{n:'Números de página',f:[['pos','select','Posición','bc',POS],['fmt','select','Formato','pn',[['n','1'],['p','Página 1'],['pn','Página 1 de N']]],['start','num','Empezar en','1'],['pages','text','Páginas (vacío = todas)','']]},
 watermark:{n:'Marca de agua',f:[['text','text','Texto','CONFIDENCIAL'],['op','select','Opacidad','0.35',[['0.2','20 %'],['0.35','35 %'],['0.5','50 %']]],['ang','select','Ángulo','45',[['45','Diagonal'],['0','Recto']]],['pages','text','Páginas (vacío = todas)','']]},
 crop:{n:'Recortar márgenes',f:[['t','num','Arriba (mm)','10'],['r','num','Derecha (mm)','10'],['b','num','Abajo (mm)','10'],['l','num','Izquierda (mm)','10'],['pages','text','Páginas (vacío = todas)','']]},
 compress:{n:'Comprimir',f:[['lv','select','Nivel','light',[['light','Ligera (conserva el texto)'],['strong','Fuerte (páginas como imágenes)']]]]}
};
var TPL={
 tramite:{n:'Para un trámite',s:[{t:'number',o:{fmt:'pn'}},{t:'compress',o:{lv:'light'}}]},
 confidencial:{n:'Documento confidencial',s:[{t:'watermark',o:{}},{t:'number',o:{fmt:'n',pos:'br'}}]},
 escaneo:{n:'Limpiar un escaneo',s:[{t:'crop',o:{t:'8',r:'8',b:'8',l:'8'}},{t:'compress',o:{lv:'strong'}}]},
 tarea:{n:'Entregar una tarea',s:[{t:'number',o:{fmt:'p'}},{t:'watermark',o:{text:'Entregado',op:'0.2',ang:'0'}}]}
};
function defaults(t,o){var r={};T[t].f.forEach(function(f){var v=o&&o[f[0]]!=null?String(o[f[0]]):f[3];r[f[0]]=v});return r}
/* valida datos que vienen de un enlace o del almacenamiento: solo tipos y valores conocidos */
function sanitize(arr){
 if(!Array.isArray(arr))return [];
 var res=[];
 arr.slice(0,MAXSTEPS).forEach(function(s){
  if(!s||typeof s!=='object'||!Object.prototype.hasOwnProperty.call(T,s.t))return;
  var o=defaults(s.t,null);
  T[s.t].f.forEach(function(f){
   var v=s.o&&s.o[f[0]];if(v==null)return;v=String(v);
   if(f[1]==='select'){if(f[4].some(function(x){return x[0]===v}))o[f[0]]=v}
   else if(f[1]==='num'){if(/^\d{1,3}([.,]\d{1,2})?$/.test(v))o[f[0]]=v}
   else o[f[0]]=v.replace(/[\u0000-\u001F]/g,'').slice(0,f[0]==='text'?40:200)});
  res.push({t:s.t,o:o})});
 return res}

/* ---------- archivos ---------- */
function renderFiles(){
 fl.innerHTML='';
 files.forEach(function(f,i){var li=document.createElement('li'),s=document.createElement('span');
  s.textContent=(files.length>1?(i+1)+'. ':'')+f.name+' · '+fsize(f.size);li.appendChild(s);
  var ro=document.createElement('span');ro.className='ord';
  [['▲','Subir',-1],['▼','Bajar',1],['✕','Quitar',0]].forEach(function(b){var bt=document.createElement('button');bt.type='button';bt.textContent=b[0];bt.title=b[1];bt.setAttribute('aria-label',b[1]+' '+f.name);
   bt.onclick=function(){if(b[2]===0)files.splice(i,1);else{var j=i+b[2];if(j<0||j>=files.length)return;var t=files[i];files[i]=files[j];files[j]=t}renderFiles();upd()};ro.appendChild(bt)});
  li.appendChild(ro);fl.appendChild(li)});
 if(files.length>1){var li=document.createElement('li');li.className='wf-note';li.textContent='Se unirán en este orden antes de aplicar los pasos.';fl.appendChild(li)}}
function addFiles(list){var arr=Array.prototype.filter.call(list,function(f){return f.type==='application/pdf'||/\.pdf$/i.test(f.name)});
 out.innerHTML='';if(!arr.length){msg(out,'Elige archivos PDF.');return}files=files.concat(arr);renderFiles();upd()}
fIn.onchange=function(){addFiles(fIn.files);fIn.value=''};
['dragover','dragenter'].forEach(function(e){drop.addEventListener(e,function(ev){ev.preventDefault();drop.classList.add('over')})});
['dragleave','drop'].forEach(function(e){drop.addEventListener(e,function(ev){ev.preventDefault();drop.classList.remove('over')})});
drop.addEventListener('drop',function(ev){addFiles(ev.dataTransfer.files)});

/* ---------- pasos ---------- */
function renderSteps(){
 stepsEl.innerHTML='';
 if(!steps.length){var e=document.createElement('li');e.className='wf-empty';e.textContent='Aún no hay pasos. Elige una plantilla o agrega pasos abajo.';stepsEl.appendChild(e)}
 steps.forEach(function(s,i){
  var li=document.createElement('li');li.className='wf-step';
  var hd=document.createElement('div');hd.className='wf-sh';
  var tt=document.createElement('b');tt.textContent='Paso '+(i+1)+' · '+T[s.t].n;hd.appendChild(tt);
  var ro=document.createElement('span');ro.className='ord';
  [['▲','Subir paso',-1],['▼','Bajar paso',1],['✕','Quitar paso',0]].forEach(function(b){var bt=document.createElement('button');bt.type='button';bt.textContent=b[0];bt.title=b[1];bt.setAttribute('aria-label',b[1]+' '+(i+1));
   bt.onclick=function(){if(b[2]===0)steps.splice(i,1);else{var j=i+b[2];if(j<0||j>=steps.length)return;var t=steps[i];steps[i]=steps[j];steps[j]=t}renderSteps();upd()};ro.appendChild(bt)});
  hd.appendChild(ro);li.appendChild(hd);
  var row=document.createElement('div');row.className='row wf-opts';
  T[s.t].f.forEach(function(f){
   var lb=document.createElement('label'),sp=document.createElement('span');sp.textContent=f[2];lb.appendChild(sp);var inp;
   if(f[1]==='select'){inp=document.createElement('select');f[4].forEach(function(x){var op=document.createElement('option');op.value=x[0];op.textContent=x[1];inp.appendChild(op)})}
   else{inp=document.createElement('input');inp.type='text';if(f[1]==='num'){inp.inputMode='decimal';inp.style.width='90px'}else{inp.autocomplete='off';if(f[0]==='text')inp.maxLength=40}
    if(f[0]==='pages')lb.className='wf-wide'}
   inp.value=s.o[f[0]];inp.setAttribute('data-k',f[0]);
   inp.addEventListener(f[1]==='select'?'change':'input',function(){s.o[f[0]]=inp.value;linkOut.hidden=true});
   lb.appendChild(inp);row.appendChild(lb)});
  li.appendChild(row);stepsEl.appendChild(li)})}
$('wf-addbtn').onclick=function(){if(steps.length>=MAXSTEPS){msg(out,'Máximo '+MAXSTEPS+' pasos por flujo.');return}steps.push({t:addSel.value,o:defaults(addSel.value)});renderSteps();upd()};
Array.prototype.forEach.call(document.querySelectorAll('[data-tpl]'),function(b){b.onclick=function(){var t=TPL[b.getAttribute('data-tpl')];if(!t)return;steps=sanitize(t.s);out.innerHTML='';renderSteps();upd()}});
function upd(){run.disabled=!(files.length&&steps.length);linkOut.hidden=true}

/* ---------- guardar, enlaces ---------- */
function load(){try{var a=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(a)?a:[]}catch(e){return []}}
function store(a){try{localStorage.setItem(KEY,JSON.stringify(a));return true}catch(e){return false}}
function renderSaved(){
 var a=load();savedEl.innerHTML='';if(!a.length)return;
 var h=document.createElement('p');h.className='wf-sl';h.textContent='Tus flujos guardados en este navegador:';savedEl.appendChild(h);
 var ul=document.createElement('ul');ul.className='wf-saved';
 a.forEach(function(x,i){var li=document.createElement('li'),b=document.createElement('button'),d=document.createElement('button');
  b.type='button';b.className='wf-chip';b.textContent=String(x.n||'Flujo').slice(0,40);b.onclick=function(){steps=sanitize(x.s);out.innerHTML='';renderSteps();upd()};
  d.type='button';d.className='wf-del';d.textContent='✕';d.title='Borrar flujo';d.setAttribute('aria-label','Borrar '+b.textContent);
  d.onclick=function(){var c=load();c.splice(i,1);store(c);renderSaved()};
  li.appendChild(b);li.appendChild(d);ul.appendChild(li)});
 savedEl.appendChild(ul)}
$('wf-save').onclick=function(){
 out.innerHTML='';if(!steps.length){msg(out,'Agrega al menos un paso antes de guardar.');return}
 var n=nameIn.value.trim().slice(0,40)||('Flujo '+(load().length+1)),a=load().filter(function(x){return x.n!==n});
 a.unshift({n:n,s:steps});if(a.length>20)a=a.slice(0,20);
 if(store(a)){nameIn.value='';renderSaved();msg(out,'Flujo «'+n+'» guardado en este navegador.')}else msg(out,'Tu navegador no permite guardar. Usa «Copiar enlace».')};
function enc(o){return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function dec(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return JSON.parse(decodeURIComponent(escape(atob(s))))}
$('wf-link').onclick=function(){
 out.innerHTML='';if(!steps.length){msg(out,'Agrega al menos un paso para crear el enlace.');return}
 var url=location.origin+location.pathname+'#f='+enc(steps.map(function(s){return {t:s.t,o:s.o}}));
 linkOut.value=url;linkOut.hidden=false;linkOut.select();
 var done=function(){msg(out,'Enlace copiado. Quien lo abra verá estos pasos, nunca tus archivos.')};
 try{navigator.clipboard.writeText(url).then(done,function(){msg(out,'Copia el enlace del recuadro.')})}catch(e){msg(out,'Copia el enlace del recuadro.')}};
function fromHash(){var m=location.hash.match(/^#f=([A-Za-z0-9_-]{1,4000})$/);if(!m)return;try{var s=sanitize(dec(m[1]));if(s.length){steps=s;renderSteps();upd()}}catch(e){}}
window.addEventListener('hashchange',fromHash);

/* ---------- ejecucion ---------- */
function parse(str,n){var res=[],toks=String(str).split(/[,;]+/).map(function(t){return t.trim()}).filter(Boolean);
 if(!toks.length)throw new Error('escribe las páginas, por ejemplo 1-3, 5.');
 toks.forEach(function(t){var m=t.match(/^(\d+)?\s*-\s*(\d+)?$/),a,b;
  if(m&&(m[1]||m[2])){a=m[1]?+m[1]:1;b=m[2]?+m[2]:n}else if(/^\d+$/.test(t)){a=b=+t}else throw new Error('no entiendo «'+t+'».');
  if(a<1||b>n||a>b)throw new Error('el rango «'+t+'» no es válido: en este paso el PDF tiene '+n+' páginas.');
  for(var p=a;p<=b;p++)res.push(p-1)});
 return res}
function sel(doc,txt){var n=doc.getPageCount();return String(txt||'').trim()?parse(txt,n):doc.getPageIndices()}
async function copyDoc(doc,idx){var d=await PDFLib.PDFDocument.create();(await d.copyPages(doc,idx)).forEach(function(p){d.addPage(p)});return d}
async function loadPdf(f){try{return await PDFLib.PDFDocument.load(await f.arrayBuffer())}catch(e){throw new Error(f.name+': '+(/encrypt/i.test(e.message)?'está protegido con contraseña.':'no es un PDF válido o está dañado.'))}}
async function apply(doc,s,notes){
 var PL=PDFLib,o=s.o,n=doc.getPageCount();
 switch(s.t){
 case 'reorder':var seen={},ord=[];parse(o.pages,n).forEach(function(i){if(!seen[i]){seen[i]=1;ord.push(i)}});doc.getPageIndices().forEach(function(i){if(!seen[i])ord.push(i)});return copyDoc(doc,ord);
 case 'delete':var del={};parse(o.pages,n).forEach(function(i){del[i]=1});var keep=doc.getPageIndices().filter(function(i){return !del[i]});if(!keep.length)throw new Error('no puedes eliminar todas las páginas.');return copyDoc(doc,keep);
 case 'extract':return copyDoc(doc,parse(o.pages,n));
 case 'rotate':var deg=+o.deg;sel(doc,o.pages).forEach(function(i){var pg=doc.getPage(i);pg.setRotation(PL.degrees((((pg.getRotation().angle+deg)%360)+360)%360))});return doc;
 case 'number':
  var st=parseInt(o.start,10);if(!(st>=0))throw new Error('el número inicial debe ser 0 o mayor.');
  var font=await doc.embedFont(PL.StandardFonts.Helvetica);
  sel(doc,o.pages).forEach(function(i){var pg=doc.getPage(i),sz=pg.getSize(),num=st+i,t=o.fmt==='n'?String(num):o.fmt==='p'?'Página '+num:'Página '+num+' de '+(st+n-1),w=font.widthOfTextAtSize(t,10),c=o.pos.charAt(1),x=c==='l'?36:c==='r'?sz.width-36-w:(sz.width-w)/2,y=o.pos.charAt(0)==='t'?sz.height-30:22;
   pg.drawText(t,{x:x,y:y,size:10,font:font,color:PL.rgb(0.2,0.2,0.2)})});
  return doc;
 case 'watermark':
  var tx=String(o.text||'').trim();if(!tx)throw new Error('escribe el texto de la marca de agua.');
  var wf=await doc.embedFont(PL.StandardFonts.HelveticaBold),op=+o.op,ang=+o.ang,w1;
  try{w1=wf.widthOfTextAtSize(tx,1)}catch(e){throw new Error('la marca de agua solo admite letras latinas (con acentos), números y signos comunes.')}
  sel(doc,o.pages).forEach(function(i){var pg=doc.getPage(i),sz=pg.getSize(),L=ang?Math.hypot(sz.width,sz.height)*0.62:sz.width*0.8,fs=Math.min(L/w1,140),tw=w1*fs,th=fs*0.7,r=ang*Math.PI/180,cx=sz.width/2,cy=sz.height/2,
   x=cx-(tw/2)*Math.cos(r)+(th/2)*Math.sin(r),y=cy-(tw/2)*Math.sin(r)-(th/2)*Math.cos(r);
   pg.drawText(tx,{x:x,y:y,size:fs,font:wf,color:PL.rgb(0.45,0.45,0.45),opacity:op,rotate:PL.degrees(ang)})});
  return doc;
 case 'crop':
  var mg=['t','r','b','l'].map(function(k){var v=parseFloat(String(o[k]).replace(',','.'));if(!(v>=0))throw new Error('los márgenes deben ser números de 0 o más (en milímetros).');return v*2.834645});
  sel(doc,o.pages).forEach(function(i){var pg=doc.getPage(i),sz=pg.getSize();
   if(mg[3]+mg[1]>=sz.width-20||mg[0]+mg[2]>=sz.height-20)throw new Error('esos márgenes son demasiado grandes para la página '+(i+1)+'.');
   pg.setCropBox(mg[3],mg[2],sz.width-mg[3]-mg[1],sz.height-mg[0]-mg[2]);pg.setMediaBox(mg[3],mg[2],sz.width-mg[3]-mg[1],sz.height-mg[0]-mg[2])});
  notes.crop=1;return doc;
 case 'compress':
  if(o.lv!=='strong')return doc;
  if(n>60)throw new Error('la compresión fuerte admite hasta 60 páginas.');
  await need('pdfjs');pdfjsLib.GlobalWorkerOptions.workerSrc=PDFWORKER;
  var pd=await pdfjsLib.getDocument({data:await doc.save()}).promise,dst=await PL.PDFDocument.create();
  for(var q=1;q<=pd.numPages;q++){
   var pg2=await pd.getPage(q),v1=pg2.getViewport({scale:1}),vp=pg2.getViewport({scale:1.4}),cv=document.createElement('canvas');
   cv.width=Math.round(vp.width);cv.height=Math.round(vp.height);var cx2=cv.getContext('2d');cx2.fillStyle='#fff';cx2.fillRect(0,0,cv.width,cv.height);
   await pg2.render({canvasContext:cx2,viewport:vp}).promise;
   var jb=await new Promise(function(r){cv.toBlob(r,'image/jpeg',0.6)});
   var im=await dst.embedJpg(new Uint8Array(await jb.arrayBuffer())),np=dst.addPage([v1.width,v1.height]);
   np.drawImage(im,{x:0,y:0,width:v1.width,height:v1.height});cv.width=1;cv.height=1}
  notes.strong=1;return dst}
 return doc}
run.onclick=async function(){
 out.innerHTML='';run.disabled=true;
 var total=files.reduce(function(s,f){return s+f.size},0);
 if(total>20971520||steps.some(function(s){return s.t==='compress'&&s.o.lv==='strong'}))gameOn(out);
 var notes={};
 try{
  msg(out,'Preparando…');var row=out.lastChild;await need('pdflib');
  var doc;
  if(files.length>1){row.textContent='Uniendo '+files.length+' PDF…';doc=await PDFLib.PDFDocument.create();
   for(var i=0;i<files.length;i++){var src=await loadPdf(files[i]);(await doc.copyPages(src,src.getPageIndices())).forEach(function(p){doc.addPage(p)})}}
  else doc=await loadPdf(files[0]);
  for(var k=0;k<steps.length;k++){
   row.textContent='Paso '+(k+1)+' de '+steps.length+': '+T[steps[k].t].n+'…';
   try{doc=await apply(doc,steps[k],notes)}catch(e){throw new Error('Paso '+(k+1)+' ('+T[steps[k].t].n+'): '+(e&&e.message?e.message:'no se pudo aplicar.'))}}
  row.textContent='Guardando…';
  var blob=new Blob([await doc.save({useObjectStreams:true})],{type:'application/pdf'});
  out.innerHTML='';addOut(out,blob,base(files[0])+'-flujo.pdf');
  msg(out,'Se aplicaron '+steps.length+' paso'+(steps.length>1?'s':'')+(files.length>1?' a '+files.length+' PDF unidos':'')+'. Resultado: '+doc.getPageCount()+' página'+(doc.getPageCount()>1?'s':'')+'.');
  if(blob.size<total*0.98)msg(out,'Pesa un '+Math.round((1-blob.size/total)*100)+' % menos que el original.');
  if(notes.strong)msg(out,'Con la compresión fuerte el texto del PDF ya no se puede seleccionar ni buscar.');
  if(notes.crop)msg(out,'El contenido recortado no se borra del archivo: solo queda fuera del área visible.');
 }catch(e){out.innerHTML='';msg(out,e&&e.message?e.message:'No se pudo ejecutar el flujo.')}
 gameOff();upd()};

renderSteps();renderSaved();fromHash();upd();
})();
