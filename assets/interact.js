/* Case-study interactions shared by all four pages:
   click-to-enlarge images (with zoom, drag and arrows), numbers that count up,
   images that fade in on first view, and videos that pause off screen.
   Everything stays visible and usable without JavaScript. */
(function () {
  var doc = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var RASTER = /\.(webp|png|jpe?g|avif|gif)(\?|$)/i;

  function ready(fn) { if (document.readyState === 'complete') fn(); else addEventListener('load', fn); }

  /* ---------- Which images are content (worth enlarging) ---------- */
  function bestSrc(el) {
    var ss = el.getAttribute('srcset');
    if (!ss) return srcOf(el);
    var best = null, bw = 0;
    ss.split(',').forEach(function (c) {
      var m = c.trim().split(/\s+/), w = parseFloat(m[1]) || 1;
      if (w > bw) { bw = w; best = m[0]; }
    });
    return best ? new URL(best, el.baseURI).href : srcOf(el);
  }
  function srcOf(el) {
    if (el.tagName === 'IMG') return el.currentSrc || el.src || '';
    var m = /url\(["']?([^"')]+)["']?\)/.exec(el.style.backgroundImage || '');
    return m ? m[1] : '';
  }
  function visible(el) {
    for (var n = el; n && n !== document.body; n = n.parentElement) {
      var cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    }
    return true;
  }
  function inLightboxScope(el) {
    return !el.closest('nav, header, footer, .toc, .iz-box, .vrx, .world-demo, .reel, video, a, button, [aria-hidden="true"]');
  }
  /* Cheap first pass: raster, big enough, not a full-bleed backdrop, not chrome. */
  function candidates() {
    var vw = doc.clientWidth, minSide = vw < 700 ? 96 : 120, out = [];
    document.querySelectorAll('main img, article img, section img, main [style*="background-image"], article [style*="background-image"]').forEach(function (el) {
      if (el._izc || el.hasAttribute('data-iz-skip')) return;
      var src = srcOf(el);
      if (!src || !RASTER.test(src) || !inLightboxScope(el)) return;
      var r = el.getBoundingClientRect();
      if (r.width < minSide || r.height < minSide) return;
      if (r.width / r.height > 5 || r.height / r.width > 5) return; /* text renders, strips */
      if (el.tagName === 'IMG' && el.closest('section.s') && r.width > vw * 0.97) { el._izc = true; wire(el, true); return; }
      if (r.width > vw * 0.97 && r.height > innerHeight * 0.75) return;
      out.push(el);
    });
    return out;
  }
  /* Second pass once it's on screen: it must be the thing on top, not text sitting over it. */
  function isContent(el) {
    if (el.parentElement && !visible(el.parentElement)) return false;
    var cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    var r = el.getBoundingClientRect(), vw = doc.clientWidth, hits = 0, tested = 0;
    for (var i = 1; i <= 3; i++) for (var j = 1; j <= 3; j++) {
      var x = r.left + r.width * (i / 4), y = r.top + r.height * (j / 4);
      if (x < 0 || x >= vw || y < 0 || y >= innerHeight) continue;
      var top = document.elementFromPoint(x, y);
      if (!top || floating(top)) continue;
      tested++;
      if (top === el || el.contains(top)) hits++;
      else if (top.tagName === 'IMG') hits++;             /* device frame or mask over a photo */
      else if (!hasText(top) && top.contains(el)) hits++;
    }
    return tested > 0 && hits / tested >= 0.6;
  }
  function floating(el) {
    for (var n = el, i = 0; n && n !== document.body && i < 8; n = n.parentElement, i++) {
      var p = getComputedStyle(n).position;
      if (p === 'fixed' || p === 'sticky') return true;
    }
    return false;
  }
  function withProbe(fn) {
    var probe = document.createElement('style');
    probe.textContent = '*{pointer-events:auto!important}.iz-box,.case-reading-progress,.toc{pointer-events:none!important}';
    document.head.appendChild(probe);
    try { fn(); } finally { probe.remove(); }
  }
  function hasText(el) {
    for (var c = el.firstChild; c; c = c.nextSibling) if (c.nodeType === 3 && c.nodeValue.trim()) return true;
    return /^(P|H[1-6]|SPAN|LI|A|BUTTON|LABEL)$/.test(el.tagName) && el.textContent.trim().length > 0;
  }

  /* ---------- Lightbox ---------- */
  var items = [], box, stage, pic, cap, idx = 0, zoom = 1, px = 0, py = 0, lastFocus;
  function labelFor(el) {
    return (el.getAttribute('data-zoom-label') || el.getAttribute('alt') || '').trim();
  }
  function build() {
    box = document.createElement('div');
    box.className = 'iz-box';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Image viewer');
    box.hidden = true;
    box.innerHTML =
      '<div class="iz-stage"><img class="iz-pic" alt=""></div>' +
      '<div class="iz-bar"><span class="iz-cap" aria-live="polite"></span>' +
      '<span class="iz-hint">Click to zoom</span></div>' +
      '<button type="button" class="iz-btn iz-prev" aria-label="Previous image">&#8592;</button>' +
      '<button type="button" class="iz-btn iz-next" aria-label="Next image">&#8594;</button>' +
      '<button type="button" class="iz-btn iz-close" aria-label="Close">&#215;</button>';
    document.body.appendChild(box);
    stage = box.querySelector('.iz-stage'); pic = box.querySelector('.iz-pic'); cap = box.querySelector('.iz-cap');
    box.querySelector('.iz-close').onclick = close;
    box.querySelector('.iz-prev').onclick = function () { go(-1); };
    box.querySelector('.iz-next').onclick = function () { go(1); };
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      else if (e.key === 'Tab') { /* keep focus inside */
        var f = box.querySelectorAll('button'), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    /* click empty space to close */
    stage.addEventListener('click', function (e) { if (e.target === stage && !moved) close(); });

    /* zoom + drag + swipe, mouse and touch through pointer events */
    var down = null, moved = false, pinch = null, pointers = {};
    pic.addEventListener('pointerdown', function (e) {
      pointers[e.pointerId] = e;
      pic.setPointerCapture(e.pointerId);
      moved = false;
      var ids = Object.keys(pointers);
      if (ids.length === 2) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), z: zoom };
        down = null;
      } else down = { x: e.clientX, y: e.clientY, px: px, py: py, t: Date.now() };
      e.preventDefault();
    });
    pic.addEventListener('pointermove', function (e) {
      if (!pointers[e.pointerId]) return;
      pointers[e.pointerId] = e;
      var ids = Object.keys(pointers);
      if (pinch && ids.length === 2) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        setZoom(pinch.z * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / pinch.d);
        moved = true; return;
      }
      if (!down) return;
      var dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
      if (zoom > 1) { px = down.px + dx; py = down.py + dy; apply(); }
      else pic.style.translate = dx + 'px 0';
    });
    function up(e) {
      if (!pointers[e.pointerId]) return;
      delete pointers[e.pointerId];
      if (pinch) { if (Object.keys(pointers).length < 2) { pinch = null; if (zoom < 1.05) reset(); } return; }
      if (!down) return;
      var dx = e.clientX - down.x;
      if (zoom === 1 && moved && Math.abs(dx) > 60) { pic.style.translate = ''; go(dx < 0 ? 1 : -1); }
      else if (!moved) toggleZoom(e.clientX, e.clientY);
      else if (zoom === 1) pic.style.translate = '';
      down = null;
    }
    pic.addEventListener('pointerup', up);
    pic.addEventListener('pointercancel', up);
    box.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = pic.getBoundingClientRect(), old = zoom;
      setZoom(zoom * Math.exp(-e.deltaY * 0.002));
      if (zoom === 1) return reset();
      /* zoom toward the cursor */
      var cx = e.clientX - (r.left + r.width / 2), cy = e.clientY - (r.top + r.height / 2);
      px -= cx * (zoom / old - 1); py -= cy * (zoom / old - 1); apply();
    }, { passive: false });
  }
  function maxZoom() {
    var r = pic.getBoundingClientRect(), base = r.width / zoom;
    return Math.max(2, Math.min(4, (pic.naturalWidth || base) / base * 1.5));
  }
  function setZoom(z) { zoom = Math.max(1, Math.min(maxZoom(), z)); if (zoom === 1) { px = py = 0; } apply(); }
  function toggleZoom(x, y) {
    if (zoom > 1) return reset();
    var r = pic.getBoundingClientRect();
    var z = Math.min(maxZoom(), 2.5);
    zoom = z;
    px = -(x - (r.left + r.width / 2)) * (z - 1);
    py = -(y - (r.top + r.height / 2)) * (z - 1);
    apply();
  }
  function apply() {
    /* keep the zoomed picture covering the screen */
    var w = pic.offsetWidth * zoom, h = pic.offsetHeight * zoom;
    var lx = Math.max(0, (w - innerWidth) / 2 + 24), ly = Math.max(0, (h - innerHeight) / 2 + 24);
    px = Math.max(-lx, Math.min(lx, px)); py = Math.max(-ly, Math.min(ly, py));
    pic.style.transform = 'translate(' + px + 'px,' + py + 'px) scale(' + zoom + ')';
    box.classList.toggle('zoomed', zoom > 1);
  }
  function reset() { zoom = 1; px = py = 0; pic.style.translate = ''; apply(); }
  function show(i) {
    if (i < 0 || i >= items.length) return;
    idx = i;
    box.querySelector('.iz-prev').disabled = idx === 0;
    box.querySelector('.iz-next').disabled = idx === items.length - 1;
    var el = items[idx], src = bestSrc(el);
    reset();
    pic.classList.remove('in');
    pic.onload = function () { requestAnimationFrame(function () { pic.classList.add('in'); }); };
    pic.src = src;
    if (pic.complete) pic.onload();
    var l = labelFor(el);
    cap.textContent = l;
    pic.alt = l || ('Image ' + (idx + 1));
  }
  function go(d) { show(idx + d); }
  function open(el) {
    if (!box) build();
    lastFocus = el;
    box.hidden = false;
    doc.classList.add('iz-open');
    if (window.__lenis && window.__lenis.stop) window.__lenis.stop();
    show(items.indexOf(el));
    requestAnimationFrame(function () { box.classList.add('on'); });
    box.querySelector('.iz-close').focus({ preventScroll: true });
  }
  function close() {
    box.classList.remove('on');
    doc.classList.remove('iz-open');
    setTimeout(function () { if (!box.classList.contains('on')) { box.hidden = true; pic.removeAttribute('src'); } }, 200);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function wire(el, flat) {
    if (el._iz) return;
    el._iz = true;
    if (flat) el._izFlat = true;
    items.push(el);
    items.sort(function (a, b) { return a.compareDocumentPosition(b) & 4 ? -1 : 1; });
    el.classList.add('iz');
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    var l = labelFor(el);
    el.setAttribute('aria-label', 'Enlarge ' + (l || 'image'));
    el.addEventListener('click', onClick);
    el.addEventListener('keydown', onKey);
  }
  function onClick(e) {
    e.preventDefault();
    var el = e.currentTarget;
    open(el);
    if (el._izFlat) {
      /* open on the spot that was clicked, already zoomed in */
      var r = el.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
      var go = function () {
        var pr = pic.getBoundingClientRect();
        if (!pr.width) return;
        toggleZoom(pr.left + pr.width * fx, pr.top + pr.height * fy);
      };
      if (pic.complete && pic.naturalWidth) requestAnimationFrame(go); else pic.addEventListener('load', function once() { pic.removeEventListener('load', once); requestAnimationFrame(go); });
    }
  }
  function onKey(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(e.currentTarget); } }

  /* ---------- Decide each image as it scrolls in; fade it in the first time ---------- */
  var io;
  function watch() {
    if (!('IntersectionObserver' in window)) return;
    if (!io) io = new IntersectionObserver(function (es) {
      var ready = [];
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        if (el.classList.contains('iz-fade')) el.classList.add('iz-in');
        /* decide once most of it is on screen, so the check sees the whole picture */
        if (e.intersectionRatio >= 0.5 || e.intersectionRect.height >= innerHeight * 0.45) ready.push(el);
      });
      if (!ready.length) return;
      withProbe(function () {
        ready.forEach(function (el) {
          io.unobserve(el);
          if (isContent(el)) wire(el);
          else if (!el._izRetry) { el._izRetry = 1; setTimeout(function () { io.observe(el); }, 1500); }
        });
      });
    }, { threshold: [0, 0.5, 1], rootMargin: '0px 0px -6% 0px' });
    candidates().forEach(function (el) {
      el._izc = true;
      if (!reduce && el.getBoundingClientRect().top > innerHeight) el.classList.add('iz-fade');
      io.observe(el);
    });
  }

  /* ---------- Count-up numbers ---------- */
  var NUM = /^([^\d]{0,4})(\d{1,3}(?:,\d{2,3})*(?:\.\d+)?|\d+(?:\.\d+)?)(.{0,8})$/;
  function counters() {
    if (reduce || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); run(e.target); } });
    }, { threshold: 0.6 });
    var walker = document.createTreeWalker(document.querySelector('main') || document.body, NodeFilter.SHOW_TEXT);
    var n, list = [];
    while ((n = walker.nextNode())) {
      var t = n.nodeValue.trim(), m = NUM.exec(t);
      if (!m || /[a-z]{3,}/i.test(m[1] + m[3].replace(/\b(cr|bn|mn|k|x)\b/i, ''))) continue;
      if (/^0\d/.test(m[2]) || /\d/.test(m[3]) && !/^\s*\/\s*\d+/.test(m[3])) continue; /* 01, 02 step labels; dates */
      var p = n.parentElement;
      if (!p || p.closest('nav, .toc, footer, header, a, button')) continue;
      var fs = parseFloat(getComputedStyle(p).fontSize);
      if (fs < 26 || p.getBoundingClientRect().width === 0) continue;
      var v = parseFloat(m[2].replace(/,/g, ''));
      if (!(v >= 2) || (v >= 1900 && v <= 2100 && !m[1] && !m[3])) continue; /* years */
      if (p.getBoundingClientRect().top < innerHeight) continue;
      n._iz = { pre: m[1], num: m[2], post: m[3], v: v, lead: n.nodeValue.match(/^\s*/)[0], tail: n.nodeValue.match(/\s*$/)[0] };
      list.push(n);
      p._izText = p._izText || [];
      p._izText.push(n);
      io.observe(p);
    }
    function fmt(d, val) {
      var dec = (d.num.split('.')[1] || '').length;
      var s = val.toFixed(dec);
      if (/,/.test(d.num)) {
        var parts = s.split('.'), x = parts[0];
        var indian = /\d,\d{2},\d{3}/.test(d.num);
        x = indian ? x.replace(/(\d)(?=(\d\d)+\d$)/g, '$1,') : x.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        s = x + (parts[1] ? '.' + parts[1] : '');
      }
      return d.lead + d.pre + s + d.post + d.tail;
    }
    function run(p) {
      var nodes = p._izText, t0 = performance.now(), dur = 1100;
      (function tick(t) {
        var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        nodes.forEach(function (node) { var d = node._iz; node.nodeValue = k < 1 ? fmt(d, d.v * e) : d.lead + d.pre + d.num + d.post + d.tail; });
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
    }
    /* set the start state right away so the numbers don't flash at their final value */
    list.forEach(function (node) { node.nodeValue = node._iz.lead + node._iz.pre + fmt({ num: node._iz.num, lead: '', pre: '', post: '', tail: '' }, 0) + node._iz.post + node._iz.tail; });
  }

  /* ---------- Videos pause off screen ---------- */
  function videos() {
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (!e.isIntersecting && !v.paused) { v.pause(); v._izPaused = true; }
        else if (e.isIntersecting && v._izPaused) { v._izPaused = false; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      });
    }, { threshold: 0.05 });
    document.querySelectorAll('video').forEach(function (v) { io.observe(v); });
  }

  videos();
  ready(function () {
    counters();
    setTimeout(watch, 60);
    var rt;
    /* phone and desktop layouts differ (some pages swap whole sections), so look again after a resize */
    addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(watch, 400); });
  });
})();
