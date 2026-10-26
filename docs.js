/* Documentos: imágenes a PDF, TXT a PDF, PDF a imágenes */
var dF=document.getElementById('d-file'),dM={get value(){return document.querySelector('input[name=dmode]:checked').value}},dG=document.getElementById('d-go'),dO=document.getElementById('d-out'),dH=document.getElementById('d-hint');
var dInfo={img:['image/*','Imágenes JPG, PNG o WebP'],txt:['.txt,text/plain','Archivos de texto (.txt)'],pdf:['application/pdf','Archivo PDF (se convierten hasta 20 páginas)'],docx:['.docx','Documento de Word (.docx)'],xlsx:['.xlsx,.xls,.csv','Hoja de Excel (.xlsx, .xls o .csv)'],pdfdoc:['application/pdf','PDF con texto seleccionable'],ocr:['application/pdf','PDF escaneado o fotografiado (hasta 10 páginas)']};
var mb=document.getElementById('d-more');mb.onclick=function(){var o=document.getElementById('d-modes').classList.toggle('more');mb.textContent=o?'Mostrar menos':'Mostrar más';mb.setAttribute('aria-expanded',o)};
document.getElementById('d-modes').onchange=function(){var i=dInfo[dM.value];dF.accept=i[0];dH.textContent=i[1];dF.value='';dG.disabled=true;dO.innerHTML=''};
dF.onchange=function(){dG.disabled=!dF.files.length;ready(dO,dF.files)};
dG.onclick=async function(){
 dO.innerHTML='';dG.disabled=true;var files=Array.from(dF.files),m=dM.value;if(m==='ocr'||m==='docx'||files.some(function(f){return f.size>20971520}))gameOn(dO);
 try{
  msg(dO,'Preparando el convertidor…');var prep=dO.lastChild;
  var NEED={img:['jspdf'],txt:['jspdf'],pdf:['pdfjs'],docx:['jspdf','html2canvas','mammoth'],xlsx:['jspdf','autotable','xlsx'],pdfdoc:['pdfjs'],ocr:['pdfjs','tesseract']};
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
  }else if(m==='pdf'){
   pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
   for(var f2 of files){var doc=await pdfjsLib.getDocument({data:await f2.arrayBuffer()}).promise,n=Math.min(doc.numPages,20);
    for(var i=1;i<=n;i++){var pg=await doc.getPage(i),vp=pg.getViewport({scale:1.5}),cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
     var b=await new Promise(function(r2){cv.toBlob(r2,'image/png')});addOut(dO,b,base(f2)+'-pagina-'+i+'.png')}}
  }else if(m==='docx'){
   for(var f3 of files){var hh=(await mammoth.convertToHtml({arrayBuffer:await f3.arrayBuffer()})).value,el=document.createElement('div');el.style.cssText='width:515px;font:14px/1.4 Arial,sans-serif;color:#000;background:#fff;position:absolute;left:-9999px;top:0';el.innerHTML='<style>table{border-collapse:collapse}td,th{border:1px solid #999;padding:3px}img{max-width:100%}</style>'+hh;document.body.appendChild(el);
    var pd=new jspdf.jsPDF({unit:'pt',format:'a4'});await new Promise(function(res){pd.html(el,{width:515,windowWidth:515,margin:[40,40,40,40],callback:res})});el.remove();addOut(dO,pd.output('blob'),base(f3)+'.pdf')}
  }else if(m==='xlsx'){
   for(var f4 of files){var wb=XLSX.read(await f4.arrayBuffer()),px=new jspdf.jsPDF({unit:'pt',format:'a4',orientation:'landscape'}),first=true;
    wb.SheetNames.forEach(function(n){var rows=XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:false,defval:''});if(!rows.length)return;if(!first)px.addPage();first=false;px.setFontSize(12);px.text(n,40,30);px.autoTable({head:[rows[0]],body:rows.slice(1),startY:40,styles:{fontSize:8},margin:{left:40,right:40}})});
    addOut(dO,px.output('blob'),base(f4)+'.pdf')}
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
   for(var f5 of files){var d5=await pdfjsLib.getDocument({data:await f5.arrayBuffer()}).promise,html='';
    for(var q2=1;q2<=d5.numPages;q2++){var tc=await (await d5.getPage(q2)).getTextContent(),line=[],lastY=null;
     tc.items.forEach(function(it){var y=Math.round(it.transform[5]);if(lastY!==null&&Math.abs(y-lastY)>3){html+='<p>'+esc(line.join(' '))+'</p>';line=[]}line.push(it.str);lastY=y});
     if(line.length)html+='<p>'+esc(line.join(' '))+'</p>'}
    if(!html.replace(/<[^>]*>/g,'').trim()){msg(dO,f5.name+': no tiene texto seleccionable (puede ser un PDF escaneado).');continue}
    addOut(dO,new Blob(['<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body style="font-family:Calibri,Arial">'+html+'</body></html>'],{type:'application/msword'}),base(f5)+'.doc')}
  }
 }catch(e){msg(dO,'No se pudo convertir. Revisa que el archivo sea válido.')}
 gameOff();dG.disabled=false};

document.getElementById('d-modes').onchange();
