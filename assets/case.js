/* Case-study pages: shared behaviour, same feel as the homepage. */
(function(){
  var root = document.documentElement;
  root.classList.add('js');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  /* Title fitted to the full width */
  var title = document.querySelector('.title');
  var tbox = null;
  if (title){
    tbox = document.createElement('span');
    tbox.textContent = title.textContent;
    tbox.setAttribute('aria-hidden', 'true');
    title.setAttribute('aria-label', title.textContent);
    title.textContent = '';
    title.appendChild(tbox);
  }
  function fit(){
    if (!title) return;
    title.style.fontSize = '100px';
    var w = tbox.offsetWidth, avail = title.clientWidth;
    if (w) title.style.fontSize = Math.floor(100 * avail / w * 0.995) + 'px';
  }
  fit();
  addEventListener('resize', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

  /* Bend near the bottom of the screen (same numbers as the homepage) */
  var AMOUNT = 0.2, SPREAD = 60, MOUSE_FACTOR = 0.01;
  var mouseX = 0.5, mouseXs = 0.5;
  var blocks = Array.prototype.slice.call(document.querySelectorAll('.bend'));
  var hovers = new Map();
  blocks.forEach(function(b){
    hovers.set(b, { t: 0, v: 0 });
    if (b.classList.contains('card')){
      b.addEventListener('mouseenter', function(){ hovers.get(b).t = 1; });
      b.addEventListener('mouseleave', function(){ hovers.get(b).t = 0; });
      b.addEventListener('focus', function(){ hovers.get(b).t = 1; });
      b.addEventListener('blur', function(){ hovers.get(b).t = 0; });
    }
  });
  function strength(vy, vh){ return Math.pow(clamp(vy / vh, 0, 1), SPREAD); }
  function shape(el, r, vw, vh, hv){
    var w = r.width, h = r.height;
    var ins = 10 * hv, R = 8 + 14 * hv, cx = vw / 2;
    if (strength(r.bottom, vh) < 0.002 && hv < 0.002){ if (el._clip !== ''){ el._clip = ''; el.style.clipPath = ''; } return; }
    var mx = MOUSE_FACTOR * (mouseXs * 2 - 1) * vw;
    var pts = [], k, a, y;
    function add(x, yy){
      var f = reduce ? 0 : strength(r.top + yy, vh);
      var nx = cx + (r.left + x - cx) * (1 + AMOUNT * f) + mx * f;
      pts.push([nx - r.left, yy]);
    }
    var x0 = ins, x1 = w - ins, y0 = ins + R, y1 = h - ins - R, ys = [], ARC = 10;
    for (k = 0; k <= 12; k++) ys.push(y0 + (y1 - y0) * k / 12);
    for (k = 0; k <= 48; k++){ y = vh * (0.86 + 0.14 * k / 48) - r.top; if (y > y0 && y < y1) ys.push(y); }
    ys.sort(function(p, q){ return p - q; });
    for (k = 0; k < ys.length; k++) add(x0, ys[k]);
    for (k = 1; k <= ARC; k++){ a = Math.PI - (Math.PI / 2) * k / ARC; add(x0 + R + R * Math.cos(a), y1 + R * Math.sin(a)); }
    for (k = 0; k <= ARC; k++){ a = Math.PI / 2 - (Math.PI / 2) * k / ARC; add(x1 - R + R * Math.cos(a), y1 + R * Math.sin(a)); }
    for (k = ys.length - 1; k >= 0; k--) add(x1, ys[k]);
    for (k = 1; k <= ARC; k++){ a = -(Math.PI / 2) * k / ARC; add(x1 - R + R * Math.cos(a), y0 + R * Math.sin(a)); }
    for (k = 0; k <= ARC; k++){ a = -Math.PI / 2 - (Math.PI / 2) * k / ARC; add(x0 + R + R * Math.cos(a), y0 + R * Math.sin(a)); }
    var clip = 'polygon(' + pts.map(function(p){ return p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px'; }).join(',') + ')';
    if (clip !== el._clip){ el._clip = clip; el.style.clipPath = clip; }
  }

  /* Smooth scroll */
  var lenis = null;
  if (!reduce && window.Lenis){
    try { lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1 }); } catch(e){ lenis = null; }
  }
  var smooth = null;
  if (!lenis && !reduce && matchMedia('(pointer: fine)').matches){
    smooth = { target: scrollY, cur: scrollY, active: false };
    addEventListener('wheel', function(e){
      if (e.ctrlKey) return;
      e.preventDefault();
      if (!smooth.active){ smooth.target = smooth.cur = scrollY; smooth.active = true; }
      var max = document.documentElement.scrollHeight - innerHeight;
      smooth.target = clamp(smooth.target + e.deltaY * (e.deltaMode === 1 ? 32 : 1), 0, max);
    }, { passive: false });
    addEventListener('scroll', function(){ if (!smooth.active){ smooth.target = smooth.cur = scrollY; } }, { passive: true });
  }

  /* Reveal on scroll */
  var rv = Array.prototype.slice.call(document.querySelectorAll('.rv'));
  function reveal(){
    var vh = innerHeight;
    for (var i = rv.length - 1; i >= 0; i--){
      var r = rv[i].getBoundingClientRect();
      if (r.top < vh * 0.92){ rv[i].classList.add('in'); rv.splice(i, 1); }
    }
  }
  if (reduce) rv.forEach(function(el){ el.classList.add('in'); });

  function frame(t){
    if (lenis) lenis.raf(t);
    else if (smooth && smooth.active){
      smooth.cur += (smooth.target - smooth.cur) * 0.09;
      if (Math.abs(smooth.target - smooth.cur) < 0.5){ smooth.cur = smooth.target; smooth.active = false; }
      scrollTo(0, smooth.cur);
    }
    var vw = document.documentElement.clientWidth, vh = innerHeight;
    mouseXs += (mouseX - mouseXs) * 0.1;
    blocks.forEach(function(b){
      var hs = hovers.get(b);
      hs.v += (hs.t - hs.v) * (reduce ? 1 : 0.16);
      if (Math.abs(hs.t - hs.v) < 0.001) hs.v = hs.t;
      var r = b.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      shape(b, r, vw, vh, hs.v);
    });
    if (rv.length) reveal();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* Cursor dot */
  var dot = document.getElementById('dot');
  addEventListener('mousemove', function(e){ mouseX = e.clientX / innerWidth; });
  if (dot && !reduce && matchMedia('(hover: hover) and (pointer: fine)').matches){
    var x = -100, y = -100, tx = x, ty = y;
    addEventListener('mousemove', function(e){ tx = e.clientX; ty = e.clientY; dot.classList.add('live'); });
    document.addEventListener('mouseleave', function(){ dot.classList.remove('live'); });
    document.querySelectorAll('a,button,.pan').forEach(function(el){
      el.addEventListener('mouseenter', function(){ dot.classList.add('big'); });
      el.addEventListener('mouseleave', function(){ dot.classList.remove('big'); });
    });
    (function loop(){ x += (tx - x) * 0.22; y += (ty - y) * 0.22; dot.style.transform = 'translate(' + x + 'px,' + y + 'px)'; requestAnimationFrame(loop); })();
  }

  /* Copy email */
  var copyBtn = document.getElementById('copyBtn');
  if (copyBtn) copyBtn.addEventListener('click', function(){
    var b = this, t = document.getElementById('email').textContent;
    function done(){ b.textContent = 'Copied'; setTimeout(function(){ b.textContent = 'Copy email'; }, 1600); }
    function fallback(){ var r = document.createRange(); r.selectNodeContents(document.getElementById('email')); var s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Selected, press Ctrl+C'; }
    try { navigator.clipboard.writeText(t).then(done, fallback); } catch(e){ fallback(); }
  });
})();
