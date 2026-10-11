/* Ruled-paper background, as in the Figma frames: 24 lines from the very top of the screen to the very bottom,
   so the screen is split into 23 equal bands (about 44.5px apart on a 1024px-tall screen,
   rounded to whole pixels so every gap is identical). The lines scroll with the page.
   Drawn on a canvas in real device pixels so every line comes out the same crisp 1px weight and the gaps stay even,
   which a CSS gradient can't promise at fractional spacings or zoom levels. Colour comes from the --rule token. */
(function(){
  var c = document.createElement('canvas');
  c.className = 'rules'; c.setAttribute('aria-hidden', 'true');
  var ctx = c.getContext('2d');
  var BANDS = 23, gapD = 0, baseH = 0, lastW = 0, color = 'transparent', queued = false;

  function measure(){
    var w = innerWidth, h = document.documentElement.clientHeight;
    /* phones resize the viewport when the address bar hides; ignore small height changes so the lines don't jump */
    if (!baseH || w !== lastW || Math.abs(h - baseH) > 140) baseH = h;
    lastW = w;
    var dpr = window.devicePixelRatio || 1;
    gapD = Math.max(2, Math.round(baseH / BANDS * dpr));   /* gap in whole device pixels, so every gap is exactly the same */
    var W = Math.round(w * dpr), H = Math.round(h * dpr);
    if (c.width !== W || c.height !== H){ c.width = W; c.height = H; }
  }
  function readColor(){ color = getComputedStyle(c).color; }
  function draw(){
    queued = false;
    var dpr = window.devicePixelRatio || 1;
    var lw = Math.max(1, Math.round(dpr));            /* 1 css px, snapped to whole device pixels */
    var off = Math.round((window.scrollY || 0) * dpr) % gapD;   /* lines move with the page; all integer maths */
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = color;
    for (var py = -off - Math.floor(lw / 2); py <= c.height; py += gapD){
      if (py + lw < 0) continue;
      ctx.fillRect(0, py, c.width, lw);
    }
  }
  function queue(){ if (!queued){ queued = true; requestAnimationFrame(draw); } }
  function all(){ measure(); readColor(); draw(); }

  function init(){
    document.body.insertBefore(c, document.body.firstChild);
    all();
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', function(){ measure(); queue(); });
    /* redraw in the right colour whenever the theme changes */
    new MutationObserver(function(){ setTimeout(function(){ readColor(); queue(); }, 0); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    var mq = matchMedia('(prefers-color-scheme: dark)');
    var onMq = function(){ readColor(); queue(); };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
  }
  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();
