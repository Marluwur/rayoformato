/* Carga de librerias bajo demanda */
var LIBS={jspdf:'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',autotable:'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',html2canvas:'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',pdfjs:'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',mammoth:'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',xlsx:'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',tesseract:'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',lame:'https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js',jszip:'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',pdflib:'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js'};
var _lp={};
function need(k){return _lp[k]||(_lp[k]=new Promise(function(res,rej){var s=document.createElement('script');s.src=LIBS[k];s.onload=res;s.onerror=function(){delete _lp[k];rej(new Error('No se pudo cargar '+k))};document.head.appendChild(s)}))}
/* Utilidades comunes */
function msg(ul,t){var d0=ul.parentNode.querySelector('.ad-done');if(d0)d0.remove();var li=document.createElement('li');li.textContent=t;ul.appendChild(li)}
/* Minijuego mientras se procesa */
var G={el:null,run:false};
function gameOn(ul){
 if(!G.el){G.el=document.createElement('div');G.el.className='game';G.el.innerHTML='<div class="ghead"><p>Mientras esperas, juega: salta con ▲, toca el recuadro o usa la barra espaciadora.</p><div class="ghud"><span class="gs sc">Puntos <b>0</b></span><span class="gs">Récord <b>0</b></span><button type="button" data-a="j" title="Saltar" aria-label="Saltar">▲</button><button type="button" data-a="p" title="Pausa" aria-label="Pausa">❚❚</button><button type="button" data-a="r" title="Reiniciar" aria-label="Reiniciar">↻</button></div></div><canvas width="600" height="150" tabindex="0" aria-label="Minijuego: salta los obstáculos"></canvas>';G.cv=G.el.querySelector('canvas');G.sc=G.el.querySelectorAll('.gs b');initGame()}
 ul.after(G.el);G.el.style.display='';G.paused=false;G.pb.textContent='❚❚';G.reset();if(!G.run){G.run=true;G.loop()}}
function gameOff(){if(G.el){G.el.style.display='none';G.run=false}}
function initGame(){
 var cv=G.cv,x=cv.getContext('2d'),best=0,S;
 function reset(){S={y:0,vy:0,o:[],f:0,sc:0,sp:5,dead:false}}
 G.reset=reset;reset();
 function jump(){if(G.paused)return;if(S.dead){reset();return}if(S.y===0)S.vy=9}
 G.pb=G.el.querySelector('[data-a=p]');
 G.el.querySelector('.ghud').onclick=function(e){var b=e.target.closest('button');if(!b)return;var a=b.dataset.a;
  if(a==='j')jump();else if(a==='r'){G.paused=false;G.pb.textContent='❚❚';reset()}
  else{G.paused=!G.paused;b.textContent=G.paused?'▶':'❚❚';b.title=G.paused?'Continuar':'Pausa';b.setAttribute('aria-label',b.title)}};
 cv.addEventListener('pointerdown',function(e){e.preventDefault();cv.focus();jump()});
 cv.addEventListener('keydown',function(e){if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();jump()}});
 G.loop=function loop(){
  if(!G.run)return;
  var g=120,col=getComputedStyle(document.body).color;
  if(!S.dead&&!G.paused){S.f++;S.vy-=.6;S.y=Math.max(0,S.y+S.vy);if(S.y===0&&S.vy<0)S.vy=0;
   if(S.f%Math.max(45,95-Math.floor(S.sc/60)*5)===0)S.o.push({x:600,w:14+Math.random()*14,h:22+Math.random()*26});
   S.o.forEach(function(o){o.x-=S.sp});S.o=S.o.filter(function(o){return o.x>-40});
   S.sc+=.15;S.sp=5+S.sc/80;
   S.o.forEach(function(o){if(o.x<60&&o.x+o.w>38&&S.y<o.h-4)S.dead=true});
   if(S.dead&&S.sc>best)best=S.sc}
  x.clearRect(0,0,600,150);x.fillStyle=col;x.fillRect(0,g+2,600,2);
  S.o.forEach(function(o){x.fillRect(o.x,g-o.h+2,o.w,o.h)});
  var py=g-S.y;x.fillStyle='#FFD21F';x.strokeStyle='#14171C';x.lineWidth=2;x.beginPath();x.moveTo(52,py-34);x.lineTo(38,py-14);x.lineTo(47,py-14);x.lineTo(43,py+2);x.lineTo(60,py-20);x.lineTo(50,py-20);x.closePath();x.fill();x.stroke();
  G.sc[0].textContent=Math.floor(S.sc);G.sc[1].textContent=Math.floor(best);
  if(S.dead){x.fillStyle=col;x.font='600 16px Figtree,sans-serif';x.textAlign='center';x.fillText('Fin del juego · toca para reintentar',300,70);x.textAlign='left'}
  if(G.paused){x.fillStyle=col;x.font='600 16px Figtree,sans-serif';x.textAlign='center';x.fillText('Pausa',300,70);x.textAlign='left'}
  requestAnimationFrame(loop)}}
function showAd(ul){gameOff()}
function fsize(n){return n<1048576?Math.max(1,Math.round(n/1024))+' KB':(n/1048576).toFixed(1)+' MB'}
function ready(ul,fl){ul.innerHTML='';Array.from(fl).forEach(function(f){msg(ul,f.name+' · '+fsize(f.size)+' (original)')})}
function addOut(ul,blob,name,orig){var li=document.createElement('li'),s=document.createElement('span'),a=document.createElement('a');s.textContent=name+' ('+fsize(blob.size)+')';a.href=URL.createObjectURL(blob);a.download=name;a.textContent='Descargar';li.appendChild(s);li.appendChild(a);ul.appendChild(li);clearTimeout(ul._t);ul._t=setTimeout(function(){showAd(ul)},1500)}
function base(f){return f.name.replace(/\.[^.]+$/,'')}
function readImg(f){return new Promise(function(res,rej){var i=new Image();i.onload=function(){res(i)};i.onerror=rej;i.src=URL.createObjectURL(f)})}
function esc(t){return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
