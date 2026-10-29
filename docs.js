/* Excel a PDF: limpia la hoja (filas y columnas vacias), separa titulos de una celda y notas finales */
function xlClean(rows){
 rows=rows.map(function(r){return (r||[]).map(function(c){return c==null?'':String(c).trim()})}).filter(function(r){return r.some(function(c){return c!==''})});
 if(!rows.length)return null;
 var nc=Math.max.apply(null,rows.map(function(r){return r.length})),keep=[];
 for(var j=0;j<nc;j++)if(rows.some(function(r){return (r[j]||'')!==''}))keep.push(j);
 rows=rows.map(function(r){return keep.map(function(j){return r[j]||''})});
 var filled=function(r){return r.filter(function(c){return c!==''}).length},title=[],notes=[];
 while(rows.length>1&&keep.length>1&&filled(rows[0])===1)title.push(rows.shift().join(' ').trim());
 while(rows.length>1&&keep.length>1&&filled(rows[rows.length-1])===1&&rows[rows.length-1][0]!=='')notes.unshift(rows.pop()[0]);
 return {title:title,head:rows[0],body:rows.slice(1),notes:notes}}
function xlDraw(px,name,c){
 var W=px.internal.pageSize.getWidth()-80,H=px.internal.pageSize.getHeight()-40,y=30;
 px.setFontSize(12);px.text(name,40,y);
 px.setFontSize(10);c.title.forEach(function(t){var ls=px.splitTextToSize(t,W);y+=16;px.text(ls,40,y);y+=(ls.length-1)*12});
 px.autoTable({head:[c.head],body:c.body,startY:y+12,styles:{fontSize:8},margin:{left:40,right:40}});
 if(c.notes.length){var ny=(px.lastAutoTable&&px.lastAutoTable.finalY?px.lastAutoTable.finalY:y+40)+18;px.setFontSize(8);
  c.notes.forEach(function(t){var ls=px.splitTextToSize(t,W);if(ny+ls.length*11>H){px.addPage();ny=40}px.text(ls,40,ny);ny+=ls.length*11+4})}}

/* PDF a Word: reconstruye parrafos y titulos a partir del texto del PDF */
async function pdfToHtml(doc){
 var pages=[],cnt={};
 for(var q=1;q<=doc.numPages;q++){
  var pg=await doc.getPage(q),H=pg.view[3],tc=await pg.getTextContent(),L=[],cur=null,px=0;
  tc.items.forEach(function(it){
   if(!it.str)return;
   var y=it.transform[5],x=it.transform[4],s=Math.abs(it.transform[3])||it.height||10;
   if(cur&&Math.abs(y-cur.y)<=3){
    var sp=(x-px>s*0.15&&!/\s$/.test(cur.t)&&!/^\s/.test(it.str))?' ':'';
    cur.t+=sp+it.str;if(s>cur.s)cur.s=s}
   else{if(cur)L.push(cur);cur={y:y,s:s,t:it.str}}
   px=x+(it.width||0)});
  if(cur)L.push(cur);
  L.forEach(function(l){l.t=l.t.replace(/\s+/g,' ').trim();var k=Math.round(l.s*2)/2;if(l.t)cnt[k]=(cnt[k]||0)+l.t.length});
  pages.push(L.filter(function(l){return l.t&&l.y>=H*0.07}).concat(L.filter(function(l){return l.t&&l.y<H*0.07})))}
 var body=10,best=0;for(var k in cnt){if(cnt[k]>best){best=cnt[k];body=+k}}
 var html='';
 pages.forEach(function(L,pi){
  var par=null,prev=null;
  function close(){if(par){html+='<'+par.tag+'>'+esc(par.t)+'</'+par.tag+'>';par=null}}
  L.forEach(function(l){
   var r=l.s/body,tag=r>=2?'h1':r>=1.25?'h2':'p';
   var join=par&&prev&&tag==='p'&&par.tag==='p'&&Math.abs(l.s-prev.s)<=1.5&&prev.y>l.y&&(prev.y-l.y)<=l.s*1.85;
   if(join){par.t=(/-$/.test(par.t)&&/^[a-z\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1]/.test(l.t))?par.t.slice(0,-1)+l.t:par.t+' '+l.t}
   else{close();par={tag:tag,t:l.t}}
   prev=l});
  close();
  if(pi<pages.length-1)html+='<br clear="all" style="page-break-before:always">'});
 return html}

/* Word (.docx) armado a mano con JSZip: imagenes y parrafos */
function xesc(t){return String(t).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function canvasBlob(c,type){return new Promise(function(r){c.toBlob(r,type)})}
async function imgBlock(f){
 var im=await readImg(f),w=im.naturalWidth,h=im.naturalHeight,jpg=f.type==='image/jpeg',data;
 if(jpg)data=new Uint8Array(await f.arrayBuffer());
 else{var c=document.createElement('canvas');c.width=w;c.height=h;var x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(im,0,0);data=new Uint8Array(await (await canvasBlob(c,'image/png')).arrayBuffer())}
 return {img:{data:data,ext:jpg?'jpeg':'png',w:w,h:h}}}
async function ocrCanvas(f){
 var im=await readImg(f),w=im.naturalWidth,h=im.naturalHeight,s=Math.max(w,h)>3000?3000/Math.max(w,h):(Math.min(w,h)<1000?2:1),c=document.createElement('canvas');
 c.width=Math.round(w*s);c.height=Math.round(h*s);var x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);return c}
function buildDocx(blocks){
 var Z=new JSZip(),rels='',body='',n=0,MW=6120130,MH=8800000,H='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
 blocks.forEach(function(b){
  if(b.img){
   n++;var k=Math.min(MW/b.img.w,MH/b.img.h),cx=Math.round(b.img.w*k),cy=Math.round(b.img.h*k),fn='image'+n+'.'+b.img.ext,id='rId'+(n+10);
   Z.file('word/media/'+fn,b.img.data);
   rels+='<Relationship Id="'+id+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/'+fn+'"/>';
   body+='<w:p><w:pPr>'+(n>1?'<w:pageBreakBefore/>':'')+'<w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:docPr id="'+n+'" name="Imagen '+n+'" descr="Imagen '+n+'"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="'+n+'" name="'+fn+'"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="'+id+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'}
  else body+='<w:p><w:r><w:t xml:space="preserve">'+xesc(b.p)+'</w:t></w:r></w:p>'});
 Z.file('[Content_Types].xml',H+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
 Z.file('_rels/.rels',H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
 Z.file('word/_rels/document.xml.rels',H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+rels+'</Relationships>');
 Z.file('word/document.xml',H+'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>'+body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>');
 return Z.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})}
/* Documentos: imágenes a PDF, TXT a PDF, PDF a imágenes */
var dF=document.getElementById('d-file'),dM={get value(){return document.querySelector('input[name=dmode]:checked').value}},dG=document.getElementById('d-go'),dO=document.getElementById('d-out'),dH=document.getElementById('d-hint');
var dInfo={img:['image/*','Imágenes JPG, PNG o WebP'],txt:['.txt,text/plain','Archivos de texto (.txt)'],pdf:['application/pdf','Archivo PDF (se convierten hasta 20 páginas)'],docx:['.docx','Documento de Word (.docx)'],xlsx:['.xlsx,.xls,.csv','Hoja de Excel (.xlsx, .xls o .csv)'],pdfdoc:['application/pdf','PDF con texto seleccionable'],ocr:['application/pdf','PDF escaneado o fotografiado (hasta 10 páginas)'],img2docx:['image/*','Imágenes JPG, PNG o WebP'],pdfjpg:['application/pdf','PDF (se convierten hasta 20 páginas)'],ocrdocx:['image/*','Foto o captura con texto (JPG, PNG o WebP)']};
var mb=document.getElementById('d-more');mb.onclick=function(){var o=document.getElementById('d-modes').classList.toggle('more');mb.textContent=o?'Mostrar menos':'Mostrar más';mb.setAttribute('aria-expanded',o)};
document.getElementById('d-modes').onchange=function(){var i=dInfo[dM.value];dF.accept=i[0];dH.textContent=i[1];dF.value='';dG.disabled=true;dO.innerHTML=''};
dF.onchange=function(){dG.disabled=!dF.files.length;ready(dO,dF.files)};
dG.onclick=async function(){
 dO.innerHTML='';dG.disabled=true;var files=Array.from(dF.files),m=dM.value;if(m==='ocr'||m==='ocrdocx'||m==='docx'||files.some(function(f){return f.size>20971520}))gameOn(dO);
 try{
  msg(dO,'Preparando el convertidor…');var prep=dO.lastChild;
  var NEED={pdfjpg:['pdfjs'],img2docx:['jszip'],ocrdocx:['jszip','tesseract'],img:['jspdf'],txt:['jspdf'],pdf:['pdfjs'],docx:['jspdf','html2canvas','mammoth'],xlsx:['jspdf','autotable','xlsx'],pdfdoc:['pdfjs'],ocr:['pdfjs','tesseract']};
  for(var ni=0;ni<NEED[m].length;ni++)await need(NEED[m][ni]);
  prep.remove();
  if(m==='img'){
   var pdf=new jspdf.jsPDF({unit:'pt',format:'a4'}),W=pdf.internal.pageSize.getWidth(),H=pdf.internal.pageSize.getHeight();
   for(var k=0;k<files.length;k++){var im=await readImg(files[k]),c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;var x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0);
    var r=Math.min((W-40)/c.width,(H-40)/c.height),w=c.width*r,h=c.height*r;if(k)pdf.addPage();pdf.addImage(c.toDataURL('image/jpeg',.92),'JPEG',(W-w)/2,(H-h)/2,w,h)}
   addOut(dO,pdf.output('blob'),(files.length>1?'imagenes':base(files[0]))+'.pdf');
  }else if(m==='txt'){
   for(var f of files){var t=await f.text(),p=new jspdf.jsPDF({unit:'pt',format:'a4'}),L=p.splitTextToSize(t,p.internal.pageSize.getWidth()-100),y=60;p.setFontSize(11);
    L.forEach(function(l){if(y>780){p.addPage();y=60}p.text(l,50,y);y+=15});addOut(dO,p.output('blob'),base(f)+'.pdf')}
  }else if(m==='pdf'||m==='pdfjpg'){var jp=(m==='pdfjpg');
   pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
   for(var f2 of files){var doc=await pdfjsLib.getDocument({data:await f2.arrayBuffer()}).promise,n=Math.min(doc.numPages,20);
    for(var i=1;i<=n;i++){var pg=await doc.getPage(i),vp=pg.getViewport({scale:1.5}),cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;var cx2=cv.getContext('2d');cx2.fillStyle='#fff';cx2.fillRect(0,0,cv.width,cv.height);await pg.render({canvasContext:cx2,viewport:vp}).promise;
     var b=await new Promise(function(r2){cv.toBlob(r2,jp?'image/jpeg':'image/png',0.92)});addOut(dO,b,base(f2)+'-pagina-'+i+(jp?'.jpg':'.png'))}}
  }else if(m==='docx'){
   for(var f3 of files){var hh=(await mammoth.convertToHtml({arrayBuffer:await f3.arrayBuffer()})).value,el=document.createElement('div');el.style.cssText='width:515px;font:14px/1.4 Arial,sans-serif;color:#000;background:#fff;position:absolute;left:-9999px;top:0';el.innerHTML='<style>table{border-collapse:collapse}td,th{border:1px solid #999;padding:3px}img{max-width:100%}</style>'+hh;document.body.appendChild(el);
    var pd=new jspdf.jsPDF({unit:'pt',format:'a4'});await new Promise(function(res){pd.html(el,{width:515,windowWidth:515,margin:[40,40,40,40],callback:res})});el.remove();addOut(dO,pd.output('blob'),base(f3)+'.pdf')}
  }else if(m==='xlsx'){
   for(var f4 of files){var wb=XLSX.read(await f4.arrayBuffer()),px=new jspdf.jsPDF({unit:'pt',format:'a4',orientation:'landscape'}),first=true;
    wb.SheetNames.forEach(function(n){var rows=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:false,defval:''});if(!rows.length)return;var c=xlClean(rows);if(!c)return;if(!first)px.addPage();first=false;
     try{xlDraw(px,n,c)}catch(e){px.setFontSize(12);px.text(n,40,30);px.autoTable({head:[rows[0]],body:rows.slice(1),startY:40,styles:{fontSize:8},margin:{left:40,right:40}})}});
    addOut(dO,px.output('blob'),base(f4)+'.pdf')}
  }else if(m==='img2docx'){
   var bl=[];for(var k2=0;k2<files.length;k2++)bl.push(await imgBlock(files[k2]));
   addOut(dO,await buildDocx(bl),(files.length>1?'imagenes':base(files[0]))+'.docx');
  }else if(m==='ocrdocx'){
   var NL2=String.fromCharCode(10),wk2=await Tesseract.createWorker('spa');
   for(var f8 of files){msg(dO,'Leyendo '+f8.name+'\u2026');var row3=dO.lastChild;
    var rr2=await wk2.recognize(await ocrCanvas(f8));row3.remove();
    var ps2=rr2.data.text.split(NL2+NL2).map(function(t){return t.split(NL2).join(' ').replace(/\s+/g,' ').trim()}).filter(Boolean);
    if(!ps2.length){msg(dO,f8.name+': no se encontr\u00f3 texto legible.');continue}
    addOut(dO,await buildDocx(ps2.map(function(t){return {p:t}})),base(f8)+'-editable.docx')}
   await wk2.terminate();
  }else if(m==='ocr'){
   pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
   var NL=String.fromCharCode(10),wk=await Tesseract.createWorker('spa');
   for(var f7 of files){var d7=await pdfjsLib.getDocument({data:await f7.arrayBuffer()}).promise,n7=Math.min(d7.numPages,10),ps='';
    for(var q7=1;q7<=n7;q7++){msg(dO,'Leyendo '+f7.name+' · página '+q7+' de '+n7+'…');var row2=dO.lastChild;
     var pg7=await d7.getPage(q7),vp7=pg7.getViewport({scale:2}),cv7=document.createElement('canvas');cv7.width=vp7.width;cv7.height=vp7.height;await pg7.render({canvasContext:cv7.getContext('2d'),viewport:vp7}).promise;
     var rr=await wk.recognize(cv7);ps+=rr.data.text.split(NL+NL).map(function(t){return '<p>'+esc(t.trim())+'</p>'}).join('');row2.remove()}
    addOut(dO,new Blob(['<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body style="font-family:Calibri,Arial">'+ps+'</body></html>'],{type:'application/msword'}),base(f7)+'-ocr.doc')}
   await wk.terminate();
  }else{
   pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
   for(var f5 of files){var d5=await pdfjsLib.getDocument({data:await f5.arrayBuffer()}).promise,html=await pdfToHtml(d5);
    if(!html.replace(/<[^>]*>/g,'').trim()){msg(dO,f5.name+': no tiene texto seleccionable (puede ser un PDF escaneado).');continue}
    addOut(dO,new Blob(['<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body style="font-family:Calibri,Arial">'+html+'</body></html>'],{type:'application/msword'}),base(f5)+'.doc')}
  }
 }catch(e){msg(dO,'No se pudo convertir. Revisa que el archivo sea válido.')}
 gameOff();dG.disabled=false};

document.getElementById('d-modes').onchange();
