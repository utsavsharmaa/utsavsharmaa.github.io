/* Light / dark theme.
   First visit: follows the visitor's device setting (light or dark).
   Any element with data-theme-toggle switches it, and the choice is remembered on this device. */
(function(){
  var root = document.documentElement, KEY = 'utsav-theme';
  var media = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  function read(){ try { return localStorage.getItem(KEY); } catch(e){ return null; } }
  function write(v){ try { localStorage.setItem(KEY, v); } catch(e){} }

  var saved = read();
  if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);

  function current(){
    var t = root.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return media && media.matches ? 'dark' : 'light';
  }
  function sync(){
    var dark = current() === 'dark';
    var btns = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < btns.length; i++){
      btns[i].setAttribute('aria-pressed', dark ? 'true' : 'false');
      btns[i].setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      btns[i].setAttribute('title', dark ? 'Lights on' : 'Lights off');
    }
  }
  function toggle(){
    var next = current() === 'dark' ? 'light' : 'dark';
    root.classList.add('theming');
    root.setAttribute('data-theme', next);
    write(next);
    sync();
    clearTimeout(toggle._t);
    toggle._t = setTimeout(function(){ root.classList.remove('theming'); }, 700);
  }
  window.utsavTheme = { current: current, toggle: toggle };

  document.addEventListener('DOMContentLoaded', function(){
    var btns = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < btns.length; i++) btns[i].addEventListener('click', toggle);
    sync();
  });
  if (media){
    var onChange = function(){ if (!read()) sync(); };
    if (media.addEventListener) media.addEventListener('change', onChange);
    else if (media.addListener) media.addListener(onChange);
  }
})();
