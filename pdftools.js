
/* Herramientas PDF (pdf-lib en el navegador): unir, dividir, eliminar, extraer, ordenar, rotar, numerar, marca de agua, recortar y comprimir */
var PDFWORKER='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
var pF=document.getElementById('p-file'),pG=document.getElementById('p-go'),pO=document.getElementById('p-out'),pL=document.getElementById('p-order'),pR=document.getElementById('p-range'),pRow=document.getElementById('p-optrow'),pH=document.getElementById('p-hint'),pRT=document.getElementById('p-rtext'),pDrop=document.getElementById('p-drop'),pList=[];
/* Vista de una pagina tal como se ve en pantalla: respeta el giro guardado en el PDF (/Rotate).
   w,h = ancho y alto visibles; at(x,y) = punto visible -> coordenadas internas; margins = margenes visibles -> internos */
function pview(pg){var mb=pg.getMediaBox(),r=((pg.getRotation().angle%360)+360)%360,W=mb.width,H=mb.height,s=(r===90||r===270);
 return {r:r,w:s?H:W,h:s?W:H,W:W,H:H,mb:mb,
  at:function(dx,dy){var x=dx,y=dy;if(r===90){x=W-dy;y=dx}else if(r===180){x=W-dx;y=H-dy}else if(r===270){x=dy;y=H-dx}return {x:mb.x+x,y:mb.y+y}},
  margins:function(t,rt,b,l){return r===90?[rt,b,l,t]:r===180?[b,l,t,rt]:r===270?[l,t,rt,b]:[t,rt,b,l]}}}
function pmode(){return document.querySelector('input[name=pmode]:checked').value}
function val(id){return document.getElementById(id).value}
var PM={
 merge:{h:'Elige dos o m\u00e1s PDF. Podr\u00e1s ordenarlos antes de unirlos.',r:null},
 split:{h:'Elige un PDF.',r:'Rangos (ej. 1-3, 4-6). D\u00e9jalo vac\u00edo para una p\u00e1gina por archivo'},
 delete:{h:'Elige un PDF.',r:'P\u00e1ginas a eliminar (ej. 2, 5-7)'},
 extract:{h:'Elige un PDF.',r:'P\u00e1ginas a conservar, en orden (ej. 5, 1-3)'},
 reorder:{h:'Elige un PDF.',r:'Nuevo orden (ej. 3, 1, 2). Las p\u00e1ginas que no escribas pasan al final'},
 rotate:{h:'Elige un PDF.',r:'P\u00e1ginas a girar (vac\u00edo = todas)'},
 number:{h:'Elige un PDF.',r:'P\u00e1ginas a numerar (vac\u00edo = todas)'},
 watermark:{h:'Elige un PDF.',r:'P\u00e1ginas con marca de agua (vac\u00edo = todas)'},
 crop:{h:'Elige un PDF.',r:'P\u00e1ginas a recortar (vac\u00edo = todas)'},
 compress:{h:'Elige un PDF.',r:null}};
function pRender(){
 pL.innerHTML='';pG.disabled=!pList.length;
 pList.forEach(function(f,i){var li=document.createElement('li'),s=document.createElement('span');
  s.textContent=(pmode()==='merge'?(i+1)+'. ':'')+f.name+' \u00b7 '+fsize(f.size)+(f._n?' \u00b7 '+f._n+' p\u00e1g.':'');li.appendChild(s);
  if(pmode()==='merge'){var ro=document.createElement('span');ro.className='ord';
   [['\u25b2','Subir',-1],['\u25bc','Bajar',1],['\u2715','Quitar',0]].forEach(function(b){var bt=document.createElement('button');bt.type='button';bt.textContent=b[0];bt.title=b[1];bt.setAttribute('aria-label',b[1]+' '+f.name);
    bt.onclick=function(){if(b[2]===0)pList.splice(i,1);else{var j=i+b[2];if(j<0||j>=pList.length)return;var t=pList[i];pList[i]=pList[j];pList[j]=t}pRender()};ro.appendChild(bt)});
   li.appendChild(ro)}
  pL.appendChild(li)})}
function pMode(){var m=pmode(),i=PM[m];pF.multiple=(m==='merge');pH.textContent=i.h;pRT.textContent=i.r||'';pRow.style.display=i.r?'':'none';
 Array.prototype.forEach.call(document.querySelectorAll('#p-opts [data-m]'),function(r){r.style.display=r.getAttribute('data-m')===m?'':'none'});
 if(m!=='merge'&&pList.length>1)pList=[pList[0]];pRender()}
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
async function pSave(d,o){return new Blob([await d.save(o||{})],{type:'application/pdf'})}
pG.onclick=async function(){
 pO.innerHTML='';pG.disabled=true;var m=pmode();
 var big=pList.reduce(function(s,f){return s+f.size},0)>20971520||(m==='compress'&&val('p-clv')!=='light');
 if(big)gameOn(pO);
 try{
  msg(pO,'Preparando\u2026');var prep=pO.lastChild;await need('pdflib');var PL=PDFLib,PD=PL.PDFDocument,outs=[],notes=[];
  if(m==='merge'){
   if(pList.length<2)throw new Error('Elige al menos dos PDF para unir.');
   var dst=await PD.create();
   for(var i=0;i<pList.length;i++){var src=await pLoad(pList[i]);(await dst.copyPages(src,src.getPageIndices())).forEach(function(p){dst.addPage(p)})}
   outs.push({b:await pSave(dst),n:'unido.pdf'})
  }else{
   if(!pList.length)throw new Error('Elige un PDF.');
   var f=pList[0],src2=await pLoad(f),n=src2.getPageCount(),txt=pR.value.trim(),bn=base(f),all=src2.getPageIndices();
   var pages=function(){if(!txt)return all;var a=[];pParse(txt,n).forEach(function(r){a=a.concat(r)});return a};
   var build=async function(idx){var d=await PD.create();(await d.copyPages(src2,idx)).forEach(function(p){d.addPage(p)});return pSave(d)};
   if(m==='split'){
    var groups=txt?pParse(txt,n):all.map(function(i){return [i]});
    if(groups.length>100)throw new Error('M\u00e1ximo 100 archivos por vez.');
    for(var g=0;g<groups.length;g++)outs.push({b:await build(groups[g]),n:bn+'-'+(g+1)+'.pdf'})
   }else if(m==='delete'){
    var del={};pParse(txt,n).forEach(function(r){r.forEach(function(i){del[i]=1})});
    var keep=all.filter(function(i){return !del[i]});
    if(!keep.length)throw new Error('No puedes eliminar todas las p\u00e1ginas.');
    outs.push({b:await build(keep),n:bn+'-sin-paginas.pdf'})
   }else if(m==='extract'){
    var idx=[];pParse(txt,n).forEach(function(r){idx=idx.concat(r)});
    outs.push({b:await build(idx),n:bn+'-extraido.pdf'})
   }else if(m==='reorder'){
    var seen={},ord=[];pParse(txt,n).forEach(function(r){r.forEach(function(i){if(!seen[i]){seen[i]=1;ord.push(i)}})});
    all.forEach(function(i){if(!seen[i])ord.push(i)});
    outs.push({b:await build(ord),n:bn+'-ordenado.pdf'})
   }else if(m==='rotate'){
    var deg=+val('p-rot');pages().forEach(function(i){var pg=src2.getPage(i);pg.setRotation(PL.degrees((((pg.getRotation().angle+deg)%360)+360)%360))});
    outs.push({b:await pSave(src2),n:bn+'-girado.pdf'})
   }else if(m==='number'){
    var st=parseInt(val('p-nstart'),10);if(!(st>=0))throw new Error('El n\u00famero inicial debe ser 0 o mayor.');
    var font=await src2.embedFont(PL.StandardFonts.Helvetica),pos=val('p-npos'),fmt=val('p-nfmt');
    pages().forEach(function(i){var pg=src2.getPage(i),v=pview(pg),num=st+i,t=fmt==='n'?String(num):fmt==='p'?'P\u00e1gina '+num:'P\u00e1gina '+num+' de '+(st+n-1),w=font.widthOfTextAtSize(t,10),c=pos.charAt(1),x=c==='l'?36:c==='r'?v.w-36-w:(v.w-w)/2,y=pos.charAt(0)==='t'?v.h-30:22,q=v.at(x,y);
     var bq=v.at(x-4,y-4);pg.drawRectangle({x:bq.x,y:bq.y,width:w+8,height:15,color:PL.rgb(1,1,1),opacity:0.85,rotate:PL.degrees(v.r)});
     pg.drawText(t,{x:q.x,y:q.y,size:10,font:font,color:PL.rgb(0.2,0.2,0.2),rotate:PL.degrees(v.r)})});
    outs.push({b:await pSave(src2),n:bn+'-numerado.pdf'})
   }else if(m==='watermark'){
    var tx=val('p-wtext').trim();if(!tx)throw new Error('Escribe el texto de la marca de agua.');
    var wf=await src2.embedFont(PL.StandardFonts.HelveticaBold),op=+val('p-wop'),ang=+val('p-wang'),w1;
    try{w1=wf.widthOfTextAtSize(tx,1)}catch(e){throw new Error('La marca de agua solo admite letras latinas (con acentos), n\u00fameros y signos comunes.')}
    pages().forEach(function(i){var pg=src2.getPage(i),v=pview(pg),L=ang?Math.hypot(v.w,v.h)*0.62:v.w*0.8,fs=Math.min(L/w1,140),tw=w1*fs,th=fs*0.7,r=ang*Math.PI/180,cx=v.w/2,cy=v.h/2,
     q=v.at(cx-(tw/2)*Math.cos(r)+(th/2)*Math.sin(r),cy-(tw/2)*Math.sin(r)-(th/2)*Math.cos(r));
     pg.drawText(tx,{x:q.x,y:q.y,size:fs,font:wf,color:PL.rgb(0.45,0.45,0.45),opacity:op,rotate:PL.degrees(ang+v.r)})});
    outs.push({b:await pSave(src2),n:bn+'-marca-de-agua.pdf'})
   }else if(m==='crop'){
    var mm=2.834645,mg=['p-ct','p-cr','p-cb','p-cl'].map(function(id){var v=parseFloat(val(id).replace(',','.'));if(!(v>=0))throw new Error('Los m\u00e1rgenes deben ser n\u00fameros de 0 o m\u00e1s (en mil\u00edmetros).');return v*mm});
    pages().forEach(function(i){var pg=src2.getPage(i),v=pview(pg),q=v.margins(mg[0],mg[1],mg[2],mg[3]),t=q[0],r=q[1],b=q[2],l=q[3],W=v.W,H=v.H;
     if(l+r>=W-20||t+b>=H-20)throw new Error('Esos m\u00e1rgenes son demasiado grandes para la p\u00e1gina '+(i+1)+'.');
     pg.setCropBox(v.mb.x+l,v.mb.y+b,W-l-r,H-t-b);pg.setMediaBox(v.mb.x+l,v.mb.y+b,W-l-r,H-t-b)});
    outs.push({b:await pSave(src2),n:bn+'-recortado.pdf'});
    notes.push('El contenido recortado no se borra del archivo: solo queda fuera del \u00e1rea visible. No uses esta herramienta para ocultar informaci\u00f3n sensible.')
   }else{ /* compress */
    var orig=f.size,pct=function(b){return Math.round((1-b.size/orig)*100)};
    if(val('p-clv')==='light'){
     var b1=await pSave(src2,{useObjectStreams:true});
     if(b1.size>=orig*0.98)notes.push('La compresi\u00f3n ligera casi no reduce el peso de este PDF (menos de 2 %). Prueba el nivel fuerte.');
     else outs.push({b:b1,n:bn+'-comprimido.pdf',pct:pct(b1)})
    }else if(val('p-clv')==='strong'){
     await need('pdfjs');pdfjsLib.GlobalWorkerOptions.workerSrc=PDFWORKER;
     var pd=await pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise;
     if(pd.numPages>60)throw new Error('La compresi\u00f3n fuerte admite hasta 60 p\u00e1ginas. Divide el PDF primero.');
     var dst2=await PD.create();
     for(var q=1;q<=pd.numPages;q++){
      msg(pO,'Comprimiendo p\u00e1gina '+q+' de '+pd.numPages+'\u2026');var row=pO.lastChild;
      var pg2=await pd.getPage(q),v1=pg2.getViewport({scale:1}),vp=pg2.getViewport({scale:1.4}),cv=document.createElement('canvas');
      cv.width=Math.round(vp.width);cv.height=Math.round(vp.height);var cx2=cv.getContext('2d');cx2.fillStyle='#fff';cx2.fillRect(0,0,cv.width,cv.height);
      await pg2.render({canvasContext:cx2,viewport:vp}).promise;
      var jb=await new Promise(function(r){cv.toBlob(r,'image/jpeg',0.6)});
      var im=await dst2.embedJpg(new Uint8Array(await jb.arrayBuffer())),np=dst2.addPage([v1.width,v1.height]);
      np.drawImage(im,{x:0,y:0,width:v1.width,height:v1.height});row.remove();cv.width=1;cv.height=1}
     var b2=await pSave(dst2);
     if(b2.size>=orig*0.95)notes.push('El resultado no reduce el peso lo suficiente (menos de 5 %), por eso no se ofrece. Este PDF ya est\u00e1 optimizado.');
     else{outs.push({b:b2,n:bn+'-comprimido.pdf',pct:pct(b2)});notes.push('Con la compresi\u00f3n fuerte el texto del PDF ya no se puede seleccionar ni buscar.')}
    }else{ /* peso maximo: t500, t1000, t2000, t5000 (KB decimales, asi cumple aunque el sitio cuente 1 KB = 1000 o 1024 bytes) */
     var T=+val('p-clv').slice(1)*1000,TL=T>=1000000?(T/1000000)+' MB':(T/1000)+' KB';
     if(orig<=T){notes.push('Tu PDF ya pesa '+fsize(orig)+', menos de '+TL+'. No hace falta comprimirlo.')}
     else{
      var bl=await pSave(src2,{useObjectStreams:true});
      if(bl.size<=T){outs.push({b:bl,n:bn+'-'+TL.replace(' ','').toLowerCase()+'.pdf',pct:pct(bl)});notes.push('Se logr\u00f3 sin convertir las p\u00e1ginas en im\u00e1genes: el texto se conserva.')}
      else{
       await need('pdfjs');pdfjsLib.GlobalWorkerOptions.workerSrc=PDFWORKER;
       var pt=await pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise,np2=pt.numPages;
       if(np2>60)throw new Error('Para llegar a un peso m\u00e1ximo se admiten hasta 60 p\u00e1ginas. Divide el PDF primero.');
       /* combinaciones de nitidez (escala sobre 144 ppp) y calidad JPG, de mejor a mas ligera */
       var CB=[[1,.8],[1,.65],[.8,.65],[.8,.5],[.65,.5],[.65,.38],[.5,.4],[.42,.35],[.34,.3]],tot=CB.map(function(){return 0});
       var rp=async function(q,fn){var pg=await pt.getPage(q),v=pg.getViewport({scale:1}),sc=Math.min(2,Math.sqrt(2600000/(v.width*v.height))),vp=pg.getViewport({scale:sc}),cv=document.createElement('canvas');
        cv.width=Math.round(vp.width);cv.height=Math.round(vp.height);var x=cv.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,cv.width,cv.height);await pg.render({canvasContext:x,viewport:vp}).promise;
        await fn(cv,v);cv.width=cv.height=1};
       var enc=async function(cv,k,ql){var c=cv;if(k<1){c=document.createElement('canvas');c.width=Math.max(1,Math.round(cv.width*k));c.height=Math.max(1,Math.round(cv.height*k));var x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(cv,0,0,c.width,c.height)}
        var b=await new Promise(function(r){c.toBlob(r,'image/jpeg',ql)});if(c!==cv)c.width=c.height=1;return b};
       for(var q3=1;q3<=np2;q3++){msg(pO,'Midiendo p\u00e1gina '+q3+' de '+np2+'\u2026');var r3=pO.lastChild;
        await rp(q3,async function(cv){for(var j=0;j<CB.length;j++)tot[j]+=(await enc(cv,CB[j][0],CB[j][1])).size});r3.remove()}
       var ci=CB.length-1;for(var j2=0;j2<CB.length;j2++){if(tot[j2]+np2*700+3000<=T*0.97){ci=j2;break}}
       var bt=null;
       for(;ci<CB.length;ci++){var dst3=await PD.create();
        for(var q4=1;q4<=np2;q4++){msg(pO,'Comprimiendo p\u00e1gina '+q4+' de '+np2+'\u2026');var r4=pO.lastChild;
         await rp(q4,async function(cv,v){var jb=await enc(cv,CB[ci][0],CB[ci][1]),im=await dst3.embedJpg(new Uint8Array(await jb.arrayBuffer())),pp=dst3.addPage([v.width,v.height]);pp.drawImage(im,{x:0,y:0,width:v.width,height:v.height})});r4.remove()}
        bt=await pSave(dst3);if(bt.size<=T)break}
       if(bt.size<=T){outs.push({b:bt,n:bn+'-'+TL.replace(' ','').toLowerCase()+'.pdf',pct:pct(bt)});notes.push('Listo: pesa '+fsize(bt.size)+', por debajo de '+TL+'. Para lograrlo las p\u00e1ginas se guardaron como im\u00e1genes, as\u00ed que el texto ya no se puede seleccionar. Revisa que se lea bien antes de enviarlo.')}
       else{outs.push({b:bt,n:bn+'-lo-mas-ligero.pdf',pct:pct(bt)});notes.push('No se pudo bajar de '+TL+' sin que el texto se vuelva ilegible: lo m\u00e1s ligero posible pesa '+fsize(bt.size)+'. Prueba separar el PDF con \u00abDividir PDF\u00bb y enviar las partes por separado.')}
      }
     }
    }
   }
  }
  prep.remove();
  outs.forEach(function(o){addOut(pO,o.b,o.n);if(o.pct!=null)msg(pO,'Se redujo un '+o.pct+' % respecto al original.')});
  if(outs.length>1){await need('jszip');var Z=new JSZip();outs.forEach(function(o){Z.file(o.n,o.b)});addOut(pO,await Z.generateAsync({type:'blob'}),base(pList[0])+'-paginas.zip')}
  notes.forEach(function(t){msg(pO,t)});
 }catch(e){pO.innerHTML='';msg(pO,e&&e.message?e.message:'No se pudo procesar el PDF.')}
 gameOff();pG.disabled=!pList.length};
pMode();
