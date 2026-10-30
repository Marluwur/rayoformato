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

/* PDF a Word: orden de lectura por posicion (con dos columnas), negritas, titulos por tamano e imagenes incrustadas */
function pdfMul(m,n){return [m[0]*n[0]+m[2]*n[1],m[1]*n[0]+m[3]*n[1],m[0]*n[2]+m[2]*n[3],m[1]*n[2]+m[3]*n[3],m[0]*n[4]+m[2]*n[5]+m[4],m[1]*n[4]+m[3]*n[5]+m[5]]}
async function pdfImgData(pg,op,arg){
 var o;
 if(op===pdfjsLib.OPS.paintInlineImageXObject)o=arg[0];
 else o=await new Promise(function(r){var id=arg[0];try{(String(id).indexOf('g_')===0?pg.commonObjs:pg.objs).get(id,r)}catch(e){r(null)}});
 if(!o||!o.width||!o.height)return null;
 var c=document.createElement('canvas');c.width=o.width;c.height=o.height;var x=c.getContext('2d'),alpha=false;
 if(o.bitmap){x.drawImage(o.bitmap,0,0);alpha=true}
 else if(o.data){var im=x.createImageData(o.width,o.height),d=im.data,s=o.data,n=o.width*o.height,i,j;
  if(o.kind===3){for(i=0;i<n*4;i++)d[i]=s[i];for(i=3;i<n*4;i+=4)if(d[i]<255){alpha=true;break}}
  else if(o.kind===2){for(i=0,j=0;i<n;i++,j+=3){d[i*4]=s[j];d[i*4+1]=s[j+1];d[i*4+2]=s[j+2];d[i*4+3]=255}}
  else if(o.kind===1){var rb=(o.width+7)>>3;for(var yy=0;yy<o.height;yy++)for(var xx=0;xx<o.width;xx++){var v=(s[yy*rb+(xx>>3)]>>(7-(xx&7)))&1,p=(yy*o.width+xx)*4;d[p]=d[p+1]=d[p+2]=v?255:0;d[p+3]=255}}
  else return null;
  x.putImageData(im,0,0)}
 else return null;
 var blob=await canvasBlob(c,alpha?'image/png':'image/jpeg');c.width=c.height=1;
 return {data:new Uint8Array(await blob.arrayBuffer()),ext:alpha?'png':'jpeg',w:o.width,h:o.height}}
function readOrder(ss,X0,W){
 var byTop=function(a,b){return (b.top-a.top)||(a.x0-b.x0)},txt=ss.filter(function(s){return !s.img}),g=null;
 if(txt.length>=8){for(var gx=X0+W*0.3;gx<=X0+W*0.7;gx+=W*0.01){var cross=0,L=0,R=0;
   txt.forEach(function(s){var wide=(s.x1-s.x0)>=W*0.25;if(s.x0<gx-2&&s.x1>gx+2)cross++;else if(s.x1<=gx+2){if(wide)L++}else if(wide)R++});
   if(cross<=txt.length*0.15&&L>=4&&R>=4&&L+R>=txt.length*0.4){g=gx;break}}}
 if(g===null)return ss.slice().sort(byTop);
 var out=[],buf=[];
 function flush(){buf.filter(function(s){return s.x1<=g+2}).sort(byTop).concat(buf.filter(function(s){return s.x1>g+2}).sort(byTop)).forEach(function(s){out.push(s)});buf=[]}
 ss.slice().sort(byTop).forEach(function(s){if(s.x0<g-2&&s.x1>g+2){flush();out.push(s)}else buf.push(s)});
 flush();return out}
async function pdfToBlocks(doc,onPage){
 var pages=[],cnt={},chars=0,O=pdfjsLib.OPS;
 for(var q=1;q<=doc.numPages;q++){
  if(onPage)onPage(q,doc.numPages);
  var pg=await doc.getPage(q),vw=pg.view,X0=vw[0],Y0=vw[1],W=vw[2]-vw[0],H=vw[3]-vw[1];
  var ol=await pg.getOperatorList(),tc=await pg.getTextContent(),fb={};
  var isBold=function(fn){if(fn in fb)return fb[fn];var b=false;try{var f=pg.commonObjs.get(fn);b=!!(f&&(f.bold||/bold|black|heavy|semibold|demi/i.test(f.name||'')))}catch(e){}return fb[fn]=b};
  var its=tc.items.filter(function(it){return it.str&&it.str.trim()}).map(function(it){var t=it.transform,s=Math.hypot(t[2],t[3])||it.height||10;return {x:t[4],y:t[5],w:it.width||0,s:s,t:it.str,b:isBold(it.fontName)}});
  its.sort(function(a,b){return b.y-a.y});
  var lines=[],cur=null;
  its.forEach(function(it){if(cur&&Math.abs(cur.y-it.y)<=Math.max(2,it.s*0.35))cur.items.push(it);else{cur={y:it.y,items:[it]};lines.push(cur)}});
  var segs=[];
  lines.forEach(function(l){l.items.sort(function(a,b){return a.x-b.x});var sg=null;
   l.items.forEach(function(it){
    if(sg&&it.x-sg.x1<=it.s*2){var sp=(it.x-sg.x1>it.s*0.15&&!/\s$/.test(sg.t)&&!/^\s/.test(it.t))?' ':'';sg.t+=sp+it.t;sg.x1=Math.max(sg.x1,it.x+it.w);if(it.s>sg.s)sg.s=it.s;if(it.b)sg.nb+=it.t.length;sg.nt+=it.t.length}
    else{sg={y:l.y,x0:it.x,x1:it.x+it.w,s:it.s,t:it.t,nb:it.b?it.t.length:0,nt:it.t.length};segs.push(sg)}})});
  segs=segs.filter(function(s){s.t=s.t.replace(/\s+/g,' ').trim();s.b=s.nb>=s.nt*0.6;s.top=s.y+s.s*0.8;
   var k=Math.round(s.s*2)/2;if(s.t){chars+=s.t.length;if(!s.b)cnt[k]=(cnt[k]||0)+s.t.length}return !!s.t});
  var ctm=[1,0,0,1,0,0],st=[],imgs=[];
  for(var i=0;i<ol.fnArray.length;i++){var f=ol.fnArray[i],a=ol.argsArray[i];
   if(f===O.save)st.push(ctm.slice());else if(f===O.restore)ctm=st.pop()||ctm;else if(f===O.transform)ctm=pdfMul(ctm,a);
   else if(f===O.paintImageXObject||f===O.paintInlineImageXObject){
    var iw=Math.hypot(ctm[0],ctm[1]),ih=Math.hypot(ctm[2],ctm[3]);
    if(iw<24||ih<24||(iw>W*0.9&&ih>H*0.9)||imgs.length>=30)continue;
    var top=Math.max(ctm[5],ctm[5]+ctm[3]),data=null;try{data=await pdfImgData(pg,f,a)}catch(e){}
    if(data)imgs.push({img:data,top:top,y:top,x0:ctm[4],x1:ctm[4]+iw,wpt:iw,hpt:ih})}}
  var all=segs.concat(imgs),foot=all.filter(function(s){return !s.img&&s.y<Y0+H*0.07}),main=all.filter(function(s){return s.img||s.y>=Y0+H*0.07});
  var lx=segs.length?Math.min.apply(null,segs.map(function(s){return s.x0})):X0,rx=segs.length?Math.max.apply(null,segs.map(function(s){return s.x1})):X0+W;
  pages.push({W:W,X0:X0,lx:lx,rx:rx,k:Math.min(1,482/Math.max(1,rx-lx)),L:readOrder(main,X0,W).concat(readOrder(foot,X0,W))})}
 if(!chars)return null;
 var body=10,best=0;for(var k in cnt){if(cnt[k]>best){best=cnt[k];body=+k}}
 var blocks=[];
 pages.forEach(function(P,pi){
  if(pi>0)blocks.push({pb:true});
  var par=null,prev=null;
  function close(){if(par){blocks.push(par);par=null}}
  P.L.forEach(function(l){
   if(l.img){close();blocks.push({img:l.img,emu:{cx:Math.round(l.wpt*12700),cy:Math.round(l.hpt*12700)},jc:Math.abs((l.x0+l.x1)/2-(P.X0+P.W/2))<P.W*0.05?'center':null});prev=null;return}
   var r=l.s/body,h=r>=1.6?1:r>=1.2?2:0,mid=(l.x0+l.x1)/2,jc=(Math.abs(mid-(P.X0+P.W/2))<P.W*0.03&&l.x0>P.X0+P.W*0.18)?'center':null;
   if(par&&prev&&Math.abs(prev.y-l.y)<=Math.max(2,l.s*0.35)&&l.x0>prev.x1){par.p+='\t'+l.t;(par.tabs=par.tabs||[]).push(l.x1>=P.rx-3&&l.x1-l.x0<(P.rx-P.lx)*0.4?-Math.round((P.rx-P.lx)*P.k*20):Math.round((l.x0-P.lx)*P.k*20));par.jc=null;prev=l;return}
   var join=par&&prev&&!h&&!par.h&&par.b===l.b&&par.jc===jc&&Math.abs(l.s-prev.s)<=1.5&&prev.y>l.y&&(prev.y-l.y)<=l.s*1.85&&(jc||Math.abs(l.x0-prev.x0)<=l.s*3);
   if(join){par.p=(/-$/.test(par.p)&&/^[a-záéíóúñü]/.test(l.t))?par.p.slice(0,-1)+l.t:par.p+' '+l.t}
   else{close();par={p:l.t,h:h,b:l.b&&!h,jc:jc}}
   prev=l});
  close()});
 /* parrafo cortado por el cambio de pagina del PDF: se une para no partir la frase en Word */
 for(var i=blocks.length-2;i>0;i--){var A=blocks[i-1],Bk=blocks[i+1];
  if(blocks[i].pb&&A&&Bk&&A.p&&Bk.p&&!A.h&&!Bk.h&&!A.tabs&&!Bk.tabs&&A.b===Bk.b&&!/[.:;?!)\]"\u00bb]$/.test(A.p)&&/^[a-z\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1\u00fc]/.test(Bk.p)){
   A.p=/-$/.test(A.p)?A.p.slice(0,-1)+Bk.p:A.p+' '+Bk.p;blocks.splice(i,2)}}
 return blocks}
/* OCR: une las lineas de cada parrafo, quita guiones de corte y descarta lineas sin texto real (logos, sellos) */
function ocrParas(text){
 var NL=String.fromCharCode(10);
 return text.split(/\n\s*\n/).map(function(p){
  return p.split(NL).map(function(l){return l.trim()}).filter(Boolean).reduce(function(acc,l){
   if(!acc)return l;return (/-$/.test(acc)&&/^[a-záéíóúñü]/.test(l))?acc.slice(0,-1)+l:acc+' '+l},'')
 }).filter(function(p){var ns=p.replace(/\s/g,''),lt=(p.match(/[A-Za-zÀ-ɏ]/g)||[]).length,dg=(p.match(/[0-9]/g)||[]).length;return (lt+dg)>=ns.length*0.6&&(lt>=3||dg>=1)})}
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
   n++;var k=b.emu?Math.min(1,MW/b.emu.cx,MH/b.emu.cy):Math.min(MW/b.img.w,MH/b.img.h),cx=Math.round((b.emu?b.emu.cx:b.img.w)*k),cy=Math.round((b.emu?b.emu.cy:b.img.h)*k),fn='image'+n+'.'+b.img.ext,id='rId'+(n+10);
   Z.file('word/media/'+fn,b.img.data);
   rels+='<Relationship Id="'+id+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/'+fn+'"/>';
   body+='<w:p><w:pPr>'+(n>1&&!b.emu?'<w:pageBreakBefore/>':'')+'<w:jc w:val="'+(b.emu?(b.jc||'left'):'center')+'"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:docPr id="'+n+'" name="Imagen '+n+'" descr="Imagen '+n+'"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="'+n+'" name="'+fn+'"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="'+id+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'}
  else if(b.pb)body+='<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  else{var tb='';if(b.tabs){var last=0;b.tabs.forEach(function(t){var rt=t<0;t=Math.min(9630,Math.max(Math.abs(t),last+200));last=t;tb+='<w:tab w:val="'+(rt?'right':'left')+'" w:pos="'+t+'"/>'});tb='<w:tabs>'+tb+'</w:tabs>'}
   var pp=(b.h?'<w:pStyle w:val="Heading'+b.h+'"/>':'')+tb+(b.jc?'<w:jc w:val="'+b.jc+'"/>':''),rp=b.b?'<w:rPr><w:b/></w:rPr>':'';
   body+='<w:p>'+(pp?'<w:pPr>'+pp+'</w:pPr>':'')+'<w:r>'+rp+'<w:t xml:space="preserve">'+xesc(b.p).split('\t').join('</w:t><w:tab/><w:t xml:space="preserve">')+'</w:t></w:r></w:p>'}});
 Z.file('[Content_Types].xml',H+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
 Z.file('word/styles.xml',H+'<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="es-MX"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="140" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="100"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:style></w:styles>');
 Z.file('_rels/.rels',H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
 Z.file('word/_rels/document.xml.rels',H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+rels+'</Relationships>');
 Z.file('word/document.xml',H+'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>'+body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>');
 return Z.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})}
/* Documentos: imágenes a PDF, TXT a PDF, PDF a imágenes */
var dF=document.getElementById('d-file'),dM={get value(){return document.querySelector('input[name=dmode]:checked').value}},dG=document.getElementById('d-go'),dO=document.getElementById('d-out'),dH=document.getElementById('d-hint');
var dInfo={img:['image/*','Imágenes JPG, PNG o WebP'],txt:['.txt,text/plain','Archivos de texto (.txt)'],pdf:['application/pdf','Archivo PDF (se convierten hasta 20 páginas)'],docx:['.docx','Documento de Word (.docx)'],xlsx:['.xlsx,.xls,.csv','Hoja de Excel (.xlsx, .xls o .csv)'],pdfdoc:['application/pdf','PDF con texto seleccionable (se conservan texto, t\u00edtulos, negritas e im\u00e1genes)'],ocr:['application/pdf','PDF escaneado o fotografiado (hasta 10 páginas)'],img2docx:['image/*','Imágenes JPG, PNG o WebP'],pdfjpg:['application/pdf','PDF (se convierten hasta 20 páginas)'],ocrdocx:['image/*','Foto o captura con texto (JPG, PNG o WebP)']};
var mb=document.getElementById('d-more');mb.onclick=function(){var o=document.getElementById('d-modes').classList.toggle('more');mb.textContent=o?'Mostrar menos':'Mostrar más';mb.setAttribute('aria-expanded',o)};
document.getElementById('d-modes').onchange=function(){var i=dInfo[dM.value];dF.accept=i[0];dH.textContent=i[1];dF.value='';dG.disabled=true;dO.innerHTML=''};
dF.onchange=function(){dG.disabled=!dF.files.length;ready(dO,dF.files)};
dG.onclick=async function(){
 dO.innerHTML='';dG.disabled=true;var files=Array.from(dF.files),m=dM.value;if(m==='ocr'||m==='ocrdocx'||m==='docx'||files.some(function(f){return f.size>20971520}))gameOn(dO);
 try{
  msg(dO,'Preparando el convertidor…');var prep=dO.lastChild;
  var NEED={pdfjpg:['pdfjs'],img2docx:['jszip'],ocrdocx:['jszip','tesseract'],img:['jspdf'],txt:['jspdf'],pdf:['pdfjs'],docx:['jspdf','html2canvas','mammoth'],xlsx:['jspdf','autotable','xlsx'],pdfdoc:['pdfjs','jszip'],ocr:['pdfjs','tesseract','jszip']};
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
   for(var f3 of files){var hh=(await mammoth.convertToHtml({arrayBuffer:await f3.arrayBuffer()})).value,el=document.createElement('div');el.style.cssText='width:515px;font:14px/1.4 Arial,sans-serif;color:#000;background:#fff';el.innerHTML='<style>table{border-collapse:collapse}td,th{border:1px solid #999;padding:3px}img{max-width:100%}</style>'+hh;
    var pd=new jspdf.jsPDF({unit:'pt',format:'a4'});await new Promise(function(res){pd.html(el,{width:515,windowWidth:515,margin:[40,40,40,40],autoPaging:'text',callback:res})});addOut(dO,pd.output('blob'),base(f3)+'.pdf')}
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
    var ps2=ocrParas(rr2.data.text);
    if(!ps2.length){msg(dO,f8.name+': no se encontr\u00f3 texto legible.');continue}
    addOut(dO,await buildDocx(ps2.map(function(t){return {p:t}})),base(f8)+'-editable.docx')}
   await wk2.terminate();
  }else if(m==='ocr'){
   pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
   var NL=String.fromCharCode(10),wk=await Tesseract.createWorker('spa');
   for(var f7 of files){var d7=await pdfjsLib.getDocument({data:await f7.arrayBuffer()}).promise,n7=Math.min(d7.numPages,10),ob=[];
    for(var q7=1;q7<=n7;q7++){msg(dO,'Leyendo '+f7.name+' · página '+q7+' de '+n7+'…');var row2=dO.lastChild;
     var pg7=await d7.getPage(q7),vp7=pg7.getViewport({scale:2}),cv7=document.createElement('canvas');cv7.width=vp7.width;cv7.height=vp7.height;await pg7.render({canvasContext:cv7.getContext('2d'),viewport:vp7}).promise;
     var rr=await wk.recognize(cv7);if(q7>1)ob.push({pb:true});ocrParas(rr.data.text).forEach(function(t){ob.push({p:t})});row2.remove()}
    if(!ob.some(function(x){return x.p})){msg(dO,f7.name+': no se encontr\u00f3 texto legible.');continue}
    addOut(dO,await buildDocx(ob),base(f7)+'-ocr.docx')}
   await wk.terminate();
  }else{
   pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
   for(var f5 of files){var d5=await pdfjsLib.getDocument({data:await f5.arrayBuffer()}).promise;
    msg(dO,'Leyendo '+f5.name+'\u2026');var row5=dO.lastChild;
    var bl=await pdfToBlocks(d5,function(q,n){row5.textContent='Leyendo '+f5.name+' \u00b7 p\u00e1gina '+q+' de '+n+'\u2026'});row5.remove();
    if(!bl){msg(dO,f5.name+': no tiene texto seleccionable (puede ser un PDF escaneado). Usa \u00abPDF escaneado a Word (OCR)\u00bb.');continue}
    addOut(dO,await buildDocx(bl),base(f5)+'.docx')}
  }
 }catch(e){msg(dO,'No se pudo convertir. Revisa que el archivo sea válido.')}
 gameOff();dG.disabled=false};

document.getElementById('d-modes').onchange();
