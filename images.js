/* Convertidor de imágenes en el navegador: formato, recorte vertical, medidas, peso máximo y fotos HEIC */
var files=[],file=document.getElementById('file'),go=document.getElementById('go'),out=document.getElementById('out'),drop=document.getElementById('drop');
var res=document.getElementById('res'),fmt=document.getElementById('fmt'),kb=document.getElementById('kb'),rc=document.getElementById('rcust'),rw=document.getElementById('rw'),rh=document.getElementById('rh'),rk=document.getElementById('rk');
function setFiles(l){files=Array.prototype.filter.call(l,isImg);
  go.disabled=!files.length;
  if(files.length)ready(out,files);else out.innerHTML='<li>Elige al menos una imagen.</li>';showPrev(files[0])}
file.onchange=function(){setFiles(file.files)};
['dragover','dragenter'].forEach(function(e){drop.addEventListener(e,function(ev){ev.preventDefault();drop.classList.add('over')})});
['dragleave','drop'].forEach(function(e){drop.addEventListener(e,function(ev){ev.preventDefault();drop.classList.remove('over')})});
drop.addEventListener('drop',function(ev){setFiles(ev.dataTransfer.files)});
function resUI(){if(rc)rc.hidden=res.value!=='custom'}
res.addEventListener('change',resUI);resUI();
/* Vista previa y recorte vertical */
var iCv=document.getElementById('i-cv'),iW=0,iH=0,iCrop=document.getElementById('i-crop'),iPrev=document.getElementById('i-prev'),iInfo=document.getElementById('i-info'),ratio=document.getElementById('ratio'),zoom=document.getElementById('zoom'),zl=document.getElementById('zl'),cx=.5,cy=.5;
function rt(){var v=ratio.value;if(v==='0')return 0;var p=v.split(':');return p[0]/p[1]}
function cropRect(W,H){var r=rt(),s=zoom.value/100,w,h;if(W/H>r){h=H*s;w=h*r}else{w=W*s;h=w/r}return {x:Math.min(Math.max(cx*W-w/2,0),W-w),y:Math.min(Math.max(cy*H-h/2,0),H-h),w:w,h:h}}
function drawCrop(){var W=iW,H=iH;if(!W)return;
 iInfo.textContent='Tamaño original: '+W+'×'+H+' px';
 if(!rt()){iCrop.hidden=true;zl.style.display='none';return}
 zl.style.display='';iCrop.hidden=false;var k=iCv.clientWidth/W,c=cropRect(W,H);
 iCrop.style.cssText='left:'+c.x*k+'px;top:'+c.y*k+'px;width:'+c.w*k+'px;height:'+c.h*k+'px';
 iInfo.textContent+=' · Recorte: '+Math.round(c.w)+'×'+Math.round(c.h)+' px. Arrastra el recuadro para elegir la zona.'}
async function showPrev(f){if(!f){iPrev.hidden=true;return}cx=.5;cy=.5;iW=0;iPrev.hidden=false;iCrop.hidden=true;iInfo.textContent=isHeic(f)?'Abriendo la foto HEIC…':'Cargando vista previa…';
 var d;try{d=await decodable(f)}catch(e){iInfo.textContent=e.message;return}
 var im=new Image();im.onload=function(){iW=im.naturalWidth;iH=im.naturalHeight;var k=Math.min(1,560/iW,360/iH);iCv.width=Math.round(iW*k);iCv.height=Math.round(iH*k);iCv.getContext('2d').drawImage(im,0,0,iCv.width,iCv.height);drawCrop()};
 im.onerror=function(){iInfo.textContent='No se pudo mostrar la vista previa de esta imagen. Prueba con JPG, PNG o WebP.'};im.src=URL.createObjectURL(d)}
ratio.onchange=drawCrop;zoom.oninput=drawCrop;window.addEventListener('resize',drawCrop);
iCrop.onpointerdown=function(e){e.preventDefault();iCrop.setPointerCapture(e.pointerId);var sx=e.clientX,sy=e.clientY,W=iW,H=iH,k=iCv.clientWidth/W,c0=cropRect(W,H);
 iCrop.onpointermove=function(m){cx=(c0.x+(m.clientX-sx)/k+c0.w/2)/W;cy=(c0.y+(m.clientY-sy)/k+c0.h/2)/H;drawCrop()};
 iCrop.onpointerup=function(){iCrop.onpointermove=null}};
/* Medidas de salida */
function outSize(W0,H0){
 if(res.value==='custom'){var w=parseInt(rw&&rw.value,10),h=parseInt(rh&&rh.value,10);w=w>0?Math.min(w,8000):0;h=h>0?Math.min(h,8000):0;
  if(!w&&!h)throw new Error('Escribe el ancho, el alto o ambos, en píxeles.');
  if(rk&&!rk.checked&&w&&h)return [w,h];
  var s=Math.min(w?w/W0:Infinity,h?h/H0:Infinity);return [Math.max(1,Math.round(W0*s)),Math.max(1,Math.round(H0*s))]}
 var s=1;if(res.value!=='0'){var lim=res.value.split(',').map(Number);s=Math.min(1,lim[0]/Math.max(W0,H0),lim[1]/Math.min(W0,H0))}
 return [Math.round(W0*s),Math.round(H0*s)]}
function put(name,b,extra){var li=document.createElement('li'),a=document.createElement('a'),s=document.createElement('span');
 a.href=URL.createObjectURL(b);a.download=name;a.textContent='Descargar';s.textContent=name+' ('+fsize(b.size)+(extra?' · '+extra:'')+')';
 li.appendChild(s);li.appendChild(a);out.appendChild(li);clearTimeout(out._t);out._t=setTimeout(function(){showAd(out)},1500)}
go.onclick=async function(){
 var type=fmt.value,max=kb?(+kb.value)*1000:0,warned=false;out.innerHTML='';go.disabled=true;
 if(max&&type==='image/png'){type='image/jpeg';msg(out,'Para ajustar el peso se usa JPG: PNG no permite elegir la calidad.')}
 var ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[type];
 for(var i=0;i<files.length;i++){var f=files[i];
  try{
   var img=await readImg(await decodable(f)),cr=rt()?cropRect(img.naturalWidth,img.naturalHeight):{x:0,y:0,w:img.naturalWidth,h:img.naturalHeight},sz=outSize(cr.w,cr.h);
   var c=document.createElement('canvas');c.width=sz[0];c.height=sz[1];var x=c.getContext('2d');
   if(type==='image/jpeg'){x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height)}
   x.imageSmoothingQuality='high';x.drawImage(img,cr.x,cr.y,cr.w,cr.h,0,0,c.width,c.height);
   var name=f.name.replace(/\.[^.]+$/,'')+'.'+ext,b,extra=c.width+'×'+c.height+' px';
   if(max){var r=await fitBlob(c,type,max);b=r.b;extra=r.c.width+'×'+r.c.height+' px';
    if(b.size>max)msg(out,f.name+': no se pudo bajar de '+fsize(b.size)+' sin deformarla. Prueba recortarla o un peso mayor.');
    else if(r.c!==c&&!warned){warned=true;msg(out,'Para llegar al peso pedido se redujeron las medidas de la imagen.')}}
   else b=await cBlob(c,type,0.92);
   if(!b)throw new Error(f.name+': no se pudo convertir.');
   put(name,b,extra)
  }catch(e){msg(out,e&&e.message&&e.message.indexOf(f.name)===0?e.message:(e&&e.message&&/píxeles/.test(e.message)?e.message:f.name+': formato no compatible.'))}
 }
 go.disabled=false};
