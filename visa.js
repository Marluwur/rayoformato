/* Foto para visa americana: recorte cuadrado, 600×600 px, JPG de hasta 240 KB (requisitos digitales del Departamento de Estado) */
var vF=document.getElementById('v-file'),vD=document.getElementById('v-drop'),vG=document.getElementById('v-go'),vO=document.getElementById('v-out'),vP=document.getElementById('v-prev'),vCv=document.getElementById('v-cv'),vC=document.getElementById('v-crop'),vI=document.getElementById('v-info'),vZ=document.getElementById('v-zoom'),vR=document.getElementById('v-res');
var vImg=null,vW=0,vH=0,vx=.5,vy=.45,VSIDE=600,VMAX=240000;
function vRect(){var s=Math.min(vW,vH)*vZ.value/100;return {x:Math.min(Math.max(vx*vW-s/2,0),vW-s),y:Math.min(Math.max(vy*vH-s/2,0),vH-s),s:s}}
function vDraw(){if(!vW)return;var k=vCv.clientWidth/vW,r=vRect();vC.hidden=false;
 vC.style.cssText='left:'+r.x*k+'px;top:'+r.y*k+'px;width:'+r.s*k+'px;height:'+r.s*k+'px';
 vI.textContent='Recorte: '+Math.round(r.s)+'×'+Math.round(r.s)+' px. Arrastra el cuadro y ajusta el tamaño para que la cara quede centrada y los ojos dentro de la franja.'+(r.s<VSIDE?' Aviso: el recorte mide menos de '+VSIDE+' px; la foto se ampliará y puede verse borrosa.':'')}
async function vLoad(f){if(!f||!isImg(f)){msg(vO,'Elige una foto JPG, PNG, WebP o HEIC.');return}
 vO.innerHTML='';vR.hidden=true;vP.hidden=false;vC.hidden=true;vI.textContent=isHeic(f)?'Abriendo la foto HEIC…':'Cargando la foto…';vG.disabled=true;
 try{vImg=await readImg(await decodable(f))}catch(e){vI.textContent=e&&e.message?e.message:'No se pudo abrir la foto.';return}
 vW=vImg.naturalWidth;vH=vImg.naturalHeight;vx=.5;vy=.45;var k=Math.min(1,560/vW,420/vH);vCv.width=Math.round(vW*k);vCv.height=Math.round(vH*k);vCv.getContext('2d').drawImage(vImg,0,0,vCv.width,vCv.height);
 vG.disabled=false;vDraw()}
vF.onchange=function(){vLoad(vF.files[0]);vF.value=''};
['dragover','dragenter'].forEach(function(e){vD.addEventListener(e,function(ev){ev.preventDefault();vD.classList.add('over')})});
['dragleave','drop'].forEach(function(e){vD.addEventListener(e,function(ev){ev.preventDefault();vD.classList.remove('over')})});
vD.addEventListener('drop',function(ev){vLoad(ev.dataTransfer.files[0])});
vZ.oninput=vDraw;window.addEventListener('resize',vDraw);
vC.onpointerdown=function(e){e.preventDefault();vC.setPointerCapture(e.pointerId);var sx=e.clientX,sy=e.clientY,k=vCv.clientWidth/vW,r0=vRect();
 vC.onpointermove=function(m){vx=(r0.x+(m.clientX-sx)/k+r0.s/2)/vW;vy=(r0.y+(m.clientY-sy)/k+r0.s/2)/vH;vDraw()};
 vC.onpointerup=function(){vC.onpointermove=null}};
/* Revisa que el borde de la foto sea claro y parejo (fondo blanco o blanco hueso) */
function vBg(c){var x=c.getContext('2d'),W=c.width,H=c.height,b=Math.round(W*0.06),pts=[],d;
 [[0,0,W,b],[0,0,b,Math.round(H*0.6)],[W-b,0,b,Math.round(H*0.6)]].forEach(function(r){d=x.getImageData(r[0],r[1],r[2],r[3]).data;for(var i=0;i<d.length;i+=16)pts.push([d[i],d[i+1],d[i+2]])});
 var m=[0,1,2].map(function(k){return pts.reduce(function(s,p){return s+p[k]},0)/pts.length}),lum=0.2126*m[0]+0.7152*m[1]+0.0722*m[2];
 var sd=Math.sqrt(pts.reduce(function(s,p){var l=0.2126*p[0]+0.7152*p[1]+0.0722*p[2];return s+(l-lum)*(l-lum)},0)/pts.length);
 return {lum:lum,sd:sd,ok:lum>=200&&sd<=28}}
vG.onclick=async function(){if(!vImg)return;vO.innerHTML='';vG.disabled=true;
 try{var r=vRect(),c=document.createElement('canvas');c.width=c.height=VSIDE;var x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,VSIDE,VSIDE);x.imageSmoothingQuality='high';
  x.drawImage(vImg,r.x,r.y,r.s,r.s,0,0,VSIDE,VSIDE);
  var q=await fitBlob(c,'image/jpeg',VMAX,0.5,1),b=q.b;
  if(q.c!==c||b.size>VMAX)throw new Error('No se pudo dejar la foto en '+VSIDE+'×'+VSIDE+' px y menos de 240 KB. Prueba con otra foto.');
  addOut(vO,b,'foto-visa-600x600.jpg');
  msg(vO,'Lista: '+VSIDE+'×'+VSIDE+' px, JPG, '+fsize(b.size)+' (el máximo es 240 KB).');
  var bg=vBg(c);if(!bg.ok)msg(vO,bg.lum<200?'Revisa el fondo: no parece blanco o blanco hueso. La solicitud puede rechazar fotos con fondo de color o con sombras.':'Revisa el fondo: tiene sombras o manchas. Debe ser liso, blanco o blanco hueso.');
  if(r.s<VSIDE)msg(vO,'Tu recorte medía '+Math.round(r.s)+' px y se amplió. Si se ve borrosa, usa una foto con más resolución.');
  vR.src=URL.createObjectURL(b);vR.hidden=false
 }catch(e){msg(vO,e&&e.message?e.message:'No se pudo crear la foto.')}
 vG.disabled=false};
