/* Thin reading-progress line at the top of a case study (same look as Aadmiwala's). */
(function () {
  if (document.querySelector('.case-reading-progress')) return;
  var article = document.querySelector('.documentation') || document.querySelector('main');
  if (!article) return;
  var css = document.createElement('style');
  css.textContent = '.case-reading-progress{position:fixed;inset:0 0 auto;height:2px;z-index:80;background:#e38e27;transform:scaleX(var(--reading-progress,0));transform-origin:0 50%;pointer-events:none}';
  document.head.appendChild(css);
  var progress = document.createElement('span'), frame = 0;
  progress.className = 'case-reading-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);
  function update() {
    frame = 0;
    var top = article.getBoundingClientRect().top + window.scrollY;
    var distance = article.offsetHeight - window.innerHeight;
    var value = distance > 0 ? (window.scrollY - top) / distance : 0;
    progress.style.setProperty('--reading-progress', Math.max(0, Math.min(1, value)));
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(article);
  schedule();
})();
