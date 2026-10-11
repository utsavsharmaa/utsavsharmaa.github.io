/* FEEL IT: read the face, pick the emotion. One round = 10 photos, 10 seconds each, 10 points per right answer.
   Opened by holding the smiley for 2 seconds (see index.html). Photos are pre-labelled (one correct emotion each).
   To add photos: drop a square image in assets/game/faces/ named <emotion>-NN.webp and add it to FACES below. */
(function(){
  var BASE = (document.currentScript && document.currentScript.src || '').replace(/game\.js(\?.*)?$/, '');
  var ROUND = 10, SECONDS = 10;
  /* button order follows the Figma frame */
  var EMOTIONS = [
    { id: 'surprised', label: 'Surprised' },
    { id: 'angry',     label: 'Angry' },
    { id: 'happy',     label: 'Happy' },
    { id: 'disgusted', label: 'Disgusted' },
    { id: 'sad',       label: 'Sad' }
  ];
  var COUNT = { happy: 25, surprised: 9, angry: 9, sad: 4, disgusted: 1 };
  var SKIP = { 'happy-07': 1, 'happy-15': 1, 'angry-01': 1, 'angry-05': 1 };   /* ambiguous expressions, left out */
  var FACES = [];
  Object.keys(COUNT).forEach(function(e){
    for (var i = 1; i <= COUNT[e]; i++){
      var id = e + '-' + (i < 10 ? '0' : '') + i;
      if (!SKIP[id]) FACES.push({ id: id, src: BASE + 'faces/' + id + '.webp', emotion: e });
    }
  });
  var LABEL = {}; EMOTIONS.forEach(function(e){ LABEL[e.id] = e.label; });

  function shuffle(a){ for (var i = a.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  /* a fair round: up to 2 faces of every emotion, topped up at random, never repeating a photo */
  function pickRound(){
    var by = {}, picked = [], rest = [];
    shuffle(FACES.slice()).forEach(function(f){ (by[f.emotion] = by[f.emotion] || []).push(f); });
    Object.keys(by).forEach(function(e){ picked = picked.concat(by[e].slice(0, 2)); rest = rest.concat(by[e].slice(2)); });
    shuffle(rest);
    while (picked.length < ROUND && rest.length) picked.push(rest.pop());
    return shuffle(picked).slice(0, ROUND);
  }

  var el, card, scr = {}, photo, img, verdict, ansEl, timeEl, emojiBtns = [], lastFocus = null;
  function emojiImg(id){ return '<img src="' + BASE + id + '.svg" width="80" height="80" alt="">'; }
  function build(){
    el = document.createElement('div');
    el.className = 'feelit'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Feel it: a face-reading game');
    el.innerHTML =
      '<div class="fi-card">' +
        '<button class="fi-x" type="button" aria-label="Close the game"><img src="' + BASE + 'close.svg" width="60" height="60" alt=""></button>' +
        '<div class="fi-body">' +
          /* intro */
          '<section class="fi-screen fi-intro">' +
            '<div class="fi-head"><h2 class="fi-title">Can you read a face?</h2></div>' +
            '<ul class="fi-rules"><li>Faces <b>10</b></li><li>Time per face <b>10 sec</b></li><li>Points per right answer <b>10</b></li></ul>' +
            '<p class="fi-copy">Look at the photo and tap the emoji<br>that matches the <b>feeling</b>.</p>' +
            '<div class="fi-legend">' + EMOTIONS.map(function(e){ return '<figure>' + emojiImg(e.id) + '<figcaption>' + e.label + '</figcaption></figure>'; }).join('') + '</div>' +
            '<div class="fi-btns"><button class="fi-btn fi-start" type="button">Start game</button></div>' +
          '</section>' +
          /* play (the Figma frame) */
          '<section class="fi-screen fi-play">' +
            '<div class="fi-head"><h2 class="fi-title">What emotion do you see?</h2>' +
              '<div class="fi-meta"><div>Answered<b class="fi-ans">00/10</b></div><div class="r fi-time">Time<b>00:10</b></div></div></div>' +
            '<div class="fi-photo"><img alt=""><div class="fi-verdict" aria-live="polite"></div></div>' +
            '<div class="fi-emojis">' + EMOTIONS.map(function(e){ return '<button class="fi-emoji" type="button" data-e="' + e.id + '" aria-label="' + e.label + '" title="' + e.label + '">' + emojiImg(e.id) + '</button>'; }).join('') + '</div>' +
          '</section>' +
          /* results */
          '<section class="fi-screen fi-end">' +
            '<div class="fi-head"><h2 class="fi-title fi-end-title">Game over</h2></div>' +
            '<p class="fi-score"><em class="fi-pts" style="font-style:normal">0</em><span>/100</span></p>' +
            '<div class="fi-stats"><div><b class="fi-c">0</b>Right</div><div><b class="fi-w">0</b>Wrong</div><div><b class="fi-m">0</b>Missed</div></div>' +
            '<div class="fi-acc">Accuracy <b class="fi-pc">0%</b></div><div class="fi-bar"><i></i></div>' +
            '<p class="fi-copy fi-msg"></p>' +
            '<div class="fi-btns"><button class="fi-btn fi-again" type="button">Play again</button><button class="fi-btn ghost fi-close" type="button">Back to the site</button></div>' +
          '</section>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);
    card = el.querySelector('.fi-card');
    scr.intro = el.querySelector('.fi-intro'); scr.play = el.querySelector('.fi-play'); scr.end = el.querySelector('.fi-end');
    photo = el.querySelector('.fi-photo'); img = photo.querySelector('img'); verdict = el.querySelector('.fi-verdict');
    ansEl = el.querySelector('.fi-ans'); timeEl = el.querySelector('.fi-time');
    emojiBtns = Array.prototype.slice.call(el.querySelectorAll('.fi-emoji'));
    el.querySelector('.fi-x').addEventListener('click', close);
    el.querySelector('.fi-close').addEventListener('click', close);
    el.querySelector('.fi-start').addEventListener('click', start);
    el.querySelector('.fi-again').addEventListener('click', start);
    emojiBtns.forEach(function(b){ b.addEventListener('click', function(){ answer(b.getAttribute('data-e'), b); }); });
    el.addEventListener('click', function(e){ if (e.target === el) close(); });   /* click outside the card */
    document.addEventListener('keydown', function(e){
      if (!el.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'Tab'){ /* keep focus inside the card */
        var f = Array.prototype.filter.call(card.querySelectorAll('button'), function(b){ if (b.disabled) return false; var s = b.closest('.fi-screen'); return !s || s.classList.contains('on'); });
        if (!f.length) return;
        var i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0){ e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1){ e.preventDefault(); f[0].focus(); }
      }
    });
  }

  var round = [], q = 0, stats = null, locked = true, t0 = 0, raf = 0, nextT = 0, lastSec = -1;
  function show(name){ Object.keys(scr).forEach(function(k){ scr[k].classList.toggle('on', k === name); }); }
  function pad(n){ return (n < 10 ? '0' : '') + n; }

  function open(){
    if (!el) build();
    lastFocus = document.activeElement;
    document.documentElement.style.overflow = 'hidden';
    if (window.__lenis) try { window.__lenis.stop(); } catch(e){}
    stopAll(); show('intro');
    el.classList.add('open');
    setTimeout(function(){ var b = el.querySelector('.fi-start'); if (b) b.focus({ preventScroll: true }); }, 60);
  }
  function close(){
    if (!el) return;
    stopAll();
    el.classList.remove('open');
    document.documentElement.style.overflow = '';
    if (window.__lenis) try { window.__lenis.start(); } catch(e){}
    if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch(e){}
  }
  function stopAll(){ cancelAnimationFrame(raf); clearTimeout(nextT); locked = true; }

  function start(){
    stopAll();
    round = pickRound();
    round.forEach(function(f){ var i = new Image(); i.src = f.src; });   /* preload the round */
    q = 0; stats = { right: 0, wrong: 0, missed: 0 };
    show('play');
    load();
  }
  function load(){
    var f = round[q];
    photo.classList.remove('good', 'bad'); verdict.className = 'fi-verdict'; verdict.textContent = '';
    emojiBtns.forEach(function(b){ b.classList.remove('picked', 'answer', 'wrong'); });
    ansEl.textContent = pad(q) + '/' + ROUND;
    img.classList.add('out');
    var went = false;
    var go = function(){
      if (went) return; went = true;
      img.onload = img.onerror = null;
      img.alt = 'Photo ' + (q + 1) + ' of ' + ROUND + ': a person showing an emotion';
      requestAnimationFrame(function(){ img.classList.remove('out'); });
      card.classList.remove('fi-locked');
      emojiBtns.forEach(function(b){ b.disabled = false; });
      locked = false; t0 = performance.now(); lastSec = -1; tick();
    };
    setTimeout(function(){
      img.onload = go;
      img.onerror = function(){ go(); };   /* a missing photo still counts down so the round can't get stuck */
      img.src = f.src;
      if (img.complete && img.naturalWidth) go();
    }, 160);
  }
  function tick(){
    var left = Math.max(0, SECONDS - (performance.now() - t0) / 1000);
    var s = Math.ceil(left);
    if (s !== lastSec){ lastSec = s; timeEl.querySelector('b').textContent = '00:' + pad(s); timeEl.classList.toggle('low', s <= 3 && s > 0); }
    if (left <= 0){ finish(null, null); return; }
    raf = requestAnimationFrame(tick);
  }
  function answer(e, btn){ if (!locked) finish(e, btn); }
  function finish(choice, btn){
    if (locked) return;
    locked = true; cancelAnimationFrame(raf); timeEl.classList.remove('low');
    var f = round[q], right = choice === f.emotion;
    if (choice === null) stats.missed++; else if (right) stats.right++; else stats.wrong++;
    card.classList.add('fi-locked');
    emojiBtns.forEach(function(b){
      b.disabled = true;
      if (b.getAttribute('data-e') === f.emotion) b.classList.add('answer');
    });
    if (btn){ btn.classList.add('picked'); if (!right) btn.classList.add('wrong'); }
    photo.classList.add(right ? 'good' : 'bad');
    verdict.className = 'fi-verdict on ' + (right ? 'good' : 'bad');
    verdict.innerHTML = '<b>' + (right ? 'Correct!' : choice === null ? 'Time’s up!' : 'Not quite!') + '</b>That’s ' + LABEL[f.emotion].toLowerCase() + '.';
    ansEl.textContent = pad(q + 1) + '/' + ROUND;
    nextT = setTimeout(function(){
      q++;
      if (q < ROUND) load(); else results();
    }, right ? 1100 : 1500);
  }
  function results(){
    var pts = stats.right * 10, pc = Math.round(stats.right / ROUND * 100);
    var title = pts === 100 ? 'Mind reader!' : pts >= 80 ? 'Great job!' : pts >= 50 ? 'Not bad!' : 'Faces are tricky!';
    var msg = pts === 100 ? 'You read every single face. Nothing gets past you.'
            : pts >= 80 ? 'You can read emotions really well.'
            : pts >= 50 ? 'You got most of them. One more round?'
            : 'People hide a lot in their faces. Give it another go.';
    el.querySelector('.fi-end-title').textContent = title;
    el.querySelector('.fi-c').textContent = stats.right;
    el.querySelector('.fi-w').textContent = stats.wrong;
    el.querySelector('.fi-m').textContent = stats.missed;
    el.querySelector('.fi-pc').textContent = pc + '%';
    el.querySelector('.fi-msg').textContent = msg;
    var bar = el.querySelector('.fi-bar i'); bar.style.width = '0';
    show('end');
    /* count the score up */
    var ptsEl = el.querySelector('.fi-pts'), s0 = performance.now();
    (function up(now){
      var k = Math.min(1, (now - s0) / 900), e = 1 - Math.pow(1 - k, 3);
      ptsEl.textContent = Math.round(pts * e);
      if (k < 1) raf = requestAnimationFrame(up);
    })(s0);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ bar.style.width = pc + '%'; }); });
    setTimeout(function(){ var b = el.querySelector('.fi-again'); if (b) b.focus({ preventScroll: true }); }, 400);
  }

  window.FeelIt = { open: open, close: close, faces: FACES };
})();
