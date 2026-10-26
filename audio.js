/* Audio y video: extraer audio a MP3 o WAV */
var aF=document.getElementById('a-file'),aM=document.getElementById('a-fmt'),aG=document.getElementById('a-go'),aO=document.getElementById('a-out');
async function decode(f){var ctx=new (window.AudioContext||window.webkitAudioContext)();var buf=await ctx.decodeAudioData(await f.arrayBuffer());ctx.close();return buf}
function pcm(a){var r=new Int16Array(a.length);for(var i=0;i<a.length;i++){var s=Math.max(-1,Math.min(1,a[i]));r[i]=s<0?s*0x8000:s*0x7FFF}return r}
function toWav(buf){var ch=Math.min(buf.numberOfChannels,2),len=buf.length,ab=new ArrayBuffer(44+len*ch*2),v=new DataView(ab);
 function w(o,s){for(var i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))}
 w(0,'RIFF');v.setUint32(4,36+len*ch*2,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,ch,true);v.setUint32(24,buf.sampleRate,true);v.setUint32(28,buf.sampleRate*ch*2,true);v.setUint16(32,ch*2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,len*ch*2,true);
 var d=[];for(var c=0;c<ch;c++)d.push(pcm(buf.getChannelData(c)));var o=44;for(var i=0;i<len;i++)for(c=0;c<ch;c++){v.setInt16(o,d[c][i],true);o+=2}
 return new Blob([ab],{type:'audio/wav'})}
function toMp3(buf){var ch=Math.min(buf.numberOfChannels,2),enc=new lamejs.Mp3Encoder(ch,buf.sampleRate,128),parts=[],L=pcm(buf.getChannelData(0)),R=ch>1?pcm(buf.getChannelData(1)):null;
 for(var i=0;i<L.length;i+=1152){var b=ch>1?enc.encodeBuffer(L.subarray(i,i+1152),R.subarray(i,i+1152)):enc.encodeBuffer(L.subarray(i,i+1152));if(b.length)parts.push(new Uint8Array(b))}
 var e=enc.flush();if(e.length)parts.push(new Uint8Array(e));return new Blob(parts,{type:'audio/mpeg'})}
aF.onchange=function(){aG.disabled=!aF.files.length;ready(aO,aF.files)};
aG.onclick=async function(){
 aO.innerHTML='';aG.disabled=true;if(Array.from(aF.files).some(function(f){return f.size>20971520}))gameOn(aO);
 for(var f of Array.from(aF.files)){
  if(f.size>150*1024*1024){msg(aO,f.name+': pesa más de 150 MB.');continue}
  msg(aO,'Procesando '+f.name+'…');var row=aO.lastChild;
  try{var buf=await decode(f);if(aM.value==='mp3')await need('lame');var b=aM.value==='mp3'?toMp3(buf):toWav(buf);row.remove();addOut(aO,b,base(f)+'.'+aM.value,f.size)}
  catch(e){row.textContent=f.name+': no se pudo leer el audio de este archivo.'}
 }
 gameOff();aG.disabled=false};
