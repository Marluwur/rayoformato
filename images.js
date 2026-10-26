/* Convertidor de imágenes en el navegador */
var files=[],file=document.getElementById('file'),go=document.getElementById('go'),out=document.getElementById('out'),drop=document.getElementById('drop');
var res=document.getElementById('res'),fmt=document.getElementById('fmt');
function setFiles(l){files=Array.prototype.filter.call(l,function(f){return f.type.indexOf('image/')===0});
  go.disabled=!files.length;
  if(files.length)ready(out,files);else out.innerHTML='<li>Elige al menos una imagen.</li>';showPrev(files[0])}
file.onchange=function(){setFiles(file.files)};
['dragover','dragenter'].forEach(function(e){drop.addEventListener(e,function(ev){ev.preventDefault();drop.classList.add('over')})});
['dragleave','drop'].forEach(function(e){drop.addEventListener(e,function(ev){ev.preventDefault();drop.classList.remove('over')})});
drop.addEventListener('drop',function(ev){setFiles(ev.dataTransfer.files)});
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
function showPrev(f){if(!f){iPrev.hidden=true;return}cx=.5;cy=.5;iW=0;iPrev.hidden=false;iCrop.hidden=true;iInfo.textContent='Cargando vista previa…';
 var im=new Image();im.onload=function(){iW=im.naturalWidth;iH=im.naturalHeight;var k=Math.min(1,560/iW,360/iH);iCv.width=Math.round(iW*k);iCv.height=Math.round(iH*k);iCv.getContext('2d').drawImage(im,0,0,iCv.width,iCv.height);drawCrop()};
 im.onerror=function(){iInfo.textContent='No se pudo mostrar la vista previa de esta imagen. Prueba con JPG, PNG o WebP.'};im.src=URL.createObjectURL(f)}
ratio.onchange=drawCrop;zoom.oninput=drawCrop;window.addEventListener('resize',drawCrop);
iCrop.onpointerdown=function(e){e.preventDefault();iCrop.setPointerCapture(e.pointerId);var sx=e.clientX,sy=e.clientY,W=iW,H=iH,k=iCv.clientWidth/W,c0=cropRect(W,H);
 iCrop.onpointermove=function(m){cx=(c0.x+(m.clientX-sx)/k+c0.w/2)/W;cy=(c0.y+(m.clientY-sy)/k+c0.h/2)/H;drawCrop()};
 iCrop.onpointerup=function(){iCrop.onpointermove=null}};
go.onclick=function(){
  var type=fmt.value,ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[type];
  out.innerHTML='';
  files.forEach(function(f){
    var img=new Image(),url=URL.createObjectURL(f);
    img.onload=function(){
      var c=document.createElement('canvas'),cr=rt()?cropRect(img.naturalWidth,img.naturalHeight):{x:0,y:0,w:img.naturalWidth,h:img.naturalHeight},W0=cr.w,H0=cr.h,s=1;
      if(res.value!=='0'){var lim=res.value.split(',').map(Number);s=Math.min(1,lim[0]/Math.max(W0,H0),lim[1]/Math.min(W0,H0))}
      c.width=Math.round(W0*s);c.height=Math.round(H0*s);
      var x=c.getContext('2d');
      if(type==='image/jpeg'){x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height)}
      x.drawImage(img,cr.x,cr.y,cr.w,cr.h,0,0,c.width,c.height);
      c.toBlob(function(b){
        var li=document.createElement('li'),name=f.name.replace(/\.[^.]+$/,'')+'.'+ext;
        if(!b){li.textContent=f.name+': no se pudo convertir.';out.appendChild(li);return}
        var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.textContent='Descargar';
        var s=document.createElement('span');s.textContent=name+' ('+fsize(b.size)+')';
        li.appendChild(s);li.appendChild(a);out.appendChild(li);URL.revokeObjectURL(url);clearTimeout(out._t);out._t=setTimeout(function(){showAd(out)},1500);
      },type,0.92);
    };
    img.onerror=function(){var li=document.createElement('li');li.textContent=f.name+': formato no compatible.';out.appendChild(li)};
    img.src=url;
  });
};
