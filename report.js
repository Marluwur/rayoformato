
/* Buzon de reportes: el boton aparece solo si el Worker /api/report esta activo */
(function(){
 var errs=[],cfg=null,tok='',tsId=null,dlg=null;
 function safe(t){return String(t==null?'':t).replace(/[^\s|]+\.(pdf|png|jpe?g|webp|gif|bmp|avif|heic|docx?|xlsx?|csv|txt|mp3|wav|m4a|ogg|mp4|mov|webm|zip)\b/gi,'[archivo]')}
 window.addEventListener('error',function(e){errs.push(safe(e.message).slice(0,200));errs=errs.slice(-3)});
 window.addEventListener('unhandledrejection',function(e){var r=e.reason;errs.push(safe(r&&r.message?r.message:r).slice(0,200));errs=errs.slice(-3)});
 function ctx(){
  var c={ruta:location.pathname,idioma:navigator.language,pantalla:screen.width+'x'+screen.height,ventana:innerWidth+'x'+innerHeight,errores:errs.slice()};
  var m=document.querySelector('input[name=dmode]:checked')||document.querySelector('input[name=pmode]:checked');if(m)c.modo=m.value;
  [['fmt','formato'],['a-fmt','audio'],['v-fmt','video'],['ratio','recorte'],['res','resolucion']].forEach(function(p){var e=document.getElementById(p[0]);if(e)c[p[1]]=e.value});
  var fl=[];['file','d-file','a-file','v-file','p-file'].forEach(function(id){var e=document.getElementById(id);if(e&&e.files)Array.prototype.forEach.call(e.files,function(f){fl.push((f.type||'?')+':'+f.size)})});
  if(fl.length)c.archivos=fl.slice(0,5);
  var out=['out','d-out','a-out','v-out','p-out'].map(function(id){var e=document.getElementById(id);return e?safe(e.innerText).replace(/\s+/g,' ').slice(0,300):''}).filter(Boolean);
  if(out.length)c.mensajes=out.join(' | ').slice(0,600);
  return c}
 function st(t,bad){var e=dlg.querySelector('#rp-st');e.textContent=t;e.style.color=bad?'#D64545':''}
 function open(){
  if(!dlg)return;st('');
  if(dlg.showModal)dlg.showModal();else dlg.setAttribute('open','');
  if(cfg.turnstile&&tsId===null&&!dlg._ts){dlg._ts=1;var s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.onload=function(){try{tsId=turnstile.render('#rp-ts',{sitekey:cfg.turnstile,callback:function(t){tok=t},'expired-callback':function(){tok=''}})}catch(e){}};document.head.appendChild(s)}
  setTimeout(function(){var t=dlg.querySelector('#rp-msg');if(t)t.focus()},50)}
 function close(){if(dlg.close)dlg.close();else dlg.removeAttribute('open')}
 function mount(){
  var nav=document.querySelector('.fl');if(!nav)return;
  var b=document.createElement('button');b.type='button';b.className='rp-btn';b.textContent='Reportar un problema';b.onclick=open;nav.appendChild(b);
  dlg=document.createElement('dialog');dlg.id='rp-dlg';dlg.setAttribute('aria-labelledby','rp-t');
  dlg.innerHTML='<form id="rp-f"><h2 id="rp-t">Reportar un problema</h2><p>Cu\u00e9ntanos qu\u00e9 fall\u00f3. No escribas datos personales ni adjuntes archivos.</p>'
   +'<label>\u00bfQu\u00e9 pas\u00f3?<textarea id="rp-msg" maxlength="1000" rows="5" required></textarea></label>'
   +'<label>Tu correo (opcional, solo si quieres respuesta)<input type="email" id="rp-mail" maxlength="120" autocomplete="email"></label>'
   +'<input type="text" id="rp-hp" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px">'
   +'<div id="rp-ts"></div><p id="rp-st" role="status"></p>'
   +'<div class="rp-act"><button type="button" id="rp-x">Cancelar</button><button type="submit" class="btn" id="rp-go">Enviar</button></div>'
   +'<small>Se env\u00eda junto con datos t\u00e9cnicos (p\u00e1gina, navegador y mensajes de error), nunca tus archivos. M\u00e1s informaci\u00f3n en la <a href="/privacidad">pol\u00edtica de privacidad</a>.</small></form>';
  document.body.appendChild(dlg);
  dlg.querySelector('#rp-x').onclick=close;
  dlg.addEventListener('click',function(e){if(e.target===dlg)close()});
  var f=dlg.querySelector('#rp-f'),go=dlg.querySelector('#rp-go');
  f.onsubmit=function(e){
   e.preventDefault();
   var body={message:dlg.querySelector('#rp-msg').value.trim(),contact:dlg.querySelector('#rp-mail').value.trim(),website:dlg.querySelector('#rp-hp').value,page:location.pathname,context:ctx(),token:tok};
   if(body.message.length<5){st('Cu\u00e9ntanos un poco m\u00e1s (m\u00ednimo 5 caracteres).',true);return}
   st('Enviando\u2026');go.disabled=true;
   fetch('/api/report',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
    .then(function(r){return r.json().catch(function(){return{}}).then(function(j){return{ok:r.ok,j:j}})})
    .then(function(x){if(x.ok){st('\u00a1Gracias! Recibimos tu reporte.');f.reset();setTimeout(close,1800)}else st(x.j.error||'No se pudo enviar. Int\u00e9ntalo de nuevo.',true)})
    .catch(function(){st('No se pudo enviar. Revisa tu conexi\u00f3n.',true)})
    .then(function(){go.disabled=false;if(window.turnstile&&tsId!==null){try{turnstile.reset(tsId)}catch(e){}}tok=''})}}
 function init(){
  fetch('/api/report',{headers:{accept:'application/json'}}).then(function(r){return r.ok&&/json/.test(r.headers.get('content-type')||'')?r.json():null})
   .then(function(j){if(j&&j.active){cfg=j;mount()}}).catch(function(){})}
 (window.requestIdleCallback||function(f){setTimeout(f,300)})(init);
})();
