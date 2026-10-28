
/* Herramientas PDF: unir, dividir, eliminar y extraer paginas (pdf-lib, en el navegador) */
var pF=document.getElementById('p-file'),pG=document.getElementById('p-go'),pO=document.getElementById('p-out'),pL=document.getElementById('p-order'),pR=document.getElementById('p-range'),pRow=document.getElementById('p-optrow'),pH=document.getElementById('p-hint'),pRT=document.getElementById('p-rtext'),pDrop=document.getElementById('p-drop'),pList=[];
function pmode(){return document.querySelector('input[name=pmode]:checked').value}
var PINFO={merge:['Elige dos o m\u00e1s PDF. Podr\u00e1s ordenarlos antes de unirlos.',''],split:['Elige un PDF.','Rangos (ej. 1-3, 4-6). D\u00e9jalo vac\u00edo para una p\u00e1gina por archivo'],delete:['Elige un PDF.','P\u00e1ginas a eliminar (ej. 2, 5-7)'],extract:['Elige un PDF.','P\u00e1ginas a conservar, en orden (ej. 5, 1-3)']};
function pRender(){
 pL.innerHTML='';pG.disabled=!pList.length;
 pList.forEach(function(f,i){var li=document.createElement('li'),s=document.createElement('span');
  s.textContent=(pmode()==='merge'?(i+1)+'. ':'')+f.name+' \u00b7 '+fsize(f.size)+(f._n?' \u00b7 '+f._n+' p\u00e1g.':'');li.appendChild(s);
  if(pmode()==='merge'){var ro=document.createElement('span');ro.className='ord';
   [['\u25b2','Subir',-1],['\u25bc','Bajar',1],['\u2715','Quitar',0]].forEach(function(b){var bt=document.createElement('button');bt.type='button';bt.textContent=b[0];bt.title=b[1];bt.setAttribute('aria-label',b[1]+' '+f.name);
    bt.onclick=function(){if(b[2]===0)pList.splice(i,1);else{var j=i+b[2];if(j<0||j>=pList.length)return;var t=pList[i];pList[i]=pList[j];pList[j]=t}pRender()};ro.appendChild(bt)});
   li.appendChild(ro)}
  pL.appendChild(li)})}
function pMode(){var m=pmode(),i=PINFO[m];pF.multiple=(m==='merge');pH.textContent=i[0];pRT.textContent=i[1];pRow.style.display=m==='merge'?'none':'';if(m!=='merge'&&pList.length>1)pList=[pList[0]];pRender()}
async function pCount(){try{await need('pdflib');for(var i=0;i<pList.length;i++){var f=pList[i];if(f._n!==undefined)continue;try{f._n=(await PDFLib.PDFDocument.load(await f.arrayBuffer(),{ignoreEncryption:true})).getPageCount()}catch(e){f._n=0}}pRender()}catch(e){}}
function pAdd(files){var arr=Array.prototype.filter.call(files,function(f){return f.type==='application/pdf'||/\.pdf$/i.test(f.name)});
 pO.innerHTML='';if(!arr.length){msg(pO,'Elige archivos PDF.');return}
 pList=pmode()==='merge'?pList.concat(arr):[arr[0]];pRender();pCount()}
pF.onchange=function(){pAdd(pF.files);pF.value=''};
['dragover','dragenter'].forEach(function(e){pDrop.addEventListener(e,function(ev){ev.preventDefault();pDrop.classList.add('over')})});
['dragleave','drop'].forEach(function(e){pDrop.addEventListener(e,function(ev){ev.preventDefault();pDrop.classList.remove('over')})});
pDrop.addEventListener('drop',function(ev){pAdd(ev.dataTransfer.files)});
document.getElementById('p-modes').onchange=function(){pO.innerHTML='';pMode()};
var pmb=document.getElementById('p-more');pmb.onclick=function(){var o=document.getElementById('p-modes').classList.toggle('more');pmb.textContent=o?'Mostrar menos':'Mostrar m\u00e1s';pmb.setAttribute('aria-expanded',o)};
function pParse(str,n){var out=[],toks=str.split(/[,;]+/).map(function(t){return t.trim()}).filter(Boolean);
 if(!toks.length)throw new Error('Escribe las p\u00e1ginas, por ejemplo 1-3, 5.');
 for(var k=0;k<toks.length;k++){var t=toks[k],m=t.match(/^(\d+)?\s*-\s*(\d+)?$/),a,b;
  if(m&&(m[1]||m[2])){a=m[1]?+m[1]:1;b=m[2]?+m[2]:n}else if(/^\d+$/.test(t)){a=b=+t}else throw new Error('No entiendo \u00ab'+t+'\u00bb. Usa n\u00fameros y rangos, por ejemplo 1-3, 5.');
  if(a<1||b>n||a>b)throw new Error('El rango \u00ab'+t+'\u00bb no es v\u00e1lido: el PDF tiene '+n+' p\u00e1ginas.');
  var r=[];for(var p=a;p<=b;p++)r.push(p-1);out.push(r)}
 return out}
async function pLoad(f){try{return await PDFLib.PDFDocument.load(await f.arrayBuffer())}catch(e){throw new Error(f.name+': '+(/encrypt/i.test(e.message)?'est\u00e1 protegido con contrase\u00f1a.':'no es un PDF v\u00e1lido o est\u00e1 da\u00f1ado.'))}}
async function pSave(d){return new Blob([await d.save()],{type:'application/pdf'})}
pG.onclick=async function(){
 pO.innerHTML='';pG.disabled=true;var m=pmode();
 if(pList.reduce(function(s,f){return s+f.size},0)>20971520)gameOn(pO);
 try{
  msg(pO,'Preparando\u2026');var prep=pO.lastChild;await need('pdflib');var PD=PDFLib.PDFDocument,outs=[];
  if(m==='merge'){
   if(pList.length<2)throw new Error('Elige al menos dos PDF para unir.');
   var dst=await PD.create();
   for(var i=0;i<pList.length;i++){var src=await pLoad(pList[i]);(await dst.copyPages(src,src.getPageIndices())).forEach(function(p){dst.addPage(p)})}
   outs.push({b:await pSave(dst),n:'unido.pdf'})
  }else{
   var f=pList[0],src2=await pLoad(f),n=src2.getPageCount(),txt=pR.value.trim(),bn=base(f);
   var build=async function(idx){var d=await PD.create();(await d.copyPages(src2,idx)).forEach(function(p){d.addPage(p)});return pSave(d)};
   if(m==='split'){
    var groups=txt?pParse(txt,n):src2.getPageIndices().map(function(i){return [i]});
    if(groups.length>100)throw new Error('M\u00e1ximo 100 archivos por vez.');
    for(var g=0;g<groups.length;g++)outs.push({b:await build(groups[g]),n:bn+'-'+(g+1)+'.pdf'})
   }else if(m==='delete'){
    var del={};pParse(txt,n).forEach(function(r){r.forEach(function(i){del[i]=1})});
    var keep=src2.getPageIndices().filter(function(i){return !del[i]});
    if(!keep.length)throw new Error('No puedes eliminar todas las p\u00e1ginas.');
    outs.push({b:await build(keep),n:bn+'-sin-paginas.pdf'})
   }else{
    var idx=[];pParse(txt,n).forEach(function(r){idx=idx.concat(r)});
    outs.push({b:await build(idx),n:bn+'-extraido.pdf'})}
  }
  prep.remove();
  outs.forEach(function(o){addOut(pO,o.b,o.n)});
  if(outs.length>1){await need('jszip');var Z=new JSZip();outs.forEach(function(o){Z.file(o.n,o.b)});addOut(pO,await Z.generateAsync({type:'blob'}),base(pList[0])+'-paginas.zip')}
 }catch(e){pO.innerHTML='';msg(pO,e&&e.message?e.message:'No se pudo procesar el PDF.')}
 gameOff();pG.disabled=!pList.length};
pMode();
