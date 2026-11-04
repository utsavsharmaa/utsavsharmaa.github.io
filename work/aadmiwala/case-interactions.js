/* Reading feedback and screen inspection; the documentation stays visible without JavaScript. */
(function () {
  var article = document.querySelector('.documentation');
  if (!article) return;
  var progress = document.createElement('span'), frame = 0;
  progress.className = 'case-reading-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);
  function updateProgress() {
    frame = 0;
    var top = article.getBoundingClientRect().top + window.scrollY;
    var distance = article.offsetHeight - window.innerHeight;
    var value = distance > 0 ? (window.scrollY - top) / distance : 0;
    progress.style.setProperty('--reading-progress', Math.max(0, Math.min(1, value)));
  }
  function scheduleProgress() { if (!frame) frame = requestAnimationFrame(updateProgress); }
  addEventListener('scroll', scheduleProgress, { passive: true });
  addEventListener('resize', scheduleProgress);
  if ('ResizeObserver' in window) new ResizeObserver(scheduleProgress).observe(article);
  scheduleProgress();

  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  if ('IntersectionObserver' in window && !reduce.matches) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        if (!reduce.matches) entry.target.classList.add('case-phase-arrive');
        observer.unobserve(entry.target);
      });
    }, { threshold: .15 });
    article.querySelectorAll('[data-node-id="792:83922"], [data-node-id="792:89338"]').forEach(function (image) {
      observer.observe(image);
    });
  }

  /* Screen names for the shared image viewer (assets/interact.js) */
  article.querySelectorAll('img[src$=".png"]').forEach(function (image) {
    var slot = image.closest('[data-name]'), label = slot && slot.getAttribute('data-name');
    if (!label || !/^(Screen ·|Employer ·|HUB ·|Public ·|apna-|quess-|betterplace-|indiamart-)/.test(label)) return;
    image.setAttribute('data-zoom-label', label.replace(/^Screen · /, '').replace(/-1440x900 1$/, '').replace(/ [123]$/, ''));
  });
})();
