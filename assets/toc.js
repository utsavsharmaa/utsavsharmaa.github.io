/* Section navigation for case studies.
   Markup: <nav class="toc" aria-label="Sections"><ol><li><a href="#id" [data-target="css selector"]>Label</a></li>…</ol></nav>
   data-target is used when a section exists twice (desktop and phone layouts); the visible one wins. */
(function(){
  var nav=document.querySelector('nav.toc');if(!nav)return;
  var links=[].slice.call(nav.querySelectorAll('ol a'));if(!links.length)return;
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

  function target(a){
    var sel=a.getAttribute('data-target')||a.getAttribute('href');
    var all=[].slice.call(document.querySelectorAll(sel));
    for(var i=0;i<all.length;i++){if(all[i].getClientRects().length&&all[i].offsetHeight)return all[i]}
    return all[0]||null;
  }

  // Phone pill + sheet, built from the same list.
  var btn=document.createElement('button');btn.type='button';btn.className='toc-btn';
  btn.setAttribute('aria-expanded','false');
  btn.innerHTML='<b>Sections</b><em></em><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 7.5 6 4l3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var sheet=document.createElement('ol');sheet.className='toc-sheet';sheet.id='toc-sheet';
  btn.setAttribute('aria-controls','toc-sheet');
  links.forEach(function(a,i){
    var li=document.createElement('li'),b=document.createElement('a');
    b.href=a.getAttribute('href');if(a.dataset.target)b.dataset.target=a.dataset.target;
    b.innerHTML='<i>'+String(i+1).padStart(2,'0')+'</i><span></span>';b.lastChild.textContent=a.textContent;
    li.appendChild(b);sheet.appendChild(li);
  });
  nav.appendChild(sheet);nav.appendChild(btn);
  links.forEach(function(a){var t=a.textContent;a.textContent='';var s=document.createElement('span');s.textContent=t;a.appendChild(s)});
  var sheetLinks=[].slice.call(sheet.querySelectorAll('a'));
  var label=btn.querySelector('em');

  function setOpen(o){nav.classList.toggle('open',o);btn.setAttribute('aria-expanded',o?'true':'false')}
  btn.addEventListener('click',function(e){e.stopPropagation();setOpen(!nav.classList.contains('open'))});
  document.addEventListener('click',function(e){if(!nav.contains(e.target))setOpen(false)});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&nav.classList.contains('open')){setOpen(false);btn.focus()}});

  function go(e){
    var t=target(this);if(!t)return;e.preventDefault();setOpen(false);
    var y=t.getBoundingClientRect().top+scrollY-72;
    scrollTo({top:Math.max(0,y),behavior:reduce?'auto':'smooth'});
    history.replaceState(null,'',this.getAttribute('href'));
  }
  links.concat(sheetLinks).forEach(function(a){a.addEventListener('click',go)});

  var cur=-1,ticking=false;
  function update(){
    ticking=false;
    var vh=innerHeight,line=vh*0.35,idx=-1,first=null;
    for(var i=0;i<links.length;i++){
      var t=target(links[i]);if(!t)continue;
      var top=t.getBoundingClientRect().top;
      if(first===null)first=top;
      if(top<=line)idx=i;
    }
    nav.classList.toggle('on',first!==null&&first<vh*0.6);
    if(idx<0)idx=0;
    if(idx!==cur){
      cur=idx;
      [links,sheetLinks].forEach(function(list){list.forEach(function(a,i){if(i===idx)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current')})});
      label.textContent=links[idx].textContent;
    }
  }
  function req(){if(!ticking){ticking=true;requestAnimationFrame(update)}}
  addEventListener('scroll',req,{passive:true});addEventListener('resize',req);addEventListener('load',req);update();
})();
