function gifEnc(frames,w,h,delay){var o=[];function b(x){o.push(x&255)}function s(x){b(x);b(x>>8)}function str(t){for(var i=0;i<t.length;i++)b(t.charCodeAt(i))}
 function lzw(px){b(8);var bits=9,next=258,dict={},buf=0,nb=0,out=[];
  function emit(c){buf|=c<<nb;nb+=bits;while(nb>=8){out.push(buf&255);buf>>=8;nb-=8}if(next>(1<<bits)-1&&bits<12)bits++}
  emit(256);var p=px[0];
  for(var i=1;i<px.length;i++){var k=px[i],key=(p<<8)|k;
   if(dict[key]!==undefined)p=dict[key];
   else{emit(p);if(next<4096)dict[key]=next++;else{emit(256);dict={};next=258;bits=9}p=k}}
  emit(p);emit(257);if(nb>0)out.push(buf&255);
  for(var j=0;j<out.length;j+=255){var n=Math.min(255,out.length-j);b(n);for(var m=0;m<n;m++)b(out[j+m])}b(0)}
 str('GIF89a');s(w);s(h);b(0xF7);b(0);b(0);
 for(var i=0;i<256;i++){if(i<216){b(Math.floor(i/36)*51);b(Math.floor(i/6)%6*51);b(i%6*51)}else{b(0);b(0);b(0)}}
 b(0x21);b(0xFF);b(11);str('NETSCAPE2.0');b(3);b(1);s(0);b(0);
 frames.forEach(function(fr){b(0x21);b(0xF9);b(4);b(0);s(delay);b(0);b(0);b(0x2C);s(0);s(0);s(w);s(h);b(0);lzw(fr)});
 b(0x3B);return new Blob([new Uint8Array(o)],{type:'image/gif'})}
async function vload(f){var v=document.createElement('video');v.src=URL.createObjectURL(f);v.muted=true;v.playsInline=true;await new Promise(function(r,j){v.onloadedmetadata=r;v.onerror=j});return v}
function seek(v,t){return new Promise(function(r){v.onseeked=r;v.currentTime=t})}
async function toGif(v,st,du){st=Math.min(st,Math.max(0,v.duration-0.5));var dur=Math.min(du,v.duration-st),w=Math.min(480,v.videoWidth),h=Math.round(v.videoHeight*w/v.videoWidth),c=document.createElement('canvas');c.width=w;c.height=h;var x=c.getContext('2d',{willReadFrequently:true}),fr=[];
 for(var t=0;t<dur;t+=0.1){await seek(v,st+t+0.01);x.drawImage(v,0,0,w,h);var d=x.getImageData(0,0,w,h).data,p=new Uint8Array(w*h);for(var i=0,j=0;i<d.length;i+=4,j++)p[j]=Math.round(d[i]/51)*36+Math.round(d[i+1]/51)*6+Math.round(d[i+2]/51);fr.push(p)}
 return gifEnc(fr,w,h,10)}
async function toMp4(v){var ctx=new (window.AudioContext||window.webkitAudioContext)(),src=ctx.createMediaElementSource(v),dest=ctx.createMediaStreamDestination();src.connect(dest);v.muted=false;
 var cs=v.captureStream?v.captureStream():v.mozCaptureStream(),st=new MediaStream(cs.getVideoTracks().concat(dest.stream.getAudioTracks()));
 var mt=['video/mp4;codecs=avc1,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm'].find(function(t){return MediaRecorder.isTypeSupported(t)});
 var rec=new MediaRecorder(st,{mimeType:mt}),ch=[];rec.ondataavailable=function(e){ch.push(e.data)};
 var done=new Promise(function(r){rec.onstop=r});rec.start();v.currentTime=0;await v.play();await new Promise(function(r){v.onended=r});rec.stop();await done;ctx.close();
 return {blob:new Blob(ch,{type:mt.split(';')[0]}),ext:mt.indexOf('mp4')>-1?'mp4':'webm'}}
var vF=document.getElementById('v-file'),vM=document.getElementById('v-fmt'),vG=document.getElementById('v-go'),vO=document.getElementById('v-out');
vF.onchange=function(){vG.disabled=!vF.files.length;ready(vO,vF.files);scan(vF.files[0])};
var vP=document.getElementById('v-prev'),vC=document.getElementById('v-clip'),vS=document.getElementById('v-s'),vD=document.getElementById('v-d'),vSt=document.getElementById('v-st'),vDu=document.getElementById('v-du'),strip=document.getElementById('v-strip'),sel=null;
function fmtT(t){var m=Math.floor(t/60),s=Math.floor(t%60);return m+':'+(s<10?'0':'')+s}
function upd(){var d=vP.duration||0,st=+vS.value,du=Math.min(+vD.value,Math.max(0.5,d-st));vSt.textContent=fmtT(st)+' – '+fmtT(st+du);vDu.textContent=String(Math.round(du*10)/10);if(sel&&d){sel.style.left=(st/d*100)+'%';sel.style.width=(du/d*100)+'%'}}
async function scan(f){
 vC.hidden=true;strip.innerHTML='';sel=null;
 if(!f||vM.value!=='gif')return;
 vP.src=URL.createObjectURL(f);
 try{await new Promise(function(r,j){vP.onloadedmetadata=r;vP.onerror=j})}catch(e){return}
 var d=vP.duration;vS.max=Math.max(0,d-0.5);vS.value=0;vD.max=Math.min(10,d);vD.value=Math.min(5,d);vC.hidden=false;
 var n=10,tv=document.createElement('video');tv.muted=true;tv.src=vP.src;await new Promise(function(r){tv.onloadedmetadata=r});
 for(var i=0;i<n;i++){var cv=document.createElement('canvas');cv.width=96;cv.height=54;strip.appendChild(cv);await seek(tv,(i+0.5)*d/n);cv.getContext('2d').drawImage(tv,0,0,96,54);(function(t){cv.onclick=function(){vS.value=Math.min(t,vS.max);vP.currentTime=+vS.value;upd()}})(i*d/n)}
 sel=document.createElement('div');sel.className='sel';strip.appendChild(sel);upd()}
vS.oninput=function(){vP.currentTime=+vS.value;upd()};vD.oninput=upd;vM.onchange=function(){scan(vF.files[0])};
vG.onclick=async function(){
 vO.innerHTML='';vG.disabled=true;gameOn(vO);
 for(var f6 of Array.from(vF.files)){
  msg(vO,'Procesando '+f6.name+(vM.value==='mp4'?' (se graba en tiempo real, no cambies de pestaña)':'')+'…');var row=vO.lastChild;
  try{var v=await vload(f6),r=vM.value==='gif'?{blob:await toGif(v,+vS.value,+vD.value),ext:'gif'}:await toMp4(v);
   row.remove();addOut(vO,r.blob,base(f6)+'.'+r.ext,f6.size);
   if(r.ext==='webm')msg(vO,'Tu navegador no puede grabar MP4; se guardó como WebM.')}
  catch(e){row.textContent=f6.name+': no se pudo procesar. Prueba con otro navegador o formato.'}
 }
 gameOff();vG.disabled=false};